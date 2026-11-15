import { Group, Mesh, PlaneGeometry } from 'three';
import { COLORS, ROOM } from '../config';
import { edgeFor, sketchify, sketchMaterial, type SketchMaterial } from '../materials';
import { bodyText, canvasTexture, handText, wrap, TERRA, OCHRE, roughRect } from '../sketch-canvas';
import { tagInteractive } from '../corridor';
import { buildShell } from './shell';
import type { RoomBuildContext, RoomContent } from './index';
import { profile } from '../../../data/profile';

function certificateTexture(title: string, inst: string, period: string, degree: boolean) {
  return canvasTexture(1024, 768, (ctx, w, h) => {
    ctx.fillStyle = '#fffdf6';
    ctx.fillRect(0, 0, w, h);
    roughRect(ctx, 36, 36, w - 72, h - 72, 4);
    roughRect(ctx, 56, 56, w - 112, h - 112, 2, TERRA);
    handText(ctx, degree ? 'Degree' : 'Certificate', w / 2, 140, 64, TERRA);
    ctx.font = '700 96px Caveat, cursive';
    const lines = wrap(ctx, title, w - 200);
    lines.forEach((l, i) => handText(ctx, l, w / 2, 270 + i * 92, 96));
    ctx.font = '500 34px Inter, sans-serif';
    const instLines = wrap(ctx, inst, w - 240);
    instLines.forEach((l, i) => bodyText(ctx, l, w / 2, 300 + lines.length * 92 + i * 44, 34));
    if (period) handText(ctx, period, w / 2, h - 130, 54, '#5a5652');
    // seal
    ctx.fillStyle = OCHRE;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(w - 150, h - 150, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#2b2b2b';
    ctx.lineWidth = 3;
    ctx.stroke();
  });
}

/** Education room: framed certificates on the walls + a languages note (click any to read it up close). */
export async function build({ assets }: RoomBuildContext): Promise<RoomContent> {
  const group = new Group();
  group.add(buildShell());
  const interactives: Mesh[] = [];
  const D = ROOM.depth;
  const W = ROOM.width;
  const items = Array.from(document.querySelectorAll<HTMLElement>('[data-education]'));

  const slots = [
    { x: 0, y: 1.85, z: -D + 0.05, ry: 0, s: 2.3 },            // degree, centre of back wall
    { x: -2.45, y: 2.05, z: -D + 0.05, ry: 0, s: 1.25 },
    { x: 2.45, y: 2.05, z: -D + 0.05, ry: 0, s: 1.25 },
    { x: -W / 2 + 0.05, y: 1.75, z: -4.9, ry: Math.PI / 2, s: 1.5 },
    { x: W / 2 - 0.05, y: 1.75, z: -4.9, ry: -Math.PI / 2, s: 1.5 },
  ];

  await Promise.all(
    items.slice(0, slots.length).map(async (el, i) => {
      const frame = await assets.model('/models/frame.glb');
      const degree = el.classList.contains('cert--degree');
      const tex = certificateTexture(el.dataset.title ?? '', el.dataset.institution ?? '', el.dataset.period ?? '', degree);
      const parts = sketchify(frame, { picture: tex });
      const s = slots[i];
      frame.position.set(s.x + Math.sin(s.ry) * 0.035, s.y, s.z + Math.cos(s.ry) * 0.035);
      frame.rotation.y = s.ry;
      frame.scale.setScalar(s.s);
      const paint = Object.values(parts).map((m) => m.material as SketchMaterial);
      tagInteractive(frame, { kind: 'card', id: `education-${i}`, paint, inspect: true });
      interactives.push(...(Object.values(parts) as Mesh[]));
      group.add(frame);
    }),
  );

  // Languages note pinned under the small certificates.
  const langTex = canvasTexture(768, 300, (ctx, w) => {
    handText(ctx, 'Languages', w / 2, 70, 72, TERRA);
    profile.languages.forEach((l, i) => handText(ctx, `${l.name} (${l.level})`, w / 2, 160 + i * 72, 62));
  });
  const langMat = sketchMaterial({ map: langTex, tint: COLORS.ochre, tintAmount: 0.2, edge: edgeFor(1.4, 0.55, 0.02) });
  const lang = new Mesh(new PlaneGeometry(1.4, 0.55), langMat);
  lang.position.set(2.45, 0.95, -D + 0.04);
  group.add(lang);
  tagInteractive(lang, { kind: 'card', id: 'languages', paint: [langMat], inspect: true });
  interactives.push(lang);

  return { group, interactives };
}
