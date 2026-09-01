import { createMemo, createSignal, Show } from 'solid-js';
import { query, revalidate, useNavigate, useParams } from '@solidjs/router';
import { api } from '../../lib/api';
import type { Publication } from '../../lib/types';
import { toast } from '../../lib/toast';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Skeleton';
import { PublicationEditor } from '../../components/publications/PublicationEditor';
import { ReviewActions } from '../../components/review/ReviewActions';
import { RequireAuth, RequirePermission } from '../guard';

const getPublication = query(
  (id: string) => api<{ publication: Publication }>(`/content/publications/${id}`),
  'publication-detail',
);

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function DetailRow(props: { label: string; children: unknown; href?: string }) {
  return (
    <div class="grid grid-cols-[minmax(9rem,12rem)_1fr] gap-4">
      <span class="font-mono text-[10.5px] uppercase tracking-[0.1em] text-fg-faint">
        {props.label}
      </span>
      {typeof props.children === 'string' || typeof props.children === 'number' ? (
        props.href ? (
          <a
            href={props.href}
            target="_blank"
            rel="noreferrer"
            class="text-sm leading-relaxed text-amber underline"
          >
            {props.children}
          </a>
        ) : (
          <p class="whitespace-pre-wrap text-sm leading-relaxed text-fg">{props.children}</p>
        )
      ) : (
        props.children
      )}
    </div>
  );
}

export default function PublicationDetailPage() {
  return (
    <RequireAuth>
      <RequirePermission permission="content.moderate">
        <PublicationDetail />
      </RequirePermission>
    </RequireAuth>
  );
}

function PublicationDetail() {
  const params = useParams();
  const navigate = useNavigate();

  const [error, setError] = createSignal<string | null>(null);
  const [editorOpen, setEditorOpen] = createSignal(false);

  const data = createMemo<{ publication: Publication } | undefined>(
    async () => {
      try {
        const result = await getPublication(params.id ?? '');
        setError(null);
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load the publication.');
        return undefined;
      }
    },
    { loadingValue: undefined },
  );

  const loading = () => data() === undefined && !error();
  const publication = () => data()?.publication ?? null;

  const onRevalidate = async () => {
    await revalidate(getPublication.key);
    await revalidate('publications');
  };

  const onPublish = async () => {
    if (!publication()) return;
    await api(`/content/publications/${publication()!.id}/publish`, { method: 'POST' });
    toast.success('Publication published');
    await onRevalidate();
  };

  const onDelete = async () => {
    if (!publication()) return;
    await api(`/content/publications/${publication()!.id}`, { method: 'DELETE' });
    toast.success('Publication deleted');
    navigate('/publications');
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
          title="Failed to load publication"
          message={error() ?? 'Something went wrong.'}
          retry={() => revalidate(getPublication.key)}
        />
      </Show>

      <Show when={data() && !publication() && !loading()}>
        <ErrorState title="Publication not found" message="This publication does not exist." />
      </Show>

      <Show when={publication()}>
        <header class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span class="eyebrow eyebrow-amber">Content / Publications</span>
            <h1 class="font-display text-2xl font-bold tracking-[-0.02em] text-fg sm:text-3xl">
              {publication()!.title}
            </h1>
          </div>
          <div class="flex items-center gap-2">
            <Badge tone={publication()!.status === 'published' ? 'green' : 'amber'} dot>
              {publication()!.status}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditorOpen(true);
              }}
            >
              Edit
            </Button>
          </div>
        </header>

        <div class="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-bg-raised p-4">
          <DetailRow label="Authors">
            <p class="text-sm leading-relaxed text-fg">
              {publication()!.authors.map((a) => a.name).join(', ')}
            </p>
          </DetailRow>
          <DetailRow label="Venue">{publication()!.venue}</DetailRow>
          <DetailRow label="Year">{publication()!.year}</DetailRow>
          <DetailRow label="Type">{publication()!.type}</DetailRow>
          <Show when={publication()!.url}>
            <DetailRow label="URL" href={publication()!.url!}>
              {publication()!.url}
            </DetailRow>
          </Show>
          <DetailRow label="Updated">{formatDate(publication()!.updatedAt)}</DetailRow>
        </div>

        <div class="flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <ReviewActions
            actions={[
              {
                key: 'publish',
                label: 'Publish',
                variant: 'solid',
                disabled: publication()!.status !== 'draft',
                confirm: {
                  title: 'Publish this publication?',
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
                  title: 'Delete publication?',
                  description: 'This permanently deletes the publication. This action cannot be undone.',
                  confirmLabel: 'Delete',
                  destructive: true,
                },
                onRun: onDelete,
              },
            ]}
          />
        </div>
      </Show>

      <PublicationEditor
        open={editorOpen()}
        onClose={() => setEditorOpen(false)}
        publication={publication()}
        onSaved={onRevalidate}
      />
    </div>
  );
}
