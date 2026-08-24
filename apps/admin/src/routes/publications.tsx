import { createMemo, createSignal, For, Show } from 'solid-js';
import { query, revalidate } from '@solidjs/router';
import type { Publication } from '../lib/types';
import { api, ApiError } from '../lib/api';
import { toast } from '../lib/toast';
import { RequirePermission } from './guard';
import { Badge } from '../components/ui/Badge';
import type { BadgeTone } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Skeleton } from '../components/ui/Skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { PublicationEditor } from '../components/publications/PublicationEditor';

export const getPubs = query(
  () => api<{ publications: Publication[] }>('/content/publications'),
  'publications',
);

const TYPE_TONE: Record<Publication['type'], BadgeTone> = {
  journal: 'cyan',
  conference: 'amber',
  preprint: 'neutral',
};

function typeLabel(type: Publication['type']): string {
  switch (type) {
    case 'journal':
      return 'Journal';
    case 'conference':
      return 'Conference';
    case 'preprint':
      return 'Preprint';
  }
}

function PublicationsListSkeleton() {
  return (
    <div class="flex flex-col gap-2">
      <Skeleton class="h-9 w-full" />
      <Skeleton class="h-9 w-full" />
      <Skeleton class="h-9 w-full" />
      <Skeleton class="h-9 w-full" />
    </div>
  );
}

export default function Publications() {
  const [loadError, setLoadError] = createSignal<string | null>(null);

  const pubs = createMemo<{ publications: Publication[] } | undefined>(
    async () => {
      setLoadError(null);
      try {
        return await getPubs();
      } catch (err) {
        const message =
          err instanceof ApiError || err instanceof Error
            ? err.message
            : 'Failed to load publications.';
        setLoadError(message);
        return undefined;
      }
    },
    { loadingValue: undefined },
  );

  const publications = createMemo(() => pubs()?.publications ?? []);

  const [editorOpen, setEditorOpen] = createSignal(false);
  const [editing, setEditing] = createSignal<Publication | null>(null);
  const [publishingId, setPublishingId] = createSignal<string | null>(null);
  const [deleteTarget, setDeleteTarget] = createSignal<Publication | null>(null);
  const [deleting, setDeleting] = createSignal(false);

  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (publication: Publication) => {
    setEditing(publication);
    setEditorOpen(true);
  };

  const onSaved = async () => {
    await revalidate(getPubs.key);
  };

  const onPublish = async (publication: Publication) => {
    setPublishingId(publication.id);
    try {
      await api(`/content/publications/${publication.id}/publish`, { method: 'POST' });
      toast.success('Publication published', { description: publication.title });
      await onSaved();
    } catch (err) {
      const message =
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Could not publish the publication.';
      toast.error('Publish failed', { description: message });
    } finally {
      setPublishingId(null);
    }
  };

  const onDelete = async () => {
    const target = deleteTarget();
    if (!target) return;
    setDeleting(true);
    try {
      await api(`/content/publications/${target.id}`, { method: 'DELETE' });
      toast.success('Publication deleted', { description: target.title });
      await onSaved();
      setDeleteTarget(null);
    } catch (err) {
      const message =
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Could not delete the publication.';
      toast.error('Delete failed', { description: message });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <RequirePermission permission="content.moderate">
      <div class="flex flex-col gap-6">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <header>
            <span class="eyebrow eyebrow-amber">Content / Publications</span>
            <h1 class="font-display text-2xl font-bold tracking-[-0.02em] text-fg sm:text-3xl">
              Publications
            </h1>
            <p class="mt-2 max-w-prose text-sm leading-relaxed text-fg-soft">
              Journal articles, conference proceedings, and preprints. Drafts stay private;
              publishing enqueues a public-site rebuild.
            </p>
          </header>
          <Button onClick={openNew}>New publication</Button>
        </div>

        <Show when={loadError()} keyed>
          {(message) => (
            <ErrorState
              title="Failed to load publications"
              message={message}
              retry={() => revalidate(getPubs.key)}
            />
          )}
        </Show>

        <Show when={!loadError()}>
          <Show when={pubs() !== undefined} fallback={<PublicationsListSkeleton />}>
            <Show
              when={publications().length > 0}
              fallback={
                <EmptyState
                  title="No publications yet"
                  description="Create your first publication draft to get started."
                  action={
                    <Button variant="outline" size="sm" onClick={openNew}>
                      New publication
                    </Button>
                  }
                  lines
                />
              }
            >
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Title</TableHeader>
                    <TableHeader>Venue</TableHeader>
                    <TableHeader>Year</TableHeader>
                    <TableHeader>Type</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader class="text-right">Actions</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <For each={publications()}>
                    {(publication) => (
                      <TableRow>
                        <TableCell class="max-w-[24rem] font-medium text-fg">
                          <span class="line-clamp-2">{publication.title}</span>
                        </TableCell>
                        <TableCell class="text-fg-soft">{publication.venue}</TableCell>
                        <TableCell class="whitespace-nowrap font-mono text-xs text-fg-soft">
                          {publication.year}
                        </TableCell>
                        <TableCell>
                          <Badge tone={TYPE_TONE[publication.type]}>
                            {typeLabel(publication.type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge tone={publication.status === 'published' ? 'green' : 'amber'} dot>
                            {publication.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div class="flex items-center justify-end gap-1">
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => openEdit(publication)}
                            >
                              Edit
                            </Button>
                            <Show when={publication.status === 'draft'}>
                              <Button
                                variant="ghost"
                                size="xs"
                                isLoading={publishingId() === publication.id}
                                onClick={() => onPublish(publication)}
                              >
                                Publish
                              </Button>
                            </Show>
                            <Button
                              variant="ghost"
                              size="xs"
                              class="text-red hover:text-red"
                              onClick={() => setDeleteTarget(publication)}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </For>
                </TableBody>
              </Table>
            </Show>
          </Show>
        </Show>

        <PublicationEditor
          open={editorOpen()}
          onClose={() => setEditorOpen(false)}
          publication={editing()}
          onSaved={onSaved}
        />

        <ConfirmDialog
          open={deleteTarget() !== null}
          onClose={() => setDeleteTarget(null)}
          onConfirm={onDelete}
          title="Delete publication?"
          description="This action cannot be undone."
          confirmLabel="Delete"
          destructive
          isLoading={deleting()}
        />
      </div>
    </RequirePermission>
  );
}
