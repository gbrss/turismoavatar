import type { Env } from '../../../../server/lib';
import { adminJson, type AdminUser } from '../../../../server/admin';

type Ctx = EventContext<Env, 'key', { user: AdminUser }>;
const keyOf = (p: string | string[] | undefined) => {
  const k = (Array.isArray(p) ? p.join('/') : p ?? '').toLowerCase();
  return /^(home|(experiencias|alojamientos)\/[a-z0-9-]{1,80})$/.test(k) ? k : null;
};

// Borradores: el editor guarda solo cada pocos segundos; nada se ve en el sitio hasta publicar.
export const onRequestGet = async ({ params, env }: Ctx) => {
  const key = keyOf(params.key);
  if (!key) return adminJson({ error: 'Clave inválida' }, 400);
  if (!env.DB) return adminJson({ draft: null });
  const row = await env.DB.prepare('SELECT data, updated_at, updated_by FROM cms_drafts WHERE key = ?1').bind(key).first<{ data: string; updated_at: string; updated_by: string }>();
  return adminJson({ draft: row ? { data: JSON.parse(row.data), updated_at: row.updated_at, updated_by: row.updated_by } : null });
};

export const onRequestPut = async ({ params, env, request, data }: Ctx) => {
  const key = keyOf(params.key);
  if (!key) return adminJson({ error: 'Clave inválida' }, 400);
  if (!env.DB) return adminJson({ error: 'Sin base de datos: el borrador no se guardó' }, 503);
  const text = await request.text();
  if (text.length > 900_000) return adminJson({ error: 'Contenido demasiado grande' }, 413);
  JSON.parse(text);
  await env.DB.prepare(
    `INSERT INTO cms_drafts (key, data, updated_at, updated_by) VALUES (?1, ?2, datetime('now'), ?3)
     ON CONFLICT(key) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
  )
    .bind(key, text, data.user.email)
    .run();
  return adminJson({ ok: true, updated_at: new Date().toISOString() });
};

export const onRequestDelete = async ({ params, env }: Ctx) => {
  const key = keyOf(params.key);
  if (key && env.DB) await env.DB.prepare('DELETE FROM cms_drafts WHERE key = ?1').bind(key).run();
  return adminJson({ ok: true });
};
