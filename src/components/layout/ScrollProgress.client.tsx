"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/hooks/useScrollFx";
import { prefersReducedMotion } from "@/lib/motion";

export default function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    gsap.fromTo(
      el,
      { scaleX: 0 },
      {
        scaleX: 1,
        ease: "none",
        scrollTrigger: {
          start: 0,
          end: "max",
          scrub: 0.4,
          invalidateOnRefresh: true,
        },
      },
    );
  });

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 h-[3px] motion-reduce:hidden"
    >
      <div
        ref={ref}
        className="h-full w-full origin-left scale-x-0 bg-gradient-to-r from-emerald-900 to-emerald-400"
      />
    </div>
  );
}
