"use client";

import type { ReactNode } from "react";
import { gsap, useScrollFx } from "@/hooks/useScrollFx";
import { DESKTOP_SCROLL_QUERY } from "@/lib/motion";

type TiltCardProps = {
  children: ReactNode;
};

const MAX_TILT = 6;

export default function TiltCard({ children }: TiltCardProps) {
  const ref = useScrollFx<HTMLDivElement>((el) => {
    const mm = gsap.matchMedia();
    mm.add(DESKTOP_SCROLL_QUERY, () => {
      gsap.fromTo(
        el,
        { rotateX: -MAX_TILT },
        {
          rotateX: MAX_TILT,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
        },
      );
    });
    return () => mm.revert();
  });

  return (
    <div
      ref={ref}
      className="will-change-transform [transform-style:preserve-3d]"
    >
      {children}
    </div>
  );
}
