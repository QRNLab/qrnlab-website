import { createMemo, createSignal, For, Show } from 'solid-js';
import { query, revalidate, useNavigate, useParams } from '@solidjs/router';
import { extractYoutubeId, youtubeEmbedUrl } from '@qrnlab/shared';
import { api, mediaUrl } from '../../lib/api';
import type { EducationEntry } from '../../lib/types';
import { toast } from '../../lib/toast';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { ErrorState } from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Skeleton';
import { EducationEditor } from '../../components/education/EducationEditor';
import { ReviewActions } from '../../components/review/ReviewActions';
import { RequireAuth, RequirePermission } from '../guard';

const getEducationEntry = query(
  (id: string) => api<{ entry: EducationEntry }>(`/content/education/${id}`),
  'education-detail',
);

const SECTION_LABEL: Record<EducationEntry['section'], string> = {
  'lecture-notes': 'Lecture notes',
  presentations: 'Presentations',
  posters: 'Posters',
};

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function DetailRow(props: { label: string; children: unknown }) {
  return (
    <div class="grid grid-cols-[minmax(9rem,12rem)_1fr] gap-4">
      <span class="font-mono text-[10.5px] uppercase tracking-[0.1em] text-fg-faint">
        {props.label}
      </span>
      {typeof props.children === 'string' || typeof props.children === 'number' ? (
        <p class="whitespace-pre-wrap text-sm leading-relaxed text-fg">{props.children}</p>
      ) : (
        props.children
      )}
    </div>
  );
}

export default function EducationDetailPage() {
  return (
    <RequireAuth>
      <RequirePermission permission="content.moderate">
        <EducationDetail />
      </RequirePermission>
    </RequireAuth>
  );
}

function EducationDetail() {
  const params = useParams();
  const navigate = useNavigate();

  const [error, setError] = createSignal<string | null>(null);
  const [editorOpen, setEditorOpen] = createSignal(false);

  const data = createMemo<{ entry: EducationEntry } | undefined>(
    async () => {
      try {
        const result = await getEducationEntry(params.id ?? '');
        setError(null);
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load the entry.');
        return undefined;
      }
    },
    { loadingValue: undefined },
  );

  const loading = () => data() === undefined && !error();
  const entry = () => data()?.entry ?? null;

  const videos = () =>
    entry()?.youtubeLinks
      .map((url) => extractYoutubeId(url))
      .filter((id): id is string => id !== null) ?? [];

  const onRevalidate = async () => {
    await revalidate(getEducationEntry.key);
    await revalidate('education');
  };

  const onPublish = async () => {
    if (!entry()) return;
    await api(`/content/education/${entry()!.id}/publish`, { method: 'POST' });
    toast.success('Entry published');
    await onRevalidate();
  };

  const onMove = async (direction: 'up' | 'down') => {
    if (!entry()) return;
    await api(`/content/education/${entry()!.id}/move`, {
      method: 'POST',
      body: JSON.stringify({ direction }),
    });
    toast.success(direction === 'up' ? 'Entry moved up' : 'Entry moved down');
    await onRevalidate();
  };

  const onDelete = async () => {
    if (!entry()) return;
    await api(`/content/education/${entry()!.id}`, { method: 'DELETE' });
    toast.success('Entry deleted');
    navigate('/education');
  };

  return (
    <div class="flex flex-col gap-6">
      <Show when={loading() && !data()}>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <Skeleton class="h-3 w-40" />
            <Skeleton class="h-7 w-64" />
          </div>
          <Skeleton class="h-64" />
        </div>
      </Show>

      <Show when={error() && !data()}>
        <ErrorState
          title="Failed to load entry"
          message={error() ?? 'Something went wrong.'}
          retry={() => revalidate(getEducationEntry.key)}
        />
      </Show>

      <Show when={data() && !entry() && !loading()}>
        <ErrorState title="Entry not found" message="This entry does not exist." />
      </Show>

      <Show when={entry()}>
        <header class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span class="eyebrow">Content / Education</span>
            <h1 class="font-display text-2xl font-bold tracking-[-0.02em] text-fg sm:text-3xl">
              {entry()!.heading}
            </h1>
          </div>
          <div class="flex items-center gap-2">
            <Badge tone={entry()!.status === 'published' ? 'green' : 'amber'} dot>
              {entry()!.status}
            </Badge>
            <span class="font-mono text-[10.5px] uppercase tracking-[0.08em] text-fg-faint">
              #{entry()!.sortOrder}
            </span>
            <Button variant="outline" size="sm" onClick={() => setEditorOpen(true)}>
              Edit
            </Button>
          </div>
        </header>

        <div class="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-bg-raised p-4">
          <DetailRow label="Section">{SECTION_LABEL[entry()!.section]}</DetailRow>

          <Show when={entry()!.description}>
            <DetailRow label="Description">{entry()!.description}</DetailRow>
          </Show>

          <Show when={entry()!.images.length > 0}>
            <DetailRow label="Images">
              <div class="flex flex-wrap gap-2">
                <For each={entry()!.images}>
                  {(key) => {
                    const src = mediaUrl(key);
                    return src ? (
                      <img
                        src={src}
                        alt=""
                        class="h-20 w-20 rounded-[var(--radius)] border border-border object-cover"
                      />
                    ) : null;
                  }}
                </For>
              </div>
            </DetailRow>
          </Show>

          <Show when={entry()!.links.length > 0}>
            <DetailRow label="Links">
              <div class="flex flex-wrap gap-2">
                <For each={entry()!.links}>
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
            </DetailRow>
          </Show>

          <Show when={videos().length > 0}>
            <DetailRow label="YouTube">
              <div class="flex flex-wrap gap-3">
                <For each={videos()}>
                  {(id) => (
                    <iframe
                      src={youtubeEmbedUrl(id)}
                      title="YouTube video"
                      class="aspect-video w-64 rounded-[var(--radius)] border border-border"
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowfullscreen
                    />
                  )}
                </For>
              </div>
            </DetailRow>
          </Show>

          <DetailRow label="Updated">{formatDate(entry()!.updatedAt)}</DetailRow>
        </div>

        <div class="flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <ReviewActions
            actions={[
              {
                key: 'move-up',
                label: 'Move up',
                variant: 'outline',
                onRun: () => onMove('up'),
              },
              {
                key: 'move-down',
                label: 'Move down',
                variant: 'outline',
                onRun: () => onMove('down'),
              },
              {
                key: 'publish',
                label: 'Publish',
                variant: 'solid',
                disabled: entry()!.status !== 'draft',
                confirm: {
                  title: 'Publish this entry?',
                  description: 'It goes live on the public site after the next rebuild.',
                  confirmLabel: 'Publish',
                },
                onRun: onPublish,
              },
              {
                key: 'delete',
                label: 'Delete',
                variant: 'destructive',
                confirm: {
                  title: 'Delete entry?',
                  description: 'This permanently deletes the entry. This action cannot be undone.',
                  confirmLabel: 'Delete',
                  destructive: true,
                },
                onRun: onDelete,
              },
            ]}
          />
        </div>
      </Show>

      <Dialog
        open={editorOpen()}
        onClose={() => setEditorOpen(false)}
        title="Edit entry"
        description="Entries are drafts until published; published entries trigger a static-site rebuild."
        size="lg"
      >
        <EducationEditor
          entry={entry()}
          onClose={() => setEditorOpen(false)}
          onSaved={() => onRevalidate()}
        />
      </Dialog>
    </div>
  );
}
