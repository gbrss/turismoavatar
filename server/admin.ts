// Panel de administración: autenticación (Cloudflare Access o contraseña de respaldo) y publicación vía GitHub.
import { type Env, json } from './lib';

export interface AdminUser {
  email: string;
  via: 'access' | 'password';
}

const b64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), (c) => c.charCodeAt(0));

let certs: { at: number; team: string; keys: (JsonWebKey & { kid: string })[] } | null = null;
async function accessKeys(team: string) {
  if (certs && certs.team === team && Date.now() - certs.at < 3600_000) return certs.keys;
  const res = await fetch(`https://${team}/cdn-cgi/access/certs`);
  const body = (await res.json()) as { keys: (JsonWebKey & { kid: string })[] };
  certs = { at: Date.now(), team, keys: body.keys };
  return body.keys;
}

/** Verifica el JWT que Cloudflare Access agrega a cada petición autenticada. */
async function verifyAccess(token: string, env: Env): Promise<string | null> {
  const team = env.CF_ACCESS_TEAM_DOMAIN!.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const [h, p, sig] = token.split('.');
  if (!h || !p || !sig) return null;
  const header = JSON.parse(new TextDecoder().decode(b64url(h))) as { kid: string; alg: string };
  const payload = JSON.parse(new TextDecoder().decode(b64url(p))) as { aud: string | string[]; exp: number; iss: string; email?: string };
  if (header.alg !== 'RS256') return null;
  const jwk = (await accessKeys(team)).find((k) => k.kid === header.kid);
  if (!jwk) return null;
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64url(sig), new TextEncoder().encode(`${h}.${p}`));
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!ok || !aud.includes(env.CF_ACCESS_AUD!) || payload.exp * 1000 < Date.now() || payload.iss !== `https://${team}`) return null;
  return payload.email ?? 'usuario';
}

export async function authorize(request: Request, env: Env): Promise<AdminUser | Response> {
  if (env.CF_ACCESS_TEAM_DOMAIN && env.CF_ACCESS_AUD) {
    const token = request.headers.get('cf-access-jwt-assertion') ?? '';
    const email = token ? await verifyAccess(token, env).catch(() => null) : null;
    if (email) return { email, via: 'access' };
    return new Response('Acceso restringido. Entra por https://www.turismoavatar.cl/admin con tu correo autorizado.', { status: 403 });
  }
  // Respaldo mientras no se configure Cloudflare Access: usuario "admin" + secreto ADMIN_PASSWORD
  if (env.ADMIN_PASSWORD) {
    const [scheme, encoded] = (request.headers.get('authorization') ?? '').split(' ');
    if (scheme === 'Basic' && encoded) {
      const [user, ...rest] = atob(encoded).split(':');
      const a = new TextEncoder().encode(`${user}:${rest.join(':')}`);
      const b = new TextEncoder().encode(`admin:${env.ADMIN_PASSWORD}`);
      if (a.byteLength === b.byteLength && crypto.subtle.timingSafeEqual(a, b)) return { email: 'admin', via: 'password' };
    }
    return new Response('Acceso restringido', { status: 401, headers: { 'www-authenticate': 'Basic realm="Turismo Avatar admin", charset="UTF-8"' } });
  }
  return new Response('Panel sin configurar: activa Cloudflare Access (CF_ACCESS_TEAM_DOMAIN y CF_ACCESS_AUD) o el secreto ADMIN_PASSWORD.', { status: 503 });
}

/* ───────────── GitHub (publicar = commit → Cloudflare Pages reconstruye el sitio) ───────────── */
const enc = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};
const dec = (b64: string) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\n/g, '')), (c) => c.charCodeAt(0)));

export function github(env: Env) {
  if (!env.GITHUB_TOKEN) return null;
  const repo = env.GITHUB_REPO ?? 'gbrss/turismoavatar';
  const branch = env.GITHUB_BRANCH ?? 'main';
  const api = (path: string, init: RequestInit = {}) =>
    fetch(`https://api.github.com/repos/${repo}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${env.GITHUB_TOKEN}`,
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
        'user-agent': 'turismoavatar-admin',
        ...(init.body ? { 'content-type': 'application/json' } : {}),
      },
    });
  return {
    repo,
    branch,
    async read(path: string, ref = branch): Promise<{ sha: string; text: string } | null> {
      const res = await api(`/contents/${path}?ref=${encodeURIComponent(ref)}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`GitHub ${res.status}`);
      const body = (await res.json()) as { sha: string; content: string };
      return { sha: body.sha, text: dec(body.content) };
    },
    async write(path: string, text: string, message: string, author: string) {
      const current = await this.read(path).catch(() => null);
      const res = await api(`/contents/${path}`, {
        method: 'PUT',
        body: JSON.stringify({
          message,
          content: enc(text),
          branch,
          ...(current ? { sha: current.sha } : {}),
          committer: { name: 'Panel Turismo Avatar', email: 'panel@turismoavatar.cl' },
          author: { name: author, email: author.includes('@') ? author : 'panel@turismoavatar.cl' },
        }),
      });
      if (!res.ok) throw new Error(`GitHub ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const body = (await res.json()) as { commit: { sha: string; html_url: string } };
      return body.commit;
    },
    async remove(path: string, message: string) {
      const current = await this.read(path);
      if (!current) return null;
      const res = await api(`/contents/${path}`, { method: 'DELETE', body: JSON.stringify({ message, sha: current.sha, branch }) });
      if (!res.ok) throw new Error(`GitHub ${res.status}`);
      return ((await res.json()) as { commit: { sha: string } }).commit;
    },
    async history(path: string) {
      const res = await api(`/commits?path=${encodeURIComponent(path)}&sha=${branch}&per_page=30`);
      if (!res.ok) throw new Error(`GitHub ${res.status}`);
      const list = (await res.json()) as { sha: string; html_url: string; commit: { message: string; author: { name: string; date: string } } }[];
      return list.map((c) => ({ sha: c.sha, url: c.html_url, message: c.commit.message.split('\n')[0], author: c.commit.author.name, date: c.commit.author.date }));
    },
    /** Estado del build de Cloudflare Pages para un commit (check run que Pages reporta en GitHub). */
    async deployStatus(sha: string) {
      const res = await api(`/commits/${sha}/check-runs`);
      if (!res.ok) return { state: 'desconocido' as const };
      const body = (await res.json()) as { check_runs: { name: string; status: string; conclusion: string | null; details_url: string }[] };
      const run = body.check_runs.find((r) => /cloudflare|pages/i.test(r.name)) ?? body.check_runs[0];
      if (!run) return { state: 'esperando' as const };
      if (run.status !== 'completed') return { state: 'publicando' as const, url: run.details_url };
      return { state: run.conclusion === 'success' ? ('publicado' as const) : ('error' as const), url: run.details_url };
    },
  };
}

export const adminJson = (data: unknown, status = 200) => json(data, status, { 'x-robots-tag': 'noindex' });

export async function audit(env: Env, user: AdminUser, action: string, detail = '') {
  await env.DB?.prepare('INSERT INTO admin_log (email, action, detail) VALUES (?1, ?2, ?3)').bind(user.email, action, detail.slice(0, 500)).run().catch(() => {});
}
