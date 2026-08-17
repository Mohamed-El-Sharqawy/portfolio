import dynamic from "next/dynamic";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal.client";
import { heroProof, profile } from "@/content/profile";
import { cn } from "@/lib/cn";

const HeroCanvas = dynamic(() => import("./HeroCanvas.client"));

export default function Hero() {
  return (
    <section
      id="top"
      className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-12 px-6 pb-20 pt-28 md:px-10 lg:min-h-[100dvh] lg:grid-cols-[7fr_5fr] lg:gap-16 lg:pb-24 lg:pt-24"
    >
      <div className="flex flex-col justify-center">
        <Reveal>
          <p className="font-mono text-xs tracking-wide text-zinc-500">
            {profile.name} — Cairo · Remote
          </p>
          <h1 className="mt-6 text-4xl font-semibold leading-[1.08] tracking-tighter text-zinc-50 sm:text-[40px] lg:text-[34px] xl:text-[42px]">
            Frontend engineer building{" "}
            <span className="lg:block">
              systems that{" "}
              <em className="italic text-emerald-400">ship themselves.</em>
            </span>
          </h1>
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
          <div className="mt-14 border-t border-zinc-800 pt-5">
            <div className="flex flex-wrap gap-y-4">
              {heroProof.map((stat, i) => (
                <div
                  key={stat.label}
                  className={cn(
                    i < heroProof.length - 1 &&
                      "mr-10 border-r border-zinc-800 pr-10",
                  )}
                >
                  <p className="font-mono text-xl text-emerald-400 sm:text-2xl">
                    {stat.value}
                  </p>
                  <p className="mt-1 font-mono text-xs text-zinc-500">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
      <div className="lg:h-full">
        <HeroCanvas />
      </div>
    </section>
  );
}
