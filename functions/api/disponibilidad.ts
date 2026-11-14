import { type Env, json } from '../../server/lib';

// Devuelve rangos ocupados de un alojamiento (reservas confirmadas o pagadas) para avisar en el formulario.
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const slug = new URL(request.url).searchParams.get('item') ?? '';
  if (!env.DB || !/^[a-z0-9-]{1,80}$/.test(slug)) return json({ blocked: [] }, 200, { 'cache-control': 'public, max-age=60' });
  const today = new Date().toISOString().slice(0, 10);
  const { results } = await env.DB.prepare(
    `SELECT date, date_end FROM bookings WHERE kind = 'alojamiento' AND item_slug = ?1 AND status IN ('confirmada','pagada') AND date_end >= ?2 ORDER BY date LIMIT 200`,
  )
    .bind(slug, today)
    .all<{ date: string; date_end: string }>();
  return json({ blocked: results.map((r) => [r.date, r.date_end]) }, 200, { 'cache-control': 'public, max-age=60' });
};
