// One-time migration: seed D1 from the existing markdown content collections.
// Reads src/content/{team,blog,publications,updates}/*.md and generates a SQL
// file that can be applied with `wrangler d1 execute`.
//
// Usage:
//   node scripts/migrate-content.mjs              # writes /tmp/qrnlab-seed.sql
//   wrangler d1 execute qrnlab --local --file /tmp/qrnlab-seed.sql
//   wrangler d1 execute qrnlab --remote --file /tmp/qrnlab-seed.sql

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import YAML from 'yaml';

const root = process.cwd();

function parseFrontmatter(filePath) {
  const text = readFileSync(filePath, 'utf8');
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: '' };
  const data = YAML.parse(m[1]) ?? {};
  return { data, body: m[2].trim() };
}

function listMd(dir) {
  const full = join(root, 'src/content', dir);
  return readdirSync(full).filter((f) => f.endsWith('.md')).sort();
}

function esc(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  return `'${String(value).replace(/'/g, "''")}'`;
}

function escJson(value) {
  return `'${JSON.stringify(value ?? []).replace(/'/g, "''")}'`;
}

const now = new Date().getTime();
const lines = [];
const userIdBySlug = {};
const usersByName = {};
const usedEmails = new Set();

// ---- users (one per team member, plus blog authors) ----
const teamFiles = listMd('team');
for (const file of teamFiles) {
  const slug = file.replace(/\.md$/, '');
  const { data } = parseFrontmatter(join(root, 'src/content/team', file));
  const id = randomUUID();
  let email = data.email || `${slug}@qrnlab.migrated`;
  if (usedEmails.has(email)) email = `${slug}@qrnlab.migrated`;
  usedEmails.add(email);
  userIdBySlug[slug] = id;
  usersByName[data.name] = id;
  lines.push(
    `INSERT INTO users (id, name, email, "emailVerified", image, role, "createdAt", "updatedAt") VALUES (${esc(id)}, ${esc(data.name)}, ${esc(email)}, 1, NULL, 'member', ${now}, ${now});`,
  );
}

// ---- team members ----
for (const file of teamFiles) {
  const slug = file.replace(/\.md$/, '');
  const { data, body } = parseFrontmatter(join(root, 'src/content/team', file));
  const userId = userIdBySlug[slug];
  const category = data.category === 'pi' ? 'pi' : data.category === 'alumni' ? 'alumni' : 'member';
  lines.push(
    `INSERT INTO member_profiles ("userId", status, slug, category, name, title, image, role, focus, email, bio, website, scholar, linkedin, github, "currentPosition", "currentInstitution", "institutionPage", "yearGraduated", links, publications, "createdAt", "updatedAt") VALUES (` +
      `${esc(userId)}, 'approved', ${esc(slug)}, ${esc(category)}, ${esc(data.name)}, ${esc(data.title ?? null)}, ${esc(data.image ?? null)}, ${esc(data.role ?? null)}, ${esc(data.focus ?? null)}, ${esc(data.email ?? null)}, ${esc(body || null)}, ${esc(data.website ?? null)}, ${esc(data.scholar ?? null)}, ${esc(data.linkedin ?? null)}, ${esc(data.github ?? null)}, ${esc(data.currentPosition ?? null)}, ${esc(data.currentInstitution ?? null)}, ${esc(data.institutionPage ?? null)}, ${data.yearGraduated ?? 'NULL'}, ${escJson(data.links)}, ${escJson(data.publications)}, ${now}, ${now});`,
  );
}

// ---- blog posts ----
const blogFiles = listMd('blog');
for (const file of blogFiles) {
  const slug = file.replace(/\.md$/, '');
  const { data, body } = parseFrontmatter(join(root, 'src/content/blog', file));
  const authorName = data.author;
  let authorId = usersByName[authorName];
  if (!authorId) {
    authorId = randomUUID();
    usersByName[authorName] = authorId;
    let email = `${slug}@qrnlab.migrated`;
    if (usedEmails.has(email)) email = `${slug}-author@qrnlab.migrated`;
    usedEmails.add(email);
    lines.push(
      `INSERT INTO users (id, name, email, "emailVerified", image, role, "createdAt", "updatedAt") VALUES (${esc(authorId)}, ${esc(authorName)}, ${esc(email)}, 1, NULL, 'member', ${now}, ${now});`,
    );
  }
  const publishedAt = new Date(`${data.date}T00:00:00Z`).getTime();
  lines.push(
    `INSERT INTO blog_posts (id, slug, title, excerpt, body, "authorId", "authorName", tags, status, "createdAt", "updatedAt", "publishedAt") VALUES (` +
      `${esc(randomUUID())}, ${esc(slug)}, ${esc(data.title)}, ${esc(data.excerpt ?? null)}, ${esc(body)}, ${esc(authorId)}, ${esc(authorName ?? null)}, ${escJson(data.tags)}, 'published', ${now}, ${now}, ${publishedAt});`,
  );
}

// ---- publications ----
const pubFiles = listMd('publications');
for (const file of pubFiles) {
  const slug = file.replace(/\.md$/, '');
  const { data } = parseFrontmatter(join(root, 'src/content/publications', file));
  lines.push(
    `INSERT INTO publications (id, slug, title, authors, venue, year, type, url, status, "createdAt", "updatedAt") VALUES (` +
      `${esc(randomUUID())}, ${esc(slug)}, ${esc(data.title)}, ${escJson(data.authors)}, ${esc(data.venue)}, ${data.year ?? 'NULL'}, ${esc(data.type ?? 'journal')}, ${esc(data.url ?? null)}, 'published', ${now}, ${now});`,
  );
}

// ---- updates ----
const updateFiles = listMd('updates');
for (const file of updateFiles) {
  const slug = file.replace(/\.md$/, '');
  const { data, body } = parseFrontmatter(join(root, 'src/content/updates', file));
  lines.push(
    `INSERT INTO news_updates (id, slug, date, text, "createdAt", "updatedAt") VALUES (` +
      `${esc(randomUUID())}, ${esc(slug)}, ${esc(data.date)}, ${esc(body)}, ${now}, ${now});`,
  );
}

const sql = lines.join('\n');
writeFileSync('/tmp/qrnlab-seed.sql', sql);
console.log(`Wrote /tmp/qrnlab-seed.sql (${lines.length} statements)`);
console.log(`  team: ${teamFiles.length}, blog: ${blogFiles.length}, pubs: ${pubFiles.length}, updates: ${updateFiles.length}`);
