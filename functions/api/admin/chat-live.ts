import { type Env, clean, TOMA_MIN } from '../../../server/lib';
import { adminJson, audit, type AdminUser } from '../../../server/admin';

type Ctx = EventContext<Env, string, { user: AdminUser }>;

// Atención en vivo: tomar una conversación de Cami, escribirle al cliente y devolverla a Cami.
export const onRequestPost = async ({ request, env, data }: Ctx) => {
  if (!env.DB) return adminJson({ error: 'Falta la base de datos D1 (binding DB).' }, 503);
  const b = (await request.json().catch(() => ({}))) as { sesion?: string; accion?: string; texto?: string; nombre?: string };
  const sesion = b.sesion ?? '';
  if (!/^[\w-]{8,40}$/.test(sesion)) return adminJson({ error: 'Esta conversación es antigua y no se puede atender en vivo.' }, 400);
  const activa = `released_at IS NULL AND last_at >= datetime('now', '-${TOMA_MIN} minutes')`;

  if (b.accion === 'tomar') {
    const nombre = clean(b.nombre, 30) || data.user.email.split('@')[0];
    const ocupada = await env.DB.prepare(`SELECT agent, email FROM chat_takeovers WHERE session_id = ?1 AND ${activa}`).bind(sesion).first<{ agent: string; email: string }>();
    if (ocupada && ocupada.email !== data.user.email) return adminJson({ error: `${ocupada.agent} ya está atendiendo esta conversación.` }, 409);
    await env.DB.prepare(
      `INSERT INTO chat_takeovers (session_id, agent, email) VALUES (?1, ?2, ?3)
       ON CONFLICT(session_id) DO UPDATE SET agent = ?2, email = ?3, taken_at = datetime('now'), last_at = datetime('now'), released_at = NULL`,
    ).bind(sesion, nombre, data.user.email).run();
    await audit(env, data.user, 'chat.tomar', sesion);
    return adminJson({ ok: true });
  }

  if (b.accion === 'nombre') {
    const nombre = clean(b.nombre, 30);
    if (!nombre) return adminJson({ error: 'Escribe un nombre.' }, 400);
    await env.DB.prepare(`UPDATE chat_takeovers SET agent = ?2 WHERE session_id = ?1 AND email = ?3 AND ${activa}`).bind(sesion, nombre, data.user.email).run();
    return adminJson({ ok: true });
  }

  if (b.accion === 'soltar') {
    await env.DB.prepare(`UPDATE chat_takeovers SET released_at = datetime('now') WHERE session_id = ?1 AND released_at IS NULL`).bind(sesion).run();
    await audit(env, data.user, 'chat.soltar', sesion);
    return adminJson({ ok: true });
  }

  if (b.accion === 'enviar') {
    const texto = clean(b.texto, 800);
    if (!texto) return adminJson({ error: 'Escribe un mensaje.' }, 400);
    const t = await env.DB.prepare(`SELECT agent, email FROM chat_takeovers WHERE session_id = ?1 AND ${activa}`).bind(sesion).first<{ agent: string; email: string }>();
    if (!t) return adminJson({ error: 'La conversación volvió a Cami (pasaron más de 20 minutos). Tómala de nuevo para seguir.' }, 409);
    if (t.email !== data.user.email) return adminJson({ error: `${t.agent} está atendiendo esta conversación.` }, 409);
    await env.DB.batch([
      env.DB.prepare('INSERT INTO chat_staff_msgs (session_id, author, body) VALUES (?1, ?2, ?3)').bind(sesion, t.agent, texto),
      env.DB.prepare(`UPDATE chat_takeovers SET last_at = datetime('now') WHERE session_id = ?1`).bind(sesion),
    ]);
    return adminJson({ ok: true });
  }
  return adminJson({ error: 'Acción desconocida' }, 400);
};
