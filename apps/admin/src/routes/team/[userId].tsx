import { createMemo, createSignal, For, Show } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { query, revalidate, useNavigate, useParams } from '@solidjs/router';
import { api, mediaUrl } from '../../lib/api';
import type { Profile, ProfileSubmission } from '../../lib/types';
import { toast } from '../../lib/toast';
import { Badge } from '../../components/ui/Badge';
import type { BadgeTone } from '../../components/ui/Badge';
import { ErrorState } from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Skeleton';
import { DiffView } from '../../components/review/DiffView';
import type { DiffFieldConfig } from '../../components/review/DiffView';
import { ReviewActions } from '../../components/review/ReviewActions';
import { RequireAuth, RequirePermission } from '../guard';

const getMember = query(
  (userId: string) => api<{ profile: Profile; submissions: ProfileSubmission[] }>(`/admin/members/${userId}`),
  'team-detail',
);

const TEAM_FIELDS: DiffFieldConfig[] = [
  { key: 'name', label: 'Name' },
  { key: 'category', label: 'Category' },
  { key: 'role', label: 'Role' },
  { key: 'researchIdentity', label: 'Research identity' },
  { key: 'email', label: 'Email' },
  { key: 'bio', label: 'Bio', longText: true },
  { key: 'image', label: 'Image' },
  { key: 'website', label: 'Website' },
  { key: 'scholar', label: 'Scholar' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'github', label: 'GitHub' },
  { key: 'currentPosition', label: 'Current position' },
  { key: 'currentInstitution', label: 'Current institution' },
  { key: 'yearGraduated', label: 'Year graduated' },
  { key: 'links', label: 'Links' },
  { key: 'publications', label: 'Publications' },
];

const statusTone = (status: Profile['status']): BadgeTone =>
  status === 'approved' ? 'green' : status === 'rejected' ? 'red' : 'amber';

const categoryTone = (category: Profile['category']): BadgeTone =>
  category === 'pi' ? 'amber' : category === 'alumni' ? 'neutral' : 'cyan';

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function TeamMemberPage() {
  return (
    <RequireAuth>
      <RequirePermission permission="team.review">
        <TeamMemberDetail />
      </RequirePermission>
    </RequireAuth>
  );
}

function TeamMemberDetail() {
  const params = useParams();
  const navigate = useNavigate();

  const [error, setError] = createSignal<string | null>(null);

  const data = createMemo<{ profile: Profile; submissions: ProfileSubmission[] } | undefined>(
    async () => {
      try {
        const result = await getMember(params.userId ?? '');
        setError(null);
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load the member profile.');
        return undefined;
      }
    },
    { loadingValue: undefined },
  );

  const loading = () => data() === undefined && !error();
  const profile = () => data()?.profile ?? null;
  const submissions = () => data()?.submissions ?? [];

  const pending = () => submissions().find((s) => s.status === 'pending') ?? null;
  const base = () => submissions().find((s) => s.status !== 'pending') ?? null;
  const hasDiff = () => pending() !== null && base() !== null;

  const payloadFromProfile = (p: Profile): Record<string, unknown> => ({
    category: p.category,
    name: p.name,
    image: p.image,
    role: p.role,
    researchIdentity: p.researchIdentity,
    email: p.email,
    bio: p.bio,
    website: p.website,
    scholar: p.scholar,
    linkedin: p.linkedin,
    github: p.github,
    currentPosition: p.currentPosition,
    currentInstitution: p.currentInstitution,
    yearGraduated: p.yearGraduated,
    links: p.links ?? [],
    publications: p.publications ?? [],
  });

  const after = () =>
    pending()?.payload ?? (profile() ? payloadFromProfile(profile()!) : null);
  const before = () => (hasDiff() ? base()!.payload : null);

  const renderValue = (key: string, value: unknown): JSX.Element | null => {
    if (key === 'image' && typeof value === 'string') {
      const src = mediaUrl(value);
      return src ? <img src={src} alt="Profile" class="h-24 w-24 rounded-[var(--radius)] border border-border object-cover" /> : null;
    }
    if (key === 'links' && Array.isArray(value)) {
      return (
        <div class="flex flex-wrap gap-2">
          <For each={value}>
            {(link) => (
              <span class="rounded-[var(--radius)] border border-border px-2 py-1 font-mono text-xs text-fg-soft">
                {link.label}: {link.url}
              </span>
            )}
          </For>
        </div>
      );
    }
    if (key === 'publications' && Array.isArray(value)) {
      return (
        <ul class="flex list-disc flex-col gap-1 pl-4 text-sm leading-relaxed text-fg">
          <For each={value}>
            {(pub) => (
              <li class="whitespace-pre-wrap">{pub}</li>
            )}
          </For>
        </ul>
      );
    }
    return null;
  };

  const onApprove = async () => {
    if (!profile()) return;
    await api(`/admin/members/${profile()!.userId}/approve`, { method: 'POST' });
    toast.success('Profile approved', { description: 'The member is now live on the site.' });
    navigate('/team');
  };

  const onReject = async () => {
    if (!profile()) return;
    await api(`/admin/members/${profile()!.userId}/reject`, { method: 'POST' });
    toast.success('Profile rejected');
    navigate('/team');
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
          title="Failed to load member profile"
          message={error() ?? 'Something went wrong.'}
          retry={() => revalidate(getMember.key)}
        />
      </Show>

      <Show when={data() && !profile() && !loading()}>
        <ErrorState title="Profile not found" message="This member profile does not exist." />
      </Show>

      <Show when={profile()}>
        <header class="flex flex-col gap-4">
          <div class="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span class="eyebrow">Team / Member review</span>
              <h1 class="font-display text-2xl font-bold tracking-[-0.02em] text-fg sm:text-3xl">
                {profile()!.name}
              </h1>
            </div>
            <div class="flex items-center gap-2">
              <Badge tone={categoryTone(profile()!.category)}>{profile()!.category}</Badge>
              <Badge tone={statusTone(profile()!.status)} dot>
                {profile()!.status}
              </Badge>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[11px] uppercase tracking-[0.08em] text-fg-faint">
            <span>Updated: {formatDate(profile()!.updatedAt)}</span>
            <Show when={pending()}>
              <span>Submitted: {formatDate(pending()!.submittedAt)}</span>
            </Show>
            <Show when={!pending()}>
              <span>No pending submission</span>
            </Show>
          </div>
        </header>

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
              fields={TEAM_FIELDS}
              render={renderValue}
            />
          </Show>
        </div>

        <Show when={pending()}>
          <div class="flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <ReviewActions
              actions={[
                {
                  key: 'approve',
                  label: 'Approve',
                  variant: 'solid',
                  confirm: {
                    title: 'Approve this profile?',
                    description: `${profile()!.name} will be published on the team page after the next rebuild.`,
                    confirmLabel: 'Approve',
                  },
                  onRun: onApprove,
                },
                {
                  key: 'reject',
                  label: 'Reject',
                  variant: 'destructive',
                  confirm: {
                    title: 'Reject this profile?',
                    description: `${profile()!.name} will be asked to revise and resubmit.`,
                    confirmLabel: 'Reject',
                    destructive: true,
                  },
                  onRun: onReject,
                },
              ]}
            />
          </div>
        </Show>
      </Show>
    </div>
  );
}
