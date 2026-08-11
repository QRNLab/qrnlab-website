import { Hono } from 'hono';
import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import { getAuth } from '../lib/server/auth';
import { getDb } from '../lib/server/db';
import {
  blogPosts,
  memberProfiles,
  profileSubmissions,
  publicationEntries,
  users,
} from '../lib/server/schema';
import {
  publishBlogPost,
  publishPublication,
  publishTeamMember,
} from '../lib/server/content';
import {
  blogSchema,
  profileSchema,
  publicationSchema,
  roleSchema,
} from '../lib/shared/forms';
import { fileExists, slugify } from '../lib/server/github';

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
  const { url, slug } = await publishBlogPost({
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
  return c.json({ ok: true, url, slug });
});

// --- Publications --------------------------------------------------------

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
  const { url, slug } = await publishPublication({
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
  return c.json({ ok: true, url, slug });
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

  // Reuse the existing published file when we have a stored slug, or when the
  // slugified name matches an existing file (migrates rows approved before
  // slug tracking). Otherwise create a new file.
  let slug = profile.slug;
  if (!slug) {
    const candidate = slugify(profile.name);
    if (await fileExists(`src/content/team/${candidate}.md`)) slug = candidate;
  }
  const { url, slug: publishedSlug } = await publishTeamMember(profile, slug ?? undefined);
  await db
    .update(memberProfiles)
    .set({ status: 'approved', slug: publishedSlug, updatedAt: new Date() })
    .where(eq(memberProfiles.userId, userId));
  await markSubmissionReviewed(db, userId, 'approved', user.id);
  return c.json({ ok: true, url, slug: publishedSlug });
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
    // Approved profiles go live immediately by re-publishing with the same slug.
    if (profile.status === 'approved') {
      const { url } = await publishTeamMember(
        { ...profile, category: parsed.data.category },
        profile.slug ?? undefined,
      );
      return c.json({ ok: true, url });
    }
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
