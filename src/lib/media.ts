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

export const hasMedia = (src?: string) => Boolean(getMedia(src));
