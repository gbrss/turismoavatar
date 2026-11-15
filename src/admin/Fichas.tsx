// Fichas de experiencias y alojamientos: crear, editar precios/fotos/textos y publicar.
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { clp } from '@/blocks/core';
import { ImageInput } from './Media';
import { api, Btn, Empty, Panel, cls, previewPic, useAdmin, type Ficha } from './lib';

type Col = 'experiencias' | 'alojamientos';
type F = Record<string, unknown>;

const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

function Field({ label, hint, children, className = '' }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cls('grid content-start gap-1.5 text-sm font-bold', className)}>
      {label}
      {children}
      {hint && <span className="text-xs font-normal text-gris">{hint}</span>}
    </label>
  );
}

function ListInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState('');
  const add = () => draft.trim() && (onChange([...value, draft.trim()]), setDraft(''));
  return (
    <div className="grid gap-2">
      <ul className="flex flex-wrap gap-2">
        {value.map((v, i) => (
          <li key={i} className="flex items-center gap-1 rounded-full bg-niebla py-1 pl-3 pr-1 text-sm font-semibold">
            {v}
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="grid h-6 w-6 place-items-center rounded-full hover:bg-roca" aria-label={`Quitar ${v}`}>
              ×
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input className="input min-w-0 flex-1 font-normal" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())} placeholder={placeholder} />
        <Btn variant="ghost" onClick={add}>
          Agregar
        </Btn>
      </div>
    </div>
  );
}

function Editor({ col, ficha, isNew, onClose }: { col: Col; ficha: Ficha; isNew: boolean; onClose: () => void }) {
  const { data, me, toast } = useAdmin();
  const [f, setF] = useState<F>({ ...ficha.data });
  const [body, setBody] = useState(ficha.body);
  const [slug, setSlug] = useState(ficha.id);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const set = (k: string, v: unknown) => (setF((x) => ({ ...x, [k]: v })), setDirty(true));
  const str = (k: string) => (f[k] as string) ?? '';
  const arr = (k: string) => (f[k] as string[]) ?? [];
  const numOrUndef = (v: string) => (v === '' ? undefined : Math.max(0, Math.round(Number(v))));

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => dirty && e.preventDefault();
    addEventListener('beforeunload', warn);
    return () => removeEventListener('beforeunload', warn);
  }, [dirty]);

  const publish = async (remove = false) => {
    if (!me.servicios.github) return toast('Falta configurar GITHUB_TOKEN para publicar (ver ADMIN.md).', 'error');
    if (remove && !confirm(`¿Eliminar "${str('title')}" del sitio? Las reservas ya hechas no se borran.`)) return;
    const id = isNew ? slugify(slug || str('title')) : ficha.id;
    if (!id) return toast('Escribe un título', 'error');
    if (isNew && data.fichas[col].some((x) => x.id === id)) return toast('Ya existe una ficha con esa dirección', 'error');
    setBusy(true);
    try {
      const fm = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined && v !== '' && !(Array.isArray(v) && !v.length && false)));
      await api('/api/admin/publish', { method: 'POST', body: JSON.stringify({ target: `${col}/${id}`, frontmatter: fm, body, remove }) });
      setDirty(false);
      toast(remove ? 'Eliminada. El sitio se actualiza en 1 a 3 minutos.' : 'Publicado. El sitio se actualiza en 1 a 3 minutos.');
      onClose();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const gallery = arr('gallery');
  const isExp = col === 'experiencias';
  const summaryLen = str('summary').length;
  return (
    <div className="grid gap-5">
      <div className="sticky top-0 z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b border-roca bg-niebla/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <button type="button" onClick={() => (!dirty || confirm('Tienes cambios sin publicar. ¿Salir igual?')) && onClose()} className="font-bold text-gris hover:text-tinta">
          ← {isExp ? 'Experiencias' : 'Alojamientos'}
        </button>
        <div className="flex flex-wrap gap-2">
          {!isNew && (
            <>
              <a href={`/${col}/${ficha.id}`} target="_blank" rel="noopener" className="inline-flex min-h-10 items-center rounded-full px-4 text-sm font-bold text-cielo-700 hover:bg-white">
                Ver en el sitio
              </a>
              <Btn variant="danger" onClick={() => publish(true)} disabled={busy}>
                Eliminar
              </Btn>
            </>
          )}
          <Btn onClick={() => publish()} disabled={busy}>
            {busy ? 'Publicando…' : 'Publicar'}
          </Btn>
        </div>
      </div>

      <Panel title="Lo principal">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Título" className="sm:col-span-2">
            <input className="input font-normal" value={str('title')} onChange={(e) => (set('title', e.target.value), isNew && setSlug(slugify(e.target.value)))} />
          </Field>
          {isNew && (
            <Field label="Dirección de la página" hint={`turismoavatar.cl/${col}/${slugify(slug) || '…'}`} className="sm:col-span-2">
              <input className="input font-normal" value={slug} onChange={(e) => setSlug(e.target.value)} />
            </Field>
          )}
          <Field label="Resumen" hint={isExp ? `${summaryLen}/220 caracteres. Aparece en tarjetas, Google y al compartir.` : 'Aparece en tarjetas, Google y al compartir.'} className="sm:col-span-2">
            <textarea className={cls('input font-normal', isExp && summaryLen > 220 && 'ring-2 ring-red-500')} rows={3} value={str('summary')} onChange={(e) => set('summary', e.target.value)} />
          </Field>
          {isExp ? (
            <>
              <Field label="Categoría">
                <select className="input font-normal" value={str('category')} onChange={(e) => set('category', e.target.value)}>
                  {Object.entries(data.site.categorias).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Duración">
                <input className="input font-normal" value={str('duration')} onChange={(e) => set('duration', e.target.value)} placeholder="Ej: 2 horas" />
              </Field>
              <Field label="Precio desde (CLP)" hint={f.priceFrom ? clp(f.priceFrom as number) : 'Vacío = "Precio a consultar"'}>
                <input className="input font-normal" type="number" inputMode="numeric" min={0} step={1000} value={(f.priceFrom as number) ?? ''} onChange={(e) => set('priceFrom', numOrUndef(e.target.value))} />
              </Field>
              <Field label="Precio por">
                <select className="input font-normal" value={str('priceUnit') || 'persona'} onChange={(e) => set('priceUnit', e.target.value)}>
                  <option value="persona">Persona</option>
                  <option value="grupo">Grupo</option>
                </select>
              </Field>
              <Field label="Dificultad">
                <select className="input font-normal" value={str('difficulty') || 'Baja'} onChange={(e) => set('difficulty', e.target.value)}>
                  {['Baja', 'Media', 'Alta'].map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </Field>
              <Field label="Edad mínima">
                <input className="input font-normal" type="number" min={0} value={(f.minAge as number) ?? ''} onChange={(e) => set('minAge', numOrUndef(e.target.value))} />
              </Field>
              <Field label="Tamaño del grupo">
                <input className="input font-normal" value={str('groupSize')} onChange={(e) => set('groupSize', e.target.value)} placeholder="Ej: Grupos pequeños" />
              </Field>
              <Field label="Punto de encuentro">
                <input className="input font-normal" value={str('meetingPoint')} onChange={(e) => set('meetingPoint', e.target.value)} />
              </Field>
              <Field label="Horarios" className="sm:col-span-2">
                <input className="input font-normal" value={str('schedule')} onChange={(e) => set('schedule', e.target.value)} />
              </Field>
              <Field label="Destinos" className="sm:col-span-2">
                <div className="flex flex-wrap gap-2 font-normal">
                  {data.destinos.map((d) => {
                    const on = arr('destinos').includes(d.slug);
                    return (
                      <button key={d.slug} type="button" aria-pressed={on} onClick={() => set('destinos', on ? arr('destinos').filter((x) => x !== d.slug) : [...arr('destinos'), d.slug])} className="rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ring-roca aria-pressed:bg-marino aria-pressed:text-white">
                        {d.name}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </>
          ) : (
            <>
              <Field label="Destino">
                <select className="input font-normal" value={str('destino')} onChange={(e) => set('destino', e.target.value)}>
                  <option value="">Elige…</option>
                  {data.destinos.map((d) => (
                    <option key={d.slug} value={d.slug}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Ubicación (se muestra)">
                <input className="input font-normal" value={str('location')} onChange={(e) => set('location', e.target.value)} placeholder="Ej: Coliumo, Tomé" />
              </Field>
              <Field label="Precio por noche (CLP)" hint={f.pricePerNight ? clp(f.pricePerNight as number) : undefined}>
                <input className="input font-normal" type="number" inputMode="numeric" min={0} step={1000} value={(f.pricePerNight as number) ?? ''} onChange={(e) => set('pricePerNight', numOrUndef(e.target.value))} />
              </Field>
              <Field label="Capacidad (personas)">
                <input className="input font-normal" type="number" min={1} value={(f.capacity as number) ?? ''} onChange={(e) => set('capacity', numOrUndef(e.target.value))} />
              </Field>
              <Field label="Camas">
                <input className="input font-normal" type="number" min={1} value={(f.beds as number) ?? ''} onChange={(e) => set('beds', numOrUndef(e.target.value))} />
              </Field>
              <Field label="Espacios compartidos">
                <select className="input font-normal" value={f.shared ? 'si' : 'no'} onChange={(e) => set('shared', e.target.value === 'si')}>
                  <option value="no">No</option>
                  <option value="si">Sí</option>
                </select>
              </Field>
            </>
          )}
          <Field label="Orden en los listados" hint="Número más bajo = aparece antes">
            <input className="input font-normal" type="number" value={(f.order as number) ?? 100} onChange={(e) => set('order', Number(e.target.value) || 0)} />
          </Field>
          {isExp && (
            <Field label="Destacada en el home">
              <select className="input font-normal" value={f.featured ? 'si' : 'no'} onChange={(e) => set('featured', e.target.value === 'si')}>
                <option value="no">No</option>
                <option value="si">Sí</option>
              </select>
            </Field>
          )}
        </div>
      </Panel>

      <Panel title="Fotos">
        <div className="grid gap-5">
          <ImageInput label="Foto principal" value={str('image')} onChange={(v) => set('image', v)} />
          <div>
            <span className="mb-2 block text-sm font-bold">Galería</span>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {gallery.map((g, i) => (
                <li key={g + i} className="group relative aspect-square overflow-hidden rounded-lg bg-marino">
                  <img src={previewPic(data, g)?.src} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => set('gallery', gallery.filter((_, j) => j !== i))} className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-white/90 font-bold" aria-label="Quitar foto">
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-3">
              <ImageInput value="" onChange={(v) => v && set('gallery', [...gallery, v])} />
            </div>
          </div>
        </div>
      </Panel>

      <Panel title={isExp ? 'Detalles' : 'Comodidades'}>
        <div className="grid gap-5">
          {isExp ? (
            <>
              <Field label="Incluye">
                <ListInput value={arr('includes')} onChange={(v) => set('includes', v)} placeholder="Ej: Chaleco salvavidas" />
              </Field>
              <Field label="Qué llevar">
                <ListInput value={arr('bring')} onChange={(v) => set('bring', v)} placeholder="Ej: Protector solar" />
              </Field>
              <Field label="Temporadas">
                <ListInput value={arr('seasons')} onChange={(v) => set('seasons', v)} placeholder="Ej: Verano" />
              </Field>
              <div>
                <span className="mb-2 block text-sm font-bold">Itinerario</span>
                <ol className="grid gap-3">
                  {((f.itinerary as { title: string; description: string }[]) ?? []).map((it, i, all) => (
                    <li key={i} className="grid gap-2 rounded-xl bg-niebla p-3 sm:grid-cols-[1fr_2fr_auto]">
                      <input className="input" value={it.title} placeholder="Paso" onChange={(e) => set('itinerary', all.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} aria-label={`Paso ${i + 1}`} />
                      <input className="input" value={it.description} placeholder="Descripción" onChange={(e) => set('itinerary', all.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} aria-label={`Descripción del paso ${i + 1}`} />
                      <Btn variant="danger" onClick={() => set('itinerary', all.filter((_, j) => j !== i))}>
                        Quitar
                      </Btn>
                    </li>
                  ))}
                </ol>
                <Btn variant="ghost" className="mt-3" onClick={() => set('itinerary', [...((f.itinerary as unknown[]) ?? []), { title: '', description: '' }])}>
                  Agregar paso
                </Btn>
              </div>
            </>
          ) : (
            <ListInput value={arr('amenities')} onChange={(v) => set('amenities', v)} placeholder="Ej: Tinaja privada" />
          )}
        </div>
      </Panel>

      <Panel title="Descripción completa">
        <textarea className="input w-full font-normal" rows={10} value={body} onChange={(e) => (setBody(e.target.value), setDirty(true))} />
        <p className="mt-2 text-xs text-gris">Separa los párrafos con una línea en blanco. **texto** queda en negrita.</p>
      </Panel>
    </div>
  );
}

const NEW: Record<Col, F> = {
  experiencias: { title: '', summary: '', category: 'trekking', destinos: [], duration: '', difficulty: 'Baja', priceUnit: 'persona', includes: [], bring: [], itinerary: [], image: '', gallery: [], featured: false, order: 100, seasons: ['Todo el año'] },
  alojamientos: { title: '', summary: '', destino: '', location: '', pricePerNight: undefined, capacity: 2, beds: 1, shared: false, amenities: [], image: '', gallery: [], wpSlug: 'panel', order: 100 },
};

export default function Fichas() {
  const { data } = useAdmin();
  const [col, setCol] = useState<Col>('experiencias');
  const [open, setOpen] = useState<{ ficha: Ficha; isNew: boolean } | null>(null);
  const list = data.fichas[col];
  const price = useMemo(() => (x: Ficha) => (col === 'experiencias' ? (x.data.priceFrom ? clp(x.data.priceFrom as number) : 'Consultar') : `${clp(x.data.pricePerNight as number)} / noche`), [col]);

  if (open) return <Editor key={open.ficha.id} col={col} ficha={open.ficha} isNew={open.isNew} onClose={() => (setOpen(null), scrollTo(0, 0))} />;
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(['experiencias', 'alojamientos'] as Col[]).map((c) => (
            <button key={c} type="button" aria-pressed={col === c} onClick={() => setCol(c)} className="rounded-full px-4 py-2 text-sm font-bold capitalize ring-1 ring-roca aria-pressed:bg-marino aria-pressed:text-white">
              {c}
            </button>
          ))}
        </div>
        <Btn onClick={() => setOpen({ ficha: { id: '', data: { ...NEW[col] }, body: '' }, isNew: true })}>Nueva {col === 'experiencias' ? 'experiencia' : 'ficha de alojamiento'}</Btn>
      </div>
      {!list.length ? (
        <Empty>Sin fichas.</Empty>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((x) => (
            <li key={x.id}>
              <button type="button" onClick={() => setOpen({ ficha: x, isNew: false })} className="flex w-full items-center gap-4 rounded-2xl bg-white p-3 text-left ring-1 ring-roca hover:ring-naranja">
                <span className="h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-marino">
                  {previewPic(data, x.data.image as string) && <img src={previewPic(data, x.data.image as string)!.src} alt="" className="h-full w-full object-cover" />}
                </span>
                <span className="min-w-0">
                  <span className="line-clamp-2 block font-display font-extrabold leading-tight">{x.data.title as string}</span>
                  <span className="mt-1 block text-sm text-gris">{price(x)}</span>
                  {Boolean(x.data.featured) && <span className="mt-1 inline-block rounded-full bg-naranja/15 px-2 py-0.5 text-xs font-bold text-naranja-700">Destacada</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm text-gris">Los cambios publicados aparecen en el sitio en 1 a 3 minutos. Esta lista se actualiza después de cada publicación del sitio.</p>
    </div>
  );
}
