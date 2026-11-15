import { Group, Mesh, PlaneGeometry, type Object3D } from 'three';
import { COLORS, CORRIDOR, DOOR_LAYOUT } from './config';
import { sketchify, sketchMaterial, trackSketches, type SketchMaterial } from './materials';
import { canvasTexture, handText, roughLine, TERRA, OCHRE, INK } from './sketch-canvas';
import { tagInteractive } from './corridor';
import { rng } from './texgen';
import type { Assets } from './assets';

/**
 * Furniture + accessories scattered along the corridor.
 * Placement is random but seeded, so every visit gets the same layout. Props
 * keep clear of the doors, the entrance easel/avatar and the FAQ board, and
 * hug the walls so the walking path stays open. Everything paints itself in
 * colour on hover, like the rest of the sketches.
 */

interface FloorProp { name: string; length: number; depth: number; tall?: boolean; jitter?: boolean }

const FLOOR_PROPS: FloorProp[] = [
  { name: 'bench', length: 1.5, depth: 0.42, jitter: true },
  { name: 'chair', length: 0.6, depth: 0.45, jitter: true },
  { name: 'plant', length: 0.6, depth: 0.4, jitter: true },
  { name: 'plant_tall', length: 0.7, depth: 0.6, tall: true, jitter: true },
  { name: 'side_table', length: 0.7, depth: 0.6, jitter: true },
  { name: 'bookshelf', length: 1.1, depth: 0.32, tall: true },
  { name: 'coat_rack', length: 0.6, depth: 0.5, tall: true, jitter: true },
  { name: 'trash_bin', length: 0.5, depth: 0.36, jitter: true },
];
const FLOATERS = ['paper_plane', 'paper_plane', 'paper_ball', 'paper_ball', 'mug', 'pencil', 'books'];

const SEED = 2026;
const WALL_X = CORRIDOR.width / 2;

/** z-ranges (per side) where nothing may stand. */
function blocked(side: -1 | 1): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  for (const d of Object.values(DOOR_LAYOUT)) if (d.side === side) ranges.push([d.z - 1.8, d.z + 1.8]);
  if (side < 0) ranges.push([0.2, 4.4]); // About easel + avatar
  ranges.push([-60, side < 0 ? -42.8 : -45.4]); // FAQ board + goodbye avatar
  ranges.push([6.2, 60]); // behind the start position
  return ranges;
}
const overlaps = (a0: number, a1: number, ranges: Array<[number, number]>) => ranges.some(([b0, b1]) => a0 < b1 && a1 > b0);

/** Little framed doodles for the walls. */
const DOODLES: Array<(ctx: CanvasRenderingContext2D, w: number, h: number) => void> = [
  (ctx, w, h) => { // cat
    ctx.strokeStyle = INK; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.ellipse(w / 2, h * 0.62, 120, 95, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w / 2 - 95, h * 0.45); ctx.lineTo(w / 2 - 80, h * 0.22); ctx.lineTo(w / 2 - 40, h * 0.38);
    ctx.moveTo(w / 2 + 95, h * 0.45); ctx.lineTo(w / 2 + 80, h * 0.22); ctx.lineTo(w / 2 + 40, h * 0.38); ctx.stroke();
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(w / 2 - 40, h * 0.58, 9, 0, 7); ctx.arc(w / 2 + 40, h * 0.58, 9, 0, 7); ctx.fill();
    roughLine(ctx, w / 2 - 150, h * 0.66, w / 2 - 60, h * 0.68, 3); roughLine(ctx, w / 2 + 60, h * 0.68, w / 2 + 150, h * 0.66, 3);
  },
  (ctx, w, h) => { // coffee
    ctx.strokeStyle = INK; ctx.lineWidth = 7;
    ctx.strokeRect(w / 2 - 90, h * 0.4, 160, 170); ctx.beginPath(); ctx.arc(w / 2 + 85, h * 0.55, 40, -1.4, 1.4); ctx.stroke();
    ctx.strokeStyle = TERRA; ctx.lineWidth = 5;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(w / 2 - 50 + i * 45, h * 0.35); ctx.bezierCurveTo(w / 2 - 80 + i * 45, h * 0.27, w / 2 - 20 + i * 45, h * 0.2, w / 2 - 50 + i * 45, h * 0.1); ctx.stroke(); }
  },
  (ctx, w, h) => { handText(ctx, '</>', w / 2, h / 2, 230, TERRA); },
  (ctx, w, h) => { // mountains + sun
    ctx.fillStyle = OCHRE; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(w * 0.7, h * 0.3, 60, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.beginPath();
    ctx.moveTo(30, h - 60); ctx.lineTo(w * 0.32, h * 0.38); ctx.lineTo(w * 0.52, h * 0.62); ctx.lineTo(w * 0.68, h * 0.48); ctx.lineTo(w - 30, h - 60); ctx.stroke();
  },
  (ctx, w, h) => { handText(ctx, 'ship it!', w / 2, h / 2, 140, INK); roughLine(ctx, w * 0.2, h * 0.7, w * 0.8, h * 0.68, 6, TERRA); },
  (ctx, w, h) => { handText(ctx, '{ }', w / 2, h / 2, 240, OCHRE); },
];

export interface CorridorProps {
  group: Group;
  pickables: Object3D[];
  /** Gentle bob/spin for the floating doodles (only visible while frames render). */
  animate(time: number): void;
}

export async function createProps(assets: Assets): Promise<CorridorProps> {
  const rand = rng(SEED);
  const [library, frameProto] = await Promise.all([assets.model('/models/props.glb'), assets.model('/models/frame.glb')]);
  const group = new Group();
  group.name = 'props';
  const pickables: Object3D[] = [];

  const spawn = (name: string) => {
    const proto = library.getObjectByName(name);
    if (!proto) return null;
    const obj = proto.clone(true);
    obj.position.set(0, 0, 0);
    obj.rotation.set(0, 0, 0);
    const parts = sketchify(obj);
    const paint = Object.values(parts).map((m) => m.material as SketchMaterial);
    for (const m of paint) if (name === 'paper_plane') m.side = 2; // thin, seen from both sides
    tagInteractive(obj, { kind: 'prop', id: name, paint });
    obj.traverse((o) => (o as Mesh).isMesh && pickables.push(o));
    return obj;
  };

  /* ---- floor props against the walls ---- */
  const tallRanges: Record<string, Array<[number, number]>> = { '-1': [], '1': [] };
  for (const side of [-1, 1] as const) {
    const no = blocked(side);
    let z = 5.6 - rand() * 1.5;
    let last = '';
    while (z > -46) {
      let def = FLOOR_PROPS[Math.floor(rand() * FLOOR_PROPS.length)];
      if (def.name === last) def = FLOOR_PROPS[(FLOOR_PROPS.indexOf(def) + 1) % FLOOR_PROPS.length];
      const z0 = z - def.length;
      if (overlaps(z0, z, no)) {
        z -= 0.4;
        continue;
      }
      const obj = spawn(def.name);
      if (obj) {
        const zc = (z + z0) / 2;
        obj.position.set(side * (WALL_X - def.depth / 2 - 0.06), 0, zc);
        obj.rotation.y = (side < 0 ? Math.PI / 2 : -Math.PI / 2) + (def.jitter ? (rand() - 0.5) * 0.25 : 0);
        group.add(obj);
        if (def.tall) tallRanges[side].push([z0 - 0.3, z + 0.3]);
        // something on top now and then
        if ((def.name === 'bench' || def.name === 'side_table') && rand() < 0.6) {
          const top = spawn(rand() < 0.5 ? 'books' : 'mug');
          if (top) {
            top.position.set(def.name === 'bench' ? 0.35 : -0.05, def.name === 'bench' ? 0.48 : 0.64, 0.05);
            top.rotation.y = rand() * Math.PI;
            obj.add(top);
          }
        }
        last = def.name;
      }
      z = z0 - (0.9 + rand() * 3.4);
    }
  }

  /* ---- little framed doodles on the walls ---- */
  let doodle = Math.floor(rand() * DOODLES.length);
  for (const side of [-1, 1] as const) {
    const no = [...blocked(side), ...tallRanges[side]];
    for (let z = 3 - rand() * 3; z > -44; z -= 5 + rand() * 6) {
      if (overlaps(z - 0.5, z + 0.5, no)) continue;
      const frame = frameProto.clone(true);
      const tex = canvasTexture(512, 400, DOODLES[doodle++ % DOODLES.length]);
      const parts = sketchify(frame, { picture: tex });
      const paint = Object.values(parts).map((m) => m.material as SketchMaterial);
      tagInteractive(frame, { kind: 'prop', id: 'doodle', paint });
      frame.traverse((o) => (o as Mesh).isMesh && pickables.push(o));
      frame.scale.setScalar(0.75 + rand() * 0.35);
      frame.position.set(side * (WALL_X - 0.04), 1.75 + rand() * 0.35, z);
      frame.rotation.set(0, side < 0 ? Math.PI / 2 : -Math.PI / 2, (rand() - 0.5) * 0.08);
      group.add(frame);
    }
  }

  /* ---- rugs ---- */
  for (const z of [-12.5, -30.5]) {
    const w = 1.6, l = 2.6;
    const warm = rand() < 0.5;
    // hand-drawn woven pattern: border bands, a diamond row and fringe
    const pattern = canvasTexture(320, 520, (ctx, cw, ch) => {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 4;
      ctx.strokeRect(22, 22, cw - 44, ch - 44);
      ctx.strokeStyle = warm ? OCHRE : TERRA;
      ctx.lineWidth = 10;
      ctx.strokeRect(46, 46, cw - 92, ch - 92);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      for (let y = 110; y < ch - 100; y += 75) {
        ctx.beginPath();
        ctx.moveTo(cw / 2, y - 30); ctx.lineTo(cw / 2 + 50, y); ctx.lineTo(cw / 2, y + 30); ctx.lineTo(cw / 2 - 50, y); ctx.closePath();
        ctx.stroke();
      }
      for (let x = 30; x < cw - 20; x += 14) { roughLine(ctx, x, 4, x, 20, 2); roughLine(ctx, x, ch - 20, x, ch - 4, 2); }
    });
    const mat = sketchMaterial({ map: pattern, tint: warm ? COLORS.terracotta : COLORS.ochre, tintAmount: 0.4, edge: [0, 0], paintColor: warm ? COLORS.ochre : COLORS.terracotta });
    mat.polygonOffset = true;
    mat.polygonOffsetFactor = -2;
    const rug = new Mesh(new PlaneGeometry(w, l), mat);
    rug.rotation.x = -Math.PI / 2;
    rug.position.set((rand() - 0.5) * 0.4, 0.004, z + (rand() - 0.5) * 2);
    rug.rotation.z = (rand() - 0.5) * 0.2;
    group.add(rug);
  }

  /* ---- floating doodles ---- */
  const floaters: Array<{ obj: Object3D; y: number; phase: number; spin: number; rx: number }> = [];
  for (let i = 0; i < 12; i++) {
    const obj = spawn(FLOATERS[i % FLOATERS.length]);
    if (!obj) continue;
    const side = rand() < 0.5 ? -1 : 1;
    const y = 2.05 + rand() * 0.85;
    obj.position.set(side * (0.7 + rand() * 1.1), y, 4 - rand() * 46);
    obj.rotation.set((rand() - 0.5) * 0.8, rand() * Math.PI * 2, (rand() - 0.5) * 0.6);
    obj.scale.setScalar(obj.name === 'paper_plane' ? 1.1 : 1.5);
    group.add(obj);
    floaters.push({ obj, y, phase: rand() * 10, spin: (rand() - 0.5) * 0.3, rx: obj.rotation.x });
  }

  group.updateMatrixWorld(true);
  trackSketches(group, 0.15);

  return {
    group,
    pickables,
    animate(time: number) {
      for (const f of floaters) {
        f.obj.position.y = f.y + Math.sin(time * 0.9 + f.phase) * 0.06;
        f.obj.rotation.y += f.spin * 0.016;
        f.obj.rotation.x = f.rx + Math.sin(time * 0.7 + f.phase) * 0.08;
        f.obj.updateMatrixWorld(true);
      }
    },
  };
}
