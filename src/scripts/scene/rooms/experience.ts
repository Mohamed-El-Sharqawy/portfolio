import { BoxGeometry, Group, Mesh, PlaneGeometry, SphereGeometry, type Object3D } from 'three';
import gsap from 'gsap';
import { COLORS, ROOM } from '../config';
import { edgeFor, sketchMaterial } from '../materials';
import { bodyText, canvasTexture, handText, wrap, TERRA, roughLine } from '../sketch-canvas';
import { tagInteractive } from '../corridor';
import { buildShell } from './shell';
import type { RoomBuildContext, RoomContent } from './index';

/**
 * Experience room: four sketched cards pinned along a timeline on the back wall.
 * Click a card: it comes off the wall, flips over and shows what the job was
 * about (the summary); click again to pin it back.
 */
export async function build(_ctx: RoomBuildContext): Promise<RoomContent> {
  const group = new Group();
  group.add(buildShell(COLORS.ochre, 0.06));
  const interactives: Mesh[] = [];
  const D = ROOM.depth;
  const wallZ = -D + 0.03;

  // timeline line + year ticks
  const line = new Mesh(new BoxGeometry(6.2, 0.035, 0.02), sketchMaterial({ tint: COLORS.ink, tintAmount: 0.9, edge: [0, 0] }));
  line.position.set(0, 1.55, wallZ);
  group.add(line);

  const jobs = Array.from(document.querySelectorAll<HTMLElement>('[data-experience]'));
  // Oldest on the left so the timeline reads left → right.
  const ordered = [...jobs].reverse();
  const xs = [-2.4, -0.8, 0.8, 2.4];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  interface Card { pivot: Group; front: Mesh; back: Mesh; flipped: boolean; z0: number }
  const cards: Card[] = [];

  ordered.forEach((el, i) => {
    const up = i % 2 === 0;
    const cardW = 1.45;
    const cardH = 1.0;
    const tex = canvasTexture(768, 530, (ctx, w, h) => {
      ctx.fillStyle = '#fffdf8';
      ctx.fillRect(0, 0, w, h);
      handText(ctx, el.dataset.role ?? '', w / 2, 80, 64, '#2b2b2b', 'center', w - 60);
      roughLine(ctx, 80, 130, w - 80, 128, 3, TERRA);
      ctx.font = '600 34px Inter, sans-serif';
      const company = `${el.dataset.company ?? ''}`;
      const lines = wrap(ctx, company, w - 100);
      lines.forEach((l, k) => bodyText(ctx, l, w / 2, 190 + k * 44, 34));
      bodyText(ctx, el.dataset.location ?? '', w / 2, 210 + lines.length * 44, 28, '#5a5652');
      handText(ctx, el.dataset.period ?? '', w / 2, h - 90, 58, TERRA);
    });
    const mat = sketchMaterial({ map: tex, edge: edgeFor(cardW, cardH, 0.025), paintColor: i % 2 ? COLORS.ochre : COLORS.terracotta });
    // the back: what the job was (the last paragraph of the article)
    const ps = el.querySelectorAll('p');
    const summary = ps[ps.length - 1]?.textContent?.trim() ?? '';
    const backTex = canvasTexture(768, 530, (ctx, w, h) => {
      ctx.fillStyle = '#fffdf8';
      ctx.fillRect(0, 0, w, h);
      handText(ctx, el.dataset.company ?? '', w / 2, 52, 46, TERRA, 'center', w - 60);
      // biggest type that fits the card
      let size = 38;
      let lines: string[] = [];
      for (; size > 20; size -= 2) {
        ctx.font = `500 ${size}px Inter, system-ui, sans-serif`;
        lines = wrap(ctx, summary, w - 70);
        if (lines.length * size * 1.34 <= h - 170) break;
      }
      const lh = size * 1.34;
      lines.forEach((l, k) => bodyText(ctx, l, 36, 112 + lh / 2 + k * lh, size, '#2b2b2b', 'left'));
      handText(ctx, `${matchMedia('(pointer: coarse)').matches ? 'tap' : 'click'} to pin it back`, w / 2, h - 30, 34, '#8a8783');
    });
    const backMat = sketchMaterial({ map: backTex, edge: edgeFor(cardW, cardH, 0.025), paintColor: i % 2 ? COLORS.ochre : COLORS.terracotta });
    const front = new Mesh(new PlaneGeometry(cardW, cardH), mat);
    const back = new Mesh(new PlaneGeometry(cardW, cardH), backMat);
    back.rotation.y = Math.PI;
    back.position.z = -0.002;
    const card = new Group();
    card.add(front, back);
    card.position.set(xs[i], up ? 2.35 : 0.78, wallZ + 0.01);
    card.rotation.z = (i % 2 ? 1 : -1) * 0.025;
    cards.push({ pivot: card, front, back, flipped: false, z0: card.position.z });
    const pin = new Mesh(new SphereGeometry(0.045, 8, 6), sketchMaterial({ tint: COLORS.terracotta, tintAmount: 0.85, edge: [0, 0] }));
    pin.position.set(xs[i], card.position.y + (cardH / 2 - 0.08), wallZ + 0.04);
    const dot = new Mesh(new SphereGeometry(0.07, 10, 8), sketchMaterial({ tint: COLORS.ochre, tintAmount: 0.85, edge: [0, 0] }));
    dot.position.set(xs[i], 1.55, wallZ + 0.03);
    const stem = new Mesh(new BoxGeometry(0.02, up ? 0.35 : 0.3, 0.01), sketchMaterial({ tint: COLORS.ink, tintAmount: 0.9, edge: [0, 0] }));
    stem.position.set(xs[i], up ? 1.72 : 1.39, wallZ);
    group.add(card, pin, dot, stem);
    tagInteractive(front, { kind: 'card', id: `experience-${i}`, paint: [mat] });
    tagInteractive(back, { kind: 'card', id: `experience-${i}`, paint: [backMat] });
    interactives.push(front, back);
  });

  // the timeline continues… (Mohamed is available for his next role)
  const arrowTex = canvasTexture(512, 128, (ctx, w, h) => handText(ctx, 'next: your team? →', w / 2, h / 2, 64, TERRA));
  const arrow = new Mesh(new PlaneGeometry(1.0, 0.25), sketchMaterial({ map: arrowTex, edge: [0, 0] }));
  arrow.position.set(2.75, 1.82, wallZ + 0.01); // above the line, over the empty slot
  group.add(arrow);

  const flip = (c: Card, on: boolean) => {
    c.flipped = on;
    const d = reducedMotion ? 0 : 1;
    const tl = gsap.timeline({ onUpdate: () => c.pivot.updateMatrixWorld(true) });
    gsap.killTweensOf([c.pivot.position, c.pivot.rotation, c.pivot.scale]);
    // off the wall first (so the turning card never cuts into it), turn, then settle
    tl.to(c.pivot.position, { z: c.z0 + 0.75, duration: 0.3 * d, ease: 'power2.out' })
      .to(c.pivot.rotation, { y: on ? Math.PI : 0, duration: 0.6 * d, ease: 'power2.inOut' }, '-=0.05')
      .to(c.pivot.position, { z: c.z0 + (on ? 0.4 : 0), duration: 0.35 * d, ease: 'power2.inOut' })
      // a flipped card comes up a little bigger, so the summary reads from where you stand
      .to(c.pivot.scale, { x: on ? 1.22 : 1, y: on ? 1.22 : 1, duration: 0.35 * d, ease: 'power2.inOut' }, '<');
  };

  return {
    group,
    interactives,
    hover(object: Object3D, on: boolean) {
      const c = cards.find((q) => q.front === object || q.back === object);
      if (!c || reducedMotion || gsap.isTweening(c.pivot.rotation)) return;
      const k = (c.flipped ? 1.22 : 1) * (on ? 1.04 : 1);
      gsap.to(c.pivot.scale, { x: k, y: k, duration: 0.3, ease: 'power2.out', overwrite: true, onUpdate: () => c.pivot.updateMatrixWorld(true) });
    },
    click(object: Object3D) {
      const c = cards.find((q) => q.front === object || q.back === object);
      if (!c) return false;
      for (const q of cards) if (q !== c && q.flipped) flip(q, false);
      flip(c, !c.flipped);
      return true;
    },
  };
}
