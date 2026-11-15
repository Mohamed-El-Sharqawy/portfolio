import gsap from 'gsap';
import {
  BoxGeometry, ConeGeometry, CylinderGeometry, Group, IcosahedronGeometry, Mesh, PlaneGeometry,
  RepeatWrapping, SphereGeometry, Vector3, type Camera, type Object3D, type Texture,
} from 'three';
import { COLORS, CORRIDOR } from './config';
import { avatarMaterial, edgeFor, sketchMaterial, trackSketches, type SketchMaterial } from './materials';
import { canvasTexture, handText, bodyText, TERRA, INK } from './sketch-canvas';
import { tagInteractive, type Interactive } from './corridor';
import { createAvatar, type Avatar } from './avatar';
import type { Assets } from './assets';

/**
 * The outside of the building: a sketched brick façade with a hanging sign, a
 * sticker-covered double door you click to come in, a window where the avatar
 * pops up to wave, a tree with a computer mouse swinging from a branch, a cat,
 * a planter with a rubber duck, a ladybug and a stone path.
 */

const Z = CORRIDOR.start + 0.06; // façade plane (the corridor's start wall is at CORRIDOR.start)
const DOOR_W = 2.6;
const DOOR_H = 3.2;
const WIN = { x0: 2.9, x1: 4.7, y0: 1.1, y1: 2.8 };
const SIGN_Y = 5.75; // the beam the sign hangs from (board sits just above the door)

/** Where the camera stands outside, and what it looks at. */
export const OUTSIDE_POSE = { pos: new Vector3(0, 1.75, Z + 10), target: new Vector3(0, 2.6, Z) };
/** Narrow (portrait) screens stand further back so the whole front still fits. */
export function outsidePose(aspect: number) {
  const back = aspect < 0.8 ? 9.5 : aspect < 1.2 ? 8.5 : 7.5;
  return { pos: new Vector3(0, aspect < 0.8 ? 2.2 : 1.75, Z + back), target: new Vector3(0, 2.75, Z) };
}

/* ---------------- stickers ---------------- */

interface StickerDef {
  shape: 'circle' | 'square' | 'hex' | 'shield' | 'pill';
  color: string;
  text: string;
  textColor?: string;
  font?: number;
  atom?: boolean;
  smile?: string;
}
const STICKERS: StickerDef[] = [
  { shape: 'square', color: '#3178c6', text: 'TS', font: 120 },
  { shape: 'circle', color: '#20232a', text: 'React', font: 48, textColor: '#61dafb', atom: true },
  { shape: 'hex', color: '#5fa04e', text: 'node', font: 70 },
  { shape: 'circle', color: '#e0234e', text: 'Nest', font: 72 },
  { shape: 'circle', color: '#111111', text: 'Next', font: 70 },
  { shape: 'pill', color: '#336791', text: 'Postgres', font: 66 },
  { shape: 'pill', color: '#d82c20', text: 'redis', font: 84 },
  { shape: 'pill', color: '#2496ed', text: 'docker', font: 76 },
  { shape: 'pill', color: '#232f3e', text: 'aws', font: 90, textColor: '#ff9900', smile: '#ff9900' },
  { shape: 'hex', color: '#e10098', text: 'GraphQL', font: 50 },
  { shape: 'pill', color: '#0ea5e9', text: 'tailwind', font: 70 },
  { shape: 'shield', color: '#c8553d', text: '</>', font: 90 },
];

function stickerPath(ctx: CanvasRenderingContext2D, shape: StickerDef['shape'], w: number, h: number, inset: number) {
  const cx = w / 2, cy = h / 2;
  const rw = w / 2 - inset, rh = h / 2 - inset;
  ctx.beginPath();
  if (shape === 'circle') ctx.arc(cx, cy, Math.min(rw, rh), 0, Math.PI * 2);
  else if (shape === 'hex') for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 - Math.PI / 2; ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rw, cy + Math.sin(a) * rh); }
  else if (shape === 'shield') { ctx.moveTo(cx - rw, cy - rh); ctx.lineTo(cx + rw, cy - rh); ctx.lineTo(cx + rw, cy + rh * 0.2); ctx.quadraticCurveTo(cx + rw * 0.6, cy + rh * 0.8, cx, cy + rh); ctx.quadraticCurveTo(cx - rw * 0.6, cy + rh * 0.8, cx - rw, cy + rh * 0.2); }
  else {
    const r = shape === 'pill' ? Math.min(rw, rh) * 0.55 : 18;
    ctx.roundRect(cx - rw, cy - rh, rw * 2, rh * 2, r);
  }
  ctx.closePath();
}

function stickerTexture(def: StickerDef, sketch: boolean, w: number, h: number): Texture {
  // drawn at 2x so the lettering stays crisp from the street
  return canvasTexture(w * 2, h * 2, (ctx) => {
    ctx.scale(2, 2);
    // die-cut white border
    stickerPath(ctx, def.shape, w, h, 6);
    ctx.fillStyle = '#fdfcf9';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
    stickerPath(ctx, def.shape, w, h, 18);
    ctx.fillStyle = sketch ? '#fbfaf8' : def.color;
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.stroke();
    const tc = sketch ? INK : (def.textColor ?? '#ffffff');
    if (def.atom) {
      ctx.strokeStyle = tc;
      ctx.lineWidth = 5;
      for (const a of [0, Math.PI / 3, -Math.PI / 3]) {
        ctx.beginPath();
        ctx.ellipse(w / 2, h / 2 - 14, w * 0.3, w * 0.11, a, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = tc;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2 - 14, 9, 0, Math.PI * 2);
      ctx.fill();
      bodyText(ctx, def.text, w / 2, h - 46, def.font ?? 40, tc);
      return;
    }
    ctx.font = `800 ${Math.round((def.font ?? 60) * 1.12)}px Inter, sans-serif`;
    ctx.fillStyle = tc;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.text, w / 2, h / 2 + (def.smile ? -10 : 2), w - 44);
    if (def.smile) {
      ctx.strokeStyle = sketch ? INK : def.smile;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(w / 2 - 50, h / 2 + 28);
      ctx.quadraticCurveTo(w / 2, h / 2 + 50, w / 2 + 52, h / 2 + 26);
      ctx.stroke();
    }
  });
}

function sticker(def: StickerDef, size: number) {
  const wide = def.shape === 'pill';
  const w = wide ? 384 : 256, h = 256;
  const mat = avatarMaterial(stickerTexture(def, true, w, h), stickerTexture(def, false, w, h), 1);
  const s = wide ? size * 0.74 : size; // pills are wide, keep them in their column
  const mesh = new Mesh(new PlaneGeometry(s * (w / h), s), mat);
  return { mesh, mat: mat as unknown as SketchMaterial };
}

/* ---------------- helpers ---------------- */

/** Rectangular wall from planes, leaving the given holes open. UVs are in world units / tile. */
function wallWithHoles(
  x0: number, x1: number, y0: number, y1: number, z: number,
  holes: Array<[number, number, number, number]>, mat: SketchMaterial, tile: [number, number],
) {
  const xs = [...new Set([x0, x1, ...holes.flatMap((h) => [h[0], h[1]])])].sort((a, b) => a - b);
  const ys = [...new Set([y0, y1, ...holes.flatMap((h) => [h[2], h[3]])])].sort((a, b) => a - b);
  const g = new Group();
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const cx = (xs[i] + xs[i + 1]) / 2, cy = (ys[j] + ys[j + 1]) / 2;
      if (holes.some(([a, b, c, d]) => cx > a && cx < b && cy > c && cy < d)) continue;
      const w = xs[i + 1] - xs[i], h = ys[j + 1] - ys[j];
      const geo = new PlaneGeometry(w, h);
      const uv = geo.attributes.uv;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, (xs[i] + uv.getX(k) * w) / tile[0], (ys[j] + uv.getY(k) * h) / tile[1]);
      const m = new Mesh(geo, mat);
      m.position.set(cx, cy, z);
      g.add(m);
    }
  }
  return g;
}

const mat = (tint: number, amount: number, edge: [number, number] = [0.06, 0.06], paintColor?: number) =>
  sketchMaterial({ tint, tintAmount: amount, edge, paintColor: paintColor ?? (amount > 0 ? tint : COLORS.terracotta) });

export interface Entrance {
  group: Group;
  pickables: Object3D[];
  doors: { left: Group; right: Group };
  /** Swing both door leaves open/closed. */
  setDoorsOpen(open: boolean, reduced: boolean, pace?: number): void;
  /** Hover reactions. */
  hover(info: Interactive, on: boolean): void;
  update(dt: number, camera: Camera): boolean;
}

export async function createEntrance(assets: Assets, avatarTex: { sketch: Texture; painted: Texture }, reducedMotion: boolean): Promise<Entrance> {
  const [brick, cobble, catSketch, catPaint] = await Promise.all([
    assets.texture('/textures/brick.ktx2'),
    assets.texture('/textures/cobble.ktx2'),
    assets.texture('/textures/cat-sketch.ktx2'),
    assets.texture('/textures/cat-paint.ktx2'),
  ]);
  brick.wrapS = brick.wrapT = RepeatWrapping;
  const group = new Group();
  group.name = 'entrance';
  const pickables: Object3D[] = [];
  const pick = (root: Object3D, info: Interactive) => {
    tagInteractive(root, info);
    root.traverse((o) => (o as Mesh).isMesh && pickables.push(o));
  };

  /* ---- façade + ground + path ---- */
  const wallMat = sketchMaterial({ map: brick, edge: [0, 0], paintColor: COLORS.terracotta });
  group.add(wallWithHoles(-18, 18, 0, 15, Z, [[-DOOR_W / 2, DOOR_W / 2, -1, DOOR_H], [WIN.x0, WIN.x1, WIN.y0, WIN.y1]], wallMat, [2.6, 1.04]));

  const ground = new Mesh(new PlaneGeometry(40, 26), mat(COLORS.ochre, 0.07, [0, 0]));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.002, Z + 13);
  ground.scale.set(1.2, 1.4, 1);
  group.add(ground);

  const pathMat = sketchMaterial({ map: cobble, edge: [0, 0], tint: COLORS.paper });
  pathMat.polygonOffset = true;
  pathMat.polygonOffsetFactor = -2;
  // the path runs from the door step all the way back to where you start
  cobble.wrapS = cobble.wrapT = RepeatWrapping;
  const PATH_LEN = 16;
  const pathGeo = new PlaneGeometry(DOOR_W + 0.5, PATH_LEN);
  const puv = pathGeo.attributes.uv;
  for (let k = 0; k < puv.count; k++) puv.setY(k, puv.getY(k) * (PATH_LEN / 7.6));
  const path = new Mesh(pathGeo, pathMat);
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.004, Z + 0.05 + PATH_LEN / 2);
  group.add(path);

  const step = new Mesh(new BoxGeometry(DOOR_W + 0.7, 0.08, 0.55), mat(COLORS.paper, 0, [0.03, 0.12]));
  step.position.set(0, 0.04, Z + 0.25);
  group.add(step);

  /* ---- door frame + double doors with stickers ---- */
  const frameMat = () => mat(COLORS.ochre, 0.3, [0.12, 0.03]);
  const jambL = new Mesh(new BoxGeometry(0.14, DOOR_H + 0.14, 0.32), frameMat());
  jambL.position.set(-DOOR_W / 2 - 0.07, (DOOR_H + 0.14) / 2, Z);
  const jambR = jambL.clone();
  jambR.material = frameMat();
  jambR.position.x *= -1;
  const lintel = new Mesh(new BoxGeometry(DOOR_W + 0.42, 0.16, 0.32), mat(COLORS.ochre, 0.3, [0.03, 0.1]));
  lintel.position.set(0, DOOR_H + 0.08, Z);
  group.add(jambL, jambR, lintel);

  const doorPaint: SketchMaterial[] = [];
  const leafW = DOOR_W / 2;
  const makeLeaf = (side: -1 | 1, stickers: StickerDef[]) => {
    const pivot = new Group();
    pivot.position.set(side * leafW, 0, Z);
    const dir = -side; // leaf extends from its hinge towards the centre
    const leafMat = sketchMaterial({ tint: COLORS.paper, edge: edgeFor(leafW, DOOR_H, 0.03), paintColor: COLORS.ochre });
    const leaf = new Mesh(new BoxGeometry(leafW, DOOR_H, 0.07), leafMat);
    leaf.position.set((dir * leafW) / 2, DOOR_H / 2, 0);
    const panelMat = sketchMaterial({ tint: COLORS.paper, edge: [0.07, 0.05], paintColor: COLORS.ochre });
    for (const py of [0.95, 2.35]) {
      const p = new Mesh(new PlaneGeometry(leafW * 0.72, 1.15), panelMat);
      p.position.set((dir * leafW) / 2, py, 0.037);
      pivot.add(p);
    }
    const handle = new Mesh(new BoxGeometry(0.05, 0.22, 0.06), mat(COLORS.ink, 0.85, [0, 0]));
    handle.position.set(dir * (leafW - 0.12), 1.6, 0.07);
    pivot.add(leaf, handle);
    doorPaint.push(leafMat, panelMat);
    // stickers, loosely scattered over the leaf
    stickers.forEach((def, i) => {
      const { mesh, mat: sm } = sticker(def, 0.46 + ((i * 37) % 5) * 0.018);
      const col = i % 2, row = Math.floor(i / 2);
      mesh.position.set(dir * (0.36 + col * 0.58) + (((i * 13) % 7) - 3) * 0.012, 2.75 - row * 0.78, 0.042 + i * 0.0006);
      mesh.rotation.z = (((i * 29) % 11) - 5) * 0.035;
      pivot.add(mesh);
      doorPaint.push(sm);
    });
    group.add(pivot);
    return pivot;
  };
  const left = makeLeaf(-1, STICKERS.slice(0, 6));
  const right = makeLeaf(1, STICKERS.slice(6));
  for (const d of [left, right, jambL, jambR, lintel]) pick(d, { kind: 'entrance', id: 'door', paint: doorPaint });

  /* ---- hanging sign ---- */
  const sign = new Group();
  const woodMat = () => mat(COLORS.ochre, 0.45, [0.05, 0.05]);
  for (const sx of [-1.6, 1.6]) {
    const arm = new Mesh(new BoxGeometry(0.1, 0.1, 0.8), woodMat());
    arm.position.set(sx, SIGN_Y, Z + 0.4);
    const plate = new Mesh(new BoxGeometry(0.34, 0.3, 0.04), mat(COLORS.ink, 0.8, [0, 0]));
    plate.position.set(sx, SIGN_Y, Z + 0.02);
    sign.add(arm, plate);
  }
  const beam = new Mesh(new BoxGeometry(3.6, 0.14, 0.14), woodMat());
  beam.position.set(0, SIGN_Y, Z + 0.78);
  sign.add(beam);
  const hang = new Group();
  hang.position.set(0, SIGN_Y - 0.07, Z + 0.78);
  for (const cx of [-1.25, 1.25]) {
    const chain = new Mesh(new CylinderGeometry(0.015, 0.015, 0.5, 5), mat(COLORS.ink, 0.85, [0, 0]));
    chain.position.set(cx, -0.25, 0);
    hang.add(chain);
  }
  const board = new Mesh(new BoxGeometry(3.4, 1.05, 0.1), mat(COLORS.ochre, 0.5, [0.03, 0.08]));
  board.position.set(0, -1.0, 0);
  const signTex = canvasTexture(1024, 320, (ctx, w, h) => {
    ctx.font = '800 150px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 10;
    ctx.strokeStyle = INK;
    ctx.fillStyle = '#fdfaf3';
    ctx.strokeText('PORTFOLIO', w / 2, h / 2 - 22);
    ctx.fillText('PORTFOLIO', w / 2, h / 2 - 22);
    handText(ctx, 'Mohamed Ahmed · Full-Stack Engineer', w / 2, h - 46, 56, TERRA);
  });
  const signFace = new Mesh(new PlaneGeometry(3.2, 0.95), sketchMaterial({ map: signTex, edge: [0, 0], paintColor: COLORS.ochre }));
  signFace.position.set(0, -1.0, 0.052);
  hang.add(board, signFace);
  sign.add(hang);
  group.add(sign);
  pick(sign, { kind: 'prop', id: 'sign', paint: [board.material as SketchMaterial, signFace.material as SketchMaterial] });

  /* ---- window + the avatar peeking out ---- */
  const win = new Group();
  const wm = () => mat(COLORS.ochre, 0.35, [0.1, 0.05]);
  const ww = WIN.x1 - WIN.x0, wh = WIN.y1 - WIN.y0, wcx = (WIN.x0 + WIN.x1) / 2, wcy = (WIN.y0 + WIN.y1) / 2;
  for (const [w, h, x, y] of [
    [ww + 0.24, 0.12, wcx, WIN.y1 + 0.06], [ww + 0.24, 0.12, wcx, WIN.y0 - 0.06],
    [0.12, wh, WIN.x0 - 0.06, wcy], [0.12, wh, WIN.x1 + 0.06, wcy],
    [0.05, wh, wcx, wcy], [ww, 0.05, wcx, wcy],
  ] as Array<[number, number, number, number]>) {
    const b = new Mesh(new BoxGeometry(w, h, 0.16), wm());
    b.position.set(x, y, Z + 0.04);
    win.add(b);
  }
  const sill = new Mesh(new BoxGeometry(ww + 0.5, 0.08, 0.32), wm());
  sill.position.set(wcx, WIN.y0 - 0.14, Z + 0.14);
  win.add(sill);
  const inside = new Mesh(new PlaneGeometry(ww + 1.2, wh + 1.6), mat(COLORS.ochre, 0.12, [0, 0]));
  inside.position.set(wcx, wcy, Z - 0.75);
  win.add(inside);
  group.add(win);

  const peeker: Avatar = createAvatar({ id: 'window', sketch: avatarTex.sketch, painted: avatarTex.painted, position: [wcx - 0.15, -1.3, Z - 0.35], reducedMotion, greetDistance: 0 });
  group.add(peeker.group);
  const winPaint = [...(win.children as Mesh[]).map((m) => m.material as SketchMaterial), peeker.mesh.material as unknown as SketchMaterial];
  pick(win, { kind: 'window', id: 'window', paint: winPaint });
  pick(peeker.group, { kind: 'window', id: 'window', paint: winPaint });
  let peekTimer: gsap.core.Tween | null = null;
  const peek = (up: boolean) => {
    peekTimer?.kill();
    const go = () =>
      gsap.to(peeker.group.position, {
        y: up ? 0.45 : -1.3,
        duration: reducedMotion ? 0 : up ? 0.45 : 0.5,
        ease: up ? 'back.out(1.6)' : 'power2.in',
        overwrite: true,
        onUpdate: () => peeker.group.updateMatrixWorld(true),
        onComplete: () => up && peeker.wave(),
      });
    if (up) go();
    else peekTimer = gsap.delayedCall(0.7, go) as unknown as gsap.core.Tween;
  };

  /* ---- tree with a hanging computer mouse ---- */
  const tree = new Group();
  tree.position.set(-5.0, 0, Z + 1.6);
  const bark = () => mat(COLORS.ochre, 0.22, [0, 0]);
  const trunk = new Mesh(new CylinderGeometry(0.2, 0.36, 4.0, 9), bark());
  trunk.position.y = 2.0;
  tree.add(trunk);
  for (const [len, rz, ry, y] of [[2.1, -1.0, 0.3, 3.4], [1.8, 0.9, -0.4, 3.9], [1.5, -0.3, 1.2, 4.3], [1.6, 0.5, 2.4, 3.2]] as Array<[number, number, number, number]>) {
    const br = new Mesh(new CylinderGeometry(0.06, 0.13, len, 6), bark());
    br.geometry.translate(0, len / 2, 0);
    br.position.y = y;
    br.rotation.set(0, ry, rz);
    tree.add(br);
  }
  // the long branch the mouse hangs from
  const longBranch = new Mesh(new CylinderGeometry(0.05, 0.12, 2.2, 6), bark());
  longBranch.geometry.translate(0, 1.1, 0);
  longBranch.position.set(0, 3.1, 0);
  longBranch.rotation.z = -1.2;
  tree.add(longBranch);
  for (const [x, y, z, r] of [[-1.0, 4.6, 0, 1.3], [0.5, 5.0, -0.3, 1.2], [1.7, 4.4, 0.2, 0.95], [-0.2, 5.8, 0, 1.0], [-2.0, 4.0, 0.3, 1.0], [1.1, 5.7, 0.4, 0.8]]) {
    const leaves = new Mesh(new IcosahedronGeometry(r, 1), mat(COLORS.sage, 0.28, [0, 0], COLORS.sage));
    leaves.position.set(x, y, z);
    leaves.scale.set(1.15, 0.82, 0.9);
    tree.add(leaves);
  }
  group.add(tree);
  pick(tree, { kind: 'prop', id: 'tree', paint: tree.children.map((m) => (m as Mesh).material as SketchMaterial) });

  const swing = new Group();
  // end of the long branch, in entrance space
  swing.position.set(tree.position.x + Math.sin(1.2) * 2.05, 3.1 + Math.cos(1.2) * 2.05, tree.position.z);
  const CABLE = 1.7;
  const cable = new Mesh(new CylinderGeometry(0.012, 0.012, CABLE, 5), mat(COLORS.ink, 0.85, [0, 0]));
  cable.position.y = -CABLE / 2;
  const mouseBody = new Mesh(new SphereGeometry(0.2, 14, 10), mat(COLORS.paper, 0, [0, 0], COLORS.terracotta));
  mouseBody.scale.set(1, 1.5, 0.62);
  mouseBody.position.y = -CABLE - 0.27;
  const wheel = new Mesh(new CylinderGeometry(0.035, 0.035, 0.03, 10), mat(COLORS.ink, 0.85, [0, 0]));
  wheel.rotation.z = Math.PI / 2;
  wheel.position.set(0, -CABLE - 0.1, 0.11);
  const split = new Mesh(new BoxGeometry(0.008, 0.2, 0.01), mat(COLORS.ink, 0.85, [0, 0]));
  split.position.set(0, -CABLE - 0.12, 0.125);
  swing.add(cable, mouseBody, wheel, split);
  group.add(swing);
  pick(swing, { kind: 'prop', id: 'mouse', paint: [mouseBody.material as SketchMaterial] });
  const pend = { a: 0.05, v: 0, b: 0, vb: 0 };

  /* ---- cat ---- */
  const catMat = avatarMaterial(catSketch, catPaint, 2);
  const CAT = 0.8;
  const catGeo = new PlaneGeometry(CAT, CAT);
  catGeo.translate((0.5 - 230 / 512) * CAT, CAT / 2 - (1 - 500 / 512) * CAT, 0);
  const cat = new Mesh(catGeo, catMat);
  const catGroup = new Group();
  catGroup.position.set(-2.05, 0, Z + 0.6);
  catGroup.add(cat);
  group.add(catGroup);
  pick(catGroup, { kind: 'prop', id: 'cat', paint: [catMat as unknown as SketchMaterial] });
  let catFrame = 0, catHold = 0, catNext = 2 + Math.random() * 3, catQueue: Array<[number, number]> = [];

  /* ---- planter with succulents + rubber duck ---- */
  const planter = new Group();
  planter.position.set(wcx, 0, Z + 0.38);
  const box = new Mesh(new BoxGeometry(2.7, 0.5, 0.52), mat(COLORS.ochre, 0.4, [0.04, 0.1]));
  box.position.y = 0.25;
  const soil = new Mesh(new BoxGeometry(2.6, 0.02, 0.44), mat(COLORS.ink, 0.6, [0, 0]));
  soil.position.y = 0.5;
  planter.add(box, soil);
  for (let i = 0; i < 7; i++) {
    const x = -1.1 + i * 0.36;
    if (i === 5) continue; // the duck's spot
    if (i % 3 === 0) {
      for (let k = 0; k < 6; k++) {
        const leaf = new Mesh(new ConeGeometry(0.035, 0.42, 4), mat(COLORS.sage, 0.6, [0, 0], COLORS.sage));
        const a = (k / 6) * Math.PI * 2;
        leaf.position.set(x + Math.sin(a) * 0.04, 0.68, Math.cos(a) * 0.04);
        leaf.rotation.set(Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5);
        planter.add(leaf);
      }
    } else if (i % 3 === 1) {
      const s = new Mesh(new IcosahedronGeometry(0.15, 0), mat(COLORS.sage, 0.55, [0, 0], COLORS.sage));
      s.position.set(x, 0.6, 0);
      s.scale.set(1, 0.65, 1);
      planter.add(s);
    } else {
      const c = new Mesh(new CylinderGeometry(0.07, 0.08, 0.42, 8), mat(COLORS.sage, 0.6, [0, 0], COLORS.sage));
      c.position.set(x, 0.72, 0);
      planter.add(c);
    }
  }
  const duckMat = mat(COLORS.ochre, 0.85, [0, 0]);
  const duckBody = new Mesh(new SphereGeometry(0.14, 12, 8), duckMat);
  duckBody.scale.set(1.3, 0.9, 1);
  duckBody.position.set(0.72, 0.64, 0.02);
  const duckHead = new Mesh(new SphereGeometry(0.085, 10, 8), duckMat);
  duckHead.position.set(0.8, 0.82, 0.04);
  const beak = new Mesh(new ConeGeometry(0.035, 0.09, 6), mat(COLORS.terracotta, 0.85, [0, 0]));
  beak.rotation.z = -Math.PI / 2;
  beak.position.set(0.9, 0.81, 0.05);
  planter.add(duckBody, duckHead, beak);
  group.add(planter);
  pick(planter, { kind: 'prop', id: 'planter', paint: planter.children.map((m) => (m as Mesh).material as SketchMaterial) });

  /* ---- ladybug ---- */
  const bug = new Group();
  const shell = new Mesh(new SphereGeometry(0.075, 12, 8), mat(COLORS.terracotta, 0.9, [0, 0]));
  shell.scale.set(1, 1.15, 0.45);
  const head = new Mesh(new SphereGeometry(0.035, 8, 6), mat(COLORS.ink, 0.9, [0, 0]));
  head.position.y = 0.085;
  bug.add(shell, head);
  for (const [x, y] of [[-0.03, 0.02], [0.03, -0.02], [-0.025, -0.04], [0.03, 0.035]]) {
    const dot = new Mesh(new SphereGeometry(0.014, 6, 4), mat(COLORS.ink, 0.95, [0, 0]));
    dot.position.set(x, y, 0.03);
    bug.add(dot);
  }
  bug.position.set(2.3, 4.0, Z + 0.03);
  group.add(bug);
  pick(bug, { kind: 'prop', id: 'ladybug', paint: [shell.material as SketchMaterial] });
  const scurry = () => {
    const to = new Vector3(1.9 + Math.random() * 3.2, 3.5 + Math.random() * 1.2, bug.position.z);
    const ang = Math.atan2(to.y - bug.position.y, to.x - bug.position.x) - Math.PI / 2;
    gsap.to(bug.rotation, { z: ang, duration: reducedMotion ? 0 : 0.2 });
    gsap.to(bug.position, {
      x: to.x, y: to.y, duration: reducedMotion ? 0 : 1.1, ease: 'power1.inOut', delay: reducedMotion ? 0 : 0.15,
      onUpdate: () => bug.updateMatrixWorld(true),
    });
  };

  group.updateMatrixWorld(true);
  trackSketches(group, 0.6); // starts mostly drawn: it's the first thing you see

  const entrance: Entrance = {
    group,
    pickables,
    doors: { left, right },
    setDoorsOpen(open, reduced, pace = 1) {
      gsap.to(left.rotation, { y: open ? 1.35 : 0, duration: reduced ? 0 : (open ? 1.0 : 0.8) / pace, ease: 'power2.inOut', onUpdate: () => left.updateMatrixWorld(true) });
      gsap.to(right.rotation, { y: open ? -1.35 : 0, duration: reduced ? 0 : (open ? 1.0 : 0.8) / pace, ease: 'power2.inOut', delay: reduced ? 0 : 0.06 / pace, onUpdate: () => right.updateMatrixWorld(true) });
    },
    hover(info, on) {
      if (info.kind === 'window') peek(on);
      if (!on) return;
      if (info.id === 'mouse') pend.v += (Math.random() < 0.5 ? -1 : 1) * 1.4;
      if (info.id === 'cat') catQueue = [[3, 0.35], [0, 0.3], [3, 0.35], [1, 1.2], [2, 0.18]];
      if (info.id === 'ladybug') scurry();
    },
    update(dt, camera) {
      let changed = peeker.update(dt, camera);
      // mouse pendulum (damped), swinging mostly sideways with a little front/back
      if (!reducedMotion && (Math.abs(pend.a) > 0.002 || Math.abs(pend.v) > 0.002 || Math.abs(pend.b) > 0.002)) {
        pend.v += (-9.8 / 2.6) * Math.sin(pend.a) * dt - pend.v * 0.55 * dt;
        pend.a += pend.v * dt;
        pend.vb += (-9.8 / 2.6) * Math.sin(pend.b) * dt - pend.vb * 0.7 * dt + pend.v * 0.05 * dt;
        pend.b += pend.vb * dt;
        swing.rotation.set(pend.b, 0, pend.a);
        swing.updateMatrixWorld(true);
        changed = true;
      }
      // cat: idle with the occasional blink / tail flick; hover plays a little routine
      if (!reducedMotion) {
        catHold -= dt;
        catNext -= dt;
        if (catHold <= 0) {
          let next = 0;
          if (catQueue.length) {
            const [f, d] = catQueue.shift()!;
            next = f;
            catHold = d;
          } else if (catNext <= 0) {
            const r = Math.random();
            next = r < 0.5 ? 2 : r < 0.8 ? 1 : 3;
            catHold = next === 2 ? 0.16 : 1.4;
            catNext = 2.5 + Math.random() * 3.5;
          } else catHold = 0.1;
          if (next !== catFrame) {
            catFrame = next;
            (catMat.uniforms.uFrame as { value: number }).value = next;
            changed = true;
          }
        }
        // cat looks at you
        const yaw = Math.atan2(camera.position.x - catGroup.position.x, camera.position.z - catGroup.position.z);
        if (Math.abs(yaw - catGroup.rotation.y) > 1e-3) {
          catGroup.rotation.y += (yaw - catGroup.rotation.y) * (1 - Math.exp(-dt * 6));
          catGroup.updateMatrixWorld(true);
          changed = true;
        }
      }
      return changed;
    },
  };
  return entrance;
}
