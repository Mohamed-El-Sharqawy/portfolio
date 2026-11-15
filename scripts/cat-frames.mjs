/**
 * Sitting cat flipbook for the entrance (2×2 atlas, 512×512 cells):
 *   0 tail right, 1 tail curled, 2 tail right + blink, 3 tail mid + ear twitch
 * Pencil version + painted (ginger tabby) version, like the avatar.
 */
import { rng } from '../src/scripts/scene/texgen.ts';

export const CAT_CELL = 512;
export const CAT_GRID = 2;

const INK = '#2b2b2b';
const PAINT = { FUR: '#e9a961', STRIPE: '#c8553d', BELLY: '#fbeee0', NOSE: '#d9786a' };
const SKETCH = { FUR: '#fbfaf8', STRIPE: '#cfcac4', BELLY: '#fdfcfa', NOSE: '#fbfaf8' };

function pen(seed) {
  const r = rng(seed);
  const j = (a) => (r() - 0.5) * 2 * a;
  const curve = (pts, closed = false, amp = 1.3) => {
    const p = pts.map(([x, y]) => [x + j(amp), y + j(amp)]);
    if (closed) p.push(p[0], p[1], p[2]);
    let d = `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = p[i - 1] ?? p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] ?? p2;
      d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return d;
  };
  return { curve };
}
const fill = (d, c) => `<path d="${d}" fill="${c}"/>`;
const line = (d, w = 4.5, o = 1, c = INK) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity="${o}"/>`;
const shape = (p, pts, color, w = 4.5) => fill(p.curve(pts, true, 0.6), color) + line(p.curve(pts, true, 1.2), w) + line(p.curve(pts, true, 2), w * 0.4, 0.4);
const ell = (cx, cy, rx, ry, n = 16) => Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * Math.PI * 2) * rx, cy + Math.sin((i / n) * Math.PI * 2) * ry]);

export function drawCat({ tail = 0, blink = false, ear = false, seed = 1 }, sketch = false) {
  const C = sketch ? SKETCH : PAINT;
  const p = pen(seed);
  let g = '';
  const cx = 230;
  // tail (behind body): tail = 0 right flick, 1 curled round the paws, 0.5 between
  const tails = [
    [[cx + 70, 440], [cx + 140, 420], [cx + 175, 340], [cx + 160, 270], [cx + 190, 230]],
    [[cx + 60, 440], [cx + 120, 452], [cx + 126, 474], [cx + 50, 482], [cx - 50, 478]],
    [[cx + 70, 440], [cx + 150, 430], [cx + 190, 370], [cx + 200, 310], [cx + 230, 290]],
  ];
  const tp = tails[tail];
  g += `<path d="${p.curve(tp, false, 1)}" fill="none" stroke="${INK}" stroke-width="40" stroke-linecap="round"/>`;
  g += `<path d="${p.curve(tp, false, 1)}" fill="none" stroke="${C.FUR}" stroke-width="31" stroke-linecap="round"/>`;
  // body (pear)
  const body = [[cx, 230], [cx + 62, 250], [cx + 96, 330], [cx + 104, 420], [cx + 86, 480], [cx, 496], [cx - 86, 480], [cx - 104, 420], [cx - 96, 330], [cx - 62, 250]];
  g += shape(p, body, C.FUR);
  g += shape(p, [[cx, 300], [cx + 40, 340], [cx + 46, 430], [cx, 470], [cx - 46, 430], [cx - 40, 340]], C.BELLY, 2.5);
  // stripes
  for (const [x, y, s] of [[-80, 360, 1], [-86, 400, 1], [80, 360, -1], [86, 400, -1]])
    g += line(p.curve([[cx + x, y], [cx + x + s * 26, y + 6]]), 5, sketch ? 0.35 : 0.85, C.STRIPE);
  // front legs + paws
  for (const s of [-1, 1]) {
    g += line(p.curve([[cx + s * 28, 360], [cx + s * 30, 480]]), 3.5, 0.8);
    g += shape(p, ell(cx + s * 34, 488, 26, 14, 10), C.FUR, 3.5);
  }
  // head
  const hy = 200;
  const earL = ear ? [[cx - 82, hy - 20], [cx - 96, hy - 118], [cx - 34, hy - 70]] : [[cx - 80, hy - 30], [cx - 80, hy - 120], [cx - 30, hy - 74]];
  g += shape(p, earL, C.FUR) + shape(p, [[cx + 80, hy - 30], [cx + 80, hy - 120], [cx + 30, hy - 74]], C.FUR);
  g += line(p.curve([[cx - 72, hy - 46], [cx - 70, hy - 96], [cx - 46, hy - 72]]), 2.5, 0.5);
  g += line(p.curve([[cx + 72, hy - 46], [cx + 70, hy - 96], [cx + 46, hy - 72]]), 2.5, 0.5);
  g += shape(p, ell(cx, hy, 92, 78, 18), C.FUR);
  for (const x of [-18, 0, 18]) g += line(p.curve([[cx + x, hy - 72], [cx + x, hy - 50]]), 4, sketch ? 0.35 : 0.8, C.STRIPE);
  // eyes
  for (const s of [-1, 1]) {
    if (blink) g += line(p.curve([[cx + s * 46, hy - 4], [cx + s * 34, hy + 4], [cx + s * 20, hy - 4]]), 4);
    else {
      g += shape(p, ell(cx + s * 34, hy - 6, 16, 18, 12), '#fdfcf6', 3);
      g += fill(p.curve(ell(cx + s * 34, hy - 4, 6, 14, 10), true, 0.3), INK);
    }
  }
  g += fill(p.curve([[cx - 9, hy + 20], [cx + 9, hy + 20], [cx, hy + 30]], true, 0.4), C.NOSE) + line(p.curve([[cx - 9, hy + 20], [cx + 9, hy + 20], [cx, hy + 30]], true, 0.6), 2.5);
  g += line(p.curve([[cx, hy + 30], [cx - 12, hy + 42], [cx - 22, hy + 38]]), 3) + line(p.curve([[cx, hy + 30], [cx + 12, hy + 42], [cx + 22, hy + 38]]), 3);
  for (const s of [-1, 1]) for (const k of [0, 1, 2]) g += line(p.curve([[cx + s * 40, hy + 22 + k * 8], [cx + s * 104, hy + 10 + k * 14]]), 2, 0.7);
  return g;
}

export function catFrames() {
  return [
    { tail: 0, seed: 1 },
    { tail: 1, seed: 2 },
    { tail: 0, blink: true, seed: 3 },
    { tail: 2, ear: true, seed: 4 },
  ];
}
