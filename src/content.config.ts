import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      order: z.number().int(),
      title: z.string(),
      status: z.string().optional(),
      tagline: z.string(),
      tags: z.array(z.string()).min(1),
      repo: z.url(),
      thumbnail: image(),
      thumbnailAlt: z.string(),
      /** KTX2 version of the thumbnail used on the 3D frame. */
      texture: z.string(),
    }),
});

const experience = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/experience' }),
  schema: z.object({
    order: z.number().int(),
    role: z.string(),
    company: z.string(),
    location: z.string(),
    start: z.string(),
    end: z.string(),
    summary: z.string(),
  }),
});

const education = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/education' }),
  schema: z.object({
    order: z.number().int(),
    title: z.string(),
    institution: z.string(),
    detail: z.string().optional(),
    period: z.string().optional(),
    kind: z.enum(['degree', 'certificate']),
  }),
});

const faq = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/faq' }),
  schema: z.object({
    order: z.number().int(),
    question: z.string(),
    answer: z.string(),
  }),
});

export const collections = { projects, experience, education, faq };
