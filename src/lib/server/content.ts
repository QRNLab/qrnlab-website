import YAML from 'yaml';
import { createUniqueSlug, deleteFileViaPr, writeFileViaPr } from './github';

export interface TeamProfileData {
  category?: string | null;
  name: string;
  role?: string | null;
  focus?: string | null;
  email?: string | null;
  bio?: string | null;
  website?: string | null;
  scholar?: string | null;
  linkedin?: string | null;
  github?: string | null;
  currentPosition?: string | null;
  currentInstitution?: string | null;
  yearGraduated?: number | null;
  links?: { label: string; url: string }[] | null;
  publications?: string[] | null;
}

export interface BlogPostData {
  slug?: string;
  title: string;
  excerpt?: string | null;
  body: string;
  authorName?: string | null;
  tags?: string[] | null;
  publishedAt?: Date | null;
}

export interface PublicationData {
  title: string;
  authors: string[];
  venue: string;
  year: number;
  type: string;
  url?: string | null;
}

function toMarkdown(frontmatter: Record<string, unknown>, body = ''): string {
  const yaml = YAML.stringify(frontmatter).trimEnd();
  const header = `---\n${yaml}\n---`;
  return body ? `${header}\n\n${body.trim()}\n` : `${header}\n`;
}

function clean(value: unknown): unknown {
  if (Array.isArray(value)) return value.length ? value : undefined;
  if (value === '' || value === null || value === undefined) return undefined;
  return value;
}

function cleanFrontmatter(frontmatter: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(frontmatter)) {
    const cleaned = clean(value);
    if (cleaned !== undefined) out[key] = cleaned;
  }
  return out;
}

export async function publishTeamMember(
  profile: TeamProfileData,
  existingSlug?: string,
): Promise<{ url: string; slug: string }> {
  const slug = existingSlug || (await createUniqueSlug(profile.name, 'src/content/team'));
  const isAlumni = profile.category === 'alumni';
  const content = toMarkdown(
    cleanFrontmatter({
      category: isAlumni ? 'alumni' : 'member',
      name: profile.name,
      role: profile.role,
      focus: profile.focus,
      email: profile.email,
      website: profile.website,
      scholar: profile.scholar,
      linkedin: profile.linkedin,
      github: profile.github,
      currentPosition: isAlumni ? profile.currentPosition : undefined,
      currentInstitution: isAlumni ? profile.currentInstitution : undefined,
      yearGraduated: isAlumni ? profile.yearGraduated : undefined,
      links: profile.links,
      publications: profile.publications,
    }),
    profile.bio ?? '',
  );
  return writeFileViaPr({
    path: `src/content/team/${slug}.md`,
    content,
    message: existingSlug
      ? `Update team member: ${profile.name}`
      : `Add team member: ${profile.name}`,
  }).then((res) => ({ ...res, slug }));
}

export async function publishBlogPost(post: BlogPostData): Promise<{ url: string; slug: string }> {
  const slug = post.slug || (await createUniqueSlug(post.title, 'src/content/blog'));
  const date = (post.publishedAt ?? new Date()).toISOString().slice(0, 10);
  const content = toMarkdown(
    cleanFrontmatter({
      title: post.title,
      date,
      excerpt: post.excerpt,
      author: post.authorName,
      tags: post.tags,
    }),
    post.body,
  );
  return writeFileViaPr({
    path: `src/content/blog/${slug}.md`,
    content,
    message: `Publish blog post: ${post.title}`,
  }).then((res) => ({ ...res, slug }));
}

export async function publishPublication(pub: PublicationData): Promise<{ url: string; slug: string }> {
  const slug = await createUniqueSlug(pub.title, 'src/content/publications');
  const content = toMarkdown(
    cleanFrontmatter({
      title: pub.title,
      authors: pub.authors,
      venue: pub.venue,
      year: pub.year,
      type: pub.type,
      url: pub.url,
    }),
  );
  return writeFileViaPr({
    path: `src/content/publications/${slug}.md`,
    content,
    message: `Add publication: ${pub.title}`,
  }).then((res) => ({ ...res, slug }));
}

export interface UpdateData {
  date: string;
  text: string;
}

export async function publishUpdate(update: UpdateData): Promise<{ url: string; slug: string }> {
  const slug = await createUniqueSlug(update.date, 'src/content/updates');
  const content = toMarkdown({ date: update.date }, update.text);
  return writeFileViaPr({
    path: `src/content/updates/${slug}.md`,
    content,
    message: `Add latest update: ${update.text}`,
  }).then((res) => ({ ...res, slug }));
}

export async function deleteUpdate(slug: string): Promise<{ url: string }> {
  return deleteFileViaPr({
    path: `src/content/updates/${slug}.md`,
    message: `Remove latest update: ${slug}`,
  });
}
