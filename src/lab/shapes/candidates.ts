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
  {
    id: 'flow',
    name: 'Flow-field sphere',
    group: 'canvas',
    technique: 'Canvas 2D in a worker (OffscreenCanvas)',
    replaces: 'Agents orb · contact block',
    note: 'Streamlines advected over drifting vortex sinks + 3D noise, fading trails, particle heads, rim glow.',
  },
  {
    id: 'dots',
    name: 'Dot-matrix noise sphere',
    group: 'canvas',
    technique: 'Canvas 2D in a worker (OffscreenCanvas)',
    replaces: 'Hero orb',
    note: 'Fibonacci lattice displaced by animated noise, coloured by displacement, back dots dimmed.',
  },
  {
    id: 'gl-blob',
    name: 'Raymarched iridescent blob',
    group: 'webgl',
    technique: 'WebGL fragment shader (SDF raymarch), shared context in a worker',
    replaces: 'Work blob · agents blob',
    note: 'Three smooth-unioned spheres with ripple, thin-film colour on the Fresnel rim.',
  },
  {
    id: 'gl-torus',
    name: 'Raymarched wavy torus',
    group: 'webgl',
    technique: 'WebGL fragment shader (SDF raymarch), shared context in a worker',
    replaces: 'Contact torus',
    note: 'Tilted, spinning torus with a travelling ripple, same thin-film shading.',
  },
  {
    id: 'gl-ribbon',
    name: 'Twisting ribbon',
    group: 'webgl',
    technique: 'WebGL fragment shader (analytic 2D, no raymarch)',
    replaces: 'Hero capsule · case-study capsule',
    note: 'Three twisting bands with faked normals; the cheapest shader here.',
  },
];

export const byId = (id: string) => candidates.find((c) => c.id === id);
