import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import { and, asc, desc, eq } from 'drizzle-orm';
import { autoExcerpt, blogSchema, educationSchema, profileSchema, publicationSchema, reviewSchema, roleSchema, updateSchema } from '@qrnlab/shared';
import type { Db } from '../lib/db';
import { getAuth } from '../lib/auth';
import { getDb } from '../lib/db';
import { enqueueRebuild, getPendingRebuilds, markRebuilt, triggerRebuild } from '../lib/rebuild';
import { deleteImage, isAllowedMime, MAX_UPLOAD_BYTES, mediaUrl, uploadImage } from '../lib/media';
import {
  blogPosts,
  educationEntries,
  mediaAssets,
  memberProfiles,
  newsUpdates,
  profileSubmissions,
  publicationEntries,
  users,
} from '../lib/schema';
import {
  resolveBlogSlug,
  resolvePublicationSlug,
  resolveTeamSlug,
  resolveUpdateSlug,
} from '../lib/content';
import { displayRole, getPermissions, requireAuth, requirePermission } from '../lib/authorization';
import { env } from '../lib/cf-env';

export const app = new Hono().basePath('/api');

app.onError((err, c) => {
  console.error('[api] error:', err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

app.on(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], '/auth/*', async (c) => {
  const auth = await getAuth();
  return auth.handler(c.req.raw);
});

app.get('/health', (c) => c.json({ ok: true }));

// Build-time content endpoint. Content loaders (which run in Node during the
// static site build) call this to fetch published content from the live D1
// database. Authenticated with BUILD_TOKEN. Returns entries keyed by slug.
app.post('/__build', async (c) => {
  const token = c.req.header('x-build-token');
  if (!token || token !== env.BUILD_TOKEN) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const db = getDb();

  const members = await db
    .select()
    .from(memberProfiles)
    .where(eq(memberProfiles.status, 'approved'));

  const posts = await db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.status, 'published'));

  const pubs = await db
    .select()
    .from(publicationEntries)
    .where(eq(publicationEntries.status, 'published'));

  const updates = await db.select().from(newsUpdates);

  const education = await db
    .select()
    .from(educationEntries)
    .where(eq(educationEntries.status, 'published'))
    .orderBy(asc(educationEntries.section), asc(educationEntries.sortOrder));

  const team = members.map((m) => ({
    id: m.slug ?? m.userId,
    data: {
      category: m.category,
      name: m.name,
      title: m.title ?? undefined,
      image: m.image ?? undefined,
      role: m.role ?? undefined,
      focus: m.focus ?? undefined,
      email: m.email ?? undefined,
      website: m.website ?? undefined,
      scholar: m.scholar ?? undefined,
      linkedin: m.linkedin ?? undefined,
      github: m.github ?? undefined,
      currentPosition: m.currentPosition ?? undefined,
      currentInstitution: m.currentInstitution ?? undefined,
      institutionPage: m.institutionPage ?? undefined,
      yearGraduated: m.yearGraduated ?? undefined,
      links: m.links ?? [],
      publications: m.publications ?? [],
    },
    body: m.bio ?? undefined,
  }));

  const blog = posts.map((p) => ({
    id: p.slug,
    data: {
      title: p.title,
      date: p.publishedAt ?? p.createdAt,
      excerpt: autoExcerpt(p.body, p.excerpt),
      author: p.authorName ?? undefined,
      tags: p.tags ?? [],
    },
    body: p.body,
  }));

  const publications = pubs.map((p) => ({
    id: p.slug,
    data: {
      title: p.title,
      authors: p.authors,
      venue: p.venue,
      year: p.year,
      type: p.type,
      url: p.url ?? undefined,
    },
  }));

  const updatesEntries = updates.map((u) => ({
    id: u.slug,
    data: {
      date: u.date,
    },
    body: u.text,
  }));

  const educationEntriesOut = education.map((e) => ({
    id: e.id,
    data: {
      section: e.section,
      heading: e.heading,
      description: e.description ?? undefined,
      links: e.links ?? [],
      youtubeLinks: e.youtubeLinks ?? [],
      images: e.images ?? [],
    },
  }));

  return c.json({ team, blog, publications, updates: updatesEntries, education: educationEntriesOut });
});

// --- Current user ----------------------------------------------------------

app.get('/me', async (c) => {
  const user = await requireAuth(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const db = getDb();
  const [profile] = await db
    .select()
    .from(memberProfiles)
    .where(eq(memberProfiles.userId, user.id));
  return c.json({
    user: { id: user.id, name: user.name, email: user.email, role: displayRole(user.role) },
    permissions: getPermissions(user),
    profile: profile ?? null,
  });
});

// --- Helpers ---------------------------------------------------------------

async function safeJson(c: Context): Promise<any> {
  try {
    return await c.req.json();
  } catch {
    return {};
  }
}

async function markSubmissionReviewed(
  db: Db,
  userId: string,
  status: string,
  reviewedBy: string,
): Promise<void> {
  const [pending] = await db
    .select({ id: profileSubmissions.id })
    .from(profileSubmissions)
    .where(
      and(eq(profileSubmissions.userId, userId), eq(profileSubmissions.status, 'pending')),
    )
    .orderBy(desc(profileSubmissions.submittedAt))
    .limit(1);
  if (!pending) return;
  await db
    .update(profileSubmissions)
    .set({ status, reviewedAt: new Date(), reviewedBy })
    .where(eq(profileSubmissions.id, pending.id));
}

// --- Member profiles -------------------------------------------------------

app.get('/members/me', async (c) => {
  const user = await requireAuth(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const db = getDb();
  const [profile] = await db
    .select()
    .from(memberProfiles)
    .where(eq(memberProfiles.userId, user.id));
  return c.json({ profile: profile ?? null });
});

app.post('/members', async (c) => {
  const user = await requireAuth(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const parsed = profileSchema.safeParse(await safeJson(c));
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', issues: parsed.error.issues }, 400);
  }
  const d = parsed.data;
  const db = getDb();
  const [existingProfile] = await db
    .select()
    .from(memberProfiles)
    .where(eq(memberProfiles.userId, user.id));
  const category = existingProfile?.category === 'pi' ? 'pi' : d.category;
  const values = {
    userId: user.id,
    status: 'pending',
    category,
    name: d.name,
    title: d.title ?? null,
    image: d.image ?? null,
    role: d.role || null,
    focus: d.focus || null,
    email: d.email || null,
    bio: d.bio || null,
    website: d.website || null,
    scholar: d.scholar || null,
    linkedin: d.linkedin || null,
    github: d.github || null,
    currentPosition: d.currentPosition || null,
    currentInstitution: d.currentInstitution || null,
    yearGraduated: d.yearGraduated ?? null,
    links: d.links ?? [],
    publications: d.publications ?? [],
    updatedAt: new Date(),
  };
  const { userId: _ignored, ...set } = values;
  await db
    .insert(memberProfiles)
    .values(values)
    .onConflictDoUpdate({ target: memberProfiles.userId, set });

  await db.insert(profileSubmissions).values({
    id: crypto.randomUUID(),
    userId: user.id,
    payload: {
      category,
      name: d.name,
      title: d.title ?? null,
      image: d.image ?? null,
      role: d.role ?? null,
      focus: d.focus ?? null,
      email: d.email ?? null,
      bio: d.bio ?? null,
      website: d.website ?? null,
      scholar: d.scholar ?? null,
      linkedin: d.linkedin ?? null,
      github: d.github ?? null,
      currentPosition: d.currentPosition ?? null,
      currentInstitution: d.currentInstitution ?? null,
      yearGraduated: d.yearGraduated ?? null,
      links: d.links ?? [],
      publications: d.publications ?? [],
    },
    status: 'pending',
  });

  return c.json({ ok: true, status: 'pending' });
});

// --- Blog content ----------------------------------------------------------

app.get('/content/blog', async (c) => {
  const user = await requireAuth(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const db = getDb();
  const moderator = getPermissions(user).includes('content.moderate');
  const posts = moderator
    ? await db.select().from(blogPosts).orderBy(desc(blogPosts.updatedAt))
    : await db
        .select()
        .from(blogPosts)
        .where(eq(blogPosts.authorId, user.id))
        .orderBy(desc(blogPosts.updatedAt));
  return c.json({
    posts,
    me: { id: user.id, role: displayRole(user.role), canModerate: moderator },
  });
});

app.post('/content/blog', async (c) => {
  const user = await requireAuth(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const parsed = blogSchema.safeParse(await safeJson(c));
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', issues: parsed.error.issues }, 400);
  }
  const d = parsed.data;
  const id = crypto.randomUUID();
  const db = getDb();
  await db.insert(blogPosts).values({
    id,
    slug: id,
    title: d.title,
    excerpt: d.excerpt ?? null,
    body: d.body,
    authorId: user.id,
    authorName: user.name,
    tags: d.tags ?? [],
    status: 'draft',
  });
  return c.json({ ok: true, id });
});

app.put('/content/blog/:id', async (c) => {
  const user = await requireAuth(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const { id } = c.req.param();
  const parsed = blogSchema.safeParse(await safeJson(c));
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', issues: parsed.error.issues }, 400);
  }
  const d = parsed.data;
  const db = getDb();
  const [existing] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
  if (!existing) return c.json({ error: 'Not found' }, 404);
  const moderator = getPermissions(user).includes('content.moderate');
  if (existing.authorId !== user.id && !moderator) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  const wasPublished = existing.status === 'published';
  const set: any = {
    title: d.title,
    excerpt: d.excerpt ?? null,
    body: d.body,
    tags: d.tags ?? [],
    updatedAt: new Date(),
  };
  if (wasPublished && !moderator) set.status = 'draft';
  await db.update(blogPosts).set(set).where(eq(blogPosts.id, id));
  if (wasPublished) {
    await enqueueRebuild(db, 'blog', existing.slug, 'Edited published blog: ' + existing.title);
  }
  return c.json({ ok: true });
});

app.post('/content/blog/:id/submit', async (c) => {
  const user = await requireAuth(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const { id } = c.req.param();
  const db = getDb();
  const [post] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
  if (!post) return c.json({ error: 'Not found' }, 404);
  const moderator = getPermissions(user).includes('content.moderate');
  if (post.authorId !== user.id && !moderator) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  if (post.status === 'published') return c.json({ error: 'Already published' }, 400);
  if (post.status === 'submitted') return c.json({ error: 'Already submitted for review' }, 400);
  await db
    .update(blogPosts)
    .set({ status: 'submitted', updatedAt: new Date() })
    .where(eq(blogPosts.id, id));
  return c.json({ ok: true });
});

app.post('/content/blog/:id/publish', async (c) => {
  const user = await requirePermission(c, 'content.moderate');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const { id } = c.req.param();
  const db = getDb();
  const [post] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
  if (!post) return c.json({ error: 'Not found' }, 404);
  const now = new Date();
  const slug = await resolveBlogSlug(db, {
    slug: post.status === 'published' ? post.slug : undefined,
    title: post.title,
    excerpt: post.excerpt,
    body: post.body,
    authorName: post.authorName,
    tags: post.tags,
    publishedAt: post.publishedAt ?? now,
  });
  await db
    .update(blogPosts)
    .set({
      status: 'published',
      slug,
      publishedAt: post.publishedAt ?? now,
      reviewNote: null,
      updatedAt: now,
    })
    .where(eq(blogPosts.id, id));
  await enqueueRebuild(db, 'blog', slug, 'Published blog: ' + post.title);
  return c.json({ ok: true, slug });
});

app.post('/content/blog/:id/reject', async (c) => {
  const user = await requirePermission(c, 'content.moderate');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const { id } = c.req.param();
  const parsed = reviewSchema.safeParse(await safeJson(c));
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', issues: parsed.error.issues }, 400);
  }
  const db = getDb();
  const [post] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
  if (!post) return c.json({ error: 'Not found' }, 404);
  if (post.status !== 'submitted') {
    return c.json({ error: 'Only submitted posts can be rejected' }, 400);
  }
  await db
    .update(blogPosts)
    .set({
      status: 'rejected',
      reviewNote: parsed.data.note ?? null,
      updatedAt: new Date(),
    })
    .where(eq(blogPosts.id, id));
  return c.json({ ok: true });
});

app.delete('/content/blog/:id', async (c) => {
  const user = await requireAuth(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const { id } = c.req.param();
  const db = getDb();
  const [post] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
  if (!post) return c.json({ error: 'Not found' }, 404);
  const moderator = getPermissions(user).includes('content.moderate');
  if (!moderator && (post.authorId !== user.id || post.status === 'published')) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  await db.delete(blogPosts).where(eq(blogPosts.id, id));
  if (post.status === 'published') {
    await enqueueRebuild(db, 'blog', post.slug, 'Deleted published blog');
  }
  return c.json({ ok: true });
});

// --- Publications ----------------------------------------------------------

app.get('/content/publications', async (c) => {
  const user = await requirePermission(c, 'content.moderate');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const db = getDb();
  const pubs = await db
    .select()
    .from(publicationEntries)
    .orderBy(desc(publicationEntries.updatedAt));
  return c.json({ publications: pubs });
});

app.post('/content/publications', async (c) => {
  const user = await requirePermission(c, 'content.moderate');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const parsed = publicationSchema.safeParse(await safeJson(c));
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', issues: parsed.error.issues }, 400);
  }
  const d = parsed.data;
  const id = crypto.randomUUID();
  const db = getDb();
  await db.insert(publicationEntries).values({
    id,
    slug: id,
    title: d.title,
    authors: d.authors,
    venue: d.venue,
    year: d.year,
    type: d.type,
    url: d.url ?? null,
    status: 'draft',
  });
  return c.json({ ok: true, id });
});

app.put('/content/publications/:id', async (c) => {
  const user = await requirePermission(c, 'content.moderate');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const { id } = c.req.param();
  const parsed = publicationSchema.safeParse(await safeJson(c));
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', issues: parsed.error.issues }, 400);
  }
  const d = parsed.data;
  const db = getDb();
  const [existing] = await db
    .select()
    .from(publicationEntries)
    .where(eq(publicationEntries.id, id));
  if (!existing) return c.json({ error: 'Not found' }, 404);
  const wasPublished = existing.status === 'published';
  await db
    .update(publicationEntries)
    .set({
      title: d.title,
      authors: d.authors,
      venue: d.venue,
      year: d.year,
      type: d.type,
      url: d.url ?? null,
      updatedAt: new Date(),
    })
    .where(eq(publicationEntries.id, id));
  if (wasPublished) {
    await enqueueRebuild(db, 'publications', existing.slug, 'Edited published publication: ' + existing.title);
  }
  return c.json({ ok: true });
});

app.post('/content/publications/:id/publish', async (c) => {
  const user = await requirePermission(c, 'content.moderate');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const { id } = c.req.param();
  const db = getDb();
  const [pub] = await db
    .select()
    .from(publicationEntries)
    .where(eq(publicationEntries.id, id));
  if (!pub) return c.json({ error: 'Not found' }, 404);
  const slug = await resolvePublicationSlug(db, {
    title: pub.title,
    authors: pub.authors,
    venue: pub.venue,
    year: pub.year,
    type: pub.type,
    url: pub.url,
  });
  await db
    .update(publicationEntries)
    .set({ status: 'published', slug, updatedAt: new Date() })
    .where(eq(publicationEntries.id, id));
  await enqueueRebuild(db, 'publications', slug, 'Published publication: ' + pub.title);
  return c.json({ ok: true, slug });
});

app.delete('/content/publications/:id', async (c) => {
  const user = await requirePermission(c, 'content.moderate');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const { id } = c.req.param();
  const db = getDb();
  const [pub] = await db
    .select()
    .from(publicationEntries)
    .where(eq(publicationEntries.id, id));
  if (!pub) return c.json({ error: 'Not found' }, 404);
  await db.delete(publicationEntries).where(eq(publicationEntries.id, id));
  if (pub.status === 'published') {
    await enqueueRebuild(db, 'publications', pub.slug, 'Deleted published publication');
  }
  return c.json({ ok: true });
});

// Approved team members for editor autocompletes (e.g. publication author links).
app.get('/content/team', async (c) => {
  const user = await requirePermission(c, 'content.moderate');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const db = getDb();
  const profiles = await db
    .select()
    .from(memberProfiles)
    .where(eq(memberProfiles.status, 'approved'));
  const team = profiles
    .filter((p) => p.slug)
    .map((p) => ({ slug: p.slug, name: p.name, category: p.category }));
  return c.json({ team });
});

// --- Latest updates --------------------------------------------------------

app.get('/content/updates', async (c) => {
  const user = await requirePermission(c, 'content.moderate');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const db = getDb();
  const updates = await db.select().from(newsUpdates).orderBy(desc(newsUpdates.date), desc(newsUpdates.createdAt));
  return c.json({ updates });
});

app.post('/content/updates', async (c) => {
  const user = await requirePermission(c, 'content.moderate');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const parsed = updateSchema.safeParse(await safeJson(c));
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', issues: parsed.error.issues }, 400);
  }
  const d = parsed.data;
  const id = crypto.randomUUID();
  const db = getDb();
  const slug = await resolveUpdateSlug(db, { date: d.date, text: d.text });
  await db.insert(newsUpdates).values({
    id,
    slug,
    date: d.date,
    text: d.text,
    updatedAt: new Date(),
  });
  await enqueueRebuild(db, 'updates', slug, 'Created update: ' + d.text.slice(0, 80));
  return c.json({ ok: true, id, slug });
});

app.delete('/content/updates/:id', async (c) => {
  const user = await requirePermission(c, 'content.moderate');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const { id } = c.req.param();
  const db = getDb();
  const [update] = await db.select().from(newsUpdates).where(eq(newsUpdates.id, id));
  if (!update) return c.json({ error: 'Not found' }, 404);
  await db.delete(newsUpdates).where(eq(newsUpdates.id, id));
  await enqueueRebuild(db, 'updates', update.slug, 'Deleted update: ' + update.text.slice(0, 80));
  return c.json({ ok: true });
});

// --- Education -------------------------------------------------------------

app.get('/content/education', async (c) => {
  const user = await requirePermission(c, 'content.moderate');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const db = getDb();
  const entries = await db
    .select()
    .from(educationEntries)
    .orderBy(asc(educationEntries.section), asc(educationEntries.sortOrder));
  return c.json({ entries });
});

app.post('/content/education', async (c) => {
  const user = await requirePermission(c, 'content.moderate');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const parsed = educationSchema.safeParse(await safeJson(c));
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', issues: parsed.error.issues }, 400);
  }
  const d = parsed.data;
  const id = crypto.randomUUID();
  const db = getDb();
  const [last] = await db
    .select({ max: educationEntries.sortOrder })
    .from(educationEntries)
    .where(eq(educationEntries.section, d.section))
    .orderBy(desc(educationEntries.sortOrder))
    .limit(1);
  await db.insert(educationEntries).values({
    id,
    section: d.section,
    heading: d.heading,
    description: d.description ?? null,
    links: d.links ?? [],
    youtubeLinks: d.youtubeLinks ?? [],
    images: d.images ?? [],
    sortOrder: (last?.max ?? -1) + 1,
    status: 'draft',
  });
  return c.json({ ok: true, id });
});

app.put('/content/education/:id', async (c) => {
  const user = await requirePermission(c, 'content.moderate');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const { id } = c.req.param();
  const parsed = educationSchema.safeParse(await safeJson(c));
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', issues: parsed.error.issues }, 400);
  }
  const d = parsed.data;
  const db = getDb();
  const [existing] = await db
    .select()
    .from(educationEntries)
    .where(eq(educationEntries.id, id));
  if (!existing) return c.json({ error: 'Not found' }, 404);
  const wasPublished = existing.status === 'published';
  await db
    .update(educationEntries)
    .set({
      section: d.section,
      heading: d.heading,
      description: d.description ?? null,
      links: d.links ?? [],
      youtubeLinks: d.youtubeLinks ?? [],
      images: d.images ?? [],
      updatedAt: new Date(),
    })
    .where(eq(educationEntries.id, id));
  if (wasPublished) {
    await enqueueRebuild(db, 'education', existing.id, 'Edited published education: ' + existing.heading);
  }
  return c.json({ ok: true });
});

app.post('/content/education/:id/publish', async (c) => {
  const user = await requirePermission(c, 'content.moderate');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const { id } = c.req.param();
  const db = getDb();
  const [entry] = await db
    .select()
    .from(educationEntries)
    .where(eq(educationEntries.id, id));
  if (!entry) return c.json({ error: 'Not found' }, 404);
  await db
    .update(educationEntries)
    .set({ status: 'published', updatedAt: new Date() })
    .where(eq(educationEntries.id, id));
  await enqueueRebuild(db, 'education', entry.id, 'Published education: ' + entry.heading);
  return c.json({ ok: true });
});

app.post('/content/education/:id/move', async (c) => {
  const user = await requirePermission(c, 'content.moderate');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const { id } = c.req.param();
  const parsed = z
    .object({ direction: z.enum(['up', 'down']) })
    .safeParse(await safeJson(c));
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', issues: parsed.error.issues }, 400);
  }
  const db = getDb();
  const [entry] = await db
    .select()
    .from(educationEntries)
    .where(eq(educationEntries.id, id));
  if (!entry) return c.json({ error: 'Not found' }, 404);

  const neighbors = await db
    .select()
    .from(educationEntries)
    .where(eq(educationEntries.section, entry.section))
    .orderBy(asc(educationEntries.sortOrder));
  const idx = neighbors.findIndex((n) => n.id === id);
  const swapIdx = parsed.data.direction === 'up' ? idx - 1 : idx + 1;
  if (idx === -1 || swapIdx < 0 || swapIdx >= neighbors.length) {
    return c.json({ error: 'Cannot move further' }, 400);
  }
  const other = neighbors[swapIdx];
  const myOrder = entry.sortOrder;
  await db
    .update(educationEntries)
    .set({ sortOrder: other.sortOrder, updatedAt: new Date() })
    .where(eq(educationEntries.id, id));
  await db
    .update(educationEntries)
    .set({ sortOrder: myOrder, updatedAt: new Date() })
    .where(eq(educationEntries.id, other.id));
  if (entry.status === 'published' || other.status === 'published') {
    await enqueueRebuild(db, 'education', entry.id, 'Reordered education entries');
  }
  return c.json({ ok: true });
});

app.delete('/content/education/:id', async (c) => {
  const user = await requirePermission(c, 'content.moderate');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const { id } = c.req.param();
  const db = getDb();
  const [entry] = await db
    .select()
    .from(educationEntries)
    .where(eq(educationEntries.id, id));
  if (!entry) return c.json({ error: 'Not found' }, 404);
  await db.delete(educationEntries).where(eq(educationEntries.id, id));
  if (entry.status === 'published') {
    await enqueueRebuild(db, 'education', entry.id, 'Deleted published education');
  }
  return c.json({ ok: true });
});

// --- Admin ---------------------------------------------------------------

app.get('/admin/members', async (c) => {
  const user = await requirePermission(c, 'team.review');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const db = getDb();
  const profiles = await db
    .select()
    .from(memberProfiles)
    .orderBy(memberProfiles.updatedAt);
  return c.json({ profiles });
});

app.post('/admin/members/:userId/approve', async (c) => {
  const user = await requirePermission(c, 'team.review');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const { userId } = c.req.param();
  const db = getDb();
  const [profile] = await db
    .select()
    .from(memberProfiles)
    .where(eq(memberProfiles.userId, userId));
  if (!profile) return c.json({ error: 'Not found' }, 404);
  if (profile.status === 'approved') return c.json({ error: 'Already approved' }, 400);

  const slug = await resolveTeamSlug(db, profile);
  await db
    .update(memberProfiles)
    .set({ status: 'approved', slug, updatedAt: new Date() })
    .where(eq(memberProfiles.userId, userId));
  await markSubmissionReviewed(db, userId, 'approved', user.id);
  await enqueueRebuild(db, 'team', slug, 'Approved team member: ' + profile.name);
  return c.json({ ok: true, slug });
});

app.post('/admin/members/:userId/reject', async (c) => {
  const user = await requirePermission(c, 'team.review');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const { userId } = c.req.param();
  const db = getDb();
  await db
    .update(memberProfiles)
    .set({ status: 'rejected', updatedAt: new Date() })
    .where(eq(memberProfiles.userId, userId));
  await markSubmissionReviewed(db, userId, 'rejected', user.id);
  return c.json({ ok: true });
});

app.get('/admin/users', async (c) => {
  const user = await requirePermission(c, 'users.manage');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const db = getDb();
  const list = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      emailVerified: users.emailVerified,
      category: memberProfiles.category,
      status: memberProfiles.status,
      createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(memberProfiles, eq(memberProfiles.userId, users.id));
  return c.json({
    users: list.map((u) => ({ ...u, role: displayRole(u.role) })),
  });
});

app.post('/admin/users/:id/role', async (c) => {
  const user = await requirePermission(c, 'users.manage');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const { id } = c.req.param();
  const parsed = roleSchema.safeParse(await safeJson(c));
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', issues: parsed.error.issues }, 400);
  }
  const db = getDb();
  await db.update(users).set({ role: parsed.data.role }).where(eq(users.id, id));
  return c.json({ ok: true });
});

app.post('/admin/users/:id/category', async (c) => {
  const user = await requirePermission(c, 'users.manage');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const { id } = c.req.param();
  const parsed = z
    .object({ category: z.enum(['member', 'alumni', 'pi']) })
    .safeParse(await safeJson(c));
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', issues: parsed.error.issues }, 400);
  }
  const db = getDb();
  const [target] = await db.select().from(users).where(eq(users.id, id));
  if (!target) return c.json({ error: 'Not found' }, 404);

  const [profile] = await db
    .select()
    .from(memberProfiles)
    .where(eq(memberProfiles.userId, id));

  if (profile) {
    await db
      .update(memberProfiles)
      .set({ category: parsed.data.category, updatedAt: new Date() })
      .where(eq(memberProfiles.userId, id));
    if (profile.status === 'approved') {
      await enqueueRebuild(db, 'team', profile.slug ?? null, 'Changed team category: ' + target.name);
    }
    return c.json({ ok: true });
  }

  await db.insert(memberProfiles).values({
    userId: id,
    status: 'pending',
    category: parsed.data.category,
    name: target.name,
  });
  return c.json({ ok: true });
});

// --- Media uploads ---------------------------------------------------------

app.post('/media', async (c) => {
  const user = await requireAuth(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const form = await c.req.formData().catch(() => null);
  if (!form) return c.json({ error: 'Invalid form data' }, 400);
  const file = form.get('file');
  if (!(file instanceof File)) return c.json({ error: 'No file uploaded' }, 400);

  const purpose = form.get('purpose');
  if (purpose !== 'avatar' && purpose !== 'blog' && purpose !== 'page') {
    return c.json({ error: 'Invalid purpose' }, 400);
  }

  if (!isAllowedMime(file.type)) {
    return c.json({ error: 'Unsupported file type' }, 400);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return c.json({ error: 'File too large (max 10 MB)' }, 400);
  }

  const bytes = await file.arrayBuffer();
  const db = getDb();
  const key = await uploadImage({
    purpose,
    filename: file.name,
    mime: file.type,
    bytes,
  });
  const id = crypto.randomUUID();
  await db.insert(mediaAssets).values({
    id,
    key,
    filename: file.name,
    mime: file.type,
    size: file.size,
    uploadedBy: user.id,
  });

  return c.json({ ok: true, id, key, url: mediaUrl(key) });
});

app.get('/media', async (c) => {
  const user = await requirePermission(c, 'media.manage');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const db = getDb();
  const items = await db.select().from(mediaAssets).orderBy(desc(mediaAssets.createdAt));
  return c.json({
    media: items.map((m) => ({ ...m, url: mediaUrl(m.key) })),
  });
});

app.delete('/media/:id', async (c) => {
  const user = await requirePermission(c, 'media.manage');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const { id } = c.req.param();
  const db = getDb();
  const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id));
  if (!asset) return c.json({ error: 'Not found' }, 404);
  await deleteImage(asset.key);
  await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
  return c.json({ ok: true });
});

// Delete an image by R2 key (used by content editors when unlinking an image
// from an entry, so storage and the media record stay in sync).
app.delete('/media/key/*', async (c) => {
  const user = await requirePermission(c, 'content.moderate');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const key = c.req.param('*');
  if (!key) return c.json({ error: 'Missing key' }, 400);
  const db = getDb();
  const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.key, key));
  if (!asset) return c.json({ error: 'Not found' }, 404);
  await deleteImage(asset.key);
  await db.delete(mediaAssets).where(eq(mediaAssets.id, asset.id));
  return c.json({ ok: true });
});

// --- Rebuild queue ---------------------------------------------------------

app.get('/rebuild/status', async (c) => {
  const user = await requirePermission(c, 'site.status');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const db = getDb();
  const pending = await getPendingRebuilds(db);
  return c.json({ pending, count: pending.length });
});

app.post('/rebuild', async (c) => {
  const user = await requirePermission(c, 'site.rebuild');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const db = getDb();
  await markRebuilt(db);
  await triggerRebuild();
  return c.json({ ok: true });
});
