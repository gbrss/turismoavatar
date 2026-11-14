import type { Env } from '../../server/lib';

// Protege /admin/* con autenticación básica. Usuario: admin · Contraseña: secreto ADMIN_PASSWORD.
export const onRequest: PagesFunction<Env> = async ({ request, env, next }) => {
  if (!env.ADMIN_PASSWORD) return new Response('Configura el secreto ADMIN_PASSWORD para usar el panel.', { status: 503 });
  const auth = request.headers.get('authorization') ?? '';
  const [scheme, encoded] = auth.split(' ');
  if (scheme === 'Basic' && encoded) {
    const [user, pass] = atob(encoded).split(':');
    const enc = new TextEncoder();
    const a = enc.encode(`${user}:${pass}`);
    const b = enc.encode(`admin:${env.ADMIN_PASSWORD}`);
    if (a.byteLength === b.byteLength && crypto.subtle.timingSafeEqual(a, b)) return next();
  }
  return new Response('Acceso restringido', { status: 401, headers: { 'www-authenticate': 'Basic realm="Turismo Avatar admin", charset="UTF-8"' } });
};
