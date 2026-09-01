import { createMemo, createSignal, Show } from 'solid-js';
import { query, revalidate, useNavigate, useParams } from '@solidjs/router';
import { api } from '../../lib/api';
import type { Update } from '../../lib/types';
import { toast } from '../../lib/toast';
import { ErrorState } from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Skeleton';
import { ReviewActions } from '../../components/review/ReviewActions';
import { RequireAuth, RequirePermission } from '../guard';

const getUpdate = query(
  (id: string) => api<{ update: Update }>(`/content/updates/${id}`),
  'update-detail',
);

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function UpdateDetailPage() {
  return (
    <RequireAuth>
      <RequirePermission permission="content.moderate">
        <UpdateDetail />
      </RequirePermission>
    </RequireAuth>
  );
}

function UpdateDetail() {
  const params = useParams();
  const navigate = useNavigate();

  const [error, setError] = createSignal<string | null>(null);

  const data = createMemo<{ update: Update } | undefined>(
    async () => {
      try {
        const result = await getUpdate(params.id ?? '');
        setError(null);
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load the update.');
        return undefined;
      }
    },
    { loadingValue: undefined },
  );

  const loading = () => data() === undefined && !error();
  const update = () => data()?.update ?? null;

  const onDelete = async () => {
    if (!update()) return;
    await api(`/content/updates/${update()!.id}`, { method: 'DELETE' });
    toast.success('Update deleted');
    navigate('/updates');
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
          title="Failed to load update"
          message={error() ?? 'Something went wrong.'}
          retry={() => revalidate(getUpdate.key)}
        />
      </Show>

      <Show when={data() && !update() && !loading()}>
        <ErrorState title="Update not found" message="This update does not exist." />
      </Show>

      <Show when={update()}>
        <header>
          <span class="eyebrow eyebrow-amber">Content / Updates</span>
          <h1 class="font-display text-2xl font-bold tracking-[-0.02em] text-fg sm:text-3xl">
            News update
          </h1>
        </header>

        <div class="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-bg-raised p-4">
          <div class="flex items-center gap-3">
            <span class="font-mono text-[11px] uppercase tracking-[0.1em] text-fg-faint">
              {update()!.date}
            </span>
            <span class="font-mono text-[11px] uppercase tracking-[0.1em] text-fg-faint">
              Created {formatDate(update()!.createdAt)}
            </span>
          </div>
          <p class="max-w-prose whitespace-pre-wrap text-sm leading-relaxed text-fg">
            {update()!.text}
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <ReviewActions
            actions={[
              {
                key: 'delete',
                label: 'Delete',
                variant: 'destructive',
                confirm: {
                  title: 'Delete update?',
                  description: 'This permanently deletes the update. This action cannot be undone.',
                  confirmLabel: 'Delete',
                  destructive: true,
                },
                onRun: onDelete,
              },
            ]}
          />
        </div>
      </Show>
    </div>
  );
}
