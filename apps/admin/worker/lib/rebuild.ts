import { asc, eq } from 'drizzle-orm';
import type { Db } from './db';
import { pendingRebuilds } from './schema';
import { env } from './cf-env';

export type RebuildKind = 'team' | 'blog' | 'publications' | 'updates' | 'education';

export async function enqueueRebuild(
  db: Db,
  kind: RebuildKind,
  ref: string | null,
  label: string,
): Promise<void> {
  await db.insert(pendingRebuilds).values({
    id: crypto.randomUUID(),
    kind,
    ref,
    label,
    status: 'pending',
    createdAt: new Date(),
  });
}

export async function triggerRebuild(): Promise<void> {
  const hook = env.DEPLOY_HOOK_URL;
  if (!hook) return;
  try {
    await fetch(hook, { method: 'POST' });
  } catch (err) {
    console.error('[rebuild] deploy hook failed:', err);
  }
}

export async function getPendingRebuilds(db: Db) {
  return db
    .select({
      id: pendingRebuilds.id,
      kind: pendingRebuilds.kind,
      ref: pendingRebuilds.ref,
      label: pendingRebuilds.label,
      createdAt: pendingRebuilds.createdAt,
    })
    .from(pendingRebuilds)
    .where(eq(pendingRebuilds.status, 'pending'))
    .orderBy(asc(pendingRebuilds.createdAt));
}

export async function markRebuilt(db: Db): Promise<void> {
  await db
    .update(pendingRebuilds)
    .set({ status: 'built', builtAt: new Date() })
    .where(eq(pendingRebuilds.status, 'pending'));
}
