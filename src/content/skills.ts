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
    ],
  },
  {
    group: "Backend & APIs",
    items: [
      { name: "Node.js", icon: "nodedotjs" },
      { name: "Express", icon: "express" },
      { name: "NestJS", icon: "nestjs" },
      { name: "Fastify", icon: "fastify" },
      { name: "REST", icon: null },
      { name: "GraphQL", icon: "graphql" },
      { name: "MongoDB", icon: "mongodb" },
    ],
  },
  {
    group: "Architecture & Infra",
    items: [
      { name: "System Design", icon: null },
      { name: "SSR/SSG/ISR", icon: null },
      { name: "Docker", icon: "docker" },
      { name: "CI/CD", icon: null },
      { name: "Coolify", icon: null },
      { name: "Testing", icon: null },
      { name: "Agile", icon: null },
    ],
  },
];
