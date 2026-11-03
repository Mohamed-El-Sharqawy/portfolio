import type { APIRoute } from 'astro';
import { contourSvg } from '../../shapes/contour';

export const GET: APIRoute = () =>
  new Response(contourSvg(), { headers: { 'Content-Type': 'image/svg+xml' } });
