#!/usr/bin/env node
/**
 * Asset pipeline. Generates everything binary the site needs:
 *   public/fonts/*.woff2              Caveat + Inter WOFF2 subsets
 *   public/textures/*.ktx2            paper grain + pencil-stroke atlas (Basis UASTC/ETC1S)
 *   public/textures/projects/*.ktx2   project sketches for the 3D frames
 *   src/assets/projects/*.png         same sketches as sources for Astro <Picture> (AVIF/WebP)
 *   public/models/*.glb               low-poly props, Meshopt-compressed + quantized
 *   public/models/props.glb           corridor furniture + accessories (one named node per prop)
 *   public/textures/avatar-*.ktx2     hand-drawn avatar flipbook (pencil + painted atlases)
 *   public/textures/cat-*.ktx2        entrance cat flipbook (pencil + painted)
 *   public/textures/brick.ktx2        tileable sketched brick wall (ink on transparent)
 *   public/textures/cobble.ktx2       flagstone path (ink on transparent)
 *   public/textures/skill-balloons-*  Skills room balloons with real tech logos (pencil + painted)
 *   public/textures/skill-badges-*    round logo stickers for the Skills door (pencil + painted)
 *   public/og.png                     Open Graph image
 *
 * Run with: npm run assets   (Node 22.18+ — imports a .ts module via type stripping)
 * The generated files are committed, so this only needs re-running after changes.
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import subsetFont from 'subset-font';
import fontverter from 'fontverter';
import * as hb from 'harfbuzzjs';
import { encodeToKTX2 } from 'ktx2-encoder';
import * as THREE from 'three';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { dedup, join, reorder, quantize, weld } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import { generatePaper, generateStrokes, rng } from '../src/scripts/scene/texgen.ts';
import { avatarFrames, drawFrame, FRAME_W, FRAME_H, GRID } from './avatar-frames.mjs';
import { catFrames, drawCat, CAT_CELL, CAT_GRID } from './cat-frames.mjs';
import * as simpleIcons from 'simple-icons';
import { skills, DOOR_BADGES, BALLOON_GRID, BADGE_GRID } from '../src/data/skills.ts';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = (...p) => path.join(ROOT, ...p);
const INK = '#2b2b2b', PAPER = '#fafafa', TERRA = '#c8553d', OCHRE = '#e0a458';

async function ensure(dir) { await mkdir(dir, { recursive: true }); }
const log = (...a) => console.log('  ·', ...a);

/* ------------------------------------------------------------------ fonts */
const DISPLAY_CHARS =
  ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~·–—’‘“”…×←→';
const BODY_CHARS = DISPLAY_CHARS + '©®°±²³µ¶¹º»«¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕÖØÙÚÛÜÝàáâãäåæçèéêëìíîïñòóôõöøùúûüýÿ•′″€£';

async function buildFonts() {
  await ensure(out('public/fonts'));
  const caveatSrc = await readFile(require.resolve('@fontsource/caveat/files/caveat-latin-700-normal.woff2'));
  const interSrc = await readFile(require.resolve('@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'));
  // Caveat: keep kerning + ligatures, drop contextual alternates (calt) — they
  // double the file size (≈40 KB → 18 KB) for a barely visible difference.
  const caveat = await subsetFont(caveatSrc, DISPLAY_CHARS, { targetFormat: 'woff2', keepFeatures: ['kern', 'liga'], noHinting: true });
  // Inter: variable, but only the 400–700 weights the site uses.
  const inter = await subsetFont(interSrc, BODY_CHARS, { targetFormat: 'woff2', noHinting: true, variationAxes: { wght: { min: 400, max: 700 } } });
  await writeFile(out('public/fonts/caveat-700.woff2'), caveat);
  await writeFile(out('public/fonts/inter-var.woff2'), inter);
  log(`fonts: caveat ${(caveat.length / 1024).toFixed(1)} KB, inter ${(inter.length / 1024).toFixed(1)} KB`);
  return {
    caveat: await fontverter.convert(caveatSrc, 'sfnt'),
    inter: await fontverter.convert(interSrc, 'sfnt'),
  };
}

/** Text → SVG path data using HarfBuzz shaping (no system fonts needed). */
function textPath(fontBuf, text, x, y, size, anchor = 'start', wght = 0) {
  const blob = new hb.Blob(fontBuf);
  const face = new hb.Face(blob, 0);
  const font = new hb.Font(face);
  if (wght) font.setVariations([hb.Variation.fromString(`wght=${wght}`)]);
  const upem = face.upem;
  const buf = new hb.Buffer();
  buf.addText(text);
  buf.guessSegmentProperties();
  hb.shape(font, buf);
  const infos = buf.getGlyphInfos();
  const pos = buf.getGlyphPositions();
  const s = size / upem;
  const total = pos.reduce((a, p) => a + p.xAdvance, 0) * s;
  let pen = anchor === 'middle' ? x - total / 2 : anchor === 'end' ? x - total : x;
  let d = '';
  infos.forEach((g, i) => {
    const p = font.glyphToPath(g.codepoint);
    if (p) d += `<path transform="translate(${(pen + pos[i].xOffset * s).toFixed(2)} ${y}) scale(${s} ${-s})" d="${p}"/>`;
    pen += pos[i].xAdvance * s;
  });
  return { svg: d, width: total };
}

/* ---------------------------------------------------------- sketch helpers */
function sketcher(seed) {
  const r = rng(seed);
  const j = (a) => (r() - 0.5) * 2 * a;
  const line = (x1, y1, x2, y2, amp = 2.2) => {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const segs = Math.max(2, Math.round(len / 70));
    const nx = -(y2 - y1) / (len || 1), ny = (x2 - x1) / (len || 1);
    // slight overshoot at both ends, like a quick pencil line
    const ox = ((x2 - x1) / (len || 1)) * 4, oy = ((y2 - y1) / (len || 1)) * 4;
    let d = `M${(x1 - ox + j(amp)).toFixed(1)} ${(y1 - oy + j(amp)).toFixed(1)}`;
    for (let i = 1; i <= segs; i++) {
      const t = i / segs;
      const w = j(amp);
      const px = x1 + (x2 - x1) * t + nx * w + (i === segs ? ox : 0);
      const py = y1 + (y2 - y1) * t + ny * w + (i === segs ? oy : 0);
      const ct = (i - 0.5) / segs, cw = j(amp * 1.4);
      const cx = x1 + (x2 - x1) * ct + nx * cw, cy = y1 + (y2 - y1) * ct + ny * cw;
      d += ` Q${cx.toFixed(1)} ${cy.toFixed(1)} ${px.toFixed(1)} ${py.toFixed(1)}`;
    }
    return d;
  };
  const poly = (pts, closed = true, amp) => {
    let d = '';
    const n = closed ? pts.length : pts.length - 1;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      d += line(a[0], a[1], b[0], b[1], amp) + ' ';
    }
    return d;
  };
  const ellipse = (cx, cy, rx, ry, amp = 2) => {
    const n = 28, start = r() * Math.PI * 2, over = 0.25 + r() * 0.2;
    let d = '';
    for (let i = 0; i <= n * (1 + over / (Math.PI * 2)) + 2; i++) {
      const t = start + (i / n) * Math.PI * 2;
      const k = 1 + j(0.03);
      const x = cx + Math.cos(t) * rx * k + j(amp * 0.4), y = cy + Math.sin(t) * ry * k + j(amp * 0.4);
      d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)} `;
    }
    return d;
  };
  const rect = (x, y, w, h, amp) => poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], true, amp);
  const hatch = (x, y, w, h, gap = 14, amp = 1.5) => {
    let d = '';
    for (let k = -h; k < w; k += gap) {
      const x1 = Math.max(x, x + k), y1 = x + k < x ? y + (x - (x + k)) : y;
      const x2 = Math.min(x + w, x + k + h), y2 = x + k + h > x + w ? y + h - (x + k + h - (x + w)) : y + h;
      if (x2 > x1) d += line(x1, y1 + 0, x2, y2, amp) + ' ';
    }
    return d;
  };
  return { line, poly, ellipse, rect, hatch, r, j };
}

const stroke = (d, w = 3.2, c = INK, o = 1) =>
  `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity="${o}"/>`;
const wash = (d, c, o = 0.45) => `<path d="${d}" fill="${c}" opacity="${o}" stroke="none"/>`;
/** Draw twice with different jitter: the pencil "double line" look. */
const twice = (fn, w = 3.2, c = INK) => stroke(fn(), w, c) + stroke(fn(), w * 0.55, c, 0.55);

function paperBg(W, H, seed) {
  const s = sketcher(seed);
  let g = `<rect width="${W}" height="${H}" fill="${PAPER}"/>`;
  // faint grid like a sketchbook page
  for (let x = 40; x < W; x += 40) g += stroke(s.line(x, 0, x, H, 0.6), 1, INK, 0.05);
  for (let y = 40; y < H; y += 40) g += stroke(s.line(0, y, W, y, 0.6), 1, INK, 0.05);
  return g;
}

/* ------------------------------------------------------ project sketches */
function sketchAinRider() {
  const W = 1200, H = 900, s = sketcher(11);
  let g = paperBg(W, H, 1);
  // streets
  for (const [x1, y1, x2, y2] of [[80, 640, 1120, 560], [120, 300, 1080, 380], [380, 80, 300, 840], [860, 90, 920, 840]])
    g += stroke(s.line(x1, y1, x2, y2, 3), 18, INK, 0.07) + stroke(s.line(x1, y1, x2, y2, 3), 2, INK, 0.35);
  // dotted route
  let route = 'M230 690 C 380 520, 520 760, 640 520 S 880 300, 960 220';
  g += `<path d="${route}" fill="none" stroke="${TERRA}" stroke-width="7" stroke-dasharray="4 18" stroke-linecap="round"/>`;
  // pins
  const pin = (x, y, c) => {
    const d = `M${x} ${y} C ${x - 70} ${y - 90}, ${x - 55} ${y - 160}, ${x} ${y - 165} C ${x + 55} ${y - 160}, ${x + 70} ${y - 90}, ${x} ${y} Z`;
    return wash(d, c, 0.55) + stroke(d, 3.4) + stroke(s.ellipse(x, y - 105, 22, 22), 3) ;
  };
  g += pin(230, 700, OCHRE) + pin(960, 230, TERRA);
  // car
  const cx = 560, cy = 470;
  g += wash(s.rect(cx - 150, cy - 10, 300, 80, 1) , TERRA, 0.5);
  g += twice(() => s.poly([[cx - 150, cy + 70], [cx - 150, cy], [cx - 95, cy - 10], [cx - 55, cy - 70], [cx + 60, cy - 70], [cx + 105, cy - 10], [cx + 150, cy], [cx + 150, cy + 70]], true, 2));
  g += stroke(s.line(cx - 45, cy - 60, cx - 75, cy - 8), 2.4) + stroke(s.line(cx + 5, cy - 66, cx + 5, cy - 8), 2.4) + stroke(s.line(cx + 55, cy - 60, cx + 90, cy - 8), 2.4);
  for (const wx of [cx - 85, cx + 85]) g += wash(s.ellipse(wx, cy + 72, 34, 34), PAPER, 1) + twice(() => s.ellipse(wx, cy + 72, 34, 34)) + stroke(s.ellipse(wx, cy + 72, 10, 10), 2.4);
  g += stroke(s.hatch(cx - 140, cy + 5, 280, 55, 16, 1), 1.6, INK, 0.45);
  return { W, H, svg: g };
}

function sketchWinningKart() {
  const W = 1200, H = 900, s = sketcher(21);
  let g = paperBg(W, H, 2);
  // axes
  g += twice(() => s.line(170, 140, 170, 760, 2)) + twice(() => s.line(150, 740, 1060, 740, 2));
  const bars = [160, 240, 300, 420, 520];
  bars.forEach((h, i) => {
    const x = 230 + i * 140, y = 740 - h;
    g += wash(s.rect(x, y, 90, h, 1), i === 4 ? TERRA : OCHRE, 0.5);
    g += twice(() => s.rect(x, y, 90, h, 1.8));
    g += stroke(s.hatch(x, y, 90, h, 18, 1), 1.4, INK, 0.35);
  });
  // trend arrow
  g += stroke(s.line(220, 600, 900, 170, 3), 6, TERRA);
  g += stroke(s.poly([[860, 160], [915, 160], [905, 215]], false, 2), 6, TERRA);
  // cart
  const x = 250, y = 200;
  g += twice(() => s.poly([[x - 40, y - 60], [x, y - 60], [x + 30, y + 60], [x + 200, y + 60], [x + 225, y - 20], [x + 15, y - 20]], false, 2));
  g += wash(s.rect(x + 20, y - 15, 195, 70, 1), PAPER, 0.9) + stroke(s.hatch(x + 25, y - 12, 190, 66, 16), 1.6, INK, 0.5);
  g += twice(() => s.ellipse(x + 60, y + 100, 20, 20)) + twice(() => s.ellipse(x + 180, y + 100, 20, 20));
  return { W, H, svg: g };
}

function sketchMasary() {
  const W = 1200, H = 900, s = sketcher(31);
  let g = paperBg(W, H, 3);
  const px = 380, py = 120, pw = 300, ph = 620;
  g += wash(s.rect(px, py, pw, ph, 1), PAPER, 1);
  g += twice(() => s.poly([[px + 30, py], [px + pw - 30, py], [px + pw, py + 30], [px + pw, py + ph - 30], [px + pw - 30, py + ph], [px + 30, py + ph], [px, py + ph - 30], [px, py + 30]], true, 2));
  g += stroke(s.line(px + 120, py + 30, px + 180, py + 30, 1), 5);
  // speech bubble lines on screen
  for (let i = 0; i < 4; i++) g += stroke(s.line(px + 50, py + 140 + i * 50, px + 250 - (i % 2) * 70, py + 140 + i * 50, 1.6), 5, INK, 0.5);
  g += wash(s.rect(px + 40, py + 360, 220, 90, 1), OCHRE, 0.45) + stroke(s.rect(px + 40, py + 360, 220, 90, 1.4), 2.6);
  // mic
  const mx = px + pw / 2, my = py + 540;
  g += wash(s.rect(mx - 26, my - 60, 52, 90, 1), TERRA, 0.6) + twice(() => s.rect(mx - 26, my - 60, 52, 90, 1));
  g += stroke(`M${mx - 50} ${my} Q ${mx} ${my + 80} ${mx + 50} ${my}`, 3.4);
  // sound waves
  for (let k = 1; k <= 3; k++) {
    g += stroke(s.ellipse(mx + 0, my - 15, 0, 0), 0);
    g += stroke(`M${px + pw + 40 * k} ${my - 70 - 30 * k} Q ${px + pw + 60 * k + 40} ${my - 15} ${px + pw + 40 * k} ${my + 40 + 30 * k}`, 4, TERRA, 1 - k * 0.2);
  }
  // coin
  g += wash(s.ellipse(910, 280, 110, 110), OCHRE, 0.55) + twice(() => s.ellipse(910, 280, 110, 110)) + stroke(s.ellipse(910, 280, 80, 80), 2.2, INK, 0.6);
  g += stroke(s.line(910, 220, 910, 340, 2), 5) + stroke(`M950 240 Q 870 220 880 270 T 870 320`, 4);
  return { W, H, svg: g };
}

function sketchAgentTutor() {
  const W = 1200, H = 900, s = sketcher(41);
  let g = paperBg(W, H, 4);
  const r = rng(5);
  const nodes = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + r() * 0.3, rad = 300 + r() * 90;
    nodes.push([600 + Math.cos(a) * rad * 1.25, 470 + Math.sin(a) * rad * 0.85]);
  }
  for (const [x, y] of nodes) g += stroke(s.line(600, 430, x, y, 3), 2, INK, 0.35);
  nodes.forEach(([x, y], i) => {
    if (i % 3 === 0) g += wash(s.ellipse(x, y, 24, 24), i % 2 ? TERRA : OCHRE, 0.6);
    g += stroke(s.ellipse(x, y, 24, 24), 3);
  });
  // graduation cap
  const cx = 600, cy = 400;
  const top = [[cx, cy - 110], [cx + 230, cy - 30], [cx, cy + 50], [cx - 230, cy - 30]];
  g += wash(s.poly(top, true, 1), TERRA, 0.55) + twice(() => s.poly(top, true, 2.2));
  g += wash(`M${cx - 130} ${cy + 10} L ${cx - 130} ${cy + 120} Q ${cx} ${cy + 180} ${cx + 130} ${cy + 120} L ${cx + 130} ${cy + 10} L ${cx} ${cy + 50} Z`, PAPER, 1);
  g += twice(() => `M${cx - 130} ${cy + 10} L ${cx - 130} ${cy + 120} Q ${cx} ${cy + 180} ${cx + 130} ${cy + 120} L ${cx + 130} ${cy + 10}`);
  g += stroke(s.hatch(cx - 125, cy + 30, 250, 110, 16), 1.5, INK, 0.35);
  g += stroke(s.line(cx + 190, cy - 40, cx + 200, cy + 110, 2), 4) + wash(s.ellipse(cx + 200, cy + 125, 18, 26), OCHRE, 0.9) + stroke(s.ellipse(cx + 200, cy + 125, 18, 26), 3);
  return { W, H, svg: g };
}

async function rasterize(svgBody, W, H) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${svgBody}</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

const imageDecoder = async (buf) => {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data), width: info.width, height: info.height };
};

async function ktx2FromRGBA(img, opts) {
  // Raw RGBA → PNG (encoder input) → KTX2.
  const png = await sharp(Buffer.from(img.data), { raw: { width: img.width, height: img.height, channels: 4 } }).png().toBuffer();
  return encodeToKTX2(new Uint8Array(png), { generateMipmap: true, imageDecoder, ...opts });
}

async function buildTextures() {
  await ensure(out('public/textures/projects'));
  await ensure(out('src/assets/projects'));

  const paper = generatePaper(512);
  await writeFile(out('public/textures/paper.ktx2'), await ktx2FromRGBA(paper, { isUASTC: false, qualityLevel: 200, isKTX2File: true }));
  const strokes = generateStrokes(512);
  // UASTC keeps the alpha "draw order" channel accurate enough for thresholding.
  await writeFile(out('public/textures/strokes.ktx2'), await ktx2FromRGBA(strokes, { isUASTC: true, needSupercompression: true, isKTX2File: true }));
  log('textures: paper.ktx2, strokes.ktx2');

  const sketches = {
    'ain-rider': sketchAinRider(),
    winningkart: sketchWinningKart(),
    masary: sketchMasary(),
    'agent-tutor': sketchAgentTutor(),
  };
  for (const [slug, { W, H, svg }] of Object.entries(sketches)) {
    const png = await rasterize(svg, W, H);
    await writeFile(out(`src/assets/projects/${slug}.png`), png);
    const small = await sharp(png).resize(512, 384).png().toBuffer();
    const k = await encodeToKTX2(new Uint8Array(small), { isUASTC: false, qualityLevel: 230, generateMipmap: true, isKTX2File: true, isYFlip: true, imageDecoder });
    await writeFile(out(`public/textures/projects/${slug}.ktx2`), k);
    log(`project sketch: ${slug}`);
  }
}

/* ------------------------------------------------------------------ models */
const MAT_COLORS = { paper: [0.98, 0.98, 0.98, 1], ochre: [0.88, 0.64, 0.35, 1], terracotta: [0.78, 0.33, 0.24, 1], ink: [0.17, 0.17, 0.17, 1], sage: [0.54, 0.63, 0.48, 1] };

function part(name, geometry, material, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) {
  return { name, geometry, material, position, rotation, scale };
}

async function writeGLB(file, parts) {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene(path.basename(file, '.glb'));
  const mats = {};
  for (const p of parts) {
    const g = p.geometry.index ? p.geometry : p.geometry.toNonIndexed();
    const mat = (mats[p.material] ??= doc.createMaterial(p.material).setBaseColorFactor(MAT_COLORS[p.material]).setRoughnessFactor(1).setMetallicFactor(0));
    const acc = (attr, type) => doc.createAccessor().setType(type).setArray(new Float32Array(attr.array)).setBuffer(buffer);
    const prim = doc
      .createPrimitive()
      .setAttribute('POSITION', acc(g.attributes.position, 'VEC3'))
      .setAttribute('NORMAL', acc(g.attributes.normal, 'VEC3'))
      .setAttribute('TEXCOORD_0', acc(g.attributes.uv, 'VEC2'))
      .setMaterial(mat);
    if (g.index) prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(g.index.array)).setBuffer(buffer));
    const mesh = doc.createMesh(p.name).addPrimitive(prim);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...p.rotation));
    const node = doc.createNode(p.name).setMesh(mesh).setTranslation(p.position).setRotation([q.x, q.y, q.z, q.w]).setScale(p.scale);
    scene.addChild(node);
  }
  await MeshoptEncoder.ready;
  await doc.transform(dedup(), weld(), reorder({ encoder: MeshoptEncoder }), quantize());
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
  const glb = await io.writeBinary(doc);
  await writeFile(file, glb);
  log(`model: ${path.basename(file)} (${(glb.byteLength / 1024).toFixed(1)} KB)`);
}

/**
 * Several props in one GLB: each prop is a named root node whose (unnamed)
 * child parts are joined per material, so a whole bench is 1–3 draw calls.
 */
async function writePropsGLB(file, props) {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene('props');
  const mats = {};
  for (const [name, parts] of Object.entries(props)) {
    const root = doc.createNode(name);
    scene.addChild(root);
    for (const p of parts) {
      const g = p.geometry.index ? p.geometry : p.geometry.toNonIndexed();
      const mat = (mats[p.material] ??= doc.createMaterial(p.material).setBaseColorFactor(MAT_COLORS[p.material]).setRoughnessFactor(1).setMetallicFactor(0));
      const acc = (attr, type) => doc.createAccessor().setType(type).setArray(new Float32Array(attr.array)).setBuffer(buffer);
      const prim = doc
        .createPrimitive()
        .setAttribute('POSITION', acc(g.attributes.position, 'VEC3'))
        .setAttribute('NORMAL', acc(g.attributes.normal, 'VEC3'))
        .setAttribute('TEXCOORD_0', acc(g.attributes.uv, 'VEC2'))
        .setMaterial(mat);
      if (g.index) prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(g.index.array)).setBuffer(buffer));
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...p.rotation));
      root.addChild(doc.createNode('').setMesh(doc.createMesh('').addPrimitive(prim)).setTranslation(p.position).setRotation([q.x, q.y, q.z, q.w]).setScale(p.scale));
    }
  }
  await MeshoptEncoder.ready;
  await doc.transform(dedup(), join({ keepNamed: true }), weld(), reorder({ encoder: MeshoptEncoder }), quantize());
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
  const glb = await io.writeBinary(doc);
  await writeFile(file, glb);
  log(`model: ${path.basename(file)} (${(glb.byteLength / 1024).toFixed(1)} KB, ${Object.keys(props).length} props)`);
}

const Box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const Cyl = (rt, rb, h, seg = 12, open = false) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);

/** Crumpled paper: an icosphere with its vertices pushed in and out. */
function crumpled(r, seed) {
  const g = new THREE.IcosahedronGeometry(r, 1);
  const rand = rng(seed);
  const pos = g.attributes.position;
  const v = new THREE.Vector3();
  const offsets = new Map();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const key = v.toArray().map((n) => n.toFixed(3)).join(',');
    if (!offsets.has(key)) offsets.set(key, 0.72 + rand() * 0.5);
    v.multiplyScalar(offsets.get(key));
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/** Folded paper plane (nose along +z). */
function paperPlane(s = 1) {
  const v = [
    // left wing, right wing, left keel, right keel
    [0, 0, 0.32], [-0.2, 0.02, -0.18], [0, 0, -0.14],
    [0, 0, 0.32], [0, 0, -0.14], [0.2, 0.02, -0.18],
    [0, 0, 0.32], [0, 0, -0.14], [0, -0.06, -0.12],
    [0, 0, 0.32], [0, -0.06, -0.12], [0, 0, -0.14],
  ].map((p) => p.map((n) => n * s));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v.flat(), 3));
  const uv = [0.5, 1, 0, 0, 0.5, 0.1, 0.5, 1, 0.5, 0.1, 1, 0, 0.5, 1, 0.5, 0.1, 0.4, 0, 0.5, 1, 0.4, 0, 0.5, 0.1];
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

async function buildModels() {
  await ensure(out('public/models'));
  const D = Math.PI / 180;

  // Easel (entrance, About). "canvas" gets the About sketch texture at runtime.
  await writeGLB(out('public/models/easel.glb'), [
    part('leg_l', Box(0.06, 2.1, 0.05), 'ochre', [-0.42, 1.0, 0.05], [8 * D, 0, 10 * D]),
    part('leg_r', Box(0.06, 2.1, 0.05), 'ochre', [0.42, 1.0, 0.05], [8 * D, 0, -10 * D]),
    part('leg_back', Box(0.06, 2.1, 0.05), 'ochre', [0, 0.98, -0.32], [-18 * D, 0, 0]),
    part('crossbar', Box(0.9, 0.05, 0.05), 'ochre', [0, 0.62, 0.12]),
    part('ledge', Box(1.02, 0.05, 0.16), 'ochre', [0, 0.78, 0.16], [8 * D, 0, 0]),
    part('canvas', Box(1.0, 1.25, 0.04), 'paper', [0, 1.45, 0.08], [8 * D, 0, 0]),
    part('clamp', Box(0.22, 0.06, 0.08), 'ochre', [0, 2.07, -0.01], [8 * D, 0, 0]),
  ]);

  // Picture frame, unit width. "picture" gets the project / certificate texture.
  const fw = 1.0, fh = 0.78, t = 0.07, dpt = 0.06;
  await writeGLB(out('public/models/frame.glb'), [
    part('bar_top', Box(fw, t, dpt), 'terracotta', [0, fh / 2 - t / 2, 0]),
    part('bar_bottom', Box(fw, t, dpt), 'terracotta', [0, -fh / 2 + t / 2, 0]),
    part('bar_left', Box(t, fh - 2 * t, dpt), 'terracotta', [-fw / 2 + t / 2, 0, 0]),
    part('bar_right', Box(t, fh - 2 * t, dpt), 'terracotta', [fw / 2 - t / 2, 0, 0]),
    part('backing', Box(fw - 0.02, fh - 0.02, 0.01), 'paper', [0, 0, -dpt / 2]),
    part('picture', new THREE.PlaneGeometry(fw - 2 * t, fh - 2 * t), 'paper', [0, 0, 0.004]),
  ]);

  // Writing desk with a letter (Contact room).
  await writeGLB(out('public/models/desk.glb'), [
    part('top', Box(1.7, 0.06, 0.85), 'ochre', [0, 0.76, 0]),
    part('leg_fl', Box(0.07, 0.74, 0.07), 'ochre', [-0.78, 0.37, 0.36]),
    part('leg_fr', Box(0.07, 0.74, 0.07), 'ochre', [0.78, 0.37, 0.36]),
    part('leg_bl', Box(0.07, 0.74, 0.07), 'ochre', [-0.78, 0.37, -0.36]),
    part('leg_br', Box(0.07, 0.74, 0.07), 'ochre', [0.78, 0.37, -0.36]),
    part('drawer', Box(0.6, 0.16, 0.7), 'paper', [0.48, 0.64, 0]),
    part('knob', new THREE.SphereGeometry(0.025, 8, 6), 'ink', [0.48, 0.64, 0.36]),
    part('letter', new THREE.PlaneGeometry(0.42, 0.56), 'paper', [-0.15, 0.795, 0.08], [-90 * D, 0, 8 * D]),
    part('envelope', Box(0.36, 0.012, 0.24), 'terracotta', [0.35, 0.796, 0.18], [0, -12 * D, 0]),
    part('pencil', new THREE.CylinderGeometry(0.008, 0.008, 0.3, 6), 'ochre', [0.15, 0.8, 0.22], [0, 0, 90 * D]),
    part('lamp_base', new THREE.CylinderGeometry(0.1, 0.12, 0.04, 10), 'ink', [-0.62, 0.81, -0.25]),
    part('lamp_arm', Box(0.03, 0.5, 0.03), 'ink', [-0.62, 1.05, -0.25], [0, 0, -12 * D]),
    part('lamp_shade', new THREE.ConeGeometry(0.16, 0.2, 10, 1, true), 'terracotta', [-0.52, 1.3, -0.25], [0, 0, 120 * D]),
  ]);

  await buildProps(D);
}

/**
 * Corridor furniture + accessories. Each prop stands on y = 0 with its back
 * against z = -depth/2 and faces +z (the corridor places it against a wall).
 */
async function buildProps(D) {
  const r = rng(77);
  const legs4 = (w, d, h, mat, inset = 0.05, t = 0.05) =>
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => part('', Box(t, h, t), mat, [sx * (w / 2 - inset), h / 2, sz * (d / 2 - inset)]));

  // books for shelves/tables: a row of spines with varied sizes + colours
  const BOOK_MATS = ['terracotta', 'ochre', 'ink', 'sage', 'paper', 'terracotta', 'sage'];
  const bookRow = (x0, x1, y, depth, maxH = 0.3) => {
    const out = [];
    let x = x0;
    while (x < x1 - 0.05) {
      const w = 0.035 + r() * 0.035;
      const h = maxH * (0.7 + r() * 0.3);
      const lean = r() < 0.12 ? (r() < 0.5 ? -1 : 1) * 0.25 : 0;
      out.push(part('', Box(w, h, depth * (0.75 + r() * 0.2)), BOOK_MATS[Math.floor(r() * BOOK_MATS.length)], [x + w / 2 + (lean ? lean * 0.1 : 0), y + h / 2, 0], [0, 0, lean]));
      x += w + 0.004 + (r() < 0.15 ? 0.05 : 0);
    }
    return out;
  };

  const props = {
    bench: [
      part('', Box(1.4, 0.06, 0.42), 'ochre', [0, 0.45, 0]),
      ...legs4(1.4, 0.42, 0.42, 'ochre', 0.08, 0.06),
      part('', Box(1.3, 0.04, 0.04), 'ochre', [0, 0.18, 0]),
      part('', Box(0.5, 0.06, 0.34), 'terracotta', [-0.38, 0.51, 0]),
    ],
    chair: [
      part('', Box(0.46, 0.05, 0.44), 'ochre', [0, 0.46, 0]),
      ...legs4(0.46, 0.44, 0.44, 'ochre', 0.04, 0.045),
      part('', Box(0.045, 0.5, 0.045), 'ochre', [-0.19, 0.72, -0.2]),
      part('', Box(0.045, 0.5, 0.045), 'ochre', [0.19, 0.72, -0.2]),
      part('', Box(0.44, 0.18, 0.03), 'ochre', [0, 0.86, -0.2]),
      part('', Box(0.4, 0.04, 0.38), 'sage', [0, 0.5, 0.01]),
    ],
    plant: [
      part('', Cyl(0.2, 0.15, 0.4, 10), 'terracotta', [0, 0.2, 0]),
      part('', Cyl(0.18, 0.18, 0.02, 10), 'ink', [0, 0.39, 0]),
      ...Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        const tilt = 0.25 + r() * 0.35;
        return part('', new THREE.ConeGeometry(0.07, 0.75 + r() * 0.25, 5), 'sage', [Math.sin(a) * 0.08, 0.75, Math.cos(a) * 0.08], [Math.cos(a) * tilt, 0, -Math.sin(a) * tilt]);
      }),
    ],
    plant_tall: [
      part('', Cyl(0.24, 0.2, 0.46, 10), 'paper', [0, 0.23, 0]),
      part('', Box(0.03, 0.9, 0.03), 'ochre', [0, 0.85, 0]),
      part('', new THREE.IcosahedronGeometry(0.34, 0), 'sage', [0, 1.35, 0], [0.3, 0.4, 0], [1, 1.15, 1]),
      part('', new THREE.IcosahedronGeometry(0.24, 0), 'sage', [0.2, 1.05, 0.08], [0.1, 0.9, 0.2]),
      part('', new THREE.IcosahedronGeometry(0.22, 0), 'sage', [-0.18, 1.12, -0.05], [0.6, 0.2, 0.1]),
    ],
    side_table: [
      part('', Cyl(0.3, 0.3, 0.04, 14), 'ochre', [0, 0.62, 0]),
      ...[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        return part('', Box(0.04, 0.62, 0.04), 'ochre', [Math.sin(a) * 0.2, 0.31, Math.cos(a) * 0.2], [Math.cos(a) * 0.12, 0, -Math.sin(a) * 0.12]);
      }),
      part('', Cyl(0.08, 0.1, 0.03, 10), 'ink', [0.08, 0.655, -0.06]),
      part('', Box(0.02, 0.36, 0.02), 'ink', [0.08, 0.84, -0.06]),
      part('', new THREE.ConeGeometry(0.17, 0.2, 10, 1, true), 'terracotta', [0.08, 1.06, -0.06]),
      part('', Box(0.24, 0.04, 0.17), 'sage', [-0.12, 0.66, 0.08], [0, 0.3, 0]),
      part('', Box(0.22, 0.035, 0.16), 'terracotta', [-0.12, 0.698, 0.08], [0, 0.1, 0]),
    ],
    bookshelf: [
      part('', Box(0.04, 1.8, 0.32), 'ochre', [-0.48, 0.9, 0]),
      part('', Box(0.04, 1.8, 0.32), 'ochre', [0.48, 0.9, 0]),
      part('', Box(1.0, 1.8, 0.02), 'paper', [0, 0.9, -0.15]),
      ...[0.03, 0.47, 0.91, 1.35, 1.78].map((y) => part('', Box(1.0, 0.04, 0.32), 'ochre', [0, y, 0])),
      ...bookRow(-0.45, 0.45, 0.05, 0.24, 0.32),
      ...bookRow(-0.45, 0.2, 0.49, 0.24, 0.3),
      ...bookRow(-0.1, 0.45, 0.93, 0.24, 0.32),
      ...bookRow(-0.45, 0.15, 1.37, 0.24, 0.28),
      part('', Cyl(0.06, 0.05, 0.14, 8), 'terracotta', [0.32, 0.56, 0.02]),
      part('', new THREE.IcosahedronGeometry(0.08, 0), 'sage', [0.32, 0.68, 0.02]),
    ],
    coat_rack: [
      part('', Cyl(0.025, 0.025, 1.75, 6), 'ochre', [0, 0.875, 0]),
      ...[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2 + 0.5;
        return part('', Box(0.04, 0.04, 0.32), 'ochre', [Math.sin(a) * 0.14, 0.03, Math.cos(a) * 0.14], [0, a, 0]);
      }),
      ...[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2;
        return part('', Box(0.02, 0.02, 0.14), 'ink', [Math.sin(a) * 0.06, 1.62, Math.cos(a) * 0.06], [-0.6, a, 0]);
      }),
      part('', Box(0.34, 0.75, 0.08), 'terracotta', [0, 1.22, 0.12], [0.08, 0, 0.05]),
      part('', Cyl(0.11, 0.11, 0.12, 12), 'ink', [0.02, 1.82, 0]),
      part('', Cyl(0.19, 0.19, 0.015, 14), 'ink', [0.02, 1.765, 0]),
    ],
    trash_bin: [
      part('', Cyl(0.17, 0.14, 0.38, 12, true), 'paper', [0, 0.19, 0]),
      part('', Cyl(0.14, 0.14, 0.01, 12), 'ink', [0, 0.01, 0]),
      part('', crumpled(0.09, 3), 'paper', [0.03, 0.4, 0.02]),
      part('', crumpled(0.08, 9), 'paper', [-0.2, 0.07, 0.12]),
    ],
    // small accessories (on furniture or floating as doodles)
    books: [
      part('', Box(0.26, 0.05, 0.19), 'terracotta', [0, 0.025, 0], [0, 0.1, 0]),
      part('', Box(0.24, 0.045, 0.18), 'sage', [0.01, 0.073, 0], [0, -0.15, 0]),
      part('', Box(0.22, 0.04, 0.16), 'ochre', [-0.01, 0.115, 0.01], [0, 0.35, 0]),
    ],
    mug: [
      part('', Cyl(0.06, 0.055, 0.12, 12, true), 'paper', [0, 0.06, 0]),
      part('', Cyl(0.055, 0.055, 0.01, 12), 'ink', [0, 0.1, 0]),
      part('', Cyl(0.055, 0.055, 0.01, 12), 'paper', [0, 0.005, 0]),
      part('', new THREE.TorusGeometry(0.035, 0.01, 6, 10, Math.PI), 'paper', [0.06, 0.065, 0], [0, 0, -Math.PI / 2]),
    ],
    paper_ball: [part('', crumpled(0.1, 21), 'paper', [0, 0, 0])],
    pencil: [
      part('', Cyl(0.014, 0.014, 0.34, 6), 'ochre', [0, 0, 0], [0, 0, Math.PI / 2]),
      part('', new THREE.ConeGeometry(0.014, 0.05, 6), 'paper', [-0.195, 0, 0], [0, 0, Math.PI / 2]),
      part('', new THREE.ConeGeometry(0.005, 0.016, 6), 'ink', [-0.215, 0, 0], [0, 0, Math.PI / 2]),
      part('', Cyl(0.015, 0.015, 0.04, 6), 'terracotta', [0.19, 0, 0], [0, 0, Math.PI / 2]),
    ],
    paper_plane: [part('', paperPlane(1.4), 'paper', [0, 0, 0])],
  };
  await writePropsGLB(out('public/models/props.glb'), props);
}

/* ---------------------------------------------------------------- avatar */
async function buildAvatar() {
  const frames = avatarFrames();
  const cellW = FRAME_W / 2, cellH = FRAME_H / 2; // drawn at 2x, downsampled for clean lines
  for (const sketch of [true, false]) {
    const cells = await Promise.all(
      frames.map((f) =>
        sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${FRAME_W}" height="${FRAME_H}">${drawFrame(f, sketch)}</svg>`))
          .resize(cellW, cellH)
          .png()
          .toBuffer(),
      ),
    );
    const atlas = await sharp({ create: { width: cellW * GRID, height: cellH * GRID, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite(cells.map((input, i) => ({ input, left: (i % GRID) * cellW, top: Math.floor(i / GRID) * cellH })))
      .png()
      .toBuffer();
    const name = sketch ? 'avatar-sketch' : 'avatar-paint';
    const k = await encodeToKTX2(new Uint8Array(atlas), { isUASTC: false, qualityLevel: 220, generateMipmap: true, isKTX2File: true, isYFlip: true, imageDecoder });
    await writeFile(out(`public/textures/${name}.ktx2`), k);
    log(`avatar: ${name}.ktx2 (${(k.length / 1024).toFixed(1)} KB, ${frames.length} frames)`);
  }
}

/* --------------------------------------------------------------- entrance */
async function buildEntrance() {
  // cat flipbook
  const frames = catFrames();
  const cell = CAT_CELL / 2;
  for (const sketch of [true, false]) {
    const cells = await Promise.all(frames.map((f) =>
      sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${CAT_CELL}" height="${CAT_CELL}">${drawCat(f, sketch)}</svg>`)).resize(cell, cell).png().toBuffer()));
    const atlas = await sharp({ create: { width: cell * CAT_GRID, height: cell * CAT_GRID, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite(cells.map((input, i) => ({ input, left: (i % CAT_GRID) * cell, top: Math.floor(i / CAT_GRID) * cell }))).png().toBuffer();
    const k = await encodeToKTX2(new Uint8Array(atlas), { isUASTC: false, qualityLevel: 220, generateMipmap: true, isKTX2File: true, isYFlip: true, imageDecoder });
    await writeFile(out(`public/textures/cat-${sketch ? 'sketch' : 'paint'}.ktx2`), k);
  }
  log('entrance: cat-sketch.ktx2, cat-paint.ktx2');

  // tileable brick wall: 4 rows × 4 bricks per tile, alternate rows offset
  {
    const W = 1024, H = 512, s = sketcher(55), r = rng(56);
    let g = '';
    const rows = 4, bw = W / 4, bh = H / rows;
    for (let row = 0; row < rows; row++) {
      const y = row * bh;
      g += stroke(s.line(0, y + 2, W, y + 2, 1.8), 3, INK, 0.6);
      const off = row % 2 ? bw / 2 : 0;
      for (let k = -1; k <= 4; k++) {
        const x = off + k * bw;
        if (x > 0 && x < W) g += stroke(s.line(x, y + 4, x + (r() - 0.5) * 3, y + bh - 2, 1.4), 2.8, INK, 0.6);
        // a few bricks get a little hatching / a chip
        if (r() < 0.14) g += stroke(s.hatch(Math.max(0, x + 16), y + 14, bw * 0.35, bh - 28, 14, 1), 1.4, INK, 0.25);
        if (r() < 0.12) g += stroke(s.line(x + bw * 0.6, y + bh * 0.3, x + bw * 0.72, y + bh * 0.45, 1), 2, INK, 0.5);
      }
    }
    const png = await rasterizeTransparent(g, W, H);
    await writeFile(out('public/textures/brick.ktx2'), await encodeToKTX2(new Uint8Array(png), { isUASTC: false, qualityLevel: 200, generateMipmap: true, isKTX2File: true, isYFlip: true, imageDecoder }));
  }
  // flagstone path
  {
    const W = 512, H = 1024, s = sketcher(61), r = rng(62);
    let g = '';
    for (let y = 30; y < H - 30; y += 92 + r() * 30) {
      let x = 26 + r() * 30;
      while (x < W - 70) {
        const w = 90 + r() * 80, h = 70 + r() * 30;
        const pts = Array.from({ length: 7 }, (_, i) => {
          const a = (i / 7) * Math.PI * 2;
          return [x + w / 2 + Math.cos(a) * w * (0.42 + r() * 0.08), y + h / 2 + Math.sin(a) * h * (0.42 + r() * 0.08)];
        });
        g += `<path d="${s.poly(pts, true, 1.2)}" fill="#ffffff" fill-opacity="0.85" stroke="${INK}" stroke-width="3.4" stroke-linejoin="round"/>`;
        if (r() < 0.4) g += stroke(s.line(x + w * 0.3, y + h * 0.5, x + w * 0.55, y + h * 0.42, 1), 2, INK, 0.5);
        x += w + 10 + r() * 14;
      }
    }
    const png = await rasterizeTransparent(g, W, H);
    await writeFile(out('public/textures/cobble.ktx2'), await encodeToKTX2(new Uint8Array(png), { isUASTC: false, qualityLevel: 200, generateMipmap: true, isKTX2File: true, isYFlip: true, imageDecoder }));
  }
  log('entrance: brick.ktx2, cobble.ktx2');
}

async function rasterizeTransparent(svgBody, W, H) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${svgBody}</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}


/* ----------------------------------------------------------------- skills */
const SI = Object.fromEntries(Object.values(simpleIcons).filter((x) => x && x.slug).map((x) => [x.slug, x]));
const hexRGB = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mixHex = (h, w, t) => {
  const a = hexRGB(h), b = hexRGB(w);
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
};
const lum = (h) => { const [r, g, b] = hexRGB(h); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };

/** Logo of a skill as SVG, centred on (cx, cy), `size` px wide. */
function skillLogo(skill, cx, cy, size, sketch, fonts) {
  const k = size / 24, tx = cx - size / 2, ty = cy - size / 2;
  if (typeof skill.icon === 'string') {
    const ic = SI[skill.icon];
    if (!ic) throw new Error(`simple-icons: no "${skill.icon}"`);
    const color = '#' + ic.hex;
    const fill = sketch ? INK : color;
    // a thin ink edge keeps light logos (JS, Drizzle) readable on their pastel balloon
    const edge = sketch ? '' : ` stroke="${INK}" stroke-opacity="${lum(color) > 0.6 ? 0.75 : 0.25}" stroke-width="${(1.6 / k).toFixed(3)}"`;
    return `<g transform="translate(${tx} ${ty}) scale(${k})"><path d="${ic.path}" fill="${fill}" fill-opacity="${sketch ? 0.82 : 1}"${edge}/></g>`;
  }
  const word = skill.icon.text ? `<g fill="${sketch ? INK : '#232f3e'}">${textPath(fonts.inter, skill.icon.text, 12, 13.2, 11.5, 'middle', 800).svg}</g>` : '';
  return `<g transform="translate(${tx} ${ty}) scale(${k})">${word}<path d="${skill.icon.d}" fill="none" stroke="${sketch ? INK : skill.icon.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g>`;
}
const skillColor = (skill) => (typeof skill.icon === 'string' ? '#' + SI[skill.icon].hex : skill.icon.color);

function balloonCell(skill, sketch, fonts, seed) {
  const s = sketcher(seed);
  const body = 'M256 28 C372 28 426 122 422 214 C418 306 334 384 256 398 C178 384 94 306 90 214 C86 122 140 28 256 28 Z';
  const color = skillColor(skill);
  // dark brand colours (Next.js, Express…) get a soft grey balloon, not a black one
  const fill = sketch ? '#fdfcf8' : lum(color) < 0.18 ? '#d9d6d0' : mixHex(color, '#ffffff', 0.6);
  let g = `<defs><clipPath id="b${seed}"><path d="${body}"/></clipPath>
    <mask id="m${seed}"><rect width="512" height="512" fill="#fff"/><ellipse cx="226" cy="178" rx="178" ry="178" fill="#000"/></mask></defs>`;
  g += `<path d="${body}" fill="${fill}"/>`;
  // pencil shading in the lower-right crescent
  g += `<g clip-path="url(#b${seed})" mask="url(#m${seed})">${stroke(s.hatch(60, 60, 420, 360, 15, 1.2), 2.4, INK, sketch ? 0.45 : 0.28)}</g>`;
  // highlight
  g += `<path d="M150 136 Q168 86 220 70" fill="none" stroke="#fff" stroke-width="16" stroke-linecap="round" opacity="0.9"/>`;
  g += skillLogo(skill, 256, 188, 168, sketch, fonts);
  // name, fitted to the balloon
  let size = 58, t = textPath(fonts.caveat, skill.name, 256, 0, size, 'middle');
  if (t.width > 215) { size = Math.floor(size * 215 / t.width); t = textPath(fonts.caveat, skill.name, 256, 0, size, 'middle'); }
  g += `<g fill="${INK}" transform="translate(0 ${336 + size * 0.1})">${t.svg}</g>`;
  // outline: double pencil line + knot
  g += `<path d="${body}" fill="none" stroke="${INK}" stroke-width="7"/>`;
  g += `<path d="${body}" fill="none" stroke="${INK}" stroke-width="3" opacity="0.5" transform="translate(3 -2) rotate(0.6 256 214)"/>`;
  g += `<path d="M236 418 L256 397 L276 418 Q256 428 236 418 Z" fill="${fill}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`;
  g += stroke('M256 424 Q262 446 254 468 T258 506', 5, INK, 0.9);
  return g;
}

function badgeCell(skill, sketch, fonts) {
  const color = skillColor(skill);
  const ring = sketch ? '#bdb9b2' : lum(color) < 0.18 ? '#8a8783' : color;
  let g = `<circle cx="256" cy="256" r="236" fill="#fff"/>`; // die-cut margin
  g += `<circle cx="256" cy="256" r="236" fill="none" stroke="${INK}" stroke-width="8"/>`;
  g += `<circle cx="256" cy="256" r="200" fill="${sketch ? '#fbfaf6' : '#ffffff'}" stroke="${ring}" stroke-width="18"/>`;
  g += skillLogo(skill, 256, 256, 236, sketch, fonts);
  return g;
}

async function atlas(cells, grid, cell, name) {
  const imgs = await Promise.all(cells.map((g) =>
    sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">${g}</svg>`)).resize(cell, cell).png().toBuffer()));
  const png = await sharp({ create: { width: cell * grid, height: cell * grid, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(imgs.map((input, i) => ({ input, left: (i % grid) * cell, top: Math.floor(i / grid) * cell }))).png().toBuffer();
  if (process.env.DEBUG_ATLAS) await writeFile(`/tmp/${name}.png`, png);
  const k = await encodeToKTX2(new Uint8Array(png), { isUASTC: false, qualityLevel: 230, generateMipmap: true, isKTX2File: true, isYFlip: true, imageDecoder });
  await writeFile(out(`public/textures/${name}.ktx2`), k);
  log(`skills: ${name}.ktx2 (${(k.length / 1024).toFixed(1)} KB, ${cells.length} cells)`);
  return png;
}

async function buildSkills(fonts) {
  if (skills.length > BALLOON_GRID * BALLOON_GRID) throw new Error('too many skills for the balloon atlas');
  for (const sketch of [true, false]) {
    await atlas(skills.map((sk, i) => balloonCell(sk, sketch, fonts, 300 + i)), BALLOON_GRID, 256, `skill-balloons-${sketch ? 'sketch' : 'paint'}`);
    const badges = DOOR_BADGES.map((n) => skills.find((s) => s.name === n));
    await atlas(badges.map((sk) => badgeCell(sk, sketch, fonts)), BADGE_GRID, 256, `skill-badges-${sketch ? 'sketch' : 'paint'}`);
  }
}

/* -------------------------------------------------------------- OG image */
async function buildOG(fonts) {
  const W = 1200, H = 630, s = sketcher(99);
  let g = paperBg(W, H, 9);
  // corridor sketch on the right
  const vx = 1010, vy = 300;
  for (const [x, y] of [[830, 0], [1200, 0], [830, 630], [1200, 630]]) g += stroke(s.line(x, y, vx + (x - vx) * 0.25, vy + (y - vy) * 0.25, 2), 2.4, INK, 0.7);
  g += stroke(s.rect(vx - 90, vy - 82, 180, 165, 1.5), 2.4, INK, 0.7);
  g += wash(s.poly([[862, 160], [905, 190], [905, 470], [862, 520]], true, 1), TERRA, 0.4) + stroke(s.poly([[862, 160], [905, 190], [905, 470], [862, 520]], true, 1.5), 2.6);
  g += wash(s.poly([[1150, 140], [1080, 175], [1080, 465], [1150, 515]], true, 1), OCHRE, 0.45) + stroke(s.poly([[1150, 140], [1080, 175], [1080, 465], [1150, 515]], true, 1.5), 2.6);
  // title
  const name = textPath(fonts.caveat, 'Mohamed Ahmed', 80, 290, 122);
  g += `<g fill="${INK}">${name.svg}</g>`;
  g += stroke(`M82 318 C 250 303, 480 345, ${80 + name.width} 310`, 7, TERRA);
  const sub = textPath(fonts.caveat, 'Full-Stack Engineer', 84, 400, 66);
  g += `<g fill="${TERRA}">${sub.svg}</g>`;
  const meta = textPath(fonts.inter, 'Dubai, UAE · React · Next.js · Node.js · NestJS', 86, 480, 28);
  g += `<g fill="${INK}" opacity="0.75">${meta.svg}</g>`;
  const png = await rasterize(g, W, H);
  await writeFile(out('public/og.png'), await sharp(png).png({ compressionLevel: 9 }).toBuffer());
  log('og.png');
}

/* -------------------------------------------------------------------- run */
console.log('Building assets…');
const fonts = await buildFonts();
await buildTextures();
await buildModels();
await buildAvatar();
await buildEntrance();
await buildSkills(fonts);
await buildOG(fonts);
console.log('Done.');
