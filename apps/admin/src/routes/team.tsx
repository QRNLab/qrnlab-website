import { For, Show, createMemo, createSignal } from 'solid-js';
import { query, revalidate, useNavigate } from '@solidjs/router';
import { api } from '../lib/api';
import { toast } from '../lib/toast';
import { RequireAuth, RequirePermission } from './guard';
import type { Profile } from '../lib/types';
import { Badge } from '../components/ui/Badge';
import type { BadgeTone } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Skeleton } from '../components/ui/Skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';

const getAdminMembers = query(
  () => api<{ profiles: Profile[] }>('/admin/members'),
  'admin-members',
);

const STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
] as const;

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function bioPreview(bio: string | null, max = 140): string | null {
  if (!bio) return null;
  const text = bio.trim();
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '…';
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

const statusTone = (status: Profile['status']): BadgeTone =>
  status === 'approved' ? 'green' : status === 'rejected' ? 'red' : 'amber';

const categoryTone = (category: Profile['category']): BadgeTone =>
  category === 'pi' ? 'amber' : category === 'alumni' ? 'neutral' : 'cyan';

export default function TeamReview() {
  const [error, setError] = createSignal<string | null>(null);
  const navigate = useNavigate();
  const members = createMemo<{ profiles: Profile[] } | undefined>(
    async () => {
      try {
        const result = await getAdminMembers();
        setError(null);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load member profiles.';
        setError(message);
        return undefined;
      }
    },
    { loadingValue: undefined },
  );
  const loading = () => members() === undefined && !error();
  const [actingUserId, setActingUserId] = createSignal<string | null>(null);
  const [confirmFor, setConfirmFor] = createSignal<{ profile: Profile; action: 'approve' | 'reject' } | null>(null);

  const profiles = () => members()?.profiles ?? [];
  const byStatus = (status: Profile['status']) => profiles().filter((p) => p.status === status);

  const act = async (userId: string, action: 'approve' | 'reject') => {
    setActingUserId(userId);
    try {
      await api(`/admin/members/${userId}/${action}`, { method: 'POST' });
      toast.success(action === 'approve' ? 'Profile approved' : 'Profile rejected', {
        description:
          action === 'approve'
            ? 'The member is now live on the site.'
            : 'The submission was rejected.',
      });
      revalidate('admin-members');
    } catch (err) {
      toast.error('Action failed', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setActingUserId(null);
    }
  };

  return (
    <RequireAuth>
      <RequirePermission permission="team.review">
      <div class="flex flex-col gap-6">
        <header>
          <span class="eyebrow">Team</span>
          <h1 class="font-display text-2xl font-bold tracking-[-0.02em] text-fg sm:text-3xl">
            Member review
          </h1>
          <p class="mt-2 max-w-prose text-sm leading-relaxed text-fg-soft">
            Approve or reject member profile submissions. Approved profiles are published to the
            static site on the next rebuild.
          </p>
        </header>

        <Show when={loading()}>
          <Skeleton class="h-64" />
        </Show>

        <Show when={error() && !members()}>
          <ErrorState
            title="Could not load member profiles"
            message={errorMessage(error())}
            retry={() => revalidate('admin-members')}
          />
        </Show>

        <Show when={members()}>
          <Tabs defaultValue="pending">
            <TabsList aria-label="Profile status">
              <For each={STATUSES}>
                {(s) => (
                  <TabsTrigger value={s.value}>
                    {s.label} ({byStatus(s.value).length})
                  </TabsTrigger>
                )}
              </For>
            </TabsList>

            <For each={STATUSES}>
              {(s) => (
                <TabsContent value={s.value}>
                  <Show
                    when={byStatus(s.value).length > 0}
                    fallback={
                      <EmptyState
                        title={`No ${s.label.toLowerCase()} profiles`}
                        description={
                          s.value === 'pending'
                            ? 'New member submissions will appear here.'
                            : `There are no ${s.label.toLowerCase()} profiles right now.`
                        }
                      />
                    }
                  >
                    <div class="flex flex-col gap-3">
                      <For each={byStatus(s.value)}>
                        {(profile) => (
                          <ProfileRow
                            profile={profile}
                            busy={actingUserId() === profile.userId}
                            onView={() => navigate(`/team/${profile.userId}`)}
                            onApprove={() => setConfirmFor({ profile, action: 'approve' })}
                            onReject={() => setConfirmFor({ profile, action: 'reject' })}
                          />
                        )}
                      </For>
                    </div>
                  </Show>
                </TabsContent>
              )}
            </For>
          </Tabs>
        </Show>
      </div>

      <ConfirmDialog
        open={confirmFor() !== null}
        onClose={() => setConfirmFor(null)}
        onConfirm={() => {
          const pending = confirmFor();
          if (!pending) return;
          setConfirmFor(null);
          void act(pending.profile.userId, pending.action);
        }}
        title={confirmFor()?.action === 'approve' ? 'Approve this profile?' : 'Reject this profile?'}
        description={
          confirmFor()?.action === 'approve'
            ? `${confirmFor()?.profile.name} will be published on the team page after the next rebuild.`
            : `${confirmFor()?.profile.name} will be asked to revise and resubmit.`
        }
        confirmLabel={confirmFor()?.action === 'approve' ? 'Approve' : 'Reject'}
        destructive={confirmFor()?.action === 'reject'}
      />
      </RequirePermission>
    </RequireAuth>
  );
}

function ProfileRow(props: {
  profile: Profile;
  busy: boolean;
  onView: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const profile = createMemo(() => props.profile);

  return (
    <Card class="p-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="font-display text-[15px] font-semibold text-fg">{profile().name}</h3>
            <Badge tone={categoryTone(profile().category)}>{profile().category}</Badge>
            <Badge tone={statusTone(profile().status)}>{profile().status}</Badge>
          </div>
          <p class="mt-0.5 font-mono text-xs text-fg-faint">{profile().email}</p>
        </div>
        <span class="whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.1em] text-fg-faint">
          Submitted {formatDate(profile().updatedAt)}
        </span>
      </div>

      <Show when={bioPreview(profile().bio)}>
        {(bio) => (
          <p class="mt-3 max-w-prose text-sm leading-relaxed text-fg-soft">{bio()}</p>
        )}
      </Show>

      <Show when={profile().status === 'pending'}>
        <div class="mt-4 flex items-center gap-2 border-t border-border pt-3">
          <Button variant="ghost" size="sm" onClick={props.onView} disabled={props.busy}>
            View
          </Button>
          <Button size="sm" onClick={props.onApprove} disabled={props.busy}>
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={props.onReject}
            disabled={props.busy}
            class="text-red hover:border-red hover:bg-red/5"
          >
            Reject
          </Button>
        </div>
      </Show>
    </Card>
  );
}
