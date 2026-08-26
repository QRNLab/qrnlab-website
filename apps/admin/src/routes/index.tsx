import { For, Show, createMemo, createSignal } from 'solid-js';
import { query, revalidate } from '@solidjs/router';
import type { Permission } from '@qrnlab/shared';
import { api } from '../lib/api';
import { useSession } from '../lib/session';
import { toast } from '../lib/toast';
import { RequireAuth } from './guard';
import type { PendingRebuild, Profile } from '../lib/types';
import { Badge } from '../components/ui/Badge';
import type { BadgeTone } from '../components/ui/Badge';
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

type QuickLink = { href: string; label: string; permission?: Permission };

const PERSONAL_LINKS: QuickLink[] = [
  { href: '/account', label: 'Profile' },
  { href: '/account/posts', label: 'My posts' },
  { href: '/account/posts/new', label: 'New post' },
];

const SECTION_LINKS: QuickLink[] = [
  { href: '/blog', label: 'Blog', permission: 'content.moderate' },
  { href: '/publications', label: 'Publications', permission: 'content.moderate' },
  { href: '/education', label: 'Education', permission: 'content.moderate' },
  { href: '/updates', label: 'Updates', permission: 'content.moderate' },
  { href: '/media', label: 'Media', permission: 'media.manage' },
  { href: '/team', label: 'Team', permission: 'team.review' },
  { href: '/users', label: 'Users', permission: 'users.manage' },
];

const PROFILE_STATUS_TONE: Record<Profile['status'], BadgeTone> = {
  approved: 'green',
  pending: 'amber',
  rejected: 'red',
};

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
  const profile = () => session()?.profile ?? null;
  const permissions = () => session()?.permissions ?? [];

  const canSiteStatus = () => permissions().includes('site.status');
  const canRebuild = () => permissions().includes('site.rebuild');
  const canTeamReview = () => permissions().includes('team.review');

  const sectionLinks = () =>
    SECTION_LINKS.filter((link) => !link.permission || permissions().includes(link.permission));

  const profileStatus = () => {
    const p = profile();
    return p ? { label: p.status, tone: PROFILE_STATUS_TONE[p.status] } : { label: 'Not set', tone: 'neutral' as BadgeTone };
  };

  const needsProfile = () => {
    const p = profile();
    return !p || p.status === 'rejected';
  };

  const [rebuildError, setRebuildError] = createSignal<string | null>(null);
  const rebuildStatus = createMemo<{ pending: PendingRebuild[]; count: number } | undefined>(
    async () => {
      try {
        const result = await getRebuildStatus();
        setRebuildError(null);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load rebuild status.';
        setRebuildError(message);
        return undefined;
      }
    },
    { loadingValue: undefined },
  );
  const rebuildLoading = () => rebuildStatus() === undefined && !rebuildError();

  const [membersError, setMembersError] = createSignal<string | null>(null);
  const members = createMemo<{ profiles: Profile[] } | undefined>(
    async () => {
      try {
        const result = await getAdminMembers();
        setMembersError(null);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load member submissions.';
        setMembersError(message);
        return undefined;
      }
    },
    { loadingValue: undefined },
  );
  const membersLoading = () => members() === undefined && !membersError();

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
              Welcome back, {user()?.name ?? 'there'}
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
            <Show when={rebuildLoading()}>
              <Skeleton class="h-40 w-full" />
            </Show>

            <Show when={rebuildError() && !rebuildStatus()}>
              <ErrorState
                title="Rebuild status unavailable"
                message={errorMessage(rebuildError())}
                retry={() => revalidate('rebuild-status')}
              />
            </Show>

            <Show when={rebuildStatus()}>
              <RebuildPanel
                pending={rebuildStatus()!.pending}
                count={rebuildStatus()!.count}
                canRebuild={canRebuild()}
                rebuilding={rebuilding()}
                onRebuild={() => setRebuildOpen(true)}
              />
            </Show>
          </Show>

          <Show when={canTeamReview()}>
            <Show when={membersLoading()}>
              <Skeleton class="h-40 w-full" />
            </Show>

            <Show when={membersError() && !members()}>
              <ErrorState
                title="Team review unavailable"
                message={errorMessage(membersError())}
                retry={() => revalidate('admin-members')}
              />
            </Show>

            <Show when={members()}>
              <TeamReviewCard
                pendingCount={members()!.profiles.filter((p) => p.status === 'pending').length}
              />
            </Show>
          </Show>
        </section>

        <Show when={needsProfile()}>
          <div class="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-amber/40 bg-amber/10 p-4">
            <div>
              <span class="font-mono text-[10.5px] uppercase tracking-[0.14em] text-fg-faint">Profile</span>
              <p class="mt-1 max-w-prose text-sm leading-relaxed text-fg-soft">
                {profile()
                  ? 'Your profile was not approved yet — review the feedback and resubmit it.'
                  : 'Complete your profile to appear on the QRNLab team page.'}
              </p>
            </div>
            <Button as="a" href="/account/edit" size="sm">
              {profile() ? 'Resubmit profile' : 'Complete profile'}
            </Button>
          </div>
        </Show>

        <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <For each={PERSONAL_LINKS}>
            {(link) => (
              <a
                href={link.href}
                class="rounded-[var(--radius)] border border-border bg-bg-raised p-4 transition-colors hover:border-amber"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="font-mono text-[10.5px] uppercase tracking-[0.14em] text-fg-faint">Personal</span>
                  <Show when={link.href === '/account'}>
                    <Badge tone={profileStatus().tone} dot>
                      {profileStatus().label}
                    </Badge>
                  </Show>
                </div>
                <span class="mt-1 block font-mono text-sm font-semibold uppercase tracking-[0.1em] text-fg">
                  {link.label}
                </span>
              </a>
            )}
          </For>
        </section>

        <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <For each={sectionLinks()}>
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
