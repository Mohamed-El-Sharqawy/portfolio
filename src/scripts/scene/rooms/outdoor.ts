import { CylinderGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, PlaneGeometry, RepeatWrapping, type Texture } from 'three';
import { avatarMaterial, sketchMaterial } from '../materials';
import { COLORS, DOOR } from '../config';
import { canvasTexture, INK } from '../sketch-canvas';
import { rng } from '../texgen';

/**
 * Helpers for the open-air rooms (rooftop gallery, skills sky). Everything is
 * in door-local space: x across the doorway, y up, -z away from the corridor.
 * Big backdrops only ever face the room, and main.ts hides them unless the
 * camera is in (or looking into) that room, so they never show up elsewhere.
 */

/** Opaque, unlit material for a drawn texture (sky, distant city). */
export const flat = (map: Texture) => new MeshBasicMaterial({ map, side: DoubleSide });

/** Cut-out sprite material (alpha-tested) with optional painted version for hover. */
export const cutout = (sketch: Texture, painted: Texture = sketch) => avatarMaterial(sketch, painted, 1);

/** Partial cylinder around (0, y, cz), facing inward, covering ±arc around -z. */
export function skyDome(map: Texture, radius: number, height: number, y: number, cz: number, arc = (170 * Math.PI) / 180) {
  // CylinderGeometry thetaStart is measured from +z toward +x; -z is θ = π.
  const geo = new CylinderGeometry(radius, radius, height, 48, 1, true, Math.PI - arc / 2, arc);
  const dome = new Mesh(geo, flat(map));
  dome.position.set(0, y, cz);
  dome.raycast = () => {};
  dome.renderOrder = -2;
  return dome;
}

/** Soft sky: paper at the horizon, a faint blue wash higher up, a few far clouds. */
export function skyTexture(seed: number, tint = '#dfe9ef') {
  const r = rng(seed);
  // 2048×1024 over a ~90 m × 46 m strip keeps the clouds round, not stretched
  return canvasTexture(2048, 1024, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, tint);
    g.addColorStop(0.55, '#f3f5f4');
    g.addColorStop(1, '#fafafa');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // draw the clouds opaque on their own layer, then fade the whole layer in
    // (fading each puff separately would show the overlaps)
    const layer = document.createElement('canvas');
    layer.width = w;
    layer.height = h;
    const lc = layer.getContext('2d')!;
    for (let i = 0; i < 9; i++) drawCloud(lc, 80 + r() * (w - 160), h * 0.12 + r() * h * 0.3, 34 + r() * 46, r, 2.5, 0.5, false);
    ctx.globalAlpha = 0.5;
    ctx.drawImage(layer, 0, 0);
    ctx.globalAlpha = 1;
  });
}

/** A sketched cumulus cloud: overlapping puffs, one outer pencil line, shaded underside. */
export function drawCloud(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, r: () => number, line = 5, shade = 1, cutBelow = true) {
  const puffs: Array<[number, number, number]> = [];
  const n = 5 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1) - 0.5;
    const rad = size * (0.32 + (1 - Math.abs(t) * 1.4) * 0.28 + r() * 0.08);
    puffs.push([cx + t * size * 1.9, cy - rad * 0.35 + (r() - 0.5) * size * 0.12, rad]);
  }
  const base = cy + size * 0.28;
  ctx.save();
  // outer outline: stroke every puff, then cover the inner arcs with the fill
  ctx.strokeStyle = INK;
  ctx.lineWidth = line * 2;
  for (const [x, y, rad] of puffs) {
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(puffs[0][0] - puffs[0][2] * 0.6, base);
  ctx.lineTo(puffs[n - 1][0] + puffs[n - 1][2] * 0.6, base);
  ctx.stroke();
  ctx.fillStyle = '#fbfbfa';
  for (const [x, y, rad] of puffs) {
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }
  // flat-ish bottom
  ctx.fillRect(puffs[0][0] - puffs[0][2] * 0.6, cy - size * 0.1, puffs[n - 1][0] - puffs[0][0] + puffs[n - 1][2] * 1.2, base - cy + size * 0.1 - line);
  // pencil shading along the underside
  if (shade > 0) {
    ctx.globalAlpha *= 0.35 * shade;
    ctx.strokeStyle = '#8d8a85';
    ctx.lineWidth = Math.max(1.5, line * 0.45);
    for (let x = puffs[0][0] - puffs[0][2] * 0.4; x < puffs[n - 1][0] + puffs[n - 1][2] * 0.4; x += line * 2.6) {
      ctx.beginPath();
      ctx.moveTo(x, base - size * 0.18);
      ctx.lineTo(x + size * 0.12, base - line);
      ctx.stroke();
    }
  }
  ctx.restore();
  // sprites: keep anything under the flat bottom transparent
  if (cutBelow) ctx.clearRect(cx - size * 3, base + line, size * 6, size * 2);
}

/** A single cloud as a transparent sprite texture (w:h = 2:1). */
export function cloudTexture(seed: number) {
  const r = rng(seed);
  return canvasTexture(512, 256, (ctx, w, h) => drawCloud(ctx, w / 2, h * 0.56, h * 0.42, r, 5));
}

export function cloudSprite(tex: Texture, width: number) {
  const m = new Mesh(new PlaneGeometry(width, width / 2), cutout(tex));
  m.raycast = () => {};
  return m;
}

/** Sketched wooden planks (tileable along x). */
export function plankTexture(seed: number, herringbone = false) {
  const r = rng(seed);
  const tex = canvasTexture(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#efe4d2';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = INK;
    if (herringbone) {
      const L = 256, T = 64;
      ctx.lineWidth = 3;
      for (let row = -2; row < 18; row++) {
        for (let col = -2; col < 10; col++) {
          const x = col * T * 2 + (row % 2) * T, y = row * T;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(Math.PI / 4 * (col % 2 ? 1 : -1));
          ctx.globalAlpha = 0.8;
          ctx.strokeRect(0, 0, L, T);
          ctx.globalAlpha = 0.18;
          ctx.lineWidth = 1.5;
          for (let k = 0; k < 3; k++) {
            const yy = 12 + r() * (T - 24);
            ctx.beginPath();
            ctx.moveTo(10, yy);
            ctx.bezierCurveTo(L * 0.3, yy + (r() - 0.5) * 10, L * 0.6, yy + (r() - 0.5) * 10, L - 10, yy);
            ctx.stroke();
          }
          ctx.lineWidth = 3;
          ctx.restore();
        }
      }
    } else {
      const rows = 8;
      for (let i = 0; i < rows; i++) {
        const y = (i * h) / rows;
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, y + (r() - 0.5) * 3);
        ctx.lineTo(w, y + (r() - 0.5) * 3);
        ctx.stroke();
        // board joints
        for (let x = r() * 300; x < w; x += 300 + r() * 260) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + (r() - 0.5) * 4, y + h / rows);
          ctx.stroke();
        }
        // grain
        ctx.globalAlpha = 0.2;
        ctx.lineWidth = 1.6;
        for (let k = 0; k < 4; k++) {
          const yy = y + 14 + r() * (h / rows - 28);
          ctx.beginPath();
          ctx.moveTo(0, yy);
          for (let x = 0; x <= w; x += 128) ctx.lineTo(x, yy + Math.sin(x * 0.01 + k) * 4 + (r() - 0.5) * 3);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
  });
  tex.wrapS = tex.wrapT = RepeatWrapping;
  return tex;
}

/**
 * The building's outer wall behind an open-air room, with a hole for the
 * doorway so you can still see the corridor through it. Sits just on the
 * room side of the door frame (the frame is 0.22 m deep).
 */
export function wallWithDoorway(width: number, height: number, bottom: number) {
  const g = new Group();
  const hw = DOOR.width / 2 + 0.22; // opening half-width (door + frame)
  const top = DOOR.height + 0.16; // opening height (door + lintel)
  const mat = sketchMaterial({ tint: COLORS.paper, edge: [0, 0] });
  const side = (width - hw * 2) / 2;
  const piece = (w: number, h: number, x: number, y: number) => {
    const m = new Mesh(new PlaneGeometry(w, h), mat);
    m.position.set(x, y, -0.13);
    m.rotation.y = Math.PI; // faces into the room
    m.raycast = () => {};
    g.add(m);
  };
  const h = height;
  piece(side, h, -(hw + side / 2), bottom + h / 2);
  piece(side, h, hw + side / 2, bottom + h / 2);
  piece(hw * 2, bottom + h - top, 0, (top + bottom + h) / 2);
  return g;
}
