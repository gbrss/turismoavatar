import type { Env } from '../../../server/lib';
import { clean, cleanMultiline, isDate, isEmail } from '../../../server/lib';
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

// Editar una reserva: estado, notas internas o los datos de la reserva (cliente, fecha, personas, valor…)
export const onRequestPatch = async ({ request, env, data }: Ctx) => {
  if (!env.DB) return adminJson({ error: 'Sin base de datos' }, 503);
  const body = (await request.json()) as {
    code?: string; status?: string; admin_notes?: string;
    item_title?: string; name?: string; email?: string; phone?: string; date?: string; date_end?: string | null;
    people?: number | string; notes?: string | null; estimated_total?: number | string | null;
  };
  const code = clean(body.code, 40);
  if (!code) return adminJson({ error: 'Falta el código' }, 400);
  const existe = await env.DB.prepare('SELECT code FROM bookings WHERE code = ?1').bind(code).first();
  if (!existe) return adminJson({ error: 'Esa reserva ya no existe (puede que otra persona la haya eliminado).' }, 404);

  // Datos de la reserva (solo se tocan los campos que llegan)
  const sets: string[] = [];
  const args: unknown[] = [];
  const set = (col: string, v: unknown) => {
    args.push(v);
    sets.push(`${col} = ?${args.length}`);
  };
  if (body.item_title !== undefined) {
    const v = clean(body.item_title, 160);
    if (!v) return adminJson({ error: 'Escribe qué se reservó.' }, 400);
    set('item_title', v);
  }
  if (body.name !== undefined) {
    const v = clean(body.name, 120);
    if (!v) return adminJson({ error: 'Escribe el nombre del cliente.' }, 400);
    set('name', v);
  }
  if (body.email !== undefined) {
    const v = clean(body.email, 160).toLowerCase();
    if (!isEmail(v)) return adminJson({ error: 'Revisa el correo electrónico.' }, 400);
    set('email', v);
  }
  if (body.phone !== undefined) {
    const v = clean(body.phone, 30);
    if (v.replace(/\D/g, '').length < 8) return adminJson({ error: 'Revisa el teléfono.' }, 400);
    set('phone', v);
  }
  if (body.date !== undefined) {
    const v = clean(body.date, 10);
    if (!isDate(v)) return adminJson({ error: 'Revisa la fecha.' }, 400);
    set('date', v);
  }
  if (body.date_end !== undefined) {
    const v = clean(body.date_end ?? '', 10);
    if (v && !isDate(v)) return adminJson({ error: 'Revisa la fecha de término.' }, 400);
    set('date_end', v || null);
  }
  if (body.people !== undefined) {
    const n = Number(body.people);
    if (!Number.isInteger(n) || n < 1 || n > 200) return adminJson({ error: 'La cantidad de personas debe ser entre 1 y 200.' }, 400);
    set('people', n);
  }
  if (body.notes !== undefined) set('notes', cleanMultiline(body.notes ?? '', 1500) || null);
  if (body.estimated_total !== undefined) {
    const raw = body.estimated_total;
    const n = raw === null || raw === '' ? null : Number(raw);
    if (n !== null && (!Number.isFinite(n) || n < 0 || n > 1_000_000_000)) return adminJson({ error: 'Revisa el valor.' }, 400);
    set('estimated_total', n === null ? null : Math.round(n));
  }
  if (sets.length) {
    const fin = body.date_end !== undefined || body.date !== undefined ? await env.DB.prepare('SELECT date, date_end FROM bookings WHERE code = ?1').bind(code).first<{ date: string; date_end: string | null }>() : null;
    const d = (body.date ?? fin?.date) as string | undefined;
    const de = (body.date_end !== undefined ? body.date_end : fin?.date_end) as string | null | undefined;
    if (d && de && de < d) return adminJson({ error: 'La fecha de término no puede ser anterior a la de inicio.' }, 400);
    args.push(code);
    await env.DB.prepare(`UPDATE bookings SET ${sets.join(', ')}, updated_at = datetime('now') WHERE code = ?${args.length}`).bind(...args).run();
    await audit(env, data.user, 'reserva.editar', `${code}: ${sets.map((x) => x.split(' ')[0]).join(', ')}`);
  }
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) return adminJson({ error: 'Estado inválido' }, 400);
    await env.DB.prepare(`UPDATE bookings SET status = ?1, updated_at = datetime('now') WHERE code = ?2`).bind(body.status, code).run();
    await audit(env, data.user, 'reserva.estado', `${code} → ${body.status}`);
  }
  if (body.admin_notes !== undefined) {
    await env.DB.prepare(`UPDATE bookings SET admin_notes = ?1, updated_at = datetime('now') WHERE code = ?2`).bind(cleanMultiline(body.admin_notes, 2000), code).run();
    await audit(env, data.user, 'reserva.nota', code);
  }
  const row = await env.DB.prepare('SELECT * FROM bookings WHERE code = ?1').bind(code).first();
  return adminJson({ item: row });
};

// Eliminar una reserva (definitivo). Queda un registro en el historial con lo básico para poder reconstruirla.
export const onRequestDelete = async ({ request, env, data }: Ctx) => {
  if (!env.DB) return adminJson({ error: 'Sin base de datos' }, 503);
  const code = clean(new URL(request.url).searchParams.get('code'), 40);
  if (!code) return adminJson({ error: 'Falta el código' }, 400);
  const b = await env.DB.prepare('SELECT code, item_title, name, phone, date, people, status FROM bookings WHERE code = ?1').bind(code).first<Record<string, unknown>>();
  if (!b) return adminJson({ ok: true }); // ya no existía
  await env.DB.prepare('DELETE FROM bookings WHERE code = ?1').bind(code).run();
  await audit(env, data.user, 'reserva.eliminar', `${b.code} · ${b.item_title} · ${b.name} · ${b.phone} · ${b.date} · ${b.people} pers. · ${b.status}`);
  return adminJson({ ok: true });
};
