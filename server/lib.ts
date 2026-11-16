// Utilidades compartidas por las Cloudflare Pages Functions.
export interface Env {
  DB?: D1Database;
  AI?: Ai;
  ASSETS: Fetcher;
  SITE_NAME?: string;
  WHATSAPP_NUMBER?: string;
  NOTIFY_EMAIL?: string;
  MAIL_FROM?: string;
  RESEND_API_KEY?: string;
  TURNSTILE_SECRET?: string;
  ADMIN_PASSWORD?: string;
  AI_MODEL?: string;
  /** Fotos y videos subidos desde el panel */
  MEDIA?: R2Bucket;
  /** Cloudflare Access: equipo (ej. turismoavatar.cloudflareaccess.com) y AUD de la aplicación */
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  /** Publicación: token de GitHub con permiso Contents (lectura/escritura) sobre el repo */
  GITHUB_TOKEN?: string;
  GITHUB_REPO?: string;
  GITHUB_BRANCH?: string;
}

export interface Catalog {
  site: { name: string; assistant: string; phone: string; whatsapp: string; email: string; address: string; city: string; region: string; hours: string; foundingYear: number };
  experiencias: { slug: string; url: string; title: string; category: string; destinos: string[]; summary: string; duration: string; difficulty: string; price: string; minAge?: number; meetingPoint?: string; includes: string[] }[];
  alojamientos: { slug: string; url: string; title: string; location: string; pricePerNight: number; capacity: number; amenities: string[] }[];
  programas: { slug: string; url: string; title: string; days: number; nights?: number; price: string; summary: string }[];
  tienda: { name: string; price: number; url: string }[];
  rally: { url: string; ultimaEdicion: string; paquetes: { name: string; price: number; unit: string }[]; nota: string };
  destinos: { slug: string; name: string; url: string; summary: string }[];
  faq: { q: string; a: string }[];
}

export const json = (data: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });

export const bad = (error: string, status = 400) => json({ error }, status);

export async function readBody(request: Request): Promise<Record<string, string>> {
  const type = request.headers.get('content-type') ?? '';
  if (type.includes('application/json')) return (await request.json()) as Record<string, string>;
  const form = await request.formData();
  const out: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (typeof v === 'string') out[k] = v;
  return out;
}

export const clean = (v: unknown, max = 500) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
export const cleanMultiline = (v: unknown, max = 3000) => String(v ?? '').replace(/\r/g, '').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ').trim().slice(0, max);
export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
export const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
export const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export const clp = (n: number) => '$' + Math.round(n).toLocaleString('es-CL');

let catalogCache: { at: number; data: Catalog } | null = null;
export async function getCatalog(env: Env, request: Request): Promise<Catalog> {
  if (catalogCache && Date.now() - catalogCache.at < 5 * 60_000) return catalogCache.data;
  const res = await env.ASSETS.fetch(new URL('/catalogo.json', request.url));
  const data = (await res.json()) as Catalog;
  catalogCache = { at: Date.now(), data };
  return data;
}

/** Verifica Cloudflare Turnstile si hay secreto configurado. Sin secreto, deja pasar (el honeypot sigue activo). */
export async function verifyTurnstile(env: Env, token: string | undefined, ip: string | null) {
  if (!env.TURNSTILE_SECRET) return true;
  if (!token) return false;
  const body = new FormData();
  body.append('secret', env.TURNSTILE_SECRET);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const out = (await res.json()) as { success: boolean };
  return out.success;
}

/** Envía un email con Resend (https://resend.com). Sin RESEND_API_KEY no hace nada. */
export async function sendEmail(env: Env, msg: { to: string | string[]; subject: string; html: string; replyTo?: string }) {
  if (!env.RESEND_API_KEY) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: env.MAIL_FROM ?? 'Turismo Avatar <reservas@turismoavatar.cl>',
        to: Array.isArray(msg.to) ? msg.to : [msg.to],
        subject: msg.subject,
        html: msg.html,
        ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function emailLayout(title: string, rows: [string, string][], footer = '') {
  return `<!doctype html><html><body style="margin:0;background:#eef2ef;font-family:Arial,sans-serif;color:#13201f">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
  <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden">
  <tr><td style="background:#0e3b43;color:#fff;padding:20px 24px;font-size:20px;font-weight:bold">${esc(title)}</td></tr>
  <tr><td style="padding:20px 24px"><table width="100%" cellpadding="6" cellspacing="0">
  ${rows.map(([k, v]) => `<tr><td style="color:#55625f;width:140px;vertical-align:top">${esc(k)}</td><td style="font-weight:bold">${esc(v)}</td></tr>`).join('')}
  </table>${footer}</td></tr></table></td></tr></table></body></html>`;
}

export function bookingCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return 'TA-' + [...bytes].map((b) => alphabet[b % alphabet.length]).join('');
}

/** Límite simple por IP usando la Cache API del datacenter (sin dependencias). */
export async function rateLimited(request: Request, bucket: string, max: number, windowSec: number) {
  const ip = request.headers.get('cf-connecting-ip') ?? 'anon';
  const key = new Request(`https://rate.limit/${bucket}/${ip}`);
  const cache = (caches as unknown as { default: Cache }).default;
  const hit = await cache.match(key);
  const count = hit ? Number(await hit.text()) : 0;
  if (count >= max) return true;
  await cache.put(key, new Response(String(count + 1), { headers: { 'cache-control': `max-age=${windowSec}` } }));
  return false;
}

/** Minutos sin actividad de la persona tras los cuales Cami retoma la conversación. */
export const TOMA_MIN = 20;

/** Atención humana vigente para una conversación (null si responde Cami). */
export async function tomaActiva(env: Env, session: string | null | undefined): Promise<{ agent: string; taken_at: string } | null> {
  if (!env.DB || !session || !/^[\w-]{8,40}$/.test(session)) return null;
  try {
    return await env.DB.prepare(`SELECT agent, taken_at FROM chat_takeovers WHERE session_id = ?1 AND released_at IS NULL AND last_at >= datetime('now', '-${TOMA_MIN} minutes')`).bind(session).first();
  } catch {
    return null; // tabla aún no creada: Cami sigue respondiendo
  }
}
