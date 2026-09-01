import { createMemo, createSignal, For, Show } from 'solid-js';
import { query, revalidate, useNavigate } from '@solidjs/router';
import { api } from '../../lib/api';
import type { BlogPost } from '../../lib/types';
import { toast } from '../../lib/toast';
import { Badge } from '../../components/ui/Badge';
import type { BadgeTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Dialog } from '../../components/ui/Dialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Field } from '../../components/ui/Field';
import { Skeleton } from '../../components/ui/Skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Textarea } from '../../components/ui/Textarea';
import { RequireAuth, RequirePermission } from '../guard';

type BlogListResponse = {
  posts: BlogPost[];
  me: { id: string; role: string; canModerate: boolean };
};

const getPosts = query(
  () => api<BlogListResponse>('/content/blog'),
  'blog-posts',
);

const STATUS_TONE: Record<BlogPost['status'], BadgeTone> = {
  draft: 'neutral',
  submitted: 'amber',
  published: 'green',
  rejected: 'red',
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function Blog() {
  return (
    <RequireAuth>
      <RequirePermission permission="content.moderate">
        <BlogList />
      </RequirePermission>
    </RequireAuth>
  );
}

function BlogList() {
  const navigate = useNavigate();

  const [error, setError] = createSignal<string | null>(null);
  const [busy, setBusy] = createSignal(false);
  const [rejectTarget, setRejectTarget] = createSignal<BlogPost | null>(null);
  const [rejectNote, setRejectNote] = createSignal('');
  const [deleteTarget, setDeleteTarget] = createSignal<BlogPost | null>(null);

  const data = createMemo<BlogListResponse | undefined>(
    async () => {
      try {
        const result = await getPosts();
        setError(null);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load blog posts.';
        setError(message);
        return undefined;
      }
    },
    { loadingValue: undefined },
  );

  const loading = () => data() === undefined && !error();
  const posts = () => data()?.posts ?? [];

  const onPublish = async (post: BlogPost) => {
    setBusy(true);
    try {
      await api(`/content/blog/${post.id}/publish`, { method: 'POST' });
      toast.success('Post published');
      await revalidate(getPosts.key);
    } catch (err) {
      toast.error('Publish failed', {
        description: err instanceof Error ? err.message : 'Could not publish the post.',
      });
    } finally {
      setBusy(false);
    }
  };

  const onReject = async () => {
    const post = rejectTarget();
    if (!post) return;
    setBusy(true);
    try {
      await api(`/content/blog/${post.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ note: rejectNote().trim() || undefined }),
      });
      toast.success('Post rejected', { description: 'The author will see your note.' });
      setRejectTarget(null);
      setRejectNote('');
      await revalidate(getPosts.key);
    } catch (err) {
      toast.error('Reject failed', {
        description: err instanceof Error ? err.message : 'Could not reject the post.',
      });
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    const post = deleteTarget();
    if (!post) return;
    setBusy(true);
    try {
      await api(`/content/blog/${post.id}`, { method: 'DELETE' });
      toast.success('Post deleted');
      setDeleteTarget(null);
      await revalidate(getPosts.key);
    } catch (err) {
      toast.error('Delete failed', {
        description: err instanceof Error ? err.message : 'Could not delete the post.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div class="flex flex-col gap-6">
      <header class="flex items-end justify-between gap-4">
        <div>
          <span class="eyebrow">Content / Blog</span>
          <h1 class="font-display text-2xl font-bold tracking-[-0.02em] text-fg sm:text-3xl">
            Moderation queue
          </h1>
          <p class="mt-2 max-w-prose text-sm leading-relaxed text-fg-soft">
            Review, publish, or reject submitted lab posts.
          </p>
        </div>
      </header>

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
          title="Failed to load posts"
          message={error() ?? 'Something went wrong.'}
          retry={() => revalidate(getPosts.key)}
        />
      </Show>

      <Show when={data() && posts().length === 0}>
        <EmptyState
          title="No posts to moderate"
          description="Submitted posts will appear here for review."
        />
      </Show>

      <Show when={data() && posts().length > 0}>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Title</TableHeader>
              <TableHeader>Author</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Updated</TableHeader>
              <TableHeader class="text-right">Actions</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            <For each={posts()}>
              {(post) => (
                <TableRow>
                  <TableCell class="max-w-xs">
                    <span class="line-clamp-2 font-medium text-fg">{post.title}</span>
                  </TableCell>
                  <TableCell class="whitespace-nowrap text-sm text-fg-soft">
                    {post.authorName ?? post.authorId}
                  </TableCell>
                  <TableCell>
                    <Badge tone={STATUS_TONE[post.status]} dot>
                      {post.status}
                    </Badge>
                  </TableCell>
                  <TableCell class="whitespace-nowrap font-mono text-xs text-fg-faint">
                    {formatDate(post.updatedAt)}
                  </TableCell>
                  <TableCell>
                    <div class="flex flex-wrap items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/blog/${post.id}`)}
                        disabled={busy()}
                      >
                        Review
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/blog/${post.id}/edit`)}
                        disabled={busy()}
                      >
                        Edit
                      </Button>
                      <Show when={post.status === 'submitted'}>
                        <Button
                          variant="solid"
                          size="sm"
                          onClick={() => onPublish(post)}
                          disabled={busy()}
                        >
                          Publish
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRejectNote('');
                            setRejectTarget(post);
                          }}
                          disabled={busy()}
                        >
                          Reject
                        </Button>
                      </Show>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteTarget(post)}
                        disabled={busy()}
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

      <Dialog
        open={rejectTarget() !== null}
        onClose={() => setRejectTarget(null)}
        title="Reject post"
        description="Returns the post to the author for revision. They will see your note."
      >
        <Field label="Note to author" hint="Optional feedback shown to the author.">
          <Textarea
            value={rejectNote()}
            onInput={(event) => setRejectNote(event.currentTarget.value)}
            rows={4}
            placeholder="What needs to change before this can be published?"
          />
        </Field>
        <div class="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setRejectTarget(null)} disabled={busy()}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onReject} isLoading={busy()}>
            Reject post
          </Button>
        </div>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget() !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={onDelete}
        title="Delete post?"
        description="This permanently deletes the post. This action cannot be undone."
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}
