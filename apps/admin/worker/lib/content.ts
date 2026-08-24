import type { Db } from './db';
import type { PublicationAuthor } from '@qrnlab/shared';
import { createUniqueSlug } from './slug';

export interface TeamProfileData {
  category?: string | null;
  name: string;
  image?: string | null;
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
  institutionPage?: string | null;
  yearGraduated?: number | null;
  links?: { label: string; url: string }[] | null;
  publications?: string[] | null;
}

export function resolveTeamSlug(
  db: Db,
  profile: { name: string; slug?: string | null },
): Promise<string> {
  return createUniqueSlug(db, 'member', profile.name, profile.slug ?? undefined);
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
  authors: PublicationAuthor[];
  venue: string;
  year: number;
  type: string;
  url?: string | null;
}

export interface UpdateData {
  date: string;
  text: string;
}

export async function resolveBlogSlug(db: Db, post: BlogPostData): Promise<string> {
  return createUniqueSlug(db, 'blog', post.title, post.slug ?? undefined);
}

export async function resolvePublicationSlug(db: Db, pub: PublicationData): Promise<string> {
  return createUniqueSlug(db, 'publication', pub.title);
}

export async function resolveUpdateSlug(db: Db, update: UpdateData): Promise<string> {
  return createUniqueSlug(db, 'update', update.date);
}
