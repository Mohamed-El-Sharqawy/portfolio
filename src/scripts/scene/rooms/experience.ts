import { BoxGeometry, Group, Mesh, PlaneGeometry, SphereGeometry } from 'three';
import { COLORS, ROOM } from '../config';
import { edgeFor, sketchMaterial } from '../materials';
import { bodyText, canvasTexture, handText, wrap, TERRA, roughLine } from '../sketch-canvas';
import { tagInteractive } from '../corridor';
import { buildShell } from './shell';
import type { RoomBuildContext, RoomContent } from './index';

/** Experience room: four sketched cards pinned along a timeline on the back wall. */
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
    const card = new Mesh(new PlaneGeometry(cardW, cardH), mat);
    card.position.set(xs[i], up ? 2.35 : 0.78, wallZ + 0.01);
    card.rotation.z = (i % 2 ? 1 : -1) * 0.025;
    const pin = new Mesh(new SphereGeometry(0.045, 8, 6), sketchMaterial({ tint: COLORS.terracotta, tintAmount: 0.85, edge: [0, 0] }));
    pin.position.set(xs[i], card.position.y + (cardH / 2 - 0.08), wallZ + 0.04);
    const dot = new Mesh(new SphereGeometry(0.07, 10, 8), sketchMaterial({ tint: COLORS.ochre, tintAmount: 0.85, edge: [0, 0] }));
    dot.position.set(xs[i], 1.55, wallZ + 0.03);
    const stem = new Mesh(new BoxGeometry(0.02, up ? 0.35 : 0.3, 0.01), sketchMaterial({ tint: COLORS.ink, tintAmount: 0.9, edge: [0, 0] }));
    stem.position.set(xs[i], up ? 1.72 : 1.39, wallZ);
    group.add(card, pin, dot, stem);
    tagInteractive(card, { kind: 'card', id: `experience-${i}`, paint: [mat] });
    interactives.push(card);
  });

  // the timeline continues… (Mohamed is available for his next role)
  const arrowTex = canvasTexture(512, 128, (ctx, w, h) => handText(ctx, 'next: your team? →', w / 2, h / 2, 64, TERRA));
  const arrow = new Mesh(new PlaneGeometry(1.0, 0.25), sketchMaterial({ map: arrowTex, edge: [0, 0] }));
  arrow.position.set(2.75, 1.82, wallZ + 0.01); // above the line, over the empty slot
  group.add(arrow);

  return { group, interactives };
}
