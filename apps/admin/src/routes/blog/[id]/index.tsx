import { createMemo, createSignal, Show } from 'solid-js';
import { query, revalidate, useNavigate, useParams } from '@solidjs/router';
import { marked } from 'marked';
import { api } from '../../../lib/api';
import type { BlogPost, BlogSubmission } from '../../../lib/types';
import { toast } from '../../../lib/toast';
import { Badge } from '../../../components/ui/Badge';
import type { BadgeTone } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Dialog';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Field } from '../../../components/ui/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Textarea } from '../../../components/ui/Textarea';
import { DiffView } from '../../../components/review/DiffView';
import { ReviewActions } from '../../../components/review/ReviewActions';
import { RequireAuth, RequirePermission } from '../../guard';

type BlogDetailResponse = {
  post: BlogPost;
  submissions: BlogSubmission[];
};

const getPost = query(
  (id: string) => api<BlogDetailResponse>(`/content/blog/${id}`),
  'blog-review',
);

const STATUS_TONE: Record<BlogPost['status'], BadgeTone> = {
  draft: 'neutral',
  submitted: 'amber',
  published: 'green',
  rejected: 'red',
};

function escapeHtml(source: string): string {
  return source.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderMarkdown(source: string): string {
  return marked.parse(escapeHtml(source), { gfm: true, breaks: true, async: false });
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function postPayload(post: BlogPost) {
  return { title: post.title, excerpt: post.excerpt, body: post.body, tags: post.tags ?? [] };
}

export default function BlogReviewPage() {
  return (
    <RequireAuth>
      <RequirePermission permission="content.moderate">
        <BlogReview />
      </RequirePermission>
    </RequireAuth>
  );
}

function BlogReview() {
  const params = useParams();
  const navigate = useNavigate();

  const [error, setError] = createSignal<string | null>(null);
  const [rejectNote, setRejectNote] = createSignal('');
  const [rejectOpen, setRejectOpen] = createSignal(false);

  const data = createMemo<BlogDetailResponse | undefined>(
    async () => {
      try {
        const result = await getPost(params.id ?? '');
        setError(null);
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load the post.');
        return undefined;
      }
    },
    { loadingValue: undefined },
  );

  const loading = () => data() === undefined && !error();
  const post = () => data()?.post ?? null;
  const submissions = () => data()?.submissions ?? [];

  const pending = () => submissions().find((s) => s.status === 'pending') ?? null;
  const base = () => submissions().find((s) => s.status !== 'pending') ?? null;
  const hasDiff = () => pending() !== null && base() !== null;

  const after = () => (pending() ? pending()!.payload : post() ? postPayload(post()!) : null);
  const before = () => (hasDiff() ? base()!.payload : null);

  const onRevalidate = async () => {
    await revalidate(getPost.key);
    await revalidate('blog-posts');
  };

  const onPublish = async () => {
    if (!post()) return;
    await api(`/content/blog/${post()!.id}/publish`, { method: 'POST' });
    toast.success('Post published');
    await onRevalidate();
    navigate('/blog');
  };

  const onReject = async () => {
    if (!post()) return;
    try {
      await api(`/content/blog/${post()!.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ note: rejectNote().trim() || undefined }),
      });
      toast.success('Post rejected', { description: 'The author will see your note.' });
      setRejectOpen(false);
      setRejectNote('');
      await onRevalidate();
    } catch (err) {
      toast.error('Reject failed', {
        description: err instanceof Error ? err.message : 'Could not reject the post.',
      });
    }
  };

  const onDelete = async () => {
    if (!post()) return;
    await api(`/content/blog/${post()!.id}`, { method: 'DELETE' });
    toast.success('Post deleted');
    navigate('/blog');
  };

  const renderValue = (key: string, value: unknown) => {
    if (key === 'body' && typeof value === 'string') {
      return (
        <div
          class="max-w-none space-y-3 overflow-x-auto text-sm leading-relaxed text-fg [&_h1]:font-display [&_h1]:text-xl [&_h1]:font-bold [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-display [&_h3]:text-base [&_h3]:font-semibold [&_a]:text-amber [&_a]:underline [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-amber [&_blockquote]:pl-4 [&_blockquote]:text-fg-soft [&_pre]:overflow-x-auto [&_pre]:rounded-[var(--radius)] [&_pre]:bg-void [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-xs [&_code]:font-mono [&_img]:max-w-full [&_img]:rounded-[var(--radius)] [&_hr]:border-border"
          innerHTML={renderMarkdown(value)}
        />
      );
    }
    return null;
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
          title="Failed to load post"
          message={error() ?? 'Something went wrong.'}
          retry={() => revalidate(getPost.key)}
        />
      </Show>

      <Show when={data() && !post() && !loading()}>
        <ErrorState title="Post not found" message="This post does not exist." />
      </Show>

      <Show when={post()}>
        <header class="flex flex-col gap-4">
          <div class="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span class="eyebrow eyebrow-amber">Content / Blog / Review</span>
              <h1 class="font-display text-2xl font-bold tracking-[-0.02em] text-fg sm:text-3xl">
                {post()!.title}
              </h1>
            </div>
            <div class="flex items-center gap-2">
              <Badge tone={STATUS_TONE[post()!.status]} dot>
                {post()!.status}
              </Badge>
              <Button variant="ghost" size="sm" onClick={() => navigate(`/blog/${post()!.id}/edit`)}>
                Edit
              </Button>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[11px] uppercase tracking-[0.08em] text-fg-faint">
            <span>Author: {post()!.authorName ?? post()!.authorId}</span>
            <span>Updated: {formatDate(post()!.updatedAt)}</span>
            <span>Created: {formatDate(post()!.createdAt)}</span>
            <Show when={post()!.publishedAt}>
              <span>Published: {formatDate(post()!.publishedAt)}</span>
            </Show>
            <Show when={pending()}>
              <span>Submitted: {formatDate(pending()!.submittedAt)}</span>
            </Show>
          </div>
        </header>

        <Show when={post()!.reviewNote}>
          <div class="rounded-[var(--radius)] border border-amber/40 bg-amber/10 p-3 text-sm leading-relaxed text-fg-soft">
            <span class="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-amber">
              Review note
            </span>
            <p class="mt-1">{post()!.reviewNote}</p>
          </div>
        </Show>

        <Show when={hasDiff()}>
          <div class="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-bg-raised p-3">
            <p class="text-sm leading-relaxed text-fg-soft">
              This submission revises an earlier version — changes are highlighted below.
            </p>
            <Badge tone="cyan">Resubmission</Badge>
          </div>
        </Show>

        <div class="rounded-[var(--radius)] border border-border bg-bg-raised p-4">
          <Show when={after() !== null} fallback={<Skeleton class="h-32" />}>
            <DiffView
              before={before()}
              after={after()!}
              fields={[
                { key: 'title', label: 'Title' },
                { key: 'excerpt', label: 'Excerpt' },
                { key: 'body', label: 'Body', longText: true },
                { key: 'tags', label: 'Tags' },
              ]}
              render={renderValue}
            />
          </Show>
        </div>

        <div class="flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <ReviewActions
            actions={[
              {
                key: 'publish',
                label: 'Publish',
                variant: 'solid',
                disabled: post()!.status === 'published',
                confirm: {
                  title: 'Publish this post?',
                  description: 'The post goes live on the public site after the next rebuild.',
                  confirmLabel: 'Publish',
                },
                onRun: onPublish,
              },
              {
                key: 'delete',
                label: 'Delete',
                variant: 'destructive',
                confirm: {
                  title: 'Delete post?',
                  description: 'This permanently deletes the post. This action cannot be undone.',
                  confirmLabel: 'Delete',
                  destructive: true,
                },
                onRun: onDelete,
              },
            ]}
          />
          <Show when={pending()}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRejectNote('');
                setRejectOpen(true);
              }}
            >
              Reject
            </Button>
          </Show>
        </div>
      </Show>

      <Dialog
        open={rejectOpen()}
        onClose={() => setRejectOpen(false)}
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
          <Button variant="outline" onClick={() => setRejectOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onReject}>
            Reject post
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
