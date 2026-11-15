// Panel de administración de Turismo Avatar.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { lazy, Suspense } from 'react';
import { clp } from '@/blocks/core';
import { AdminCtx, useAdmin, api, Empty, Loading, Panel, cls, fmtDate, type AdminData, type CmsItem, type Me } from './lib';
import Bookings, { BookingCard, type Booking } from './Bookings';
import Chats from './Chats';
import Leads from './Leads';
import Fichas from './Fichas';
import MediaLibrary from './Media';
import { chime, useLive, useSilentReload, type Area, type Aviso } from './live';

// El editor visual es pesado: se descarga solo al abrirlo
const HomeEditor = lazy(() => import('./HomeEditor'));

const ICONS: Record<string, ReactNode> = {
  inicio: <path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" />,
  reservas: <path d="M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1zM8 12h3M8 16h6" />,
  cami: <path d="M4 5h16v11H9l-5 4zM8 9h8M8 12h5" />,
  mensajes: <path d="M3 6l9 7 9-7M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1z" />,
  editor: <path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4" />,
  fichas: <path d="M5 4h14v16H5zM9 8h6M9 12h6M9 16h3" />,
  fotos: <path d="M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4M15 9h.01" />,
};
const NAV = [
  ['inicio', 'Resumen'],
  ['reservas', 'Reservas'],
  ['cami', 'Conversaciones Cami'],
  ['mensajes', 'Mensajes'],
  ['editor', 'Editar home'],
  ['fichas', 'Experiencias y alojamientos'],
  ['fotos', 'Fotos y videos'],
] as const;
type Ruta = (typeof NAV)[number][0];

const routeFromHash = (): Ruta => {
  const r = location.hash.replace(/^#\/?/, '') as Ruta;
  return NAV.some(([k]) => k === r) ? r : 'inicio';
};

function Icon({ name }: { name: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

function Dashboard({ go }: { go: (r: Ruta) => void }) {
  const { me, rev } = useAdmin();
  const [b, setB] = useState<{ items: Booking[]; stats: { status: string; n: number; total: number; mes: number }[]; proximas: number } | null>(null);
  const [c, setC] = useState<{ resumen: { conversaciones: number; derivadas: number } } | null>(null);
  const loadB = () => api<NonNullable<typeof b>>('/api/admin/bookings?estado=pendiente&limite=5').then(setB).catch(() => {});
  const loadC = () => api<NonNullable<typeof c>>('/api/admin/chats?dias=30').then(setC).catch(() => {});
  useEffect(() => {
    if (!me.servicios.db) return;
    loadB();
    loadC();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);
  useSilentReload(rev.bookings, loadB);
  useSilentReload(rev.chats, loadC);
  const stat = (s: string) => b?.stats.find((x) => x.status === s);
  const mes = b?.stats.reduce((a, x) => a + x.mes, 0);
  const pagado = (stat('pagada')?.total ?? 0) + (stat('confirmada')?.total ?? 0);
  const faltan = Object.entries(me.servicios).filter(([k, v]) => !v && k !== 'ai');

  return (
    <div className="grid gap-6">
      {faltan.length > 0 && (
        <Panel title="Falta terminar la configuración" className="ring-2 ring-naranja">
          <ul className="list-disc pl-5 text-gris">
            {!me.servicios.db && <li>Base de datos D1: sin ella no se guardan reservas, conversaciones ni borradores.</li>}
            {!me.servicios.media && <li>Almacenamiento R2: necesario para subir fotos y videos nuevos.</li>}
            {!me.servicios.github && <li>Token de GitHub: necesario para publicar cambios del editor.</li>}
          </ul>
          <p className="mt-2 text-sm text-gris">Los pasos están en el archivo ADMIN.md del proyecto.</p>
        </Panel>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Pendientes por confirmar', stat('pendiente')?.n ?? 0, 'reservas'],
          ['Próximas salidas confirmadas', b?.proximas ?? 0, 'reservas'],
          ['Solicitudes últimos 30 días', mes ?? 0, 'reservas'],
          ['Conversaciones con Cami (30 días)', c?.resumen.conversaciones ?? 0, 'cami'],
        ].map(([l, v, r]) => (
          <button key={l as string} type="button" onClick={() => go(r as Ruta)} className="rounded-2xl bg-white p-5 text-left ring-1 ring-roca hover:ring-naranja">
            <span className="block text-sm font-bold text-gris">{l}</span>
            <span className="mt-1 block font-display text-4xl font-extrabold">{me.servicios.db ? (b ? v : '…') : '—'}</span>
          </button>
        ))}
      </div>
      {pagado > 0 && <p className="text-sm text-gris">Valor estimado de reservas confirmadas y pagadas: <strong className="text-tinta">{clp(pagado)}</strong></p>}
      <Panel title="Por confirmar" actions={<button type="button" onClick={() => go('reservas')} className="text-sm font-bold text-cielo-700">Ver todas</button>}>
        {!me.servicios.db ? (
          <Empty>Conecta D1 para ver aquí las reservas.</Empty>
        ) : !b ? (
          <Loading />
        ) : b.items.length ? (
          <div className="grid gap-3">
            {b.items.map((x) => (
              <BookingCard key={x.code} b={x} onChange={(nb) => setB((o) => o && { ...o, items: o.items.map((i) => (i.code === nb.code ? nb : i)) })} />
            ))}
          </div>
        ) : (
          <Empty>No hay reservas pendientes. 🎉</Empty>
        )}
      </Panel>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['editor', 'Editar el home', 'Textos, fotos, video de portada y orden de las secciones.'],
          ['fichas', 'Precios y fichas', 'Experiencias y alojamientos: precios, fotos e itinerarios.'],
          ['fotos', 'Subir fotos', 'Se optimizan solas para que el sitio siga rápido.'],
        ].map(([r, t, d]) => (
          <button key={r} type="button" onClick={() => go(r as Ruta)} className="rounded-2xl bg-marino p-5 text-left text-white hover:bg-marino-900">
            <span className="block font-display text-lg font-extrabold">{t}</span>
            <span className="mt-1 block text-sm text-white/75">{d}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AdminApp() {
  const [ruta, setRuta] = useState<Ruta>(routeFromHash);
  const [data, setData] = useState<AdminData | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [media, setMedia] = useState<CmsItem[]>([]);
  const [error, setError] = useState('');
  const [toasts, setToasts] = useState<{ id: number; msg: string; tipo: 'ok' | 'error' | 'aviso'; title?: string; href?: string }[]>([]);
  const [menu, setMenu] = useState(false);
  const [nuevos, setNuevos] = useState<Record<Area, number>>({ reservas: 0, cami: 0, mensajes: 0 });
  const [sinVer, setSinVer] = useState(0);
  const [permiso, setPermiso] = useState<NotificationPermission | 'no'>(() => ('Notification' in window ? Notification.permission : 'no'));

  useEffect(() => {
    const on = () => (setRuta(routeFromHash()), setMenu(false));
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);

  const reloadMedia = useCallback(async () => {
    const r = await api<{ items: CmsItem[] }>('/api/admin/media').catch(() => ({ items: [] }));
    setMedia(r.items);
  }, []);

  useEffect(() => {
    Promise.all([fetch('/admin/data.json', { credentials: 'same-origin' }).then((r) => r.json()), api<Me>('/api/admin/me')])
      .then(([d, m]) => (setData(d), setMe(m)))
      .catch((e) => setError(e.message));
    reloadMedia();
  }, [reloadMedia]);

  const toast = useCallback((msg: string, tipo: 'ok' | 'error' = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, tipo }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tipo === 'error' ? 7000 : 3500);
  }, []);

  // Tiempo real: avisos de reservas, conversaciones con Cami y mensajes nuevos
  const rutaRef = useRef(ruta);
  rutaRef.current = ruta;
  const onAviso = useCallback((a: Aviso) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, msg: a.body, title: a.title, tipo: 'aviso', href: `#/${a.area}` }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 9000);
    if (rutaRef.current !== a.area || document.hidden) setNuevos((n) => ({ ...n, [a.area]: n[a.area] + 1 }));
    if (document.hidden) setSinVer((n) => n + 1);
    if (a.important) chime();
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const n = new Notification(a.title, { body: a.body, icon: '/icon-192.png', tag: `${a.area}-${id}` });
        n.onclick = () => (window.focus(), (location.hash = `/${a.area}`), n.close());
      } catch {
        /* algunos móviles no permiten notificaciones fuera de un service worker */
      }
    }
  }, []);
  const { rev, estado: live, refrescar } = useLive(Boolean(me?.servicios.db), onAviso);
  useSilentReload(rev.media, () => reloadMedia());

  useEffect(() => {
    if (ruta === 'reservas' || ruta === 'cami' || ruta === 'mensajes') setNuevos((n) => ({ ...n, [ruta]: 0 }));
  }, [ruta]);
  useEffect(() => {
    const on = () => !document.hidden && setSinVer(0);
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  useEffect(() => {
    document.title = `${sinVer ? `(${sinVer}) ` : ''}Panel · Turismo Avatar`;
  }, [sinVer]);

  const go = (r: Ruta) => (location.hash = `/${r}`);

  if (error) return <p className="p-8 text-red-700">No se pudo abrir el panel: {error}</p>;
  if (!data || !me) return <Loading />;
  const value = { data, me, media, reloadMedia, toast, rev };
  const title = NAV.find(([k]) => k === ruta)![1];

  return (
    <AdminCtx.Provider value={value}>
      {ruta === 'editor' ? (
        <Suspense fallback={<Loading />}>
          <HomeEditor />
        </Suspense>
      ) : (
        <div className="min-h-dvh lg:grid lg:grid-cols-[17rem_1fr]">
          <aside className={cls('fixed inset-y-0 left-0 z-40 w-72 bg-marino text-white transition-transform lg:static lg:w-auto lg:translate-x-0', menu ? 'translate-x-0' : '-translate-x-full')}>
            <div className="flex h-full flex-col p-4">
              <a href="#/" className="flex items-center gap-3 px-2 py-3">
                <img src="/icon-192.png" alt="" width="40" height="40" className="h-10 w-10" />
                <span>
                  <span className="block font-display font-extrabold leading-tight">Turismo Avatar</span>
                  <span className="block text-xs text-white/60">Panel de administración</span>
                </span>
              </a>
              <nav className="mt-4 grid gap-1" aria-label="Secciones del panel">
                {NAV.map(([k, label]) => (
                  <a key={k} href={`#/${k}`} aria-current={ruta === k ? 'page' : undefined} className="flex items-center gap-3 rounded-xl px-3 py-2.5 font-semibold text-white/80 hover:bg-white/10 hover:text-white aria-[current=page]:bg-naranja aria-[current=page]:text-marino">
                    <Icon name={k} />
                    <span className="flex-1">{label}</span>
                    {k in nuevos && nuevos[k as Area] > 0 && (
                      <span className="grid h-6 min-w-6 place-items-center rounded-full bg-naranja px-1.5 text-xs font-extrabold text-marino" aria-label={`${nuevos[k as Area]} nuevos`}>
                        {nuevos[k as Area]}
                      </span>
                    )}
                  </a>
                ))}
              </nav>
              <div className="mt-auto grid gap-2 border-t border-white/10 px-2 pt-4 text-sm">
                {permiso === 'default' && (
                  <button
                    type="button"
                    onClick={() => Notification.requestPermission().then((p) => (setPermiso(p), p === 'granted' && toast('Avisos activados: te avisaremos de reservas y conversaciones nuevas')))}
                    className="rounded-xl bg-white/10 px-3 py-2 text-left font-bold text-white hover:bg-white/15"
                  >
                    🔔 Activar avisos en este dispositivo
                  </button>
                )}
                <a href="/" target="_blank" rel="noopener" className="font-bold text-naranja">
                  Ver el sitio ↗
                </a>
                <span className="truncate text-white/60" title={me.email}>
                  {me.email}
                </span>
                {me.via === 'access' && (
                  <a href="/cdn-cgi/access/logout" className="text-white/60 hover:text-white">
                    Cerrar sesión
                  </a>
                )}
                <span className="text-[11px] text-white/40">Sitio publicado: {fmtDate(data.builtAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </aside>
          {menu && <button type="button" aria-label="Cerrar menú" className="fixed inset-0 z-30 bg-marino-900/50 lg:hidden" onClick={() => setMenu(false)} />}
          <main className="min-w-0 px-4 pb-16 sm:px-8">
            <header className="sticky top-0 z-20 -mx-4 mb-6 flex items-center gap-3 bg-niebla/95 px-4 py-4 backdrop-blur sm:-mx-8 sm:px-8">
              <button type="button" onClick={() => setMenu(true)} className="grid h-10 w-10 place-items-center rounded-full bg-white ring-1 ring-roca lg:hidden" aria-label="Abrir menú">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              </button>
              <h1 className="flex-1 font-display text-2xl font-extrabold">{title}</h1>
              {me.servicios.db && (
                <button type="button" onClick={refrescar} title="Se actualiza solo. Toca para actualizar ahora." className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold ring-1 ring-roca">
                  <span className={cls('h-2.5 w-2.5 rounded-full', live === 'en-vivo' ? 'animate-pulse bg-[#1f9d55]' : live === 'conectando' ? 'bg-naranja' : 'bg-red-600')} aria-hidden="true" />
                  {live === 'en-vivo' ? 'En vivo' : live === 'conectando' ? 'Conectando…' : 'Sin conexión'}
                </button>
              )}
            </header>
            {ruta === 'inicio' && <Dashboard go={go} />}
            {ruta === 'reservas' && <Bookings />}
            {ruta === 'cami' && <Chats />}
            {ruta === 'mensajes' && <Leads />}
            {ruta === 'fichas' && <Fichas />}
            {ruta === 'fotos' && <MediaLibrary />}
          </main>
        </div>
      )}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[2000] grid justify-items-center gap-2 px-4" aria-live="polite">
        {toasts.map((t) =>
          t.tipo === 'aviso' ? (
            <a key={t.id} href={t.href} className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl bg-white p-4 text-left shadow-2xl ring-2 ring-naranja">
              <span className="mt-1 h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-naranja" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block font-display font-extrabold">{t.title}</span>
                <span className="line-clamp-2 block text-sm text-gris">{t.msg}</span>
              </span>
            </a>
          ) : (
            <p key={t.id} className={cls('pointer-events-auto max-w-md rounded-full px-5 py-3 text-sm font-bold shadow-xl', t.tipo === 'error' ? 'bg-red-700 text-white' : 'bg-marino text-white')}>
              {t.msg}
            </p>
          ),
        )}
      </div>
    </AdminCtx.Provider>
  );
}
