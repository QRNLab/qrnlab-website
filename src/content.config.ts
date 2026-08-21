import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { d1Loader } from './loaders/d1';

const team = defineCollection({
  loader: d1Loader('team'),
  schema: z.object({
    category: z.enum(['pi', 'member', 'alumni']),
    name: z.string(),
    email: z.string().optional(),
    image: z.string().optional(),
    title: z.string().optional(),
    role: z.string().optional(),
    focus: z.string().optional(),
    website: z.string().optional(),
    scholar: z.string().optional(),
    linkedin: z.string().optional(),
    github: z.string().optional(),
    yearGraduated: z.number().optional(),
    currentPosition: z.string().optional(),
    currentInstitution: z.string().optional(),
    institutionPage: z.string().optional(),
    links: z.array(z.object({
      label: z.string(),
      url: z.string(),
    })).optional(),
    publications: z.array(z.string()).optional(),
  }),
});

const blog = defineCollection({
  loader: d1Loader('blog'),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    excerpt: z.string().optional(),
    author: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

const publications = defineCollection({
  loader: d1Loader('publications'),
  schema: z.object({
    title: z.string(),
    authors: z.array(z.object({
      name: z.string(),
      memberSlug: z.string().optional(),
    })),
    venue: z.string(),
    year: z.number(),
    type: z.enum(['journal', 'conference', 'preprint']).default('journal'),
    url: z.string().optional(),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: 'src/content/projects' }),
  schema: z.object({
    title: z.string(),
    domain: z.enum(['nuclear-interactions', 'radiation-shielding', 'quantum-physics', 'quantum-computing']),
    status: z.enum(['active', 'completed']).default('active'),
    lead: z.string(),
    researchers: z.array(z.string()).optional(),
    conference: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

const updates = defineCollection({
  loader: d1Loader('updates'),
  schema: z.object({
    date: z.coerce.date(),
  }),
});

const education = defineCollection({
  loader: d1Loader('education'),
  schema: z.object({
    section: z.enum(['lecture-notes', 'presentations', 'posters']),
    heading: z.string(),
    description: z.string().optional(),
    links: z.array(z.object({
      label: z.string(),
      url: z.string(),
    })).optional(),
    youtubeLinks: z.array(z.string()).optional(),
  }),
});

export const collections = { team, blog, publications, projects, updates, education };
