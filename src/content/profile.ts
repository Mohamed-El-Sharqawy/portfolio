export type Profile = {
  name: string;
  role: string;
  tagline: string;
  location: string;
  email: string;
  linkedin: string;
  github: string;
  cvUrl: string;
};

export type HeroProof = {
  value: string;
  label: string;
};

export const profile: Profile = {
  name: "Mohamed Ahmed",
  role: "Frontend Engineer & AI Agentic Systems",
  tagline: "Frontend engineer building systems that ship themselves.",
  location: "Cairo, Egypt · Remote",
  email: "dev.elbehery@gmail.com",
  linkedin: "https://linkedin.com/in/mohamed-elsharqawi",
  github: "https://github.com/Mohamed-El-Sharqawy",
  cvUrl: "/mohamed-ahmed-cv.pdf",
};

export const heroProof: HeroProof[] = [
  { value: "3+", label: "Years production frontend" },
  { value: "1M+", label: "Users reached by systems I helped ship" },
  { value: "6 · 4", label: "Companies · countries served" },
  { value: "15+", label: "Systems shipped with my teams" },
];
