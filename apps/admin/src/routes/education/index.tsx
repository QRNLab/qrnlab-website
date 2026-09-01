import { createMemo, createSignal, For, Show } from 'solid-js';
import type { Accessor } from 'solid-js';
import { query, revalidate, useNavigate } from '@solidjs/router';
import { extractYoutubeId, youtubeEmbedUrl } from '@qrnlab/shared';
import { api, mediaUrl } from '../../lib/api';
import { toast } from '../../lib/toast';
import type { EducationEntry } from '../../lib/types';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Dialog } from '../../components/ui/Dialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Skeleton';
import { EducationEditor } from '../../components/education/EducationEditor';
import { RequireAuth, RequirePermission } from '../guard';

type SectionKey = EducationEntry['section'];

const SECTIONS: { key: SectionKey; label: string; blurb: string }[] = [
  {
    key: 'lecture-notes',
    label: 'Lecture notes',
    blurb: 'Course and talk notes written up for the public.',
  },
  {
    key: 'presentations',
    label: 'Presentations',
    blurb: 'Slides and deck material from talks and seminars.',
  },
  {
    key: 'posters',
    label: 'Posters',
    blurb: 'Conference posters and related materials.',
  },
];

const getEducation = query(() => api<{ entries: EducationEntry[] }>('/content/education'), 'education');

type EntryCardProps = {
  entry: EducationEntry;
  index: Accessor<number>;
  count: Accessor<number>;
  busy: Accessor<string | null>;
  onMove: (entry: EducationEntry, direction: 'up' | 'down') => void;
  onPublish: (entry: EducationEntry) => void;
  onView: (entry: EducationEntry) => void;
  onEdit: (entry: EducationEntry) => void;
  onDelete: (entry: EducationEntry) => void;
};

function EntryCard(props: EntryCardProps) {
  const { entry } = props;
  const busyKey = (action: string) => `${action}:${entry.id}`;
  const isBusy = (action: string) => props.busy() === busyKey(action);
  const canMoveUp = () => props.index() > 0;
  const canMoveDown = () => props.index() < props.count() - 1;

  const videos = () =>
    entry.youtubeLinks
      .map((url) => extractYoutubeId(url))
      .filter((id): id is string => id !== null);

  return (
    <div class="flex flex-col gap-3 px-5 py-4">
      <div class="flex flex-wrap items-center gap-2">
        <h3 class="font-display text-[15px] font-semibold tracking-[-0.01em] text-fg">
          {entry.heading}
        </h3>
        <Badge tone={entry.status === 'published' ? 'green' : 'amber'} dot>
          {entry.status}
        </Badge>
        <span class="font-mono text-[10.5px] uppercase tracking-[0.08em] text-fg-faint">
          #{entry.sortOrder}
        </span>
      </div>

      <Show when={entry.description}>
        <p class="max-w-prose text-sm leading-relaxed text-fg-soft">{entry.description}</p>
      </Show>

      <Show when={entry.images.length > 0}>
        <div class="flex flex-wrap gap-2">
          <For each={entry.images}>
            {(key) => {
              const src = mediaUrl(key);
              return src ? (
                <img src={src} alt="" class="h-14 w-14 rounded-[var(--radius)] border border-border object-cover" />
              ) : null;
            }}
          </For>
        </div>
      </Show>

      <Show when={entry.links.length > 0}>
        <div class="flex flex-wrap gap-2">
          <For each={entry.links}>
            {(link) => (
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer"
                class="rounded-[var(--radius)] border border-border px-2 py-1 font-mono text-[11px] uppercase tracking-[0.06em] text-amber hover:border-amber"
              >
                {link.label}
              </a>
            )}
          </For>
        </div>
      </Show>

      <Show when={videos().length > 0}>
        <div class="flex flex-wrap gap-3">
          <For each={videos()}>
            {(id) => (
              <iframe
                src={youtubeEmbedUrl(id)}
                title="YouTube video"
                class="aspect-video w-56 rounded-[var(--radius)] border border-border"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen
              />
            )}
          </For>
        </div>
      </Show>

      <div class="flex flex-wrap items-center gap-2 pt-1">
        <Button
          variant="outline"
          size="xs"
          disabled={!canMoveUp() || isBusy('move')}
          onClick={() => props.onMove(entry, 'up')}
        >
          ↑ Up
        </Button>
        <Button
          variant="outline"
          size="xs"
          disabled={!canMoveDown() || isBusy('move')}
          onClick={() => props.onMove(entry, 'down')}
        >
          ↓ Down
        </Button>
        <Show when={entry.status === 'draft'}>
          <Button
            variant="solid"
            size="xs"
            isLoading={isBusy('publish')}
            disabled={isBusy('move') || props.busy() !== null}
            onClick={() => props.onPublish(entry)}
          >
            Publish
          </Button>
        </Show>
        <Button
          variant="ghost"
          size="xs"
          disabled={props.busy() !== null}
          onClick={() => props.onView(entry)}
        >
          View
        </Button>
        <Button
          variant="outline"
          size="xs"
          disabled={props.busy() !== null}
          onClick={() => props.onEdit(entry)}
        >
          Edit
        </Button>
        <Button
          variant="destructive"
          size="xs"
          isLoading={isBusy('delete')}
          disabled={props.busy() !== null}
          onClick={() => props.onDelete(entry)}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

function EducationSkeleton() {
  return (
    <div class="flex flex-col gap-4">
      <For each={[0, 1, 2]}>
        {() => (
          <div class="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-bg-raised p-5">
            <div class="flex items-center gap-3">
              <Skeleton class="h-3 w-40" />
              <Skeleton class="h-5 w-16" />
            </div>
            <Skeleton class="h-4 w-full" />
            <Skeleton class="h-4 w-2/3" />
            <Skeleton class="h-8 w-full" />
          </div>
        )}
      </For>
    </div>
  );
}

export default function Education() {
  const [error, setError] = createSignal<string | null>(null);
  const navigate = useNavigate();
  const [busy, setBusy] = createSignal<string | null>(null);
  const [editorOpen, setEditorOpen] = createSignal(false);
  const [editing, setEditing] = createSignal<EducationEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = createSignal<EducationEntry | null>(null);

  const entriesQuery = createMemo<{ entries: EducationEntry[] } | undefined>(
    async () => {
      try {
        const result = await getEducation();
        setError(null);
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load education entries.');
        return undefined;
      }
    },
    { loadingValue: undefined },
  );

  const entries = () => entriesQuery()?.entries ?? [];
  const loading = () => entriesQuery() === undefined && !error();

  const grouped = createMemo(() => {
    const groups: Record<SectionKey, EducationEntry[]> = {
      'lecture-notes': [],
      presentations: [],
      posters: [],
    };
    for (const entry of entries()) groups[entry.section].push(entry);
    return groups;
  });

  const sections = createMemo(() =>
    SECTIONS.map((section) => ({ ...section, items: grouped()[section.key] })),
  );

  const runAction = async (
    key: string,
    fn: () => Promise<unknown>,
    successMessage: string,
  ) => {
    setBusy(key);
    try {
      await fn();
      toast.success(successMessage);
      revalidate('education');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setBusy(null);
    }
  };

  const onMove = (entry: EducationEntry, direction: 'up' | 'down') =>
    void runAction(
      `move:${entry.id}`,
      () =>
        api(`/content/education/${entry.id}/move`, {
          method: 'POST',
          body: JSON.stringify({ direction }),
        }),
      direction === 'up' ? 'Entry moved up' : 'Entry moved down',
    );

  const onPublish = (entry: EducationEntry) =>
    void runAction(
      `publish:${entry.id}`,
      () => api(`/content/education/${entry.id}/publish`, { method: 'POST' }),
      'Entry published',
    );

  const onDelete = async () => {
    const target = deleteTarget();
    if (!target) return;
    setBusy(`delete:${target.id}`);
    try {
      await api(`/content/education/${target.id}`, { method: 'DELETE' });
      toast.success('Entry deleted');
      setDeleteTarget(null);
      revalidate('education');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete the entry.');
    } finally {
      setBusy(null);
    }
  };

  const openEditor = (entry: EducationEntry | null) => {
    setEditing(entry);
    setEditorOpen(true);
  };

  return (
    <RequireAuth>
      <RequirePermission permission="content.moderate">
      <div class="flex flex-col gap-6">
        <header class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span class="eyebrow">Content / Education</span>
            <h1 class="font-display text-2xl font-bold tracking-[-0.02em] text-fg sm:text-3xl">
              Education
            </h1>
            <p class="mt-2 max-w-prose text-sm leading-relaxed text-fg-soft">
              Lecture notes, presentations, and posters shown on the public site.
            </p>
          </div>
          <Button onClick={() => openEditor(null)}>Add entry</Button>
        </header>

        <Show
          when={!error()}
          fallback={
            <ErrorState
              title="Failed to load education"
              message={error() ?? undefined}
              retry={() => {
                revalidate('education');
              }}
            />
          }
        >
          <Show
            when={loading() && entries().length === 0}
            fallback={
              <div class="flex flex-col gap-6">
                <For each={sections()}>
                  {(section) => (
                    <Card padded={false} class="overflow-hidden">
                      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
                        <div class="flex flex-col gap-1">
                          <h2 class="font-display text-[17px] font-semibold tracking-[-0.01em] text-fg">
                            {section.label}
                          </h2>
                          <p class="text-sm leading-relaxed text-fg-soft">{section.blurb}</p>
                        </div>
                        <Badge tone="neutral">
                          {section.items.length} {section.items.length === 1 ? 'entry' : 'entries'}
                        </Badge>
                      </div>
                      <Show
                        when={section.items.length > 0}
                        fallback={
                          <EmptyState
                            title={`No ${section.label.toLowerCase()} yet`}
                            description="Add the first entry with the button in the page header."
                          />
                        }
                      >
                        <div class="flex flex-col divide-y divide-border">
                          <For each={section.items}>
                            {(entry, index) => (
                              <EntryCard
                                entry={entry}
                                index={index}
                                count={() => section.items.length}
                                busy={busy}
                                onMove={onMove}
                                onPublish={onPublish}
                                onView={(e) => navigate(`/education/${e.id}`)}
                                onEdit={(e) => openEditor(e)}
                                onDelete={(e) => setDeleteTarget(e)}
                              />
                            )}
                          </For>
                        </div>
                      </Show>
                    </Card>
                  )}
                </For>
              </div>
            }
          >
            <EducationSkeleton />
          </Show>
        </Show>
      </div>

      <Dialog
        open={editorOpen()}
        onClose={() => setEditorOpen(false)}
        title={editing() ? 'Edit entry' : 'Add entry'}
        description="Entries are drafts until published; published entries trigger a static-site rebuild."
        size="lg"
      >
        <EducationEditor
          entry={editing()}
          onClose={() => setEditorOpen(false)}
          onSaved={() => revalidate('education')}
        />
      </Dialog>

      <ConfirmDialog
        open={deleteTarget() !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={onDelete}
        title="Delete entry?"
        description={`"${deleteTarget()?.heading ?? ''}" will be permanently removed.`}
        confirmLabel="Delete"
        destructive
        isLoading={busy() !== null}
      />
      </RequirePermission>
    </RequireAuth>
  );
}
