import Section from "@/components/ui/Section";
import Chip from "@/components/ui/Chip";
import ChipStagger from "@/components/ui/ChipStagger.client";
import Reveal from "@/components/ui/Reveal.client";
import ParallaxIndex from "./ParallaxIndex.client";
import WorkRow from "./WorkRow.client";
import { projects } from "@/content/projects";

const MAX_CHIPS = 5;

export default function Work() {
  return (
    <Section id="work">
      <Reveal className="relative">
        <div
          data-scene="particles"
          data-mobile="off"
          aria-hidden
          className="absolute -top-4 right-0 hidden h-[200px] w-[200px] lg:block"
        />
        <h2 className="text-4xl tracking-tighter md:text-5xl">
          Selected work
        </h2>
        <p className="mt-4 max-w-[60ch] text-zinc-500">
          National-scale systems shipped for teams across Egypt, Dubai, Turkey
          and Iraq.
        </p>
      </Reveal>
      <div className="mt-16">
        {projects.map((project, index) => {
          const isLast = index === projects.length - 1;
          return (
            <WorkRow
              key={project.id}
              index={index}
              project={project}
              isLast={isLast}
            />
          );
        })}
      </div>
    </Section>
  );
}
