# Portfolio Design Brief

> Decision doc for the design system, architecture, and structure of the portfolio.
> Status: **LOCKED** (owner sign-off complete).

## Locked decisions

| Decision | Choice |
| --- | --- |
| Theme | **A — Dark Terminal** (zinc-950 base, emerald accent, mono labels) |
| Structure | **A — Layered** (components/{layout,sections,ui} + content/ + hooks/ + lib/) |
| Hero | **3D agent-network graph** (orchestrator core + 7 agent nodes + task pulses), built with React Three Fiber, lazy-loaded, reduced-motion fallback. Prototype: `docs/prototypes/hero-preview.html` |
| Repo | Public — github.com/Mohamed-El-Sharqawy/portfolio |

**Design read:** Developer portfolio for a mid/senior Frontend Engineer with an AI-agentic edge. Primary audience: recruiters and technical hiring managers scanning in <60 seconds. Secondary: engineers admiring the craft.

**Dials (per anti-slop frontend skill):** `DESIGN_VARIANCE 6 / MOTION 5 / DENSITY 4` — Portfolio (Developer) preset. Confident and technical, not agency-chaos.

---

## 1. What this site must sell (recruiter psychology)

A recruiter spends **6 seconds** on first scan, a hiring manager ~60. The page is engineered for both passes:

| Time | What they see | What it proves |
| --- | --- | --- |
| 0–6s | Hero: name, positioning line, one proof metric ("national-scale systems, 1M+ users"), CTAs | Seniority + clarity of communication |
| 6–30s | Trust strip (4 companies) → Selected Work cards with impact | Real production experience, enterprise scope |
| 30–60s | AI Agentic Engineering section + Experience timeline | The differentiator: rare FE + agentic-AI combo |
| Conversion | Sticky contact affordances + one-click CV (PDF opens in-browser) | Zero-friction next step |

Positioning line (hero): **"Frontend engineer building national-scale systems — and the AI agent teams that help ship them."**

Three conversion goals, in order: 1) email click, 2) CV open, 3) LinkedIn visit.

---

## 2. Page sections & UX flow (locked)

Single-page narrative scroll:

```
Navbar (sticky, minimal: logo · links · "Get in touch" pill)
└─ 1. Hero — split layout: kinetic type left ("Frontend Engineer
│        × AI Agent Orchestrator"), interactive accent right.
│        Proof strip under CTAs. Fits 100dvh.
├─ 2. Trust strip — Remote for: Global Dynamics · Forever Events ·
│        Grwan Group · ASDC (wordmarks, logo-only rule)
├─ 3. About — asymmetric split: short bio + quick facts
│        (Cairo/Egypt · remote · BSc Computing OU-UK · 3+ yrs)
├─ 4. Selected Work — case-study cards (LeanGo suite, LMS for
│        Police Academy, Crime & Legal Center 1M+ users, Diaflower)
│        Each: problem → my role → stack → impact. NOT a tile wall.
├─ 5. AI Agentic Engineering — THE differentiator. Terminal-flavored
│        visualization of a multi-agent pipeline (plan → build →
│        review → PR → ship). Explains the workflow in 3 steps.
├─ 6. Experience — timeline, 4 roles, reverse-chronological
├─ 7. Skills — grouped chips (Core FE / Backend / Infra), not a wall
│        of 40 logos
└─ 8. Contact + Footer — big email CTA, socials, "View CV (PDF)"
```

Rules applied: max 1 eyebrow per 3 sections, one layout family per section (split, cards, timeline, terminal, chips — all distinct), one accent color everywhere, hero ≤ 4 text elements, marquee at most once.

## 3. Color direction — CHOOSE ONE

All three avoid the AI-purple cliché. One accent, locked across the page.

### Option A — "Dark Terminal" (recommended)
- Base: `zinc-950` off-black, `zinc-100` text
- Accent: **emerald** (`#10b981`, desaturated for text use)
- Mono type for labels/metrics, sans display for headlines
- Feels: engineer-authentic, reads as "this person ships software."
- The agentic-pipeline terminal section feels native, not bolted on.

### Option B — "Cobalt Editorial"
- Base: near-black `#0a0a0b` + off-white sections inverted sparingly
- Accent: **electric cobalt** (`#2563eb`→`#3b82f6` family)
- Big kinetic serif-free display type, generous whitespace
- Feels: premium, Linear/Vercel-adjacent. Safest for conservative enterprises.

### Option C — "Warm Graphite + Ember"
- Base: warm graphite `#171512`, paper-white text
- Accent: **ember orange** (`#ea580c`, muted)
- Feels: distinctive, warm-technical. Highest memorability, small risk of reading "industrial."

## 4. Typography & motion (locked pending theme choice)

- **Type pairing:** `Geist` (display + body) + `Geist Mono` (labels, metrics, terminal). Already wired via `next/font`. No Inter, no default serifs.
- **Motion:** GSAP ScrollTrigger for: hero intro, one scroll-reveal per section, the agentic pipeline step-through. `prefers-reduced-motion` collapses everything to static. No scroll-listeners, no infinite loops on informational sections.
- **3D:** optional Three.js centerpiece in hero (lazy-loaded, `next/dynamic`, skipped on reduced-motion). If it hurts LCP, it's cut.

## 5. Folder structure — CHOOSE ONE

### Option A — Layered by kind (recommended for a section-based portfolio)

```
src/
├── app/                        # routes only
│   ├── layout.tsx              # fonts, metadata, theme
│   ├── page.tsx                # SERVER component: composes sections
│   └── globals.css             # Tailwind v4 tokens (@theme)
├── components/
│   ├── layout/                 # Navbar.tsx, Footer.tsx, Section.tsx
│   ├── sections/
│   │   ├── hero/               # Hero.tsx (RSC) + HeroCanvas.client.tsx
│   │   ├── about/
│   │   ├── work/
│   │   ├── agentic/
│   │   ├── experience/
│   │   ├── skills/
│   │   └── contact/
│   └── ui/                     # Button.tsx, Chip.tsx, Wordmark.tsx...
├── content/                    # DATA AS CODE (the flex)
│   ├── profile.ts              # name, links, positioning
│   ├── experience.ts           # roles
│   ├── projects.ts             # case studies
│   └── skills.ts
├── hooks/                      # useReducedMotionPref, useMagnetic...
└── lib/                        # utils.ts, cn.ts, constants.ts
```

Why: content-as-data means recruiters' info edits never touch JSX. Section folders co-locate a section's RSC shell with its client islands. Scales to more pages later.

### Option B — Feature-module verticals

```
src/
├── app/
├── features/                   # hero/, work/, agentic/ each own
│                               # component + content + hooks
├── components/ui/
└── lib/
```

Why not: overkill for one page; content duplication risk across features.

### Option C — Flat components

```
src/
├── app/
├── components/                 # Hero.tsx, ExperienceTimeline.tsx...
└── lib/
```

Why not: fine at 5 components, mush at 25. Doesn't read "senior."

## 6. Naming & component conventions (locked)

- Files = PascalCase matching default export: `Hero.tsx`, `ExperienceTimeline.tsx`
- Client islands: explicit suffix **`*.client.tsx`** (`HeroCanvas.client.tsx`, `Navbar.client.tsx`) — `grep '\.client\.'` instantly maps the client boundary
- Server components stay bare (`Hero.tsx`, `page.tsx`, `layout.tsx`)
- Content files: camelCase (`experience.ts`), exporting typed consts (`export const experience: ExperienceItem[]`)
- Hooks: `use` prefix camelCase files (`useScrollReveal.ts`)
- No comments unless asked; types live beside what they type

## 7. Next.js / Vercel architecture (locked)

- `page.tsx` and `layout.tsx` are **always Server Components**. They compose section wrappers; anything stateful/animated is a `.client.tsx` leaf.
- RSC-first: the entire page's markup ships as HTML with ~0 client JS except: navbar state, hero canvas, GSAP choreography wrapper, agentic pipeline visual.
- Three.js: `next/dynamic` + `ssr: false`, lazy after hydration, cut if LCP > 2.5s.
- CV: served from `public/mohamed-ahmed-cv.pdf` (static, CDN-cached, opens in-browser via `<a target="_blank" rel="noopener">`).
- Metadata: full Open Graph + Twitter cards, JSON-LD `Person` schema (recruiters' preview cards look good when shared on LinkedIn).
- Static prerender (`export const dynamic` untouched → SSG), deployed on Vercel with preview deployments per PR.
- Dark-only theme (chosen direction is dark); `themeColor` meta set accordingly.

## 8. Build milestones (multi-agent, PR each)

| # | Milestone | Ships |
| --- | --- | --- |
| 1 | Foundation | Tokens in `globals.css`, `components/ui`, `content/*` data files, layout shell, `.client.tsx` convention wired |
| 2 | Core sections | Hero (+ trust strip), About, Experience, Skills — with GSAP reveals |
| 3 | Differentiators | Selected Work case studies + AI Agentic pipeline section |
| 4 | Polish & ship | Contact/footer, SEO + JSON-LD, performance pass, a11y pass, reduced-motion audit, final review + merge to `main` |
