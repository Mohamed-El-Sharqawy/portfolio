/**
 * Single-entry content (About + Contact). The repeating content
 * (projects, experience, education, FAQ) lives in Content Collections.
 */
export const SITE_URL = 'https://portfolio.winningkart.tech';

export const profile = {
  name: 'Mohamed Ahmed',
  title: 'Full-Stack Engineer',
  location: 'Dubai, UAE',
  availability: 'Available immediately',
  bio: 'Full-Stack Engineer with 4+ years of experience shipping production products — React and TypeScript frontends, Node.js and NestJS backends — for SaaS, ERP, and government platforms built for 1M+ potential users. I build production UI from Figma designs and REST/GraphQL APIs with Redis and NATS, tested with Jest, Cypress and TDD.',
  email: 'dev.elsharqawy@gmail.com',
  links: {
    github: 'https://github.com/Mohamed-El-Sharqawy',
    linkedin: 'https://linkedin.com/in/mohamed-ahmed-elsharqawy',
  },
  toolkit: [
    {
      group: 'Languages',
      items: ['TypeScript', 'JavaScript', 'Python', 'SQL', 'HTML5', 'CSS3', 'SASS'],
    },
    {
      group: 'Backend',
      items: [
        'Node.js', 'NestJS', 'Express', 'REST', 'GraphQL', 'PostgreSQL', 'Prisma',
        'Drizzle', 'MongoDB', 'Redis', 'NATS JetStream', 'Microservices',
      ],
    },
    {
      group: 'Frontend',
      items: [
        'React 19', 'Next.js', 'Redux Toolkit', 'Zustand', 'React Query',
        'Tailwind CSS', 'styled-components',
      ],
    },
    {
      group: 'Cloud',
      items: [
        'AWS (S3, CloudFront, ECS Fargate, Lambda, Cognito, Aurora, DynamoDB, SQS, SNS, EventBridge)',
        'Docker', 'CI/CD',
      ],
    },
    { group: 'Testing', items: ['Jest', 'Cypress', 'TDD'] },
  ],
  languages: [
    { name: 'Arabic', level: 'Native' },
    { name: 'English', level: 'Fluent' },
  ],
  contactHeadline: "Let's build something together.",
} as const;

export const seo = {
  title: 'Mohamed Ahmed – Full-Stack Engineer | Interactive Portfolio',
  description:
    'Interactive 3D portfolio of Mohamed Ahmed, a Dubai-based Full-Stack Engineer specializing in React, Next.js, Node.js and NestJS.',
  themeColor: '#fafafa',
  ogImage: '/og.png',
} as const;

/** Door order along the corridor. Shared by the HTML nav and the 3D scene. */
export const doors = [
  { id: 'projects', label: 'Projects' },
  { id: 'skills', label: 'Skills' },
  { id: 'experience', label: 'Experience' },
  { id: 'education', label: 'Education' },
  { id: 'contact', label: 'Contact' },
] as const;
export type DoorId = (typeof doors)[number]['id'];
