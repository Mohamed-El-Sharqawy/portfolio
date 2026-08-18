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
      "Leading frontend alongside the team on national-scale systems in Iraq",
      "Police Academy LMS — built chat, statistics dashboards, and secure multi-level access with the team",
      "Training Center Management System — helped deliver the nationwide platform and its dashboards",
      "Crime & Legal Center — cooperated on high-security case management, 1M+ potential users",
      "Improved performance via code-splitting, caching, memoization",
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
      "Built and optimized e-commerce and corporate sites with CMS + CRM integrations",
      "Diaflower — built the gifting and flower e-commerce platform with full CMS control",
      "Advanced SEO → helped clients reach top rankings for business keywords",
      "Reusable accessible component library — authored and shared across projects",
    ],
  },
  {
    company: "Grwan Group",
    location: "Dubai, Remote",
    role: "Frontend Engineer",
    period: "Mar 2025 – Nov 2025",
    stack: ["React 19", "Next.js 15", "TypeScript", "React Query", "Tailwind CSS"],
    highlights: [
      "Helped build the LeanGo platform suite for enterprise operations",
      "Inspection — built facility-management workflows",
      "WMS — built warehouse management views with role-based access and reporting",
      "E&T — contributed to the enterprise social network for skills tracking",
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
      "Built the Facility Management System interface for hotels and malls",
      "ERP modules — helped deliver staff, shifts, payrolls, and financial reporting",
      "Authored reusable hooks + modular architecture the team built on",
      "Data visualization for KPIs and workforce analytics",
    ],
  },
];
