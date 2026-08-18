"use client";

import type { ReactNode } from "react";
import { gsap, useScrollFx } from "@/hooks/useScrollFx";
import { DISTANCE_SM, EASE, STAGGER, prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/cn";

type ChipStaggerProps = {
  children: ReactNode;
  className?: string;
};

export default function ChipStagger({ children, className }: ChipStaggerProps) {
  const ref = useScrollFx<HTMLDivElement>((el) => {
    if (prefersReducedMotion()) return;
    gsap.from(el.children, {
      y: DISTANCE_SM,
      opacity: 0,
      duration: 0.5,
      ease: EASE,
      stagger: STAGGER,
      scrollTrigger: { trigger: el, start: "top 88%", once: true },
    });
  });

  return (
    <div ref={ref} className={cn(className)}>
      {children}
    </div>
  );
}
