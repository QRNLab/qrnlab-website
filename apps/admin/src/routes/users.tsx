import { For, Show, createMemo, createSignal } from 'solid-js';
import { Loading, Errored } from 'solid-js';
import { query, revalidate } from '@solidjs/router';
import { api } from '../lib/api';
import { useSession } from '../lib/session';
import { toast } from '../lib/toast';
import { RequirePermission } from './guard';
import type { AdminUser, Role } from '../lib/types';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Select } from '../components/ui/Select';
import { Skeleton } from '../components/ui/Skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';

const getAdminUsers = query(() => api<{ users: AdminUser[] }>('/admin/users'), 'admin-users');

const ROLE_OPTIONS: readonly Role[] = ['user', 'editor', 'admin'];
const CATEGORY_OPTIONS = ['member', 'alumni', 'pi'] as const;
type Category = (typeof CATEGORY_OPTIONS)[number];

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export default function Users() {
  const { session } = useSession();
  const users = createMemo(() => getAdminUsers());
  const [actingUserId, setActingUserId] = createSignal<string | null>(null);

  const currentUserId = () => session()?.user.id;

  const changeRole = async (id: string, role: Role) => {
    if (id === currentUserId()) return;
    setActingUserId(id);
    try {
      await api(`/admin/users/${id}/role`, { method: 'POST', body: JSON.stringify({ role }) });
      toast.success('Role updated', { description: `Role set to ${role}.` });
      revalidate('admin-users');
    } catch (err) {
      toast.error('Could not update role', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setActingUserId(null);
    }
  };

  const changeCategory = async (id: string, category: Category) => {
    setActingUserId(id);
    try {
      await api(`/admin/users/${id}/category`, {
        method: 'POST',
        body: JSON.stringify({ category }),
      });
      toast.success('Team category updated', {
        description: `Category set to ${category}.`,
      });
      revalidate('admin-users');
    } catch (err) {
      toast.error('Could not update category', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setActingUserId(null);
    }
  };

  return (
    <RequirePermission permission="users.manage">
      <div class="flex flex-col gap-6">
        <header>
          <span class="eyebrow">Users</span>
          <h1 class="font-display text-2xl font-bold tracking-[-0.02em] text-fg sm:text-3xl">
            Members &amp; roles
          </h1>
          <p class="mt-2 max-w-prose text-sm leading-relaxed text-fg-soft">
            Assign roles and team categories. Roles gate permissions; team categories are a public
            profile field only.
          </p>
        </header>

        <Errored
          fallback={(err, reset) => (
            <ErrorState
              title="Could not load users"
              message={errorMessage(err())}
              retry={() => {
                revalidate('admin-users');
                reset();
              }}
            />
          )}
        >
          <Loading fallback={<Skeleton class="h-64" />}>
            <Show
              when={users().users.length > 0}
              fallback={
                <EmptyState
                  title="No users"
                  description="Registered accounts will appear here once members sign up."
                />
              }
            >
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>User</TableHeader>
                    <TableHeader>Verified</TableHeader>
                    <TableHeader>Role</TableHeader>
                    <TableHeader>Team category</TableHeader>
                    <TableHeader>Joined</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <For each={users().users}>
                    {(user) => (
                      <TableRow>
                        <TableCell>
                          <div class="flex flex-col">
                            <div class="flex items-center gap-2">
                              <span class="font-medium text-fg">{user.name}</span>
                              <Show when={user.id === currentUserId()}>
                                <Badge tone="amber">You</Badge>
                              </Show>
                            </div>
                            <span class="font-mono text-xs text-fg-faint">{user.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge tone={user.emailVerified ? 'green' : 'neutral'}>
                            {user.emailVerified ? 'Verified' : 'Unverified'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            class="w-32"
                            value={user.role}
                            onChange={(event) => changeRole(user.id, event.currentTarget.value as Role)}
                            disabled={user.id === currentUserId() || actingUserId() === user.id}
                            aria-label={`Role for ${user.name}`}
                          >
                            <For each={ROLE_OPTIONS}>
                              {(role) => <option value={role}>{role}</option>}
                            </For>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            class="w-36"
                            value={user.category ?? ''}
                            placeholderOption="—"
                            onChange={(event) =>
                              changeCategory(user.id, event.currentTarget.value as Category)
                            }
                            disabled={actingUserId() === user.id}
                            aria-label={`Team category for ${user.name}`}
                          >
                            <For each={CATEGORY_OPTIONS}>
                              {(category) => <option value={category}>{category}</option>}
                            </For>
                          </Select>
                        </TableCell>
                        <TableCell class="whitespace-nowrap font-mono text-xs text-fg-faint">
                          {formatDate(user.createdAt)}
                        </TableCell>
                      </TableRow>
                    )}
                  </For>
                </TableBody>
              </Table>
            </Show>
            <p class="mt-3 text-xs leading-relaxed text-fg-faint">
              Team category is a public profile field only — the pi category grants no moderation
              rights.
            </p>
          </Loading>
        </Errored>
      </div>
    </RequirePermission>
  );
}
