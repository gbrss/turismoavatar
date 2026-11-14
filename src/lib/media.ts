import type { ImageMetadata } from 'astro';

// Todas las imágenes migradas del WordPress viven en src/assets/media/AAAA/MM/archivo.
// Se referencian por su ruta original ("2024/11/rock.jpg") y Astro las optimiza en build (AVIF/WebP + srcset).
const files = import.meta.glob<{ default: ImageMetadata }>('/src/assets/media/**/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG}', {
  eager: true,
});

const index = new Map<string, ImageMetadata>();
for (const [path, mod] of Object.entries(files)) {
  const key = path.replace('/src/assets/media/', '');
  index.set(key, mod.default);
  index.set(key.toLowerCase(), mod.default);
  // WordPress genera variantes "-1024x1024", "-scaled"... permitimos encontrar la original y viceversa
  const base = key.replace(/-(\d+x\d+|scaled)(?=\.[a-z]+$)/gi, '');
  if (!index.has(base)) index.set(base, mod.default);
}

export function getMedia(src?: string): ImageMetadata | undefined {
  if (!src) return undefined;
  const clean = src.replace(/^\/?(wp-content\/uploads\/)?/, '');
  return (
    index.get(clean) ??
    index.get(clean.toLowerCase()) ??
    index.get(clean.replace(/-(\d+x\d+|scaled)(?=\.[a-z]+$)/gi, ''))
  );
}

export const hasMedia = (src?: string) => Boolean(getMedia(src));
