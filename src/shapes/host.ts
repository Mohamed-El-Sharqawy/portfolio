/**
 * Main-thread host for worker-rendered shapes. Its whole job is to stay out of the way:
 * - does nothing until `load` + idle, so it can't touch FCP/LCP/TBT;
 * - spins the worker up only when a shape first scrolls into view;
 * - canvas pixels are never LCP candidates, so a live shape can't become the LCP element;
 * - reduced motion: the worker paints one still frame and stops;
 * - no OffscreenCanvas / no WebGL: shows the AVIF poster instead (after load);
 * - forwards visibility (IntersectionObserver, tab hidden) so the worker loop can stop.
 */
const poster = (el: HTMLElement) => {
  const src = el.dataset.poster;
  if (!src || el.querySelector('img')) return;
  const img = new Image();
  img.alt = '';
  img.decoding = 'async';
  img.src = src;
  el.prepend(img);
};

export function mount(kind: string, make: () => Worker) {
  const els = [...document.querySelectorAll<HTMLElement>(`[data-shape="${kind}"]`)];
  if (!els.length) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');

  let worker: Worker | undefined;
  const added = new Set<HTMLElement>();
  const post = (m: object, t?: Transferable[]) => worker?.postMessage(m, t ?? []);

  const add = (el: HTMLElement, id: number) => {
    if (!worker) {
      worker = make();
      worker.onmessage = (e) => {
        const d = e.data;
        if (d.t === 'live') els[d.id]?.setAttribute('data-live', '');
        else if (d.t === 'fail') els.forEach(poster);
      };
      document.addEventListener('visibilitychange', () => post({ t: 'page', v: !document.hidden }));
      motion.addEventListener('change', () => post({ t: 'page', v: !motion.matches }));
    }
    const mobile = matchMedia('(max-width: 640px)').matches;
    const c = document.createElement('canvas');
    el.append(c);
    const off = c.transferControlToOffscreen();
    post(
      {
        t: 'add',
        id,
        c: off,
        w: el.clientWidth,
        h: el.clientHeight,
        dpr: Math.min(devicePixelRatio || 1, mobile ? 1 : 1.5),
        opt: { ...el.dataset, mobile: mobile ? '1' : '', still: motion.matches ? '1' : '' },
      },
      [off],
    );
    new ResizeObserver(() =>
      post({ t: 'size', id, w: el.clientWidth, h: el.clientHeight }),
    ).observe(el);
    added.add(el);
  };

  const start = () => {
    if (!('transferControlToOffscreen' in HTMLCanvasElement.prototype)) return els.forEach(poster);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const el = e.target as HTMLElement;
          const id = els.indexOf(el);
          if (e.isIntersecting && !added.has(el)) add(el, id);
          post({ t: 'vis', id, v: e.isIntersecting });
        }
      },
      { rootMargin: '120px' },
    );
    els.forEach((el) => io.observe(el));
  };

  const idle = () =>
    'requestIdleCallback' in window
      ? requestIdleCallback(start, { timeout: 2500 })
      : setTimeout(start, 300);
  if (document.readyState === 'complete') idle();
  else addEventListener('load', idle, { once: true });
}
