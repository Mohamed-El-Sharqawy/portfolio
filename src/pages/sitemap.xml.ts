import type { APIRoute } from 'astro';

/** Alias for tools that only look at /sitemap.xml; the real index is @astrojs/sitemap's. */
export const GET: APIRoute = ({ site }) =>
  new Response(
    `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${new URL('sitemap-0.xml', site).href}</loc></sitemap></sitemapindex>`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
