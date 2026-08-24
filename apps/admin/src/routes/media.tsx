import { createEffect, createSignal, For, Show } from 'solid-js';
import type { Accessor } from 'solid-js';
import { query, revalidate } from '@solidjs/router';
import { api, mediaUrl } from '../lib/api';
import { toast } from '../lib/toast';
import type { MediaAsset } from '../lib/types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Field } from '../components/ui/Field';
import { Select } from '../components/ui/Select';
import { Skeleton } from '../components/ui/Skeleton';
import { RequirePermission } from './guard';

type Purpose = 'avatar' | 'blog' | 'page';

const PURPOSES: { value: Purpose; label: string }[] = [
  { value: 'avatar', label: 'Avatar' },
  { value: 'blog', label: 'Blog' },
  { value: 'page', label: 'Page' },
];

const getMedia = query(() => api<{ media: MediaAsset[] }>('/media'), 'media');

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

type MediaCardProps = {
  asset: MediaAsset;
  busy: Accessor<string | null>;
  onDelete: (asset: MediaAsset) => void;
};

function MediaCard(props: MediaCardProps) {
  const { asset } = props;
  const isBusy = () => props.busy() === `delete:${asset.id}`;
  const src = mediaUrl(asset.key);

  return (
    <Card padded={false} class="flex flex-col overflow-hidden">
      <Show
        when={src}
        fallback={
          <div class="flex aspect-video items-center justify-center bg-fg/5 font-mono text-[10px] uppercase tracking-[0.08em] text-fg-faint">
            no preview
          </div>
        }
      >
        {(value) => (
          <img
            src={value()}
            alt={asset.filename}
            class="aspect-video w-full object-cover"
            loading="lazy"
          />
        )}
      </Show>
      <div class="flex flex-1 flex-col gap-1 p-4">
        <span class="truncate text-sm font-medium text-fg" title={asset.filename}>
          {asset.filename}
        </span>
        <span class="font-mono text-[10.5px] uppercase tracking-[0.08em] text-fg-faint">
          {asset.mime}
        </span>
        <span class="font-mono text-[10.5px] uppercase tracking-[0.08em] text-fg-faint">
          {formatBytes(asset.size)}
        </span>
        <span class="font-mono text-[10.5px] uppercase tracking-[0.08em] text-fg-faint">
          by {asset.uploadedBy.slice(0, 8)}
        </span>
        <span class="font-mono text-[10.5px] uppercase tracking-[0.08em] text-fg-faint">
          {formatDate(asset.createdAt)}
        </span>
        <Button
          variant="destructive"
          size="sm"
          class="mt-2"
          isLoading={isBusy()}
          disabled={props.busy() !== null}
          onClick={() => props.onDelete(asset)}
        >
          Delete
        </Button>
      </div>
    </Card>
  );
}

function MediaSkeleton() {
  return (
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <For each={[0, 1, 2, 3, 4, 5, 6, 7]}>
        {() => (
          <div class="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-bg-raised p-3">
            <Skeleton class="aspect-video w-full" />
            <Skeleton class="h-3 w-3/4" />
            <Skeleton class="h-3 w-1/2" />
          </div>
        )}
      </For>
    </div>
  );
}

export default function Media() {
  const [assets, setAssets] = createSignal<MediaAsset[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [busy, setBusy] = createSignal<string | null>(null);
  const [uploading, setUploading] = createSignal(false);
  const [purpose, setPurpose] = createSignal<Purpose>('page');
  const [deleteTarget, setDeleteTarget] = createSignal<MediaAsset | null>(null);
  let fileRef: HTMLInputElement | undefined;

  const load = () => {
    setLoading(true);
    return getMedia()
      .then((data) => {
        setAssets(data.media);
        setError(null);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load media.'))
      .finally(() => setLoading(false));
  };

  createEffect(() => {
    void load();
  });

  const handleUpload = async (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    form.append('purpose', purpose());
    setUploading(true);
    try {
      await api('/media', { method: 'POST', body: form });
      toast.success('Upload complete', { description: file.name });
      revalidate('media');
    } catch (err) {
      toast.error('Upload failed', {
        description: err instanceof Error ? err.message : 'Could not upload the file.',
      });
    } finally {
      setUploading(false);
      input.value = '';
    }
  };

  const onDelete = async () => {
    const target = deleteTarget();
    if (!target) return;
    setBusy(`delete:${target.id}`);
    try {
      await api(`/media/${target.id}`, { method: 'DELETE' });
      toast.success('Asset deleted', { description: target.filename });
      setDeleteTarget(null);
      revalidate('media');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete the asset.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <RequirePermission permission="media.manage">
      <div class="flex flex-col gap-6">
        <header class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span class="eyebrow">Library / Media</span>
            <h1 class="font-display text-2xl font-bold tracking-[-0.02em] text-fg sm:text-3xl">
              Media
            </h1>
            <p class="mt-2 max-w-prose text-sm leading-relaxed text-fg-soft">
              Images uploaded to the lab's media library, served from the R2 bucket.
            </p>
          </div>
        </header>

        <Card class="flex flex-wrap items-end justify-between gap-4">
          <Field label="Purpose" hint="Tags the upload so editors can find it by use case.">
            <Select
              value={purpose()}
              disabled={uploading()}
              onInput={(event) => setPurpose(event.currentTarget.value as Purpose)}
            >
              <For each={PURPOSES}>
                {(option) => <option value={option.value}>{option.label}</option>}
              </For>
            </Select>
          </Field>
          <div class="flex items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              class="hidden"
              disabled={uploading()}
              onChange={handleUpload}
            />
            <Button
              isLoading={uploading()}
              disabled={uploading()}
              onClick={() => fileRef?.click()}
            >
              Upload image
            </Button>
            <span class="font-mono text-[10.5px] uppercase tracking-[0.08em] text-fg-faint">
              PNG, JPG, WebP · max 10 MB
            </span>
          </div>
        </Card>

        <Show
          when={!error()}
          fallback={
            <ErrorState
              title="Failed to load media"
              message={error() ?? undefined}
              retry={() => {
                revalidate('media');
                void load();
              }}
            />
          }
        >
          <Show
            when={loading() && assets().length === 0}
            fallback={
              <Show
                when={assets().length > 0}
                fallback={
                  <EmptyState
                    title="No media yet"
                    description="Upload an image above to populate the library."
                  />
                }
              >
                <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  <For each={assets()}>
                    {(asset) => (
                      <MediaCard
                        asset={asset}
                        busy={busy}
                        onDelete={(a) => setDeleteTarget(a)}
                      />
                    )}
                  </For>
                </div>
              </Show>
            }
          >
            <MediaSkeleton />
          </Show>
        </Show>
      </div>

      <ConfirmDialog
        open={deleteTarget() !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={onDelete}
        title="Delete asset?"
        description={`"${deleteTarget()?.filename ?? ''}" will be removed from storage and the library.`}
        confirmLabel="Delete"
        destructive
        isLoading={busy() !== null}
      />
    </RequirePermission>
  );
}
