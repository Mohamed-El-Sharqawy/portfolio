import type { APIRoute } from 'astro';
import { iconPng } from '../lib/icon';

// 180×180, opaque and square: iOS applies its own corner mask.
export const GET: APIRoute = async () =>
  new Response(new Uint8Array(await iconPng(180)), { headers: { 'Content-Type': 'image/png' } });
