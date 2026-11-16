// Sección "Escapadas Tercera Edad": cambia de destino al tocar un botón, con teclado y avance automático.
document.querySelectorAll<HTMLElement>('[data-escapadas]').forEach((root) => {
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[data-esc-tab]')];
  const panels = [...root.querySelectorAll<HTMLElement>('[data-esc-panel]')];
  if (!tabs.length) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let auto = root.dataset.autoplay === '1' && !reduce;
  let actual = 0;

  const ir = (i: number, foco = false) => {
    actual = (i + tabs.length) % tabs.length;
    tabs.forEach((t, k) => {
      t.setAttribute('aria-selected', String(k === actual));
      t.tabIndex = k === actual ? 0 : -1;
    });
    panels.forEach((p, k) => (p.dataset.on = k === actual ? '1' : '0'));
    if (foco) tabs[actual].focus();
    // reinicia la barra de progreso
    root.dataset.play = '0';
    void root.offsetWidth;
    if (auto && visible) root.dataset.play = '1';
  };

  let visible = false;
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => {
      auto = false; // si la persona elige, ya no cambiamos solos
      ir(i);
    });
    t.addEventListener('keydown', (e) => {
      const k = e.key;
      if (k === 'ArrowRight' || k === 'ArrowDown') (e.preventDefault(), (auto = false), ir(actual + 1, true));
      else if (k === 'ArrowLeft' || k === 'ArrowUp') (e.preventDefault(), (auto = false), ir(actual - 1, true));
    });
  });
  root.querySelectorAll('.esc-bar').forEach((b) => b.addEventListener('animationend', () => auto && ir(actual + 1)));
  if (auto && 'IntersectionObserver' in window) {
    new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        root.dataset.play = auto && visible ? '1' : '0';
      },
      { threshold: 0.35 },
    ).observe(root);
  }
});
