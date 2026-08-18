"use client";

import { gsap, useScrollFx } from "@/hooks/useScrollFx";
import { prefersReducedMotion } from "@/lib/motion";

type CounterProps = {
  value: string;
};

const COUNT_DURATION = 1.2;

export default function Counter({ value }: CounterProps) {
  const ref = useScrollFx<HTMLSpanElement>((el) => {
    if (prefersReducedMotion()) return;
    const counters = Array.from(
      el.querySelectorAll<HTMLElement>("[data-count]"),
      (node) => ({
        el: node,
        target: Number(node.dataset.count),
        value: 0,
      }),
    ).filter((counter) => Number.isFinite(counter.target));
    if (!counters.length) return;
    for (const counter of counters) {
      counter.el.textContent = "0";
    }
    const timeline = gsap.timeline({
      scrollTrigger: { trigger: el, start: "top 92%" },
    });
    for (const counter of counters) {
      timeline.to(
        counter,
        {
          value: counter.target,
          duration: COUNT_DURATION,
          ease: "power2.out",
          onUpdate: () => {
            counter.el.textContent = String(Math.round(counter.value));
          },
        },
        0,
      );
    }
  });

  const parts = value.split(/(\d+)/);

  return (
    <span ref={ref}>
      {parts.map((part, index) =>
        /^\d+$/.test(part) ? (
          <span key={index} data-count={part}>
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </span>
  );
}
