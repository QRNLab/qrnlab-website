import { createMemo, createSignal, For, Show } from 'solid-js';
import { query, revalidate } from '@solidjs/router';
import type { ZodIssue } from 'zod';
import { updateSchema } from '@qrnlab/shared';
import type { Update } from '../lib/types';
import { api, ApiError } from '../lib/api';
import { toast } from '../lib/toast';
import { RequirePermission } from './guard';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Field } from '../components/ui/Field';
import { Input } from '../components/ui/Input';
import { Skeleton } from '../components/ui/Skeleton';
import { Textarea } from '../components/ui/Textarea';

export const getUpdates = query(
  () => api<{ updates: Update[] }>('/content/updates'),
  'updates',
);

type FormErrors = Record<string, string>;

function todayISO(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function mapIssues(issues: ZodIssue[]): FormErrors {
  const errors: FormErrors = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join('.') || '_root';
    if (!(key in errors)) errors[key] = issue.message;
  }
  return errors;
}

function UpdatesListSkeleton() {
  return (
    <div class="flex flex-col gap-2">
      <Skeleton class="h-20 w-full" />
      <Skeleton class="h-20 w-full" />
      <Skeleton class="h-20 w-full" />
    </div>
  );
}

export default function Updates() {
  const [loadError, setLoadError] = createSignal<string | null>(null);

  const updates = createMemo<{ updates: Update[] } | undefined>(
    async () => {
      setLoadError(null);
      try {
        return await getUpdates();
      } catch (err) {
        const message =
          err instanceof ApiError || err instanceof Error
            ? err.message
            : 'Failed to load updates.';
        setLoadError(message);
        return undefined;
      }
    },
    { loadingValue: undefined },
  );

  const list = createMemo(() => updates()?.updates ?? []);

  const [date, setDate] = createSignal(todayISO());
  const [text, setText] = createSignal('');
  const [errors, setErrors] = createSignal<FormErrors>({});
  const [submitting, setSubmitting] = createSignal(false);
  const [deleteTarget, setDeleteTarget] = createSignal<Update | null>(null);
  const [deleting, setDeleting] = createSignal(false);

  const onSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    setErrors({});
    if (!date()) {
      setErrors({ date: 'Date is required.' });
      return;
    }
    if (!text().trim()) {
      setErrors({ text: 'Update text is required.' });
      return;
    }
    const result = updateSchema.safeParse({ date: date(), text: text() });
    if (!result.success) {
      setErrors(mapIssues(result.error.issues));
      return;
    }
    setSubmitting(true);
    try {
      await api('/content/updates', {
        method: 'POST',
        body: JSON.stringify(result.data),
      });
      toast.success('Update posted', { description: result.data.text.slice(0, 60) });
      setText('');
      setDate(todayISO());
      await revalidate(getUpdates.key);
    } catch (err) {
      const message =
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Could not post the update.';
      toast.error('Post failed', { description: message });
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async () => {
    const target = deleteTarget();
    if (!target) return;
    setDeleting(true);
    try {
      await api(`/content/updates/${target.id}`, { method: 'DELETE' });
      toast.success('Update deleted');
      await revalidate(getUpdates.key);
      setDeleteTarget(null);
    } catch (err) {
      const message =
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Could not delete the update.';
      toast.error('Delete failed', { description: message });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <RequirePermission permission="content.moderate">
      <div class="flex flex-col gap-6">
        <header>
          <span class="eyebrow eyebrow-amber">Content / Updates</span>
          <h1 class="font-display text-2xl font-bold tracking-[-0.02em] text-fg sm:text-3xl">
            News updates
          </h1>
          <p class="mt-2 max-w-prose text-sm leading-relaxed text-fg-soft">
            Short news items shown on the public site.
          </p>
        </header>

        <Show when={loadError()} keyed>
          {(message) => (
            <ErrorState
              title="Failed to load updates"
              message={message}
              retry={() => revalidate(getUpdates.key)}
            />
          )}
        </Show>

        <Show when={!loadError()}>
          <div class="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Show when={updates() !== undefined} fallback={<UpdatesListSkeleton />}>
              <Show
                when={list().length > 0}
                fallback={
                  <EmptyState
                    title="No updates yet"
                    description="Post your first update from the form on the right."
                    lines
                  />
                }
              >
                <div class="flex flex-col divide-y divide-border rounded-[var(--radius)] border border-border bg-bg-raised">
                  <For each={list()}>
                    {(update) => (
                      <div class="flex items-start justify-between gap-4 p-4">
                        <div class="flex flex-col gap-1">
                          <span class="font-mono text-[11px] uppercase tracking-[0.1em] text-fg-faint">
                            {update.date}
                          </span>
                          <p class="max-w-prose text-sm leading-relaxed text-fg">{update.text}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          class="shrink-0 text-fg-faint hover:text-red"
                          aria-label="Delete update"
                          onClick={() => setDeleteTarget(update)}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1.8"
                            class="h-4 w-4"
                            aria-hidden="true"
                          >
                            <path d="M6 6l12 12M18 6L6 18" />
                          </svg>
                        </Button>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </Show>

            <Card class="h-fit">
              <CardHeader
                eyebrow="Publish"
                title="Add update"
                description="Updates appear on the public site immediately."
              />
              <CardContent>
                <form class="flex flex-col gap-4" onSubmit={onSubmit} novalidate>
                  <Field label="Date" required error={errors().date}>
                    <Input
                      type="date"
                      value={date()}
                      onInput={(event) => setDate(event.currentTarget.value)}
                      required
                    />
                  </Field>
                  <Field
                    label="Update"
                    required
                    error={errors().text}
                    hint="Up to 500 characters."
                  >
                    <Textarea
                      value={text()}
                      onInput={(event) => setText(event.currentTarget.value)}
                      rows={4}
                      maxlength={500}
                      placeholder="What's new at the lab?"
                    />
                  </Field>
                  <div class="flex justify-end">
                    <Button type="submit" isLoading={submitting()}>
                      Post update
                    </Button>
                  </div>
                </form>
                <p class="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-fg-faint">
                  Updates go live on the public site on the next manual rebuild.
                </p>
              </CardContent>
            </Card>
          </div>
        </Show>

        <ConfirmDialog
          open={deleteTarget() !== null}
          onClose={() => setDeleteTarget(null)}
          onConfirm={onDelete}
          title="Delete update?"
          description="This action cannot be undone."
          confirmLabel="Delete"
          destructive
          isLoading={deleting()}
        />
      </div>
    </RequirePermission>
  );
}
