import Section from "@/components/ui/Section";
import { profile } from "@/content/profile";

const links = [
  { label: "LinkedIn", href: profile.linkedin },
  { label: "GitHub", href: profile.github },
  { label: "CV (PDF)", href: profile.cvUrl },
];

export default function Contact() {
  return (
    <Section
      id="contact"
      className="flex min-h-[70dvh] flex-col items-center justify-center text-center"
    >
      <h2 className="text-4xl font-semibold tracking-tighter text-zinc-50 md:text-6xl">
        Let&rsquo;s build something that ships.
      </h2>
      <p className="mt-6 max-w-[52ch] text-balance text-base text-zinc-400 sm:text-lg">
        Open to senior frontend and AI-agentic engineering roles — remote or
        Cairo.
      </p>
      <a
        href={`mailto:${profile.email}`}
        className="mt-12 break-all font-mono text-2xl text-emerald-400 transition-colors hover:text-emerald-300 md:text-4xl"
      >
        {profile.email}
      </a>
      <p className="mt-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-mono text-xs text-zinc-400">
        {links.map((link, index) => (
          <span key={link.label} className="flex items-center gap-x-4">
            {index > 0 ? (
              <span aria-hidden className="text-zinc-600">
                ·
              </span>
            ) : null}
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-emerald-300"
            >
              {link.label}
            </a>
          </span>
        ))}
      </p>
    </Section>
  );
}
