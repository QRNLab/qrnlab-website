import { createMemo, createSignal, Show } from 'solid-js';
import { query, revalidate, useNavigate, useParams } from '@solidjs/router';
import { api } from '../../../lib/api';
import type { BlogPost } from '../../../lib/types';
import { BlogEditor } from '../../../components/blog/BlogEditor';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Skeleton } from '../../../components/ui/Skeleton';
import { RequireAuth } from '../../guard';

type MyPostsData = {
  posts: BlogPost[];
  me: { id: string; role: string; canModerate: boolean };
};

const getMyPosts = query(() => api<MyPostsData>('/content/blog?mine=1'), 'my-posts');

export default function AccountPostPage() {
  return (
    <RequireAuth>
      <AccountPostEdit />
    </RequireAuth>
  );
}

function AccountPostEdit() {
  const params = useParams();
  const navigate = useNavigate();

  const [error, setError] = createSignal<string | null>(null);

  const data = createMemo<MyPostsData | undefined>(
    async () => {
      try {
        const result = await getMyPosts();
        setError(null);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load the post.';
        setError(message);
        return undefined;
      }
    },
    { loadingValue: undefined },
  );

  const loading = () => data() === undefined && !error();
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
          retry={() => revalidate(getMyPosts.key)}
        />
      </Show>

      <Show when={data() && !post() && !loading()}>
        <ErrorState
          title="Post not found"
          message="This post does not exist, or it does not belong to your account."
        />
      </Show>

      <Show when={post()}>
        <BlogEditor initial={post()} eyebrow="My posts" onSaved={() => navigate('/account/posts')} />
      </Show>
    </div>
  );
}
