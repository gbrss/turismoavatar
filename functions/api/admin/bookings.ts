import type { Env } from '../../../server/lib';
import { clean, cleanMultiline } from '../../../server/lib';
import { adminJson, audit, type AdminUser } from '../../../server/admin';

const STATUSES = ['pendiente', 'confirmada', 'pagada', 'cancelada'];
type Ctx = EventContext<Env, string, { user: AdminUser }>;

const csv = (rows: Record<string, unknown>[]) => {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return '﻿' + [cols.join(';'), ...rows.map((r) => cols.map((c) => q(r[c])).join(';'))].join('\r\n');
};

// Lista de reservas con filtros, totales por estado y exportación a Excel (CSV).
export const onRequestGet = async ({ request, env }: Ctx) => {
  if (!env.DB) return adminJson({ error: 'Falta la base de datos D1 (binding DB).' }, 503);
  const u = new URL(request.url).searchParams;
  const where: string[] = [];
  const args: unknown[] = [];
  const add = (sql: string, v: unknown) => {
    args.push(v);
    where.push(sql.replace('?', `?${args.length}`));
  };
  if (STATUSES.includes(u.get('estado') ?? '')) add('status = ?', u.get('estado'));
  if (u.get('tipo')) add('kind = ?', u.get('tipo'));
  if (u.get('desde')) add('date >= ?', u.get('desde'));
  if (u.get('hasta')) add('date <= ?', u.get('hasta'));
  const q = clean(u.get('q'), 80);
  if (q) {
    args.push(`%${q}%`);
    const n = args.length;
    where.push(`(name LIKE ?${n} OR email LIKE ?${n} OR phone LIKE ?${n} OR code LIKE ?${n} OR item_title LIKE ?${n})`);
  }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const order = u.get('orden') === 'fecha' ? 'date ASC' : 'created_at DESC';
  const limit = Math.min(Number(u.get('limite')) || 200, 2000);
  const { results } = await env.DB.prepare(`SELECT * FROM bookings ${w} ORDER BY ${order} LIMIT ${limit}`).bind(...args).all();
  if (u.get('formato') === 'csv') {
    return new Response(csv(results as Record<string, unknown>[]), {
      headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="reservas-${new Date().toISOString().slice(0, 10)}.csv"` },
    });
  }
  const today = new Date().toISOString().slice(0, 10);
  const stats = await env.DB.prepare(
    `SELECT status, COUNT(*) n, SUM(COALESCE(estimated_total,0)) total,
            SUM(CASE WHEN created_at >= datetime('now','-30 days') THEN 1 ELSE 0 END) mes
       FROM bookings GROUP BY status`,
  ).all<{ status: string; n: number; total: number; mes: number }>();
  const proximas = await env.DB.prepare(`SELECT COUNT(*) n FROM bookings WHERE date >= ?1 AND status IN ('confirmada','pagada')`).bind(today).first<{ n: number }>();
  return adminJson({ items: results, stats: stats.results, proximas: proximas?.n ?? 0 });
};

// Cambiar estado o notas internas de una reserva
export const onRequestPatch = async ({ request, env, data }: Ctx) => {
  if (!env.DB) return adminJson({ error: 'Sin base de datos' }, 503);
  const body = (await request.json()) as { code?: string; status?: string; admin_notes?: string };
  const code = clean(body.code, 40);
  if (!code) return adminJson({ error: 'Falta el código' }, 400);
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) return adminJson({ error: 'Estado inválido' }, 400);
    await env.DB.prepare(`UPDATE bookings SET status = ?1, updated_at = datetime('now') WHERE code = ?2`).bind(body.status, code).run();
    await audit(env, data.user, 'reserva.estado', `${code} → ${body.status}`);
  }
  if (body.admin_notes !== undefined) {
    await env.DB.prepare(`UPDATE bookings SET admin_notes = ?1, updated_at = datetime('now') WHERE code = ?2`).bind(cleanMultiline(body.admin_notes, 2000), code).run();
  }
  const row = await env.DB.prepare('SELECT * FROM bookings WHERE code = ?1').bind(code).first();
  return adminJson({ item: row });
};
