// Barra de estado horizontal del panel: título, estado en vivo, fecha y hora en tiempo real, tema claro/oscuro y cerrar sesión.
import { useEffect, useState } from 'react';
import { cls } from './lib';

const CLAVE = 'ta-admin-tema';
type Tema = 'claro' | 'oscuro';

const temaGuardado = (): Tema => {
  try {
    const t = localStorage.getItem(CLAVE);
    if (t === 'claro' || t === 'oscuro') return t;
  } catch {
    /* sin almacenamiento */
  }
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
};

export function useTema() {
  const [tema, setTema] = useState<Tema>(temaGuardado);
  useEffect(() => {
    document.documentElement.classList.toggle('admin-dark', tema === 'oscuro');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', tema === 'oscuro' ? '#0d1722' : '#192a3d');
    try {
      localStorage.setItem(CLAVE, tema);
    } catch {
      /* sin almacenamiento */
    }
  }, [tema]);
  return { tema, alternar: () => setTema((t) => (t === 'oscuro' ? 'claro' : 'oscuro')) };
}

function Reloj() {
  const [t, setT] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const fecha = t.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, '');
  const hora = t.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  return (
    <time dateTime={t.toISOString()} className="flex items-center gap-2 whitespace-nowrap font-semibold tabular-nums" title="Fecha y hora de este dispositivo">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" className="hidden text-gris sm:block">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
      <span className="hidden capitalize text-gris md:inline">{fecha}</span>
      <span className="font-display text-base font-extrabold">{hora}</span>
    </time>
  );
}

const barra = 'inline-flex min-h-10 items-center gap-2 rounded-full px-2.5 sm:px-3 text-sm font-bold ring-1 ring-roca hover:bg-niebla';

export function StatusBar({
  title,
  email,
  live,
  conDb,
  onRefresh,
  onMenu,
  tema,
  onTema,
  cerrar,
}: {
  title: string;
  email: string;
  live: 'conectando' | 'en-vivo' | 'sin-conexion';
  conDb: boolean;
  onRefresh: () => void;
  onMenu: () => void;
  tema: Tema;
  onTema: () => void;
  cerrar: () => void;
}) {
  const oscuro = tema === 'oscuro';
  return (
    <header className="sticky top-0 z-20 -mx-4 mb-6 bg-niebla/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 rounded-2xl bg-white px-3 py-2 sm:gap-x-3 ring-1 ring-roca sm:px-4" role="region" aria-label="Barra de estado">
        <button type="button" onClick={onMenu} className="grid h-10 w-10 place-items-center rounded-full ring-1 ring-roca lg:hidden" aria-label="Abrir menú">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <h1 className="order-1 min-w-0 flex-1 basis-24 truncate font-display text-xl font-extrabold sm:text-2xl">{title}</h1>

        {conDb && (
          <button type="button" onClick={onRefresh} aria-label={live === 'en-vivo' ? 'En vivo' : live === 'conectando' ? 'Conectando' : 'Sin conexión'} title="Se actualiza solo. Toca para actualizar ahora." className={cls(barra, 'px-2.5 text-xs sm:px-3')}>
            <span className={cls('h-2.5 w-2.5 rounded-full', live === 'en-vivo' ? 'animate-pulse bg-[#1f9d55]' : live === 'conectando' ? 'bg-naranja' : 'bg-red-600')} aria-hidden="true" />
            <span className="hidden sm:inline">{live === 'en-vivo' ? 'En vivo' : live === 'conectando' ? 'Conectando…' : 'Sin conexión'}</span>
          </button>
        )}

        <span className="hidden h-6 w-px bg-roca sm:block" aria-hidden="true" />
        <Reloj />
        <span className="hidden h-6 w-px bg-roca sm:block" aria-hidden="true" />

        <button type="button" onClick={onTema} className={barra} aria-pressed={oscuro} title={oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}>
          {oscuro ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
            </svg>
          )}
          <span className="hidden lg:inline">{oscuro ? 'Tema claro' : 'Tema oscuro'}</span>
        </button>

        <button type="button" onClick={cerrar} className={barra} title={`Cerrar sesión (${email})`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 4H5a1 1 0 00-1 1v14a1 1 0 001 1h4M16 8l4 4-4 4M20 12H9" />
          </svg>
          <span className="hidden lg:inline">Cerrar sesión</span>
        </button>
      </div>
    </header>
  );
}
