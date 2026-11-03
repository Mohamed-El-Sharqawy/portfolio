import type { APIRoute } from 'astro';
import { iconPng, pngToIco } from '../lib/icon';

export const GET: APIRoute = async () =>
  new Response(new Uint8Array(pngToIco(await iconPng(32, { rounded: true }), 32)), {
    headers: { 'Content-Type': 'image/x-icon' },
  });
