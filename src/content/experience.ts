export type ExperienceItem = {
  company: string;
  location: string;
  role: string;
  period: string;
  stack: string[];
  highlights: string[];
};

export const experience: ExperienceItem[] = [
  {
    company: "Global Dynamics",
    location: "Turkey, Remote",
    role: "Full-Stack Engineer",
    period: "Jun 2025 – May 2026",
    stack: [
      "React 19",
      "Next.js 16",
      "TypeScript",
      "Zustand",
      "React Query",
      "Tailwind CSS",
      "Node.js",
      "NestJS",
      "Docker",
    ],
    highlights: [
      "Leading frontend for national-scale systems in Iraq",
      "Police Academy LMS — student-instructor chat, academic statistics, secure multi-level access",
      "Training Center Management System — nationwide, with performance dashboards",
      "Crime & Legal Center — high-security case management, 1M+ potential users",
      "Performance via code-splitting, caching, memoization",
    ],
  },
  {
    company: "Forever Events",
    location: "Dubai, Remote",
    role: "Frontend Engineer",
    period: "Sep 2025 – Mar 2026",
    stack: [
      "Next.js 15",
      "React 19",
      "TypeScript",
      "Tailwind CSS",
      "Headless CMS",
      "SEO",
    ],
    highlights: [
      "E-commerce and corporate sites with CMS + CRM integrations",
      "Diaflower — gifting and flower e-commerce with full CMS control",
      "Advanced SEO → top rankings for business keywords",
      "Reusable accessible component library",
    ],
  },
  {
    company: "Grwan Group",
    location: "Dubai, Remote",
    role: "Frontend Engineer",
    period: "Mar 2025 – Nov 2025",
    stack: ["React 19", "Next.js 15", "TypeScript", "React Query", "Tailwind CSS"],
    highlights: [
      "LeanGo platform suite for enterprise operations",
      "Inspection — facility management workflows",
      "WMS — warehouse management, role-based access, reporting",
      "E&T — enterprise social network for skills tracking",
    ],
  },
  {
    company: "ASDC",
    location: "Cairo (formerly RASID)",
    role: "Frontend Engineer",
    period: "Oct 2023 – Mar 2025",
    stack: [
      "React",
      "TypeScript",
      "Redux Toolkit",
      "styled-components",
      "Tailwind CSS",
    ],
    highlights: [
      "Facility Management System for hotels and malls",
      "ERP modules — staff, shifts, payrolls, financial reporting",
      "Reusable hooks + modular architecture",
      "Data visualization for KPIs and workforce analytics",
    ],
  },
];
