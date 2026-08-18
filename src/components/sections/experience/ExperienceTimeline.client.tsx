"use client";

import Chip from "@/components/ui/Chip";
import { gsap, useScrollFx } from "@/hooks/useScrollFx";
import { prefersReducedMotion } from "@/lib/motion";
import type { ExperienceItem } from "@/content/experience";
import { cn } from "@/lib/cn";

const MAX_HIGHLIGHTS = 3;

type ExperienceTimelineProps = {
  items: ExperienceItem[];
};

export default function ExperienceTimeline({ items }: ExperienceTimelineProps) {
  const ref = useScrollFx<HTMLDivElement>((root) => {
    if (prefersReducedMotion()) return;
    const fill = root.querySelector<HTMLElement>("[data-rail-fill]");
    if (fill) {
      gsap.fromTo(
        fill,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: {
            trigger: root,
            start: "top 78%",
            end: "bottom 55%",
            scrub: 0.5,
            invalidateOnRefresh: true,
          },
        },
      );
    }
    root.querySelectorAll<HTMLElement>("[data-dot]").forEach((dot) => {
      gsap.from(dot, {
        scale: 0,
        duration: 0.5,
        ease: "back.out(1.7)",
        scrollTrigger: { trigger: dot, start: "top 80%" },
      });
    });
  });

  return (
    <div ref={ref} className="relative">
      <div
        aria-hidden
        className="absolute inset-y-2 left-0 w-px bg-zinc-800"
      />
      <div
        data-rail-fill
        aria-hidden
        className="absolute inset-y-2 left-0 w-px origin-top bg-emerald-500"
      />
      <ol>
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li
              key={`${item.company}-${item.period}`}
              className={cn(
                "relative py-10 pl-8 first:pt-4 md:pl-14",
                !isLast && "border-b border-zinc-900",
              )}
            >
              <span
                data-dot
                aria-hidden
                className={cn(
                  "absolute left-[-3.5px] h-2 w-2 rounded-full bg-emerald-400 ring-4 ring-zinc-950",
                  i === 0 ? "top-[26px]" : "top-[54px]",
                )}
              />
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <h3 className="text-xl font-medium text-zinc-50">
                  {item.role}
                </h3>
                <span className="font-mono text-sm text-emerald-500">
                  {item.company}
                </span>
              </div>
              <p className="mt-2 font-mono text-xs text-zinc-500">
                {item.period} · {item.location}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {item.stack.map((tech) => (
                  <Chip key={tech} label={tech} />
                ))}
              </div>
              <ul className="mt-5 space-y-2">
                {item.highlights.slice(0, MAX_HIGHLIGHTS).map((line) => (
                  <li
                    key={line}
                    className="relative pl-4 text-sm leading-relaxed text-zinc-400 before:absolute before:left-0 before:top-[0.6em] before:h-1 before:w-1 before:rounded-full before:bg-emerald-500"
                  >
                    {line}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
