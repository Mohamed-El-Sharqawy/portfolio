import { defineCollection, reference } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

const experience = defineCollection({
  loader: file('src/data/experience.json'),
  schema: z.object({
    order: z.number().int(),
    company: z.string(),
    role: z.string(),
    period: z.string(),
    location: z.string(),
    /** One-line summary shown on the home page. */
    summary: z.string(),
    stack: z.array(z.string()).min(1),
    highlights: z.array(z.string()).min(1),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    order: z.number().int(),
    name: z.string(),
    category: z.enum(['Enterprise', 'E-commerce', 'Platform']),
    featured: z.boolean().default(false),
    /** Company the work was delivered with (id in the experience collection). */
    company: reference('experience'),
    tagline: z.string(),
    /** Short card copy for the home page grid. */
    summary: z.string(),
    description: z.string(),
    impact: z.string(),
    stack: z.array(z.string()).min(1),
    /** Big-number panel, used for the featured card and the case-study header. */
    metric: z.object({ value: z.string(), label: z.string() }).optional(),
  }),
});

const skills = defineCollection({
  loader: file('src/data/skills.json'),
  schema: z.object({
    order: z.number().int(),
    group: z.string(),
    rows: z.array(z.array(z.string()).min(1)).min(1),
  }),
});

const education = defineCollection({
  loader: file('src/data/education.json'),
  schema: z.object({
    order: z.number().int(),
    credential: z.string(),
    institution: z.string(),
    shortInstitution: z.string(),
    period: z.string(),
  }),
});

export const collections = { experience, projects, skills, education };
