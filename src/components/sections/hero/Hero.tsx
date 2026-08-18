import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal.client";
import Counter from "./Counter.client";
import WordReveal from "./WordReveal.client";
import type { WordRevealLine } from "./WordReveal.client";
import { heroProof, profile } from "@/content/profile";
import { cn } from "@/lib/cn";

const headline: WordRevealLine[] = [
  [{ text: "Frontend" }, { text: "engineer" }, { text: "building" }],
  [
    { text: "systems" },
    { text: "that" },
    { text: "ship themselves.", accent: true },
  ],
];

export default function Hero() {
  return (
    <section
      id="top"
      className="relative mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-12 px-6 pb-20 pt-28 md:px-10 lg:min-h-[100dvh] lg:grid-cols-[7fr_5fr] lg:gap-16 lg:pb-24 lg:pt-24"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-1/2 z-0 w-screen -translate-x-1/2"
      >
        <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(#27272a_1px,transparent_1px),linear-gradient(90deg,#27272a_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_80%_70%_at_70%_45%,black_20%,transparent_75%)]" />
        <div className="hero-scanline" />
      </div>
      <div className="relative z-10 flex flex-col justify-center">
        <Reveal y={12}>
          <p className="font-mono text-xs tracking-wide text-zinc-500">
            {profile.name} — Cairo · Remote
          </p>
        </Reveal>
        <WordReveal
          className="mt-6 text-4xl font-semibold leading-[1.08] tracking-tighter text-zinc-50 sm:text-[40px] lg:text-[34px] xl:text-[42px]"
          lines={headline}
        />
        <Reveal delay={0.25}>
          <p className="mt-6 max-w-[52ch] text-base leading-relaxed text-zinc-400 sm:text-lg">
            3+ years across SaaS, ERP dashboards, and national-scale systems —
            now orchestrating AI agent teams that build entire projects.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Button variant="primary" href="#contact">
              Get in touch
            </Button>
            <Button variant="ghost" href="#work">
              View work ↓
            </Button>
          </div>
        </Reveal>
        <Reveal delay={0.4}>
          <div className="mt-14 border-t border-zinc-800 pt-5">
            <div className="grid grid-cols-2 gap-y-4 lg:grid-cols-4">
              {heroProof.map((stat, i) => {
                const divider =
                  i === 1
                    ? "border-l border-zinc-800 pl-6 lg:pl-8"
                    : i === 2
                      ? "lg:border-l lg:border-zinc-800 lg:pl-8"
                      : i === 3
                        ? "border-l border-zinc-800 pl-6 lg:pl-8"
                        : "";
                const trailing =
                  i === 0 || i === 2 ? "pr-6 lg:pr-8" : i === 1 ? "lg:pr-8" : "";
                return (
                  <div
                    key={stat.label}
                    className={cn(divider, trailing)}
                  >
                    <p className="font-mono text-xl text-emerald-400 sm:text-2xl">
                      <Counter value={stat.value} />
                    </p>
                    <p className="mt-1 font-mono text-xs text-zinc-500">
                      {stat.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>
      </div>
      <div className="relative z-10 lg:h-full">
        <div
          data-scene="knot"
          data-interactive
          aria-hidden
          className="h-full min-h-[max(420px,52vh)] w-full cursor-grab touch-pan-y active:cursor-grabbing"
        />
      </div>
    </section>
  );
}
