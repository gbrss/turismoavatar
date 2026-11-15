import type { Env } from '../../../server/lib';
import { adminJson, type AdminUser } from '../../../server/admin';

// Pulso del panel en tiempo real: el panel lo consulta cada pocos segundos y solo recarga lo que cambió.
// Son consultas O(1) (MAX de la clave), así casi no consumen lecturas de D1 aunque el panel quede abierto todo el día.
export const onRequestGet: PagesFunction<Env, string, { user: AdminUser }> = async ({ env }) => {
  if (!env.DB) return adminJson({ ok: false });
  const q = (sql: string) => env.DB!.prepare(sql);
  const r = await env.DB.batch([
    q('SELECT MAX(rowid) v FROM bookings'),
    q('SELECT MAX(id) v FROM chat_logs'),
    q('SELECT MAX(id) v FROM leads'),
    q('SELECT MAX(rowid) v FROM subscribers'),
    q('SELECT MAX(id) v FROM admin_log'),
    q('SELECT MAX(rowid) v FROM cms_media'),
    // Última reserva y último chat, para avisar sin otra consulta
    q('SELECT code, name, item_title, people, date FROM bookings WHERE rowid = (SELECT MAX(rowid) FROM bookings)'),
    q('SELECT id, question, handoff, page, session_id FROM chat_logs WHERE id = (SELECT MAX(id) FROM chat_logs)'),
  ]);
  const v = (i: number) => (r[i].results[0] as { v: number | null } | undefined)?.v ?? 0;
  return adminJson({
    ok: true,
    at: Date.now(),
    bookings: v(0),
    chats: v(1),
    leads: v(2),
    subs: v(3),
    log: v(4),
    media: v(5),
    ultimaReserva: r[6].results[0] ?? null,
    ultimoChat: r[7].results[0] ?? null,
  });
};
