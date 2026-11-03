/**
 * Brand icon ("MA/" monogram, JetBrains Mono, cobalt slash on ink) rendered at build
 * time with Satori (text -> vector paths) and resvg (-> PNG). Used for the favicon,
 * the PWA manifest icons and the Apple touch icon.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const INK = '#0E1116';
const PAPER = '#F7F8FA';
const SLASH = '#5B73FF'; // cobalt, lifted for contrast on ink

let font: Promise<Buffer> | undefined;
const mono = () =>
  (font ??= readFile(join(process.cwd(), 'src/assets/og/jetbrains-mono-latin-500-normal.woff')));

export interface IconOptions {
  /** Full-bleed square, glyphs kept inside the 80% maskable safe zone. */
  maskable?: boolean;
  /** Rounded corners (favicon / "any" icons). Apple and maskable icons stay square. */
  rounded?: boolean;
}

export async function iconSvg(size: number, { maskable, rounded }: IconOptions = {}) {
  const fontSize = Math.round(size * (maskable ? 0.3 : 0.38));
  const span = (text: string, color: string) => ({
    type: 'span',
    props: { style: { color }, children: text },
  });
  return satori(
    {
      type: 'div',
      props: {
        style: {
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: INK,
          borderRadius: rounded ? Math.round(size * 0.22) : 0,
          fontFamily: 'JetBrains Mono',
          fontWeight: 500,
          fontSize,
          letterSpacing: -fontSize * 0.06,
          // optical centring: mono caps sit slightly high
          paddingTop: Math.round(size * 0.02),
        },
        children: [span('MA', PAPER), span('/', SLASH)],
      },
    },
    {
      width: size,
      height: size,
      fonts: [{ name: 'JetBrains Mono', data: await mono(), weight: 500, style: 'normal' }],
    },
  );
}

export async function iconPng(size: number, opts: IconOptions = {}): Promise<Buffer> {
  const svg = await iconSvg(size, opts);
  return new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
}

/** Single-image .ico that wraps a PNG (supported by every current browser). */
export function pngToIco(png: Buffer, size: number): Buffer {
  const head = Buffer.alloc(22);
  head.writeUInt16LE(0, 0); // reserved
  head.writeUInt16LE(1, 2); // type: icon
  head.writeUInt16LE(1, 4); // count
  head.writeUInt8(size >= 256 ? 0 : size, 6);
  head.writeUInt8(size >= 256 ? 0 : size, 7);
  head.writeUInt8(0, 8); // palette
  head.writeUInt8(0, 9); // reserved
  head.writeUInt16LE(1, 10); // planes
  head.writeUInt16LE(32, 12); // bpp
  head.writeUInt32LE(png.length, 14);
  head.writeUInt32LE(22, 18); // offset
  return Buffer.concat([head, png]);
}

export const BRAND = { ink: INK, paper: PAPER };
