"use client";

import { useRef } from "react";
import type { ReactNode } from "react";
import { gsap, useGSAP } from "@/hooks/useScrollFx";
import { DISTANCE, DURATION, EASE, prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/cn";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
};

export default function Reveal({
  children,
  className,
  delay = 0,
  y = DISTANCE,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || prefersReducedMotion()) return;
      gsap.set(el, { willChange: "transform, opacity, filter" });
      gsap.fromTo(
        el,
        { y, opacity: 0, filter: "blur(10px)" },
        {
          y: 0,
          opacity: 1,
          filter: "blur(0px)",
          duration: DURATION,
          delay,
          ease: EASE,
          onComplete: () => {
            gsap.set(el, { clearProps: "willChange,filter" });
          },
          scrollTrigger: { trigger: el, start: "top 85%" },
        },
      );
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={cn(className)}>
      {children}
    </div>
  );
}
