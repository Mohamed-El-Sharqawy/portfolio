import { ColorManagement, LinearSRGBColorSpace, NoToneMapping, PerspectiveCamera, WebGLRenderer } from 'three';
import { COLORS } from './config';

export type Quality = 'high' | 'low';

/** Low-end check from CPU cores and device memory (Chrome/Edge expose deviceMemory). */
export function detectQuality(): Quality {
  const cores = navigator.hardwareConcurrency ?? 8;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  return cores <= 4 || memory <= 4 ? 'low' : 'high';
}

export function createRenderer(canvas: HTMLCanvasElement, quality: Quality) {
  // Every colour in the scene is authored in display (sRGB) space and written
  // through untouched, so #fafafa in CSS and in WebGL match exactly.
  ColorManagement.enabled = false;

  const deviceDpr = window.devicePixelRatio || 1;
  const maxDpr = Math.min(deviceDpr, quality === 'high' ? 1.75 : 1.25);
  const minDpr = Math.min(maxDpr, quality === 'high' ? 1 : 0.75);

  const renderer = new WebGLRenderer({
    canvas,
    // MSAA is wasted fill-rate on dense screens; only use it at ~1x.
    antialias: quality === 'high' && deviceDpr < 1.5,
    alpha: false,
    stencil: false,
    depth: true,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = LinearSRGBColorSpace;
  renderer.toneMapping = NoToneMapping;
  renderer.setClearColor(COLORS.paper, 1);

  let dpr = maxDpr;
  let cam: PerspectiveCamera | null = null;

  const applySize = (camera: PerspectiveCamera) => {
    cam = camera;
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 0.8 ? 74 : 60;
    camera.updateProjectionMatrix();
  };

  /*
   * Adaptive resolution: watch the interval between consecutive rendered
   * frames. If it stays well above the display's refresh interval, step the
   * pixel ratio down; if there's lots of headroom for a while, step back up.
   */
  let refresh = 1000 / 60;
  let ema = refresh;
  let slow = 0;
  let fast = 0;
  let cooldownUntil = 0;
  const samples: number[] = [];

  function sampleFrame(intervalMs: number, now: number) {
    if (intervalMs <= 0 || intervalMs > 250) return;
    if (samples.length < 40) {
      samples.push(intervalMs);
      if (samples.length === 40) refresh = Math.max(6, [...samples].sort((a, b) => a - b)[8]);
      return;
    }
    ema += (intervalMs - ema) * 0.1;
    if (now < cooldownUntil) return;
    if (ema > refresh * 1.45) {
      fast = 0;
      if (++slow > 45 && dpr > minDpr) {
        dpr = Math.max(minDpr, +(dpr - 0.25).toFixed(2));
        if (cam) applySize(cam);
        slow = 0;
        cooldownUntil = now + 1500;
      }
    } else if (ema < refresh * 1.08) {
      slow = 0;
      if (++fast > 300 && dpr < maxDpr) {
        dpr = Math.min(maxDpr, +(dpr + 0.25).toFixed(2));
        if (cam) applySize(cam);
        fast = 0;
        cooldownUntil = now + 4000;
      }
    } else {
      slow = Math.max(0, slow - 1);
      fast = 0;
    }
  }

  return { renderer, applySize, sampleFrame };
}
