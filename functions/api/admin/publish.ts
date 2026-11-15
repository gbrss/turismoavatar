import type { Env } from '../../../server/lib';
import { adminJson, audit, github, type AdminUser } from '../../../server/admin';
import { targetPath, toMarkdown, validate, type Coleccion } from '../../../server/content';

type Ctx = EventContext<Env, string, { user: AdminUser }>;
interface Body {
  target: string;
  data?: unknown; // home: datos del editor visual
  frontmatter?: Record<string, unknown>; // fichas
  body?: string;
  remove?: boolean;
  message?: string;
}

// Publicar = guardar el archivo en GitHub. Cloudflare Pages detecta el cambio y reconstruye el sitio (1-3 min).
export const onRequestPost = async ({ request, env, data }: Ctx) => {
  const gh = github(env);
  if (!gh) return adminJson({ error: 'Falta el secreto GITHUB_TOKEN para publicar.' }, 503);
  const b = (await request.json()) as Body;
  const path = targetPath(b.target ?? '');
  if (!path) return adminJson({ error: 'Destino inválido' }, 400);
  const who = data.user.email;
  try {
    let commit: { sha: string; html_url?: string } | null;
    if (b.remove) {
      if (b.target === 'home') return adminJson({ error: 'El home no se puede eliminar' }, 400);
      commit = await gh.remove(path, `Panel: elimina ${b.target} (${who})`);
    } else if (b.target === 'home') {
      const page = b.data as { content?: unknown[]; root?: unknown };
      if (!page || !Array.isArray(page.content)) return adminJson({ error: 'Contenido inválido' }, 400);
      commit = await gh.write(path, JSON.stringify({ root: page.root ?? { props: {} }, content: page.content, zones: {} }, null, 2) + '\n', b.message || `Panel: actualiza el home (${who})`, who);
    } else {
      const col = b.target.split('/')[0] as Coleccion;
      const fm = { ...(b.frontmatter ?? {}) };
      const err = validate(col, fm);
      if (err) return adminJson({ error: err }, 400);
      commit = await gh.write(path, toMarkdown(fm, b.body ?? ''), b.message || `Panel: actualiza ${b.target} (${who})`, who);
    }
    await env.DB?.prepare('DELETE FROM cms_drafts WHERE key = ?1').bind(b.target).run();
    await audit(env, data.user, b.remove ? 'eliminar' : 'publicar', `${b.target} ${commit?.sha ?? ''}`);
    return adminJson({ ok: true, sha: commit?.sha, url: commit?.html_url });
  } catch (e) {
    return adminJson({ error: `No se pudo publicar: ${(e as Error).message}` }, 502);
  }
};

// Estado del build en Cloudflare Pages para un commit publicado
export const onRequestGet = async ({ request, env }: Ctx) => {
  const gh = github(env);
  const sha = new URL(request.url).searchParams.get('sha') ?? '';
  if (!gh || !/^[0-9a-f]{40}$/.test(sha)) return adminJson({ state: 'desconocido' });
  return adminJson(await gh.deployStatus(sha));
};
