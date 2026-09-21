export type Profile = {
  name: string;
  role: string;
  tagline: string;
  location: string;
  email: string;
  phone: string;
  phoneEgypt: string;
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
  location: "Dubai, UAE · Open to remote",
  email: "dev.elsharqawy@gmail.com",
  phone: "+971 5088808693",
  phoneEgypt: "+20 1021141193",
  linkedin: "https://linkedin.com/in/mohamed-elsharqawi",
  github: "https://github.com/Mohamed-El-Sharqawy",
  cvUrl: "/Mohamed_Ahmed_CV_Full_Stack_UAE.pdf",
};

export const heroProof: HeroProof[] = [
  { value: "3+", label: "Years production frontend" },
  { value: "1M+", label: "Users reached by systems I helped ship" },
  { value: "6 · 4", label: "Companies · countries served" },
  { value: "15+", label: "Systems shipped with my teams" },
];
