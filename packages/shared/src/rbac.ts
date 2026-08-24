/**
 * Access control model for the QRNLab app.
 *
 * Roles are stored on the user record. Team categories (`pi` / `member` /
 * `alumni`) are a *public profile field only* — they grant no access.
 * Every protected route is enforced server-side via `requirePermission`,
 * never by the client. The SPA derives UI from the permissions returned by
 * `GET /api/me` (presentational only).
 */

export const ROLES = ['user', 'editor', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  // Any signed-in user
  'profile.self', // read/edit own profile, submit for review
  'content.write', // create/edit own blog drafts
  'media.upload', // upload images for own content

  // Editor (content moderator)
  'content.moderate', // review/publish/reject/edit/delete across blog, publications, updates, education; link authors
  'media.manage', // list and delete any media asset
  'site.status', // view pending-rebuild queue

  // Admin
  'team.review', // approve/reject member profile submissions
  'users.manage', // list users, assign roles and team categories
  'site.rebuild', // trigger the queued static-site rebuild
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/**
 * Cumulative (hierarchical) grants: each role includes every permission of
 * the roles below it. `admin` can do everything `editor` and `user` can.
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  user: ['profile.self', 'content.write', 'media.upload'],
  editor: ['profile.self', 'content.write', 'media.upload', 'content.moderate', 'media.manage', 'site.status'],
  admin: [
    'profile.self',
    'content.write',
    'media.upload',
    'content.moderate',
    'media.manage',
    'site.status',
    'team.review',
    'users.manage',
    'site.rebuild',
  ],
};

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

/** All permissions granted to a role (base set only; use in tests/docs). */
export function permissionsForRole(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}
