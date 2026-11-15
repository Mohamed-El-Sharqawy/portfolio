import {
  BoxGeometry, BufferGeometry, Float32BufferAttribute, Group, Line, LineBasicMaterial, Mesh, PlaneGeometry, Vector3,
  type Camera, type Object3D,
} from 'three';
import gsap from 'gsap';
import { COLORS } from '../config';
import { avatarMaterial, sketchMaterial, type SketchMaterial } from '../materials';
import { canvasTexture, handText, TERRA } from '../sketch-canvas';
import { tagInteractive } from '../corridor';
import { createAvatar } from '../avatar';
import { rng } from '../texgen';
import { cloudSprite, cloudTexture, plankTexture, skyDome, skyTexture, cutout, wallWithDoorway } from './outdoor';
import type { RoomBuildContext, RoomContent } from './index';

/**
 * Skills: the door opens onto a little balcony above the clouds. Every skill
 * is a balloon with its real logo, grouped by area, bobbing on its string.
 * Hover paints a balloon; click bounces it and highlights it in the panel.
 */
const SIZE = { L: 1.6, M: 1.28, S: 1.02 } as const;
const GRID = 6;

/** Cluster centres (door-local), one per group, spread across the view. */
const CLUSTERS: Record<string, { x: number; y: number; z: number; w: number }> = {
  Frontend: { x: -4.7, y: 2.2, z: -6.6, w: 3.0 },
  Backend: { x: 0.5, y: 2.0, z: -7.6, w: 5.0 },
  Languages: { x: -3.6, y: 5.5, z: -10.6, w: 4.4 },
  Cloud: { x: 4.9, y: 2.1, z: -6.4, w: 2.0 },
  Testing: { x: 5.0, y: 4.9, z: -9.6, w: 2.4 },
};

export async function build({ assets }: RoomBuildContext): Promise<RoomContent> {
  const group = new Group();
  const outdoor = new Group();
  group.add(outdoor);
  const interactives: Mesh[] = [];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const r = rng(77);

  const [bSketch, bPaint, aSketch, aPaint] = await Promise.all([
    assets.texture('/textures/skill-balloons-sketch.ktx2'),
    assets.texture('/textures/skill-balloons-paint.ktx2'),
    assets.texture('/textures/avatar-sketch.ktx2'),
    assets.texture('/textures/avatar-paint.ktx2'),
  ]);

  /* ---- balcony: plank floor, railing, the building's wall behind you ---- */
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
    for (let i = 0; i <= Math.round(len / 0.55); i++) {
      const post = new Mesh(new BoxGeometry(0.05, 1.0, 0.05), wood());
      post.position.set(-len / 2 + (i * len) / Math.round(len / 0.55), 0.5, 0);
      g.add(post);
    }
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    return g;
  };
  group.add(rail(deckW, 0, -deckD + 0.05, 0), rail(deckD, -deckW / 2 + 0.05, -deckD / 2, Math.PI / 2), rail(deckD, deckW / 2 - 0.05, -deckD / 2, Math.PI / 2));
  // wall of the building behind the balcony (seen when you look back)
  outdoor.add(wallWithDoorway(12, 7, -2));

  /* ---- sky + clouds ---- */
  outdoor.add(skyDome(skyTexture(31), 30, 46, 4, -2));
  const cloudTex = [cloudTexture(11), cloudTexture(12), cloudTexture(13), cloudTexture(14)];
  const clouds: Array<{ m: Mesh; speed: number; x0: number }> = [];
  const addCloud = (x: number, y: number, z: number, w: number) => {
    const m = cloudSprite(cloudTex[clouds.length % cloudTex.length], w);
    m.position.set(x, y, z);
    m.lookAt(0, 1.6 + (y - 1.6) * 0.3, 1);
    outdoor.add(m);
    clouds.push({ m, speed: 0.05 + r() * 0.08, x0: x });
  };
  // a sea of clouds below the balcony
  for (let i = 0; i < 9; i++) addCloud(-11 + i * 2.8 + r() * 1.2, -1.6 - r() * 1.6, -6 - r() * 9, 4 + r() * 3);
  // floating ones between the balloons and far away
  for (const [x, y, z, w] of [[-7, 5.6, -10, 3], [3.5, 6.4, -15, 4], [9, 3.4, -12, 3.2], [-9.5, 1.6, -13, 4], [-1.2, 0.2, -6.5, 1.6], [8.5, 0.6, -10, 2.2], [12, 6.5, -18, 5]] as const)
    addCloud(x, y, z, w);

  /* ---- title, lettered on a cloud ---- */
  const titleTex = canvasTexture(1024, 512, (ctx, w, h) => {
    const rr = rng(4);
    drawTitleCloud(ctx, w, h, rr);
  });
  const title = new Mesh(new PlaneGeometry(4.4, 2.2), cutout(titleTex));
  title.position.set(0.6, 7.7, -13.5);
  title.lookAt(0, 1.6, 0);
  title.raycast = () => {};
  outdoor.add(title);

  /* ---- you, on a cloud, waving ---- */
  const avatar = createAvatar({ id: 'sky', sketch: aSketch, painted: aPaint, position: [-2.7, 0.55, -5.6], reducedMotion, greetDistance: 7 });
  avatar.group.scale.setScalar(0.85);
  const perch = cloudSprite(cloudTex[1], 2.2);
  perch.position.set(-2.7, 0.62, -5.55);
  perch.lookAt(0, 1.2, 0);
  outdoor.add(avatar.group, perch);

  /* ---- balloons ---- */
  const items = Array.from(document.querySelectorAll<HTMLElement>('[data-skill]'));
  const byGroup = new Map<string, HTMLElement[]>();
  for (const el of items) byGroup.set(el.dataset.group!, [...(byGroup.get(el.dataset.group!) ?? []), el]);

  interface Balloon { g: Group; body: Mesh; mat: SketchMaterial; phase: number; base: Vector3; el: HTMLElement }
  const balloons: Balloon[] = [];
  const stringMat = new LineBasicMaterial({ color: 0x5a5652, transparent: true, opacity: 0.75 });
  const eye = new Vector3(0, 1.6, -0.9);

  for (const [name, els] of byGroup) {
    const c = CLUSTERS[name] ?? { x: 0, y: 3, z: -10, w: 3 };
    // big ones in the middle of the cluster, small ones around the edge
    const sorted = [...els].sort((a, b) => 'LMS'.indexOf(a.dataset.size!) - 'LMS'.indexOf(b.dataset.size!));
    const cols = Math.max(2, Math.ceil(Math.sqrt(sorted.length * 1.6)));
    sorted.forEach((el, i) => {
      const size = SIZE[(el.dataset.size as keyof typeof SIZE) ?? 'M'];
      const col = i % cols, row = Math.floor(i / cols);
      const centred = (col - (cols - 1) / 2) / Math.max(1, cols - 1);
      const x = c.x + centred * c.w + (r() - 0.5) * 0.35;
      const y = c.y + row * 1.3 + (r() - 0.5) * 0.35 + (size - 1.28) * 0.5;
      const z = c.z - row * 0.7 + (r() - 0.5) * 0.8;
      const mat = avatarMaterial(bSketch, bPaint, GRID);
      mat.uniforms.uFrame.value = Number(el.dataset.cell);
      const body = new Mesh(new PlaneGeometry(size, size), mat);
      const g = new Group();
      g.add(body);
      // string from the knot, a lazy S down to nowhere
      const len = 1.3 + r() * 0.9;
      const pts: number[] = [];
      for (let k = 0; k <= 12; k++) {
        const t = k / 12;
        pts.push(Math.sin(t * Math.PI * 1.6 + i) * 0.06 * t, -size * 0.49 - t * len, 0);
      }
      const string = new Line(new BufferGeometry().setAttribute('position', new Float32BufferAttribute(pts, 3)), stringMat);
      string.raycast = () => {};
      g.add(string);
      g.position.set(x, y, z);
      // face the spot where you stand (yaw only, a touch of tilt toward you)
      g.lookAt(eye.x, y + (eye.y - y) * 0.15, eye.z);
      tagInteractive(body, { kind: 'skill', id: el.dataset.name!, paint: [mat] });
      interactives.push(body);
      outdoor.add(g);
      balloons.push({ g, body, mat, phase: r() * Math.PI * 2, base: g.position.clone(), el });
    });

    // group label on a small cloud under the cluster
    const labelTex = canvasTexture(512, 256, (ctx, w, h) => {
      const rr = rng(name.length * 7);
      drawLabelCloud(ctx, w, h, rr, name);
    });
    const label = new Mesh(new PlaneGeometry(1.7, 0.85), cutout(labelTex));
    label.position.set(c.x, c.y - 1.35, c.z + 0.8);
    label.lookAt(eye.x, label.position.y, eye.z);
    label.raycast = () => {};
    outdoor.add(label);
  }

  /* ---- interaction ---- */
  const flash = (el: HTMLElement) => {
    el.classList.add('is-flash');
    el.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' });
    setTimeout(() => el.classList.remove('is-flash'), 1600);
  };
  const bounce = (b: Balloon) => {
    if (reducedMotion) return;
    gsap.fromTo(b.body.scale, { x: 1.16, y: 0.88 }, { x: 1, y: 1, duration: 0.9, ease: 'elastic.out(1.1, 0.35)', overwrite: true });
    gsap.fromTo(b.body.position, { y: 0.18 }, { y: 0, duration: 1.1, ease: 'elastic.out(1, 0.4)', overwrite: true });
  };

  let time = 0;
  return {
    group,
    interactives,
    outdoor,
    lookAt: [0, 2.5, -7],
    hover(object: Object3D, on: boolean) {
      const b = balloons.find((x) => x.body === object);
      if (!b || reducedMotion) return;
      gsap.to(b.body.scale, { x: on ? 1.07 : 1, y: on ? 1.07 : 1, duration: 0.35, ease: 'power2.out', overwrite: true });
    },
    click(object: Object3D) {
      const b = balloons.find((x) => x.body === object);
      if (!b) return false;
      bounce(b);
      flash(b.el);
      return true;
    },
    update(dt: number, camera: Camera, active: boolean) {
      if (!active || reducedMotion) return false;
      time += dt;
      for (const b of balloons) {
        b.g.position.y = b.base.y + Math.sin(time * 0.9 + b.phase) * 0.07;
        b.g.position.x = b.base.x + Math.sin(time * 0.37 + b.phase * 2) * 0.05;
        b.body.rotation.z = Math.sin(time * 0.7 + b.phase) * 0.05;
      }
      for (const c of clouds) {
        let x = c.m.position.x + c.speed * dt;
        if (x > c.x0 + 6) x = c.x0 - 6;
        c.m.position.x = x;
      }
      avatar.update(dt, camera);
      outdoor.updateMatrixWorld(true);
      return true;
    },
  };
}

function scaleUV(geo: PlaneGeometry, sx: number, sy: number) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy);
}

function drawTitleCloud(ctx: CanvasRenderingContext2D, w: number, h: number, r: () => number) {
  // lettering only — the floating clouds around it do the rest
  handText(ctx, 'Skills', w / 2, h * 0.4, 210);
  ctx.strokeStyle = TERRA;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(w * 0.3, h * 0.62);
  ctx.bezierCurveTo(w * 0.42, h * 0.58 + r() * 6, w * 0.6, h * 0.66, w * 0.7, h * 0.6);
  ctx.stroke();
  handText(ctx, 'the stack I ship with', w / 2, h * 0.8, 76, '#5a5652');
}

function drawLabelCloud(ctx: CanvasRenderingContext2D, w: number, h: number, r: () => number, text: string) {
  // a little paper tag with the group name
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate((r() - 0.5) * 0.08);
  ctx.fillStyle = '#fffdf8';
  ctx.strokeStyle = '#2b2b2b';
  ctx.lineWidth = 6;
  const tw = w * 0.86, th = h * 0.5;
  ctx.beginPath();
  ctx.roundRect(-tw / 2, -th / 2, tw, th, 28);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  handText(ctx, text, w / 2, h / 2 + 4, 92, '#2b2b2b', 'center', w * 0.78);
}
