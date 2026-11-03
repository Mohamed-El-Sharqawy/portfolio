import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

type Node = { type: string; props: Record<string, unknown> & { style?: Record<string, unknown> } };
const h = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({
  type,
  props: { style: { display: 'flex', ...style }, children },
});

const FONT_DIR = join(process.cwd(), 'src/assets/og');
let fonts:
  Promise<{ name: string; data: Buffer; weight: 500 | 600; style: 'normal' }[]> | undefined;

function loadFonts() {
  fonts ??= Promise.all([
    readFile(join(FONT_DIR, 'instrument-sans-latin-500-normal.woff')),
    readFile(join(FONT_DIR, 'instrument-sans-latin-600-normal.woff')),
    readFile(join(FONT_DIR, 'jetbrains-mono-latin-500-normal.woff')),
  ]).then(([s500, s600, m500]) => [
    { name: 'Instrument Sans', data: s500, weight: 500, style: 'normal' },
    { name: 'Instrument Sans', data: s600, weight: 600, style: 'normal' },
    { name: 'JetBrains Mono', data: m500, weight: 500, style: 'normal' },
  ]);
  return fonts;
}

export type OgInput = {
  eyebrow: string;
  title: string;
  subtitle: string;
  metric?: { value: string; label: string };
};

const C = {
  paper: '#F7F8FA',
  ink: '#0E1116',
  body: '#3D434F',
  muted: '#5B616E',
  accent: '#2F4BFF',
};

export async function renderOg({ eyebrow, title, subtitle, metric }: OgInput): Promise<Buffer> {
  const left = h(
    'div',
    {
      flexDirection: 'column',
      justifyContent: 'space-between',
      flex: 1,
      padding: '64px 64px 56px',
    },
    [
      h('div', { fontFamily: 'JetBrains Mono', fontSize: 22, color: C.accent }, eyebrow),
      h('div', { flexDirection: 'column' }, [
        h(
          'div',
          {
            fontSize: title.length > 18 ? 92 : 116,
            fontWeight: 600,
            letterSpacing: '-0.055em',
            lineHeight: 0.92,
            color: C.ink,
          },
          title,
        ),
        h(
          'div',
          {
            marginTop: 32,
            paddingTop: 24,
            borderTop: `3px solid ${C.ink}`,
            fontSize: 34,
            fontWeight: 500,
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
            color: C.body,
          },
          subtitle,
        ),
      ]),
      h('div', { fontFamily: 'JetBrains Mono', fontSize: 20, color: C.muted }, [
        'MA',
        h('span', { color: C.accent }, '/'),
        'portfolio.winningkart.tech',
      ]),
    ],
  );

  const right = metric
    ? h(
        'div',
        {
          width: 360,
          background: C.accent,
          color: '#fff',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: 48,
        },
        [
          h(
            'div',
            { fontSize: 140, fontWeight: 600, letterSpacing: '-0.07em', lineHeight: 0.85 },
            metric.value,
          ),
          h('div', { marginTop: 16, fontSize: 26 }, metric.label),
        ],
      )
    : h('div', { width: 24, background: C.accent }, []);

  const svg = await satori(
    h(
      'div',
      { width: '100%', height: '100%', background: C.paper, fontFamily: 'Instrument Sans' },
      [left, right],
    ),
    { width: 1200, height: 630, fonts: await loadFonts() },
  );
  return new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
}
