import { eq } from 'drizzle-orm';
import { getDb } from './db';
import { memberProfiles } from './schema';

/**
 * A content moderator can edit/review/publish across blog, publications and
 * updates. This covers the `admin` and `editor` access roles plus any user
 * whose team profile category is `pi` (assigned by an admin).
 */
export async function isModerator(user: {
  id: string;
  role?: string | null;
}): Promise<boolean> {
  if (user.role === 'admin' || user.role === 'editor') return true;
  const db = getDb();
  const [profile] = await db
    .select({ category: memberProfiles.category })
    .from(memberProfiles)
    .where(eq(memberProfiles.userId, user.id));
  return profile?.category === 'pi';
}
