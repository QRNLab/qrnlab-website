import { For, Show } from 'solid-js';
import type { ParentProps } from 'solid-js';
import { Badge } from '../../components/ui/Badge';
import type { BadgeTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { mediaUrl } from '../../lib/api';
import { useSession } from '../../lib/session';
import type { Profile } from '../../lib/types';
import { RequireAuth } from '../guard';

const ROLE_TONE: Record<string, BadgeTone> = {
  admin: 'amber',
  editor: 'cyan',
  user: 'neutral',
};

const STATUS_TONE: Record<Profile['status'], BadgeTone> = {
  approved: 'green',
  pending: 'amber',
  rejected: 'red',
};

const CATEGORY_LABEL: Record<Profile['category'], string> = {
  pi: 'Principal investigator',
  member: 'Member',
  alumni: 'Alumni',
};

function DetailRow(props: ParentProps<{ label: string }>) {
  return (
    <div class="grid gap-1 border-b border-border py-3 last:border-b-0 sm:grid-cols-[10rem_1fr]">
      <dt class="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-faint">{props.label}</dt>
      <dd class="text-sm leading-relaxed text-fg">{props.children}</dd>
    </div>
  );
}

function ProfileLinks(props: { profile: Profile }) {
  const items = () =>
    [
      { label: 'Website', value: props.profile.website },
      { label: 'Scholar', value: props.profile.scholar },
      { label: 'LinkedIn', value: props.profile.linkedin },
      { label: 'GitHub', value: props.profile.github },
    ].filter((item): item is { label: string; value: string } => Boolean(item.value));

  return (
    <Show when={items().length > 0}>
      <div class="flex flex-wrap gap-2">
        <For each={items()}>
          {(item) => (
            <a
              href={item.value}
              target="_blank"
              rel="noreferrer"
              class="rounded-[var(--radius)] border border-border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-fg-soft transition-colors hover:border-amber hover:text-fg"
            >
              {item.label}
            </a>
          )}
        </For>
      </div>
    </Show>
  );
}

export default function Account() {
  const { session } = useSession();
  const profile = () => session()?.profile ?? null;
  const user = () => session()?.user;

  return (
    <RequireAuth>
      <div class="flex flex-col gap-6">
        <header class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span class="eyebrow">Account</span>
            <h1 class="mt-2 font-display text-2xl font-bold tracking-[-0.02em] text-fg sm:text-3xl">
              Profile
            </h1>
            <p class="mt-2 max-w-prose text-sm leading-relaxed text-fg-soft">
              Your member profile on the QRNLab site. Approved profiles are shown on the team page.
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <Button as="a" href="/account/posts" variant="outline">
              My posts
            </Button>
            <Button as="a" href="/account/edit">
              Edit profile
            </Button>
          </div>
        </header>

        <Show
          when={profile()}
          keyed
          fallback={
            <EmptyState
              title="No profile yet"
              description="Complete your profile to appear on the QRNLab team page. It is published after admin review."
              action={
                <Button as="a" href="/account/edit">
                  Complete profile
                </Button>
              }
              lines
            />
          }
        >
          {(p) => (
            <Card>
              <CardHeader
                eyebrow="Team profile"
                title={p.name}
                description={[
                  ...(p.category !== 'alumni' ? [p.researchIdentity] : []),
                  p.currentPosition,
                  p.currentInstitution,
                ].filter(Boolean).join(' · ')}
              />
              <CardContent class="flex flex-col gap-5">
                <Show when={p.status === 'pending'}>
                  <div class="rounded-[var(--radius)] border border-amber/40 bg-amber/10 p-3 text-sm leading-relaxed text-fg-soft">
                    Your profile is pending review — it will appear after admin review.
                  </div>
                </Show>

                <div class="flex items-start gap-4">
                  <Show
                    when={mediaUrl(p.image)}
                    fallback={
                      <div class="flex h-16 w-16 shrink-0 items-center justify-center rounded-[var(--radius)] border border-border bg-bg font-display text-lg font-bold text-fg-soft">
                        {p.name
                          .split(/\s+/)
                          .map((part) => part[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
                      </div>
                    }
                  >
                    {(src) => (
                      <img
                        src={src()}
                        alt={`${p.name} avatar`}
                        class="h-16 w-16 shrink-0 rounded-[var(--radius)] border border-border object-cover"
                      />
                    )}
                  </Show>
                  <div class="flex flex-wrap items-center gap-2">
                    <Badge tone={ROLE_TONE[user()?.role ?? 'user'] ?? 'neutral'}>{user()?.role}</Badge>
                    <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
                    <Badge tone="neutral">{CATEGORY_LABEL[p.category]}</Badge>
                  </div>
                </div>

                <dl class="flex flex-col">
                  <Show when={p.role}>
                    <DetailRow label="Role">{p.role}</DetailRow>
                  </Show>
                  <Show when={p.category !== 'alumni' && p.researchIdentity}>
                    <DetailRow label="Research identity">{p.researchIdentity}</DetailRow>
                  </Show>
                  <DetailRow label="Email">
                    <a href={`mailto:${p.email ?? user()?.email}`} class="text-amber hover:underline">
                      {p.email ?? user()?.email}
                    </a>
                  </DetailRow>
                  <Show when={p.bio}>
                    <DetailRow label="Bio">
                      <span class="whitespace-pre-line">{p.bio}</span>
                    </DetailRow>
                  </Show>
                  <Show when={p.links.length > 0}>
                    <DetailRow label="Links">
                      <ProfileLinks profile={p} />
                    </DetailRow>
                  </Show>
                  <Show when={p.currentPosition || p.currentInstitution}>
                    <DetailRow label="Current">
                      {[p.currentPosition, p.currentInstitution].filter(Boolean).join(', ')}
                    </DetailRow>
                  </Show>
                  <Show when={p.yearGraduated}>
                    <DetailRow label="Graduated">{p.yearGraduated}</DetailRow>
                  </Show>
                  <Show when={p.publications.length > 0}>
                    <DetailRow label="Publications">
                      <ul class="flex flex-col gap-2">
                        <For each={p.publications}>
                          {(publication, i) => (
                            <li class="flex gap-2">
                              <span class="font-mono text-xs text-fg-faint">{String(i() + 1).padStart(2, '0')}</span>
                              <span>{publication}</span>
                            </li>
                          )}
                        </For>
                      </ul>
                    </DetailRow>
                  </Show>
                </dl>
              </CardContent>
            </Card>
          )}
        </Show>
      </div>
    </RequireAuth>
  );
}
