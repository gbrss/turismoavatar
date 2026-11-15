// Compartido por el componente Astro y el bloque del editor (home).
document.querySelectorAll<HTMLElement>('[data-gallery]').forEach((root) => {
  const dialog = root.querySelector<HTMLDialogElement>('[data-lightbox]')!;
  const img = dialog.querySelector<HTMLImageElement>('[data-lb-img]')!;
  const cap = dialog.querySelector<HTMLElement>('[data-lb-cap]')!;
  const buttons = () => [...root.querySelectorAll<HTMLButtonElement>('button[data-full]')].filter((b) => !b.closest('li')!.hidden && b.dataset.full);
  let current = 0;
  let opener: HTMLElement | null = null;

  const show = (i: number) => {
    const list = buttons();
    if (!list.length) return;
    current = (i + list.length) % list.length;
    const b = list[current];
    img.src = b.dataset.full!;
    img.alt = b.dataset.alt ?? '';
    cap.textContent = `${b.dataset.alt ?? ''} (${current + 1} de ${list.length})`;
  };

  root.querySelectorAll<HTMLButtonElement>('button[data-full]').forEach((b) =>
    b.addEventListener('click', () => {
      opener = b;
      show(buttons().indexOf(b));
      dialog.showModal();
    }),
  );
  dialog.querySelector('[data-lb-close]')!.addEventListener('click', () => dialog.close());
  dialog.querySelector('[data-lb-prev]')!.addEventListener('click', () => show(current - 1));
  dialog.querySelector('[data-lb-next]')!.addEventListener('click', () => show(current + 1));
  dialog.addEventListener('click', (e) => e.target === dialog && dialog.close());
  dialog.addEventListener('close', () => opener?.focus());
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });
  let x0 = 0;
  dialog.addEventListener('touchstart', (e) => (x0 = e.touches[0].clientX), { passive: true });
  dialog.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
  });

  root.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((f) =>
    f.addEventListener('click', () => {
      root.querySelectorAll('[data-filter]').forEach((o) => o.setAttribute('aria-pressed', String(o === f)));
      root.querySelectorAll<HTMLElement>('li[data-tag]').forEach((li) => (li.hidden = !!f.dataset.filter && li.dataset.tag !== f.dataset.filter));
    }),
  );
});
