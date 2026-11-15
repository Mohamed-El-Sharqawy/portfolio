import { BoxGeometry, Group, Mesh, PlaneGeometry, type Object3D } from 'three';
import gsap from 'gsap';
import { siGithub } from 'simple-icons';
import { COLORS, ROOM } from '../config';
import { edgeFor, sketchify, sketchMaterial, type SketchMaterial } from '../materials';
import { bodyText, canvasTexture, handText, roughLine, scribbleUnderline, wash, INK, OCHRE, TERRA } from '../sketch-canvas';
import { tagInteractive } from '../corridor';
import { buildShell } from './shell';
import type { RoomBuildContext, RoomContent } from './index';
import { profile } from '../../../data/profile';

/**
 * Contact room: every sketched object is a way to reach me, and works directly
 * (interactive kind 'link', handled in main.ts):
 *   · a laptop showing a "new email" to me → mailto:
 *   · a smartphone → dials the number (tel:) if profile.phone is set,
 *     otherwise it shows a mail app and opens the email
 *   · framed GitHub and LinkedIn logos → the profiles (new tab)
 *   · a hand-drawn map of Dubai with a pin → a Dubai maps search (new tab)
 */
const GREY = '#5a5652';
const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(profile.location)}`;

export async function build({ assets }: RoomBuildContext): Promise<RoomContent> {
  const group = new Group();
  group.add(buildShell(COLORS.terracotta, 0.04));
  const D = ROOM.depth;
  const wallZ = -D + 0.03;
  const interactives: Mesh[] = [];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // portrait phones see a narrow slice of the back wall: frames + map move in and shrink
  const narrow = innerWidth / innerHeight < 0.8;
  /** Groups that lift a little on hover. */
  const liftable = new Map<Object3D, Group>();

  const link = (root: Group, url: string, paint: SketchMaterial[], hoverRoot = root) => {
    tagInteractive(root, { kind: 'link', id: url, paint });
    root.traverse((o) => {
      if ((o as Mesh).isMesh) {
        interactives.push(o as Mesh);
        liftable.set(o, hoverRoot);
      }
    });
  };
  const mailto = `mailto:${profile.email}`;
  const phone = profile.phone.trim();

  /* ---- "say hi!" on the back wall ---- */
  const noteTex = canvasTexture(1024, 400, (ctx, w, h) => {
    handText(ctx, 'say hi!', w / 2, h / 2 - 30, 170, TERRA);
    scribbleUnderline(ctx, w * 0.3, w * 0.7, h / 2 + 70, OCHRE, 11);
  });
  const note = new Mesh(new PlaneGeometry(2.0, 0.78), sketchMaterial({ map: noteTex, edge: [0, 0] }));
  note.position.set(0, narrow ? 3.05 : 2.85, wallZ);
  if (narrow) note.scale.setScalar(0.7);
  note.raycast = () => {};
  group.add(note);

  /* ---- the desk (cleared: the laptop and phone are on it now) ---- */
  const desk = await assets.model('/models/desk.glb');
  const parts = sketchify(desk);
  for (const name of ['letter', 'envelope', 'pencil', 'lamp_base', 'lamp_arm', 'lamp_shade']) if (parts[name]) parts[name].visible = false;
  const DESK_Z = -4.3, DESK_S = 1.25, TOP = 0.8 * DESK_S;
  desk.position.set(0, 0, DESK_Z);
  desk.scale.setScalar(DESK_S);
  for (const m of Object.values(parts)) m.raycast = () => {};
  group.add(desk);

  /* ---- laptop: a "new email" to me ---- */
  const laptop = new Group();
  const shell = () => sketchMaterial({ tint: 0x9a9894, tintAmount: 0.35, edge: [0.03, 0.05] });
  const LW = 0.86, LD = 0.58;
  const base = new Mesh(new BoxGeometry(LW, 0.035, LD), shell());
  base.position.y = 0.0175;
  const keysTex = canvasTexture(512, 340, (ctx, w, h) => {
    ctx.strokeStyle = INK;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 3;
    for (let r = 0; r < 5; r++) for (let c = 0; c < 12; c++) ctx.strokeRect(34 + c * 37, 24 + r * 37, 30, 30);
    ctx.globalAlpha = 0.8;
    ctx.strokeRect(w / 2 - 80, h - 110, 160, 86); // trackpad
  });
  const keys = new Mesh(new PlaneGeometry(LW - 0.06, LD - 0.06), sketchMaterial({ map: keysTex, edge: [0, 0] }));
  keys.rotation.x = -Math.PI / 2;
  keys.position.y = 0.036;
  const lid = new Group(); // hinge at the back edge
  lid.position.set(0, 0.035, -LD / 2);
  lid.rotation.x = -0.22; // leaning back a little
  const lidBox = new Mesh(new BoxGeometry(LW, 0.56, 0.025), shell());
  lidBox.position.set(0, 0.28, -0.0125);
  const screenMat = sketchMaterial({ map: canvasTexture(1024, 640, drawMailCompose), edge: [0, 0], paintColor: COLORS.ochre, hatchScale: 0.3 });
  const screen = new Mesh(new PlaneGeometry(LW - 0.07, 0.5), screenMat);
  screen.position.set(0, 0.28, 0.002);
  lid.add(lidBox, screen);
  laptop.add(base, keys, lid);
  laptop.position.set(-0.32, TOP, DESK_Z + 0.05);
  laptop.rotation.y = 0.12;
  group.add(laptop);
  link(laptop, `${mailto}?subject=${encodeURIComponent('Hello Mohamed')}`, [screenMat]);

  /* ---- smartphone on a little stand ---- */
  const phoneG = new Group();
  const PW = 0.3, PH = 0.58;
  const body = new Mesh(new BoxGeometry(PW, PH, 0.03), sketchMaterial({ tint: COLORS.ink, tintAmount: 0.75, edge: [0.04, 0.03] }));
  const phoneMat = sketchMaterial({ map: canvasTexture(400, 780, phone ? drawDialer(phone) : drawMailApp), edge: [0, 0], paintColor: phone ? COLORS.sage : COLORS.terracotta, hatchScale: 0.3 });
  const phoneScreen = new Mesh(new PlaneGeometry(PW - 0.03, PH - 0.04), phoneMat);
  phoneScreen.position.z = 0.016;
  const tilted = new Group();
  tilted.add(body, phoneScreen);
  tilted.rotation.x = -0.24;
  tilted.position.set(0, PH / 2 + 0.02, 0);
  const stand = new Mesh(new BoxGeometry(0.22, 0.05, 0.16), sketchMaterial({ tint: COLORS.ochre, tintAmount: 0.6, edge: [0.06, 0.08] }));
  stand.position.set(0, 0.025, 0.06);
  phoneG.add(tilted, stand);
  phoneG.position.set(0.66, TOP, DESK_Z + 0.08);
  phoneG.rotation.y = -0.22;
  group.add(phoneG);
  link(phoneG, phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : mailto, [phoneMat]);

  /* ---- framed GitHub + LinkedIn on the back wall, left ---- */
  const frame = (draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, x: number, y: number, url: string, tilt: number, scale = 1) => {
    const g = new Group();
    const S = 0.92;
    const wood = new Mesh(new BoxGeometry(S + 0.12, S + 0.12, 0.05), sketchMaterial({ tint: COLORS.ochre, tintAmount: 0.55, edge: [0.05, 0.05] }));
    const mat = sketchMaterial({ map: canvasTexture(512, 512, draw), edge: edgeFor(S, S, 0.02), paintColor: COLORS.ochre });
    const pic = new Mesh(new PlaneGeometry(S, S), mat);
    pic.position.z = 0.027;
    g.add(wood, pic);
    g.position.set(x, y, wallZ + 0.03);
    g.rotation.z = tilt;
    g.scale.setScalar(scale);
    group.add(g);
    link(g, url, [mat]);
  };
  if (narrow) {
    frame(drawGithub, -1.45, 2.3, profile.links.github, 0.03, 0.75);
    frame(drawLinkedin, -0.55, 2.25, profile.links.linkedin, -0.035, 0.75);
  } else {
    frame(drawGithub, -2.45, 2.4, profile.links.github, 0.03);
    frame(drawLinkedin, -2.2, 1.2, profile.links.linkedin, -0.035);
  }

  /* ---- hand-drawn map of Dubai, back wall right ---- */
  const mapG = new Group();
  const MW = 2.1, MH = 1.5;
  const mapMat = sketchMaterial({ map: canvasTexture(1024, 732, drawDubaiMap), edge: edgeFor(MW, MH, 0.02), paintColor: COLORS.sage });
  const mapPaper = new Mesh(new PlaneGeometry(MW, MH), mapMat);
  const pinBoard = new Mesh(new BoxGeometry(MW + 0.1, MH + 0.1, 0.04), sketchMaterial({ tint: COLORS.ochre, tintAmount: 0.3, edge: [0.03, 0.04] }));
  mapPaper.position.z = 0.022;
  mapG.add(pinBoard, mapPaper);
  mapG.position.set(narrow ? 1.0 : 2.15, narrow ? 2.25 : 1.8, wallZ + 0.02);
  if (narrow) mapG.scale.setScalar(0.62);
  mapG.rotation.z = -0.015;
  group.add(mapG);
  link(mapG, MAPS_URL, [mapMat]);

  /* ---- a hint on the floor in front of the desk ---- */
  const hintTex = canvasTexture(1024, 160, (ctx, w, h) => handText(ctx, `${matchMedia('(pointer: coarse)').matches ? 'tap' : 'click'} anything to get in touch`, w / 2, h / 2, 74, GREY));
  const hint = new Mesh(new PlaneGeometry(2.4, 0.375), sketchMaterial({ map: hintTex, edge: [0, 0] }));
  hint.rotation.x = -Math.PI / 2;
  hint.position.set(0, 0.004, DESK_Z + 1.25);
  if (narrow) hint.scale.setScalar(0.62);
  hint.raycast = () => {};
  group.add(hint);

  return {
    group,
    interactives,
    hover(object: Object3D, on: boolean) {
      const g = liftable.get(object);
      if (!g || reducedMotion) return;
      const home = (g.userData.home ??= g.position.clone());
      const toward = g === laptop || g === phoneG ? { y: home.y + (on ? 0.04 : 0) } : { z: home.z + (on ? 0.06 : 0) };
      gsap.to(g.position, { ...toward, duration: 0.3, ease: 'power2.out', overwrite: true, onUpdate: () => g.updateMatrixWorld(true) });
    },
  };
}

/* ---------- drawings ---------- */

/** Laptop screen: a mail client with a new message to me. */
function drawMailCompose(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#fffdf8';
  ctx.fillRect(0, 0, w, h);
  // window bar
  ctx.fillStyle = '#ece6dc';
  ctx.fillRect(0, 0, w, 70);
  roughLine(ctx, 0, 70, w, 70, 3);
  for (const [i, c] of ['#e06c5a', '#e0a458', '#8aa17b'].entries()) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(40 + i * 36, 35, 11, 0, Math.PI * 2);
    ctx.fill();
  }
  handText(ctx, 'New message', w / 2, 36, 46, INK);
  // fields
  const field = (label: string, value: string, y: number) => {
    bodyText(ctx, label, 50, y, 28, GREY, 'left');
    bodyText(ctx, value, 175, y, 30, INK, 'left', w - 220);
    roughLine(ctx, 40, y + 30, w - 40, y + 30, 2, '#b9b3aa');
  };
  field('To:', profile.email, 125);
  field('Subject:', 'Hello Mohamed', 200);
  // body: handwriting + caret
  handText(ctx, 'Hi Mohamed,', 50, 290, 50, INK, 'left');
  handText(ctx, "I'd love to talk about…", 50, 350, 50, INK, 'left');
  ctx.fillStyle = TERRA;
  ctx.fillRect(470, 328, 4, 44);
  // send button
  const bx = w - 300, by = h - 130;
  ctx.fillStyle = TERRA;
  ctx.beginPath();
  ctx.roundRect(bx, by, 250, 84, 20);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.stroke();
  handText(ctx, 'Send →', bx + 125, by + 44, 52, '#fffdf8');
  handText(ctx, 'click to write to me', 50, h - 88, 40, GREY, 'left');
}

/** Phone screen without a number: a mail app, compose button front and centre. */
function drawMailApp(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#fffdf8';
  ctx.fillRect(0, 0, w, h);
  bodyText(ctx, '9:41', 40, 34, 24, INK, 'left');
  handText(ctx, 'Mail', w / 2, 110, 72, INK);
  roughLine(ctx, 30, 160, w - 30, 160, 3);
  // envelope
  const ex = w / 2 - 110, ey = 210, ew = 220, eh = 150;
  ctx.fillStyle = '#fbe9d8';
  ctx.fillRect(ex, ey, ew, eh);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.strokeRect(ex, ey, ew, eh);
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(ex + ew / 2, ey + eh * 0.58);
  ctx.lineTo(ex + ew, ey);
  ctx.stroke();
  handText(ctx, 'Write to Mohamed', w / 2, 430, 48, INK);
  ctx.font = '500 22px Inter, system-ui, sans-serif';
  bodyText(ctx, profile.email, w / 2, 478, 22, GREY, 'center', w - 40);
  // compose button
  ctx.fillStyle = TERRA;
  ctx.beginPath();
  ctx.roundRect(60, h - 220, w - 120, 90, 45);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.stroke();
  handText(ctx, 'Compose', w / 2, h - 174, 50, '#fffdf8');
  ctx.fillStyle = INK;
  ctx.fillRect(w / 2 - 60, h - 40, 120, 6);
}

/** Phone screen with a number: the dialer, ready to call. */
function drawDialer(number: string) {
  return (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.fillStyle = '#fffdf8';
    ctx.fillRect(0, 0, w, h);
    bodyText(ctx, '9:41', 40, 34, 24, INK, 'left');
    // avatar circle
    ctx.fillStyle = '#e7ece2';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(w / 2, 170, 72, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    handText(ctx, 'MA', w / 2, 172, 70, INK);
    handText(ctx, 'Mohamed', w / 2, 300, 62, INK);
    ctx.font = '500 30px Inter, system-ui, sans-serif';
    bodyText(ctx, number, w / 2, 352, 30, GREY, 'center', w - 40);
    // keypad dots
    ctx.globalAlpha = 0.5;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      ctx.beginPath();
      ctx.arc(w / 2 + (c - 1) * 90, 430 + r * 70, 24, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // green call button
    ctx.fillStyle = '#4c9a5a';
    ctx.beginPath();
    ctx.arc(w / 2, h - 120, 56, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    handText(ctx, 'Call', w / 2, h - 116, 44, '#fffdf8');
  };
}

function drawGithub(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#fffdf8';
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  const s = 11; // the simple-icons path lives in a 24×24 box
  ctx.translate(w / 2 - 12 * s, 40);
  ctx.scale(s, s);
  const path = new Path2D(siGithub.path);
  ctx.fillStyle = INK;
  ctx.fill(path);
  // a second, offset pencil pass
  ctx.globalAlpha = 0.25;
  ctx.translate(0.25, 0.2);
  ctx.fill(path);
  ctx.restore();
  handText(ctx, 'GitHub', w / 2, h - 118, 72, INK);
  ctx.font = '500 26px Inter, system-ui, sans-serif';
  bodyText(ctx, '@' + profile.links.github.split('/').pop(), w / 2, h - 58, 26, GREY, 'center', w - 40);
}

/** LinkedIn isn't in simple-icons any more: a hand-drawn "in" badge. */
function drawLinkedin(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#fffdf8';
  ctx.fillRect(0, 0, w, h);
  const S = 264, x = w / 2 - S / 2, y = 40;
  ctx.fillStyle = '#0a66c2';
  ctx.beginPath();
  ctx.roundRect(x, y, S, S, 40);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 7;
  ctx.stroke();
  // "i": dot + stem
  ctx.fillStyle = '#fffdf8';
  ctx.beginPath();
  ctx.arc(x + 70, y + 72, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x + 50, y + 112, 40, 118);
  // "n": stem + arch
  ctx.fillRect(x + 118, y + 112, 38, 118);
  ctx.beginPath();
  ctx.moveTo(x + 156, y + 230);
  ctx.lineTo(x + 156, y + 160);
  ctx.quadraticCurveTo(x + 160, y + 140, x + 182, y + 140);
  ctx.quadraticCurveTo(x + 202, y + 140, x + 202, y + 166);
  ctx.lineTo(x + 202, y + 230);
  ctx.lineTo(x + 240, y + 230);
  ctx.lineTo(x + 240, y + 156);
  ctx.quadraticCurveTo(x + 238, y + 106, x + 190, y + 106);
  ctx.quadraticCurveTo(x + 166, y + 106, x + 156, y + 124);
  ctx.closePath();
  ctx.fill();
  handText(ctx, 'LinkedIn', w / 2, h - 118, 72, INK);
  ctx.font = '500 26px Inter, system-ui, sans-serif';
  bodyText(ctx, profile.name, w / 2, h - 58, 26, GREY, 'center', w - 40);
}

/** Sketch map: the Gulf coast, Palm Jumeirah, the Creek, Burj Khalifa, a pin. */
function drawDubaiMap(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#fbf6ec';
  ctx.fillRect(0, 0, w, h);
  // sea (top-left) and land, split by the coastline running SW → NE
  const coast: Array<[number, number]> = [[0, 560], [120, 520], [230, 470], [330, 420], [420, 360], [520, 300], [610, 250], [700, 190], [800, 130], [900, 70], [w, 20]];
  ctx.beginPath();
  ctx.moveTo(0, 0);
  for (const [x, y] of coast) ctx.lineTo(x, y);
  ctx.lineTo(w, 0);
  ctx.closePath();
  ctx.fillStyle = '#d6e9f2';
  ctx.fill();
  wash(ctx, 0, 0, w * 0.55, h * 0.45, '#9fcfea', 0.2);
  // waves
  ctx.strokeStyle = '#7fb3cf';
  ctx.lineWidth = 3;
  for (const [x, y] of [[90, 140], [260, 90], [180, 320], [420, 160], [600, 70]]) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 15, y - 12, x + 30, y);
    ctx.quadraticCurveTo(x + 45, y + 12, x + 60, y);
    ctx.stroke();
  }
  // coastline in pencil
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.beginPath();
  coast.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + Math.sin(i * 1.7) * 6) : ctx.moveTo(x, y)));
  ctx.stroke();
  // Palm Jumeirah: a trunk and fronds out into the sea, inside a crescent
  const px = 250, py = 455;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(px + 30, py + 20);
  ctx.lineTo(px - 40, py - 90);
  ctx.stroke();
  for (let i = 0; i < 7; i++) {
    const t = i / 6, bx = px + 25 - t * 60, by = py + 10 - t * 95;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx - 60 + t * 10, by - 18 + t * 4);
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + 20 - t * 30, by - 50 + t * 6);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(px - 40, py - 95, 105, Math.PI * 0.85, Math.PI * 1.95);
  ctx.stroke();
  // Dubai Creek cutting in from the coast
  ctx.strokeStyle = '#7fb3cf';
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.moveTo(840, 100);
  ctx.bezierCurveTo(850, 180, 900, 230, 960, 300);
  ctx.stroke();
  // roads
  ctx.strokeStyle = '#c9bfae';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(60, 700);
  ctx.bezierCurveTo(300, 600, 600, 420, 960, 230); // Sheikh Zayed Road, parallel to the coast
  ctx.stroke();
  // Burj Khalifa: tall stepped spire
  const bx = 640, base = 520;
  ctx.fillStyle = '#e9e2d4';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(bx - 46, base);
  ctx.lineTo(bx - 40, base - 70);
  ctx.lineTo(bx - 30, base - 70);
  ctx.lineTo(bx - 26, base - 150);
  ctx.lineTo(bx - 17, base - 150);
  ctx.lineTo(bx - 13, base - 240);
  ctx.lineTo(bx - 6, base - 240);
  ctx.lineTo(bx - 3, base - 320);
  ctx.lineTo(bx, base - 380);
  ctx.lineTo(bx + 3, base - 320);
  ctx.lineTo(bx + 8, base - 260);
  ctx.lineTo(bx + 15, base - 260);
  ctx.lineTo(bx + 20, base - 180);
  ctx.lineTo(bx + 28, base - 180);
  ctx.lineTo(bx + 34, base - 100);
  ctx.lineTo(bx + 42, base - 100);
  ctx.lineTo(bx + 48, base);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  roughLine(ctx, bx - 90, base + 2, bx + 92, base, 4);
  handText(ctx, 'Burj Khalifa', bx + 70, base - 330, 38, GREY, 'left');
  // labels
  handText(ctx, 'Arabian Gulf', 190, 230, 54, '#4f86a6');
  handText(ctx, 'Palm Jumeirah', 170, 600, 38, GREY);
  handText(ctx, 'DUBAI', 820, 420, 96, INK);
  // pin + "I'm here"
  const pinX = 760, pinY = 560;
  ctx.fillStyle = TERRA;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(pinX, pinY);
  ctx.bezierCurveTo(pinX - 40, pinY - 50, pinX - 44, pinY - 92, pinX, pinY - 100);
  ctx.bezierCurveTo(pinX + 44, pinY - 92, pinX + 40, pinY - 50, pinX, pinY);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fffdf8';
  ctx.beginPath();
  ctx.arc(pinX, pinY - 64, 15, 0, Math.PI * 2);
  ctx.fill();
  handText(ctx, "I'm here · open in Maps →", w - 40, h - 60, 46, TERRA, 'right');
  // compass
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(w - 80, 150);
  ctx.lineTo(w - 80, 70);
  ctx.lineTo(w - 94, 96);
  ctx.moveTo(w - 80, 70);
  ctx.lineTo(w - 66, 96);
  ctx.stroke();
  handText(ctx, 'N', w - 80, 46, 40, INK);
  // pencil frame
  roughLine(ctx, 18, 18, w - 18, 20, 4);
  roughLine(ctx, w - 18, 18, w - 18, h - 18, 4);
  roughLine(ctx, w - 18, h - 18, 18, h - 20, 4);
  roughLine(ctx, 18, h - 18, 18, 18, 4);
}
