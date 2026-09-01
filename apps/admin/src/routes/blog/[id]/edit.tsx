import { createMemo, createSignal, Show } from 'solid-js';
import { query, revalidate, useNavigate, useParams } from '@solidjs/router';
import { api } from '../../../lib/api';
import type { BlogPost, BlogSubmission } from '../../../lib/types';
import { BlogEditor } from '../../../components/blog/BlogEditor';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Skeleton } from '../../../components/ui/Skeleton';
import { RequireAuth, RequirePermission } from '../../guard';

type BlogDetailResponse = {
  post: BlogPost;
  submissions: BlogSubmission[];
};

const getPost = query(
  (id: string) => api<BlogDetailResponse>(`/content/blog/${id}`),
  'blog-review',
);

export default function BlogEditPage() {
  return (
    <RequireAuth>
      <RequirePermission permission="content.moderate">
        <BlogEdit />
      </RequirePermission>
    </RequireAuth>
  );
}

function BlogEdit() {
  const params = useParams();
  const navigate = useNavigate();

  const [error, setError] = createSignal<string | null>(null);

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
        <BlogEditor
          initial={post()}
          eyebrow="Content / Blog"
          onSaved={() => {
            revalidate('blog-review');
            navigate('/blog');
          }}
        />
      </Show>
    </div>
  );
}
