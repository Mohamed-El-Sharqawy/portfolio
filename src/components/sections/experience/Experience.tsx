import Section from "@/components/ui/Section";
import Reveal from "@/components/ui/Reveal.client";
import ExperienceTimeline from "./ExperienceTimeline.client";
import { experience } from "@/content/experience";

export default function Experience() {
  return (
    <Section id="experience">
      <p className="font-mono text-xs tracking-wide text-zinc-500">
        Experience — 2023 → now
      </p>
      <Reveal className="relative mt-10">
        <div
          data-scene="helix"
          data-mobile="off"
          aria-hidden
          className="absolute -left-20 top-0 hidden h-full w-40 md:block"
        />
        <ExperienceTimeline items={experience} />
      </Reveal>
    </Section>
  );
}
