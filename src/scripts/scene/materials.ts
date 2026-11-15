import {
  Color, DataTexture, Mesh, NormalBlending, RepeatWrapping, ShaderMaterial,
  Sphere, Texture, Vector2, Vector3, type Camera, type Object3D,
} from 'three';
import sketchVert from './shaders/sketch.vert';
import sketchFrag from './shaders/sketch.frag';
import outlineVert from './shaders/outline.vert';
import outlineFrag from './shaders/outline.frag';
import avatarVert from './shaders/avatar.vert';
import avatarFrag from './shaders/avatar.frag';
import { COLORS } from './config';
import type { Quality } from './renderer';

const blank = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
blank.needsUpdate = true;

/** Uniform objects shared by reference across every sketch material. */
const shared = {
  uNoiseTex: { value: blank as Texture },
  uPaperTex: { value: blank as Texture },
  uStrokeTex: { value: blank as Texture },
  uTime: { value: 0 },
  uQuality: { value: 1 },
  uInk: { value: new Color(COLORS.ink) },
  uPaper: { value: new Color(COLORS.paper) },
  uLightDir: { value: new Vector3(0.45, 0.85, 0.35).normalize() },
  uFogNear: { value: 14 },
  uFogFar: { value: 48 },
};

let reducedMotion = false;
let seedCounter = 1;

export function initMaterials(opts: { paper: Texture; strokes: Texture; noise: Texture; quality: Quality; reducedMotion: boolean }) {
  shared.uNoiseTex.value = opts.noise;
  for (const t of [opts.paper, opts.strokes, opts.noise]) {
    t.wrapS = t.wrapT = RepeatWrapping;
    t.needsUpdate = true;
  }
  shared.uPaperTex.value = opts.paper;
  shared.uStrokeTex.value = opts.strokes;
  shared.uQuality.value = opts.quality === 'high' ? 1 : 0;
  reducedMotion = opts.reducedMotion;
}

export interface SketchOptions {
  tint?: number;
  tintAmount?: number;
  /** Outline width in UV units [u, v]; [0, 0] disables. */
  edge?: [number, number];
  map?: Texture | null;
  hatchScale?: number;
  paintColor?: number;
}

export type SketchMaterial = ShaderMaterial & {
  uniforms: {
    uProgress: { value: number };
    uPaint: { value: number };
    uPaintUV: { value: Vector2 };
    uPaintColor: { value: Color };
    uMap: { value: Texture };
    uHasMap: { value: number };
    [k: string]: { value: unknown };
  };
};

export function sketchMaterial(o: SketchOptions = {}): SketchMaterial {
  const mat = new ShaderMaterial({
    vertexShader: sketchVert,
    fragmentShader: sketchFrag,
    uniforms: {
      ...shared,
      // own copy of the light, so one object can be lit differently (inspect.ts lights what you're reading)
      uLightDir: { value: shared.uLightDir.value.clone() },
      uMap: { value: o.map ?? blank },
      uHasMap: { value: o.map ? 1 : 0 },
      uProgress: { value: reducedMotion ? 1 : 0.2 },
      uSeed: { value: (seedCounter++ * 7.31) % 97 },
      uTint: { value: new Color(o.tint ?? COLORS.paper) },
      uTintAmount: { value: o.tintAmount ?? 0 },
      uEdge: { value: new Vector2(...(o.edge ?? [0.045, 0.045])) },
      uHatchScale: { value: o.hatchScale ?? 0.55 },
      uPaint: { value: 0 },
      uPaintUV: { value: new Vector2(0.5, 0.5) },
      uPaintColor: { value: new Color(o.paintColor ?? COLORS.terracotta) },
    },
  });
  return mat as SketchMaterial;
}

/** Edge widths for a w×h face so the pencil outline is ~`px` metres thick. */
export function edgeFor(w: number, h: number, px = 0.03): [number, number] {
  return [px / w, px / h];
}

export type OutlineMaterial = ShaderMaterial & { uniforms: { uHover: { value: number } } };

export function outlineMaterial(w: number, h: number, inset = 0.12, color = COLORS.ochre): OutlineMaterial {
  return new ShaderMaterial({
    vertexShader: outlineVert,
    fragmentShader: outlineFrag,
    transparent: true,
    depthWrite: false,
    blending: NormalBlending,
    uniforms: {
      uHover: { value: 0 },
      uTime: shared.uTime,
      uNoiseTex: shared.uNoiseTex,
      uSize: { value: new Vector2(w, h) },
      uInset: { value: inset },
      uColor: { value: new Color(color) },
      uCore: { value: new Color(COLORS.terracotta) },
    },
  }) as OutlineMaterial;
}

/** Flipbook sprite material for the hand-drawn avatar (see avatar.ts). */
export function avatarMaterial(sketch: Texture, painted: Texture, grid: number) {
  return new ShaderMaterial({
    vertexShader: avatarVert,
    fragmentShader: avatarFrag,
    uniforms: {
      uSketch: { value: sketch },
      uPainted: { value: painted },
      uFrame: { value: 0 },
      uGrid: { value: grid },
      uPaint: { value: 0 },
      uPaintUV: { value: new Vector2(0.5, 0.5) },
      uTime: shared.uTime,
      uNoiseTex: shared.uNoiseTex,
      uPaper: shared.uPaper,
      uFogNear: shared.uFogNear,
      uFogFar: shared.uFogFar,
    },
  }) as SketchMaterial & { uniforms: { uFrame: { value: number } } };
}

/* ---------- distance-driven "draw itself" progress ---------- */

interface Tracked { mat: SketchMaterial; center: Vector3; min: number }
const tracked: Tracked[] = [];
const sphere = new Sphere();

/** Register every sketch mesh under `root` so its strokes draw in as the camera approaches. */
export function trackSketches(root: Object3D, min = 0.18) {
  root.updateWorldMatrix(true, true);
  root.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh) return;
    const mat = mesh.material as SketchMaterial;
    if (!mat?.uniforms?.uProgress) return;
    mesh.geometry.computeBoundingSphere();
    sphere.copy(mesh.geometry.boundingSphere!).applyMatrix4(mesh.matrixWorld);
    mat.uniforms.uProgress.value = reducedMotion ? 1 : Math.max(mat.uniforms.uProgress.value, min);
    tracked.push({ mat, center: sphere.center.clone(), min });
  });
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Advances the draw-in progress. Returns true if any material visibly changed. */
export function updateMaterials(camera: Camera, dt: number, time: number): boolean {
  shared.uTime.value = time;
  if (reducedMotion) return false;
  const k = 1 - Math.exp(-dt * 1.6);
  let changed = false;
  for (const t of tracked) {
    const d = camera.position.distanceTo(t.center);
    const target = t.min + (1 - t.min) * (1 - smooth(3, 14, d));
    const u = t.mat.uniforms.uProgress;
    // Only ever draws forward: once sketched, a stroke stays.
    if (target - u.value > 0.002) {
      u.value += (target - u.value) * k;
      changed = true;
    }
  }
  return changed;
}

/* ---------- glTF → sketch materials ---------- */

const TINTS: Record<string, { tint: number; amount: number }> = {
  paper: { tint: COLORS.paper, amount: 0 },
  ochre: { tint: COLORS.ochre, amount: 0.55 },
  terracotta: { tint: COLORS.terracotta, amount: 0.6 },
  ink: { tint: COLORS.ink, amount: 0.85 },
  sage: { tint: COLORS.sage, amount: 0.55 },
};

/**
 * Replace a loaded glTF's PBR materials with sketch materials, keyed by the
 * glTF material name (paper / ochre / terracotta / ink). Returns meshes by node name.
 */
export function sketchify(root: Object3D, maps: Record<string, Texture> = {}) {
  const byName: Record<string, Mesh> = {};
  root.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh) return;
    const src = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    const t = TINTS[src.name] ?? TINTS.paper;
    const map = maps[mesh.name] ?? maps[mesh.parent?.name ?? ''];
    mesh.material = sketchMaterial({
      tint: t.tint,
      tintAmount: map ? 0 : t.amount,
      map: map ?? null,
      edge: map ? [0.012, 0.016] : [0.07, 0.07],
      // hover paints each part in its own colour (plain paper parts get terracotta)
      paintColor: src.name === 'paper' || !src.name ? COLORS.terracotta : t.tint,
    });
    byName[mesh.name || mesh.parent?.name || mesh.uuid] = mesh;
  });
  return byName;
}
