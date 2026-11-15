// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  site: 'https://portfolio.winningkart.tech',
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  build: {
    // Critical CSS: every stylesheet is inlined into the HTML, so first paint
    // needs no extra CSS request.
    inlineStylesheets: 'always',
  },
  image: {
    responsiveStyles: true,
  },
  vite: {
    plugins: [glsl({ minify: true })],
    build: {
      target: 'es2022',
      assetsInlineLimit: 0,
    },
  },
});
