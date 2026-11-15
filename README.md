# Mohamed Ahmed — Interactive 3D Portfolio

A hand-drawn sketchbook corridor you walk through by scrolling. Built with Astro
(static output), TypeScript, plain Three.js, GSAP, Lenis and custom GLSL shaders.

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # astro check + static build → dist/
npm run preview
npm run assets     # regenerate fonts / KTX2 textures / glTF models / OG image (Node 22.18+)
```

Generated assets are committed, so `npm run assets` is only needed after changing
`scripts/build-assets.mjs` or `src/scripts/scene/texgen.ts`.

## How it loads

1. **HTML first.** All content is semantic HTML from Content Collections. The only
   initial JS is `boot.ts` + the FAQ enhancement (~3 KB). No Three.js.
2. An inline head script adds `.try-3d` when WebGL2 exists, which shows the paper intro.
3. After first paint, `boot.ts` waits for `requestIdleCallback`, confirms a
   **hardware-accelerated** WebGL2 context, then `import()`s `scene/main.ts`.
4. The scene loads its textures/models (progress bar), switches the page to
   `.is-3d` (sections become overlay panels), and the paper tears open.
5. Rooms (code + assets) load lazily as you approach each door.

Visitors with no WebGL2, a software renderer (SwiftShader/llvmpipe), no JS, or
`?flat` get the full HTML page. `?force3d` forces the 3D layer (for testing in
headless browsers).

## Structure

```
astro.config.mjs            static output, sitemap, vite-plugin-glsl, inlined CSS
scripts/build-assets.mjs    fonts subset, KTX2 encode, glTF+Meshopt, project sketches, avatar atlases, OG image
scripts/avatar-frames.mjs   the avatar drawing (SVG, frame by frame)
scripts/cat-frames.mjs      the entrance cat (SVG, frame by frame)
public/
  fonts/                    caveat-700.woff2, inter-var.woff2 (WOFF2 subsets)
  textures/                 paper.ktx2, strokes.ktx2, projects/*.ktx2
  models/                   easel.glb, frame.glb, desk.glb (Meshopt + quantized)
  og.png, favicon.svg, robots.txt
src/
  content.config.ts         typed schemas
  content/{projects,experience,education,faq}/*.json
  data/profile.ts           About + Contact, SEO strings, door order
  layouts/Base.astro        head, fonts, OG, JSON-LD Person
  components/               Intro, SceneUI, About, Projects, Experience, Education, Faq, Contact
  pages/index.astro
  styles/global.css         both layouts (HTML page / 3D panels)
  scripts/
    boot.ts                 WebGL2 check + idle dynamic import
    ui/faq.ts               <details> accordion enhancement
    ui/overlays.ts          panels, Back/Esc, project detail <dialog>
    scene/
      main.ts               wiring, state machine, render-on-demand loop
      renderer.ts           renderer, DPR cap 1.75, low-end detection
      camera-path.ts        CatmullRomCurve3 + scroll → pose
      corridor.ts           corridor geometry, easel, FAQ board
      doors.ts              doors, signs, glow outlines
      rooms/                index (lazy loader), shell, projects, experience, education, contact
      input.ts              Lenis, mouse look, gyroscope (+ iOS permission)
      transitions.ts        GSAP: paper tear, door swing, camera walks, paint, glow
      avatar.ts             hand-drawn waving avatar (flipbook sprite)
      props.ts              furniture + accessories scattered along the corridor
      entrance.ts           outside of the building + the front door you click to enter
      materials.ts          sketch/outline materials, distance-driven uProgress
      assets.ts             KTX2Loader, GLTFLoader (+Meshopt, Draco), caching
      sketch-canvas.ts      hand-lettered canvas textures
      texgen.ts             procedural paper + stroke atlas (shared with the build script)
      config.ts             layout + palette
      shaders/              sketch, outline, avatar (.vert/.frag), noise.glsl
```

## Notes

- **Sketch shader:** the stroke atlas stores three hatching layers in RGB and a
  per-stroke draw order in alpha. `uProgress` (rising as the camera approaches)
  reveals strokes whose id is under a noisy threshold, so drawings sketch themselves.
- **Paint reveal:** on hover, `uPaint` is tweened by GSAP and watercolor spreads from
  the raycast UV through an fbm-distorted radius, under the pencil lines.
- **Camera moves:** room entries/exits are one continuous eased walk along a
  Catmull-Rom curve at walking pace; orientation is yaw/pitch (no roll), facing
  along the path and blending into the final view. Nav links first walk you down
  the corridor (by scrolling Lenis), then through the door.
- **Entrance:** you start outside the building (`scene/entrance.ts`): sketched
  brick façade, a hanging PORTFOLIO sign, a double door covered in tech-stack
  stickers (wood + stickers paint themselves on hover), a window where the avatar
  pops up and waves, a tree with a swinging computer mouse, a cat (flipbook from
  `scripts/cat-frames.mjs`), a planter with a rubber duck, a ladybug and a stone
  path. Click the door (or the "come in" card, scroll, ↓/Space, or a nav link)
  to walk in. Sticker list: `STICKERS` in `entrance.ts`.
- **Avatar:** a hand-drawn flipbook sprite (`scene/avatar.ts`), 16 frames
  generated by `scripts/avatar-frames.mjs` into two 4×4 KTX2 atlases (pencil +
  painted). It turns to face you, idles with a hand-drawn line boil, waves when
  you approach / now and then / on hover, and paints itself on hover. One greets
  you at the easel, one waves goodbye at the FAQ board. To make it look like you,
  edit the colours and shapes in `avatar-frames.mjs` and run `npm run assets`.
- **Corridor props:** furniture and accessories (`scene/props.ts`, models in
  `public/models/props.glb`, built by `buildProps()` in the asset script): benches,
  chairs, plants, side tables with lamps, bookshelves, a coat rack, bins, rugs,
  framed wall doodles and floating paper planes / pencils / mugs. Placement is
  seeded-random (change `SEED` for a new layout) and keeps clear of doors, the
  easel and the FAQ board. Everything paints itself on hover.
- **Look around:** mouse position (desktop), horizontal drag (touch) or gyroscope
  turn the view up to ±40° left/right and ±12° up/down (`config.ts`).
- **Panels:** every overlay has a × button; a "Show …" button next to Back
  reopens it. Closing a room's panel also re-frames the camera to the full room.
- **One ticker:** Lenis, GSAP tweens, camera and rendering all run in
  `gsap.ticker`, so the camera is never drawn a frame behind a tween.
- **Performance:** render on demand (idle = no frames), loop stops when the tab
  is hidden, adaptive pixel ratio (steps down when frames run long, back up when
  there's headroom; capped at 1.75), MSAA only on ~1x screens, shader noise
  from a lookup texture, static world matrices, flat non-recursive raycasts, and
  rooms' textures/programs warmed on the GPU before you reach them.
- **Text in 3D** (signs, cards, certificates, letter) is drawn to canvas textures
  from the HTML's data attributes, so content isn't duplicated in JS.
- Caveat's contextual alternates (`calt`) are dropped from the subset to halve
  the font (≈18 KB).
