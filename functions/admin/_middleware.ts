import type { Env } from '../../server/lib';
import { authorize } from '../../server/admin';

// Protege la interfaz del panel (/admin). Con Cloudflare Access, Access ya pide el correo antes de llegar aquí.
export const onRequest: PagesFunction<Env> = async ({ request, env, next }) => {
  const user = await authorize(request, env);
  if (user instanceof Response) return user;
  const res = await next();
  const out = new Response(res.body, res);
  out.headers.set('x-robots-tag', 'noindex, nofollow');
  out.headers.set('cache-control', 'no-store');
  return out;
};
