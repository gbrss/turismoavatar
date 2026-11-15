import type { Env } from '../../../server/lib';
import { adminJson, github, type AdminUser } from '../../../server/admin';
import { targetPath } from '../../../server/content';

type Ctx = EventContext<Env, string, { user: AdminUser }>;

// Versiones publicadas de un contenido (historial de GitHub) y lectura de una versión para restaurarla.
export const onRequestGet = async ({ request, env }: Ctx) => {
  const gh = github(env);
  if (!gh) return adminJson({ items: [], error: 'Falta GITHUB_TOKEN' });
  const u = new URL(request.url).searchParams;
  const path = targetPath(u.get('target') ?? '');
  if (!path) return adminJson({ error: 'Destino inválido' }, 400);
  const sha = u.get('sha');
  try {
    if (sha) {
      if (!/^[0-9a-f]{40}$/.test(sha)) return adminJson({ error: 'Versión inválida' }, 400);
      const file = await gh.read(path, sha);
      return adminJson({ text: file?.text ?? null });
    }
    // Contenido publicado actual (puede ser más nuevo que el último build)
    if (u.get('actual') === '1') {
      const file = await gh.read(path);
      return adminJson({ text: file?.text ?? null });
    }
    return adminJson({ items: await gh.history(path) });
  } catch (e) {
    return adminJson({ error: (e as Error).message }, 502);
  }
};
