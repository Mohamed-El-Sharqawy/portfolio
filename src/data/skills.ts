/**
 * Skills catalogue for the Skills door. Names and groups mirror `profile.toolkit`.
 *
 * `icon` is a Simple Icons slug (real brand logo + colour, CC0 icon data), or a
 * custom line glyph for things that have no logo (SQL, REST, CI/CD …) or whose
 * logo isn't in Simple Icons (AWS, Zustand). Custom glyphs are 24×24 stroke paths.
 *
 * `size` is how big the balloon is in the Skills room: L = daily core stack.
 * The order here is also the cell order of the balloon/badge atlases built by
 * scripts/build-assets.mjs, so append new skills at the end of a group's list
 * and re-run `npm run assets`.
 */
export type SkillSize = 'L' | 'M' | 'S';
export interface Glyph { d: string; color: string; /** lettering drawn above the strokes (24-unit box) */ text?: string }
export interface Skill {
  name: string;
  group: SkillGroup;
  size: SkillSize;
  icon: string | Glyph;
  /** Optional extra line (e.g. the AWS services). */
  detail?: string;
}
export type SkillGroup = 'Languages' | 'Frontend' | 'Backend' | 'Cloud' | 'Testing';

const hexes = (pts: Array<[number, number]>, r: number) =>
  pts
    .map(([cx, cy]) =>
      Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 3) * i + Math.PI / 6;
        return `${i ? 'L' : 'M'}${(cx + Math.cos(a) * r).toFixed(2)} ${(cy + Math.sin(a) * r).toFixed(2)}`;
      }).join(' ') + 'Z',
    )
    .join(' ');

export const GLYPHS = {
  aws: { d: 'M4 16.4c4.5 2.9 11.2 2.9 15.8-.2 M17.3 14.9l2.6 1.2-2.2 1.8', color: '#FF9900', text: 'aws' },
  sql: { d: 'M4.5 6c0-1.66 3.36-3 7.5-3s7.5 1.34 7.5 3-3.36 3-7.5 3-7.5-1.34-7.5-3Z M4.5 6v12c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3V6 M4.5 12c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3', color: '#4479A1' },
  rest: { d: 'M8.5 3.5c-2 0-3 1-3 3v2.6c0 1.5-.9 2.4-2.5 2.9 1.6.5 2.5 1.4 2.5 2.9v2.6c0 2 1 3 3 3 M15.5 3.5c2 0 3 1 3 3v2.6c0 1.5.9 2.4 2.5 2.9-1.6.5-2.5 1.4-2.5 2.9v2.6c0 2-1 3-3 3 M10 12h.01 M14 12h.01', color: '#C8553D' },
  microservices: { d: hexes([[7.2, 8], [16.8, 8], [12, 16.4]], 4.4), color: '#6E8B5E' },
  zustand: { d: 'M12 20.5c-4.4 0-7.5-2.9-7.5-6.9S7.6 6.5 12 6.5s7.5 3.1 7.5 7.1-3.1 6.9-7.5 6.9Z M6.6 8.4a2.6 2.6 0 1 1 3.3-1.6 M17.4 8.4a2.6 2.6 0 1 0-3.3-1.6 M9.2 12.6h.01 M14.8 12.6h.01 M10.6 15.4c.8.7 2 .7 2.8 0', color: '#7A5C44' },
  cicd: { d: 'M12 12c-2-2.6-3.6-4-5.5-4a4 4 0 0 0 0 8c1.9 0 3.5-1.4 5.5-4s3.6-4 5.5-4a4 4 0 0 1 0 8c-1.9 0-3.5-1.4-5.5-4Z M18.8 5.6l-1.3 2.4 2.6.6', color: '#2088FF' },
  tdd: { d: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M7.8 12.4l2.9 2.9 5.6-6', color: '#22A06B' },
} satisfies Record<string, Glyph>;

export const skills: Skill[] = [
  // Languages
  { name: 'TypeScript', group: 'Languages', size: 'L', icon: 'typescript' },
  { name: 'JavaScript', group: 'Languages', size: 'M', icon: 'javascript' },
  { name: 'Python', group: 'Languages', size: 'S', icon: 'python' },
  { name: 'SQL', group: 'Languages', size: 'S', icon: GLYPHS.sql },
  { name: 'HTML5', group: 'Languages', size: 'S', icon: 'html5' },
  { name: 'CSS3', group: 'Languages', size: 'S', icon: 'css' },
  { name: 'SASS', group: 'Languages', size: 'S', icon: 'sass' },
  // Frontend
  { name: 'React 19', group: 'Frontend', size: 'L', icon: 'react' },
  { name: 'Next.js', group: 'Frontend', size: 'L', icon: 'nextdotjs' },
  { name: 'Redux Toolkit', group: 'Frontend', size: 'M', icon: 'redux' },
  { name: 'Zustand', group: 'Frontend', size: 'S', icon: GLYPHS.zustand },
  { name: 'React Query', group: 'Frontend', size: 'M', icon: 'reactquery' },
  { name: 'Tailwind CSS', group: 'Frontend', size: 'M', icon: 'tailwindcss' },
  { name: 'styled-components', group: 'Frontend', size: 'S', icon: 'styledcomponents' },
  // Backend
  { name: 'Node.js', group: 'Backend', size: 'L', icon: 'nodedotjs' },
  { name: 'NestJS', group: 'Backend', size: 'L', icon: 'nestjs' },
  { name: 'Express', group: 'Backend', size: 'M', icon: 'express' },
  { name: 'REST', group: 'Backend', size: 'S', icon: GLYPHS.rest },
  { name: 'GraphQL', group: 'Backend', size: 'M', icon: 'graphql' },
  { name: 'PostgreSQL', group: 'Backend', size: 'L', icon: 'postgresql' },
  { name: 'Prisma', group: 'Backend', size: 'M', icon: 'prisma' },
  { name: 'Drizzle', group: 'Backend', size: 'S', icon: 'drizzle' },
  { name: 'MongoDB', group: 'Backend', size: 'M', icon: 'mongodb' },
  { name: 'Redis', group: 'Backend', size: 'M', icon: 'redis' },
  { name: 'NATS JetStream', group: 'Backend', size: 'M', icon: 'natsdotio' },
  { name: 'Microservices', group: 'Backend', size: 'S', icon: GLYPHS.microservices },
  // Cloud
  {
    name: 'AWS', group: 'Cloud', size: 'M', icon: GLYPHS.aws,
    detail: 'S3, CloudFront, ECS Fargate, Lambda, Cognito, Aurora, DynamoDB, SQS, SNS, EventBridge',
  },
  { name: 'Docker', group: 'Cloud', size: 'M', icon: 'docker' },
  { name: 'CI/CD', group: 'Cloud', size: 'S', icon: GLYPHS.cicd },
  // Testing
  { name: 'Jest', group: 'Testing', size: 'M', icon: 'jest' },
  { name: 'Cypress', group: 'Testing', size: 'M', icon: 'cypress' },
  { name: 'TDD', group: 'Testing', size: 'S', icon: GLYPHS.tdd },
];

export const SKILL_GROUPS: SkillGroup[] = ['Frontend', 'Backend', 'Languages', 'Cloud', 'Testing'];

/** Skills shown as stickers on the Skills door (atlas cells of the badge atlas). */
export const DOOR_BADGES = [
  'TypeScript', 'React 19', 'Next.js', 'Node.js', 'NestJS', 'PostgreSQL', 'GraphQL', 'Redis',
  'Docker', 'AWS', 'Tailwind CSS', 'Prisma', 'MongoDB', 'Jest', 'Cypress', 'JavaScript',
];

/** Atlas grids (cells per side). Keep in sync with build-assets.mjs. */
export const BALLOON_GRID = 6;
export const BADGE_GRID = 4;
