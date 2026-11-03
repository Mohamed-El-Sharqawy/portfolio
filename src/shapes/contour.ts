/**
 * Build-time generator for the contour-line blob: a noise-displaced sphere sliced
 * into rings, tilted and projected orthographically. Runs only during `astro build`;
 * the browser receives a static SVG referenced by <use> (zero JS, inherits currentColor,
 * and unlike an <img>, mask or background image it is never an LCP candidate).
 */
import { noise3 } from './noise';

export function contourSvg(rings = 26, pts = 44): string {
  const tx = 0.55;
  const tz = -0.35;
  const [cx, sx, cz, sz] = [Math.cos(tx), Math.sin(tx), Math.cos(tz), Math.sin(tz)];
  const paths: string[] = [];
  for (let r = 0; r < rings; r++) {
    const phi = -1.45 + (2.9 * (r + 0.5)) / rings;
    const ring: [number, number][] = [];
    for (let k = 0; k < pts; k++) {
      const th = (k / pts) * Math.PI * 2;
      let x = Math.cos(phi) * Math.cos(th);
      let y = Math.sin(phi);
      let z = Math.cos(phi) * Math.sin(th);
      const d = 0.78 + 0.34 * noise3(x * 1.6 + 3, y * 1.6 + 1, z * 1.6 + 7);
      x *= d;
      y *= d;
      z *= d;
      // tilt around X, then Z
      const y1 = y * cx - z * sx;
      const x2 = x * cz - y1 * sz;
      const y2 = x * sz + y1 * cz;
      ring.push([500 + x2 * 430, 500 - y2 * 430]);
    }
    // Closed smooth curve: quadratic segments through midpoints.
    const mid = (a: [number, number], b: [number, number]) =>
      `${((a[0] + b[0]) / 2).toFixed(0)} ${((a[1] + b[1]) / 2).toFixed(0)}`;
    let d = `M${mid(ring[pts - 1]!, ring[0]!)}`;
    for (let k = 0; k < pts; k++) {
      const p = ring[k]!;
      d += `Q${p[0].toFixed(0)} ${p[1].toFixed(0)} ${mid(p, ring[(k + 1) % pts]!)}`;
    }
    paths.push(d + 'Z');
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><path id="c" fill="none" stroke="currentColor" stroke-width="2.6" d="${paths.join('')}"/></svg>`;
}
