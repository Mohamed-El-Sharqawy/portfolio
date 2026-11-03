/**
 * Flow-field sphere (Canvas 2D in a worker).
 * Particles advect over the unit sphere through a field made of a few drifting
 * vortex sinks plus 3D value noise; their paths accumulate on a fading trail
 * layer so they read as streamlines converging into vortex points. Body, rim glow
 * and rim sparkles are painted once into a cache, so a frame costs one field
 * evaluation per particle plus three drawImage calls.
 */
import { run, type Inst } from './loop';
import { noise3 } from './noise';

type Ctx = OffscreenCanvasRenderingContext2D;
interface S {
  ctx: Ctx;
  body: OffscreenCanvas;
  trail: OffscreenCanvas;
  tctx: Ctx;
  p: Float32Array;
  q: Float32Array;
  life: Float32Array;
  n: number;
  R: number;
  cx: number;
  cy: number;
}

// Vortex sinks: direction, pull, swirl.
const V = [
  [-0.6, 0.5, 0.62, 1, 0.35],
  [0.38, 0.7, 0.6, 0.8, -0.25],
  [-0.55, -0.48, 0.68, 0.9, 0.3],
  [0.66, -0.3, 0.7, 1.1, -0.4],
  [0.1, -0.2, -1, 1, 0.3],
].map(([x, y, z, a, s]) => {
  const l = Math.hypot(x!, y!, z!);
  return [x! / l, y! / l, z! / l, a!, s!];
});

const rnd = () => Math.random();
function spawn(s: S, k: number) {
  const z = rnd() * 2 - 1;
  const a = rnd() * Math.PI * 2;
  const r = Math.sqrt(1 - z * z);
  s.p[k * 3] = r * Math.cos(a);
  s.p[k * 3 + 1] = r * Math.sin(a);
  s.p[k * 3 + 2] = z;
  s.life[k] = 2 + rnd() * 5;
}

const tones: Record<string, [string, string, string, string]> = {
  // body inner, body outer, line, line (limb)
  paper: ['#121433', '#020208', 'rgba(178,172,255,.5)', 'rgba(140,130,255,.3)'],
  dark: ['#0f1029', '#010104', 'rgba(178,172,255,.48)', 'rgba(140,130,255,.28)'],
  accent: ['#141a5c', '#02030f', 'rgba(196,192,255,.52)', 'rgba(150,145,255,.3)'],
};

function paintBody(s: S, i: Inst<S>) {
  const [a, b] = tones[i.opt.tone ?? 'dark'] ?? tones.dark!;
  const { R, cx, cy } = s;
  const g = s.body.getContext('2d')!;
  g.clearRect(0, 0, s.body.width, s.body.height);
  const f = g.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R);
  f.addColorStop(0, a);
  f.addColorStop(1, b);
  g.fillStyle = f;
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  g.fill();
  // Rim glow, stronger on the lower left (light wraps from behind).
  const rim = g.createRadialGradient(cx, cy, R * 0.82, cx, cy, R * 1.02);
  rim.addColorStop(0, 'rgba(150,140,255,0)');
  rim.addColorStop(0.85, 'rgba(160,150,255,.38)');
  rim.addColorStop(0.97, 'rgba(205,200,255,.7)');
  rim.addColorStop(1, 'rgba(205,200,255,0)');
  g.fillStyle = rim;
  g.fill();
  // Sparkles packed along the rim.
  g.fillStyle = 'rgba(235,232,255,.85)';
  const m = Math.round(R * 2.6);
  for (let k = 0; k < m; k++) {
    const ang = Math.PI * (0.35 + rnd() * 1.1) + (rnd() < 0.2 ? Math.PI : 0);
    const rr = R * (1 - Math.pow(rnd(), 2.2) * 0.12);
    const sz = (0.6 + rnd() * 1.2) * i.dpr;
    g.fillRect(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr, sz, sz);
  }
}

function step(s: S, t: number, dt: number, draw: Ctx | null, tone: string) {
  const { p, q, life, n, R, cx, cy } = s;
  const rot = t * 0.06;
  const cr = Math.cos(rot);
  const sr = Math.sin(rot);
  const ts = t * 0.08;
  const speed = 0.22 * dt;
  const [, , front, limb] = tones[tone] ?? tones.dark!;
  const segF: number[] = [];
  const segL: number[] = [];
  for (let k = 0; k < n; k++) {
    const o = k * 3;
    let x = p[o]!;
    let y = p[o + 1]!;
    let z = p[o + 2]!;
    let fx = 0;
    let fy = 0;
    let fz = 0;
    let dead = (life[k]! -= dt) <= 0;
    for (const v of V) {
      // Vortices drift: rotate around Y.
      const vx = v[0]! * cr + v[2]! * sr;
      const vy = v[1]!;
      const vz = -v[0]! * sr + v[2]! * cr;
      const dx = vx - x;
      const dy = vy - y;
      const dz = vz - z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < 0.0025) dead = true;
      const w = 1 / (d2 + 0.03);
      fx += (dx * v[3]! + (vy * z - vz * y) * v[4]!) * w;
      fy += (dy * v[3]! + (vz * x - vx * z) * v[4]!) * w;
      fz += (dz * v[3]! + (vx * y - vy * x) * v[4]!) * w;
    }
    const nn = 2.6;
    fx += (noise3(x * 2 + ts, y * 2, z * 2) - 0.5) * nn;
    fy += (noise3(x * 2, y * 2 + ts, z * 2 + 17) - 0.5) * nn;
    fz += (noise3(x * 2 + 31, y * 2, z * 2 - ts) - 0.5) * nn;
    const dp = fx * x + fy * y + fz * z;
    fx -= dp * x;
    fy -= dp * y;
    fz -= dp * z;
    const l = Math.hypot(fx, fy, fz) || 1;
    const ox = x;
    const oy = y;
    const oz = z;
    x += (fx / l) * speed;
    y += (fy / l) * speed;
    z += (fz / l) * speed;
    const nl = Math.hypot(x, y, z);
    x /= nl;
    y /= nl;
    z /= nl;
    if (dead) {
      spawn(s, k);
      continue;
    }
    p[o] = x;
    p[o + 1] = y;
    p[o + 2] = z;
    if (draw && z > 0 && oz > 0) {
      (z > 0.3 ? segF : segL).push(cx + ox * R, cy - oy * R, cx + x * R, cy - y * R);
    }
    q[k] = z;
  }
  if (!draw) return;
  draw.globalCompositeOperation = 'destination-out';
  draw.fillStyle = 'rgba(0,0,0,.028)';
  draw.fillRect(0, 0, s.trail.width, s.trail.height);
  draw.globalCompositeOperation = 'source-over';
  for (const [seg, col] of [
    [segL, limb],
    [segF, front],
  ] as const) {
    draw.strokeStyle = col!;
    draw.beginPath();
    for (let j = 0; j < seg.length; j += 4) {
      draw.moveTo(seg[j]!, seg[j + 1]!);
      draw.lineTo(seg[j + 2]!, seg[j + 3]!);
    }
    draw.stroke();
  }
}

function layout(i: Inst<S>, s: S) {
  const W = i.c.width;
  const H = i.c.height;
  s.R = Math.min(W, H) * 0.47;
  s.cx = W / 2;
  s.cy = H / 2;
  s.body.width = s.trail.width = W;
  s.body.height = s.trail.height = H;
  s.tctx.lineWidth = 0.55 * i.dpr;
  s.tctx.lineCap = 'round';
  paintBody(s, i);
}

run<S>({
  init(i) {
    const S = Math.min(i.c.width, i.c.height);
    const n = Math.round(Math.max(360, Math.min(2600, S * S * 0.013)) * (i.opt.mobile ? 0.6 : 1));
    const trail = new OffscreenCanvas(1, 1);
    const s: S = {
      ctx: i.c.getContext('2d')!,
      body: new OffscreenCanvas(1, 1),
      trail,
      tctx: trail.getContext('2d')!,
      p: new Float32Array(n * 3),
      q: new Float32Array(n),
      life: new Float32Array(n),
      n,
      R: 0,
      cx: 0,
      cy: 0,
    };
    for (let k = 0; k < n; k++) spawn(s, k);
    layout(i, s);
    // Warm start so the first painted frame already shows streamlines.
    for (let k = 0; k < 110; k++) step(s, k / 30, 1 / 30, s.tctx, i.opt.tone ?? 'dark');
    return s;
  },
  resize(i) {
    if (i.s) layout(i, i.s);
  },
  frame(i, t, dt) {
    const s = i.s;
    step(s, t, dt, s.tctx, i.opt.tone ?? 'dark');
    const g = s.ctx;
    g.clearRect(0, 0, i.c.width, i.c.height);
    g.drawImage(s.body, 0, 0);
    g.drawImage(s.trail, 0, 0);
    // Bright particle heads.
    g.fillStyle = 'rgba(255,255,255,.9)';
    const sz = 1.5 * i.dpr;
    for (let k = 0; k < s.n; k += 7) {
      if (s.q[k]! > 0.15) {
        g.fillRect(s.cx + s.p[k * 3]! * s.R, s.cy - s.p[k * 3 + 1]! * s.R, sz, sz);
      }
    }
  },
});
