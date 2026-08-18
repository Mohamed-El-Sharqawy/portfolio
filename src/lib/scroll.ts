import { prefersReducedMotion } from "./motion";
import { getLenis } from "./smooth-scroll";

export function scrollToContact() {
  const target = document.getElementById("contact");
  if (!target) return;
  const reduced = prefersReducedMotion();
  const top = target.getBoundingClientRect().top + window.scrollY - 96;
  const lenis = getLenis();
  if (lenis && !reduced) {
    lenis.scrollTo(top, {
      duration: 1.2,
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
    });
    return;
  }
  window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
}
