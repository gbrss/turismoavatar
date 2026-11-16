import type { Env } from '../../server/lib';

// Sirve fotos y videos subidos desde el panel (R2), con soporte de rangos para que el video se pueda adelantar.
export const onRequestGet: PagesFunction<Env, 'path'> = async ({ request, env, params, waitUntil }) => {
  const key = (Array.isArray(params.path) ? params.path.join('/') : params.path) ?? '';
  if (!env.MEDIA || !/^[a-z0-9]{6,20}(\/\d{2,4}\.webp|\.(mp4|webm))$/.test(key)) return new Response('No encontrado', { status: 404 });
  // Las fotos (sin rangos) se guardan en la caché del borde de Cloudflare: así casi no se llama a R2
  const cache = (caches as unknown as { default: Cache }).default;
  const cacheable = !request.headers.has('range');
  if (cacheable) {
    const hit = await cache.match(request);
    if (hit) return hit;
  }
  const obj = await env.MEDIA.get(key, { range: request.headers, onlyIf: request.headers });
  if (!obj) return new Response('No encontrado', { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('accept-ranges', 'bytes');
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  if (!('body' in obj) || !obj.body) return new Response(null, { status: 304, headers });
  const range = obj.range as { offset?: number; length?: number } | undefined;
  if (range && request.headers.has('range')) {
    const start = range.offset ?? 0;
    const end = start + (range.length ?? obj.size - start) - 1;
    headers.set('content-range', `bytes ${start}-${end}/${obj.size}`);
    headers.set('content-length', String(end - start + 1));
    return new Response(obj.body, { status: 206, headers });
  }
  headers.set('content-length', String(obj.size));
  const res = new Response(obj.body, { headers });
  if (cacheable && !key.endsWith('.mp4') && !key.endsWith('.webm')) waitUntil(cache.put(request, res.clone()));
  return res;
};
