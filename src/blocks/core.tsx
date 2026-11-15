// Núcleo de los bloques editables: tipos, contexto de datos del sitio e imágenes optimizadas.
// Los mismos componentes React se usan en el editor visual (/admin) y para generar el HTML estático del sitio.
import { createContext, useContext, type ReactNode } from 'react';

/** Imagen ya optimizada (AVIF/WebP en varios anchos). */
export interface Pic {
  w: number;
  h: number;
  src: string;
  webp: string;
  avif?: string;
}

export interface SiteData {
  site: {
    name: string;
    foundingYear: number;
    whatsapp: string;
    whatsappGreeting: string;
    instagram: string;
    memberships: string[];
    featuredVideo: string;
    videos: { id: string; title: string }[];
  };
  categorias: Record<string, string>;
  experiencias: {
    id: string;
    title: string;
    category: string;
    destinos: string[];
    duration: string;
    minAge?: number;
    priceFrom?: number;
    priceUnit: string;
    image: string;
    featured: boolean;
  }[];
  alojamientos: { id: string; title: string; location: string; capacity: number; beds: number; shared: boolean; pricePerNight: number; image: string }[];
  programas: { id: string; title: string; group: string; days: number; priceFrom?: number; image?: string }[];
  destinos: { slug: string; name: string; summary: string; lat: number; lng: number; onMap?: boolean; count: number }[];
  faq: { q: string; a: string }[];
  galeria: { src: string; alt: string; full: string; ratio: number }[];
  /** Fotos de la biblioteca (clave → imagen optimizada) */
  images: Record<string, Pic>;
}

interface Ctx {
  data: SiteData;
  editing: boolean;
}
const SiteCtx = createContext<Ctx | null>(null);

export function SiteProvider({ data, editing = false, children }: { data: SiteData; editing?: boolean; children: ReactNode }) {
  return <SiteCtx.Provider value={{ data, editing }}>{children}</SiteCtx.Provider>;
}

export function useSite() {
  const c = useContext(SiteCtx);
  if (!c) throw new Error('Falta SiteProvider');
  return c;
}

// Fotos subidas desde el panel: se guardan en R2 como cms/<id>/<ancho>.webp y se referencian "cms/<id>/<ancho>x<alto>".
export const CMS_WIDTHS = [480, 960, 1440, 1920, 2400];
export const cmsWidths = (w: number) => [...CMS_WIDTHS.filter((x) => x < w), w];
export function parseCms(key: string): Pic | undefined {
  const m = /^cms\/([\w-]+)\/(\d+)x(\d+)$/.exec(key);
  if (!m) return undefined;
  const [, id, w, h] = m;
  const widths = cmsWidths(+w);
  const url = (x: number) => `/cms-media/${id}/${x}.webp`;
  return { w: +w, h: +h, src: url(widths.find((x) => x >= 960) ?? +w), webp: widths.map((x) => `${url(x)} ${x}w`).join(', ') };
}

export function usePic(key?: string): Pic | undefined {
  const { data } = useSite();
  if (!key) return undefined;
  return parseCms(key) ?? data.images[key];
}

/** Video subido (cms-video/<id>.mp4) o archivo del sitio (/media/...). */
export const videoUrl = (v?: string) => (!v ? '' : v.startsWith('cms-video/') ? `/cms-media/${v.slice(10)}` : v);

interface ImgProps {
  k?: string;
  alt: string;
  sizes?: string;
  className?: string;
  eager?: boolean;
}

/** <picture> responsivo. Sin foto muestra un fondo de marca (nunca un hueco roto). */
export function Img({ k, alt, sizes = '(min-width: 1024px) 33vw, 100vw', className = '', eager = false }: ImgProps) {
  const pic = usePic(k);
  const cls = `h-full w-full object-cover ${className}`;
  if (!pic) {
    return (
      <div role="img" aria-label={alt} className={`relative h-full w-full overflow-hidden ${className}`} style={{ background: 'radial-gradient(120% 90% at 20% 10%, #0a72a8 0%, #192a3d 60%)' }} />
    );
  }
  return (
    <picture>
      {pic.avif && <source type="image/avif" srcSet={pic.avif} sizes={sizes} />}
      <source type="image/webp" srcSet={pic.webp} sizes={sizes} />
      <img
        src={pic.src}
        alt={alt}
        width={pic.w}
        height={pic.h}
        sizes={sizes}
        loading={eager ? 'eager' : 'lazy'}
        decoding={eager ? 'sync' : 'async'}
        fetchPriority={eager ? 'high' : 'auto'}
        className={cls}
      />
    </picture>
  );
}

/** Texto enriquecido: HTML guardado (sitio) o editor en línea (panel). */
export function Rich({ v, className = '' }: { v: unknown; className?: string }) {
  if (!v) return null;
  if (typeof v === 'string') return <div className={`prose-ta ${className}`} dangerouslySetInnerHTML={{ __html: v }} />;
  return <div className={`prose-ta ${className}`}>{v as ReactNode}</div>;
}

export const clp = (n: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

export function useWhatsapp() {
  const { data } = useSite();
  return (message?: string) => `https://wa.me/${data.site.whatsapp}?text=${encodeURIComponent(message || `${data.site.whatsappGreeting} sus experiencias.`)}`;
}

export type Fondo = 'claro' | 'blanco' | 'marino';
export const fondo = (f?: Fondo) => (f === 'blanco' ? 'bg-white' : f === 'marino' ? 'bg-marino text-white' : '');

export const isExternal = (href?: string) => !!href && /^https?:\/\//.test(href);
export const linkProps = (href?: string) => (isExternal(href) ? { target: '_blank', rel: 'noopener' } : {});

export interface Boton {
  label?: string;
  href?: string;
}

/** Logo/estrella de la marca usada como viñeta. */
export const Estrella = ({ className = '' }: { className?: string }) => (
  <svg width="28" height="28" viewBox="0 0 100 100" className={`shrink-0 text-naranja ${className}`} aria-hidden="true">
    <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="7" />
    <path d="M50 18 L59 42 L84 42 L64 57 L71 82 L50 67 L29 82 L36 57 L16 42 L41 42 Z" fill="currentColor" />
  </svg>
);
