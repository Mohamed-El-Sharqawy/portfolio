import type { APIRoute } from 'astro';

/**
 * Service worker, versioned per build so a deploy replaces the old caches.
 * - Pages: network-first (always fresh when online), cached copy offline,
 *   /offline/ as the last resort.
 * - /_astro/* (content-hashed JS, CSS, fonts, images): cache-first, they never change.
 * - Everything else same-origin (OG images, icons, CV, contour SVG): stale-while-revalidate.
 * Cross-origin and non-GET requests are left to the network.
 */
const VERSION = Date.now().toString(36);

const sw = `const V = '${VERSION}';
const PAGES = 'pages-' + V, ASSETS = 'assets-' + V, STATIC = 'static-' + V;
const PRECACHE = ['/', '/offline/', '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(PAGES).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.endsWith(V)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const put = (name, req, res) => {
  if (res && res.ok && res.type === 'basic') {
    const copy = res.clone();
    caches.open(name).then((c) => c.put(req, copy));
  }
  return res;
};

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => put(PAGES, req, res))
        .catch(() =>
          caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('/offline/')),
        ),
    );
    return;
  }

  if (url.pathname.startsWith('/_astro/')) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => put(ASSETS, req, res))));
    return;
  }

  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req).then((res) => put(STATIC, req, res)).catch(() => hit);
      return hit || net;
    }),
  );
});
`;

export const GET: APIRoute = () =>
  new Response(sw, { headers: { 'Content-Type': 'text/javascript; charset=utf-8' } });
