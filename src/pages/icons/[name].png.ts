import type { APIRoute, GetStaticPaths } from 'astro';
import { iconPng, type IconOptions } from '../../lib/icon';

const ICONS: Record<string, { size: number } & IconOptions> = {
  'icon-192': { size: 192, rounded: true },
  'icon-512': { size: 512, rounded: true },
  'maskable-192': { size: 192, maskable: true },
  'maskable-512': { size: 512, maskable: true },
};

export const getStaticPaths = (() =>
  Object.keys(ICONS).map((name) => ({ params: { name } }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const { size, ...opts } = ICONS[params.name as string]!;
  return new Response(new Uint8Array(await iconPng(size, opts)), {
    headers: { 'Content-Type': 'image/png' },
  });
};
