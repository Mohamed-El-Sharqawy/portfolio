# Mohamed Ahmed — Portfolio

Personal portfolio of **Mohamed Ahmed**, a Frontend Engineer (3+ years) specializing in SaaS platforms, ERP dashboards, and large-scale enterprise systems, with deep expertise in **AI agentic engineering** — orchestrating multi-agent workflows that design, build, review, and ship entire projects.

- **CV (PDF):** [/mohamed-ahmed-cv.pdf](/mohamed-ahmed-cv.pdf)
- **LinkedIn:** [mohamed-elsharqawi](https://linkedin.com/in/mohamed-elsharqawi)
- **GitHub:** [Mohamed-El-Sharqawy](https://github.com/Mohamed-El-Sharqawy)
- **Email:** dev.elbehery@gmail.com

## Sections

| Section | Purpose |
| --- | --- |
| Hero | Positioning statement: frontend engineering + AI agentic systems, 3D agent network |
| About | Short bio, quick facts, education |
| Selected Work | Case studies: LeanGo platform suite, LMS, Crime & Legal Center, Diaflower |
| AI Agentic Engineering | Multi-agent pipeline terminal, workflow explainer |
| Experience | Timeline: Global Dynamics, Forever Events, Grwan Group, ASDC |
| Skills | Frontend core, backend, infrastructure |
| Contact | Closing CTA: email, LinkedIn, GitHub, CV download |
| Footer | Wordmark, contact links, copyright |

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org) 16 (App Router, RSC-first)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Animation:** GSAP + ScrollTrigger (`@gsap/react`)
- **3D (hero):** Three.js via `@react-three/fiber` + `@react-three/drei`
- **Hosting:** Coolify on a Hostinger VPS

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |

## Project Structure

```
src/
├── app/                  # Routes (App Router). page.tsx is a Server Component
│   ├── layout.tsx        # Root layout: fonts, metadata, global providers
│   ├── page.tsx          # Home — server component composing section wrappers
│   └── globals.css       # Tailwind v4 theme tokens
├── components/
│   ├── layout/           # Navbar, Footer, page shell
│   ├── sections/         # One folder per page section (hero/, experience/, ...)
│   └── ui/               # Reusable primitives (Button, Badge, Tag...)
├── lib/                  # Utilities, constants, content data
└── public/               # Static assets (CV PDF, images)
```

**Convention:** `page.tsx` stays a Server Component. Interactive islands (animations, 3D, nav state) are isolated `"use client"` wrappers composed inside it — so most of the page ships zero client JS.

## Deployment — Coolify on Hostinger VPS

The site deploys via [Coolify](https://coolify.io) on a Hostinger VPS behind **https://portfolio.winningkart.tech**.

- **Setup**: import this repo in Coolify as a Next.js / Nixpacks app — build `npm run build`, start `npm run start`
- **Environment**: add `GITHUB_TOKEN=<classic PAT, no scopes>` in the Coolify environment variables — required for the full-year contribution heatmap; without it the GitHub section falls back to the last 90 days of public events
- **TLS**: Coolify's reverse proxy (Traefik/Caddy) issues and renews Let's Encrypt certificates for the domain
- **Updates**: every push to `main` auto-deploys through Coolify's Git webhook

## License

All rights reserved — this is personal work. See the [CV](/mohamed-ahmed-cv.pdf) for contact details.
