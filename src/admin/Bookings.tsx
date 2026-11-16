// Reservas: filtros, edición, eliminación, cambio de estado, notas internas, contacto directo y exportación a Excel.
import { useEffect, useRef, useState } from 'react';
import { clp } from '@/blocks/core';
import { api, Btn, Empty, Loading, Panel, STATUS, cls, fmtDate, fmtDateTime, useAdmin, useDebounced, waLink } from './lib';
import { useSilentReload } from './live';

export interface Booking {
  code: string;
  created_at: string;
  kind: string;
  item_slug: string;
  item_title: string;
  date: string;
  date_end: string | null;
  people: number;
  name: string;
  email: string;
  phone: string;
  notes: string | null;
  estimated_total: number | null;
  status: string;
  country: string | null;
  admin_notes: string | null;
}

const TIPOS: Record<string, string> = { experiencia: 'Experiencia', alojamiento: 'Alojamiento', programa: 'Programa', cotizacion: 'Cotización' };

export function BookingCard({ b, onChange, onDelete, nueva }: { b: Booking; onChange: (b: Booking) => void; onDelete?: (code: string) => void; nueva?: boolean }) {
  const { toast } = useAdmin();
  const [modo, setModo] = useState<'ver' | 'editar' | 'borrar'>('ver');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ item_title: b.item_title, name: b.name, email: b.email, phone: b.phone, date: b.date, date_end: b.date_end ?? '', people: String(b.people), estimated_total: b.estimated_total != null ? String(b.estimated_total) : '', notes: b.notes ?? '' });
  const abrirEdicion = () => {
    setForm({ item_title: b.item_title, name: b.name, email: b.email, phone: b.phone, date: b.date, date_end: b.date_end ?? '', people: String(b.people), estimated_total: b.estimated_total != null ? String(b.estimated_total) : '', notes: b.notes ?? '' });
    setModo('editar');
  };
  const guardar = async () => {
    setBusy(true);
    try {
      const r = await api<{ item: Booking }>('/api/admin/bookings', { method: 'PATCH', body: JSON.stringify({ code: b.code, ...form, date_end: form.date_end || null, estimated_total: form.estimated_total === '' ? null : Number(form.estimated_total) }) });
      onChange(r.item);
      setModo('ver');
      toast(`Reserva ${b.code} actualizada`);
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };
  const eliminar = async () => {
    setBusy(true);
    try {
      await api(`/api/admin/bookings?code=${encodeURIComponent(b.code)}`, { method: 'DELETE' });
      toast(`Reserva ${b.code} eliminada`);
      onDelete?.(b.code);
    } catch (e) {
      toast((e as Error).message, 'error');
      setBusy(false);
    }
  };
  const campo = (k: keyof typeof form) => ({ value: form[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value })) });
  const [notes, setNotes] = useState(b.admin_notes ?? '');
  const editing = useRef(false);
  // Si otra persona cambia las notas, se actualizan (salvo que las estés escribiendo)
  useEffect(() => {
    if (!editing.current) setNotes(b.admin_notes ?? '');
  }, [b.admin_notes]);
  const patch = async (body: Partial<Booking>) => {
    try {
      const r = await api<{ item: Booking }>('/api/admin/bookings', { method: 'PATCH', body: JSON.stringify({ code: b.code, ...body }) });
      onChange(r.item);
      if (body.status) toast(`Reserva ${b.code}: ${STATUS[body.status].label.toLowerCase()}`);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };
  const when = b.date_end ? `${fmtDate(b.date)} al ${fmtDate(b.date_end)}` : fmtDate(b.date, { weekday: 'short', day: 'numeric', month: 'short' });
  const msg = `Hola ${b.name.split(' ')[0]} 👋 Te escribimos de Turismo Avatar por tu solicitud ${b.code}: ${b.item_title}, ${when}, ${b.people} ${b.people === 1 ? 'persona' : 'personas'}.`;
  return (
    <article className={cls('rounded-2xl bg-white p-5 ring-1 transition-shadow duration-700', nueva ? 'ring-2 ring-naranja shadow-[0_0_0_6px_rgb(255_140_0/0.15)]' : 'ring-roca')}>
      {nueva && <p className="mb-2 inline-block rounded-full bg-naranja px-2.5 py-0.5 text-xs font-extrabold text-marino">Nueva</p>}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-gris">
            {b.code} · {TIPOS[b.kind] ?? b.kind} · recibida {fmtDateTime(b.created_at)}
          </p>
          <h3 className="mt-1 font-display text-lg font-extrabold leading-tight">{b.item_title}</h3>
          <p className="mt-1 font-semibold">
            {when} · {b.people} {b.people === 1 ? 'persona' : 'personas'}
            {b.estimated_total ? ` · ${clp(b.estimated_total)} aprox.` : ''}
          </p>
        </div>
        <label className="sr-only" htmlFor={`st-${b.code}`}>
          Estado
        </label>
        <select
          id={`st-${b.code}`}
          value={b.status}
          onChange={(e) => patch({ status: e.target.value })}
          className={cls('rounded-full border-0 px-3 py-2 text-sm font-bold', STATUS[b.status]?.cls)}
        >
          {Object.entries(STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-4 grid gap-4 border-t border-roca pt-4 sm:grid-cols-[1fr_1fr]">
        <div>
          <p className="font-bold">{b.name}</p>
          <p className="text-sm text-gris">
            {b.phone} · {b.email}
            {b.country ? ` · ${b.country}` : ''}
          </p>
          {b.notes && <p className="mt-2 rounded-lg bg-niebla px-3 py-2 text-sm">“{b.notes}”</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={waLink(b.phone, msg)} target="_blank" rel="noopener" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#157a3e] px-4 text-sm font-bold text-white hover:bg-[#0f6331]">
              WhatsApp
            </a>
            <a href={`mailto:${b.email}?subject=${encodeURIComponent(`Tu reserva ${b.code} — Turismo Avatar`)}`} className="inline-flex min-h-10 items-center rounded-full px-4 text-sm font-bold ring-1 ring-roca hover:bg-niebla">
              Correo
            </a>
          </div>
        </div>
        <label className="grid gap-1.5 text-sm font-bold">
          Notas internas (solo las ve el equipo)
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onFocus={() => (editing.current = true)}
            onBlur={() => {
              editing.current = false;
              if (notes !== (b.admin_notes ?? '')) patch({ admin_notes: notes });
            }}
            rows={3}
            placeholder="Ej: pagó abono por transferencia, punto de encuentro confirmado…"
            className="input font-normal"
          />
        </label>
      </div>

      {modo === 'ver' && (
        <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-roca pt-4">
          <Btn variant="ghost" onClick={abrirEdicion}>
            Editar reserva
          </Btn>
          <Btn variant="danger" onClick={() => setModo('borrar')}>
            Eliminar
          </Btn>
        </div>
      )}

      {modo === 'editar' && (
        <form
          className="mt-4 grid gap-3 border-t border-roca pt-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            guardar();
          }}
        >
          <p className="font-display text-base font-extrabold sm:col-span-2">Editar reserva {b.code}</p>
          <label className="grid gap-1 text-sm font-bold sm:col-span-2">
            Qué se reservó
            <input className="input font-normal" required maxLength={160} {...campo('item_title')} />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Nombre del cliente
            <input className="input font-normal" required maxLength={120} {...campo('name')} />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Teléfono
            <input className="input font-normal" required type="tel" maxLength={30} {...campo('phone')} />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Correo
            <input className="input font-normal" required type="email" maxLength={160} {...campo('email')} />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Personas
            <input className="input font-normal" required type="number" min={1} max={200} {...campo('people')} />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Fecha
            <input className="input font-normal" required type="date" {...campo('date')} />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Fecha de término <span className="font-normal text-gris">(opcional, para alojamientos)</span>
            <input className="input font-normal" type="date" {...campo('date_end')} />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Valor aproximado en pesos <span className="font-normal text-gris">(opcional)</span>
            <input className="input font-normal" type="number" min={0} step={1} inputMode="numeric" {...campo('estimated_total')} />
          </label>
          <label className="grid gap-1 text-sm font-bold sm:col-span-2">
            Comentarios del cliente
            <textarea className="input font-normal" rows={3} maxLength={1500} {...campo('notes')} />
          </label>
          <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
            <Btn variant="ghost" onClick={() => setModo('ver')} disabled={busy}>
              Cancelar
            </Btn>
            <Btn type="submit" disabled={busy}>
              {busy ? 'Guardando…' : 'Guardar cambios'}
            </Btn>
          </div>
        </form>
      )}

      {modo === 'borrar' && (
        <div role="alertdialog" aria-label="Confirmar eliminación" className="mt-4 rounded-xl bg-red-50 p-4 ring-1 ring-red-200">
          <p className="font-bold text-red-800">
            ¿Eliminar la reserva {b.code} de {b.name}?
          </p>
          <p className="mt-1 text-sm text-red-800/80">Se borra para siempre y no se puede deshacer. Si solo quieres dejarla de lado, cámbiale el estado a “Cancelada”.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Btn variant="ghost" onClick={() => setModo('ver')} disabled={busy}>
              No, conservar
            </Btn>
            <Btn variant="dark" className="!bg-red-700 hover:!bg-red-800" onClick={eliminar} disabled={busy}>
              {busy ? 'Eliminando…' : 'Sí, eliminar'}
            </Btn>
          </div>
        </div>
      )}
    </article>
  );
}

export default function Bookings() {
  const { me, rev } = useAdmin();
  const [nuevas, setNuevas] = useState<Set<string>>(new Set());
  const vistos = useRef<Set<string> | null>(null);
  const [items, setItems] = useState<Booking[] | null>(null);
  const [error, setError] = useState('');
  const [estado, setEstado] = useState('');
  const [tipo, setTipo] = useState('');
  const [q, setQ] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [orden, setOrden] = useState<'recientes' | 'fecha'>('recientes');
  const dq = useDebounced(q, 350);
  const params = new URLSearchParams(Object.entries({ estado, tipo, q: dq, desde, hasta, orden }).filter(([, v]) => v) as [string, string][]);

  const load = (silent = false) => {
    if (!silent) setItems(null);
    api<{ items: Booking[] }>(`/api/admin/bookings?${params}`)
      .then((r) => {
        setItems(r.items);
        setError('');
        // Resalta las reservas que llegaron mientras el panel estaba abierto
        if (silent && vistos.current) {
          const llegadas = r.items.filter((x) => !vistos.current!.has(x.code)).map((x) => x.code);
          if (llegadas.length) {
            setNuevas((n) => new Set([...n, ...llegadas]));
            setTimeout(() => setNuevas((n) => new Set([...n].filter((c) => !llegadas.includes(c)))), 20000);
          }
        }
        vistos.current = new Set([...(vistos.current ?? []), ...r.items.map((x) => x.code)]);
      })
      .catch((e) => !silent && (setError(e.message), setItems([])));
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.toString()]);
  useSilentReload(rev.bookings, () => load(true));

  if (!me.servicios.db) return <Empty>Conecta la base de datos D1 para ver las reservas (ver ADMIN.md). Mientras tanto siguen llegando por correo y WhatsApp.</Empty>;
  return (
    <div className="grid gap-5">
      <Panel>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Estado">
          {[['', 'Todas'], ...Object.entries(STATUS).map(([k, v]) => [k, v.label])].map(([k, label]) => (
            <button key={k} type="button" aria-pressed={estado === k} onClick={() => setEstado(k)} className="rounded-full px-4 py-2 text-sm font-bold ring-1 ring-roca aria-pressed:bg-marino aria-pressed:text-white aria-pressed:ring-marino">
              {label}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
          <input className="input" placeholder="Buscar nombre, teléfono, código…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
          <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Tipo">
            <option value="">Todos los tipos</option>
            {Object.entries(TIPOS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <input className="input" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} aria-label="Fecha del tour desde" title="Fecha del tour desde" />
          <input className="input" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} aria-label="Fecha del tour hasta" title="Fecha del tour hasta" />
          <select className="input" value={orden} onChange={(e) => setOrden(e.target.value as 'recientes')} aria-label="Orden">
            <option value="recientes">Más recientes</option>
            <option value="fecha">Por fecha del tour</option>
          </select>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gris">{items ? `${items.length} ${items.length === 1 ? 'reserva' : 'reservas'}` : ' '}</p>
          <a href={`/api/admin/bookings?${params}&formato=csv&limite=2000`} className="inline-flex min-h-10 items-center rounded-full px-4 text-sm font-bold ring-1 ring-roca hover:bg-niebla">
            Descargar Excel (CSV)
          </a>
        </div>
      </Panel>
      {error && <p className="text-red-700">{error}</p>}
      {!items ? (
        <Loading />
      ) : items.length ? (
        items.map((b) => <BookingCard key={b.code} b={b} nueva={nuevas.has(b.code)} onChange={(nb) => setItems((l) => l!.map((x) => (x.code === nb.code ? nb : x)))} onDelete={(c) => setItems((l) => l!.filter((x) => x.code !== c))} />)
      ) : (
        <Empty>No hay reservas con esos filtros.</Empty>
      )}
      {items && items.length >= 200 && (
        <Btn variant="ghost" onClick={() => alert('Usa los filtros de fecha para ver reservas más antiguas.')}>
          ¿Buscas reservas más antiguas?
        </Btn>
      )}
    </div>
  );
}
