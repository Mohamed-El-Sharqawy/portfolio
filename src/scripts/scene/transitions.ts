import gsap from 'gsap';
import { CatmullRomCurve3, Vector3, type Vector2 } from 'three';
import type { OutlineMaterial, SketchMaterial } from './materials';

/** All GSAP choreography: intro tear, door swing, camera walks, hover effects. */

/* ---------------- intro: paper tear ---------------- */

function jaggedEdge(W: number, H: number) {
  // Jagged vertical tear: low-frequency drift + high-frequency fibre noise.
  const pts: Array<[number, number]> = [];
  const steps = 90;
  const phase = Math.random() * 10;
  for (let i = 0; i <= steps; i++) {
    const y = (i / steps) * H;
    const drift = Math.sin(y * 0.006 + phase) * W * 0.05 + Math.sin(y * 0.017 + phase * 2) * W * 0.02;
    const jag = (Math.random() - 0.5) * Math.min(28, W * 0.03);
    pts.push([W * 0.5 + drift + jag, y]);
  }
  return pts;
}

/**
 * Rips the intro sheet in two along a noise edge and pulls the halves apart.
 * Each half is a copy of the sheet clipped by an SVG <clipPath>; GSAP moves them.
 */
export function tearIntro(reduced: boolean): Promise<void> {
  const intro = document.getElementById('intro');
  const sheet = document.getElementById('intro-sheet');
  if (!intro || !sheet) return Promise.resolve();
  if (reduced) {
    intro.remove();
    return Promise.resolve();
  }

  const W = window.innerWidth;
  const H = window.innerHeight;
  const edge = jaggedEdge(W, H);
  const fwd = edge.map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const rev = [...edge].reverse().map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');

  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.position = 'absolute';
  svg.innerHTML = `<defs>
    <clipPath id="tear-left" clipPathUnits="userSpaceOnUse"><path d="M0 0 ${fwd} L0 ${H} Z"/></clipPath>
    <clipPath id="tear-right" clipPathUnits="userSpaceOnUse"><path d="M${W} 0 L${W} ${H} ${rev} Z"/></clipPath>
  </defs>`;
  document.body.appendChild(svg);

  const makeHalf = (clip: string) => {
    const wrap = document.createElement('div');
    wrap.className = 'intro-tear';
    // drop-shadow on the wrapper so the torn edge casts a soft shadow (the clip lives on the child)
    wrap.style.filter = 'drop-shadow(0 0 1.5px rgba(43,43,43,.35)) drop-shadow(0 6px 10px rgba(43,43,43,.12))';
    const copy = sheet.cloneNode(true) as HTMLElement;
    copy.removeAttribute('id');
    copy.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
    copy.querySelectorAll<SVGElement>('text, path').forEach((n) => (n.style.animation = 'none'));
    copy.querySelectorAll<SVGElement>('text').forEach((n) => {
      n.style.strokeDashoffset = '0';
      n.style.fillOpacity = '1';
    });
    copy.querySelectorAll<SVGElement>('.intro__underline').forEach((n) => (n.style.strokeDashoffset = '0'));
    copy.querySelector('.intro__loader')?.remove();
    copy.style.clipPath = `url(#${clip})`;
    wrap.appendChild(copy);
    document.body.appendChild(wrap);
    return wrap;
  };

  return new Promise((resolve) => {
    // Let the hand-lettering finish drawing before ripping (min ~1.9 s after navigation).
    const wait = Math.max(0, 1900 - performance.now()) / 1000;
    gsap.delayedCall(wait, () => {
      const left = makeHalf('tear-left');
      const right = makeHalf('tear-right');
      intro.remove();
      const tl = gsap.timeline({
        onComplete: () => {
          left.remove();
          right.remove();
          svg.remove();
          resolve();
        },
      });
      tl.to([left, right], { x: (i) => (i ? 6 : -6), rotation: (i) => (i ? 0.6 : -0.6), duration: 0.12, ease: 'power1.out' })
        .to(left, { xPercent: -75, yPercent: 8, rotation: -9, transformOrigin: '0% 100%', duration: 1.05, ease: 'power3.in' }, '+=0.08')
        .to(right, { xPercent: 75, yPercent: 10, rotation: 8, transformOrigin: '100% 100%', duration: 1.05, ease: 'power3.in' }, '<0.04')
        .to([left, right], { opacity: 0, duration: 0.3 }, '-=0.3');
    });
  });
}

/* ---------------- doors + camera ---------------- */

/** `pace` > 1 speeds the move up (nav-link jumps use a fast pace). */
export function swingDoor(pivot: { rotation: { y: number } }, open: boolean, reduced: boolean, delay = 0, pace = 1) {
  return gsap.to(pivot.rotation, {
    y: open ? 1.45 : 0,
    duration: reduced ? 0 : (open ? 1.1 : 0.9) / pace,
    delay: reduced ? 0 : delay,
    ease: open ? 'power2.inOut' : 'power3.inOut',
    overwrite: true,
  });
}

/**
 * Camera state for scripted moves. Orientation is yaw/pitch (no roll), so turns
 * interpolate as angles — never through a look-at point that could pass
 * through the camera.
 */
export interface CameraRig { pos: Vector3; yaw: number; pitch: number }
export interface Heading { yaw: number; pitch: number }

const TAU = Math.PI * 2;
const wrap = (a: number) => a - TAU * Math.floor((a + Math.PI) / TAU);
export const lerpAngle = (a: number, b: number, t: number) => a + wrap(b - a) * t;
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Yaw/pitch for a camera at `from` looking at `to` (yaw 0 looks down -z). */
export function headingTo(from: Vector3, to: Vector3): Heading {
  const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
  return { yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) };
}

/** Turn on the spot to a heading (a person turning their head + body). */
function turnTo(rig: CameraRig, to: Heading, reduced: boolean, pace = 1): Promise<void> {
  const diff = Math.abs(wrap(to.yaw - rig.yaw)) + Math.abs(to.pitch - rig.pitch);
  if (reduced || diff < 0.02) {
    rig.yaw = to.yaw;
    rig.pitch = to.pitch;
    return Promise.resolve();
  }
  const from = { yaw: rig.yaw, pitch: rig.pitch };
  const s = { t: 0 };
  return new Promise((resolve) => {
    gsap.to(s, {
      t: 1,
      // ~1.3 s for a full about-turn; sine easing keeps the peak turn rate low
      duration: (0.5 + 0.8 * Math.min(1, diff / Math.PI)) / pace,
      ease: 'sine.inOut',
      onUpdate: () => {
        rig.yaw = lerpAngle(from.yaw, to.yaw, s.t);
        rig.pitch = from.pitch + (to.pitch - from.pitch) * s.t;
      },
      onComplete: resolve,
    });
  });
}

const WALK_SPEED = 2.1; // m/s

/**
 * Walk the camera along a smooth curve through `waypoints`, ending with a
 * view of `lookAt`. One continuous eased move (no velocity jumps between
 * legs). While walking the camera faces along the path, like a person does;
 * it blends from the starting view into that and, near the end, into the
 * final view. If the path starts behind or beside the current view, the
 * camera turns on the spot first.
 */
export async function walkCamera(
  rig: CameraRig,
  waypoints: Vector3[],
  lookAt: Vector3,
  opts: { reduced: boolean; pace?: number; onProgress?: (u: number) => void },
): Promise<void> {
  const end = headingTo(waypoints[waypoints.length - 1], lookAt);
  if (opts.reduced) {
    rig.pos.copy(waypoints[waypoints.length - 1]);
    rig.yaw = end.yaw;
    rig.pitch = end.pitch;
    opts.onProgress?.(1);
    return;
  }

  const pace = opts.pace ?? 1;
  const curve = new CatmullRomCurve3([rig.pos.clone(), ...waypoints], false, 'centripetal');
  const ahead = new Vector3();
  const p = new Vector3();

  // Turn first if the first steps go somewhere we aren't facing.
  curve.getPointAt(Math.min(1, 0.6 / curve.getLength()), ahead);
  const firstStep = headingTo(rig.pos, ahead);
  if (Math.abs(wrap(firstStep.yaw - rig.yaw)) > 1.0) await turnTo(rig, { yaw: firstStep.yaw, pitch: 0 }, false, pace);

  const start: Heading = { yaw: rig.yaw, pitch: rig.pitch };
  const length = curve.getLength();
  const duration = Math.min(3.4, Math.max(1.3, length / WALK_SPEED)) / pace;
  const lookAhead = Math.min(0.35, 1.2 / length); // look ~1.2 m ahead along the path
  const endPoint = curve.getPointAt(1);
  const endTangent = curve.getTangentAt(1);
  const s = { u: 0 };

  return new Promise((resolve) => {
    gsap.to(s, {
      u: 1,
      duration,
      ease: 'power2.inOut',
      onUpdate: () => {
        const u = s.u;
        curve.getPointAt(u, p);
        rig.pos.copy(p);
        // Look a little ahead along the path; past the end, keep going along the
        // final tangent so the heading stays continuous (no switch-over jump).
        const ua = u + lookAhead;
        if (ua <= 1) curve.getPointAt(ua, ahead);
        else ahead.copy(endPoint).addScaledVector(endTangent, (ua - 1) * length);
        const walk = headingTo(p, ahead);
        walk.pitch = 0;
        const a = smoothstep(0, 0.25, u);
        const b = smoothstep(0.5, 1, u);
        rig.yaw = lerpAngle(lerpAngle(start.yaw, walk.yaw, a), end.yaw, b);
        rig.pitch = start.pitch + (0 - start.pitch) * a;
        rig.pitch += (end.pitch - rig.pitch) * b;
        opts.onProgress?.(u);
      },
      onComplete: () => resolve(),
    });
  });
}

/* ---------------- hover effects ---------------- */

export function glow(mat: OutlineMaterial, on: boolean) {
  gsap.to(mat.uniforms.uHover, { value: on ? 1 : 0, duration: on ? 0.35 : 0.5, ease: 'power2.out', overwrite: true });
}

/** Paint reveal: watercolor spreads from `uv` (expanding noise mask). */
export function paint(mats: SketchMaterial[], uv: Vector2 | null, on: boolean, reduced: boolean) {
  for (const m of mats) {
    const u = m.uniforms;
    if (on && uv) u.uPaintUV.value.copy(uv);
    gsap.to(u.uPaint, {
      value: on ? 1.6 : 0,
      // quick, snappy spread (most of the colour lands in the first ~0.25 s)
      duration: reduced ? 0 : on ? 0.5 : 0.35,
      ease: on ? 'power3.out' : 'power2.in',
      overwrite: true,
    });
  }
}
