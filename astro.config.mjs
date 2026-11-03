// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://portfolio.winningkart.tech',
  output: 'static',
  trailingSlash: 'always',
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404') && !page.includes('/lab/'),
    }),
  ],
  build: {
    // One small stylesheet per page: inlining removes the render-blocking request.
    inlineStylesheets: 'always',
  },
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover',
  },
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Instrument Sans',
      cssVariable: '--font-sans',
      fallbacks: ['system-ui', 'sans-serif'],
      options: {
        variants: [
          {
            // Variable font: one latin file covers weights 400–700.
            weight: '400 700',
            style: 'normal',
            display: 'swap',
            src: ['./src/assets/fonts/instrument-sans-latin-wght-normal.woff2'],
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'JetBrains Mono',
      cssVariable: '--font-mono',
      fallbacks: ['ui-monospace', 'monospace'],
      options: {
        variants: [
          {
            weight: 400,
            style: 'normal',
            display: 'swap',
            src: ['./src/assets/fonts/jetbrains-mono-latin-400-normal.woff2'],
          },
          {
            weight: 500,
            style: 'normal',
            display: 'swap',
            src: ['./src/assets/fonts/jetbrains-mono-latin-500-normal.woff2'],
          },
        ],
      },
    },
  ],
});
