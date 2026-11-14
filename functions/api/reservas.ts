import { type Env, json, bad, readBody, clean, cleanMultiline, isEmail, isDate, getCatalog, verifyTurnstile, sendEmail, emailLayout, bookingCode, clp, rateLimited } from '../../server/lib';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (await rateLimited(request, 'reservas', 8, 600)) return bad('Demasiadas solicitudes seguidas. Intenta en unos minutos.', 429);
  const body = await readBody(request);
  if (body.website) return json({ ok: true, code: 'TA-OK', whatsapp: '/' }); // honeypot

  if (!(await verifyTurnstile(env, body['cf-turnstile-response'], request.headers.get('cf-connecting-ip'))))
    return bad('No pudimos verificar que no eres un robot. Recarga la página e intenta de nuevo.');

  const [kind, slug] = clean(body.item, 120).split(':');
  const name = clean(body.name, 120);
  const email = clean(body.email, 160).toLowerCase();
  const phone = clean(body.phone, 30);
  const date = clean(body.date, 10);
  const dateEnd = clean(body.dateEnd, 10);
  const people = Math.max(1, Math.min(60, parseInt(body.people, 10) || 1));
  const contactPref = ['WhatsApp', 'Llamada', 'Correo'].includes(body.contactPref) ? body.contactPref : '';
  const notesRaw = cleanMultiline(body.notes, 1500);
  const notes = [notesRaw, contactPref && `Prefiere contacto por: ${contactPref}`].filter(Boolean).join('\n');

  if (!kind || !slug) return bad('Elige qué quieres reservar.');
  if (kind === 'cotizacion' && notesRaw.length < 5) return bad('Cuéntanos brevemente tu idea para preparar la propuesta.');
  if (!name) return bad('Escribe tu nombre.');
  if (!isEmail(email)) return bad('Revisa tu correo electrónico.');
  if (phone.replace(/\D/g, '').length < 8) return bad('Revisa tu número de teléfono.');
  if (!isDate(date)) return bad('Elige una fecha válida.');
  const today = new Date().toISOString().slice(0, 10);
  if (date < today) return bad('La fecha no puede estar en el pasado.');

  const catalog = await getCatalog(env, request);
  let title = 'Experiencia a medida / grupo';
  let total: number | null = null;
  if (kind === 'experiencia') {
    const e = catalog.experiencias.find((x) => x.slug === slug);
    if (!e) return bad('La experiencia elegida no existe.');
    title = e.title;
  } else if (kind === 'programa') {
    const p = catalog.programas.find((x) => x.slug === slug);
    if (!p) return bad('El programa elegido no existe.');
    title = p.title;
  } else if (kind === 'alojamiento') {
    const a = catalog.alojamientos.find((x) => x.slug === slug);
    if (!a) return bad('El alojamiento elegido no existe.');
    if (!isDate(dateEnd) || dateEnd <= date) return bad('La fecha de salida debe ser posterior a la llegada.');
    const nights = Math.round((Date.parse(dateEnd) - Date.parse(date)) / 86_400_000);
    if (nights > 30) return bad('Para estadías de más de 30 noches escríbenos por WhatsApp.');
    title = a.title;
    total = nights * a.pricePerNight;
  } else if (kind !== 'cotizacion') {
    return bad('Tipo de reserva no válido.');
  }

  const code = bookingCode();
  const country = (request as Request & { cf?: { country?: string } }).cf?.country ?? null;

  if (env.DB) {
    await env.DB.prepare(
      `INSERT INTO bookings (code, kind, item_slug, item_title, date, date_end, people, name, email, phone, notes, estimated_total, source, country)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)`,
    )
      .bind(code, kind, slug, title, date, kind === 'alojamiento' ? dateEnd : null, people, name, email, phone, notes || null, total, request.headers.get('referer'), country)
      .run();
  }

  const when = kind === 'alojamiento' ? `${date} al ${dateEnd}` : date;
  const rows: [string, string][] = [
    ['Código', code],
    ['Reserva', title],
    ['Fecha', when],
    ['Personas', String(people)],
    ...(total ? ([['Total estimado', clp(total)]] as [string, string][]) : []),
    ['Nombre', name],
    ['Correo', email],
    ['Teléfono', phone],
    ...(notes ? ([['Comentarios', notes]] as [string, string][]) : []),
  ];
  const waNumber = env.WHATSAPP_NUMBER ?? '56949981427';
  const clientPhone = phone.replace(/\D/g, '');
  const replyWa = `https://wa.me/${clientPhone.startsWith('56') ? clientPhone : '56' + clientPhone.replace(/^0+/, '')}`;

  await Promise.all([
    sendEmail(env, {
      to: env.NOTIFY_EMAIL ?? 'contacto@turismoavatar.cl',
      subject: `Nueva solicitud ${code}: ${title} (${when})`,
      html: emailLayout('Nueva solicitud de reserva', rows, `<p><a href="${replyWa}" style="color:#c2264b;font-weight:bold">Responder por WhatsApp al cliente</a></p>`),
      replyTo: email,
    }),
    sendEmail(env, {
      to: email,
      subject: `Recibimos tu solicitud ${code} — Turismo Avatar`,
      html: emailLayout(
        '¡Recibimos tu solicitud!',
        rows.slice(0, total ? 5 : 4),
        `<p style="color:#55625f">Te contactaremos pronto para confirmar disponibilidad y forma de pago. Si quieres acelerar la confirmación, escríbenos por WhatsApp al +56 9 4998 1427 con tu código.</p>`,
      ),
      replyTo: env.NOTIFY_EMAIL,
    }),
  ]);

  const waText = `Hola Turismo Avatar 👋 Envié la solicitud ${code}: ${title}, ${when}, ${people} ${people === 1 ? 'persona' : 'personas'}. Mi nombre es ${name}.`;
  return json({ ok: true, code, whatsapp: `https://wa.me/${waNumber}?text=${encodeURIComponent(waText)}` });
};
