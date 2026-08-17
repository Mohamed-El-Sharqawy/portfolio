export type SkillGroup = {
  group: string;
  items: string[];
};

export const skills: SkillGroup[] = [
  {
    group: "Core Frontend",
    items: [
      "React",
      "Next.js",
      "TypeScript",
      "JavaScript",
      "Tailwind CSS",
      "SASS",
      "GSAP",
      "Three.js",
    ],
  },
  {
    group: "Backend & APIs",
    items: [
      "Node.js",
      "Express",
      "NestJS",
      "Fastify",
      "REST",
      "GraphQL",
      "MongoDB",
    ],
  },
  {
    group: "Architecture & Infra",
    items: [
      "System Design",
      "SSR/SSG/ISR",
      "Docker",
      "CI/CD",
      "Coolify",
      "Testing",
      "Agile",
    ],
  },
];
