import { prefersReducedMotion } from "./motion";

export function scrollToContact() {
  const target = document.getElementById("contact");
  if (!target) return;
  const reduced = prefersReducedMotion();
  const top = target.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({
    top,
    behavior: reduced ? "auto" : "smooth",
  });
}
