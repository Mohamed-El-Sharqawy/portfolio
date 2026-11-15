import {
  BoxGeometry, CatmullRomCurve3, Group, LatheGeometry, Mesh, PlaneGeometry, TubeGeometry, Vector2, Vector3,
  type BufferGeometry, type Camera, type Object3D,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import gsap from 'gsap';
import { COLORS } from '../config';
import { avatarMaterial, edgeFor, sketchMaterial, type SketchMaterial } from '../materials';
import { bodyText, canvasTexture, handText, roughRect, wrap, INK, TERRA } from '../sketch-canvas';
import { tagInteractive } from '../corridor';
import { rng } from '../texgen';
import { cloudSprite, cloudTexture, cutout, plankTexture, skyDome, skyTexture, wallWithDoorway } from './outdoor';
import type { RoomBuildContext, RoomContent } from './index';

/**
 * Projects: the door opens onto a rooftop. The projects hang as posters on a
 * clothesline between two stair huts, with the city behind the railing.
 * Scroll / drag / ← → slides the line (it loops); posters swing as they move.
 * Click a poster to flip it (tech + summary on the back), click the back to
 * open the repo on GitHub.
 */
const HUT_X = 7.4; // inner faces of the two huts
const LINE_Z = -4.5;
const LINE_Y = 3.15; // where the line meets the huts
const SAG = 0.32;
const SPACING = 1.78;
const COPIES = 3;
const CARD_W = 1.22, CARD_H = 1.6;

export async function build({ assets }: RoomBuildContext): Promise<RoomContent> {
  const group = new Group();
  const outdoor = new Group();
  group.add(outdoor);
  const interactives: Mesh[] = [];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const r = rng(2026);

  /* ---- roof deck ---- */
  const deckW = HUT_X * 2 + 7.2, deckD = 7.4;
  const deckGeo = new PlaneGeometry(deckW, deckD);
  scaleUV(deckGeo, deckW / 3.2, deckD / 3.2);
  const deck = new Mesh(deckGeo, sketchMaterial({ map: plankTexture(8, true), tint: COLORS.ochre, tintAmount: 0.12, edge: [0, 0], hatchScale: 0.35 }));
  deck.rotation.x = -Math.PI / 2;
  deck.position.set(0, 0.002, -deckD / 2 + 0.2);
  group.add(deck);

  /* ---- balustrade along the edge ---- */
  const railLen = HUT_X * 2;
  const railZ = -6.7;
  const wood = (u = 0.06, v = 0.2) => sketchMaterial({ tint: COLORS.paper, tintAmount: 0, edge: [u, v], hatchScale: 0.5 });
  const top = new Mesh(new BoxGeometry(railLen, 0.11, 0.24), wood(0.004, 0.12));
  top.position.set(0, 1.08, railZ);
  const bottom = new Mesh(new BoxGeometry(railLen, 0.1, 0.22), wood(0.004, 0.12));
  bottom.position.set(0, 0.12, railZ);
  const profile = [
    [0.055, 0], [0.055, 0.06], [0.035, 0.1], [0.05, 0.22], [0.075, 0.38], [0.06, 0.5], [0.035, 0.6],
    [0.035, 0.66], [0.05, 0.72], [0.05, 0.8], [0.055, 0.86],
  ].map(([x, y]) => new Vector2(x, y));
  const baluster = new LatheGeometry(profile, 10);
  const parts: BufferGeometry[] = [];
  const n = Math.round(railLen / 0.24);
  for (let i = 0; i <= n; i++) parts.push(baluster.clone().translate(-railLen / 2 + (i * railLen) / n, 0.17, railZ));
  const balusters = new Mesh(mergeGeometries(parts), sketchMaterial({ tint: COLORS.paper, edge: [0.25, 0.08], hatchScale: 0.6 }));
  group.add(top, bottom, balusters);

  /* ---- stair huts at both ends (the clothesline is tied to them) ---- */
  for (const side of [-1, 1]) {
    const hw = 3.6, hd = 6.9, hh = 3.6;
    const hut = new Mesh(new BoxGeometry(hw, hh, hd), sketchMaterial({ tint: COLORS.terracotta, tintAmount: 0.08, edge: edgeFor(hw, hh, 0.04) }));
    hut.position.set(side * (HUT_X + hw / 2), hh / 2, -hd / 2 + 0.2);
    const roof = new Mesh(new BoxGeometry(hw + 0.3, 0.16, hd + 0.3), sketchMaterial({ tint: COLORS.ink, tintAmount: 0.25, edge: [0.02, 0.1] }));
    roof.position.set(hut.position.x, hh + 0.08, hut.position.z);
    // a small door on the hut's inner face
    const dw = 0.95, dh = 2.1;
    const hutDoor = new Mesh(new PlaneGeometry(dw, dh), sketchMaterial({ tint: COLORS.ochre, tintAmount: 0.4, edge: edgeFor(dw, dh, 0.035) }));
    hutDoor.position.set(side * (HUT_X - 0.01), dh / 2, -1.6);
    hutDoor.rotation.y = -side * Math.PI / 2;
    outdoor.add(hut, roof, hutDoor);
  }

  /* ---- the city behind ---- */
  outdoor.add(skyDome(skyTexture(17, '#e3ebef'), 32, 40, 8, -2));
  const far = new Mesh(new PlaneGeometry(52, 13), cutout(cityTexture(41, false)));
  far.position.set(0, 3.2, -25);
  const near = new Mesh(new PlaneGeometry(36, 9), cutout(cityTexture(42, true)));
  near.position.set(0, -0.7, -14);
  far.raycast = near.raycast = () => {};
  outdoor.add(far, near);
  const clouds: Array<{ m: Mesh; speed: number; x0: number }> = [];
  [cloudTexture(21), cloudTexture(22), cloudTexture(23)].forEach((t, i) => {
    for (let k = 0; k < 2; k++) {
      const m = cloudSprite(t, 3 + r() * 2.5);
      m.position.set(-14 + (i * 2 + k) * 5.5 + r() * 2, 6.2 + r() * 3, -18 - r() * 5);
      m.lookAt(0, m.position.y * 0.5, 1);
      outdoor.add(m);
      clouds.push({ m, speed: 0.08 + r() * 0.1, x0: m.position.x });
    }
  });

  // wall of the building behind you (you came out of a door in it)
  outdoor.add(wallWithDoorway(HUT_X * 2, 7, -1.5));

  /* ---- clothesline ---- */
  const lineY = (x: number) => {
    const t = Math.min(1, Math.abs(x) / HUT_X);
    return LINE_Y - SAG * (1 - t * t);
  };
  const linePts: Vector3[] = [];
  for (let i = 0; i <= 24; i++) {
    const x = -HUT_X - 0.4 + ((HUT_X + 0.4) * 2 * i) / 24;
    linePts.push(new Vector3(x, lineY(x), LINE_Z));
  }
  const line = new Mesh(new TubeGeometry(new CatmullRomCurve3(linePts), 64, 0.011, 5), sketchMaterial({ tint: COLORS.ink, tintAmount: 0.85, edge: [0, 0] }));
  line.raycast = () => {};
  group.add(line);

  /* ---- posters ---- */
  const items = Array.from(document.querySelectorAll<HTMLElement>('[data-project]'));
  const textures = await Promise.all(items.map((el) => assets.texture(el.dataset.texture!)));

  interface Poster {
    pivot: Group; card: Group; front: Mesh; backFace: Mesh; mats: SketchMaterial[]; backMats: SketchMaterial[];
    index: number; flipped: boolean; sway: number; swayV: number; lift: number; phase: number;
  }
  const posters: Poster[] = [];
  const pinMat = sketchMaterial({ tint: COLORS.ochre, tintAmount: 0.6, edge: [0.2, 0.2] });
  const total = items.length * COPIES;

  for (let i = 0; i < total; i++) {
    const el = items[i % items.length];
    const slug = el.dataset.slug!;
    const pivot = new Group(); // sits on the line; the card hangs from it
    const card = new Group();
    const frontTex = cardFront(el.dataset.title ?? '', el.querySelector('.project__status')?.textContent?.replace(/[()]/g, '') ?? '');
    const baseMat = sketchMaterial({ map: frontTex, edge: [0, 0], paintColor: COLORS.ochre, hatchScale: 0.35 });
    const base = new Mesh(new PlaneGeometry(CARD_W, CARD_H), baseMat);
    const picMat = sketchMaterial({ map: textures[i % items.length], edge: [0, 0], paintColor: i % 2 ? COLORS.terracotta : COLORS.ochre });
    const pic = new Mesh(new PlaneGeometry(CARD_W * 0.8, CARD_W * 0.8 * 0.75), picMat);
    pic.position.set(0, -0.12, 0.004);
    const front = new Group();
    front.add(base, pic);

    const tags = Array.from(el.querySelectorAll('.tag')).map((t) => t.textContent ?? '');
    const backTex = cardBack(el.dataset.title ?? '', el.querySelector('.project__tagline')?.textContent ?? '', tags);
    const backMat = sketchMaterial({ map: backTex, edge: [0, 0], paintColor: COLORS.ochre, hatchScale: 0.35 });
    const backFace = new Mesh(new PlaneGeometry(CARD_W, CARD_H), backMat);
    backFace.rotation.y = Math.PI;
    backFace.position.z = -0.004;
    card.add(front, backFace);
    card.position.y = -CARD_H / 2 - 0.03;
    pivot.add(card);
    // two clothespins
    for (const px of [-CARD_W * 0.32, CARD_W * 0.32]) {
      const pin = new Mesh(new BoxGeometry(0.05, 0.16, 0.05), pinMat);
      pin.position.set(px, -0.03, 0.02);
      pivot.add(pin);
    }
    const mats = [baseMat, picMat];
    tagInteractive(front, { kind: 'poster', id: slug, paint: mats });
    tagInteractive(backFace, { kind: 'poster', id: slug, paint: [backMat] });
    interactives.push(base, pic, backFace);
    group.add(pivot);
    posters.push({ pivot, card, front: base, backFace, mats, backMats: [backMat], index: i, flipped: false, sway: 0, swayV: 0, lift: 0, phase: r() * 6.28 });
  }

  /* ---- a sign so you know what to do ---- */
  const signTex = canvasTexture(1024, 256, (ctx, w, h) => {
    ctx.fillStyle = '#fffdf8';
    ctx.fillRect(0, 0, w, h);
    roughRect(ctx, 12, 12, w - 24, h - 24, 5);
    handText(ctx, '← scroll or drag to browse · click a poster to flip it →', w / 2, h / 2, 64, INK, 'center', w - 60);
  });
  const sign = new Mesh(new PlaneGeometry(2.6, 0.65), sketchMaterial({ map: signTex, edge: [0, 0] }));
  sign.position.set(0, 0.62, railZ + 0.16);
  sign.rotation.x = -0.12;
  group.add(sign);

  /* ---- a pigeon that flies over now and then ---- */
  const birdTex = birdAtlas();
  const birdMat = avatarMaterial(birdTex, birdTex, 2);
  const bird = new Mesh(new PlaneGeometry(0.9, 0.9), birdMat);
  bird.raycast = () => {};
  bird.visible = false;
  outdoor.add(bird);
  let birdT = -4; // seconds until the next flight (negative = waiting)
  let birdDir = 1;

  /* ---- motion ---- */
  let offset = 0;
  let vel = 0;
  let idle = 0;
  const L = total * SPACING;
  const wrapU = (u: number) => ((((u + L / 2) % L) + L) % L) - L / 2;

  const place = (dt: number, time: number) => {
    for (const p of posters) {
      const x = wrapU(p.index * SPACING + offset);
      p.pivot.position.set(x, lineY(x), LINE_Z + 0.02);
      // posters lean against the motion like laundry, then settle (spring)
      const target = Math.max(-0.38, Math.min(0.38, -vel * 0.12)) + Math.sin(time * 1.3 + p.phase) * 0.025;
      const acc = (target - p.sway) * 38 - p.swayV * 7;
      p.swayV += acc * dt;
      p.sway += p.swayV * dt;
      p.pivot.rotation.z = p.sway;
      p.pivot.rotation.x = Math.sin(time * 0.9 + p.phase) * 0.04 - p.lift * 0.12;
      // a flipped poster turns back once it slides away
      if (p.flipped && Math.abs(x) > 4.5) flip(p, false);
    }
  };

  const flip = (p: Poster, on: boolean) => {
    p.flipped = on;
    gsap.to(p.card.rotation, { y: on ? Math.PI : 0, duration: reducedMotion ? 0 : 0.8, ease: 'back.out(1.4)', overwrite: true });
  };

  let time = 0;
  place(0.016, 0);
  group.updateMatrixWorld(true);

  return {
    group,
    interactives,
    outdoor,
    lookAt: [0, 2.1, -8],
    scroll(delta: number) {
      vel += delta * 0.0045;
      vel = Math.max(-9, Math.min(9, vel));
      idle = 0;
    },
    hover(object: Object3D, on: boolean) {
      const p = posters.find((q) => q.front === object || q.backFace === object || q.front.parent === object.parent);
      if (!p || reducedMotion) return;
      gsap.to(p, { lift: on ? 1 : 0, duration: 0.4, ease: 'power2.out', overwrite: true });
      gsap.to(p.card.position, { z: on ? 0.12 : 0, duration: 0.4, ease: 'power2.out', overwrite: true });
    },
    click(object: Object3D) {
      const p = posters.find((q) => q.backFace === object || q.front.parent === object.parent);
      if (!p) return false;
      if (object === p.backFace) {
        // back side: straight to the code
        const slug = (object.userData.interactive as { id: string }).id;
        const href = document.querySelector<HTMLAnchorElement>(`#project-${slug} a.btn-link`)?.href;
        if (!href) return false; // no repo link: main opens the details instead
        window.open(href, '_blank', 'noopener');
        return true;
      }
      for (const q of posters) if (q !== p && q.flipped) flip(q, false);
      flip(p, true);
      return true;
    },
    update(dt: number, _camera: Camera, active: boolean) {
      if (!active) return false;
      time += dt;
      idle += dt;
      // gentle drift after a while without input, so the line never looks frozen
      const drift = reducedMotion || idle < 4 ? 0 : 0.18;
      vel += (drift - vel) * (1 - Math.exp(-dt * (idle < 4 ? 2.2 : 0.6)));
      offset += vel * dt;
      if (!reducedMotion) {
        place(dt, time);
        for (const c of clouds) {
          let x = c.m.position.x + c.speed * dt;
          if (x > c.x0 + 8) x = c.x0 - 8;
          c.m.position.x = x;
        }
        // the pigeon
        birdT += dt;
        if (birdT > 0) {
          const span = 30, dur = 9;
          const u = birdT / dur;
          if (u >= 1) {
            bird.visible = false;
            birdT = -(10 + r() * 10);
            birdDir *= -1;
          } else {
            bird.visible = true;
            bird.position.set(birdDir * (-span / 2 + span * u), 4.6 + Math.sin(u * 9) * 0.25 + u * 0.8, -9.5);
            bird.scale.set(birdDir, 1, 1);
            birdMat.uniforms.uFrame.value = Math.floor(time * 8) % 2;
          }
        }
      } else if (Math.abs(vel) > 1e-3) place(dt, time);
      group.updateMatrixWorld(true);
      return true;
    },
  };
}

function scaleUV(geo: PlaneGeometry, sx: number, sy: number) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy);
}

/* ---------- drawn textures ---------- */

function cardFront(title: string, status: string) {
  return canvasTexture(610, 800, (ctx, w, h) => {
    ctx.fillStyle = '#fffdf8';
    ctx.fillRect(0, 0, w, h);
    roughRect(ctx, 14, 14, w - 28, h - 28, 5);
    // title band
    roughRect(ctx, 44, 44, w - 88, 120, 4);
    handText(ctx, title.toUpperCase(), w / 2, 106, 70, INK, 'center', w - 120);
    // picture frame (the project sketch sits on top of this)
    roughRect(ctx, 52, 200, w - 104, (w - 104) * 0.79, 4);
    if (status) handText(ctx, status, w / 2, h - 70, 40, TERRA, 'center', w - 100);
    else handText(ctx, 'click to flip', w / 2, h - 70, 36, '#8a8783');
  });
}

function cardBack(title: string, tagline: string, tags: string[]) {
  return canvasTexture(610, 800, (ctx, w, h) => {
    ctx.fillStyle = '#fbf6ec';
    ctx.fillRect(0, 0, w, h);
    roughRect(ctx, 14, 14, w - 28, h - 28, 5);
    handText(ctx, title, w / 2, 82, 66, INK, 'center', w - 80);
    ctx.font = '500 25px Inter, system-ui, sans-serif';
    const lines = wrap(ctx, tagline, w - 110).slice(0, 7);
    lines.forEach((l, i) => bodyText(ctx, l, w / 2, 160 + i * 34, 25, '#3d3a36'));
    // tech as little tags
    let y = 160 + lines.length * 34 + 40;
    handText(ctx, 'built with', w / 2, y, 40, TERRA);
    y += 50;
    ctx.font = '600 24px Inter, system-ui, sans-serif';
    let row: string[] = [];
    const rows: string[][] = [];
    let width = 0;
    for (const t of tags) {
      const tw = ctx.measureText(t).width + 34;
      if (width + tw > w - 90 && row.length) { rows.push(row); row = []; width = 0; }
      row.push(t);
      width += tw + 10;
    }
    if (row.length) rows.push(row);
    for (const rr of rows.slice(0, 4)) {
      const rowW = rr.reduce((a, t) => a + ctx.measureText(t).width + 44, -10);
      let x = (w - rowW) / 2;
      for (const t of rr) {
        const tw = ctx.measureText(t).width + 34;
        ctx.fillStyle = '#fffdf8';
        ctx.beginPath();
        ctx.roundRect(x, y - 22, tw, 44, 18);
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        bodyText(ctx, t, x + tw / 2, y + 1, 24, INK);
        ctx.font = '600 24px Inter, system-ui, sans-serif';
        x += tw + 10;
      }
      y += 56;
    }
    // the "button"
    const bw = 360, bh = 70, bx = (w - bw) / 2, by = h - 130;
    ctx.fillStyle = '#c8553d';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 20);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.stroke();
    handText(ctx, 'open on GitHub →', w / 2, by + bh / 2 + 2, 44, '#fffdf8');
  });
}

/** Rooftops and towers, ink on transparent. `near` = pitched roofs, chimneys, water tanks. */
function cityTexture(seed: number, near: boolean) {
  const r = rng(seed);
  return canvasTexture(2048, 512, (ctx, w, h) => {
    ctx.lineJoin = 'round';
    // opaque greys instead of alpha: the sprite shader cuts out anything under 50% alpha
    const pencil = (lw: number, a = 1) => {
      const v = Math.round(43 + (246 - 43) * (1 - a));
      ctx.strokeStyle = `rgb(${v},${v},${v - 2})`;
      ctx.lineWidth = lw;
      ctx.globalAlpha = 1;
    };
    if (!near) {
      // towers + cranes, light
      let x = 0;
      while (x < w) {
        const bw = 60 + r() * 120, bh = 120 + r() * 300;
        ctx.fillStyle = '#f1f0ec';
        ctx.globalAlpha = 1;
        ctx.fillRect(x, h - bh, bw, bh);
        pencil(3, 0.55);
        ctx.strokeRect(x, h - bh, bw, bh + 4);
        pencil(1.5, 0.25);
        for (let wy = h - bh + 18; wy < h - 10; wy += 22) for (let wx = x + 10; wx < x + bw - 14; wx += 18) ctx.strokeRect(wx, wy, 7, 10);
        if (r() < 0.3) { pencil(2.5, 0.5); ctx.beginPath(); ctx.moveTo(x + bw / 2, h - bh); ctx.lineTo(x + bw / 2, h - bh - 50); ctx.stroke(); }
        x += bw + r() * 30;
        if (r() < 0.12) { // crane
          pencil(3, 0.5);
          const cx = x + 20, top = h - 430 - r() * 40;
          ctx.beginPath(); ctx.moveTo(cx, h); ctx.lineTo(cx, top); ctx.moveTo(cx - 60, top + 10); ctx.lineTo(cx + 170, top + 10); ctx.lineTo(cx, top - 20); ctx.lineTo(cx - 60, top + 10);
          ctx.moveTo(cx + 140, top + 10); ctx.lineTo(cx + 140, top + 90); ctx.stroke();
        }
      }
    } else {
      // pitched roofs with chimneys, water tanks and antennas
      let x = -40;
      while (x < w) {
        const bw = 150 + r() * 160, wallTop = h - 110 - r() * 70, peak = wallTop - 60 - r() * 60;
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#f6f5f1';
        ctx.beginPath();
        ctx.moveTo(x, h); ctx.lineTo(x, wallTop); ctx.lineTo(x + bw / 2, peak); ctx.lineTo(x + bw, wallTop); ctx.lineTo(x + bw, h); ctx.closePath();
        ctx.fill();
        pencil(4, 0.8);
        ctx.stroke();
        // roof hatching
        pencil(2, 0.35);
        for (let k = 0.1; k < 1; k += 0.08) {
          ctx.beginPath();
          ctx.moveTo(x + (bw / 2) * k, wallTop - (wallTop - peak) * k);
          ctx.lineTo(x + bw - (bw / 2) * k + 0, wallTop - (wallTop - peak) * k);
          ctx.stroke();
        }
        // chimney
        if (r() < 0.7) {
          const cx = x + bw * (0.2 + r() * 0.5), cw = 26, ch = 60;
          const cy = wallTop - (wallTop - peak) * (1 - Math.abs(cx - (x + bw / 2)) / (bw / 2)) - ch + 20;
          ctx.globalAlpha = 1; ctx.fillStyle = '#f6f5f1'; ctx.fillRect(cx, cy, cw, ch);
          pencil(3.5, 0.8); ctx.strokeRect(cx, cy, cw, ch); ctx.strokeRect(cx - 5, cy - 8, cw + 10, 10);
        }
        // water tank
        if (r() < 0.25) {
          const tx = x + bw * 0.6, ty = peak - 40;
          pencil(3, 0.7);
          ctx.globalAlpha = 1; ctx.fillStyle = '#f6f5f1'; ctx.fillRect(tx, ty - 60, 60, 60);
          pencil(3, 0.75);
          ctx.strokeRect(tx, ty - 60, 60, 60);
          ctx.beginPath(); ctx.moveTo(tx - 4, ty - 60); ctx.lineTo(tx + 30, ty - 90); ctx.lineTo(tx + 64, ty - 60);
          ctx.moveTo(tx + 8, ty); ctx.lineTo(tx + 4, ty + 50); ctx.moveTo(tx + 52, ty); ctx.lineTo(tx + 56, ty + 50); ctx.stroke();
        }
        // antenna
        if (r() < 0.3) {
          pencil(2.5, 0.7);
          const ax = x + bw / 2;
          ctx.beginPath(); ctx.moveTo(ax, peak); ctx.lineTo(ax, peak - 70);
          for (let k = 0; k < 3; k++) { ctx.moveTo(ax - 22 + k * 4, peak - 60 + k * 14); ctx.lineTo(ax + 22 - k * 4, peak - 60 + k * 14); }
          ctx.stroke();
        }
        x += bw - 10 + r() * 20;
      }
    }
    ctx.globalAlpha = 1;
  });
}

/** Two-frame pigeon (wings up / down) in a 2×2 atlas. */
function birdAtlas() {
  return canvasTexture(512, 512, (ctx) => {
    for (let f = 0; f < 2; f++) {
      ctx.save();
      ctx.translate(128 + f * 256, 128);
      ctx.lineWidth = 6;
      ctx.strokeStyle = INK;
      ctx.fillStyle = '#c9c7c2';
      // body
      ctx.beginPath(); ctx.ellipse(0, 10, 62, 34, -0.1, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // tail
      ctx.beginPath(); ctx.moveTo(-55, 8); ctx.lineTo(-100, -6); ctx.lineTo(-96, 26); ctx.closePath(); ctx.fill(); ctx.stroke();
      // head + beak + eye
      ctx.beginPath(); ctx.arc(62, -14, 24, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e0a458';
      ctx.beginPath(); ctx.moveTo(84, -16); ctx.lineTo(104, -8); ctx.lineTo(84, -4); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(68, -18, 4.5, 0, Math.PI * 2); ctx.fill();
      // wing
      ctx.fillStyle = '#a9a6a0';
      ctx.beginPath();
      if (f === 0) { ctx.moveTo(-20, 0); ctx.lineTo(10, -100); ctx.lineTo(40, -6); }
      else { ctx.moveTo(-20, 14); ctx.lineTo(0, 92); ctx.lineTo(36, 18); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  });
}
