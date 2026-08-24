import { createMemo, createSignal, Errored, For, Loading, Show } from 'solid-js';
import { query, revalidate, useNavigate } from '@solidjs/router';
import { Badge } from '../../components/ui/Badge';
import type { BadgeTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { api } from '../../lib/api';
import { toast } from '../../lib/toast';
import type { BlogPost } from '../../lib/types';
import { RequireAuth } from '../guard';

type MyPostsData = {
  posts: BlogPost[];
  me: { id: string; role: string; canModerate: boolean };
};

const STATUS_TONE: Record<BlogPost['status'], BadgeTone> = {
  draft: 'neutral',
  submitted: 'amber',
  published: 'green',
  rejected: 'red',
};

const getMyPosts = query(() => api<MyPostsData>('/content/blog'), 'my-posts');

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Failed to load your posts.';
}

export default function AccountPosts() {
  const navigate = useNavigate();
  const data = createMemo(() => getMyPosts());

  const [submittingId, setSubmittingId] = createSignal<string | null>(null);
  const [deleteTarget, setDeleteTarget] = createSignal<BlogPost | null>(null);
  const [deleting, setDeleting] = createSignal(false);

  const onSubmit = async (post: BlogPost) => {
    setSubmittingId(post.id);
    try {
      await api(`/content/blog/${post.id}/submit`, { method: 'POST' });
      toast.success('Post submitted for review');
      await revalidate(getMyPosts.key);
    } catch (err) {
      toast.error('Could not submit post', {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSubmittingId(null);
    }
  };

  const onDelete = async () => {
    const post = deleteTarget();
    if (!post) return;
    setDeleting(true);
    try {
      await api(`/content/blog/${post.id}`, { method: 'DELETE' });
      toast.success('Post deleted');
      await revalidate(getMyPosts.key);
      setDeleteTarget(null);
    } catch (err) {
      toast.error('Could not delete post', {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setDeleting(false);
    }
  };

  const PostsSkeleton = () => (
    <div class="flex flex-col gap-4">
      <Skeleton class="h-10 w-full" />
      <Skeleton class="h-10 w-full" />
      <Skeleton class="h-10 w-full" />
    </div>
  );

  return (
    <RequireAuth>
      <div class="flex flex-col gap-6">
        <header class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span class="eyebrow">Account</span>
            <h1 class="mt-2 font-display text-2xl font-bold tracking-[-0.02em] text-fg sm:text-3xl">
              My posts
            </h1>
            <p class="mt-2 max-w-prose text-sm leading-relaxed text-fg-soft">
              Draft, submitted, and published blog posts attached to your account.
            </p>
          </div>
          <Button onClick={() => navigate('/blog/new')}>New post</Button>
        </header>

        <Errored
          fallback={(err) => (
            <ErrorState
              title="Could not load posts"
              message={errorMessage(err())}
              retry={() => revalidate(getMyPosts.key)}
            />
          )}
        >
          <Loading fallback={<PostsSkeleton />}>
            <Show
              when={data().posts.length > 0}
              fallback={
                <EmptyState
                  title="No posts yet"
                  description="Write your first post and submit it for review."
                  action={<Button onClick={() => navigate('/blog/new')}>New post</Button>}
                  lines
                />
              }
            >
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Title</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader>Updated</TableHeader>
                    <TableHeader class="text-right">Actions</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <For each={data().posts}>
                    {(post) => (
                      <TableRow>
                        <TableCell class="font-medium text-fg">
                          <a href={`/blog/${post.id}`} class="transition-colors hover:text-amber">
                            {post.title}
                          </a>
                        </TableCell>
                        <TableCell>
                          <Badge tone={STATUS_TONE[post.status]}>{post.status}</Badge>
                        </TableCell>
                        <TableCell class="whitespace-nowrap font-mono text-xs text-fg-faint">
                          {formatDate(post.updatedAt)}
                        </TableCell>
                        <TableCell>
                          <div class="flex items-center justify-end gap-1.5">
                            <Button as="a" href={`/blog/${post.id}`} variant="outline" size="xs">
                              Edit
                            </Button>
                            <Show when={post.status === 'draft'}>
                              <Button
                                variant="ghost"
                                size="xs"
                                isLoading={submittingId() === post.id}
                                onClick={() => onSubmit(post)}
                              >
                                Submit for review
                              </Button>
                            </Show>
                            <Button
                              variant="ghost"
                              size="xs"
                              class="text-red hover:text-red"
                              onClick={() => setDeleteTarget(post)}
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
          </Loading>
        </Errored>

        <ConfirmDialog
          open={Boolean(deleteTarget())}
          onClose={() => setDeleteTarget(null)}
          onConfirm={onDelete}
          title="Delete post?"
          description={deleteTarget() ? `"${deleteTarget()!.title}" will be permanently removed.` : undefined}
          confirmLabel="Delete"
          destructive
          isLoading={deleting()}
        />
      </div>
    </RequireAuth>
  );
}
