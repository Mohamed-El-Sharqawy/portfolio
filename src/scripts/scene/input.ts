import Lenis from 'lenis';
import { Vector2 } from 'three';

/**
 * Scroll (Lenis), mouse look and gyroscope look.
 * look.x / look.y are normalised targets in [-1, 1]; main.ts eases toward them
 * and converts them to the look range in config.ts.
 */
export function createInput(opts: { reducedMotion: boolean; canvas: HTMLCanvasElement }) {
  const lenis = new Lenis({
    autoRaf: false,
    lerp: opts.reducedMotion ? 1 : 0.1,
    smoothWheel: !opts.reducedMotion,
    wheelMultiplier: 0.85,
    touchMultiplier: 1.3,
  });

  const state = {
    progress: 0,
    /** Pointer in NDC, for raycasting. */
    pointer: new Vector2(-10, -10),
    pointerDirty: false,
    pointerType: 'mouse',
    look: new Vector2(0, 0),
    gyro: false,
    /** Whether a touch drag should turn the view (main.ts turns it off where drags scroll something). */
    dragLook: () => true,
    /** Whether a vertical touch drag tilts the view (rooms; in the corridor it walks). */
    dragPitch: () => false,
  };

  lenis.on('scroll', (l: Lenis) => {
    state.progress = Number.isFinite(l.progress) ? l.progress : 0;
  });

  const onPointer = (e: PointerEvent) => {
    state.pointerType = e.pointerType;
    state.pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    state.pointerDirty = true;
    if (e.pointerType === 'mouse' && !state.gyro) state.look.copy(state.pointer);
  };
  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('pointerdown', onPointer, { passive: true });
  document.documentElement.addEventListener('pointerleave', (e) => {
    // a finger lifting off also "leaves": the view must stay where it was turned
    if (e.pointerType === 'mouse') state.look.set(0, 0);
    state.pointer.set(-10, -10);
    state.pointerDirty = true;
  });

  // ---- Touch: horizontal drag on the scene looks left/right ----
  // (vertical drags still scroll natively thanks to touch-action: pan-y)
  let drag: { id: number; x: number; y: number; look: number; lookY: number } | null = null;
  opts.canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, look: state.look.x, lookY: state.look.y };
  });
  opts.canvas.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id || state.gyro || !state.dragLook()) return;
    // dragging across ~60% of the screen width turns the full range
    // a full-width drag turns the whole range; the view stays where you leave it
    state.look.x = Math.max(-1, Math.min(1, drag.look - (e.clientX - drag.x) / (window.innerWidth * 0.9)));
    if (state.dragPitch()) state.look.y = Math.max(-1, Math.min(1, drag.lookY + (e.clientY - drag.y) / (window.innerHeight * 0.5)));
  });
  const endDrag = (e: PointerEvent) => {
    if (drag && e.pointerId === drag.id) drag = null;
  };
  opts.canvas.addEventListener('pointerup', endDrag);
  opts.canvas.addEventListener('pointercancel', endDrag);

  // ---- Gyroscope (mobile) ----
  let base: { beta: number; gamma: number } | null = null;
  const clamp = (v: number) => Math.max(-1, Math.min(1, v));
  const onOrientation = (e: DeviceOrientationEvent) => {
    if (e.beta == null || e.gamma == null) return;
    if (!base) base = { beta: e.beta, gamma: e.gamma };
    state.gyro = true;
    // ±30° of tilt maps to the full look range.
    state.look.set(clamp((e.gamma - base.gamma) / 30), clamp(-(e.beta - base.beta) / 30));
  };

  function setupGyro(button: HTMLButtonElement | null) {
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    if (!coarse || !('DeviceOrientationEvent' in window)) return;
    const DOE = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<'granted' | 'denied'> };
    if (typeof DOE.requestPermission === 'function') {
      // iOS 13+: permission must be requested from a user gesture.
      if (!button) return;
      button.hidden = false;
      button.addEventListener(
        'click',
        async () => {
          try {
            if ((await DOE.requestPermission!()) === 'granted') window.addEventListener('deviceorientation', onOrientation);
          } catch {
            /* user declined */
          }
          button.hidden = true;
        },
        { once: true },
      );
    } else {
      window.addEventListener('deviceorientation', onOrientation);
    }
  }

  /** Recentre the view and the gyro baseline (e.g. after leaving a room). */
  const recenter = () => {
    base = null;
    if (state.pointerType !== 'mouse') state.look.set(0, 0); // new place, face it straight on
  };

  return { lenis, state, setupGyro, recenter };
}
export type Input = ReturnType<typeof createInput>;
