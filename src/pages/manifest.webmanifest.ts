import type { APIRoute } from 'astro';
import { profile, siteDescription } from '../data/site';
import { BRAND } from '../lib/icon';

const icons = [
  { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
  { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
  { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
];

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify(
      {
        id: '/',
        name: `${profile.name} — ${profile.role}`,
        short_name: profile.name,
        description: siteDescription,
        lang: 'en',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: BRAND.paper,
        theme_color: BRAND.paper,
        categories: ['business', 'productivity'],
        icons,
        shortcuts: [
          { name: 'Selected work', url: '/#work', icons: [icons[0]] },
          { name: 'Contact', url: '/#contact', icons: [icons[0]] },
          { name: 'CV (PDF)', url: profile.cvUrl, icons: [icons[0]] },
        ],
      },
      null,
      2,
    ),
    { headers: { 'Content-Type': 'application/manifest+json' } },
  );
