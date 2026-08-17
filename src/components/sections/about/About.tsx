import Section from "@/components/ui/Section";
import Reveal from "@/components/ui/Reveal.client";
import { profile } from "@/content/profile";
import { education } from "@/content/education";

const quickFacts = [
  { label: "Location", value: profile.location.split(" · ")[0] },
  { label: "Remote since", value: "2025" },
  {
    label: "Education",
    value: `${education[0].credential} — ${education[0].institution}`,
  },
  {
    label: "Focus areas",
    value: "Frontend architecture · Next.js · AI agent orchestration",
  },
];

export default function About() {
  return (
    <Section id="about">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[8fr_4fr] lg:gap-16">
        <Reveal>
          <h2 className="max-w-[22ch] text-4xl font-semibold leading-[1.08] tracking-tighter text-zinc-50 md:text-5xl">
            Engineering interfaces for systems where failure isn&rsquo;t an
            option.
          </h2>
          <p className="mt-8 max-w-[62ch] text-base leading-relaxed text-zinc-400 sm:text-lg">
            Three-plus years of production frontend across SaaS, ERP, and
            enterprise platforms — from facility-management systems in Cairo to
            a police-academy LMS and crime-and-legal case management deployed at
            national scale in Iraq.
          </p>
          <p className="mt-5 max-w-[62ch] text-base leading-relaxed text-zinc-400 sm:text-lg">
            That discipline now extends to AI-agentic workflows: I orchestrate
            multi-agent pipelines that plan, build, review, and ship entire
            projects — held to the same standards as any system I would deploy
            myself.
          </p>
        </Reveal>
        <Reveal className="lg:border-l lg:border-zinc-800 lg:pl-10">
          <dl className="space-y-6">
            {quickFacts.map((fact) => (
              <div key={fact.label}>
                <dt className="font-mono text-xs uppercase tracking-widest text-zinc-500">
                  {fact.label}
                </dt>
                <dd className="mt-1.5 text-sm text-zinc-200">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </Section>
  );
}
