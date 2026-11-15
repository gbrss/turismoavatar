import type { Env } from '../../../server/lib';
import { adminJson, type AdminUser } from '../../../server/admin';

type Ctx = EventContext<Env, string, { user: AdminUser }>;

// Mensajes de contacto, empresas y proveedores + suscriptores del newsletter
export const onRequestGet = async ({ request, env }: Ctx) => {
  if (!env.DB) return adminJson({ error: 'Falta la base de datos D1 (binding DB).' }, 503);
  const tipo = new URL(request.url).searchParams.get('tipo');
  if (tipo === 'suscriptores') {
    const { results } = await env.DB.prepare('SELECT * FROM subscribers ORDER BY created_at DESC LIMIT 2000').all();
    return adminJson({ items: results });
  }
  const { results } = await env.DB.prepare('SELECT * FROM leads ORDER BY created_at DESC LIMIT 500').all();
  return adminJson({ items: results });
};

export const onRequestPatch = async ({ request, env }: Ctx) => {
  if (!env.DB) return adminJson({ error: 'Sin base de datos' }, 503);
  const { id, status } = (await request.json()) as { id: number; status: string };
  if (!['nuevo', 'respondido', 'archivado'].includes(status)) return adminJson({ error: 'Estado inválido' }, 400);
  await env.DB.prepare('UPDATE leads SET status = ?1 WHERE id = ?2').bind(status, id).run();
  return adminJson({ ok: true });
};
