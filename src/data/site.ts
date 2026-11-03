export const SITE_URL = 'https://portfolio.winningkart.tech';

export const profile = {
  name: 'Mohamed Ahmed',
  role: 'Full-Stack Engineer & AI Agentic Systems',
  headline: 'Full-stack engineer · AI agent orchestration',
  availability: 'Available — Dubai, UAE · remote',
  availabilityShort: 'Available — Dubai · remote',
  location: 'Dubai, UAE · Open to remote',
  email: 'dev.elsharqawy@gmail.com',
  phone: '+971 54 200 9458',
  phoneEgypt: '+20 102 114 1193',
  linkedin: 'https://linkedin.com/in/mohamed-elsharqawi',
  github: 'https://github.com/Mohamed-El-Sharqawy',
  githubUsername: 'Mohamed-El-Sharqawy',
  cvUrl: '/Mohamed_Ahmed_CV_Full_Stack_UAE.pdf',
} as const;

export const tel = (phone: string): string => `tel:${phone.replace(/\s/g, '')}`;

export const siteTitle = 'Mohamed Ahmed — Full-Stack Engineer & AI Agentic Systems';
export const siteDescription =
  'Full-stack engineer with a frontend specialty, building national-scale systems — and the AI agent teams that help ship them. 3+ years of production experience across enterprise platforms, e-commerce, and ERP.';

export const stats = [
  { value: '3+', label: 'Years in production' },
  { value: '1M+', label: 'Users reached' },
  { value: '6 · 4', label: 'Companies · countries' },
  { value: '15+', label: 'Systems shipped' },
] as const;

export const companies = ['Global Dynamics', 'Forever Events', 'Grwan Group', 'ASDC'] as const;

export const navLinks = [
  { href: '/#work', label: 'Work', note: 'Selected systems and case studies' },
  { href: '/#agents', label: 'Agents', note: 'How I run AI agent engineering teams' },
  { href: '/#experience', label: 'Experience', note: 'Roles, companies and impact' },
  { href: '/#stack', label: 'Stack', note: 'Languages, frameworks and tooling' },
] as const;

export type LogLine = { t: string; agent: string; msg: string };
export type Stage = { id: 'plan' | 'build' | 'review' | 'fix' | 'ship'; lines: LogLine[] };

/** Agent pipeline log, shown in the [02] Agents tabs. */
export const stages: Stage[] = [
  {
    id: 'plan',
    lines: [
      { t: '09:12:04', agent: 'planner', msg: 'read brief → 4 milestones, 23 tasks' },
      { t: '09:12:09', agent: 'planner', msg: 'open issues #1–#4, assign builders' },
      { t: '09:12:11', agent: 'orchestr.', msg: 'spawn builder-01..03 in worktrees' },
    ],
  },
  {
    id: 'build',
    lines: [
      { t: '09:14:22', agent: 'builder-01', msg: 'implement Hero + Work sections' },
      { t: '09:14:23', agent: 'builder-02', msg: 'content collections + case-study routes' },
      { t: '09:14:25', agent: 'builder-03', msg: 'SEO: sitemap, JSON-LD, OG images' },
      { t: '09:31:40', agent: 'builder-01', msg: 'tests passing → open PR #12' },
    ],
  },
  {
    id: 'review',
    lines: [
      { t: '09:33:02', agent: 'reviewer', msg: 'audit a11y + performance on PR #12' },
      { t: '09:34:18', agent: 'a11y-audit', msg: '2 issues: focus order, contrast 4.1:1' },
      { t: '09:34:20', agent: 'reviewer', msg: 'request changes' },
    ],
  },
  {
    id: 'fix',
    lines: [
      { t: '09:36:51', agent: 'builder-02', msg: 'apply fixes, re-run verification' },
      { t: '09:39:07', agent: 'a11y-audit', msg: '0 violations · contrast ≥ 4.5:1' },
      { t: '09:39:09', agent: 'reviewer', msg: 'approve PR #12' },
    ],
  },
  {
    id: 'ship',
    lines: [
      { t: '09:41:30', agent: 'human', msg: 'merge PR #12 → main' },
      { t: '09:42:58', agent: 'deployer', msg: 'astro build → static pages' },
      { t: '09:43:10', agent: 'deployer', msg: 'deploy to edge · live' },
    ],
  },
];
export const defaultStage: Stage['id'] = 'build';
