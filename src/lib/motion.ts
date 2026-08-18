export const DISTANCE = 24;
export const DISTANCE_SM = 12;
export const DURATION = 0.7;
export const EASE = "power3.out";
export const STAGGER = 0.07;
export const STAGGER_SM = 0.045;

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
export const DESKTOP_SCROLL_QUERY =
  "(min-width: 768px) and (prefers-reduced-motion: no-preference)";
export const POINTER_QUERY =
  "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia(REDUCED_MOTION_QUERY).matches
  );
}
