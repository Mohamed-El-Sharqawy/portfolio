import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { renderOg, type OgInput } from '../../lib/og';
import { profile } from '../../data/site';

export const getStaticPaths = (async () => {
  const projects = await getCollection('projects');
  const pages: { params: { slug: string }; props: OgInput }[] = [
    {
      params: { slug: 'index' },
      props: {
        eyebrow: profile.headline,
        title: profile.name,
        subtitle: 'I build national-scale systems — and the AI agent teams that help ship them.',
        metric: { value: '1M+', label: 'users reached' },
      },
    },
    ...projects.map((p) => ({
      params: { slug: p.id },
      props: {
        eyebrow: `[Case study] ${String(p.data.order).padStart(2, '0')} · ${p.data.category}`,
        title: p.data.name,
        subtitle: p.data.tagline,
        ...(p.data.metric && { metric: p.data.metric }),
      },
    })),
  ];
  return pages;
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const png = await renderOg(props as OgInput);
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
