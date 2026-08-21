import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Loader } from 'astro/loaders';
import type { PublicationAuthor } from '../lib/shared/forms';
import { autoExcerpt } from '../lib/shared/excerpt';

interface BuildEntry {
  id: string;
  data: Record<string, unknown>;
  body?: string;
}

interface BuildPayload {
  team: BuildEntry[];
  blog: BuildEntry[];
  publications: BuildEntry[];
  updates: BuildEntry[];
  education: BuildEntry[];
}

const cacheKey = Symbol.for('qrnlab-build-payload');

/**
 * Loader for content collections backed by Cloudflare D1.
 *
 * Two data paths:
 * - **Local dev**: content sync runs before the dev server binds its port, so
 *   the HTTP endpoint is unreachable during sync. Instead the loader reads the
 *   wrangler-local D1 SQLite file directly (via `node:sqlite`), showing local
 *   content with no server dependency.
 * - **Build / CI**: loaders run in Node where Cloudflare bindings are
 *   unavailable, so they fetch published content from the live Worker's
 *   `POST /api/__build` endpoint (auth: `x-build-token`, `BUILD_TOKEN`).
 *
 * Unset/absent credentials or an unreachable endpoint → the collection loads
 * empty (with a warning) so builds still pass without secrets.
 */
export function d1Loader(collection: 'team' | 'blog' | 'publications' | 'updates' | 'education'): Loader {
  return {
    name: `d1-${collection}`,
    load: async ({ store, logger, renderMarkdown, parseData }) => {
      const payload = await loadPayload(collection, logger);
      if (!payload) return;

      const entries = payload[collection] ?? [];
      store.clear();
      for (const entry of entries) {
        const data = await parseData({ id: entry.id, data: entry.data });
        let rendered;
        if (collection === 'blog' && entry.body) {
          const r = await renderMarkdown(entry.body);
          rendered = { html: r.html, metadata: r.metadata };
        }
        store.set({
          id: entry.id,
          data,
          body: entry.body,
          rendered,
        });
      }
    },
  };
}

async function loadPayload(
  collection: string,
  logger: { warn: (msg: string) => void },
): Promise<BuildPayload | undefined> {
  const global = globalThis as Record<symbol, unknown>;
  const cached = global[cacheKey] as BuildPayload | undefined;
  if (cached) return cached;

  const local = await tryLoadLocalD1(logger);
  if (local) {
    global[cacheKey] = local;
    return local;
  }

  const baseUrl = process.env.BUILD_API_URL;
  const token = process.env.BUILD_TOKEN;
  if (!baseUrl || !token) {
    logger.warn(`[d1:${collection}] BUILD_API_URL/BUILD_TOKEN not set and no local D1 — loading empty collection.`);
    return undefined;
  }

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/__build`, {
      method: 'POST',
      headers: {
        'x-build-token': token,
        Origin: baseUrl,
      },
    });
    if (!res.ok) {
      logger.warn(`[d1:${collection}] /api/__build returned ${res.status} — loading empty collection.`);
      return undefined;
    }
    const payload = (await res.json()) as BuildPayload;
    global[cacheKey] = payload;
    return payload;
  } catch (err) {
    logger.warn(`[d1:${collection}] could not reach ${baseUrl} — loading empty collection. (${(err as Error).message})`);
    return undefined;
  }
}

function findLocalD1File(): string | undefined {
  const dir = join('.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject');
  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.sqlite') && f !== 'metadata.sqlite');
  } catch {
    return undefined;
  }
  if (files.length === 0) return undefined;
  return join(dir, files[0]);
}

function parseJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

async function tryLoadLocalD1(
  logger: { warn: (msg: string) => void },
): Promise<BuildPayload | undefined> {
  const filePath = findLocalD1File();
  if (!filePath) return undefined;

  let db: any;
  try {
    const { DatabaseSync } = await import('node:sqlite');
    db = new DatabaseSync(filePath, { readOnly: true });
  } catch (err) {
    logger.warn(`[d1] could not open local D1 (${filePath}) — ${(err as Error).message}`);
    return undefined;
  }

  try {
    const members = db.prepare("SELECT * FROM member_profiles WHERE status = 'approved'").all();
    const posts = db.prepare("SELECT * FROM blog_posts WHERE status = 'published'").all();
    const pubs = db.prepare("SELECT * FROM publications WHERE status = 'published'").all();
    const updates = db.prepare('SELECT * FROM news_updates').all();
    const education = db
      .prepare("SELECT * FROM education_entries WHERE status = 'published' ORDER BY section, sortOrder")
      .all();

    const team = members.map((m: any) => ({
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
        links: (parseJson(m.links) as unknown[]) ?? [],
        publications: (parseJson(m.publications) as string[]) ?? [],
      },
      body: m.bio ?? undefined,
    }));

    const blog = posts.map((p: any) => ({
      id: p.slug,
      data: {
        title: p.title,
        date: p.publishedAt ?? p.createdAt,
        excerpt: autoExcerpt(p.body, p.excerpt),
        author: p.authorName ?? undefined,
        tags: (parseJson(p.tags) as string[]) ?? [],
      },
      body: p.body,
    }));

    const publications = pubs.map((p: any) => ({
      id: p.slug,
      data: {
        title: p.title,
        authors: (parseJson(p.authors) as PublicationAuthor[]) ?? [],
        venue: p.venue,
        year: p.year,
        type: p.type,
        url: p.url ?? undefined,
      },
    }));

    const updatesEntries = updates.map((u: any) => ({
      id: u.slug,
      data: { date: u.date },
      body: u.text,
    }));

    const educationEntries = education.map((e: any) => ({
      id: e.id,
      data: {
        section: e.section,
        heading: e.heading,
        description: e.description ?? undefined,
        links: (parseJson(e.links) as unknown[]) ?? [],
        youtubeLinks: (parseJson(e.youtubeLinks) as string[]) ?? [],
      },
    }));

    return { team, blog, publications, updates: updatesEntries, education: educationEntries };
  } finally {
    db.close();
  }
}
