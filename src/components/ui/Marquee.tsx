"use client";

const ITEMS = [
  "React",
  "Next.js",
  "TypeScript",
  "Tailwind CSS",
  "GSAP",
  "Three.js",
  "Node.js",
  "NestJS",
  "Docker",
  "AI Agents",
];

function Track({ hidden = false }: { hidden?: boolean }) {
  return (
    <div aria-hidden={hidden} className="flex shrink-0 items-center">
      {ITEMS.map((item) => (
        <span
          key={item}
          className="flex items-center font-mono text-sm uppercase tracking-[0.18em] text-zinc-500"
        >
          <span className="px-7">{item}</span>
          <span className="text-emerald-500">·</span>
        </span>
      ))}
    </div>
  );
}

export default function Marquee() {
  return (
    <div className="group relative w-full overflow-hidden border-y border-zinc-800/60 py-5 motion-reduce:hidden">
      <div className="flex w-max animate-[marquee_36s_linear_infinite] group-hover:[animation-play-state:paused]">
        <Track />
        <Track hidden />
      </div>
    </div>
  );
}
