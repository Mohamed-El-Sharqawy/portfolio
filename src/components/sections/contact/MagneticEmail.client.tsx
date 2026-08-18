"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/hooks/useScrollFx";
import { POINTER_QUERY, prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/cn";

type MagneticEmailProps = {
  email: string;
  className?: string;
};

const RADIUS = 170;
const PULL = 0.25;

export default function MagneticEmail({ email, className }: MagneticEmailProps) {
  const ref = useRef<HTMLAnchorElement>(null);

  useGSAP(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const mm = gsap.matchMedia();
    mm.add(POINTER_QUERY, () => {
      const xTo = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
      const yTo = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });
      const clampX = gsap.utils.clamp(-RADIUS, RADIUS);
      const clampY = gsap.utils.clamp(-RADIUS, RADIUS);
      const reset = () => {
        xTo(0);
        yTo(0);
      };
      const onMove = (event: PointerEvent) => {
        const rect = el.getBoundingClientRect();
        const offsetX = gsap.getProperty(el, "x") as number;
        const offsetY = gsap.getProperty(el, "y") as number;
        const dx =
          event.clientX - (rect.left + rect.width / 2 - offsetX);
        const dy =
          event.clientY - (rect.top + rect.height / 2 - offsetY);
        if (
          Math.abs(dx) > rect.width / 2 + RADIUS ||
          Math.abs(dy) > rect.height / 2 + RADIUS
        ) {
          reset();
          return;
        }
        xTo(clampX(dx) * PULL);
        yTo(clampY(dy) * PULL);
      };
      window.addEventListener("pointermove", onMove, { passive: true });
      return () => {
        window.removeEventListener("pointermove", onMove);
        reset();
      };
    });
    return () => mm.revert();
  });

  return (
    <a
      ref={ref}
      href={`mailto:${email}`}
      className={cn(className, "will-change-transform")}
    >
      {email}
    </a>
  );
}
