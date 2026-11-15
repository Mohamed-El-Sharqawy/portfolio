/**
 * Procedural texture generators shared by the asset build script (Node, which
 * encodes the result to KTX2) and the browser (fallback if KTX2 can't load).
 * Pure functions on Uint8Array RGBA buffers: no DOM, no three.js.
 */

export interface RGBAImage {
  width: number;
  height: number;
  data: Uint8Array;
}

/** Deterministic PRNG (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(x: number, y: number, seed: number) {
  let h = (x * 374761393 + y * 668265263 + seed * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Tileable value noise with integer period. */
function periodicNoise(x: number, y: number, period: number, seed: number) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const p = (n: number) => ((n % period) + period) % period;
  const a = hash2(p(xi), p(yi), seed), b = hash2(p(xi + 1), p(yi), seed);
  const c = hash2(p(xi), p(yi + 1), seed), d = hash2(p(xi + 1), p(yi + 1), seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/**
 * Paper grain: R=G=B is a brightness multiplier (255 = clean paper),
 * with soft fibres and fine tooth. Tileable.
 */
export function generatePaper(size = 512, seed = 7): RGBAImage {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let n = 0, amp = 0.5, freq = 8;
      for (let o = 0; o < 5; o++) {
        n += amp * periodicNoise((x / size) * freq, (y / size) * freq, freq, seed + o);
        amp *= 0.5;
        freq *= 2;
      }
      // horizontal-ish fibres
      const fib = periodicNoise((x / size) * 6, (y / size) * 96, 6, seed + 31);
      const fibres = Math.pow(fib, 6) * 0.6;
      const tooth = hash2(x, y, seed) * 0.08;
      const v = 1 - (n * 0.32 + fibres * 0.3 + tooth);
      const c = Math.max(0, Math.min(255, Math.round(v * 255)));
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = c;
      data[i + 3] = 255;
    }
  }
  return { width: size, height: size, data };
}

/**
 * Pencil-stroke texture (tonal-art-map style, tileable):
 *   R = hatching at  +40°, light tone
 *   G = cross-hatch at -50°, mid tone
 *   B = dense short strokes at +10°, dark tone
 *   A = "draw order": a per-stroke random id plus progress along the stroke.
 * The sketch shader reveals a stroke where A < uProgress (+ noise), so
 * strokes appear one by one and grow from start to end.
 */
export function generateStrokes(size = 512, seed = 3): RGBAImage {
  const W = size, H = size;
  const ink = [new Float32Array(W * H), new Float32Array(W * H), new Float32Array(W * H)];
  const order = new Float32Array(W * H).fill(1);
  const orderWeight = new Float32Array(W * H);
  const rand = rng(seed);

  const splat = (layer: number, fx: number, fy: number, a: number, id: number) => {
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    for (let dy = -1; dy <= 2; dy++) {
      for (let dx = -1; dx <= 2; dx++) {
        const px = x0 + dx, py = y0 + dy;
        const d2 = (px + 0.5 - fx) ** 2 + (py + 0.5 - fy) ** 2;
        const w = Math.exp(-d2 / 0.45) * a;
        if (w < 0.02) continue;
        const ix = ((px % W) + W) % W, iy = ((py % H) + H) % H;
        const k = iy * W + ix;
        const L = ink[layer];
        L[k] = 1 - (1 - L[k]) * (1 - w); // multiply-style accumulation
        if (w > orderWeight[k]) {
          orderWeight[k] = w;
          order[k] = id;
        }
      }
    }
  };

  const layers = [
    { angle: (40 * Math.PI) / 180, spacing: 9, len: [70, 190], press: 0.75 },
    { angle: (-50 * Math.PI) / 180, spacing: 8, len: [60, 160], press: 0.7 },
    { angle: (10 * Math.PI) / 180, spacing: 5.5, len: [26, 70], press: 0.8 },
  ];

  layers.forEach((L, li) => {
    const dir = [Math.cos(L.angle), Math.sin(L.angle)];
    const nrm = [-dir[1], dir[0]];
    const diag = Math.hypot(W, H);
    for (let off = -diag; off < diag; off += L.spacing * (0.8 + rand() * 0.4)) {
      // walk along the row, dropping strokes with small gaps
      let t = -diag + rand() * 40;
      while (t < diag) {
        const len = L.len[0] + rand() * (L.len[1] - L.len[0]);
        const id = 0.05 + rand() * 0.75; // when this stroke starts drawing
        const bend = (rand() - 0.5) * 3;
        const cx = W / 2 + nrm[0] * off, cy = H / 2 + nrm[1] * off;
        const steps = Math.ceil(len * 2);
        for (let s = 0; s <= steps; s++) {
          const u = s / steps;
          const along = t + u * len;
          const wob = Math.sin(u * Math.PI) * bend;
          const fx = cx + dir[0] * along + nrm[0] * wob;
          const fy = cy + dir[1] * along + nrm[1] * wob;
          if (fx < -4 || fy < -4 || fx > W + 4 || fy > H + 4) continue;
          // pencil pressure: fade in/out at the stroke ends
          const p = L.press * Math.min(1, u * 6, (1 - u) * 4) * (0.75 + rand() * 0.25);
          splat(li, fx, fy, p, Math.min(0.98, id + u * 0.18));
        }
        t += len + 4 + rand() * 14;
      }
    }
  });

  const data = new Uint8Array(W * H * 4);
  for (let k = 0; k < W * H; k++) {
    data[k * 4] = Math.round(Math.min(1, ink[0][k]) * 255);
    data[k * 4 + 1] = Math.round(Math.min(1, ink[1][k]) * 255);
    data[k * 4 + 2] = Math.round(Math.min(1, ink[2][k]) * 255);
    data[k * 4 + 3] = Math.round(order[k] * 255);
  }
  return { width: W, height: H, data };
}

/**
 * Tileable noise lookup texture, so shaders sample noise instead of computing it.
 *   R = 4-octave fbm, G = single-octave value noise (both 8 cells per tile),
 *   B = fbm with another seed.
 */
export function generateNoise(size = 256, seed = 11): RGBAImage {
  const data = new Uint8Array(size * size * 4);
  const fbm = (x: number, y: number, s: number) => {
    let v = 0, a = 0.5, f = 8;
    for (let o = 0; o < 4; o++) {
      v += a * periodicNoise((x / size) * f, (y / size) * f, f, s + o * 13);
      a *= 0.5;
      f *= 2;
    }
    return v / 0.9375;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      data[i] = Math.round(fbm(x, y, seed) * 255);
      data[i + 1] = Math.round(periodicNoise((x / size) * 8, (y / size) * 8, 8, seed + 101) * 255);
      data[i + 2] = Math.round(fbm(x, y, seed + 57) * 255);
      data[i + 3] = 255;
    }
  }
  return { width: size, height: size, data };
}
