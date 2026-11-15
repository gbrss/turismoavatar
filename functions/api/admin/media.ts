import type { Env } from '../../../server/lib';
import { clean } from '../../../server/lib';
import { adminJson, audit, type AdminUser } from '../../../server/admin';

type Ctx = EventContext<Env, string, { user: AdminUser }>;
const CMS_WIDTHS = [480, 960, 1440, 1920, 2400];
const newId = () => {
  const a = crypto.getRandomValues(new Uint8Array(8));
  return [...a].map((b) => b.toString(36).padStart(2, '0')).join('').slice(0, 12);
};

export const onRequestGet = async ({ env }: Ctx) => {
  if (!env.DB) return adminJson({ items: [] });
  const { results } = await env.DB.prepare('SELECT * FROM cms_media ORDER BY created_at DESC LIMIT 500').all();
  return adminJson({ items: results });
};

// Subida: el panel ya convirtió la foto a WebP en varios anchos (en el navegador), aquí solo se guardan en R2.
export const onRequestPost = async ({ request, env, data }: Ctx) => {
  if (!env.MEDIA) return adminJson({ error: 'Falta el bucket R2 (binding MEDIA) para subir archivos.' }, 503);
  const form = await request.formData();
  const kind = form.get('kind') === 'video' ? 'video' : 'image';
  const id = newId();
  const name = clean(form.get('name'), 120);
  const alt = clean(form.get('alt'), 200);
  const meta = { httpMetadata: { cacheControl: 'public, max-age=31536000, immutable' } };
  let key: string;
  let bytes = 0;
  let width: number | null = null;
  let height: number | null = null;

  if (kind === 'video') {
    const file = form.get('file');
    if (!(file instanceof File) || !/^video\/(mp4|webm)$/.test(file.type)) return adminJson({ error: 'Sube un video MP4.' }, 400);
    if (file.size > 60 * 1024 * 1024) return adminJson({ error: 'El video pesa más de 60 MB. Compártelo más liviano (720p, 10-20 s).' }, 413);
    const ext = file.type === 'video/webm' ? 'webm' : 'mp4';
    await env.MEDIA.put(`${id}.${ext}`, file.stream(), { httpMetadata: { ...meta.httpMetadata, contentType: file.type } });
    key = `cms-video/${id}.${ext}`;
    bytes = file.size;
  } else {
    width = Number(form.get('width'));
    height = Number(form.get('height'));
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 64 || width > 2400 || height < 64 || height > 4000) return adminJson({ error: 'Medidas inválidas' }, 400);
    const widths = [...CMS_WIDTHS.filter((x) => x < width!), width];
    for (const w of widths) {
      const f = form.get(`w${w}`);
      if (!(f instanceof File) || f.type !== 'image/webp' || f.size > 4 * 1024 * 1024) return adminJson({ error: `Falta la versión de ${w}px` }, 400);
      await env.MEDIA.put(`${id}/${w}.webp`, f.stream(), { httpMetadata: { ...meta.httpMetadata, contentType: 'image/webp' } });
      bytes += f.size;
    }
    key = `cms/${id}/${width}x${height}`;
  }
  await env.DB?.prepare('INSERT INTO cms_media (id, key, kind, name, alt, width, height, bytes, created_by) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)')
    .bind(id, key, kind, name, alt, width, height, bytes, data.user.email)
    .run();
  await audit(env, data.user, 'subir', key);
  return adminJson({ item: { id, key, kind, name, alt, width, height, bytes } });
};

export const onRequestPatch = async ({ request, env }: Ctx) => {
  const { id, alt } = (await request.json()) as { id: string; alt: string };
  await env.DB?.prepare('UPDATE cms_media SET alt = ?1 WHERE id = ?2').bind(clean(alt, 200), id).run();
  return adminJson({ ok: true });
};

export const onRequestDelete = async ({ request, env, data }: Ctx) => {
  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!/^[a-z0-9]{6,20}$/.test(id) || !env.MEDIA) return adminJson({ error: 'No encontrado' }, 404);
  const list = await env.MEDIA.list({ prefix: `${id}` });
  await Promise.all(list.objects.map((o) => env.MEDIA!.delete(o.key)));
  await env.DB?.prepare('DELETE FROM cms_media WHERE id = ?1').bind(id).run();
  await audit(env, data.user, 'borrar archivo', id);
  return adminJson({ ok: true });
};
