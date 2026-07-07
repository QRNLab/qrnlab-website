import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const team = defineCollection({
  loader: glob({ pattern: '**/*.md', base: 'src/content/team' }),
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

export const collections = { team, projects };
