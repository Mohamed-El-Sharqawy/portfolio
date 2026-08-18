import Section from "@/components/ui/Section";
import Reveal from "@/components/ui/Reveal.client";
import AgenticPipeline from "./AgenticPipeline.client";
import TiltCard from "./TiltCard.client";

type MiniColumn = {
  label: string;
  lines: string[];
};

const miniColumns: MiniColumn[] = [
  {
    label: "Why agents",
    lines: [
      "Agents compress the boring 80% of delivery.",
      "Humans review decisions, not formatting.",
    ],
  },
  {
    label: "What I build with",
    lines: [
      "Multi-agent orchestration frameworks, GitHub CLI, MCP tooling.",
      "PR-gated workflows with review-first automation.",
    ],
  },
  {
    label: "Results",
    lines: [
      "Milestones shipped as reviewed PRs.",
      "Human-owned merges, zero-drift docs.",
    ],
  },
];

export default function Agentic() {
  return (
    <Section id="agentic">
      <Reveal>
        <h2 className="max-w-3xl text-4xl tracking-tighter md:text-5xl">
          AI agents, orchestrated like a team
        </h2>
        <p className="mt-4 max-w-[60ch] text-zinc-500">
          I design multi-agent workflows where planner, builder, reviewer and
          deployer agents pass work through pull requests — the portfolio
          you&apos;re reading was shipped this way.
        </p>
      </Reveal>
      <div className="relative mx-auto mt-16 max-w-3xl [perspective:900px]">
        <div
          aria-hidden
          className="absolute -inset-8 -z-10 rounded-[32px] bg-emerald-500/5 blur-3xl"
        />
        <TiltCard>
          <AgenticPipeline />
        </TiltCard>
      </div>
      <Reveal>
        <div className="mt-16 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
          {miniColumns.map((column, index) => (
            <div
              key={column.label}
              className={
                index > 0 ? "md:border-l md:border-zinc-800 md:pl-6" : undefined
              }
            >
              <p className="font-mono text-xs text-zinc-500">
                {column.label}
              </p>
              <div className="mt-3 space-y-1">
                {column.lines.map((line) => (
                  <p key={line} className="text-sm text-zinc-400">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </Section>
  );
}
