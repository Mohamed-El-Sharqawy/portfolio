/**
 * Worker-side frame loop shared by every animated candidate.
 * - One loop per worker drives all instances of that candidate.
 * - Frame rate capped (default 30 fps); the loop stops entirely while nothing is
 *   visible or the tab is hidden, and restarts on the next visibility message.
 */
export interface Inst<S = unknown> {
  id: number;
  c: OffscreenCanvas;
  w: number;
  h: number;
  dpr: number;
  opt: Record<string, string | undefined>;
  vis: boolean;
  drawn: boolean;
  s: S;
  ms: number;
  n: number;
}

export interface Renderer<S> {
  init(i: Inst<S>): S;
  frame(i: Inst<S>, t: number, dt: number): void;
  resize?(i: Inst<S>): void;
}

type Msg =
  | {
      t: 'add';
      id: number;
      c: OffscreenCanvas;
      w: number;
      h: number;
      dpr: number;
      opt: Record<string, string | undefined>;
    }
  | { t: 'vis'; id: number; v: boolean }
  | { t: 'page'; v: boolean }
  | { t: 'size'; id: number; w: number; h: number };

export function run<S>(r: Renderer<S>, fps = 30) {
  const all = new Map<number, Inst<S>>();
  const gap = 1000 / fps;
  const raf: (cb: (t: number) => void) => unknown =
    'requestAnimationFrame' in self
      ? (cb) => self.requestAnimationFrame(cb)
      : (cb) => setTimeout(() => cb(performance.now()), gap);
  let page = true;
  let running = false;
  let last = 0;
  let stat = 0;

  const size = (i: Inst<S>) => {
    i.c.width = Math.max(1, Math.round(i.w * i.dpr));
    i.c.height = Math.max(1, Math.round(i.h * i.dpr));
    r.resize?.(i);
  };

  const tick = (now: number) => {
    const live = page ? [...all.values()].filter((i) => i.vis) : [];
    if (!live.length) {
      running = false;
      return;
    }
    raf(tick);
    if (now - last < gap - 2) return;
    const dt = Math.min(0.1, last ? (now - last) / 1000 : 1 / fps);
    last = now;
    for (const i of live) {
      const a = performance.now();
      const k = Number(i.opt.slow) || 1; // lab capture only: slow-motion time scale
      r.frame(i, (now / 1000) * k, dt * k);
      i.ms += performance.now() - a;
      i.n++;
      if (!i.drawn) {
        i.drawn = true;
        self.postMessage({ t: 'live', id: i.id });
      }
      // Reduced motion: keep the first frame as the static frame and stop.
      if (i.opt.still) i.vis = false;
    }
    // Opt-in cost probe for the lab (data-probe on the element).
    if (now - stat > 2000) {
      stat = now;
      for (const i of live)
        if (i.opt.probe !== undefined) self.postMessage({ t: 'stat', ms: i.ms / i.n, n: i.n });
    }
  };

  const wake = () => {
    if (running) return;
    running = true;
    last = 0;
    raf(tick);
  };

  self.onmessage = (e: MessageEvent<Msg>) => {
    const m = e.data;
    if (m.t === 'add') {
      const i = { ...m, vis: false, drawn: false, ms: 0, n: 0 } as unknown as Inst<S>;
      size(i);
      i.s = r.init(i);
      all.set(m.id, i);
    } else if (m.t === 'vis') {
      const i = all.get(m.id);
      if (i && !(i.opt.still && i.drawn)) i.vis = m.v;
    } else if (m.t === 'size') {
      const i = all.get(m.id);
      if (i) {
        i.w = m.w;
        i.h = m.h;
        size(i);
      }
    } else page = m.v;
    wake();
  };
}
