import type { Context } from 'hono';
import { isRole, ROLE_PERMISSIONS, type Permission, type Role } from '@qrnlab/shared';
import { getAuth } from './auth';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role?: string | null;
};

export function displayRole(role: string | null | undefined): Role {
  return isRole(role) ? role : 'user';
}

export async function getUser(c: Context): Promise<AuthUser | null> {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  const user = session?.user;
  if (!user) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export function getPermissions(user: Pick<AuthUser, 'role'>): Permission[] {
  return [...ROLE_PERMISSIONS[displayRole(user.role)]];
}

export async function requireAuth(c: Context): Promise<AuthUser | null> {
  return getUser(c);
}

export async function requirePermission(c: Context, perm: Permission): Promise<AuthUser | null> {
  const user = await getUser(c);
  if (!user) return null;
  if (getPermissions(user).includes(perm)) return user;
  return null;
}
