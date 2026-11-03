---
order: 6
name: WinningKart
category: Platform
tagline: Self-hosted performance-marketing platform for agencies
summary: "Operator-owned Meta ads data — dashboards, attribution, reports and safety-first campaign drafting on infrastructure you control."
description: "A self-hosted performance-marketing platform for agencies — Meta ad dashboards, revenue attribution, scheduled reports, and PAUSED-only campaign drafting through the Meta Marketing API, built so agencies own their data."
impact: Operator-owned data and transparent attribution
stack: [Next.js, TypeScript, Node.js, Meta Marketing API, Turborepo]
metric: { value: "4", label: shared packages in one TypeScript monorepo }
---

## The brief

Agencies that run Meta ad accounts live inside Meta's reporting — and lose the history, the attribution context and the client-facing evidence when they look away. WinningKart flips that: the agency hosts the platform, owns the data, and shows clients attribution it can defend.

## My part

I designed and built it end to end as an independent product: the dashboards, the attribution pipeline, the reporting layer, and the campaign-drafting workflow that talks to the **Meta Marketing API v21.0** with System User tokens.

## How it was built

- **Next.js dashboard + Node.js backends** in a **TypeScript monorepo** (Turborepo, 4 shared packages).
- **Meta Marketing API v21.0** with System User tokens; rate limiting, budget clamping and delays built in to respect platform limits.
- **Campaign creation is PAUSED-only** — the platform never launches anything; a human reviews and pushes every campaign live.
- Scheduled EOD and weekly reports generated from the agency's own stored data.

## Outcome

The platform this portfolio runs on — WinningKart's own infrastructure hosts it. Self-hosted, operator-owned, with attribution an agency can show a client without asking anyone's permission.
