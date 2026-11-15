// Datos del sitio para los bloques editables (home y editor visual), con imágenes ya optimizadas.
import { getImage } from 'astro:assets';
import { getCollection } from 'astro:content';
import { site } from '@/data/site';
import { destinos } from '@/data/destinos';
import { faq } from '@/data/faq';
import { galeria } from '@/data/galeria';
import { categorias } from '@/content.config';
import { getMedia, allMediaKeys } from '@/lib/media';
import type { Pic, SiteData } from '@/blocks/core';

const WIDTHS = [320, 480, 640, 800, 960, 1280, 1600, 2400];
const cache = new Map<string, Promise<Pic | undefined>>();

export function resolvePic(key: string): Promise<Pic | undefined> {
  if (!cache.has(key)) {
    cache.set(
      key,
      (async () => {
        const meta = getMedia(key);
        if (!meta) return undefined;
        const widths = WIDTHS.filter((w) => w < meta.width).concat(meta.width <= 2400 ? [meta.width] : []);
        const [avif, webp] = await Promise.all([
          getImage({ src: meta, widths, format: 'avif' }),
          getImage({ src: meta, widths, format: 'webp' }),
        ]);
        const fallback = await getImage({ src: meta, width: Math.min(960, meta.width), format: 'webp' });
        return { w: meta.width, h: meta.height, src: fallback.src, avif: avif.srcSet.attribute, webp: webp.srcSet.attribute };
      })(),
    );
  }
  return cache.get(key)!;
}

/** Recorre cualquier JSON y junta los textos que son fotos de la biblioteca. */
export function collectKeys(value: unknown, out = new Set<string>()) {
  if (typeof value === 'string') {
    if (/\.(jpe?g|png|webp|avif)$/i.test(value) && getMedia(value)) out.add(value);
  } else if (Array.isArray(value)) value.forEach((v) => collectKeys(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => collectKeys(v, out));
  return out;
}

export async function getSiteData(opts: { extraKeys?: Iterable<string>; library?: boolean } = {}): Promise<SiteData> {
  const exps = (await getCollection('experiencias')).sort((a, b) => a.data.order - b.data.order);
  const alojs = (await getCollection('alojamientos')).sort((a, b) => a.data.order - b.data.order);
  const progs = (await getCollection('programas')).sort((a, b) => a.data.order - b.data.order);

  // Galería sin fotos faltantes ni repetidas
  const seen = new Set<string>();
  const gal = galeria.filter((g) => {
    const m = getMedia(g.src);
    if (!m || seen.has(m.src)) return false;
    seen.add(m.src);
    return true;
  });
  const galeriaData = await Promise.all(
    gal.map(async (g) => {
      const meta = getMedia(g.src)!;
      const full = await getImage({ src: meta, width: Math.min(1800, meta.width), format: 'webp' });
      return { src: g.src, alt: g.alt, full: full.src, ratio: meta.width / meta.height };
    }),
  );

  const data: Omit<SiteData, 'images'> = {
    site: {
      name: site.name,
      foundingYear: site.foundingYear,
      whatsapp: site.whatsapp,
      whatsappGreeting: site.whatsappGreeting,
      instagram: site.social.instagram,
      memberships: [...site.memberships],
      featuredVideo: site.featuredVideo,
      videos: site.videos.map((v) => ({ id: v.id, title: v.title })),
    },
    categorias: { ...categorias },
    experiencias: exps.map((e) => ({
      id: e.id,
      title: e.data.title,
      category: e.data.category,
      destinos: e.data.destinos,
      duration: e.data.duration,
      minAge: e.data.minAge,
      priceFrom: e.data.priceFrom,
      priceUnit: e.data.priceUnit,
      image: e.data.image,
      featured: e.data.featured,
    })),
    alojamientos: alojs.map((a) => ({
      id: a.id,
      title: a.data.title,
      location: a.data.location,
      capacity: a.data.capacity,
      beds: a.data.beds,
      shared: a.data.shared,
      pricePerNight: a.data.pricePerNight,
      image: a.data.image,
    })),
    programas: progs.map((p) => ({ id: p.id, title: p.data.title, group: p.data.group, days: p.data.days, priceFrom: p.data.priceFrom, image: p.data.image })),
    destinos: destinos.map((d) => ({
      slug: d.slug,
      name: d.name,
      summary: d.summary,
      lat: d.lat,
      lng: d.lng,
      onMap: d.onMap,
      count: exps.filter((e) => e.data.destinos.includes(d.slug)).length,
    })),
    faq: faq.map((f) => ({ q: f.q, a: f.a })),
    galeria: galeriaData,
  };

  const keys = collectKeys(data);
  for (const v of site.videos) keys.add(`youtube/${v.id}.jpg`);
  for (const k of opts.extraKeys ?? []) keys.add(k);
  if (opts.library) for (const k of allMediaKeys()) keys.add(k);

  const images: Record<string, Pic> = {};
  await Promise.all(
    [...keys].map(async (k) => {
      const p = await resolvePic(k);
      if (p) images[k] = p;
    }),
  );
  return { ...data, images };
}
