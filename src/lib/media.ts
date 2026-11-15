import type { ImageMetadata } from 'astro';

// Imágenes migradas del WordPress: src/assets/media/AAAA/MM/archivo (misma ruta que wp-content/uploads).
// Se referencian por esa ruta ("2024/11/Bismarck-scaled.jpg") y Astro las optimiza en build (AVIF/WebP + srcset).
const files = import.meta.glob<{ default: ImageMetadata }>('/src/assets/media/**/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG}', {
  eager: true,
});

// WordPress genera variantes: "-1024x1024", "-scaled", "-1", "-e1732202603523"... La "raíz" agrupa todas.
const stem = (path: string) =>
  path
    .split('/')
    .pop()!
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/-e\d{10,}/g, '')
    .replace(/-(\d{2,5}x\d{2,5}|scaled)/g, '')
    .replace(/-\d$/, '')
    .toLowerCase();

const byPath = new Map<string, ImageMetadata>();
const byStem = new Map<string, ImageMetadata>();
for (const [path, mod] of Object.entries(files)) {
  const key = path.replace('/src/assets/media/', '');
  byPath.set(key.toLowerCase(), mod.default);
  const s = stem(key);
  const prev = byStem.get(s);
  // Nos quedamos con la variante más grande de cada foto
  if (!prev || mod.default.width > prev.width) byStem.set(s, mod.default);
}

export function getMedia(src?: string): ImageMetadata | undefined {
  if (!src) return undefined;
  const clean = src.replace(/^\/?(wp-content\/uploads\/)?/, '').toLowerCase();
  const exact = byPath.get(clean);
  const best = byStem.get(stem(clean));
  if (exact && best) return best.width > exact.width ? best : exact;
  return exact ?? best;
}

/** Claves canónicas de todas las fotos de la biblioteca (la variante más grande de cada una). */
export function allMediaKeys(): string[] {
  const best = new Set(byStem.values());
  return Object.entries(files)
    .filter(([, m]) => best.has(m.default))
    .map(([path]) => path.replace('/src/assets/media/', ''));
}

// Fotos subidas desde el panel (R2): "cms/<id>/<ancho>x<alto>"
export const CMS_WIDTHS = [480, 960, 1440, 1920, 2400];
export function cmsImage(src?: string) {
  const m = src ? /^cms\/([\w-]+)\/(\d+)x(\d+)$/.exec(src) : null;
  if (!m) return undefined;
  const width = +m[2];
  const height = +m[3];
  const widths = [...CMS_WIDTHS.filter((x) => x < width), width];
  const url = (x: number) => `/cms-media/${m[1]}/${x}.webp`;
  return { width, height, widths, url, src: url(widths.find((x) => x >= 960) ?? width) };
}

export const hasMedia = (src?: string) => Boolean(getMedia(src));

/** La portada va a pantalla completa (y el menú transparente encima) solo si la foto es grande. */
export const BLEED_MIN_WIDTH = 1400;
export const isBleed = (src?: string) => (getMedia(src)?.width ?? cmsImage(src)?.width ?? 0) >= BLEED_MIN_WIDTH;
