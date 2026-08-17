import Section from "@/components/ui/Section";
import Chip from "@/components/ui/Chip";
import Reveal from "@/components/ui/Reveal.client";
import { experience } from "@/content/experience";
import { cn } from "@/lib/cn";

const MAX_HIGHLIGHTS = 3;

export default function Experience() {
  return (
    <Section id="experience">
      <p className="font-mono text-xs tracking-wide text-zinc-500">
        Experience — 2023 → now
      </p>
      <Reveal className="relative mt-10">
        <div
          aria-hidden
          className="absolute inset-y-2 left-0 w-px bg-zinc-800"
        />
        <ol>
          {experience.map((item, i) => {
            const isLast = i === experience.length - 1;
            return (
              <li
                key={`${item.company}-${item.period}`}
                className={cn(
                  "relative py-10 pl-10 first:pt-4",
                  !isLast && "border-b border-zinc-900",
                )}
              >
                <span
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
      </Reveal>
    </Section>
  );
}
