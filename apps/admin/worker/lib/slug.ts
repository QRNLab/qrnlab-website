import type { Db } from './db';
import { blogPosts, memberProfiles, newsUpdates, publicationEntries } from './schema';
import { eq } from 'drizzle-orm';
import { slugify } from '@qrnlab/shared';

type SlugSource = 'blog' | 'publication' | 'update' | 'member';

async function slugTaken(db: Db, source: SlugSource, slug: string): Promise<boolean> {
  const table =
    source === 'blog'
      ? blogPosts
      : source === 'publication'
        ? publicationEntries
        : source === 'update'
          ? newsUpdates
          : memberProfiles;
  const rows = await db.select({ slug: table.slug }).from(table).where(eq(table.slug, slug)).limit(1);
  return rows.length > 0;
}

export async function createUniqueSlug(
  db: Db,
  source: SlugSource,
  base: string,
  existingSlug?: string,
): Promise<string> {
  const slug = slugify(base) || 'untitled';
  if (existingSlug) return existingSlug;
  let candidate = slug;
  let n = 2;
  while (await slugTaken(db, source, candidate)) {
    candidate = `${slug}-${n}`;
    n += 1;
  }
  return candidate;
}
