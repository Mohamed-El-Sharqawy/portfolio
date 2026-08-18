"use client";

import { gsap, useScrollFx } from "@/hooks/useScrollFx";
import { prefersReducedMotion } from "@/lib/motion";

export type WordRevealLine = { text: string; accent?: boolean }[];

type WordRevealProps = {
  lines: WordRevealLine[];
  className?: string;
};

export default function WordReveal({ lines, className }: WordRevealProps) {
  const ref = useScrollFx<HTMLHeadingElement>((el) => {
    const words = el.querySelectorAll<HTMLElement>("[data-word]");
    if (!words.length || prefersReducedMotion()) return;
    gsap.from(words, {
      yPercent: 115,
      duration: 0.9,
      ease: "power4.out",
      stagger: 0.08,
      delay: 0.1,
    });
  });

  return (
    <h1 ref={ref} className={className}>
      {lines.map((line, lineIndex) => (
        <span key={lineIndex} className={lineIndex > 0 ? "block" : undefined}>
          {line.map((word, wordIndex) => (
            <span key={word.text}>
              {wordIndex > 0 ? " " : null}
              <span className="inline-block overflow-hidden pb-[0.12em] -mb-[0.12em] align-top">
                <span data-word className="inline-block will-change-transform">
                  {word.accent ? (
                    <em className="italic text-emerald-400">{word.text}</em>
                  ) : (
                    word.text
                  )}
                </span>
              </span>
            </span>
          ))}
        </span>
      ))}
    </h1>
  );
}
