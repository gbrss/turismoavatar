import { type Env, esc, clp } from '../../server/lib';

const STATUSES = ['pendiente', 'confirmada', 'pagada', 'cancelada'] as const;
type Booking = { code: string; created_at: string; kind: string; item_title: string; date: string; date_end: string | null; people: number; name: string; email: string; phone: string; notes: string | null; estimated_total: number | null; status: string };
type Lead = { id: number; created_at: string; kind: string; name: string; email: string; phone: string | null; org: string | null; message: string };

const csv = (rows: Record<string, unknown>[]) => {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [cols.join(','), ...rows.map((r) => cols.map((c) => q(r[c])).join(','))].join('\n');
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.DB) return new Response('Sin base de datos', { status: 503 });
  const form = await request.formData();
  const code = String(form.get('code') ?? '');
  const status = String(form.get('status') ?? '');
  if ((STATUSES as readonly string[]).includes(status)) {
    await env.DB.prepare('UPDATE bookings SET status = ?1 WHERE code = ?2').bind(status, code).run();
  }
  return Response.redirect(new URL('/admin/reservas', request.url).toString(), 303);
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.DB) return new Response('Configura la base D1 (binding DB) para ver reservas.', { status: 503 });
  const url = new URL(request.url);
  const filter = url.searchParams.get('estado') ?? '';
  const where = (STATUSES as readonly string[]).includes(filter) ? 'WHERE status = ?1' : '';
  const stmt = env.DB.prepare(`SELECT * FROM bookings ${where} ORDER BY created_at DESC LIMIT 300`);
  const { results: bookings } = await (where ? stmt.bind(filter) : stmt).all<Booking>();

  if (url.searchParams.get('export') === 'csv') {
    return new Response(csv(bookings as unknown as Record<string, unknown>[]), {
      headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="reservas.csv"' },
    });
  }

  const [{ results: leads }, subs, questions] = await Promise.all([
    env.DB.prepare('SELECT * FROM leads ORDER BY created_at DESC LIMIT 100').all<Lead>(),
    env.DB.prepare('SELECT COUNT(*) AS n FROM subscribers').first<{ n: number }>(),
    env.DB.prepare('SELECT question, created_at FROM chat_logs ORDER BY created_at DESC LIMIT 40').all<{ question: string; created_at: string }>(),
  ]);
  const counts = Object.fromEntries(STATUSES.map((s) => [s, bookings.filter((b) => b.status === s).length]));
  const wa = (p: string) => {
    const d = p.replace(/\D/g, '');
    return `https://wa.me/${d.startsWith('56') ? d : '56' + d}`;
  };

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Reservas · Turismo Avatar</title>
<style>
body{font-family:system-ui,sans-serif;margin:0;background:#eef2ef;color:#13201f}header{background:#0e3b43;color:#fff;padding:16px 24px;display:flex;gap:16px;align-items:center;flex-wrap:wrap}
h1{margin:0;font-size:22px}main{padding:24px;display:grid;gap:28px}a{color:#c2264b}nav a{color:#fff;margin-right:12px}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;font-size:14px}th,td{padding:8px 10px;border-bottom:1px solid #d9e0db;text-align:left;vertical-align:top}
th{background:#d9e0db}.s-pendiente{color:#9d6b00}.s-confirmada{color:#2e8c87}.s-pagada{color:#1f7a3a;font-weight:bold}.s-cancelada{color:#999;text-decoration:line-through}
select,button{font:inherit;padding:4px 6px}.wrap{overflow-x:auto}.pill{display:inline-block;background:#fff;border-radius:99px;padding:4px 10px;margin-right:6px}
</style></head><body>
<header><h1>Turismo Avatar · Panel</h1><nav><a href="/admin/reservas">Todas</a>${STATUSES.map((s) => `<a href="?estado=${s}">${s} (${counts[s]})</a>`).join('')}<a href="?export=csv${filter ? `&estado=${filter}` : ''}">Exportar CSV</a></nav></header>
<main>
<section><h2>Solicitudes de reserva</h2><p><span class="pill">Suscriptores newsletter: <b>${subs?.n ?? 0}</b></span></p><div class="wrap"><table>
<tr><th>Código</th><th>Recibida</th><th>Reserva</th><th>Fecha</th><th>Pers.</th><th>Cliente</th><th>Total est.</th><th>Estado</th></tr>
${bookings
  .map(
    (b) => `<tr><td><b>${esc(b.code)}</b></td><td>${esc(b.created_at)}</td><td>${esc(b.item_title)}<br><small>${esc(b.kind)}</small>${b.notes ? `<br><small>${esc(b.notes)}</small>` : ''}</td>
<td>${esc(b.date)}${b.date_end ? ` → ${esc(b.date_end)}` : ''}</td><td>${b.people}</td>
<td>${esc(b.name)}<br><a href="mailto:${esc(b.email)}">${esc(b.email)}</a><br><a href="${wa(b.phone)}" target="_blank">${esc(b.phone)}</a></td>
<td>${b.estimated_total ? clp(b.estimated_total) : '—'}</td>
<td><form method="post"><input type="hidden" name="code" value="${esc(b.code)}"><select name="status" class="s-${esc(b.status)}">${STATUSES.map((s) => `<option ${s === b.status ? 'selected' : ''}>${s}</option>`).join('')}</select> <button>Guardar</button></form></td></tr>`,
  )
  .join('') || '<tr><td colspan="8">Aún no hay solicitudes.</td></tr>'}
</table></div></section>
<section><h2>Contactos, cotizaciones y proveedores</h2><div class="wrap"><table><tr><th>Fecha</th><th>Tipo</th><th>Nombre</th><th>Contacto</th><th>Mensaje</th></tr>
${leads.map((l) => `<tr><td>${esc(l.created_at)}</td><td>${esc(l.kind)}</td><td>${esc(l.name)}${l.org ? `<br><small>${esc(l.org)}</small>` : ''}</td><td><a href="mailto:${esc(l.email)}">${esc(l.email)}</a>${l.phone ? `<br><a href="${wa(l.phone)}" target="_blank">${esc(l.phone)}</a>` : ''}</td><td>${esc(l.message)}</td></tr>`).join('') || '<tr><td colspan="5">Sin mensajes.</td></tr>'}
</table></div></section>
<section><h2>Últimas preguntas al chatbot</h2><div class="wrap"><table><tr><th>Fecha</th><th>Pregunta</th></tr>
${questions.results.map((q) => `<tr><td>${esc(q.created_at)}</td><td>${esc(q.question)}</td></tr>`).join('') || '<tr><td colspan="2">Sin preguntas.</td></tr>'}
</table></div></section>
</main></body></html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
};
