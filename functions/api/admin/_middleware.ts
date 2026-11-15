import type { Env } from '../../../server/lib';
import { authorize, type AdminUser } from '../../../server/admin';

export const onRequest: PagesFunction<Env, string, { user: AdminUser }> = async ({ request, env, next, data }) => {
  const user = await authorize(request, env);
  if (user instanceof Response) return user;
  // Las escrituras deben venir del propio panel (protección CSRF)
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const origin = request.headers.get('origin');
    if (origin && new URL(origin).host !== new URL(request.url).host) return new Response('Origen no permitido', { status: 403 });
  }
  data.user = user;
  return next();
};
