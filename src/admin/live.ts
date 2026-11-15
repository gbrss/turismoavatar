// Tiempo real del panel: consulta /api/admin/pulse cada pocos segundos (cada 30 s con la pestaña oculta),
// detecta qué cambió y avisa con aviso en pantalla, sonido y notificación del navegador.
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './lib';

export interface Pulse {
  ok: boolean;
  bookings: number;
  chats: number;
  leads: number;
  subs: number;
  log: number;
  media: number;
  ultimaReserva: { code: string; name: string; item_title: string; people: number; date: string } | null;
  ultimoChat: { id: number; question: string; handoff: number; page: string; session_id: string | null } | null;
}
export interface Rev {
  bookings: number;
  chats: number;
  leads: number;
  subs: number;
  media: number;
}
export type Area = 'reservas' | 'cami' | 'mensajes';
export interface Aviso {
  area: Area;
  title: string;
  body: string;
  important: boolean;
}

const VISIBLE_MS = 4000;
const HIDDEN_MS = 30000;

/** Sonido corto generado (sin archivos): dos notas suaves. */
export function chime() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    [880, 1318.5].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      const t = ctx.currentTime + i * 0.16;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.4);
    });
    setTimeout(() => ctx.close(), 1000);
  } catch {
    /* sin audio */
  }
}

export function useLive(enabled: boolean, onAviso: (a: Aviso) => void) {
  const [rev, setRev] = useState<Rev>({ bookings: 0, chats: 0, leads: 0, subs: 0, media: 0 });
  const [estado, setEstado] = useState<'conectando' | 'en-vivo' | 'sin-conexion'>('conectando');
  const last = useRef<Pulse | null>(null);
  const cb = useRef(onAviso);
  cb.current = onAviso;

  const refrescar = useCallback(() => setRev((r) => ({ bookings: r.bookings + 1, chats: r.chats + 1, leads: r.leads + 1, subs: r.subs + 1, media: r.media + 1 })), []);

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout>;
    let running = false;
    let stopped = false;

    const tick = async () => {
      if (running || stopped) return;
      running = true;
      clearTimeout(timer);
      try {
        const p = await api<Pulse>('/api/admin/pulse');
        setEstado(p.ok ? 'en-vivo' : 'sin-conexion');
        const prev = last.current;
        last.current = p;
        if (prev && p.ok) {
          const log = p.log !== prev.log;
          const ch = {
            bookings: p.bookings !== prev.bookings || log,
            chats: p.chats !== prev.chats,
            leads: p.leads !== prev.leads || log,
            subs: p.subs !== prev.subs,
            media: p.media !== prev.media || log,
          };
          if (Object.values(ch).some(Boolean)) {
            setRev((r) => ({
              bookings: r.bookings + Number(ch.bookings),
              chats: r.chats + Number(ch.chats),
              leads: r.leads + Number(ch.leads),
              subs: r.subs + Number(ch.subs),
              media: r.media + Number(ch.media),
            }));
          }
          if (p.bookings > prev.bookings && p.ultimaReserva) {
            const r = p.ultimaReserva;
            cb.current({ area: 'reservas', title: 'Nueva reserva', body: `${r.name} · ${r.item_title} · ${r.people} ${r.people === 1 ? 'persona' : 'personas'}`, important: true });
          }
          if (p.chats > prev.chats && p.ultimoChat) {
            const c = p.ultimoChat;
            const nueva = !prev.ultimoChat || prev.ultimoChat.session_id !== c.session_id || !c.session_id;
            if (c.handoff) cb.current({ area: 'cami', title: 'Cami derivó a WhatsApp', body: c.question, important: true });
            else if (nueva) cb.current({ area: 'cami', title: 'Nueva conversación con Cami', body: c.question, important: false });
          }
          if (p.leads > prev.leads) cb.current({ area: 'mensajes', title: 'Nuevo mensaje del sitio', body: 'Revisa la sección Mensajes', important: true });
        }
      } catch {
        setEstado('sin-conexion');
      } finally {
        running = false;
        if (!stopped) timer = setTimeout(tick, document.hidden ? HIDDEN_MS : VISIBLE_MS);
      }
    };

    const onVisible = () => !document.hidden && tick();
    const onOnline = () => tick();
    tick();
    document.addEventListener('visibilitychange', onVisible);
    addEventListener('online', onOnline);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      removeEventListener('online', onOnline);
    };
  }, [enabled]);

  return { rev, estado, refrescar };
}

/** Recarga silenciosa cuando cambia `rev` (sin volver a mostrar "cargando"). */
export function useSilentReload(rev: number, load: () => void) {
  const first = useRef(true);
  const fn = useRef(load);
  fn.current = load;
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    fn.current();
  }, [rev]);
}
