import { createEffect, createMemo, createSignal, For, Show } from 'solid-js';
import type { ZodIssue } from 'zod';
import { publicationSchema } from '@qrnlab/shared';
import type { Publication, TeamMemberRef } from '../../lib/types';
import { api, ApiError } from '../../lib/api';
import { toast } from '../../lib/toast';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { Field } from '../ui/Field';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

export type PublicationType = Publication['type'];

type AuthorRow = { name: string; memberSlug: string };
type FormErrors = Record<string, string>;

export type PublicationEditorProps = {
  open: boolean | (() => boolean);
  onClose: () => void;
  publication?: Publication | null;
  onSaved?: () => Promise<void> | void;
};

const TYPE_OPTIONS: { value: PublicationType; label: string }[] = [
  { value: 'journal', label: 'Journal' },
  { value: 'conference', label: 'Conference' },
  { value: 'preprint', label: 'Preprint' },
];

function mapIssues(issues: ZodIssue[]): FormErrors {
  const errors: FormErrors = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join('.') || '_root';
    if (!(key in errors)) errors[key] = issue.message;
  }
  return errors;
}

/**
 * Modal editor for creating a publication draft or editing an existing one.
 * `onSaved` lets the owning route revalidate its router query after any
 * successful mutation (save or publish).
 */
export function PublicationEditor(props: PublicationEditorProps) {
  const isOpen = () => (typeof props.open === 'function' ? (props.open as () => boolean)() : props.open);

  const team = createMemo<TeamMemberRef[]>(
    async () => {
      try {
        const res = await api<{ team: TeamMemberRef[] }>('/content/team');
        return res.team;
      } catch {
        return [];
      }
    },
    { loadingValue: [] },
  );

  const [title, setTitle] = createSignal('');
  const [venue, setVenue] = createSignal('');
  const [year, setYear] = createSignal('');
  const [type, setType] = createSignal<PublicationType>('journal');
  const [url, setUrl] = createSignal('');
  const [authors, setAuthors] = createSignal<AuthorRow[]>([{ name: '', memberSlug: '' }]);
  const [errors, setErrors] = createSignal<FormErrors>({});
  const [saving, setSaving] = createSignal(false);

  createEffect(() => {
    if (!isOpen()) return;
    const pub = props.publication;
    setErrors({});
    setSaving(false);
    setTitle(pub?.title ?? '');
    setVenue(pub?.venue ?? '');
    setYear(pub ? String(pub.year) : '');
    setType(pub?.type ?? 'journal');
    setUrl(pub?.url ?? '');
    setAuthors(
      pub?.authors.map((a) => ({ name: a.name, memberSlug: a.memberSlug ?? '' })) ?? [
        { name: '', memberSlug: '' },
      ],
    );
  });

  function buildPayload() {
    const rows = authors();
    return {
      title: title().trim(),
      authors: rows.map((a) => ({ name: a.name.trim(), memberSlug: a.memberSlug.trim() || undefined })),
      venue: venue().trim(),
      year: year().trim() === '' ? Number.NaN : Number(year()),
      type: type(),
      url: url().trim() || undefined,
    };
  }

  function validate(): boolean {
    const result = publicationSchema.safeParse(buildPayload());
    if (result.success) return true;
    const next = mapIssues(result.error.issues);
    if (year().trim() === '' && next.year) next.year = 'Year is required.';
    setErrors(next);
    return false;
  }

  const setAuthorName = (index: number, value: string) =>
    setAuthors((rows) => rows.map((row, i) => (i === index ? { ...row, name: value } : row)));

  const setAuthorMember = (index: number, value: string) =>
    setAuthors((rows) => rows.map((row, i) => (i === index ? { ...row, memberSlug: value } : row)));

  const addAuthor = () => setAuthors((rows) => [...rows, { name: '', memberSlug: '' }]);

  const removeAuthor = (index: number) =>
    setAuthors((rows) => (rows.length === 1 ? rows : rows.filter((_, i) => i !== index)));

  async function onSave() {
    if (saving()) return;
    setErrors({});
    if (!validate()) return;
    const payload = buildPayload();
    setSaving(true);
    try {
      if (props.publication) {
        await api(`/content/publications/${props.publication.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast.success('Publication updated', { description: payload.title });
      } else {
        await api('/content/publications', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Publication draft created', { description: payload.title });
      }
      await props.onSaved?.();
      props.onClose();
    } catch (err) {
      const message =
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Could not save the publication.';
      toast.error('Save failed', { description: message });
    } finally {
      setSaving(false);
    }
  }

  async function onPublish() {
    if (saving() || !props.publication) return;
    setErrors({});
    if (!validate()) return;
    const payload = buildPayload();
    setSaving(true);
    try {
      await api(`/content/publications/${props.publication.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      await api(`/content/publications/${props.publication.id}/publish`, { method: 'POST' });
      toast.success('Publication published', { description: payload.title });
      await props.onSaved?.();
      props.onClose();
    } catch (err) {
      const message =
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Could not publish the publication.';
      toast.error('Publish failed', { description: message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={isOpen()}
      onClose={props.onClose}
      size="md"
      blockOverlayClose={saving()}
      title={props.publication ? 'Edit publication' : 'New publication'}
      description={
        props.publication
          ? 'Save to update the record; publishing enqueues a site rebuild.'
          : 'Drafts stay private until published.'
      }
    >
      <div class="flex flex-col gap-4">
        <Field label="Title" required error={errors().title}>
          <Input
            value={title()}
            onInput={(event) => setTitle(event.currentTarget.value)}
            placeholder="Superposition in a spin lattice"
          />
        </Field>

        <Field label="Venue" required error={errors().venue}>
          <Input
            value={venue()}
            onInput={(event) => setVenue(event.currentTarget.value)}
            placeholder="Physical Review Letters"
          />
        </Field>

        <div class="grid gap-4 sm:grid-cols-2">
          <Field label="Year" required error={errors().year}>
            <Input
              type="number"
              value={year()}
              onInput={(event) => setYear(event.currentTarget.value)}
              placeholder="2026"
              min={1900}
              max={2100}
            />
          </Field>
          <Field label="Type" required error={errors().type}>
            <Select
              value={type()}
              onChange={(event) => setType(event.currentTarget.value as PublicationType)}
            >
              <For each={TYPE_OPTIONS}>
                {(option) => <option value={option.value}>{option.label}</option>}
              </For>
            </Select>
          </Field>
        </div>

        <Field label="URL" error={errors().url} hint="Optional — DOI, arXiv, or publisher link.">
          <Input
            value={url()}
            onInput={(event) => setUrl(event.currentTarget.value)}
            placeholder="https://doi.org/10.1103/PhysRevLett.137.000000"
          />
        </Field>

        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between gap-2">
            <span class="font-mono text-[10.5px] font-medium uppercase tracking-[0.1em] text-fg-soft">
              Authors
            </span>
            <Button type="button" variant="outline" size="xs" onClick={addAuthor}>
              Add author
            </Button>
          </div>

          <div class="flex flex-col gap-2">
            <For each={authors()}>
              {(row, index) => (
                <div class="grid gap-2 rounded-[var(--radius)] border border-border bg-bg p-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.25rem]">
                  <Field error={errors()['authors.' + index() + '.name']}>
                    <Input
                      value={row.name}
                      onInput={(event) => setAuthorName(index(), event.currentTarget.value)}
                      placeholder="Author name"
                      aria-label={`Author ${index() + 1} name`}
                    />
                  </Field>
                  <Select
                    value={row.memberSlug}
                    onChange={(event) => setAuthorMember(index(), event.currentTarget.value)}
                    aria-label={`Author ${index() + 1} member link`}
                  >
                    <option value="">No member link</option>
                    <For each={team()}>
                      {(member) => <option value={member.slug}>{member.name}</option>}
                    </For>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    class="mt-0.5 self-start"
                    aria-label={`Remove author ${index() + 1}`}
                    disabled={authors().length === 1}
                    onClick={() => removeAuthor(index())}
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

          <Show when={errors().authors}>
            <p role="alert" class="font-mono text-[11px] uppercase tracking-[0.06em] text-red">
              {errors().authors}
            </p>
          </Show>
        </div>

        <Show when={errors()._root}>
          <p role="alert" class="font-mono text-[11px] uppercase tracking-[0.06em] text-red">
            {errors()._root}
          </p>
        </Show>
      </div>

      <div class="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
        <Show when={props.publication?.status === 'draft'}>
          <Button type="button" variant="outline" onClick={onPublish} isLoading={saving()}>
            Publish
          </Button>
        </Show>
        <Button type="button" variant="ghost" onClick={props.onClose} disabled={saving()}>
          Cancel
        </Button>
        <Button type="button" onClick={onSave} isLoading={saving()}>
          {props.publication ? 'Save changes' : 'Create draft'}
        </Button>
      </div>
    </Dialog>
  );
}
