/**
 * Hand-drawn avatar flipbook, generated as SVG.
 * Frames (4×4 atlas, row-major from top-left):
 *   0–2   idle (same pose, re-drawn lines → hand-drawn "line boil")
 *   3–6   right arm rising into a wave
 *   7–14  waving (forearm swings)
 *   15    presenting (open palm toward the easel)
 * Each frame is painted (skin/shirt/jeans) with graphite outlines on top and a
 * transparent background. The runtime shader shows the pencil version (lines
 * only) and reveals the painted colours on hover.
 */
import { rng } from '../src/scripts/scene/texgen.ts';

export const FRAME_W = 512;
export const FRAME_H = 1024;
export const GRID = 4;

const INK = '#2b2b2b';
// Mohamed: black suit, white shirt, black dress shoes, dark textured hair,
// short beard, thin round glasses (from his photos).
const PAINTED = {
  SKIN: '#ebc4a2', SHIRT: '#fbfaf7', JACKET: '#26262a', PANTS: '#1d1d21', HAIR: '#1d1714', BEARD: 'rgba(38,28,24,0.6)',
  SHOE: '#121214', CHEEK: 'rgba(200,85,61,0.18)', LENS: 'rgba(220,235,245,0.35)', HATCH: 0,
};
const SKETCH = {
  SKIN: '#fbfaf8', SHIRT: '#fdfcfa', JACKET: '#e4e1dc', PANTS: '#dedbd6', HAIR: '#cfcac4', BEARD: 'rgba(120,114,108,0.45)',
  SHOE: '#d6d2cc', CHEEK: 'rgba(0,0,0,0)', LENS: 'rgba(0,0,0,0)', HATCH: 1,
};
let SKIN, SHIRT, JACKET, PANTS, HAIR, BEARD, SHOE, CHEEK, LENS, SKETCHING = false;
const deg = Math.PI / 180;

function pen(seed) {
  const r = rng(seed);
  const j = (a) => (r() - 0.5) * 2 * a;
  /** Smooth wobbly polyline through points (Catmull-Rom → cubic Bézier). */
  const curve = (pts, closed = false, amp = 1.6) => {
    const p = pts.map(([x, y]) => [x + j(amp), y + j(amp)]);
    if (closed) p.push(p[0], p[1], p[2]);
    let d = `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = p[i - 1] ?? p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] ?? p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return d;
  };
  const ellipsePts = (cx, cy, rx, ry, n = 14, rot = 0) =>
    Array.from({ length: n }, (_, i) => {
      const t = (i / n) * Math.PI * 2;
      const x = Math.cos(t) * rx, y = Math.sin(t) * ry;
      return [cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)];
    });
  return { curve, ellipsePts, j };
}

const fill = (d, c) => `<path d="${d}" fill="${c}" stroke="none"/>`;
const line = (d, w = 4.2, o = 1) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity="${o}"/>`;
/** Shape = colour fill + two wobbly pencil passes. */
function shape(p, pts, color, closed = true, w = 4.2) {
  const d1 = p.curve(pts, closed, 0.8);
  return fill(d1, color) + line(p.curve(pts, closed, 1.4), w) + line(p.curve(pts, closed, 2.2), w * 0.45, 0.45);
}
/** Limb = outlined tapered tube along a polyline. */
function limb(pts, w0, w1, color) {
  const n = pts.length;
  const left = [], right = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    const w = (w0 + (w1 - w0) * (i / (n - 1))) / 2;
    left.push([pts[i][0] - (dy / L) * w, pts[i][1] + (dx / L) * w]);
    right.push([pts[i][0] + (dy / L) * w, pts[i][1] - (dx / L) * w]);
  }
  return { outline: [...left, ...right.reverse()], centre: pts, width: (w0 + w1) / 2, color };
}

function armPoints(shoulder, a1, a2, L1 = 128, L2 = 118) {
  // angles from straight down, positive = towards +x (the figure's left / screen right)
  const elbow = [shoulder[0] + Math.sin(a1) * L1, shoulder[1] + Math.cos(a1) * L1];
  const hand = [elbow[0] + Math.sin(a2) * L2, elbow[1] + Math.cos(a2) * L2];
  return { elbow, hand };
}

function hand(p, at, angle, open = true) {
  // palm + fingers, pointing along `angle` (from straight down)
  const dir = [Math.sin(angle), Math.cos(angle)];
  const nrm = [-dir[1], dir[0]];
  const c = [at[0] + dir[0] * 14, at[1] + dir[1] * 14];
  let s = '';
  if (open) {
    // fingers first, palm on top so the joints are hidden
    for (let f = -1.5; f <= 1.5; f += 1) {
      const base = [c[0] + dir[0] * 6 + nrm[0] * f * 11, c[1] + dir[1] * 6 + nrm[1] * f * 11];
      const len = 40 - Math.abs(f) * 8;
      const spread = f * 0.3;
      const fd = [Math.sin(angle - spread), Math.cos(angle - spread)];
      const tip = [base[0] + fd[0] * len, base[1] + fd[1] * len];
      s += limbSvg(p, limb([base, tip], 7.5, 7.5, SKIN), 3);
    }
    const tb = [c[0] - nrm[0] * 16, c[1] - nrm[1] * 16];
    const ta = angle + 1.0;
    s += limbSvg(p, limb([tb, [tb[0] + Math.sin(ta) * 28, tb[1] + Math.cos(ta) * 28]], 8.5, 8.5, SKIN), 3);
  }
  s += shape(p, p.ellipsePts(c[0], c[1], 22, 20, 12, Math.atan2(dir[1], dir[0]) - Math.PI / 2), SKIN, true, 3.6);
  return s;
}

/**
 * Limb as an outlined tube: a thick graphite stroke with a slightly thinner
 * colour stroke on top (round caps). Unlike a filled outline polygon this can't
 * self-intersect at a bent elbow.
 */
function limbSvg(p, l, w = 4.2) {
  const d = p.curve(l.centre, false, 0.6);
  const width = l.width;
  const pencil = p.curve(l.centre, false, 1.2);
  return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${(width + w * 1.6).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="${l.color}" stroke-width="${width.toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"/>` +
    // faint second pencil pass along one edge for the hand-drawn feel
    `<path d="${pencil}" fill="none" stroke="${INK}" stroke-width="${(w * 0.4).toFixed(1)}" stroke-linecap="round" opacity="0.18" transform="translate(${(width * 0.42).toFixed(1)} 0)"/>`;
}

/** Pencil hatching: short diagonal strokes on a grid, staying inside the box. */
function hatch(p, x0, y0, x1, y1, gap = 13, o = 0.4) {
  let g = '';
  for (let y = y0 + 8; y < y1 - 8; y += 22)
    for (let x = x0 + 4 + ((y / 22) % 2) * gap * 0.5; x < x1 - 14; x += gap) g += line(p.curve([[x, y + 9], [x + 10, y - 9]], false, 0.8), 1.6, o);
  return g;
}

/** One frame of the figure. a1/a2 = right (screen-right) arm angles in degrees. */
export function drawFrame({ a1, a2, wave = 0, seed = 1 }, sketch = false) {
  ({ SKIN, SHIRT, JACKET, PANTS, HAIR, BEARD, SHOE, CHEEK, LENS } = sketch ? SKETCH : PAINTED);
  SKETCHING = sketch;
  const p = pen(seed);
  let g = '';
  const cx = 200; // figure sits left of centre: the waving arm needs room on the right

  // slim suit trousers + black dress shoes
  g += limbSvg(p, limb([[cx - 27, 560], [cx - 30, 760], [cx - 32, 928]], 56, 40, PANTS));
  g += limbSvg(p, limb([[cx + 27, 560], [cx + 30, 760], [cx + 32, 928]], 56, 40, PANTS));
  g += line(p.curve([[cx - 30, 600], [cx - 32, 900]]), 1.8, 0.35) + line(p.curve([[cx + 30, 600], [cx + 32, 900]]), 1.8, 0.35); // creases
  g += shape(p, [[cx - 74, 950], [cx - 66, 928], [cx - 40, 920], [cx - 14, 928], [cx - 10, 952], [cx - 40, 958]], SHOE);
  g += shape(p, [[cx + 74, 950], [cx + 66, 928], [cx + 40, 920], [cx + 14, 928], [cx + 10, 952], [cx + 40, 958]], SHOE);
  if (!SKETCHING) g += line(p.curve([[cx - 60, 932], [cx - 44, 926]]), 2.4, 0.5).replace(INK, '#8a8a90') + line(p.curve([[cx + 60, 932], [cx + 44, 926]]), 2.4, 0.5).replace(INK, '#8a8a90');

  // left arm: jacket sleeve to the wrist, white cuff, relaxed hand
  const lS = [cx - 62, 300];
  const lW = [cx - 70, 520];
  g += limbSvg(p, limb([lS, [cx - 72, 410], lW], 40, 34, JACKET));
  g += limbSvg(p, limb([[lW[0], lW[1] - 4], [lW[0], lW[1] + 8]], 30, 30, SHIRT), 3);
  g += hand(p, [lW[0], lW[1] + 6], 0, false);

  // right arm (waves)
  const rS = [cx + 62, 300];
  const { elbow, hand: hp } = armPoints(rS, a1 * deg, (a2 + wave) * deg, 112, 104);
  const raised = a1 > 70;
  const armStart = [rS[0] + (elbow[0] - rS[0]) * 0.15, rS[1] + (elbow[1] - rS[1]) * 0.15];
  const fa = (a2 + wave) * deg;
  const wrist = [hp[0] - Math.sin(fa) * 4, hp[1] - Math.cos(fa) * 4];
  const cuff = [wrist[0] - Math.sin(fa) * 12, wrist[1] - Math.cos(fa) * 12];
  const rightArm = limbSvg(p, limb([armStart, elbow, cuff], 40, 34, JACKET)) +
    limbSvg(p, limb([cuff, wrist], 30, 30, SHIRT), 3) +
    hand(p, hp, fa, a1 > 25);
  if (!raised) g += rightArm;

  // blazer
  const torso = [[cx - 70, 300], [cx - 40, 276], [cx - 16, 276], [cx, 290], [cx + 16, 276], [cx + 40, 276], [cx + 70, 300],
    [cx + 66, 420], [cx + 66, 586], [cx, 592], [cx - 66, 586], [cx - 66, 420]];
  g += shape(p, torso, JACKET);
  // white shirt in the open V, collar points
  g += shape(p, [[cx - 22, 280], [cx, 296], [cx + 22, 280], [cx + 10, 420], [cx, 446], [cx - 10, 420]], SHIRT, true, 3);
  g += shape(p, [[cx - 22, 278], [cx - 2, 300], [cx - 24, 306]], SHIRT, true, 2.6) + shape(p, [[cx + 22, 278], [cx + 2, 300], [cx + 24, 306]], SHIRT, true, 2.6);
  g += line(p.curve([[cx, 312], [cx, 440]]), 1.8, 0.4); // placket
  // lapels
  g += line(p.curve([[cx - 34, 280], [cx - 40, 330], [cx - 22, 360], [cx - 6, 452]]), 3.6) + line(p.curve([[cx + 34, 280], [cx + 40, 330], [cx + 22, 360], [cx + 6, 452]]), 3.6);
  g += line(p.curve([[cx - 40, 330], [cx - 26, 326]]), 2.6, 0.7) + line(p.curve([[cx + 40, 330], [cx + 26, 326]]), 2.6, 0.7);
  // button, front edge, pocket + white pocket square, belt hint
  g += shape(p, p.ellipsePts(cx + 4, 478, 6, 6, 8), SKETCHING ? '#cfcac4' : '#3a3a40', true, 2.2);
  g += line(p.curve([[cx - 4, 452], [cx + 2, 520], [cx - 8, 588]]), 2.6, 0.75);
  g += line(p.curve([[cx - 56, 356], [cx - 30, 352]]), 2.6, 0.7);
  g += shape(p, [[cx - 54, 356], [cx - 50, 344], [cx - 42, 348], [cx - 36, 342], [cx - 34, 354]], SHIRT, true, 2);
  g += line(p.curve([[cx - 52, 520], [cx - 22, 518]]), 2.4, 0.6) + line(p.curve([[cx + 22, 518], [cx + 52, 520]]), 2.4, 0.6);
  if (SKETCHING) {
    // graphite shading so the dark suit still reads as dark in pencil
    g += hatch(p, cx - 62, 360, cx - 14, 580, 12, 0.32) + hatch(p, cx + 16, 360, cx + 60, 580, 12, 0.32);
    g += hatch(p, cx - 52, 600, cx - 8, 900, 14, 0.22) + hatch(p, cx + 8, 600, cx + 54, 900, 14, 0.22);
  }
  if (raised) g += rightArm;

  // neck + ears + head
  g += shape(p, [[cx - 17, 236], [cx + 17, 236], [cx + 15, 280], [cx, 290], [cx - 15, 280]], SKIN, true, 3.4);
  g += shape(p, p.ellipsePts(cx - 62, 172, 11, 18), SKIN, true, 3.4) + shape(p, p.ellipsePts(cx + 62, 172, 11, 18), SKIN, true, 3.4);
  const face = [[cx, 84], [cx + 48, 98], [cx + 62, 150], [cx + 56, 212], [cx + 28, 250], [cx, 258], [cx - 28, 250], [cx - 56, 212], [cx - 62, 150], [cx - 48, 98]];
  g += shape(p, face, SKIN);

  // short beard along the jaw + moustache (mouth left clear)
  const beard = [[cx - 60, 178], [cx - 56, 214], [cx - 30, 248], [cx, 258], [cx + 30, 248], [cx + 56, 214], [cx + 60, 178],
    [cx + 54, 204], [cx + 40, 226], [cx + 22, 240], [cx, 244], [cx - 22, 240], [cx - 40, 226], [cx - 54, 204]];
  g += fill(p.curve(beard, true, 0.8), BEARD);
  g += fill(p.curve([[cx - 26, 207], [cx - 10, 200], [cx, 203], [cx + 10, 200], [cx + 26, 207], [cx + 12, 210], [cx, 208], [cx - 12, 210]], true, 0.5), BEARD);
  g += line(p.curve([[cx - 58, 200], [cx - 44, 232], [cx - 20, 252], [cx, 258], [cx + 20, 252], [cx + 44, 232], [cx + 58, 200]]), 2.4, 0.55);
  if (SKETCHING) for (let k = 0; k < 14; k++) {
    const t = k / 13, x = cx - 50 + t * 100, y = 214 + Math.sin(t * Math.PI) * 32;
    g += line(p.curve([[x, y - 8], [x + 3, y + 4]]), 1.4, 0.5);
  }

  // hair: faded sides (short, lighter), textured curly top
  const side = SKETCHING ? HAIR : 'rgba(29,23,20,0.55)';
  g += fill(p.curve([[cx - 64, 168], [cx - 66, 124], [cx - 54, 108], [cx - 50, 140], [cx - 56, 166]], true, 0.6), side);
  g += fill(p.curve([[cx + 64, 168], [cx + 66, 124], [cx + 54, 108], [cx + 50, 140], [cx + 56, 166]], true, 0.6), side);
  const top = [[cx - 58, 122], [cx - 62, 92], [cx - 46, 64], [cx - 24, 50], [cx, 44], [cx + 26, 48], [cx + 48, 62], [cx + 62, 88], [cx + 60, 120],
    [cx + 48, 104], [cx + 30, 102], [cx + 12, 96], [cx - 8, 100], [cx - 28, 98], [cx - 46, 106]];
  g += shape(p, top, HAIR, true, 3.4);
  // curls on top
  for (let k = 0; k < 9; k++) {
    const x = cx - 46 + k * 11.5, y = 60 + Math.abs(k - 4) * 4 + (k % 2) * 6;
    g += line(p.curve([[x - 6, y + 4], [x - 2, y - 4], [x + 5, y - 2], [x + 4, y + 6]]), 2.2, SKETCHING ? 0.7 : 0.5).replace(SKETCHING ? INK : INK, SKETCHING ? INK : '#4a403a');
  }
  if (SKETCHING) for (let k = 0; k < 10; k++) g += line(p.curve([[cx - 52 + k * 11, 104 - (k % 2) * 4], [cx - 44 + k * 11, 66 + (k % 3) * 4]]), 1.6, 0.5);

  // eyebrows, eyes (smiling), glasses
  g += line(p.curve([[cx - 40, 140], [cx - 26, 134], [cx - 12, 138]]), 4.6) + line(p.curve([[cx + 12, 138], [cx + 26, 134], [cx + 40, 140]]), 4.6);
  g += line(p.curve([[cx - 32, 166], [cx - 24, 160], [cx - 16, 166]]), 3.4) + line(p.curve([[cx + 16, 166], [cx + 24, 160], [cx + 32, 166]]), 3.4);
  for (const ex of [cx - 24, cx + 24]) {
    g += fill(p.curve(p.ellipsePts(ex, 162, 19, 17, 14), true, 0.3), LENS);
    g += line(p.curve(p.ellipsePts(ex, 162, 19, 17, 14), true, 0.5), 2.6, 0.9);
  }
  g += line(p.curve([[cx - 6, 158], [cx, 155], [cx + 6, 158]]), 2.4, 0.9); // bridge
  g += line(p.curve([[cx - 43, 158], [cx - 60, 162]]), 2.4, 0.8) + line(p.curve([[cx + 43, 158], [cx + 60, 162]]), 2.4, 0.8);
  // nose
  g += line(p.curve([[cx + 2, 176], [cx - 4, 192], [cx + 6, 196]]), 2.8);
  // big smile with a hint of teeth
  g += shape(p, [[cx - 22, 214], [cx, 220], [cx + 22, 214], [cx + 12, 228], [cx, 231], [cx - 12, 228]], '#ffffff', true, 2.8);
  g += line(p.curve([[cx - 26, 210], [cx - 22, 214]]), 2.4, 0.7) + line(p.curve([[cx + 26, 210], [cx + 22, 214]]), 2.4, 0.7);
  g += fill(p.curve(p.ellipsePts(cx - 42, 194, 10, 6, 8), true, 0.3), CHEEK) + fill(p.curve(p.ellipsePts(cx + 42, 194, 10, 6, 8), true, 0.3), CHEEK);

  return g;
}

/** Frame list for the atlas. */
export function avatarFrames() {
  const frames = [];
  for (let i = 0; i < 3; i++) frames.push({ a1: 10, a2: 4, seed: 11 + i });                           // idle boil
  const raise = [[34, 52], [70, 112], [100, 150], [118, 166]];
  raise.forEach(([a1, a2], i) => frames.push({ a1, a2, seed: 21 + i }));                            // raise
  for (let i = 0; i < 8; i++) frames.push({ a1: 122, a2: 170, wave: Math.sin((i / 8) * Math.PI * 2) * 22, seed: 31 + i }); // wave
  frames.push({ a1: 58, a2: 84, seed: 41 });                                                         // present
  return frames;
}
