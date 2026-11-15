import { CanvasTexture } from 'three';

/**
 * Small 2D-canvas helpers for hand-lettered textures (door signs, cards,
 * certificates, the letter). Text is drawn in Caveat with a second, offset
 * pass so it reads like pencil going over the same line twice.
 */
export const INK = '#2b2b2b';
export const TERRA = '#c8553d';
export const OCHRE = '#e0a458';

export function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  draw(ctx, w, h);
  const tex = new CanvasTexture(c);
  tex.anisotropy = 4;
  return tex;
}

let seed = 1;
const rand = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

export function handText(
  ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number,
  color = INK, align: CanvasTextAlign = 'center', maxWidth?: number, weight = 700,
) {
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.font = `${weight} ${size}px Caveat, cursive`;
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.45;
  ctx.fillText(text, x + size * 0.02, y + size * 0.015, maxWidth);
  ctx.globalAlpha = 1;
  ctx.fillText(text, x, y, maxWidth);
}

export function bodyText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color = INK, align: CanvasTextAlign = 'center', maxWidth?: number) {
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.font = `500 ${size}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y, maxWidth);
}

/** Word-wrap `text` into lines no wider than `maxWidth` using the current font. */
export function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export function roughLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, width = 3, color = INK, amp = 2) {
  ctx.strokeStyle = color;
  for (let pass = 0; pass < 2; pass++) {
    ctx.lineWidth = pass ? width * 0.5 : width;
    ctx.globalAlpha = pass ? 0.5 : 1;
    ctx.beginPath();
    ctx.moveTo(x1 + (rand() - 0.5) * amp, y1 + (rand() - 0.5) * amp);
    const mx = (x1 + x2) / 2 + (rand() - 0.5) * amp * 2;
    const my = (y1 + y2) / 2 + (rand() - 0.5) * amp * 2;
    ctx.quadraticCurveTo(mx, my, x2 + (rand() - 0.5) * amp, y2 + (rand() - 0.5) * amp);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

export function roughRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, width = 3, color = INK) {
  roughLine(ctx, x, y, x + w, y, width, color);
  roughLine(ctx, x + w, y, x + w, y + h, width, color);
  roughLine(ctx, x + w, y + h, x, y + h, width, color);
  roughLine(ctx, x, y + h, x, y, width, color);
}

export function scribbleUnderline(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number, color = TERRA, width = 6) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.bezierCurveTo(x1 + (x2 - x1) * 0.3, y - 8, x1 + (x2 - x1) * 0.7, y + 8, x2, y - 2);
  ctx.stroke();
}

export function wash(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color = OCHRE, alpha = 0.35) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  const j = () => (rand() - 0.5) * Math.min(w, h) * 0.08;
  ctx.moveTo(x + j(), y + j());
  ctx.lineTo(x + w + j(), y + j());
  ctx.lineTo(x + w + j(), y + h + j());
  ctx.lineTo(x + j(), y + h + j());
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
