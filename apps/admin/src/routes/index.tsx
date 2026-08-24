import { For, Show, createMemo, createSignal } from 'solid-js';
import { Loading, Errored } from 'solid-js';
import { query, revalidate } from '@solidjs/router';
import { api } from '../lib/api';
import { useSession } from '../lib/session';
import { toast } from '../lib/toast';
import { RequireAuth } from './guard';
import type { PendingRebuild, Profile } from '../lib/types';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ErrorState } from '../components/ui/ErrorState';
import { Skeleton } from '../components/ui/Skeleton';
import { StatusPill } from '../components/ui/StatusPill';

const getRebuildStatus = query(
  () => api<{ pending: PendingRebuild[]; count: number }>('/rebuild/status'),
  'rebuild-status',
);

const getAdminMembers = query(
  () => api<{ profiles: Profile[] }>('/admin/members'),
  'admin-members',
);

const QUICK_LINKS = [
  { href: '/blog', label: 'Blog' },
  { href: '/publications', label: 'Publications' },
  { href: '/education', label: 'Education' },
  { href: '/updates', label: 'Updates' },
  { href: '/media', label: 'Media' },
  { href: '/users', label: 'Users' },
] as const;

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export default function Dashboard() {
  const { session } = useSession();
  const user = () => session()?.user;
  const permissions = () => session()?.permissions ?? [];

  const canSiteStatus = () => permissions().includes('site.status');
  const canRebuild = () => permissions().includes('site.rebuild');
  const canTeamReview = () => permissions().includes('team.review');

  const rebuildStatus = createMemo(() => getRebuildStatus());
  const members = createMemo(() => getAdminMembers());

  const [rebuildOpen, setRebuildOpen] = createSignal(false);
  const [rebuilding, setRebuilding] = createSignal(false);

  const triggerRebuild = async () => {
    setRebuilding(true);
    try {
      await api('/rebuild', { method: 'POST' });
      toast.success('Rebuild triggered', { description: 'The static site will rebuild shortly.' });
      revalidate('rebuild-status');
    } catch (err) {
      toast.error('Rebuild failed', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setRebuilding(false);
    }
  };

  return (
    <RequireAuth>
      <div class="flex flex-col gap-6">
        <header>
          <span class="eyebrow">Dashboard</span>
          <div class="mt-1 flex flex-wrap items-center gap-3">
            <h1 class="font-display text-2xl font-bold tracking-[-0.02em] text-fg sm:text-3xl">
              Welcome back, {user()?.name ?? 'Admin'}
            </h1>
            <Badge tone="amber" dot>
              {user()?.role ?? 'user'}
            </Badge>
          </div>
          <p class="mt-2 font-mono text-xs uppercase tracking-[0.1em] text-fg-faint">
            {user()?.email ?? ''}
          </p>
        </header>

        <section class="grid gap-4 sm:grid-cols-2">
          <Show when={canSiteStatus()}>
            <Errored
              fallback={(err, reset) => (
                <ErrorState
                  title="Rebuild status unavailable"
                  message={errorMessage(err())}
                  retry={() => {
                    revalidate('rebuild-status');
                    reset();
                  }}
                />
              )}
            >
              <Loading fallback={<Skeleton class="h-40 w-full" />}>
                <RebuildPanel
                  pending={rebuildStatus().pending}
                  count={rebuildStatus().count}
                  canRebuild={canRebuild()}
                  rebuilding={rebuilding()}
                  onRebuild={() => setRebuildOpen(true)}
                />
              </Loading>
            </Errored>
          </Show>

          <Show when={canTeamReview()}>
            <Errored
              fallback={(err, reset) => (
                <ErrorState
                  title="Team review unavailable"
                  message={errorMessage(err())}
                  retry={() => {
                    revalidate('admin-members');
                    reset();
                  }}
                />
              )}
            >
              <Loading fallback={<Skeleton class="h-40 w-full" />}>
                <TeamReviewCard
                  pendingCount={members().profiles.filter((p) => p.status === 'pending').length}
                />
              </Loading>
            </Errored>
          </Show>
        </section>

        <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <For each={QUICK_LINKS}>
            {(link) => (
              <a
                href={link.href}
                class="rounded-[var(--radius)] border border-border bg-bg-raised p-4 transition-colors hover:border-amber"
              >
                <span class="font-mono text-[10.5px] uppercase tracking-[0.14em] text-fg-faint">
                  Section
                </span>
                <span class="mt-1 block font-mono text-sm font-semibold uppercase tracking-[0.1em] text-fg">
                  {link.label}
                </span>
              </a>
            )}
          </For>
        </section>
      </div>

      <ConfirmDialog
        open={rebuildOpen()}
        onClose={() => setRebuildOpen(false)}
        onConfirm={() => {
          setRebuildOpen(false);
          void triggerRebuild();
        }}
        title="Rebuild site now?"
        description="This publishes every pending change to the live static site."
        confirmLabel="Rebuild now"
      />
    </RequireAuth>
  );
}

function RebuildPanel(props: {
  pending: PendingRebuild[];
  count: number;
  canRebuild: boolean;
  rebuilding: boolean;
  onRebuild: () => void;
}) {
  return (
    <Card class="flex h-full flex-col">
      <CardHeader eyebrow="Rebuild queue" title="Static site" />
      <CardContent class="flex flex-1 flex-col gap-3">
        <Show
          when={props.count > 0}
          fallback={
            <div class="flex flex-1 flex-col gap-2">
              <StatusPill label="Site up to date" tone="green" pulse={false} />
              <p class="text-sm leading-relaxed text-fg-soft">
                No changes are queued for the static site.
              </p>
            </div>
          }
        >
          <div class="flex flex-col gap-3">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <StatusPill label={`${props.count} changes pending rebuild`} tone="amber" />
              <Show when={props.canRebuild}>
                <Button size="sm" onClick={props.onRebuild} isLoading={props.rebuilding}>
                  Rebuild site now
                </Button>
              </Show>
            </div>
            <ul class="flex flex-col divide-y divide-border border-y border-border">
              <For each={props.pending}>
                {(item) => (
                  <li class="flex items-center gap-3 py-2">
                    <span class="shrink-0 font-mono text-[10.5px] uppercase tracking-[0.1em] text-amber">
                      {item.kind}
                    </span>
                    <span class="min-w-0 flex-1 truncate text-sm text-fg">{item.label}</span>
                    <span class="whitespace-nowrap font-mono text-xs text-fg-faint">
                      {formatDate(item.createdAt)}
                    </span>
                  </li>
                )}
              </For>
            </ul>
          </div>
        </Show>
      </CardContent>
    </Card>
  );
}

function TeamReviewCard(props: { pendingCount: number }) {
  return (
    <Card class="flex h-full flex-col">
      <CardHeader eyebrow="Team review" title="Member submissions" />
      <CardContent class="flex flex-1 flex-col gap-3">
        <p class="text-sm leading-relaxed text-fg-soft">
          <span class="font-mono text-2xl font-semibold text-fg">{props.pendingCount}</span>{' '}
          {props.pendingCount === 1 ? 'submission' : 'submissions'} waiting for review.
        </p>
        <Button as="a" href="/team" variant="outline" size="sm" class="mt-auto self-start">
          Review team
        </Button>
      </CardContent>
    </Card>
  );
}
