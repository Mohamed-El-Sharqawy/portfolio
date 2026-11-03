# portfolio-v2

Static Astro 7 rewrite of [portfolio.winningkart.tech](https://portfolio.winningkart.tech).
Zero framework JS: three tiny vanilla islands (mobile menu, Agents tabs, off-screen
animation pause) plus Astro's prefetch, ~1.8 KB gzipped in total.

## Commands

| Command           | What it does                                     |
| ----------------- | ------------------------------------------------ |
| `npm run dev`     | Dev server at `localhost:4321`                   |
| `npm run build`   | Static build to `dist/`                          |
| `npm run preview` | Serve `dist/` locally                            |
| `npm run check`   | `astro check` (strict TypeScript)                |
| `npm run lint`    | ESLint (`eslint-plugin-astro` + jsx-a11y strict) |
| `npm run format`  | Prettier (`prettier-plugin-astro`)               |
| `npm run verify`  | check + lint + format check + build              |

`GITHUB_TOKEN=$(gh auth token) npm run build` builds with the full-year contribution
calendar. `GITHUB_DISABLE=1` skips GitHub entirely (renders the empty state).

## Structure

- `src/content.config.ts`: content collections with Zod schemas
  - `projects`: Markdown case studies in `src/content/projects/*.md` → `/work/[slug]/`
  - `experience`, `skills`, `education`: JSON in `src/data/`
- `src/data/site.ts`: profile, hero stats, companies, Agents pipeline logs
- `src/lib/github.ts`: build-time GitHub snapshot (GraphQL calendar with
  `GITHUB_TOKEN`, public events API fallback, never throws)
- `src/lib/og.ts` + `src/pages/og/[slug].png.ts`: Satori → PNG OG images at build time
- `src/styles/global.css`: design tokens + the decorative shapes (transform/opacity only)

## Deploy (Coolify on the Hostinger VPS)

1. Coolify → New resource → this Git repo → Build pack **Dockerfile**, port **80**.
   The image is a multi-stage build: Node builds `dist/`, then
   [Caddy](./Caddyfile) serves it with:
   - `/_astro/*` → `Cache-Control: public, max-age=31536000, immutable` (hashed JS + fonts)
   - `/og/*`, icons, PDF → 1 day
   - HTML / sitemap / robots → `max-age=0, must-revalidate`
   - zstd/gzip, security headers, `/404.html` for missing pages
2. Optional build variable: `GITHUB_TOKEN` (a fine-grained token with no repo
   permissions is enough to read the public contributions calendar).
3. Domain: `portfolio.winningkart.tech`. Cloudflare reports HTML as `DYNAMIC` by
   default; add a Cache Rule for the hostname if you want HTML cached at the edge
   (purge on deploy).

### Daily rebuild (keeps the GitHub heatmap fresh)

The heatmap is baked in at build time, so rebuild once a day. Either:

- **GitHub Actions**: `.github/workflows/daily-rebuild.yml` calls the Coolify
  deploy webhook at 03:15 UTC. Add repo secrets `COOLIFY_WEBHOOK` (Coolify → app →
  Webhooks → Deploy webhook) and `COOLIFY_TOKEN` (Coolify → Keys & Tokens, deploy
  permission).
- **Or cron on the VPS**:
  `15 3 * * * curl -fsS -H "Authorization: Bearer <token>" "<deploy webhook url>"`

## Notes

- Fonts are self-hosted through the Astro Fonts API (`fontProviders.local()`, files
  from Fontsource in `src/assets/fonts/`): Instrument Sans variable (latin,
  400–700, preloaded) and JetBrains Mono 400/500, `font-display: swap`, with
  Astro's metric-matched fallbacks. Local files keep the build working offline.
- Page transitions use CSS `@view-transition { navigation: auto; }` (no JS), and
  scroll reveals use `animation-timeline: view()` inside `@supports`. Content is
  fully visible without either.
- The Astro Docs MCP server is registered in `.mcp.json` for Claude Code sessions.
