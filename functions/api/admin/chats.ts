import type { Env } from '../../../server/lib';
import { clean } from '../../../server/lib';
import { adminJson, type AdminUser } from '../../../server/admin';

type Ctx = EventContext<Env, string, { user: AdminUser }>;

// Conversaciones con Cami: lista agrupada por sesión, detalle de una conversación y preguntas más frecuentes.
export const onRequestGet = async ({ request, env }: Ctx) => {
  if (!env.DB) return adminJson({ error: 'Falta la base de datos D1 (binding DB).' }, 503);
  const u = new URL(request.url).searchParams;
  const session = u.get('sesion');
  if (session) {
    const col = session.startsWith('msg-') ? 'id' : 'session_id';
    const val = session.startsWith('msg-') ? Number(session.slice(4)) : session;
    const { results } = await env.DB.prepare(`SELECT id, created_at, page, question, answer, engine, handoff, country FROM chat_logs WHERE ${col} = ?1 ORDER BY id`).bind(val).all();
    return adminJson({ items: results });
  }
  const dias = Math.min(Number(u.get('dias')) || 30, 365);
  const q = clean(u.get('q'), 80);
  const filtro = [`created_at >= datetime('now', '-${dias} days')`];
  const args: unknown[] = [];
  if (q) {
    args.push(`%${q}%`);
    filtro.push('(question LIKE ?1 OR answer LIKE ?1)');
  }
  if (u.get('humano') === '1') filtro.push('handoff = 1');
  const where = filtro.join(' AND ');
  // Mensajes antiguos (sin sesión) se muestran como conversaciones de un mensaje
  const { results } = await env.DB.prepare(
    `SELECT COALESCE(session_id, 'msg-' || id) sesion, MIN(created_at) inicio, MAX(created_at) fin, COUNT(*) mensajes,
            MAX(handoff) humano, MIN(page) pagina, MAX(country) pais,
            (SELECT question FROM chat_logs c2 WHERE COALESCE(c2.session_id, 'msg-' || c2.id) = COALESCE(chat_logs.session_id, 'msg-' || chat_logs.id) ORDER BY id LIMIT 1) primera
       FROM chat_logs WHERE ${where}
      GROUP BY sesion ORDER BY fin DESC LIMIT 300`,
  )
    .bind(...args)
    .all();
  const resumen = await env.DB.prepare(
    `SELECT COUNT(*) mensajes, COUNT(DISTINCT COALESCE(session_id, 'msg-' || id)) conversaciones, SUM(handoff) derivadas
       FROM chat_logs WHERE created_at >= datetime('now', '-${dias} days')`,
  ).first();
  const top = await env.DB.prepare(
    `SELECT lower(trim(question)) pregunta, COUNT(*) n FROM chat_logs WHERE created_at >= datetime('now', '-${dias} days')
      GROUP BY pregunta HAVING n > 1 ORDER BY n DESC LIMIT 12`,
  ).all();
  return adminJson({ items: results, resumen, top: top.results });
};
