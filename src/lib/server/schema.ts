import {
  bigint,
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  role: text('role').notNull().default('member'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export const verifications = pgTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export type MemberProfile = {
  status: 'pending' | 'approved' | 'rejected';
  category: 'member' | 'alumni';
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
  links?: { label: string; url: string }[];
  publications?: string[];
};

export const memberProfiles = pgTable('member_profiles', {
  userId: text('userId')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('pending'),
  slug: text('slug'),
  category: text('category').notNull().default('member'),
  name: text('name').notNull(),
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
  yearGraduated: integer('yearGraduated'),
  links: jsonb('links').$type<{ label: string; url: string }[]>().default([]),
  publications: jsonb('publications').$type<string[]>().default([]),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export const blogPosts = pgTable('blog_posts', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  excerpt: text('excerpt'),
  body: text('body').notNull(),
  authorId: text('authorId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  authorName: text('authorName'),
  tags: jsonb('tags').$type<string[]>().default([]),
  status: text('status').notNull().default('draft'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  publishedAt: timestamp('publishedAt'),
});

export const publicationEntries = pgTable('publications', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  authors: jsonb('authors').$type<string[]>().notNull(),
  venue: text('venue').notNull(),
  year: integer('year').notNull(),
  type: text('type').notNull().default('journal'),
  url: text('url'),
  status: text('status').notNull().default('published'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export const rateLimit = pgTable('rateLimit', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  count: integer('count').notNull(),
  lastRequest: bigint('lastRequest', { mode: 'number' }).notNull(),
});

export const profileSubmissions = pgTable('profile_submissions', {
  id: text('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  status: text('status').notNull().default('pending'),
  submittedAt: timestamp('submittedAt').notNull().defaultNow(),
  reviewedAt: timestamp('reviewedAt'),
  reviewedBy: text('reviewedBy'),
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
};
