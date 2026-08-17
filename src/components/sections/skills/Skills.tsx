import Section from "@/components/ui/Section";
import Chip from "@/components/ui/Chip";
import Reveal from "@/components/ui/Reveal.client";
import { skills } from "@/content/skills";
import { cn } from "@/lib/cn";

export default function Skills() {
  return (
    <Section id="skills">
      <Reveal>
        <div>
          {skills.map((group, i) => (
            <div
              key={group.group}
              className={cn(
                "grid grid-cols-1 gap-4 lg:grid-cols-[3fr_9fr] lg:gap-10",
                i === 0 ? "pt-0" : "mt-10 border-t border-zinc-900 pt-10",
              )}
            >
              <h3 className="font-mono text-xs uppercase tracking-widest text-zinc-500 lg:pt-2">
                {group.group}
              </h3>
              <div className="flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <Chip key={item} label={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </Section>
  );
}
