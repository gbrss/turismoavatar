// Biblioteca de fotos y videos: fotos del sitio + subidas desde el panel. También funciona como selector.
import { useMemo, useRef, useState } from 'react';
import { parseCms } from '@/blocks/core';
import { api, Btn, Empty, Modal, Panel, cls, previewPic, uploadImage, uploadVideo, useAdmin, type CmsItem } from './lib';

interface Item {
  key: string;
  label: string;
  src: string;
  cms?: CmsItem;
}

function useItems(kind: 'image' | 'video') {
  const { data, media } = useAdmin();
  return useMemo<Item[]>(() => {
    if (kind === 'video') {
      const own = media.filter((m) => m.kind === 'video').map((m) => ({ key: m.key, label: m.name || m.key, src: `/cms-media/${m.key.slice(10)}`, cms: m }));
      return [...own, { key: '/media/video/hero.mp4', label: 'Video de portada original', src: '/media/video/hero.mp4' }];
    }
    const own = media.filter((m) => m.kind === 'image').map((m) => ({ key: m.key, label: m.name || 'Foto subida', src: parseCms(m.key)!.src, cms: m }));
    const lib = data.library
      .filter((k) => data.site.images[k])
      .map((k) => ({ key: k, label: k.split('/').pop()!.replace(/\.[a-z]+$/i, '').replace(/[-_]/g, ' '), src: data.site.images[k].src }));
    return [...own, ...lib];
  }, [data, media, kind]);
}

export function Uploader({ kind = 'image', onDone }: { kind?: 'image' | 'video'; onDone?: (item: CmsItem) => void }) {
  const { reloadMedia, toast, me } = useAdmin();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState('');
  const run = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      let last: CmsItem | undefined;
      for (const f of Array.from(files)) last = kind === 'video' ? await uploadVideo(f, setBusy) : await uploadImage(f, '', setBusy);
      await reloadMedia();
      toast(kind === 'video' ? 'Video subido' : files.length > 1 ? 'Fotos subidas' : 'Foto subida');
      if (last) onDone?.(last);
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy('');
      if (input.current) input.current.value = '';
    }
  };
  if (!me.servicios.media) return <p className="text-sm text-gris">Para subir archivos falta conectar el almacenamiento R2 (ver ADMIN.md).</p>;
  return (
    <>
      <input ref={input} type="file" accept={kind === 'video' ? 'video/mp4,video/webm' : 'image/*'} multiple={kind === 'image'} hidden onChange={(e) => run(e.target.files)} />
      <Btn onClick={() => input.current?.click()} disabled={!!busy}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <path d="M12 16V4M6 10l6-6 6 6M4 20h16" />
        </svg>
        {busy || (kind === 'video' ? 'Subir video' : 'Subir fotos')}
      </Btn>
    </>
  );
}

function Grid({ items, selected, onPick, kind }: { items: Item[]; selected?: string; onPick?: (i: Item) => void; kind: 'image' | 'video' }) {
  if (!items.length) return <Empty>Aún no hay archivos.</Empty>;
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((it) => (
        <li key={it.key}>
          <button
            type="button"
            onClick={() => onPick?.(it)}
            className={cls('group block w-full overflow-hidden rounded-xl bg-white text-left ring-1 transition', selected === it.key ? 'ring-4 ring-naranja' : 'ring-roca hover:ring-marino')}
          >
            <span className="block aspect-[4/3] bg-marino">
              {kind === 'video' ? (
                <video src={it.src} muted preload="metadata" className="h-full w-full object-cover" />
              ) : (
                <img src={it.src} alt="" loading="lazy" className="h-full w-full object-cover" />
              )}
            </span>
            <span className="block truncate px-2.5 py-2 text-xs font-semibold">
              {it.cms && <span className="mr-1 rounded bg-cielo/15 px-1.5 py-0.5 text-[10px] font-bold text-cielo-700">SUBIDA</span>}
              {it.label}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Selector de foto o video (modal). */
export function MediaPicker({ open, onClose, onPick, value, kind = 'image' }: { open: boolean; onClose: () => void; onPick: (key: string) => void; value?: string; kind?: 'image' | 'video' }) {
  const items = useItems(kind);
  const [q, setQ] = useState('');
  const list = q ? items.filter((i) => i.label.toLowerCase().includes(q.toLowerCase())) : items;
  return (
    <Modal open={open} onClose={onClose} title={kind === 'video' ? 'Elegir video' : 'Elegir foto'} wide>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="input min-w-0 flex-1" />
        <Uploader kind={kind} onDone={(it) => (onPick(it.key), onClose())} />
      </div>
      <Grid items={list} selected={value} kind={kind} onPick={(i) => (onPick(i.key), onClose())} />
    </Modal>
  );
}

/** Campo de foto para formularios y el editor visual. */
export function ImageInput({ value, onChange, label }: { value?: string; onChange: (v: string) => void; label?: string }) {
  const { data } = useAdmin();
  const [open, setOpen] = useState(false);
  const pic = previewPic(data, value);
  return (
    <div>
      {label && <span className="mb-1.5 block text-sm font-bold">{label}</span>}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setOpen(true)} className="h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-marino ring-1 ring-roca hover:ring-naranja">
          {pic ? <img src={pic.src} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-xs font-bold text-white/70">Sin foto</span>}
        </button>
        <div className="flex flex-col gap-1.5">
          <Btn variant="ghost" onClick={() => setOpen(true)}>
            {value ? 'Cambiar' : 'Elegir foto'}
          </Btn>
          {value && (
            <button type="button" onClick={() => onChange('')} className="text-left text-xs font-semibold text-gris hover:text-red-700">
              Quitar
            </button>
          )}
        </div>
      </div>
      <MediaPicker open={open} onClose={() => setOpen(false)} value={value} onPick={onChange} />
    </div>
  );
}

export function VideoInput({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const src = !value ? '' : value.startsWith('cms-video/') ? `/cms-media/${value.slice(10)}` : value;
  return (
    <div className="flex items-center gap-3">
      <div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-marino ring-1 ring-roca">
        {src ? <video src={src} muted autoPlay loop playsInline className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-xs font-bold text-white/70">Solo foto</span>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Btn variant="ghost" onClick={() => setOpen(true)}>
          {value ? 'Cambiar video' : 'Agregar video'}
        </Btn>
        {value && (
          <button type="button" onClick={() => onChange('')} className="text-left text-xs font-semibold text-gris hover:text-red-700">
            Quitar video
          </button>
        )}
      </div>
      <MediaPicker kind="video" open={open} onClose={() => setOpen(false)} value={value} onPick={onChange} />
    </div>
  );
}

/** Sección "Fotos y videos" del panel. */
export default function MediaLibrary() {
  const { media, reloadMedia, toast } = useAdmin();
  const images = useItems('image');
  const videos = useItems('video');
  const [sel, setSel] = useState<Item | null>(null);
  const [alt, setAlt] = useState('');

  const save = async () => {
    if (!sel?.cms) return;
    await api('/api/admin/media', { method: 'PATCH', body: JSON.stringify({ id: sel.cms.id, alt }) });
    await reloadMedia();
    toast('Descripción guardada');
  };
  const remove = async () => {
    if (!sel?.cms || !confirm('¿Borrar este archivo? Si está usado en el sitio dejará de verse.')) return;
    await api(`/api/admin/media?id=${sel.cms.id}`, { method: 'DELETE' });
    await reloadMedia();
    setSel(null);
    toast('Archivo borrado');
  };

  return (
    <div className="grid gap-6">
      <Panel title={`Fotos (${images.length})`} actions={<Uploader />}>
        <p className="mb-4 text-sm text-gris">Las fotos se optimizan solas al subirlas (WebP en varios tamaños), así el sitio sigue cargando rápido. Sube fotos horizontales de al menos 1.600 px de ancho para las portadas.</p>
        <Grid items={images} kind="image" onPick={(i) => (setSel(i), setAlt(i.cms?.alt ?? ''))} />
      </Panel>
      <Panel title={`Videos (${videos.length})`} actions={<Uploader kind="video" />}>
        <p className="mb-4 text-sm text-gris">Para el fondo de la portada usa videos cortos (6 a 15 s), sin audio, en MP4 720p de menos de 5 MB.</p>
        <Grid items={videos} kind="video" onPick={setSel} />
      </Panel>
      <Modal open={!!sel} onClose={() => setSel(null)} title={sel?.label ?? ''}>
        {sel && (
          <div className="grid gap-4">
            {sel.key.startsWith('cms-video/') || sel.key.endsWith('.mp4') ? (
              <video src={sel.src} controls className="w-full rounded-xl" />
            ) : (
              <img src={sel.src} alt="" className="w-full rounded-xl" />
            )}
            {sel.cms ? (
              <>
                {sel.cms.kind === 'image' && (
                  <label className="grid gap-1.5 text-sm font-bold">
                    Descripción (para buscadores y lectores de pantalla)
                    <input className="input font-normal" value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Ej: Grupo remando en SUP en Dichato" />
                  </label>
                )}
                <p className="text-xs text-gris">
                  {sel.cms.width ? `${sel.cms.width}×${sel.cms.height} px · ` : ''}
                  {(sel.cms.bytes / 1024).toFixed(0)} KB · subida {sel.cms.created_at?.slice(0, 10)}
                </p>
                <div className="flex flex-wrap justify-between gap-2">
                  <Btn variant="danger" onClick={remove}>
                    Borrar
                  </Btn>
                  {sel.cms.kind === 'image' && <Btn onClick={save}>Guardar descripción</Btn>}
                </div>
              </>
            ) : (
              <p className="text-sm text-gris">Foto incluida en el sitio. Puedes usarla en cualquier sección; para reemplazarla, sube una nueva.</p>
            )}
          </div>
        )}
      </Modal>
      {!media.length && null}
    </div>
  );
}
