import { createEffect, createSignal, onCleanup, Show } from 'solid-js';
import { query, revalidate, useNavigate, useParams } from '@solidjs/router';
import { api } from '../../lib/api';
import type { BlogPost } from '../../lib/types';
import { BlogEditor } from '../../components/blog/BlogEditor';
import { ErrorState } from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Skeleton';
import { RequireAuth } from '../guard';

type BlogListResponse = {
  posts: BlogPost[];
  me: { id: string; role: string; canModerate: boolean };
};

const getPosts = query(
  () => api<BlogListResponse>('/content/blog'),
  'blog-posts',
);

export default function BlogPostPage() {
  return (
    <RequireAuth>
      <BlogPostEdit />
    </RequireAuth>
  );
}

function BlogPostEdit() {
  const params = useParams();
  const navigate = useNavigate();

  const [data, setData] = createSignal<BlogListResponse | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal(true);

  createEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void getPosts().then(
      (value) => {
        if (!active) return;
        setData(value);
        setLoading(false);
      },
      (err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load the post.');
        setLoading(false);
      },
    );
    onCleanup(() => {
      active = false;
    });
  });

  const post = () => data()?.posts.find((p) => p.id === params.id) ?? null;

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
          retry={() => revalidate(getPosts.key)}
        />
      </Show>

      <Show when={data() && !post() && !loading()}>
        <ErrorState
          title="Post not found"
          message="This post does not exist, or you do not have access to it."
        />
      </Show>

      <Show when={post()}>
        <BlogEditor initial={post()} onSaved={() => navigate('/blog')} />
      </Show>
    </div>
  );
}
