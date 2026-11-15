import { BoxGeometry, ConeGeometry, Group, Mesh, PlaneGeometry, SphereGeometry, type Object3D } from 'three';
import { COLORS, CORRIDOR, DOOR, DOOR_LAYOUT } from './config';
import { edgeFor, sketchify, sketchMaterial, trackSketches, type SketchMaterial } from './materials';
import { canvasTexture, handText, roughLine, scribbleUnderline, bodyText, wash, wrap, TERRA, OCHRE } from './sketch-canvas';
import type { Assets } from './assets';
import { profile } from '../../data/profile';

export interface Interactive {
  /** 'link': id is a URL (mailto:/tel: open in place, anything else in a new tab). */
  kind: 'door' | 'project' | 'skill' | 'poster' | 'easel' | 'board' | 'letter' | 'card' | 'avatar' | 'prop' | 'entrance' | 'window' | 'link';
  id: string;
  paint: SketchMaterial[];
}

export function tagInteractive(obj: Object3D, info: Interactive) {
  obj.traverse((o) => (o.userData.interactive = info));
}

function plane(w: number, h: number, mat: SketchMaterial) {
  return new Mesh(new PlaneGeometry(w, h), mat);
}

/**
 * The corridor: tiled floor and ceiling, walls with door openings, ceiling
 * beams, hanging lamps, the About easel and bio board at the entrance, and
 * the FAQ board at the far end (one question at a time; click for the next).
 */
export function createCorridor() {
  const group = new Group();
  group.name = 'corridor';
  const { width: W, height: H, start, end } = CORRIDOR;
  const half = W / 2;
  const interactives: Object3D[] = [];

  // Floor + ceiling tiles (tile borders become hand-drawn plank lines).
  const TILE = 4;
  for (let z = start; z > end; z -= TILE) {
    const len = Math.min(TILE, z - end);
    const floor = plane(W, len, sketchMaterial({ tint: COLORS.ochre, tintAmount: 0.14, edge: edgeFor(W, len, 0.025) }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, z - len / 2);
    group.add(floor);

    const ceil = plane(W, len, sketchMaterial({ edge: edgeFor(W, len, 0.02) }));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, H, z - len / 2);
    group.add(ceil);

    // beam
    const beam = new Mesh(new BoxGeometry(W, 0.16, 0.22), sketchMaterial({ tint: COLORS.ochre, tintAmount: 0.35, edge: [0.06, 0.1] }));
    beam.position.set(0, H - 0.08, z);
    group.add(beam);
  }

  // Walls, split around the door openings.
  for (const side of [-1, 1] as const) {
    const holes = Object.values(DOOR_LAYOUT)
      .filter((d) => d.side === side)
      .map((d) => d.z)
      .sort((a, b) => b - a);
    let cursor = start;
    const segments: Array<[number, number]> = [];
    for (const hz of holes) {
      segments.push([cursor, hz + DOOR.width / 2]);
      cursor = hz - DOOR.width / 2;
    }
    segments.push([cursor, end]);

    const addWall = (z1: number, z2: number, y1: number, y2: number) => {
      const len = z1 - z2;
      const h = y2 - y1;
      if (len <= 0.01 || h <= 0.01) return;
      const mat = sketchMaterial({ tint: COLORS.paper, edge: edgeFor(len, h, 0.03) });
      mat.side = 2; // DoubleSide: also forms the inner face of the rooms
      const m = plane(len, h, mat);
      m.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
      m.position.set(side * half, y1 + h / 2, (z1 + z2) / 2);
      group.add(m);
    };
    for (const [z1, z2] of segments) addWall(z1, z2, 0, H);
    for (const hz of holes) addWall(hz + DOOR.width / 2, hz - DOOR.width / 2, DOOR.height, H);

    // wainscot rail along each wall segment
    for (const [z1, z2] of segments) {
      const len = z1 - z2;
      const rail = new Mesh(new BoxGeometry(0.04, 0.06, len), sketchMaterial({ tint: COLORS.terracotta, tintAmount: 0.45, edge: [0.2, 0.2] }));
      rail.position.set(side * (half - 0.02), 0.95, (z1 + z2) / 2);
      group.add(rail);
    }
  }

  // End walls.
  const endWall = plane(W, H, sketchMaterial({ edge: edgeFor(W, H, 0.03) }));
  endWall.position.set(0, H / 2, end);
  group.add(endWall);
  // start wall (inside face) with the front-door opening; the outside is entrance.ts
  const ENTRY_W = 2.6, ENTRY_H = 3.2; // must match the entrance door (entrance.ts)
  for (const [x0, x1, y0, y1] of [[-half, -ENTRY_W / 2, 0, H], [ENTRY_W / 2, half, 0, H], [-ENTRY_W / 2, ENTRY_W / 2, ENTRY_H, H]]) {
    const w = x1 - x0, h = y1 - y0;
    const piece = plane(w, h, sketchMaterial({ edge: edgeFor(w, h, 0.03) }));
    piece.rotation.y = Math.PI;
    piece.position.set((x0 + x1) / 2, (y0 + y1) / 2, start - 0.01);
    group.add(piece);
  }

  // Hanging lamps between the doors.
  for (const z of [-3, -12.5, -21.5, -30.5, -42]) {
    const cord = new Mesh(new BoxGeometry(0.015, 0.7, 0.015), sketchMaterial({ tint: COLORS.ink, tintAmount: 0.9, edge: [0, 0] }));
    cord.position.set(0, H - 0.35, z);
    const shade = new Mesh(new ConeGeometry(0.28, 0.3, 9, 1, true), sketchMaterial({ tint: COLORS.terracotta, tintAmount: 0.6, edge: [0, 0] }));
    shade.material.side = 2;
    shade.position.set(0, H - 0.8, z);
    const bulb = new Mesh(new SphereGeometry(0.07, 8, 6), sketchMaterial({ tint: COLORS.ochre, tintAmount: 0.9, edge: [0, 0] }));
    bulb.position.set(0, H - 0.93, z);
    group.add(cord, shade, bulb);
  }

  // Bio board on the right wall, opposite the About easel: who, where, available.
  const bioTex = canvasTexture(1024, 800, (ctx, w, h) => {
    ctx.fillStyle = '#fffdf8';
    ctx.fillRect(0, 0, w, h);
    wash(ctx, 34, 34, w - 68, h - 68, OCHRE, 0.12);
    handText(ctx, `Hi, I'm ${profile.name.split(' ')[0]}`, 70, 100, 92, '#2b2b2b', 'left', w - 140);
    scribbleUnderline(ctx, 70, 520, 160, TERRA, 7);
    ctx.font = '500 31px Inter, system-ui, sans-serif';
    const lines = wrap(ctx, profile.bio, w - 140);
    lines.forEach((l, i) => bodyText(ctx, l, 70, 225 + i * 46, 31, '#2b2b2b', 'left'));
    const y = Math.min(h - 120, 245 + lines.length * 46 + 30);
    handText(ctx, profile.location, 70, y, 54, TERRA, 'left');
    handText(ctx, profile.availability, w - 70, y, 54, '#3f7d4e', 'right');
    roughLine(ctx, 50, 50, w - 50, 54);
    roughLine(ctx, 50, h - 50, w - 50, h - 54);
  });
  const bioMat = sketchMaterial({ map: bioTex, edge: edgeFor(2.0, 1.56, 0.03), paintColor: COLORS.ochre });
  const bio = plane(2.0, 1.56, bioMat);
  bio.rotation.y = -Math.PI / 2; // on the right wall, facing into the corridor
  bio.position.set(half - 0.035, 1.86, 2.8); // clear of the wainscot rail (y 0.95)
  const bioFrame = new Mesh(new BoxGeometry(0.04, 1.72, 2.16), sketchMaterial({ tint: COLORS.ochre, tintAmount: 0.5, edge: [0.04, 0.04] }));
  bioFrame.position.set(half, 1.86, 2.8); // spans x ∈ [half − 0.02, half + 0.02]: behind the board's face
  group.add(bioFrame, bio);
  tagInteractive(bio, { kind: 'card', id: 'bio', paint: [bioMat] });
  interactives.push(bio);

  // FAQ board on the end wall: one question + answer at a time, click for the next.
  const faqs = Array.from(document.querySelectorAll<HTMLDetailsElement>('[data-faq] details')).map((d) => ({
    q: d.querySelector('summary')?.textContent?.trim() ?? '',
    a: d.querySelector('.faq__a, p')?.textContent?.trim() ?? '',
  })).filter((f) => f.q);
  let faqIndex = 0;
  const drawFaq = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, w, h);
    wash(ctx, 40, 40, w - 80, h - 80, OCHRE, 0.18);
    roughLine(ctx, 60, 60, w - 60, 66);
    roughLine(ctx, 60, h - 60, w - 60, h - 64);
    handText(ctx, 'FAQ', 90, 120, 96, '#2b2b2b', 'left');
    if (!faqs.length) {
      handText(ctx, 'questions & answers', w / 2, h / 2, 86, TERRA);
      return;
    }
    handText(ctx, `${faqIndex + 1}/${faqs.length}`, w - 90, 120, 64, TERRA, 'right');
    const { q, a } = faqs[faqIndex];
    ctx.font = '700 58px Caveat, cursive';
    const ql = wrap(ctx, q, w - 180).slice(0, 2);
    ql.forEach((l, i) => handText(ctx, l, 90, 215 + i * 62, 58, TERRA, 'left'));
    const y = 215 + ql.length * 62 + 26;
    // biggest type that fits above "click for next"
    let size = 46;
    let al: string[] = [];
    for (; size > 24; size -= 2) {
      ctx.font = `500 ${size}px Inter, system-ui, sans-serif`;
      al = wrap(ctx, a, w - 180);
      if (y + al.length * size * 1.35 < h - 140) break;
    }
    al.forEach((l, i) => bodyText(ctx, l, 90, y + size * 0.5 + i * size * 1.35, size, '#2b2b2b', 'left'));
    handText(ctx, `${matchMedia('(pointer: coarse)').matches ? 'tap' : 'click'} for next →`, w - 90, h - 100, 46, '#5a5652', 'right');
  };
  const boardTex = canvasTexture(1024, 640, drawFaq);
  const nextFaq = () => {
    if (faqs.length < 2) return;
    faqIndex = (faqIndex + 1) % faqs.length;
    const c = boardTex.image as HTMLCanvasElement;
    drawFaq(c.getContext('2d')!, c.width, c.height);
    boardTex.needsUpdate = true;
  };
  const boardMat = sketchMaterial({ map: boardTex, edge: edgeFor(3, 1.9, 0.04), paintColor: COLORS.ochre });
  const board = plane(3, 1.9, boardMat);
  board.position.set(0, 1.75, end + 0.045);
  const boardFrame = new Mesh(new BoxGeometry(3.2, 2.1, 0.05), sketchMaterial({ tint: COLORS.terracotta, tintAmount: 0.55, edge: [0.03, 0.04] }));
  boardFrame.position.set(0, 1.75, end + 0.0);
  group.add(boardFrame, board);
  tagInteractive(board, { kind: 'board', id: 'faq', paint: [boardMat] });
  interactives.push(board);

  trackSketches(group);
  return { group, interactives, nextFaq };
}

/** The About easel at the entrance (glTF, loaded with the initial assets). */
export async function createEasel(assets: Assets) {
  const easel = await assets.model('/models/easel.glb');
  const tex = canvasTexture(800, 1000, (ctx, w) => {
    handText(ctx, 'About', w / 2, 120, 120, TERRA);
    scribbleUnderline(ctx, w / 2 - 140, w / 2 + 140, 190, OCHRE, 10);
    // doodled portrait
    ctx.strokeStyle = '#2b2b2b';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(w / 2, 420, 120, 145, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w / 2 - 42, 400, 10, 0, Math.PI * 2);
    ctx.arc(w / 2 + 42, 400, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(w / 2, 460, 48, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w / 2 - 125, 360);
    ctx.quadraticCurveTo(w / 2, 220, w / 2 + 125, 360);
    ctx.stroke();
    handText(ctx, profile.name, w / 2, 700, 92);
    handText(ctx, profile.title, w / 2, 800, 64, TERRA);
    bodyText(ctx, `${profile.location} · ${profile.availability}`, w / 2, 885, 30, '#5a5652');
  });
  const parts = sketchify(easel, { canvas: tex });
  easel.position.set(-1.25, 0, 2.4);
  easel.rotation.y = 0.45;
  easel.scale.setScalar(1.05);
  const paint = Object.values(parts).map((m) => m.material as SketchMaterial);
  tagInteractive(easel, { kind: 'easel', id: 'about', paint });
  trackSketches(easel, 0.3);
  return easel;
}
