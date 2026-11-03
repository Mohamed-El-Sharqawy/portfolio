/** Pre-rendered baseline: attach sources only when the video scrolls into view, after load. */
const vids = [...document.querySelectorAll<HTMLVideoElement>('video[data-lazy]')];
const motion = matchMedia('(prefers-reduced-motion: reduce)');

const seen = new Set<HTMLVideoElement>();

function start() {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const v = e.target as HTMLVideoElement;
        if (e.isIntersecting && !v.src && !v.children.length) {
          for (const [type, src] of [
            ['video/webm', v.dataset.webm],
            ['video/mp4', v.dataset.mp4],
          ]) {
            const s = document.createElement('source');
            s.type = type!;
            s.src = src!;
            v.append(s);
          }
          v.addEventListener('playing', () => v.parentElement?.setAttribute('data-live', ''), {
            once: true,
          });
          v.load();
        }
        if (e.isIntersecting) seen.add(v);
        else seen.delete(v);
        if (e.isIntersecting && !document.hidden) v.play().catch(() => {});
        else v.pause();
      }
    },
    { rootMargin: '120px' },
  );
  vids.forEach((v) => io.observe(v));
  document.addEventListener('visibilitychange', () =>
    vids.forEach((v) => (document.hidden || !seen.has(v) ? v.pause() : v.play().catch(() => {}))),
  );
}

if (vids.length && !motion.matches) {
  const idle = () =>
    'requestIdleCallback' in window
      ? requestIdleCallback(start, { timeout: 2500 })
      : setTimeout(start, 300);
  if (document.readyState === 'complete') idle();
  else addEventListener('load', idle, { once: true });
}
