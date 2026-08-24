import type { Permission, PublicationAuthor, Role } from '@qrnlab/shared';

export type { Permission, PublicationAuthor, Role };

/**
 * User record returned by `GET /api/me` and `GET /api/auth/sign-in/email`.
 * The `role` is the normalized display role (`user | editor | admin`).
 */
export type AuthUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role?: Role;
};

/** `GET /api/me` response. */
export type Me = {
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
  permissions: Permission[];
  profile: Profile | null;
};

/**
 * A member profile row (`member_profiles`). JSON columns (`links`,
 * `publications`) arrive decoded; timestamps are ISO strings after `c.json`.
 */
export type Profile = {
  userId: string;
  status: 'pending' | 'approved' | 'rejected';
  slug: string | null;
  category: 'pi' | 'member' | 'alumni';
  name: string;
  title: string | null;
  image: string | null;
  role: string | null;
  focus: string | null;
  email: string | null;
  bio: string | null;
  website: string | null;
  scholar: string | null;
  linkedin: string | null;
  github: string | null;
  currentPosition: string | null;
  currentInstitution: string | null;
  institutionPage: string | null;
  yearGraduated: number | null;
  links: { label: string; url: string }[];
  publications: string[];
  createdAt: string;
  updatedAt: string;
};

/** `POST /api/auth/sign-in/email` response. */
export type SignInResponse = {
  token: string;
  user: AuthUser;
};

/** `POST /api/auth/sign-up/email` response. */
export type SignUpResponse = {
  token: string | null;
  user: AuthUser;
};

/** A blog post row (`blog_posts`). */
export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  authorId: string;
  authorName: string | null;
  tags: string[];
  status: 'draft' | 'submitted' | 'published' | 'rejected';
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

/** A publication row (`publications`). */
export type Publication = {
  id: string;
  slug: string;
  title: string;
  authors: PublicationAuthor[];
  venue: string;
  year: number;
  type: 'journal' | 'conference' | 'preprint';
  url: string | null;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
};

/** A news update row (`news_updates`). */
export type Update = {
  id: string;
  slug: string;
  date: string;
  text: string;
  createdAt: string;
  updatedAt: string;
};

/** An education entry row (`education_entries`). */
export type EducationEntry = {
  id: string;
  section: 'lecture-notes' | 'presentations' | 'posters';
  heading: string;
  description: string | null;
  links: { label: string; url: string }[];
  youtubeLinks: string[];
  images: string[];
  sortOrder: number;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
};

/** A compact team reference from `GET /content/team` (editor autocompletes). */
export type TeamMemberRef = {
  slug: string;
  name: string;
  category: string;
};

/** A user row from `GET /admin/users` (role normalized via `displayRole`). */
export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  emailVerified: boolean;
  category: string | null;
  status: string | null;
  createdAt: string;
};

/** A media asset row from `GET /media` (with absolute `url` added by the API). */
export type MediaAsset = {
  id: string;
  key: string;
  filename: string;
  mime: string;
  size: number;
  uploadedBy: string;
  createdAt: string;
  url: string;
};

/** A queued static-site rebuild (`pending_rebuilds`). */
export type PendingRebuild = {
  id: string;
  kind: string;
  ref: string | null;
  label: string;
  createdAt: string;
  status: 'pending' | 'built';
  builtAt: string | null;
};
