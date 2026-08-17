import { Hono } from 'hono';
import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import { getAuth } from '../lib/server/auth';
import { getDb } from '../lib/server/db';
import { triggerRebuild } from '../lib/server/rebuild';
import { deleteImage, isAllowedMime, MAX_UPLOAD_BYTES, mediaUrl, uploadImage } from '../lib/server/media';
import {
  blogPosts,
  mediaAssets,
  memberProfiles,
  newsUpdates,
  profileSubmissions,
  publicationEntries,
  users,
} from '../lib/server/schema';
import {
  resolveBlogSlug,
  resolvePublicationSlug,
  resolveTeamSlug,
  resolveUpdateSlug,
} from '../lib/server/content';
import {
  blogSchema,
  profileSchema,
  publicationSchema,
  roleSchema,
  updateSchema,
} from '../lib/shared/forms';

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

// Build-time content endpoint. Content loaders (which run in Node during
// `astro build`) call this to fetch published content from the live D1
// database. Authenticated with BUILD_TOKEN. Returns entries keyed by slug.
app.post('/__build', async (c) => {
  const token = c.req.header('x-build-token');
  if (!token || token !== process.env.BUILD_TOKEN) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const db = await getDb();

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
      excerpt: p.excerpt ?? undefined,
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

  return c.json({ team, blog, publications, updates: updatesEntries });
});

async function safeJson(c: any): Promise<any> {
  try {
    return await c.req.json();
  } catch {
    return {};
  }
}

async function requireAuth(c: any): Promise<any | null> {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  return session?.user ?? null;
}

async function requireRole(c: any, role: 'admin' | 'editor'): Promise<any | null> {
  const user = await requireAuth(c);
  if (!user) return null;
  if (role === 'admin' && user.role !== 'admin') return null;
  if (role === 'editor' && user.role !== 'admin' && user.role !== 'editor') return null;
  return user;
}

async function markSubmissionReviewed(
  db: any,
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

// --- Member profiles -----------------------------------------------------

app.get('/members/me', async (c) => {
  const user = await requireAuth(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const db = await getDb();
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
  const db = await getDb();
  const values = {
    userId: user.id,
    status: 'pending',
    category: d.category,
    name: d.name,
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

  // Record a full-history submission snapshot.
  await db.insert(profileSubmissions).values({
    id: crypto.randomUUID(),
    userId: user.id,
    payload: {
      category: d.category,
      name: d.name,
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

// --- Blog content --------------------------------------------------------

app.get('/content/blog', async (c) => {
  const user = await requireRole(c, 'editor');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const db = await getDb();
  const posts = await db.select().from(blogPosts).orderBy(blogPosts.updatedAt);
  return c.json({ posts });
});

app.post('/content/blog', async (c) => {
  const user = await requireRole(c, 'editor');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const parsed = blogSchema.safeParse(await safeJson(c));
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', issues: parsed.error.issues }, 400);
  }
  const d = parsed.data;
  const id = crypto.randomUUID();
  const db = await getDb();
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
  const user = await requireRole(c, 'editor');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const { id } = c.req.param();
  const parsed = blogSchema.safeParse(await safeJson(c));
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', issues: parsed.error.issues }, 400);
  }
  const d = parsed.data;
  const db = await getDb();
  const [existing] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
  if (!existing) return c.json({ error: 'Not found' }, 404);
  if (existing.authorId !== user.id && user.role !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403);
  }
  await db
    .update(blogPosts)
    .set({
      title: d.title,
      excerpt: d.excerpt ?? null,
      body: d.body,
      tags: d.tags ?? [],
      updatedAt: new Date(),
    })
    .where(eq(blogPosts.id, id));
  return c.json({ ok: true });
});

app.post('/content/blog/:id/publish', async (c) => {
  const user = await requireRole(c, 'editor');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const { id } = c.req.param();
  const db = await getDb();
  const [post] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
  if (!post) return c.json({ error: 'Not found' }, 404);
  if (post.authorId !== user.id && user.role !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403);
  }
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
      updatedAt: now,
    })
    .where(eq(blogPosts.id, id));
  await triggerRebuild();
  return c.json({ ok: true, slug });
});

// --- Publications --------------------------------------------------------

app.get('/content/publications', async (c) => {
  const user = await requireRole(c, 'editor');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const db = await getDb();
  const pubs = await db
    .select()
    .from(publicationEntries)
    .orderBy(desc(publicationEntries.updatedAt));
  return c.json({ publications: pubs });
});

app.post('/content/publications', async (c) => {
  const user = await requireRole(c, 'editor');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const parsed = publicationSchema.safeParse(await safeJson(c));
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', issues: parsed.error.issues }, 400);
  }
  const d = parsed.data;
  const id = crypto.randomUUID();
  const db = await getDb();
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
  const user = await requireRole(c, 'editor');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const { id } = c.req.param();
  const parsed = publicationSchema.safeParse(await safeJson(c));
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', issues: parsed.error.issues }, 400);
  }
  const d = parsed.data;
  const db = await getDb();
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
  if (wasPublished) await triggerRebuild();
  return c.json({ ok: true });
});

app.post('/content/publications/:id/publish', async (c) => {
  const user = await requireRole(c, 'editor');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const { id } = c.req.param();
  const db = await getDb();
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
  await triggerRebuild();
  return c.json({ ok: true, slug });
});

app.delete('/content/publications/:id', async (c) => {
  const user = await requireRole(c, 'editor');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const { id } = c.req.param();
  const db = await getDb();
  const [pub] = await db
    .select()
    .from(publicationEntries)
    .where(eq(publicationEntries.id, id));
  if (!pub) return c.json({ error: 'Not found' }, 404);
  await db.delete(publicationEntries).where(eq(publicationEntries.id, id));
  if (pub.status === 'published') await triggerRebuild();
  return c.json({ ok: true });
});

// Approved team members for editor autocompletes (e.g. publication author links).
app.get('/content/team', async (c) => {
  const user = await requireRole(c, 'editor');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const db = await getDb();
  const profiles = await db
    .select()
    .from(memberProfiles)
    .where(eq(memberProfiles.status, 'approved'));
  const team = profiles
    .filter((p) => p.slug)
    .map((p) => ({ slug: p.slug, name: p.name, category: p.category }));
  return c.json({ team });
});
// --- Latest updates ------------------------------------------------------

app.get('/content/updates', async (c) => {
  const user = await requireRole(c, 'editor');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const db = await getDb();
  const updates = await db.select().from(newsUpdates).orderBy(desc(newsUpdates.date), desc(newsUpdates.createdAt));
  return c.json({ updates });
});

app.post('/content/updates', async (c) => {
  const user = await requireRole(c, 'editor');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const parsed = updateSchema.safeParse(await safeJson(c));
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', issues: parsed.error.issues }, 400);
  }
  const d = parsed.data;
  const id = crypto.randomUUID();
  const db = await getDb();
  const slug = await resolveUpdateSlug(db, { date: d.date, text: d.text });
  await db.insert(newsUpdates).values({
    id,
    slug,
    date: d.date,
    text: d.text,
    updatedAt: new Date(),
  });
  await triggerRebuild();
  return c.json({ ok: true, id, slug });
});

app.delete('/content/updates/:id', async (c) => {
  const user = await requireRole(c, 'editor');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const { id } = c.req.param();
  const db = await getDb();
  const [update] = await db.select().from(newsUpdates).where(eq(newsUpdates.id, id));
  if (!update) return c.json({ error: 'Not found' }, 404);
  await db.delete(newsUpdates).where(eq(newsUpdates.id, id));
  await triggerRebuild();
  return c.json({ ok: true });
});

// --- Admin ---------------------------------------------------------------

app.get('/admin/members', async (c) => {
  const user = await requireRole(c, 'admin');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const db = await getDb();
  const profiles = await db
    .select()
    .from(memberProfiles)
    .orderBy(memberProfiles.updatedAt);
  return c.json({ profiles });
});

app.post('/admin/members/:userId/approve', async (c) => {
  const user = await requireRole(c, 'admin');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const { userId } = c.req.param();
  const db = await getDb();
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
  await triggerRebuild();
  return c.json({ ok: true, slug });
});

app.post('/admin/members/:userId/reject', async (c) => {
  const user = await requireRole(c, 'admin');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const { userId } = c.req.param();
  const db = await getDb();
  await db
    .update(memberProfiles)
    .set({ status: 'rejected', updatedAt: new Date() })
    .where(eq(memberProfiles.userId, userId));
  await markSubmissionReviewed(db, userId, 'rejected', user.id);
  return c.json({ ok: true });
});

app.get('/admin/users', async (c) => {
  const user = await requireRole(c, 'admin');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const db = await getDb();
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
  return c.json({ users: list });
});

app.post('/admin/users/:id/role', async (c) => {
  const user = await requireRole(c, 'admin');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const { id } = c.req.param();
  const parsed = roleSchema.safeParse(await safeJson(c));
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', issues: parsed.error.issues }, 400);
  }
  const db = await getDb();
  await db.update(users).set({ role: parsed.data.role }).where(eq(users.id, id));
  return c.json({ ok: true });
});

app.post('/admin/users/:id/category', async (c) => {
  const user = await requireRole(c, 'admin');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const { id } = c.req.param();
  const parsed = z
    .object({ category: z.enum(['member', 'alumni']) })
    .safeParse(await safeJson(c));
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', issues: parsed.error.issues }, 400);
  }
  const db = await getDb();
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
    if (profile.status === 'approved') await triggerRebuild();
    return c.json({ ok: true });
  }

  // No profile yet — create a minimal one so the chosen category sticks.
  await db.insert(memberProfiles).values({
    userId: id,
    status: 'pending',
    category: parsed.data.category,
    name: target.name,
  });
  return c.json({ ok: true });
});

// --- Media uploads --------------------------------------------------------

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
  const db = await getDb();
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
  const user = await requireRole(c, 'admin');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const db = await getDb();
  const items = await db.select().from(mediaAssets).orderBy(desc(mediaAssets.createdAt));
  return c.json({
    media: items.map((m) => ({ ...m, url: mediaUrl(m.key) })),
  });
});

app.delete('/media/:id', async (c) => {
  const user = await requireRole(c, 'admin');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const { id } = c.req.param();
  const db = await getDb();
  const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id));
  if (!asset) return c.json({ error: 'Not found' }, 404);
  await deleteImage(asset.key);
  await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
  return c.json({ ok: true });
});
