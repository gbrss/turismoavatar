import { type Env, json, bad, readBody, clean, cleanMultiline, isEmail, sendEmail, emailLayout, rateLimited } from '../../server/lib';

const labels: Record<string, string> = { contacto: 'Contacto', empresa: 'Cotización empresa / grupo', proveedor: 'Postulación de proveedor' };

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (await rateLimited(request, 'contacto', 6, 600)) return bad('Demasiados mensajes seguidos. Intenta en unos minutos.', 429);
  const body = await readBody(request);
  if (body.website) return json({ ok: true });
  const kind = labels[body.kind] ? body.kind : 'contacto';
  const name = clean(body.name, 120);
  const email = clean(body.email, 160).toLowerCase();
  const phone = clean(body.phone, 30);
  const org = clean(body.org, 160);
  const message = cleanMultiline(body.message, 3000);
  if (!name) return bad('Escribe tu nombre.');
  if (!isEmail(email)) return bad('Revisa tu correo electrónico.');
  if (message.length < 5) return bad('Escribe tu mensaje.');

  if (env.DB) {
    await env.DB.prepare('INSERT INTO leads (kind, name, email, phone, org, message) VALUES (?1, ?2, ?3, ?4, ?5, ?6)')
      .bind(kind, name, email, phone || null, org || null, message)
      .run();
  }
  await sendEmail(env, {
    to: env.NOTIFY_EMAIL ?? 'contacto@turismoavatar.cl',
    subject: `${labels[kind]}: ${name}${org ? ` (${org})` : ''}`,
    html: emailLayout(labels[kind], [
      ['Nombre', name],
      ['Correo', email],
      ['Teléfono', phone || '—'],
      ...(org ? ([['Organización', org]] as [string, string][]) : []),
      ['Mensaje', message],
    ]),
    replyTo: email,
  });
  return json({ ok: true });
};
