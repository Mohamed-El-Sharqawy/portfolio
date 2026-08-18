import type Lenis from "lenis";

let instance: Lenis | null = null;

export function initLenis(lenis: Lenis) {
  instance = lenis;
}

export function destroyLenis() {
  instance = null;
}

export function getLenis() {
  return instance;
}

export function scrollToTarget(
  target: string | HTMLElement,
  offset = -96,
) {
  const element =
    typeof target === "string"
      ? document.querySelector<HTMLElement>(target)
      : target;
  if (!element) return;
  if (instance) {
    instance.scrollTo(element, {
      offset,
      duration: 1.2,
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
    });
    return;
  }
  const top = element.getBoundingClientRect().top + window.scrollY + offset;
  window.scrollTo({ top, behavior: "smooth" });
}
