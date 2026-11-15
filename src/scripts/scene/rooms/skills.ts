import {
  BoxGeometry, BufferGeometry, Color, Float32BufferAttribute, Group, Line, LineBasicMaterial, LineDashedMaterial, Mesh,
  MeshBasicMaterial, PlaneGeometry, Quaternion, ShaderMaterial, SphereGeometry, Vector3,
  type Camera, type Object3D,
} from 'three';
import gsap from 'gsap';
import { COLORS } from '../config';
import { avatarMaterial, sketchMaterial } from '../materials';
import { canvasTexture, handText, INK, TERRA } from '../sketch-canvas';
import { tagInteractive } from '../corridor';
import { createAvatar } from '../avatar';
import { rng } from '../texgen';
import { cutout, plankTexture, skyDome, wallWithDoorway } from './outdoor';
import { createCloudField, puffTexture } from './clouds';
import type { RoomBuildContext, RoomContent } from './index';

/**
 * Skills · Sky Flight. You step off the balcony onto a paper plane; scrolling
 * flies it forward, into the sky. Each stretch of sky is one part of the stack:
 *   Languages → Frontend → Backend (balloons wired together, messages running
 *   along the strings) → Cloud & Testing, where the plane lands on a cloud
 *   next to a "Let's build something" sign.
 * Between the groups you fly through banks of soft, volumetric clouds (drei
 * <Clouds>-style puffs): the screen fills with mist, puffs rush past, the
 * plane shudders, and you come out with the next group in front of you.
 * The camera never moves: the sky world slides toward it and the plane stays
 * in front of you. Each group appears small out of the haze, grows as you
 * approach, paints itself in, then parts around you as you fly through.
 * Hover paints too; click bounces a balloon and shows where you used it.
 */
const SIZE = { L: 1.5, M: 1.2, S: 0.98 } as const;
const GRID = 6;
const EYE = new Vector3(0, 1.6, -0.9);
const VIEW_Y = 2.4; // height (door-local) the eye looks at

/** How far ahead each group is (metres flown when it is nicely framed). */
const LAYERS: Array<{ groups: string[]; d: number; label: string }> = [
  { groups: ['Languages'], d: 12, label: 'Languages' },
  { groups: ['Frontend'], d: 31, label: 'Frontend' },
  { groups: ['Backend'], d: 50, label: 'Backend' },
  { groups: ['Cloud', 'Testing'], d: 70, label: 'Cloud & Testing' },
];
const DEPTH = 70; // metres flown by the end (the last group ends up framed)
const BASE_Y = 2.0; // height of a group's front row
/** Cloud banks between the groups (metres flown, like LAYERS[].d). */
const BANKS = [3, 21, 40, 59];
/** A bank's middle sits this far beyond its `d` (you're inside it after flying ~d + 6.6). */
const BANK_Z = 7.5;
const BANK_HALF_DEPTH = 2.4;

/** Backend balloons tied together (by skill name). */
const WIRES: Array<[string, string]> = [
  ['Node.js', 'NestJS'], ['NestJS', 'PostgreSQL'], ['NestJS', 'Redis'], ['NestJS', 'NATS JetStream'], ['NestJS', 'GraphQL'],
  ['Prisma', 'PostgreSQL'], ['Drizzle', 'PostgreSQL'], ['NATS JetStream', 'Microservices'], ['Express', 'REST'], ['Node.js', 'Express'],
  ['NestJS', 'MongoDB'],
];

export async function build({ assets }: RoomBuildContext): Promise<RoomContent> {
  const group = new Group();
  const outdoor = new Group();
  group.add(outdoor);
  const world = new Group(); // everything that slides down as you climb
  outdoor.add(world);
  const interactives: Mesh[] = [];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const r = rng(77);
  // portrait screens see a much narrower slice of sky: stack things in columns of three
  const narrow = innerWidth / innerHeight < 0.8;

  const [bSketch, bPaint, aSketch, aPaint] = await Promise.all([
    assets.texture('/textures/skill-balloons-sketch.ktx2'),
    assets.texture('/textures/skill-balloons-paint.ktx2'),
    assets.texture('/textures/avatar-sketch.ktx2'),
    assets.texture('/textures/avatar-paint.ktx2'),
  ]);

  /* ---- the balcony you take off from ---- */
  const deckW = 6.4, deckD = 3.3;
  const deckGeo = new PlaneGeometry(deckW, deckD);
  scaleUV(deckGeo, deckW / 2.6, deckD / 2.6);
  const deck = new Mesh(deckGeo, sketchMaterial({ map: plankTexture(5), tint: COLORS.ochre, tintAmount: 0.15, edge: [0, 0], hatchScale: 0.4 }));
  deck.rotation.x = -Math.PI / 2;
  deck.position.set(0, 0.001, -deckD / 2);
  const slab = new Mesh(new BoxGeometry(deckW, 0.22, deckD), sketchMaterial({ tint: COLORS.ochre, tintAmount: 0.35, edge: [0.02, 0.1] }));
  slab.position.set(0, -0.12, -deckD / 2);
  group.add(deck, slab);
  const rail = (len: number, x: number, z: number, ry: number) => {
    const g = new Group();
    const wood = () => sketchMaterial({ tint: COLORS.ochre, tintAmount: 0.5, edge: [0.06, 0.25] });
    const top = new Mesh(new BoxGeometry(len, 0.07, 0.09), wood());
    top.position.y = 1.02;
    const mid = new Mesh(new BoxGeometry(len, 0.04, 0.05), wood());
    mid.position.y = 0.55;
    g.add(top, mid);
    const n = Math.round(len / 0.55);
    for (let i = 0; i <= n; i++) {
      const post = new Mesh(new BoxGeometry(0.05, 1.0, 0.05), wood());
      post.position.set(-len / 2 + (i * len) / n, 0.5, 0);
      g.add(post);
    }
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    return g;
  };
  group.add(rail(deckD, -deckW / 2 + 0.05, -deckD / 2, Math.PI / 2), rail(deckD, deckW / 2 - 0.05, -deckD / 2, Math.PI / 2));
  const frontRail = rail(deckW, 0, -deckD + 0.05, 0);
  group.add(frontRail);
  outdoor.add(wallWithDoorway(12, 7, -2));

  /* ---- sky (stays put; a touch bluer as you climb) ---- */
  const dome = skyDome(softSkyTexture(31), 30, 60, 10, -2);
  outdoor.add(dome);
  const domeMat = dome.material as MeshBasicMaterial;
  const skyLow = new Color(1, 1, 1), skyHigh = new Color(0.94, 0.97, 1);

  /* ---- clouds: soft puffs (one instanced mesh), all in the sliding world ---- */
  const lite = narrow || (navigator.hardwareConcurrency ?? 8) <= 4;
  const k = lite ? 0.6 : 1; // fewer puffs on phones / low-end machines
  const field = createCloudField(1400, puffTexture(9));
  world.add(field.mesh);
  const drifting: Array<{ c: ReturnType<typeof field.addCloud>; vx: number; span: number; phase: number }> = [];
  // a sea of clouds under you, and clouds off to the sides, all the way along
  for (let z = -6, i = 0; z > -(DEPTH + 32); z -= 5.5, i++) {
    field.addCloud({ position: [-9 + r() * 18, -2.7 - r() * 1.2, z - r() * 2], bounds: [3.4, 0.7, 1.6], segments: Math.round(9 * k), volume: 3.6, smallestVolume: 0.45, growth: 0.6, fade: 4, seed: 100 + i });
    const side = i % 2 ? 1 : -1;
    const c = field.addCloud({ position: [side * (6.5 + r() * 5), 1 + r() * 6, z - r() * 3], bounds: [2.4, 0.9, 1.2], segments: Math.round(8 * k), volume: 2.8, smallestVolume: 0.45, growth: 0.5, fade: 4, seed: 300 + i });
    drifting.push({ c, vx: 0.08 + r() * 0.1, span: 2.5, phase: r() * 10 });
  }
  // the banks you fly through: a wide wall of big puffs, plus small wisps along your path that rush past
  for (const [i, d] of BANKS.entries()) {
    const zc = -(d + BANK_Z);
    const bank = field.addCloud({ position: [-0.4, 2.1, zc], bounds: [7.5, 3.2, BANK_HALF_DEPTH], segments: Math.round(70 * k), volume: 5, smallestVolume: 0.3, growth: 1.2, fade: 3.5, shade: 0.7, seed: 500 + i });
    const wisps = field.addCloud({ position: [-0.6, 1.6, zc], bounds: [2.6, 1.5, BANK_HALF_DEPTH + 1.4], segments: Math.round(34 * k), volume: 1.8, smallestVolume: 0.5, growth: 0.4, opacity: 0.75, fade: 1.6, shade: 0.3, seed: 700 + i });
    drifting.push({ c: bank, vx: 0.12, span: 0.8, phase: i * 2 }, { c: wisps, vx: 0.2, span: 0.4, phase: i * 3 });
  }
  // the cloud the plane lands on, at the end
  field.addCloud({
    position: [narrow ? -0.25 : -1.25, narrow ? -0.35 : 0.05, -DEPTH - (narrow ? 4.1 : 3.6)],
    bounds: [narrow ? 1.2 : 1.9, 0.35, 0.9], segments: Math.round(22 * k), volume: narrow ? 1.6 : 2.2, growth: 0.25, fade: 1.5, shade: 0.8, seed: 900,
  });

  /* ---- mist: a screen-covering veil just in front of the eye while you're inside a bank ---- */
  const mistMat = new ShaderMaterial({
    vertexShader: MIST_VERT,
    fragmentShader: MIST_FRAG,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: { uOpacity: { value: 0 }, uTime: { value: 0 }, uAspect: { value: 1 } },
  });
  const mist = new Mesh(new PlaneGeometry(1, 1), mistMat);
  mist.renderOrder = 998;
  mist.frustumCulled = false;
  mist.raycast = () => {};
  mist.visible = false;
  outdoor.add(mist);
  const camLocal = new Vector3(), camQ = new Quaternion(), parentQ = new Quaternion(), fwd = new Vector3();

  /* ---- title + "scroll to take off" ---- */
  const titleTex = canvasTexture(1024, 512, (ctx, w, h) => {
    handText(ctx, 'Skills', w / 2, h * 0.32, 200);
    ctx.strokeStyle = TERRA;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(w * 0.3, h * 0.54);
    ctx.bezierCurveTo(w * 0.42, h * 0.5, w * 0.6, h * 0.58, w * 0.7, h * 0.52);
    ctx.stroke();
    handText(ctx, 'the stack I ship with', w / 2, h * 0.7, 70, '#5a5652');
    handText(ctx, matchMedia('(pointer: coarse)').matches ? 'swipe up to fly ↑' : 'scroll to fly ↓', w / 2, h * 0.88, 54, TERRA);
  });
  const titleMat = cutout(titleTex);
  titleMat.transparent = true; // drawn after the clouds, so the first bank never veils it
  const title = new Mesh(new PlaneGeometry(4.2, 2.1), titleMat);
  title.renderOrder = 5;
  title.position.set(0, narrow ? 3.9 : 4.4, -9);
  if (narrow) title.scale.setScalar(0.85);
  title.lookAt(EYE);
  title.raycast = () => {};
  world.add(title);

  /* ---- the paper plane (stays in front of you), you standing on it ---- */
  const plane = new Group();
  const wingGeo = new BufferGeometry();
  // nose, left tip, tail centre, right tip, keel
  const verts = [new Vector3(0, 0, -1.1), new Vector3(-0.85, 0.06, 0.55), new Vector3(0, 0, 0.6), new Vector3(0.85, 0.06, 0.55), new Vector3(0, -0.24, 0.45)];
  wingGeo.setFromPoints(verts);
  wingGeo.setAttribute('uv', new Float32BufferAttribute([0.5, 1, 0, 0, 0.5, 0, 1, 0, 0.5, 0], 2));
  wingGeo.setIndex([0, 1, 2, 0, 2, 3, 0, 4, 2]);
  wingGeo.computeVertexNormals();
  const paperMat = sketchMaterial({ tint: COLORS.paper, edge: [0, 0], hatchScale: 0.6 });
  (paperMat as unknown as { side: number }).side = 2; // DoubleSide
  const planeMesh = new Mesh(wingGeo, paperMat);
  planeMesh.raycast = () => {};
  const crease = new Line(
    new BufferGeometry().setFromPoints([verts[0], verts[1], verts[2], verts[3], verts[0], verts[4], verts[2]]),
    new LineBasicMaterial({ color: 0x2b2b2b }),
  );
  crease.raycast = () => {};
  plane.add(planeMesh, crease);
  const rider = createAvatar({ id: 'sky', sketch: aSketch, painted: aPaint, position: [0, 0.02, 0.15], reducedMotion, greetDistance: 6 });
  rider.group.scale.setScalar(0.4);
  plane.add(rider.group);
  plane.position.set(narrow ? -0.25 : -1.25, narrow ? 0.55 : 0.95, narrow ? -3.9 : -3.4);
  plane.scale.setScalar(narrow ? 0.6 : 0.8);
  const planeX = plane.position.x, planeY = plane.position.y, planeZ = plane.position.z;
  plane.rotation.y = 0.18; // flying away from you, nose a touch to the right
  outdoor.add(plane);

  /* ---- balloons, layer by layer ---- */
  const items = Array.from(document.querySelectorAll<HTMLElement>('[data-skill]'));
  const usedIn = projectUses();
  interface Balloon { g: Group; body: Mesh; string: Line; size: number; mat: ReturnType<typeof avatarMaterial>; phase: number; base: Vector3; el: HTMLElement; hover: { v: number }; tag: Mesh | null }
  const balloons: Balloon[] = [];
  const byName = new Map<string, Balloon>();
  const stringMat = new LineBasicMaterial({ color: 0x5a5652, transparent: true, opacity: 0.75 });

  for (const layer of LAYERS) {
    const els = items.filter((el) => layer.groups.includes(el.dataset.group!))
      .sort((a, b) => 'LMS'.indexOf(a.dataset.size!) - 'LMS'.indexOf(b.dataset.size!));
    const rows = narrow ? Math.ceil(els.length / 3) : els.length > 4 ? 2 : 1;
    const perRow = Math.ceil(els.length / rows);
    els.forEach((el, i) => {
      const size = SIZE[(el.dataset.size as keyof typeof SIZE) ?? 'M'] * (narrow ? 0.8 : 1);
      const row = Math.floor(i / perRow), col = i % perRow;
      const n = Math.min(perRow, els.length - row * perRow);
      // front row: the big ones across the view; the back row higher and further away
      const spread = n > 1 ? col / (n - 1) - 0.5 : 0;
      const x = narrow ? spread * 2.5 + (r() - 0.5) * 0.2 + (row % 2 ? 0.25 : -0.1) : spread * (n > 4 ? 9.4 : 6.4) + (r() - 0.5) * 0.5 + (row ? 0.7 : 0);
      // phones: rows sit one behind the other (you fly through them); wide: two tiers
      const y = BASE_Y + (narrow ? (row % 2) * 1.5 + 0.3 : row * 1.8) + (r() - 0.5) * (narrow ? 0.3 : 0.7) + Math.abs(spread) * 0.6;
      const z = narrow ? -6.8 - row * 3 : -6.6 - row * 1.7 + (r() - 0.5) * 0.8 - Math.abs(spread) * 1.4;
      const mat = avatarMaterial(bSketch, bPaint, GRID);
      mat.uniforms.uFrame.value = Number(el.dataset.cell);
      const body = new Mesh(new PlaneGeometry(size, size), mat);
      const g = new Group();
      g.add(body);
      const len = 1.4 + r() * 0.8;
      const pts: number[] = [];
      for (let k = 0; k <= 12; k++) {
        const t = k / 12;
        pts.push(Math.sin(t * Math.PI * 1.6 + i) * 0.06 * t, -size * 0.49 - t * len, 0);
      }
      const string = new Line(new BufferGeometry().setAttribute('position', new Float32BufferAttribute(pts, 3)), stringMat);
      string.raycast = () => {};
      g.add(string);
      g.position.set(x, y, z);
      g.lookAt(EYE.x, y, EYE.z); // faces you when its group is framed
      g.position.z -= layer.d;
      tagInteractive(body, { kind: 'skill', id: el.dataset.name!, paint: [] });
      interactives.push(body);
      world.add(g);
      const b: Balloon = { g, body, string, size, mat, phase: r() * Math.PI * 2, base: g.position.clone(), el, hover: { v: 0 }, tag: null };
      balloons.push(b);
      byName.set(el.dataset.name!, b);
    });

    // the layer's name on a paper tag, on the left
    const labelTex = canvasTexture(640, 256, (ctx, w, h) => drawTag(ctx, w, h, layer.label));
    const label = new Mesh(new PlaneGeometry(1.9, 0.76), cutout(labelTex));
    label.position.set(0, narrow ? 5.3 : 5.5, -7.4);
    if (narrow) label.scale.setScalar(0.8);
    label.lookAt(EYE.x, label.position.y, EYE.z);
    label.position.z -= layer.d;
    label.raycast = () => {};
    world.add(label);
  }

  /* ---- backend: strings between balloons, messages running along them ---- */
  const wires: Array<{ a: Balloon; b: Balloon; line: Line; dots: Mesh[] }> = [];
  const dotMat = new MeshBasicMaterial({ color: COLORS.terracotta });
  const dotGeo = new SphereGeometry(0.06, 8, 6);
  const wireMat = new LineDashedMaterial({ color: 0x2b2b2b, dashSize: 0.16, gapSize: 0.12, transparent: true, opacity: 0.7 });
  for (const [na, nb] of WIRES) {
    const a = byName.get(na), b = byName.get(nb);
    if (!a || !b) continue;
    const line = new Line(new BufferGeometry().setFromPoints([a.base, b.base]), wireMat);
    line.computeLineDistances();
    line.raycast = () => {};
    const dots = [0, 1].map(() => {
      const d = new Mesh(dotGeo, dotMat);
      d.raycast = () => {};
      world.add(d);
      return d;
    });
    world.add(line);
    wires.push({ a, b, line, dots });
  }

  /* ---- above the clouds: AWS sun, Docker whale cloud, test stars, landing ---- */
  const sun = new Mesh(new PlaneGeometry(3.2, 3.2), cutout(canvasTexture(512, 512, drawSun)));
  sun.position.set(narrow ? 1.6 : 5.6, narrow ? 7.6 : 6.4, -DEPTH - 14);
  sun.lookAt(EYE.x, sun.position.y, EYE.z);
  const whale = new Mesh(new PlaneGeometry(4, 2), cutout(canvasTexture(768, 384, drawWhaleCloud)));
  whale.position.set(narrow ? -1.4 : -5.6, narrow ? 6.6 : 5.6, -DEPTH - 12);
  whale.lookAt(EYE.x, whale.position.y, EYE.z);
  const starTex = canvasTexture(256, 256, drawCheckStar);
  const stars: Mesh[] = [];
  for (const [x, y, z, s] of [[-1.6, 6.6, -DEPTH - 10, 0.7], [1.4, 7.3, -DEPTH - 11, 0.55], [3.3, 6.2, -DEPTH - 9.5, 0.6], [-3.3, 7.4, -DEPTH - 12, 0.5], [0.2, 7.9, -DEPTH - 12, 0.45]] as const) {
    const m = new Mesh(new PlaneGeometry(s, s), cutout(starTex));
    m.position.set(x, y, z);
    m.lookAt(EYE.x, y, EYE.z);
    m.userData.phase = r() * 6;
    m.raycast = () => {};
    stars.push(m);
  }
  sun.raycast = () => {};
  whale.raycast = () => {};
  world.add(sun, whale, ...stars);

  const cta = new Mesh(new PlaneGeometry(2.1, 0.79), cutout(canvasTexture(768, 288, drawCta)));
  cta.position.set(narrow ? 0.75 : 1.2, narrow ? 1.05 : 0.75, -DEPTH - (narrow ? 5.2 : 4.4));
  if (narrow) cta.scale.setScalar(0.7);
  tagInteractive(cta, { kind: 'skill', id: '__contact', paint: [] });
  interactives.push(cta);
  world.add(cta);

  /* ---- flight state ---- */
  let target = 0; // 0 = balcony, 1 = landed above the clouds
  let p = 0;
  let prevP = 0;
  let time = 0;
  const SCROLL_PX = 7000; // wheel pixels for the whole flight

  /* ---- interaction ---- */
  const flash = (el: HTMLElement) => {
    el.classList.add('is-flash');
    el.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' });
    setTimeout(() => el.classList.remove('is-flash'), 1600);
  };
  const showTag = (b: Balloon) => {
    if (b.tag) return;
    const uses = usedIn(b.el.dataset.name!);
    const text = uses.length ? `used in ${uses.join(' · ')}` : `${b.el.dataset.group} · ${b.el.dataset.size === 'L' ? 'daily driver' : 'in my toolbox'}`;
    const mat = cutout(canvasTexture(768, 200, (ctx, w, h) => drawTag(ctx, w, h, text, 64)));
    // always readable: above the balloon, drawn over everything (other balloons, strings, clouds)
    mat.transparent = true;
    mat.depthTest = false;
    mat.depthWrite = false;
    const tag = new Mesh(new PlaneGeometry(2.1, 0.55), mat);
    tag.renderOrder = 999;
    tag.position.set(0, b.size * 0.5 + 0.38, 0.05);
    tag.raycast = () => {};
    b.g.add(tag);
    b.tag = tag;
    tag.scale.setScalar(0.01);
    gsap.to(tag.scale, { x: 1, y: 1, z: 1, duration: reducedMotion ? 0 : 0.45, ease: 'back.out(2)' });
    setTimeout(() => {
      gsap.to(tag.scale, {
        x: 0.01, y: 0.01, z: 0.01, duration: reducedMotion ? 0 : 0.3, ease: 'power2.in',
        onComplete: () => { b.g.remove(tag); b.tag = null; },
      });
    }, 3200);
  };

  return {
    group,
    interactives,
    outdoor,
    lookAt: [0, VIEW_Y + 0.1, -7],
    scrollAxis: 'y',
    scroll(delta: number) {
      target = Math.max(0, Math.min(1, target + delta / SCROLL_PX));
    },
    hover(object: Object3D, on: boolean) {
      if (object === cta) {
        const k = (narrow ? 0.7 : 1) * (on ? 1.06 : 1);
        gsap.to(cta.scale, { x: k, y: k, duration: 0.3, overwrite: true });
        return;
      }
      const b = balloons.find((x) => x.body === object);
      if (!b) return;
      gsap.to(b.hover, { v: on ? 1.6 : 0, duration: reducedMotion ? 0 : on ? 0.5 : 0.35, ease: on ? 'power3.out' : 'power2.in', overwrite: true });
      if (!reducedMotion) gsap.to(b.body.scale, { x: on ? 1.07 : 1, y: on ? 1.07 : 1, duration: 0.35, ease: 'power2.out', overwrite: true });
    },
    click(object: Object3D) {
      if (object === cta) {
        document.querySelector<HTMLAnchorElement>('[data-door="contact"]')?.click();
        return true;
      }
      const b = balloons.find((x) => x.body === object);
      if (!b) return false;
      if (!reducedMotion) {
        gsap.fromTo(b.body.scale, { x: 1.16, y: 0.88 }, { x: 1, y: 1, duration: 0.9, ease: 'elastic.out(1.1, 0.35)', overwrite: true });
        gsap.fromTo(b.body.position, { y: 0.18 }, { y: 0, duration: 1.1, ease: 'elastic.out(1, 0.4)', overwrite: true });
      }
      showTag(b);
      flash(b.el);
      return true;
    },
    update(dt: number, camera: Camera, active: boolean) {
      if (!active) return false;
      time += dt;
      // ease toward the scroll target: this is the flight
      p += (target - p) * (reducedMotion ? 1 : 1 - Math.exp(-dt * 3.2));
      if (Math.abs(target - p) < 1e-4) p = target;
      const vel = (p - prevP) / Math.max(dt, 1e-3);
      prevP = p;
      world.position.z = p * DEPTH; // the sky comes toward you
      frontRail.position.y = -Math.min(p * DEPTH, 3); // the railing drops away as you take off
      domeMat.color.copy(skyLow).lerp(skyHigh, p);

      // the plane bobs, lifts its nose and surges a little with speed, rolls gently
      const still = reducedMotion ? 0 : 1;
      const surge = Math.max(-1, Math.min(1, vel * 3));
      // inside a bank? 0 outside → 1 in the middle of it
      let fog = 0;
      for (const d of BANKS) {
        // + = the bank's middle is still ahead of you, − = you're coming out the far side
        const ahead = EYE.z - (-(d + BANK_Z) + world.position.z);
        // it thickens as you plough in, and clears quickly once you're through
        fog = Math.max(fog, ahead >= 0
          ? 1 - smooth(BANK_HALF_DEPTH * 0.3, BANK_HALF_DEPTH + 2.2, ahead)
          : 1 - smooth(BANK_HALF_DEPTH * 0.2, BANK_HALF_DEPTH * 0.85, -ahead));
      }
      // turbulence: the plane shudders in the cloud, harder the faster you fly
      const shake = fog * still * (0.45 + Math.min(1, Math.abs(vel) * 6) * 0.55);
      const jx = (Math.sin(time * 31) + Math.sin(time * 47.3) * 0.6) * 0.5, jy = (Math.sin(time * 37.7) + Math.sin(time * 53.1) * 0.5) * 0.5;
      plane.position.x = planeX + jx * 0.035 * shake;
      plane.position.y = planeY + Math.sin(time * 1.6) * 0.04 * still + surge * 0.06 + jy * 0.05 * shake;
      plane.position.z = planeZ - surge * 0.35;
      plane.rotation.x = surge * 0.14 + Math.sin(time * 1.1) * 0.02 * still + jy * 0.05 * shake;
      plane.rotation.z = Math.sin(time * 0.8) * 0.05 * still + jx * 0.09 * shake;
      // things you've flown past must not show up behind you (in the corridor)
      for (const c of world.children) if (c !== field.mesh) c.visible = c.position.z + world.position.z < -0.4;
      rider.update(dt, camera);

      // balloons bob, and paint themselves in as they cross the middle of the view
      for (const b of balloons) {
        // distance ahead of you; close balloons part to let you through
        const ahead = EYE.z - (b.base.z + world.position.z);
        const part = ahead < 4.5 ? (4.5 - Math.max(ahead, 0)) / 4.5 : 0;
        const side = b.base.x >= 0 ? 1 : -1;
        b.g.position.x = b.base.x + side * part * part * (1.6 + Math.abs(b.base.x) * 0.8) + Math.sin(time * 0.37 + b.phase * 2) * 0.05 * still;
        b.g.position.y = b.base.y + (b.base.y - 2.2) * part * 0.6 + Math.sin(time * 0.9 + b.phase) * 0.07 * still;
        b.body.rotation.z = Math.sin(time * 0.7 + b.phase) * 0.05 * still;
        // strings only once the balloon is out of the haze (lines don't fade with distance)
        b.string.visible = ahead < 15;
        // paint in on approach
        const near = 1 - smooth(6.5, 13, ahead);
        b.mat.uniforms.uPaint.value = Math.max(b.hover.v, near * 1.6);
      }
      // messages running along the backend strings
      for (const [i, w] of wires.entries()) {
        const pos = w.line.geometry.attributes.position;
        pos.setXYZ(0, w.a.g.position.x, w.a.g.position.y, w.a.g.position.z);
        pos.setXYZ(1, w.b.g.position.x, w.b.g.position.y, w.b.g.position.z);
        pos.needsUpdate = true;
        w.line.computeLineDistances();
        w.line.visible = w.a.g.visible && w.b.g.visible;
        for (const d of w.dots) d.visible = w.line.visible;
        w.dots.forEach((d, k) => d.position.lerpVectors(w.a.g.position, w.b.g.position, (time * 0.35 * still + i * 0.17 + k * 0.5) % 1));
      }
      if (still) {
        // clouds drift sideways, back and forth (so they never pop)
        for (const c of drifting) c.c.offset.x = Math.sin(time * c.vx + c.phase) * c.span;
        for (const s of stars) s.scale.setScalar(0.85 + Math.sin(time * 2.4 + (s.userData.phase as number)) * 0.15);
        sun.rotation.z = Math.sin(time * 0.3) * 0.05;
      }
      group.updateMatrixWorld(true);
      field.update(dt, camera, !!still);

      // the mist veil sits just in front of the eye, filling the view
      mistMat.uniforms.uOpacity.value = Math.pow(fog, 1.4) * 0.92;
      mist.visible = fog > 0.01;
      if (mist.visible) {
        const cam = camera as Camera & { fov?: number; aspect?: number };
        camLocal.setFromMatrixPosition(camera.matrixWorld);
        outdoor.worldToLocal(camLocal);
        outdoor.getWorldQuaternion(parentQ).invert();
        camera.getWorldQuaternion(camQ).premultiply(parentQ);
        fwd.set(0, 0, -0.2).applyQuaternion(camQ);
        mist.position.copy(camLocal).add(fwd);
        mist.quaternion.copy(camQ);
        const aspect = cam.aspect ?? innerWidth / innerHeight;
        const hgt = 2 * 0.2 * Math.tan(((cam.fov ?? 60) * Math.PI) / 360) * 1.3;
        mist.scale.set(hgt * aspect, hgt, 1);
        mistMat.uniforms.uAspect.value = aspect;
        mistMat.uniforms.uTime.value = time;
        mist.updateMatrixWorld();
      }
      return true;
    },
  };
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function scaleUV(geo: PlaneGeometry, sx: number, sy: number) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy);
}

/** "used in …": projects whose tags mention the skill (read from the Projects section). */
function projectUses() {
  const projects = Array.from(document.querySelectorAll<HTMLElement>('[data-project]')).map((el) => ({
    title: el.dataset.title ?? '',
    tags: Array.from(el.querySelectorAll('.tag')).map((t) => (t.textContent ?? '').toLowerCase()),
  }));
  const ALIAS: Record<string, string[]> = {
    'React 19': ['react'], 'NATS JetStream': ['nats'], PostgreSQL: ['postgresql', 'timescaledb'], Redis: ['redis'],
    Prisma: ['prisma'], TypeScript: ['typescript', 'monorepo'], 'Tailwind CSS': ['nativewind'], Microservices: ['nats'],
  };
  return (name: string) => {
    const keys = ALIAS[name] ?? [name.toLowerCase()];
    return projects.filter((p) => p.tags.some((t) => keys.some((k) => t.includes(k)))).map((p) => p.title);
  };
}

function drawTag(ctx: CanvasRenderingContext2D, w: number, h: number, text: string, size = 92) {
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-0.02);
  ctx.fillStyle = '#fffdf8';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(-w * 0.46, -h * 0.3, w * 0.92, h * 0.6, 26);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  handText(ctx, text, w / 2, h / 2 + 3, size, INK, 'center', w * 0.84);
}

function drawSun(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cx = w / 2, cy = h / 2;
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineWidth = 9;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 150, cy + Math.sin(a) * 150);
    ctx.lineTo(cx + Math.cos(a) * 215, cy + Math.sin(a) * 215);
    ctx.stroke();
  }
  ctx.fillStyle = '#ffe2b0';
  ctx.beginPath();
  ctx.arc(cx, cy, 130, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.fillStyle = '#232f3e';
  ctx.font = '800 96px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('aws', cx, cy - 10);
  ctx.strokeStyle = '#ff9900';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(cx - 64, cy + 42);
  ctx.quadraticCurveTo(cx, cy + 82, cx + 62, cy + 40);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + 40, cy + 30);
  ctx.lineTo(cx + 66, cy + 38);
  ctx.lineTo(cx + 58, cy + 64);
  ctx.stroke();
}

/** A cloud shaped like a whale, carrying a stack of containers. */
function drawWhaleCloud(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#e7f2fd';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(60, h * 0.55);
  ctx.bezierCurveTo(60, h * 0.95, w * 0.75, h * 0.98, w * 0.86, h * 0.55);
  ctx.bezierCurveTo(w * 0.92, h * 0.45, w * 0.97, h * 0.42, w * 0.95, h * 0.32);
  ctx.bezierCurveTo(w * 0.9, h * 0.38, w * 0.86, h * 0.42, w * 0.82, h * 0.45);
  ctx.lineTo(60, h * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(170, h * 0.6, 9, 0, Math.PI * 2);
  ctx.fill();
  const cw = 58, ch = 44;
  for (const [i, j] of [[0, 0], [1, 0], [2, 0], [3, 0], [1, 1], [2, 1], [2, 2]]) {
    const x = 220 + i * (cw + 8), y = h * 0.45 - (j + 1) * (ch + 8);
    ctx.fillStyle = '#2496ed';
    ctx.fillRect(x, y, cw, ch);
    ctx.lineWidth = 4;
    ctx.strokeRect(x, y, cw, ch);
  }
}

function drawCheckStar(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cx = w / 2, cy = h / 2;
  ctx.fillStyle = '#e6f6ee';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 7;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rad = i % 2 ? 50 : 112;
    ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#22a06b';
  ctx.lineWidth = 16;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 34, cy + 4);
  ctx.lineTo(cx - 8, cy + 30);
  ctx.lineTo(cx + 38, cy - 22);
  ctx.stroke();
}

function drawCta(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = TERRA;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.roundRect(16, 30, w - 32, h - 60, 34);
  ctx.fill();
  ctx.stroke();
  handText(ctx, "Let's build something →", w / 2, h / 2 + 2, 92, '#fffaf2', 'center', w - 90);
}

/** Pale sky for the flight: paper at the horizon, light blue above, a few far soft clouds. */
function softSkyTexture(seed: number) {
  const r = rng(seed);
  return canvasTexture(2048, 1024, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#9fcfea');
    g.addColorStop(0.45, '#c4e4f3');
    g.addColorStop(0.8, '#e6f3f8');
    g.addColorStop(1, '#f4f9fa');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 14; i++) {
      const cx = r() * w, cy = h * (0.15 + r() * 0.4), size = 60 + r() * 110;
      for (let j = 0; j < 9; j++) {
        const x = cx + (r() - 0.5) * size * 2.6, y = cy + (r() - 0.5) * size * 0.5, rad = size * (0.4 + r() * 0.6);
        const rg = ctx.createRadialGradient(x, y, 0, x, y, rad);
        rg.addColorStop(0, 'rgba(255,255,255,0.7)');
        rg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
    }
  });
}

const MIST_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

/** Drifting, billowing white-blue fog (value-noise fbm) that streams outward as you fly. */
const MIST_FRAG = /* glsl */ `
uniform float uOpacity;
uniform float uTime;
uniform float uAspect;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 17.0; a *= 0.5; }
  return v;
}
void main() {
  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
  float r = length(p);
  // two layers that keep zooming in (cross-faded, so it never jumps): billows rush toward you
  float n = 0.0;
  for (int i = 0; i < 2; i++) {
    float t = fract(uTime * 0.22 + float(i) * 0.5);
    vec2 q = p * mix(2.6, 1.1, t) + vec2(float(i) * 7.3, uTime * 0.04);
    n += (1.0 - abs(2.0 * t - 1.0)) * fbm(q + fbm(q * 0.7 - uTime * 0.1) * 1.2);
  }
  float dens = smoothstep(0.2, 0.8, n + 0.3 + r * 0.4);
  vec3 col = mix(vec3(0.86, 0.92, 0.96), vec3(1.0), smoothstep(0.25, 0.8, n + p.y * 0.5));
  gl_FragColor = vec4(col, uOpacity * dens);
}`;
