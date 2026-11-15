import { BoxGeometry, Group, Mesh, PlaneGeometry, SphereGeometry, Vector3, type Camera } from 'three';
import { avatarMaterial } from './materials';
import type { Assets } from './assets';
import { BADGE_GRID, DOOR_BADGES } from '../../data/skills';
import { COLORS, DOOR, DOOR_LAYOUT, CORRIDOR } from './config';
import { edgeFor, outlineMaterial, sketchMaterial, trackSketches, type OutlineMaterial, type SketchMaterial } from './materials';
import { canvasTexture } from './sketch-canvas';
import type { CanvasTexture } from 'three';
import { tagInteractive } from './corridor';
import type { DoorId } from '../../data/profile';

export interface Door {
  id: DoorId;
  label: string;
  /** Door frame: origin on the wall plane, local +z points into the corridor, -z into the room. */
  group: Group;
  pivot: Group;
  glow: OutlineMaterial;
  paint: SketchMaterial[];
  /** Everything that turns toward you (frame, leaf, sign, arrows, glow). */
  facade: Group;
  /** 1 = forced flat against the wall (while going in / out of the room). */
  state: { flat: number };
  /** Turn toward the camera as it approaches. Returns true if anything moved. */
  update(camera: Camera, time: number): boolean;
  hitMeshes: Mesh[];
  /** World-space helpers. */
  local(x: number, y: number, z: number): Vector3;
}

const tmp = new Vector3();
const MAX_TURN = (58 * Math.PI) / 180;
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

let arrowCache: CanvasTexture | null = null;
/** A quick pencil arrow (curved shaft + open head), ink on transparent. */
function arrowTex() {
  arrowCache ??= canvasTexture(512, 256, (ctx, w, h) => {
    ctx.strokeStyle = '#2b2b2b';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const [lw, dy] of [[9, 0], [4, 3]] as const) {
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(40, 70 + dy);
      ctx.bezierCurveTo(170, 40 + dy, 330, 70 + dy, 440, 170 + dy);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(380, 172 + dy);
      ctx.lineTo(446, 176 + dy);
      ctx.lineTo(436, 110 + dy);
      ctx.stroke();
    }
  });
  return arrowCache;
}

/** Three wooden boards, grain, four screws, carved capitals. */
function plankSign(ctx: CanvasRenderingContext2D, w: number, h: number, text: string, seed: number) {
  let s = seed * 9301 + 49297;
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const pad = 14;
  ctx.fillStyle = '#f1e4cd';
  ctx.fillRect(pad, pad, w - pad * 2, h - pad * 2);
  ctx.strokeStyle = '#2b2b2b';
  // boards
  const boards = 3;
  for (let b = 0; b < boards; b++) {
    const y0 = pad + ((h - pad * 2) * b) / boards, y1 = pad + ((h - pad * 2) * (b + 1)) / boards;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 2;
    for (let k = 0; k < 4; k++) {
      const yy = y0 + 12 + r() * (y1 - y0 - 24);
      ctx.beginPath();
      ctx.moveTo(pad + 20, yy);
      for (let x = pad + 20; x < w - pad - 20; x += 60) ctx.lineTo(x, yy + Math.sin(x * 0.02 + k * 2 + b) * 3);
      ctx.stroke();
    }
    // a knot
    ctx.beginPath();
    ctx.ellipse(pad + 80 + r() * (w - 260), (y0 + y1) / 2, 16, 7, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    if (b) {
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(pad, y0 + (r() - 0.5) * 3);
      ctx.lineTo(w - pad, y0 + (r() - 0.5) * 3);
      ctx.stroke();
    }
  }
  // outline (double pencil pass)
  ctx.lineWidth = 7;
  ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
  ctx.lineWidth = 2.5;
  ctx.globalAlpha = 0.5;
  ctx.strokeRect(pad + 5, pad + 3, w - pad * 2 - 6, h - pad * 2 - 4);
  ctx.globalAlpha = 1;
  // screws
  for (const [x, y] of [[pad + 34, pad + 34], [w - pad - 34, pad + 34], [pad + 34, h - pad - 34], [w - pad - 34, h - pad - 34]]) {
    ctx.fillStyle = '#e6e2dc';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    const a = r() * Math.PI;
    ctx.beginPath();
    ctx.moveTo(x - Math.cos(a) * 10, y - Math.sin(a) * 10);
    ctx.lineTo(x + Math.cos(a) * 10, y + Math.sin(a) * 10);
    ctx.stroke();
  }
  // carved block capitals: a pale cut edge below, dark letters, pencil outline
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const size = Math.min(150, (w - 190) / (text.length * 0.74));
  ctx.font = `800 ${size}px Inter, system-ui, sans-serif`;
  if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${Math.round(size * 0.04)}px`;
  const x = w / 2, y = h / 2 + 4;
  ctx.lineJoin = 'round';
  ctx.fillStyle = '#fffaf0';
  ctx.fillText(text, x + 3, y + 4);
  ctx.fillStyle = '#4a4037';
  ctx.fillText(text, x, y);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#2b2b2b';
  ctx.strokeText(text, x, y);
}

/** Doors with plank signs that turn toward you as you approach, plus a glow outline for hover/focus. */
export function createDoors(labels: ReadonlyArray<{ id: DoorId; label: string }>) {
  const doors: Door[] = [];
  const DW = DOOR.width;
  const DH = DOOR.height;

  for (const { id, label } of labels) {
    const state = { flat: 0 };
    const layout = DOOR_LAYOUT[id];
    const group = new Group();
    group.name = `door-${id}`;
    group.position.set((layout.side * CORRIDOR.width) / 2, 0, layout.z);
    group.rotation.y = layout.side < 0 ? Math.PI / 2 : -Math.PI / 2;

    const frameMat = () => sketchMaterial({ tint: COLORS.ochre, tintAmount: 0.5, edge: [0.12, 0.03] });
    const jambL = new Mesh(new BoxGeometry(0.12, DH + 0.12, 0.22), frameMat());
    jambL.position.set(-DW / 2 - 0.06, (DH + 0.12) / 2, 0);
    const jambR = jambL.clone();
    jambR.material = frameMat();
    jambR.position.x = DW / 2 + 0.06;
    const lintel = new Mesh(new BoxGeometry(DW + 0.36, 0.12, 0.22), sketchMaterial({ tint: COLORS.ochre, tintAmount: 0.5, edge: [0.03, 0.12] }));
    lintel.position.set(0, DH + 0.06, 0);

    // Leaf on a hinge pivot (opens into the room, -z).
    const pivot = new Group();
    pivot.position.set(-DW / 2, 0, 0);
    const leafMat = sketchMaterial({ tint: COLORS.terracotta, tintAmount: 0.18, edge: edgeFor(DW, DH, 0.035), paintColor: COLORS.terracotta });
    const leaf = new Mesh(new BoxGeometry(DW, DH, 0.06), leafMat);
    leaf.position.set(DW / 2, DH / 2, 0);
    // recessed panels on the corridor side
    const panelMat = sketchMaterial({ tint: COLORS.terracotta, tintAmount: 0.1, edge: [0.06, 0.04], paintColor: COLORS.ochre });
    for (const py of [0.62, 1.68]) {
      const p = new Mesh(new PlaneGeometry(DW * 0.7, 0.75), panelMat);
      p.position.set(DW / 2, py, 0.032);
      pivot.add(p);
    }
    const knob = new Mesh(new SphereGeometry(0.045, 10, 8), sketchMaterial({ tint: COLORS.ochre, tintAmount: 0.85, edge: [0, 0] }));
    knob.position.set(DW - 0.14, 1.05, 0.06);
    pivot.add(leaf, knob);

    // Wooden plank sign with screws and carved capitals, hung a little crooked.
    const signTex = canvasTexture(1024, 384, (ctx, w, h) => plankSign(ctx, w, h, label.toUpperCase(), id.length));
    const SW = 1.75, SH = 0.66;
    const signMat = sketchMaterial({ map: signTex, edge: [0, 0], paintColor: COLORS.ochre, hatchScale: 0.3 });
    const sign = new Mesh(new PlaneGeometry(SW, SH), signMat);
    sign.position.set(0, DH + 0.52, 0.05);
    sign.rotation.z = (id.length % 2 ? 1 : -1) * 0.045;

    // Glow outline (hover / keyboard focus).
    const gw = DW + 0.55;
    const gh = DH + 0.32;
    const glow = outlineMaterial(gw, gh, 0.1);
    const glowMesh = new Mesh(new PlaneGeometry(gw, gh), glow);
    glowMesh.position.set(0, gh / 2, 0.13);
    glowMesh.renderOrder = 10;
    glowMesh.raycast = () => {};

    // hand-drawn arrows pointing at the door (they show up as you get close)
    const arrows: Mesh[] = [];
    for (const side of [-1, 1]) {
      const a = new Mesh(new PlaneGeometry(0.9, 0.45), avatarMaterial(arrowTex(), arrowTex(), 1));
      a.position.set(side * (DW / 2 + 0.72), 1.3 + side * 0.12, 0.03);
      a.scale.set(-side, 1, 1); // both point inward
      a.rotation.z = side * 0.18;
      a.raycast = () => {};
      a.visible = false;
      a.userData.base = a.position.clone();
      arrows.push(a);
    }

    // the facade turns toward you; the patch hides the hole in the wall behind it
    const facade = new Group();
    facade.add(jambL, jambR, lintel, pivot, sign, glowMesh, ...arrows);
    const patch = new Mesh(new PlaneGeometry(DW + 0.4, DH + 0.2), sketchMaterial({ tint: COLORS.paper, edge: [0, 0] }));
    patch.position.set(0, (DH + 0.2) / 2, -0.03);
    patch.raycast = () => {};
    patch.visible = false;
    group.add(facade, patch);
    const paint = [leafMat, panelMat, signMat];
    tagInteractive(facade, { kind: 'door', id, paint });
    group.userData.interactive = facade.userData.interactive;

    group.updateMatrixWorld(true);
    trackSketches(group, 0.22);

    doors.push({
      id,
      label,
      group,
      pivot,
      glow,
      paint,
      facade,
      state,
      update(camera, time) {
        // camera in the door's own space: x along the wall, z out into the corridor
        const c = group.worldToLocal(tmp.copy(camera.position));
        const along = Math.abs(c.x);
        const near = 1 - smooth(5, 15, along); // 0 far away → 1 close
        let theta = Math.atan2(c.x, Math.max(0.4, c.z));
        theta = Math.max(-MAX_TURN, Math.min(MAX_TURN, theta)) * near * (1 - state.flat);
        const show = near * (1 - state.flat);
        let changed = false;
        if (Math.abs(theta - facade.rotation.y) > 1e-4 || (theta === 0 && facade.rotation.y !== 0)) {
          // hinge on the edge nearest you, so the far edge swings out of the wall
          const hx = Math.sign(c.x || 1) * (DW / 2 + 0.2);
          facade.rotation.y = theta;
          facade.position.set(hx - hx * Math.cos(theta), 0, hx * Math.sin(theta));
          patch.visible = Math.abs(theta) > 0.01;
          changed = true;
        }
        for (const [i, a] of arrows.entries()) {
          const on = show > 0.35;
          if (a.visible !== on) { a.visible = on; changed = true; }
          if (!on) continue;
          const side = i ? 1 : -1;
          // grow in, then nudge toward the door
          const k = Math.min(1, (show - 0.35) / 0.3);
          const base = a.userData.base as Vector3;
          a.position.set(base.x - side * Math.max(0, Math.sin(time * 4 + i)) * 0.06, base.y, base.z);
          a.scale.set(-side * k, k, 1);
          changed = true;
        }
        if (changed) facade.updateMatrixWorld(true);
        return changed;
      },
      hitMeshes: [leaf, sign, jambL, jambR, lintel],
      local: (x, y, z) => group.localToWorld(new Vector3(x, y, z)),
    });
  }
  return doors;
}

/**
 * The Skills door gets covered in logo stickers (like a laptop lid). They load
 * after you're inside, so the first paint never waits for them; they swing
 * with the leaf and paint in colour along with it on hover.
 */
export async function decorateSkillsDoor(door: Door, assets: Assets) {
  const [sketch, painted] = await Promise.all([
    assets.texture('/textures/skill-badges-sketch.ktx2'),
    assets.texture('/textures/skill-badges-paint.ktx2'),
  ]);
  const DW = DOOR.width;
  const spots: Array<[number, number]> = [];
  const xs = [0.26, 0.7, 1.14];
  const ys = [2.06, 1.6, 1.12, 0.64, 0.24];
  ys.forEach((y, row) => xs.forEach((x, col) => {
    if (col === 2 && row === 2) return; // the handle lives here
    spots.push([x + ((row * 3 + col) % 3 - 1) * 0.035, y + ((col * 5 + row) % 3 - 1) * 0.03]);
  }));
  const info = door.group.userData.interactive;
  spots.slice(0, DOOR_BADGES.length).forEach(([x, y], i) => {
    const mat = avatarMaterial(sketch, painted, BADGE_GRID);
    mat.uniforms.uFrame.value = i;
    const size = 0.3 + ((i * 7) % 4) * 0.018;
    const m = new Mesh(new PlaneGeometry(size, size), mat);
    m.position.set(Math.min(DW - size / 2 - 0.03, Math.max(size / 2 + 0.03, x)), y, 0.042 + i * 0.0004);
    m.rotation.z = (((i * 37) % 9) - 4) * 0.045;
    m.userData.interactive = info;
    door.pivot.add(m);
    door.paint.push(mat as unknown as SketchMaterial);
  });
  door.pivot.updateMatrixWorld(true);
}
