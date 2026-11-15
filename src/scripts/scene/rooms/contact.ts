import { Group, Mesh, PlaneGeometry } from 'three';
import { COLORS, ROOM } from '../config';
import { sketchify, sketchMaterial, type SketchMaterial } from '../materials';
import { bodyText, canvasTexture, handText, scribbleUnderline, wrap, TERRA, OCHRE } from '../sketch-canvas';
import { tagInteractive } from '../corridor';
import { buildShell } from './shell';
import type { RoomBuildContext, RoomContent } from './index';
import { profile } from '../../../data/profile';

/** Contact room: a sketched desk with a letter, and a note on the wall. */
export async function build({ assets }: RoomBuildContext): Promise<RoomContent> {
  const group = new Group();
  group.add(buildShell(COLORS.terracotta, 0.04));
  const D = ROOM.depth;

  const letterTex = canvasTexture(640, 860, (ctx, w) => {
    ctx.fillStyle = '#fffdf8';
    ctx.fillRect(0, 0, w, 860);
    ctx.font = '700 84px Caveat, cursive';
    const lines = wrap(ctx, profile.contactHeadline, w - 90);
    lines.forEach((l, i) => handText(ctx, l, w / 2, 130 + i * 86, 84));
    scribbleUnderline(ctx, 90, w - 90, 150 + lines.length * 86, TERRA, 6);
    bodyText(ctx, profile.email, w / 2, 470, 32);
    bodyText(ctx, 'GitHub · LinkedIn', w / 2, 540, 30, '#5a5652');
    handText(ctx, `${profile.location} · ${profile.availability}`, w / 2, 660, 46, TERRA, 'center', w - 60);
    handText(ctx, '— Mohamed', w - 60, 780, 60, '#2b2b2b', 'right');
  });

  const desk = await assets.model('/models/desk.glb');
  const parts = sketchify(desk, { letter: letterTex });
  desk.position.set(0, 0, -D + 1.6);
  desk.scale.setScalar(1.25);
  group.add(desk);

  const letterMesh = parts.letter;
  const paint = [letterMesh?.material as SketchMaterial].filter(Boolean);
  tagInteractive(desk, { kind: 'letter', id: 'contact', paint });

  // Big "say hi" note on the back wall.
  const noteTex = canvasTexture(1024, 512, (ctx, w, h) => {
    handText(ctx, 'say hi!', w / 2, h / 2 - 40, 190, TERRA);
    scribbleUnderline(ctx, w * 0.25, w * 0.75, h / 2 + 80, OCHRE, 12);
  });
  const note = new Mesh(new PlaneGeometry(2.6, 1.3), sketchMaterial({ map: noteTex, edge: [0, 0] }));
  note.position.set(0, 2.35, -D + 0.04);
  group.add(note);

  return { group, interactives: Object.values(parts) as Mesh[] };
}
