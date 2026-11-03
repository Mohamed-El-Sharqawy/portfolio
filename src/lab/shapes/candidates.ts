export type Group = 'css' | 'canvas' | 'webgl' | 'video';
export type { Tone } from '../../shapes/types';

export interface Candidate {
  id: string;
  name: string;
  group: Group;
  technique: string;
  replaces: string;
  note: string;
}

export const candidates: Candidate[] = [
  {
    id: 'css-orb',
    name: 'Iridescent glass orb',
    group: 'css',
    technique: 'CSS gradients + static SVG feTurbulence grain',
    replaces: 'Hero orb · case-study orb',
    note: 'Radial body, rim-masked conic thin-film layer that rotates, specular highlight, baked grain.',
  },
  {
    id: 'css-ring',
    name: 'Thin-film ring',
    group: 'css',
    technique: 'CSS conic gradient inside a radial mask, 3D tilt',
    replaces: 'Contact torus · hero torus',
    note: 'The colour flows round the ring while the ring itself only tilts. Tube shading is a static overlay.',
  },
  {
    id: 'svg-contour',
    name: 'Contour-line blob',
    group: 'css',
    technique: 'SVG generated at build time, used as a CSS mask',
    replaces: 'Work blob',
    note: 'Thin-line contour rings of a noise-displaced sphere. Two copies counter-rotate for a moiré shimmer.',
  },
];

export const byId = (id: string) => candidates.find((c) => c.id === id);
