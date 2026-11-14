import { type Env, json, bad, readBody, clean, isEmail, rateLimited } from '../../server/lib';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (await rateLimited(request, 'newsletter', 5, 600)) return bad('Demasiados intentos. Intenta en unos minutos.', 429);
  const body = await readBody(request);
  if (body.website) return json({ ok: true });
  const email = clean(body.email, 160).toLowerCase();
  if (!isEmail(email)) return bad('Revisa tu correo electrónico.');
  if (env.DB) {
    await env.DB.prepare('INSERT OR IGNORE INTO subscribers (email, source) VALUES (?1, ?2)').bind(email, request.headers.get('referer')).run();
  }
  return json({ ok: true });
};
