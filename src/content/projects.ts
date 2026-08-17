export type ProjectCategory = "Enterprise" | "E-commerce" | "Platform";

export type Project = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  stack: string[];
  impact: string;
  category: ProjectCategory;
};

export const projects: Project[] = [
  {
    id: "leango-inspection",
    name: "LeanGo Inspection",
    tagline: "Facility management inspections at enterprise scale",
    description:
      "Digital inspection workflows for facility management — scheduling, site walkthroughs, defect capture, and reporting across large property portfolios.",
    stack: ["React 19", "Next.js 15", "TypeScript", "React Query", "Tailwind CSS"],
    impact: "Inspection operations unified across the facility portfolio",
    category: "Platform",
  },
  {
    id: "leango-wms",
    name: "LeanGo WMS",
    tagline: "Warehouse management with role-based access and reporting",
    description:
      "Warehouse management covering inventory, stock movement, and operations reporting, with granular role-based access for warehouse and management users.",
    stack: ["React 19", "Next.js 15", "TypeScript", "React Query", "Tailwind CSS"],
    impact: "Warehouse operations running nationwide on one platform",
    category: "Platform",
  },
  {
    id: "leango-et",
    name: "LeanGo E&T",
    tagline: "Enterprise social network for skills tracking",
    description:
      "An enterprise social network where employees build profiles, track skill growth, and connect across the organization's training ecosystem.",
    stack: ["React 19", "Next.js 15", "TypeScript", "React Query", "Tailwind CSS"],
    impact: "Skills visibility across the whole organization",
    category: "Platform",
  },
  {
    id: "police-academy-lms",
    name: "Police Academy LMS",
    tagline: "Learning management for a national police academy",
    description:
      "Full LMS with student-instructor chat, academic statistics dashboards, and secure multi-level access for a national-scale academy.",
    stack: [
      "React 19",
      "Next.js 16",
      "TypeScript",
      "Zustand",
      "React Query",
      "Tailwind CSS",
      "NestJS",
    ],
    impact: "National-scale academy operations",
    category: "Enterprise",
  },
  {
    id: "crime-legal-center",
    name: "Crime & Legal Center",
    tagline: "High-security case management platform",
    description:
      "High-security case management for crime and legal records, built for strict access control, auditability, and heavy concurrent use.",
    stack: ["React 19", "Next.js 16", "TypeScript", "NestJS", "Docker"],
    impact: "1M+ potential users",
    category: "Enterprise",
  },
  {
    id: "diaflower",
    name: "Diaflower",
    tagline: "Gifting and flower e-commerce, fully CMS-driven",
    description:
      "E-commerce experience for gifting and flowers with full CMS control over catalog and content, CRM integration, and advanced SEO.",
    stack: ["Next.js 15", "React 19", "TypeScript", "Tailwind CSS", "Headless CMS"],
    impact: "Top rankings for core business keywords",
    category: "E-commerce",
  },
];
