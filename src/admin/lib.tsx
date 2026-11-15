// Utilidades del panel: llamadas a la API, contexto global, subida de fotos y componentes básicos.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cmsWidths, parseCms, type Pic, type SiteData } from '@/blocks/core';
import type { Rev } from './live';

export async function api<T = Record<string, unknown>>(path: string, init: RequestInit = {}): Promise<T> {
  const isForm = init.body instanceof FormData;
  const res = await fetch(path, {
    credentials: 'same-origin',
    ...init,
    headers: { ...(init.body && !isForm ? { 'content-type': 'application/json' } : {}), ...(init.headers ?? {}) },
  });
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(body.error || `Error ${res.status}`);
  return body;
}

export interface Ficha {
  id: string;
  data: Record<string, unknown>;
  body: string;
}
export interface AdminData {
  builtAt: string;
  site: SiteData;
  library: string[];
  destinos: { slug: string; name: string }[];
  fichas: { experiencias: Ficha[]; alojamientos: Ficha[] };
  home: unknown;
}
export interface Me {
  email: string;
  via: 'access' | 'password';
  servicios: { db: boolean; media: boolean; github: boolean; ai: boolean };
}
export interface CmsItem {
  id: string;
  key: string;
  kind: 'image' | 'video';
  name: string;
  alt: string;
  width: number;
  height: number;
  bytes: number;
  created_at: string;
}

interface Ctx {
  data: AdminData;
  me: Me;
  media: CmsItem[];
  reloadMedia: () => Promise<void>;
  toast: (msg: string, tipo?: 'ok' | 'error') => void;
  /** Cambia cada vez que llegan datos nuevos (tiempo real) */
  rev: Rev;
}
export const AdminCtx = createContext<Ctx | null>(null);
export const useAdmin = () => useContext(AdminCtx)!;

/** Imagen de vista previa para cualquier clave (biblioteca del sitio o subida al panel). */
export function previewPic(data: AdminData, key?: string): Pic | undefined {
  if (!key) return undefined;
  return parseCms(key) ?? data.site.images[key];
}

/* ───────────── Subida de fotos: se optimizan en el navegador antes de subir ───────────── */
async function encode(bitmap: ImageBitmap, w: number, h: number): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, w, h);
  const webp = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', 0.82));
  if (webp && webp.type === 'image/webp') return webp;
  return (await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.84)))!;
}

export async function uploadImage(file: File, alt = '', onProgress?: (s: string) => void): Promise<CmsItem> {
  onProgress?.('Optimizando…');
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('No se pudo leer la foto. Usa JPG, PNG o WebP.');
  }
  const scale = Math.min(1, 2400 / bitmap.width, 4000 / bitmap.height);
  const W = Math.round(bitmap.width * scale);
  const H = Math.round(bitmap.height * scale);
  const form = new FormData();
  form.set('kind', 'image');
  form.set('width', String(W));
  form.set('height', String(H));
  form.set('name', file.name.replace(/\.[^.]+$/, ''));
  form.set('alt', alt);
  for (const w of cmsWidths(W)) {
    const blob = await encode(bitmap, w, Math.round((H * w) / W));
    form.set(`w${w}`, new File([blob], `${w}.webp`, { type: blob.type }));
  }
  bitmap.close();
  onProgress?.('Subiendo…');
  const { item } = await api<{ item: CmsItem }>('/api/admin/media', { method: 'POST', body: form });
  return item;
}

export async function uploadVideo(file: File, onProgress?: (s: string) => void): Promise<CmsItem> {
  onProgress?.(`Subiendo ${(file.size / 1048576).toFixed(1)} MB…`);
  const form = new FormData();
  form.set('kind', 'video');
  form.set('name', file.name.replace(/\.[^.]+$/, ''));
  form.set('file', file);
  const { item } = await api<{ item: CmsItem }>('/api/admin/media', { method: 'POST', body: form });
  return item;
}

/* ───────────── Componentes básicos ───────────── */
export const cls = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export function Btn({ children, variant = 'primary', className = '', ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'dark' | 'danger' }) {
  const v = {
    primary: 'bg-naranja text-marino hover:bg-naranja-300',
    ghost: 'bg-white text-tinta ring-1 ring-roca hover:bg-niebla',
    dark: 'bg-marino text-white hover:bg-marino-900',
    danger: 'bg-white text-red-700 ring-1 ring-red-200 hover:bg-red-50',
  }[variant];
  return (
    <button type="button" className={cls('inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-4 py-2 font-display text-sm font-bold transition disabled:opacity-50', v, className)} {...rest}>
      {children}
    </button>
  );
}

export function Panel({ title, actions, children, className = '' }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cls('rounded-2xl bg-white p-5 ring-1 ring-roca sm:p-6', className)}>
      {(title || actions) && (
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title && <h2 className="font-display text-lg font-extrabold">{title}</h2>}
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl bg-niebla px-4 py-8 text-center text-gris">{children}</p>;
}

export function Loading() {
  return (
    <div className="grid place-items-center py-16 text-gris" role="status">
      <svg className="h-7 w-7 animate-spin text-naranja" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity=".25" />
        <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className="sr-only">Cargando</span>
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[1000] grid place-items-end bg-marino-900/60 sm:place-items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={cls('flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl', wide ? 'sm:max-w-5xl' : 'sm:max-w-lg')}>
        <header className="flex items-center justify-between gap-4 border-b border-roca px-5 py-4">
          <h2 className="font-display text-lg font-extrabold">{title}</h2>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full hover:bg-niebla" aria-label="Cerrar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export const STATUS: Record<string, { label: string; cls: string }> = {
  pendiente: { label: 'Pendiente', cls: 'bg-naranja/15 text-naranja-700' },
  confirmada: { label: 'Confirmada', cls: 'bg-cielo/15 text-cielo-700' },
  pagada: { label: 'Pagada', cls: 'bg-[#157a3e]/12 text-[#157a3e]' },
  cancelada: { label: 'Cancelada', cls: 'bg-roca text-gris' },
};

export const fmtDate = (s?: string | null, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) => {
  if (!s) return '—';
  const d = new Date(/T|Z/.test(s) ? s : s.length === 10 ? `${s}T12:00:00` : `${s.replace(' ', 'T')}Z`);
  return Number.isNaN(d.getTime()) ? s : new Intl.DateTimeFormat('es-CL', { timeZone: 'America/Santiago', ...opts }).format(d);
};
export const fmtDateTime = (s?: string | null) => fmtDate(s, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export const waLink = (phone: string, text: string) => `https://wa.me/${phone.replace(/\D/g, '').replace(/^(9\d{8})$/, '56$1')}?text=${encodeURIComponent(text)}`;
