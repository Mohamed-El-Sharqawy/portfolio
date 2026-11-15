/**
 * Overlay panels for the 3D layer (plain TypeScript, no framework).
 * The sections in <main> stay real, semantic HTML; in 3D mode CSS turns them
 * into fixed panels and this module opens/closes them. Each panel gets a close
 * button; a "Show …" button next to Back re-opens a closed panel.
 */
export type PanelId = 'about' | 'projects' | 'skills' | 'experience' | 'education' | 'faq' | 'contact';

const LABELS: Record<PanelId, string> = {
  about: 'About',
  projects: 'Projects',
  skills: 'Skills',
  experience: 'Experience',
  education: 'Education',
  faq: 'FAQ',
  contact: 'Contact',
};

export function createOverlays(opts: { onBack: () => void; onClose: (id: PanelId) => void; onReopen: (id: PanelId) => void }) {
  const panels = new Map<PanelId, HTMLElement>();
  for (const id of Object.keys(LABELS) as PanelId[]) {
    const el = document.getElementById(id);
    if (!el) continue;
    panels.set(id, el);
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'panel__close';
    close.setAttribute('aria-label', `Close ${LABELS[id]}`);
    close.innerHTML = '<span aria-hidden="true">×</span>';
    close.addEventListener('click', () => opts.onClose(id));
    el.prepend(close);
  }
  const backBtn = document.getElementById('back-btn') as HTMLButtonElement | null;
  const reopenBtn = document.getElementById('panel-open') as HTMLButtonElement | null;
  const dialog = document.getElementById('project-dialog') as HTMLDialogElement | null;
  const dialogBody = document.getElementById('project-dialog-body');
  const open = new Set<PanelId>();
  let reopenFor: PanelId | null = null;

  backBtn?.addEventListener('click', () => opts.onBack());
  reopenBtn?.addEventListener('click', () => reopenFor && opts.onReopen(reopenFor));

  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (dialog?.open) return; // <dialog> closes itself on Esc
    if (!backBtn?.hidden) {
      e.preventDefault();
      opts.onBack();
    }
  });

  dialog?.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    // click on the backdrop or the close button
    if (t === dialog || t.closest('[data-close]')) dialog.close();
  });

  return {
    show(id: PanelId, focus = false) {
      const el = panels.get(id);
      if (!el) return;
      el.classList.add('is-open');
      el.scrollTop = 0;
      open.add(id);
      if (focus) {
        const heading = el.querySelector<HTMLElement>('h1, h2');
        // wait for visibility to flip before moving focus
        requestAnimationFrame(() => heading?.focus({ preventScroll: true }));
      }
    },
    hide(id: PanelId) {
      panels.get(id)?.classList.remove('is-open');
      open.delete(id);
    },
    hideAll(except?: PanelId) {
      for (const id of [...open]) if (id !== except) this.hide(id);
    },
    isOpen: (id: PanelId) => open.has(id),
    setBack(visible: boolean) {
      if (backBtn) backBtn.hidden = !visible;
    },
    /** Show the "Show <panel>" button for `id`, or hide it (null). */
    setReopen(id: PanelId | null, focus = false) {
      if (!reopenBtn || reopenFor === id) return;
      reopenFor = id;
      reopenBtn.hidden = !id;
      if (id) {
        reopenBtn.textContent = `Show ${LABELS[id]}`;
        if (focus) requestAnimationFrame(() => reopenBtn.focus({ preventScroll: true }));
      }
    },
    /** Project detail: a copy of the project's own <article> in a modal <dialog>. */
    openProject(slug: string) {
      const article = document.getElementById(`project-${slug}`);
      if (!dialog || !dialogBody || !article) return;
      const copy = article.cloneNode(true) as HTMLElement;
      copy.removeAttribute('id');
      copy.querySelectorAll('[id]').forEach((n) => {
        if (n.classList.contains('project__title')) n.id = 'project-dialog-title';
        else n.removeAttribute('id');
      });
      copy.removeAttribute('aria-labelledby');
      copy.classList.remove('sheet');
      dialogBody.replaceChildren(copy);
      dialog.showModal();
    },
    get dialogOpen() {
      return !!dialog?.open;
    },
  };
}
export type Overlays = ReturnType<typeof createOverlays>;
