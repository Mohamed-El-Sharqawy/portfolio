"use client";

import type { ReactNode } from "react";
import { gsap, useScrollFx } from "@/hooks/useScrollFx";
import { DESKTOP_SCROLL_QUERY } from "@/lib/motion";

type ParallaxIndexProps = {
  children: ReactNode;
};

const RANGE = 40;

export default function ParallaxIndex({ children }: ParallaxIndexProps) {
  const ref = useScrollFx<HTMLParagraphElement>((el) => {
    const mm = gsap.matchMedia();
    mm.add(DESKTOP_SCROLL_QUERY, () => {
      gsap.fromTo(
        el,
        { y: -RANGE },
        {
          y: RANGE,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
            invalidateOnRefresh: true,
          },
        },
      );
    });
    return () => mm.revert();
  });

  return (
    <p
      ref={ref}
      className="font-mono text-xs text-emerald-600 will-change-transform"
    >
      {children}
    </p>
  );
}
