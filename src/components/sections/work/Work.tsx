import Section from "@/components/ui/Section";
import Chip from "@/components/ui/Chip";
import { projects } from "@/content/projects";

const MAX_CHIPS = 5;

export default function Work() {
  return (
    <Section id="work">
      <h2 className="text-4xl tracking-tighter md:text-5xl">Selected work</h2>
      <p className="mt-4 max-w-[60ch] text-zinc-500">
        National-scale systems shipped for teams across Egypt, Dubai, Turkey and
        Iraq.
      </p>
      <div className="mt-16">
        {projects.map((project, index) => {
          const visibleStack = project.stack.slice(0, MAX_CHIPS);
          const overflowCount = project.stack.length - visibleStack.length;
          const isLast = index === projects.length - 1;
          return (
            <a
              key={project.id}
              href="#contact"
              className={`group relative block border-t border-zinc-800 py-10${
                isLast ? " border-b" : ""
              }`}
            >
              <span
                aria-hidden
                className="absolute right-0 top-10 hidden font-mono text-lg text-emerald-400 opacity-0 transition-opacity duration-300 group-hover:opacity-100 md:block"
              >
                →
              </span>
              <div className="grid grid-cols-1 lg:grid-cols-[4fr_8fr] lg:gap-16">
                <div>
                  <p className="font-mono text-xs text-emerald-600">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight transition-colors group-hover:text-emerald-400">
                    {project.name}
                  </h3>
                  <p className="mt-2 font-mono text-xs text-zinc-500">
                    {project.category}
                  </p>
                  {project.impact ? (
                    <p className="mt-3 font-mono text-xs text-emerald-400">
                      {project.impact}
                    </p>
                  ) : null}
                </div>
                <div className="mt-6 lg:mt-0">
                  <p className="text-zinc-300">{project.tagline}</p>
                  <p className="mt-3 max-w-[60ch] text-sm leading-relaxed text-zinc-400">
                    {project.description}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    {visibleStack.map((item) => (
                      <Chip key={item} label={item} />
                    ))}
                    {overflowCount > 0 ? (
                      <span className="font-mono text-xs text-zinc-500">
                        +{overflowCount}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </Section>
  );
}
