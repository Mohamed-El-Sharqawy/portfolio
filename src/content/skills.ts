export type Skill = {
  name: string;
  icon: string | null;
};

export type SkillGroup = {
  group: string;
  items: Skill[];
};

export const skills: SkillGroup[] = [
  {
    group: "Core Frontend",
    items: [
      { name: "React", icon: "react" },
      { name: "Next.js", icon: "nextdotjs" },
      { name: "TypeScript", icon: "typescript" },
      { name: "JavaScript", icon: "javascript" },
      { name: "Tailwind CSS", icon: "tailwindcss" },
      { name: "SASS", icon: "sass" },
      { name: "GSAP", icon: "gsap" },
      { name: "Three.js", icon: "threedotjs" },
      { name: "Cypress", icon: "cypress" },
      { name: "RTL Testing", icon: null },
      { name: "Turborepo", icon: "turborepo" },
    ],
  },
  {
    group: "Backend & APIs",
    items: [
      { name: "Node.js", icon: "nodedotjs" },
      { name: "Express", icon: "express" },
      { name: "NestJS", icon: "nestjs" },
      { name: "Fastify", icon: "fastify" },
      { name: "Hono", icon: "hono" },
      { name: "Elysia", icon: null },
      { name: "Bun", icon: "bun" },
      { name: "REST", icon: null },
      { name: "GraphQL", icon: "graphql" },
      { name: "PostgreSQL", icon: "postgresql" },
      { name: "MySQL", icon: "mysql" },
      { name: "MongoDB", icon: "mongodb" },
      { name: "Redis", icon: "redis" },
      { name: "NATS", icon: null },
    ],
  },
  {
    group: "Architecture & Infra",
    items: [
      { name: "System Design", icon: null },
      { name: "SSR/SSG/ISR", icon: null },
      { name: "Docker", icon: "docker" },
      { name: "ECS", icon: null },
      { name: "S3", icon: null },
      { name: "MinIO", icon: "minio" },
      { name: "CI/CD", icon: null },
      { name: "Deployment", icon: null },
      { name: "Coolify", icon: null },
      { name: "Testing", icon: null },
      { name: "Agile", icon: null },
    ],
  },
];
