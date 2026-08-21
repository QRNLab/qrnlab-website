import {
  integer,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';
import type { PublicationAuthor } from '../shared/forms';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('emailVerified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  role: text('role').notNull().default('member'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull().defaultNow(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull().defaultNow(),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  expiresAt: integer('expiresAt', { mode: 'timestamp_ms' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull().defaultNow(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: integer('accessTokenExpiresAt', { mode: 'timestamp_ms' }),
  refreshTokenExpiresAt: integer('refreshTokenExpiresAt', { mode: 'timestamp_ms' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull().defaultNow(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull().defaultNow(),
});

export const verifications = sqliteTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expiresAt', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull().defaultNow(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull().defaultNow(),
});

export type MemberProfile = {
  status: 'pending' | 'approved' | 'rejected';
  category: 'pi' | 'member' | 'alumni';
  name: string;
  title?: string | null;
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
  links?: { label: string; url: string }[];
  publications?: string[];
};

export const memberProfiles = sqliteTable('member_profiles', {
  userId: text('userId')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('pending'),
  slug: text('slug'),
  category: text('category').notNull().default('member'),
  name: text('name').notNull(),
  title: text('title'),
  image: text('image'),
  role: text('role'),
  focus: text('focus'),
  email: text('email'),
  bio: text('bio'),
  website: text('website'),
  scholar: text('scholar'),
  linkedin: text('linkedin'),
  github: text('github'),
  currentPosition: text('currentPosition'),
  currentInstitution: text('currentInstitution'),
  institutionPage: text('institutionPage'),
  yearGraduated: integer('yearGraduated'),
  links: text('links', { mode: 'json' }).$type<{ label: string; url: string }[]>().default([]),
  publications: text('publications', { mode: 'json' }).$type<string[]>().default([]),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull().defaultNow(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull().defaultNow(),
});

export const blogPosts = sqliteTable('blog_posts', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  excerpt: text('excerpt'),
  body: text('body').notNull(),
  authorId: text('authorId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  authorName: text('authorName'),
  tags: text('tags', { mode: 'json' }).$type<string[]>().default([]),
  status: text('status').notNull().default('draft'),
  reviewNote: text('reviewNote'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull().defaultNow(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull().defaultNow(),
  publishedAt: integer('publishedAt', { mode: 'timestamp_ms' }),
});

export const publicationEntries = sqliteTable('publications', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  authors: text('authors', { mode: 'json' }).$type<PublicationAuthor[]>().notNull(),
  venue: text('venue').notNull(),
  year: integer('year').notNull(),
  type: text('type').notNull().default('journal'),
  url: text('url'),
  status: text('status').notNull().default('published'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull().defaultNow(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull().defaultNow(),
});

export const newsUpdates = sqliteTable('news_updates', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  date: text('date').notNull(),
  text: text('text').notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull().defaultNow(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull().defaultNow(),
});

export const rateLimit = sqliteTable('rateLimit', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  count: integer('count').notNull(),
  lastRequest: integer('lastRequest', { mode: 'number' }).notNull(),
});

export const profileSubmissions = sqliteTable('profile_submissions', {
  id: text('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
  status: text('status').notNull().default('pending'),
  submittedAt: integer('submittedAt', { mode: 'timestamp_ms' }).notNull().defaultNow(),
  reviewedAt: integer('reviewedAt', { mode: 'timestamp_ms' }),
  reviewedBy: text('reviewedBy'),
});

export const educationEntries = sqliteTable('education_entries', {
  id: text('id').primaryKey(),
  section: text('section').notNull().default('lecture-notes'),
  heading: text('heading').notNull(),
  description: text('description'),
  links: text('links', { mode: 'json' }).$type<{ label: string; url: string }[]>().default([]),
  youtubeLinks: text('youtubeLinks', { mode: 'json' }).$type<string[]>().default([]),
  sortOrder: integer('sortOrder').notNull().default(0),
  status: text('status').notNull().default('draft'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull().defaultNow(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull().defaultNow(),
});

export const mediaAssets = sqliteTable('media_assets', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  filename: text('filename').notNull(),
  mime: text('mime').notNull(),
  size: integer('size').notNull(),
  uploadedBy: text('uploadedBy')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull().defaultNow(),
});

/**
 * Schema map passed to Drizzle. Better Auth's drizzle adapter resolves tables
 * by singular model name ('user', 'session', 'account', 'verification',
 * 'rateLimit'), so those keys must be singular even though the DB tables are
 * plural.
 */
export const schema = {
  user: users,
  session: sessions,
  account: accounts,
  verification: verifications,
  rateLimit,
  memberProfiles,
  blogPosts,
  publicationEntries,
  profileSubmissions,
  mediaAssets,
  newsUpdates,
  educationEntries,
};
