/**
 * Progressive enhancement for the native <details>/<summary> FAQ:
 * one item open at a time, with a short height animation.
 * Without JS the accordion still works natively.
 */
export function initFaq(root: ParentNode = document) {
  const container = root.querySelector<HTMLElement>('[data-faq]');
  if (!container) return;
  const items = Array.from(container.querySelectorAll<HTMLDetailsElement>('details'));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const animate = (el: HTMLDetailsElement, open: boolean) => {
    const body = el.querySelector<HTMLElement>('.faq__a');
    if (!body || reduced || !body.animate) {
      el.open = open;
      return;
    }
    if (open) {
      el.open = true;
      const h = body.scrollHeight;
      body.animate([{ height: '0px', opacity: 0 }, { height: `${h}px`, opacity: 1 }], {
        duration: 260,
        easing: 'cubic-bezier(.2,.7,.2,1)',
      });
    } else {
      const h = body.scrollHeight;
      const a = body.animate([{ height: `${h}px`, opacity: 1 }, { height: '0px', opacity: 0 }], {
        duration: 200,
        easing: 'ease-in',
      });
      a.onfinish = () => (el.open = false);
    }
  };

  for (const item of items) {
    const summary = item.querySelector('summary');
    summary?.addEventListener('click', (e) => {
      e.preventDefault();
      const willOpen = !item.open;
      if (willOpen) for (const other of items) if (other !== item && other.open) animate(other, false);
      animate(item, willOpen);
    });
  }
}
