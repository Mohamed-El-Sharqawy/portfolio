"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

let hydrationDone = typeof window === "undefined";
const originalUpdate = ScrollTrigger.update;
ScrollTrigger.update = (...args: Parameters<typeof originalUpdate>) => {
  if (hydrationDone) return originalUpdate(...args);
};

if (typeof window !== "undefined") {
  requestAnimationFrame(() => {
    hydrationDone = true;
    originalUpdate();
  });
}

type ScrollFxConfig = {
  dependencies?: unknown[];
  revertOnUpdate?: boolean;
};

export function useScrollFx<T extends HTMLElement = HTMLDivElement>(
  effect: (element: T) => (() => void) | void,
  config?: ScrollFxConfig,
) {
  const ref = useRef<T>(null);
  useGSAP(
    () => {
      if (ref.current) {
        return effect(ref.current);
      }
    },
    { scope: ref, ...config },
  );
  return ref;
}

export { gsap, ScrollTrigger, useGSAP };
