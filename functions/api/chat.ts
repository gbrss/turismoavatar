import { type Env, type Catalog, json, bad, clean, getCatalog, clp, rateLimited } from '../../server/lib';

type Msg = { role: 'user' | 'assistant'; content: string };

function systemPrompt(c: Catalog) {
  const exps = c.experiencias
    .map((e) => `- ${e.title} (${e.category}; ${e.duration}; dificultad ${e.difficulty}; precio ${e.price}${e.minAge ? `; desde ${e.minAge} años` : ''}) → ${e.url}\n  ${e.summary}`)
    .join('\n');
  const alojs = c.alojamientos.map((a) => `- ${a.title}, ${a.location}: ${clp(a.pricePerNight)} por noche, hasta ${a.capacity} personas (${a.amenities.join(', ')}) → ${a.url}`).join('\n');
  const progs = c.programas.map((p) => `- ${p.title} (${p.days} días${p.nights ? `/${p.nights} noches` : ''}; ${p.price}): ${p.summary} → ${p.url}`).join('\n');
  const tienda = c.tienda.map((t) => `- ${t.name}: ${clp(t.price)} → ${t.url}`).join('\n');
  const rally = c.rally.paquetes.map((r) => `- ${r.name}: ${clp(r.price)} ${r.unit}`).join('\n');
  const faq = c.faq.map((f) => `P: ${f.q}\nR: ${f.a}`).join('\n');
  return `Eres ${c.site.assistant}, del equipo de ${c.site.name}, tour operador en ${c.site.city} (${c.site.region}, Chile) desde ${c.site.foundingYear}. Oficina: ${c.site.address}.
Tu objetivo: ayudar a elegir experiencias o alojamientos y llevar a la persona a reservar.

Sobre ti: te llamas ${c.site.assistant}, tienes 27 años, eres penquista y te encanta el SUP y el trekking. Eres la asistente virtual del equipo: si alguien pregunta en serio si eres una persona o un bot, responde con honestidad que eres una asistente virtual y ofrece hablar con una persona del equipo por WhatsApp.

Reglas:
- Responde en español de Chile, cercano y breve (máximo 5 líneas). Si te escriben en otro idioma, responde en ese idioma.
- Usa SOLO la información del catálogo. Nunca inventes precios, horarios, disponibilidad ni servicios. Si no sabes algo, dilo y ofrece WhatsApp.
- Cuando recomiendes algo, incluye su ruta (por ejemplo /experiencias/sup-penco) para que la persona pueda abrirla.
- Para reservar, indica la ruta /reservas o el WhatsApp https://wa.me/${c.site.whatsapp}. La disponibilidad se confirma por el equipo.
- Si piden precio de una experiencia "a consultar", explica que depende del grupo y fecha, y ofrece cotizar por WhatsApp o /reservas.
- No uses markdown (ni asteriscos ni encabezados). Texto plano con saltos de línea.
- Si piden hablar con una persona, humano, ejecutivo o asesor, responde breve y amable que los derivas con el equipo por WhatsApp (se mostrará un botón).

Contacto: WhatsApp ${c.site.phone} (${c.site.hours}), correo ${c.site.email}.

EXPERIENCIAS:
${exps}

ALOJAMIENTOS (precios en CLP):
${alojs}

PROGRAMAS (incluye Vacaciones Tercera Edad 2026):
${progs}

RALLY WRC (${c.rally.url}): última edición ${c.rally.ultimaEdicion}. ${c.rally.nota}
${rally}

TIENDA (/tienda, venta por WhatsApp):
${tienda}

DESTINOS: ${c.destinos.map((d) => `${d.name} (${d.url})`).join(', ')}.
Para empresas, colegios y grupos: /empresas. Emprendedores que quieren sumarse: /publica-tu-experiencia.

PREGUNTAS FRECUENTES:
${faq}`;
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Respuestas sin IA: siempre disponibles aunque Workers AI falle o no esté configurado. */
function ruleBased(q: string, c: Catalog): string {
  const t = norm(q);
  const wa = `https://wa.me/${c.site.whatsapp}`;
  const list = (items: { title: string; url: string }[]) => items.map((i) => `• ${i.title}: ${i.url}`).join('\n');
  const byCat = (k: string) => c.experiencias.filter((e) => norm(e.category).includes(k));

  if (/(aloja|caban|hotel|hostal|dormir|noche|tinaja|hosped)/.test(t))
    return `Tenemos estas opciones de alojamiento (precio por noche):\n${c.alojamientos.map((a) => `• ${a.title} (${a.location}): ${clp(a.pricePerNight)}, hasta ${a.capacity} personas → ${a.url}`).join('\n')}\nPuedes reservar en /reservas y te confirmamos disponibilidad.`;
  if (/(sup|stand ?up|paddle|kayak|remar|nautic|agua)/.test(t))
    return `Para actividades en el agua te recomiendo:\n${list(byCat('nautic'))}\nNo necesitas experiencia: incluimos instrucción, tabla o kayak y chaleco.`;
  if (/(trek|caminat|cerro|caracol|sender|cabalg|caballo|canopy|aventura)/.test(t))
    return `Estas experiencias son para ti:\n${list([...byCat('trekking'), ...byCat('aventura')])}`;
  if (/(city|ciudad|concepcion|centro|historia|patrimon|lota|cultur)/.test(t))
    return `Para conocer la ciudad y su historia:\n${list([...byCat('city'), ...byCat('patrimonio')])}`;
  if (/(empresa|colegio|grupo|team|curso|gira|corporat|evento)/.test(t))
    return `Hacemos salidas privadas para empresas, colegios y grupos, con toda la logística resuelta. Pide tu cotización en /empresas o escríbenos por WhatsApp: ${wa}`;
  if (/(tercera edad|adulto mayor|abuel|jubilad|lonquimay|lanalhue|trancas|angostura)/.test(t))
    return `Tenemos Vacaciones Tercera Edad 2026:\n${c.programas.filter((p) => /Tercera Edad/.test(p.title)).map((p) => `• ${p.title.replace('Vacaciones Tercera Edad 2026: ', '')} (${p.days} días): ${p.price}`).join('\n')}\nMira el detalle en /programas#tercera-edad o reserva en /reservas.`;
  if (/(rally|wrc|mundial)/.test(t))
    return `Organizamos paquetes para vivir el WRC Rally Chile Biobío con traslados desde tu hotel, alimentación y alojamiento. ${c.rally.nota} Únete a la lista de espera en ${c.rally.url}`;
  if (/(tienda|mochila|comprar|producto|recuerdo)/.test(t))
    return `En la tienda tenemos:\n${c.tienda.map((p) => `• ${p.name}: ${clp(p.price)}`).join('\n')}\nSe compran por WhatsApp: ${wa}. Más info en /tienda`;
  if (/(dias|programa|itinerario|fin de semana|finde)/.test(t))
    return `Tenemos programas armados:\n${list(c.programas)}\nLos ajustamos a tus fechas.`;
  if (/(precio|valor|cuesta|cuanto|tarifa|costo)/.test(t))
    return `Precios por persona:\n${c.experiencias.filter((e) => e.price !== 'a consultar').map((e) => `• ${e.title}: ${e.price}`).join('\n')}\nAlojamientos desde ${clp(Math.min(...c.alojamientos.map((a) => a.pricePerNight)))} por noche (/alojamientos). Reserva en /reservas o por WhatsApp ${wa}`;
  if (/(reserv|agendar|disponib|cupo|fecha)/.test(t))
    return `Puedes enviar tu solicitud en /reservas (no se cobra nada al enviarla) y te confirmamos disponibilidad y pago, normalmente el mismo día. Si prefieres, escríbenos por WhatsApp: ${wa}`;
  if (/(lluvia|clima|tiempo|llueve)/.test(t)) return c.faq.find((f) => norm(f.q).includes('tiempo'))?.a ?? `Escríbenos por WhatsApp: ${wa}`;
  if (/(pago|pagar|transfer|tarjeta)/.test(t)) return c.faq.find((f) => norm(f.q).includes('pagar'))?.a ?? `Escríbenos por WhatsApp: ${wa}`;
  if (/(direcc|oficina|ubicad)/.test(t)) return `Nuestra oficina está en ${c.site.address}. Escríbenos antes por WhatsApp para coordinar: ${wa}`;
  if (/(donde|comuna|operan)/.test(t)) return c.faq.find((f) => norm(f.q).includes('operan'))!.a + ' Mira el mapa en /destinos';
  if (/(edad|anos tienes|cuantos anos)/.test(t)) return `Tengo 27 años 😊 Soy ${c.site.assistant}, la asistente virtual de Turismo Avatar. ¿Te ayudo a encontrar una experiencia en el Biobío?`;
  if (/(eres (un )?(bot|robot|humano|persona|ia)|eres real)/.test(t)) return `Soy ${c.site.assistant}, la asistente virtual de Turismo Avatar 🤖 Si prefieres, te dejo con una persona del equipo por WhatsApp: ${wa}`;
  if (/(hola|buenas|buenos)/.test(t)) return `¡Hola! Soy ${c.site.assistant} 😊 ¿Qué te gustaría hacer en el Biobío? Puedo recomendarte SUP en el mar, trekking, el City Tour 7 Lagunas o alojamientos con tinaja.`;

  const words = t.split(/\W+/).filter((w) => w.length > 3);
  const hits = c.experiencias.filter((e) => words.some((w) => norm(`${e.title} ${e.summary} ${e.destinos.join(' ')}`).includes(w))).slice(0, 4);
  if (hits.length) return `Esto puede servirte:\n${list(hits)}`;
  return `Puedo ayudarte con experiencias (/experiencias), alojamientos (/alojamientos) y reservas (/reservas). Si prefieres hablar con una persona, escríbenos por WhatsApp: ${wa}`;
}

const HUMANO = /(human|persona real|(hablar|conversar|comunicarme|contactarme) con (una |alg[uú]n[a]? )?(persona|alguien)|alguien real|ejecutiv|asesor|operador|agente|encargad|due[nñ]o|atenci[oó]n personal|llamar|ll[aá]mame|derivar|der[ií]vame|contactar con|whats ?app|wsp|wasap)/i;

function waHandoff(c: Catalog, messages: Msg[]) {
  const preguntas = messages.filter((m) => m.role === 'user').slice(-3).map((m) => `• ${m.content}`).join('\n');
  const text = `Hola Turismo Avatar 👋 Vengo del chat de la web.\n${preguntas}`;
  return `https://wa.me/${c.site.whatsapp}?text=${encodeURIComponent(text)}`;
}

// Guarda cada pregunta con su sesión para ver las conversaciones completas en el panel
const log = (env: Env, request: Request, payload: { page?: string; session?: string }, q: string, a: string, engine: string, handoff: boolean) =>
  env.DB!.prepare('INSERT INTO chat_logs (page, question, answer, engine, session_id, handoff, country) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)')
    .bind(clean(payload.page, 200), q, a.slice(0, 2000), engine, /^[\w-]{8,40}$/.test(payload.session ?? '') ? payload.session : null, handoff ? 1 : 0, (request as Request & { cf?: { country?: string } }).cf?.country ?? null)
    .run()
    .catch(() => {});

export const onRequestPost: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  if (await rateLimited(request, 'chat', 40, 600)) return bad('Demasiados mensajes. Intenta en unos minutos.', 429);
  let payload: { messages?: Msg[]; page?: string; session?: string };
  try {
    payload = await request.json();
  } catch {
    return bad('Formato inválido');
  }
  const messages = (payload.messages ?? [])
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-10)
    .map((m) => ({ role: m.role, content: clean(m.content, 800) }));
  const last = messages.at(-1);
  if (!last || last.role !== 'user' || !last.content) return bad('Escribe una pregunta.');

  const catalog = await getCatalog(env, request);
  let reply = '';
  let engine = 'reglas';

  // Derivación a una persona: respuesta fija + botón de WhatsApp con la consulta ya escrita
  if (HUMANO.test(last.content)) {
    const handoff = { label: 'Hablar con una persona', href: waHandoff(catalog, messages) };
    reply = '¡Claro! Te dejo con una persona de nuestro equipo por WhatsApp. Ya va tu consulta escrita, solo presiona el botón y envía el mensaje 😊';
    if (env.DB) {
      waitUntil(
        log(env, request, payload, last.content, reply, 'humano', true),
      );
    }
    return json({ reply, handoff });
  }

  if (env.AI) {
    try {
      const out = (await env.AI.run((env.AI_MODEL ?? '@cf/meta/llama-3.3-70b-instruct-fp8-fast') as keyof AiModels, {
        messages: [{ role: 'system', content: systemPrompt(catalog) }, ...messages],
        max_tokens: 400,
        temperature: 0.3,
      } as never)) as { response?: string };
      reply = (out.response ?? '').replace(/\*\*|__|#+\s/g, '').trim();
      engine = 'ai';
    } catch {
      reply = '';
    }
  }
  if (!reply) reply = ruleBased(last.content, catalog);

  // Cada vez que Cami sugiere WhatsApp, se agrega el botón con la consulta ya escrita
  const sugiereWa = /whats ?app|wa\.me|wsp|\+?56 ?9 ?4998 ?1427/i.test(reply);
  if (env.DB) waitUntil(log(env, request, payload, last.content, reply, engine, sugiereWa));
  if (sugiereWa) {
    reply = reply.replace(/:?\s*https?:\/\/(?:wa\.me|api\.whatsapp\.com)\/\S+/gi, '').trim();
    return json({ reply, handoff: { label: 'Escribir por WhatsApp', href: waHandoff(catalog, messages) } });
  }
  return json({ reply });
};
