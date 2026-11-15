/**
 * Initial (tiny) JS bundle. It must never import three.js statically:
 * the scene is loaded with a dynamic import() during idle time after first paint,
 * and only when a real WebGL2 context can be created.
 */
const root = document.documentElement;
const reducedMotion = root.classList.contains('rm');

/**
 * True only for hardware-accelerated WebGL2. Software rasterizers (SwiftShader,
 * llvmpipe — e.g. no GPU, blocklisted drivers, headless browsers) can't draw the
 * corridor smoothly, so those visitors get the HTML version. ?force3d overrides.
 */
function hasWebGL2(): boolean {
  try {
    const force = /[?&]force3d\b/.test(location.search);
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2', force ? {} : { failIfMajorPerformanceCaveat: true });
    if (!gl) return false;
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const name = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    const software = /swiftshader|llvmpipe|softpipe|software|microsoft basic render/i.test(name);
    return force || !software;
  } catch {
    return false;
  }
}

/** Show the plain HTML page. */
function fallback(reason: unknown) {
  if (reason) console.warn('[portfolio] 3D disabled:', reason);
  root.classList.remove('try-3d', 'is-3d');
  root.classList.add('flat');
  document.getElementById('intro')?.remove();
}

function idle(cb: () => void) {
  if ('requestIdleCallback' in window) window.requestIdleCallback(cb, { timeout: 2000 });
  else setTimeout(cb, 120);
}

/* ---------- 3D ⇄ plain toggle ---------- */
const VIEW_KEY = 'portfolio-view';
const toggle = document.getElementById('view-toggle') as HTMLAnchorElement | null;
function showToggle(to: 'flat' | '3d') {
  if (!toggle) return;
  toggle.textContent = to === 'flat' ? 'Plain version' : '3D version';
  toggle.href = to === 'flat' ? '?flat' : '?3d';
  toggle.hidden = false;
  toggle.onclick = () => {
    try {
      if (to === 'flat') localStorage.setItem(VIEW_KEY, 'flat');
      else localStorage.removeItem(VIEW_KEY);
    } catch {
      /* storage unavailable: the URL parameter still switches */
    }
  };
}

if (root.classList.contains('flat-choice')) {
  // Plain by choice: offer the way back, but only where 3D can actually run.
  idle(() => hasWebGL2() && showToggle('3d'));
} else if (root.classList.contains('try-3d')) {
  // Wait for first paint, then idle time, then pull in the scene chunk.
  requestAnimationFrame(() =>
    idle(() => {
      if (!hasWebGL2()) return fallback('no WebGL2');
      const safety = window.setTimeout(() => fallback('scene timed out'), 25000);
      import('./scene/main')
        .then((m) => m.start({ reducedMotion }))
        .then(() => {
          window.clearTimeout(safety);
          showToggle('flat');
        })
        .catch((err) => {
          window.clearTimeout(safety);
          fallback(err);
        });
    }),
  );
}
