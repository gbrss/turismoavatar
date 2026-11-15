// Compartido por el componente Astro y el bloque del editor (home).
// Sincroniza el resaltado entre la lista y el mapa
document.querySelectorAll<HTMLElement>('[data-map]').forEach((root) => {
  const pins = new Map<string, Element>();
  root.querySelectorAll('[data-dest]').forEach((el) => pins.set((el as HTMLElement).dataset.dest!, el));
  root.querySelectorAll<HTMLElement>('[data-dest-item]').forEach((item) => {
    const pin = pins.get(item.dataset.destItem!);
    const on = () => pin?.classList.add('is-active');
    const off = () => pin?.classList.remove('is-active');
    item.addEventListener('mouseenter', on);
    item.addEventListener('mouseleave', off);
    item.addEventListener('focus', on);
    item.addEventListener('blur', off);
  });
});
