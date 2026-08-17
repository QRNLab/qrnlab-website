import { z } from 'zod';

/**
 * Prepend https:// when a value has no scheme (http:, mailto:, tel:, /path...).
 * Keeps user-entered links from becoming internal site links.
 */
function normalizeUrl(value: string | undefined): string | undefined {
  const v = value?.trim();
  if (!v) return undefined;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(v)) return v;
  return `https://${v}`;
}

const optionalUrl = z.string().trim().max(500).optional().transform(normalizeUrl);
const optionalText = (max: number) => z.string().trim().max(max).optional();

const linkItem = z.object({
  label: z.string().trim().min(1).max(100),
  url: z.string().trim().min(1).max(500),
}).transform((l) => ({ label: l.label, url: normalizeUrl(l.url) ?? l.url }));

export const profileSchema = z.object({
  category: z.enum(['member', 'alumni']).default('member'),
  name: z.string().trim().min(1).max(200),
  title: optionalText(200),
  image: z.string().trim().max(500).optional(),
  role: optionalText(200),
  focus: optionalText(200),
  email: z.string().trim().max(200).optional(),
  bio: z.string().max(5000).optional(),
  website: optionalUrl,
  scholar: optionalUrl,
  linkedin: optionalUrl,
  github: optionalUrl,
  currentPosition: optionalText(200),
  currentInstitution: optionalText(200),
  yearGraduated: z.coerce.number().int().min(1900).max(2100).optional(),
  links: z.array(linkItem).max(20).optional(),
  publications: z.array(z.string().trim().min(1).max(1000)).max(50).optional(),
});

export const blogSchema = z.object({
  title: z.string().trim().min(1).max(300),
  excerpt: z.string().trim().max(500).optional(),
  body: z.string().min(1),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
});

export type PublicationAuthor = { name: string; memberSlug?: string };

export const publicationSchema = z.object({
  title: z.string().trim().min(1).max(300),
  authors: z
    .array(z.object({
      name: z.string().trim().min(1).max(200),
      memberSlug: z.string().trim().max(200).optional(),
    }))
    .min(1)
    .max(50),
  venue: z.string().trim().min(1).max(300),
  year: z.number().int().min(1900).max(2100),
  type: z.enum(['journal', 'conference', 'preprint']).default('journal'),
  url: z.string().trim().max(500).optional().transform(normalizeUrl),
});

export const roleSchema = z.object({
  role: z.enum(['member', 'editor', 'admin']),
});

export const updateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  text: z.string().trim().min(1).max(500),
});
