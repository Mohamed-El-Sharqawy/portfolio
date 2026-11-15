import { BoxGeometry, ConeGeometry, Group, Mesh, PlaneGeometry, SphereGeometry, type Object3D } from 'three';
import { COLORS, CORRIDOR, DOOR, DOOR_LAYOUT } from './config';
import { edgeFor, sketchify, sketchMaterial, trackSketches, type SketchMaterial } from './materials';
import { canvasTexture, handText, roughLine, scribbleUnderline, bodyText, wash, TERRA, OCHRE } from './sketch-canvas';
import type { Assets } from './assets';
import { profile } from '../../data/profile';

export interface Interactive {
  kind: 'door' | 'project' | 'skill' | 'poster' | 'easel' | 'board' | 'letter' | 'card' | 'avatar' | 'prop' | 'entrance' | 'window';
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
 * beams, hanging lamps, the About easel at the entrance and the FAQ board
 * at the far end.
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

  // FAQ board on the end wall.
  const boardTex = canvasTexture(1024, 640, (ctx, w, h) => {
    wash(ctx, 40, 40, w - 80, h - 80, OCHRE, 0.18);
    handText(ctx, 'FAQ', w / 2, 190, 210);
    scribbleUnderline(ctx, w / 2 - 170, w / 2 + 170, 300, TERRA, 9);
    handText(ctx, 'questions & answers', w / 2, 400, 86, TERRA);
    bodyText(ctx, 'click the board, or keep scrolling', w / 2, 530, 34, '#5a5652');
    roughLine(ctx, 60, 60, w - 60, 66);
    roughLine(ctx, 60, h - 60, w - 60, h - 64);
  });
  const boardMat = sketchMaterial({ map: boardTex, edge: edgeFor(3, 1.9, 0.04), paintColor: COLORS.ochre });
  const board = plane(3, 1.9, boardMat);
  board.position.set(0, 1.75, end + 0.045);
  const boardFrame = new Mesh(new BoxGeometry(3.2, 2.1, 0.05), sketchMaterial({ tint: COLORS.terracotta, tintAmount: 0.55, edge: [0.03, 0.04] }));
  boardFrame.position.set(0, 1.75, end + 0.0);
  group.add(boardFrame, board);
  tagInteractive(board, { kind: 'board', id: 'faq', paint: [boardMat] });
  interactives.push(board);

  trackSketches(group);
  return { group, interactives };
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
