import type { APIRoute } from 'astro';
import { iconSvg } from '../lib/icon';

export const GET: APIRoute = async () =>
  new Response(await iconSvg(64, { rounded: true }), {
    headers: { 'Content-Type': 'image/svg+xml' },
  });
