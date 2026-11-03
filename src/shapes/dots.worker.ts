/**
 * Dot-matrix noise sphere (Canvas 2D in a worker).
 * A Fibonacci lattice is displaced radially by animated 3D noise, rotated and
 * perspective-projected; dots are binned by colour so a frame is one fillRect per
 * dot with ~16 fillStyle switches.
 */
import { run } from './loop';
import { noise3 } from './noise';

const PAL: Record<string, string[]> = {
  paper: ['#2f4bff', '#5a4dff', '#8a55ff', '#c95cf0', '#ff8ad8'],
  dark: ['#5f74ff', '#8ea0ff', '#b39bff', '#e2a0ff', '#8af0ff'],
  accent: ['#9fb0ff', '#c9d1ff', '#eef0ff', '#ffffff', '#8af0ff'],
};
const B = 8;

function ramp(stops: string[]) {
  const rgb = stops.map((h) => [1, 3, 5].map((o) => parseInt(h.slice(o, o + 2), 16)));
  return Array.from({ length: B }, (_, k) => {
    const f = (k / (B - 1)) * (rgb.length - 1);
    const a = rgb[Math.floor(f)]!;
    const b = rgb[Math.min(rgb.length - 1, Math.floor(f) + 1)]!;
    const m = f - Math.floor(f);
    return `rgb(${a.map((v, j) => Math.round(v + (b[j]! - v) * m)).join()})`;
  });
}

interface S {
  ctx: OffscreenCanvasRenderingContext2D;
  u: Float32Array;
  n: number;
  col: string[];
  bins: number[][];
}

run<S>({
  init(i) {
    const S = Math.min(i.c.width, i.c.height);
    const n = Math.round(Math.max(900, Math.min(4200, S * S * 0.024)) * (i.opt.mobile ? 0.6 : 1));
    const u = new Float32Array(n * 3);
    const ga = Math.PI * (3 - Math.sqrt(5));
    for (let k = 0; k < n; k++) {
      const y = 1 - (2 * (k + 0.5)) / n;
      const r = Math.sqrt(1 - y * y);
      u[k * 3] = Math.cos(ga * k) * r;
      u[k * 3 + 1] = y;
      u[k * 3 + 2] = Math.sin(ga * k) * r;
    }
    return {
      ctx: i.c.getContext('2d')!,
      u,
      n,
      col: ramp(PAL[i.opt.tone ?? 'paper'] ?? PAL.paper!),
      bins: Array.from({ length: B * 2 }, () => []),
    };
  },
  frame(i, t) {
    const { ctx, u, n, col, bins } = i.s;
    const W = i.c.width;
    const H = i.c.height;
    const R = Math.min(W, H) * 0.38;
    const ay = t * 0.22;
    const ax = 0.4;
    const cy = Math.cos(ay);
    const sy = Math.sin(ay);
    const cx = Math.cos(ax);
    const sx = Math.sin(ax);
    const ts = t * 0.35;
    const out = new Float32Array(n * 3);
    for (const b of bins) b.length = 0;
    for (let k = 0; k < n; k++) {
      const x0 = u[k * 3]!;
      const y0 = u[k * 3 + 1]!;
      const z0 = u[k * 3 + 2]!;
      const d = noise3(x0 * 1.7 + ts, y0 * 1.7 - ts * 0.5, z0 * 1.7);
      const r = 0.74 + 0.42 * d * d;
      const x1 = x0 * r * cy + z0 * r * sy;
      const z1 = -x0 * r * sy + z0 * r * cy;
      const y2 = y0 * r * cx - z1 * sx;
      const z2 = y0 * r * sx + z1 * cx;
      const pz = 2.8 / (2.8 - z2);
      out[k * 3] = W / 2 + x1 * R * pz;
      out[k * 3 + 1] = H / 2 - y2 * R * pz;
      out[k * 3 + 2] = z2;
      const c = Math.min(B - 1, Math.max(0, Math.floor(((r - 0.74) / 0.42) * B * 1.15)));
      bins[c + (z2 > 0 ? B : 0)]!.push(k);
    }
    ctx.clearRect(0, 0, W, H);
    for (let b = 0; b < bins.length; b++) {
      const front = b >= B;
      ctx.fillStyle = col[b % B]!;
      ctx.globalAlpha = front ? 1 : 0.28;
      for (const k of bins[b]!) {
        const z = out[k * 3 + 2]!;
        const s = (front ? 1.3 + z * 1.2 : 1) * i.dpr;
        ctx.fillRect(out[k * 3]! - s / 2, out[k * 3 + 1]! - s / 2, s, s);
      }
    }
    ctx.globalAlpha = 1;
  },
});
