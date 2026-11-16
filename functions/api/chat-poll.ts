import { type Env, json, rateLimited, tomaActiva } from '../../server/lib';

// El chat del sitio pregunta aquí si una persona tomó la conversación y si hay mensajes nuevos.
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (await rateLimited(request, 'chat-poll', 400, 600)) return json({ error: 'Demasiadas consultas' }, 429);
  const u = new URL(request.url).searchParams;
  const session = u.get('session') ?? '';
  const after = Math.max(0, Number(u.get('after')) || 0);
  const toma = await tomaActiva(env, session);
  let messages: { id: number; author: string; body: string }[] = [];
  if (env.DB && /^[\w-]{8,40}$/.test(session)) {
    messages = (await env.DB.prepare('SELECT id, author, body FROM chat_staff_msgs WHERE session_id = ?1 AND id > ?2 ORDER BY id LIMIT 20').bind(session, after).all().catch(() => ({ results: [] }))).results as typeof messages;
  }
  return json({ human: toma ? { agent: toma.agent } : null, messages }, 200, { 'cache-control': 'no-store' });
};
