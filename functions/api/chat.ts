import { type Env, type Catalog, json, bad, clean, getCatalog, clp, rateLimited } from '../../server/lib';

type Msg = { role: 'user' | 'assistant'; content: string };

function systemPrompt(c: Catalog) {
  const exps = c.experiencias
    .map((e) => `- ${e.title} (${e.category}; ${e.duration}; dificultad ${e.difficulty}; precio ${e.price}${e.minAge ? `; desde ${e.minAge} años` : ''}) → ${e.url}\n  ${e.summary}`)
    .join('\n');
  const alojs = c.alojamientos.map((a) => `- ${a.title}, ${a.location}: ${clp(a.pricePerNight)} por noche, hasta ${a.capacity} personas (${a.amenities.join(', ')}) → ${a.url}`).join('\n');
  const progs = c.programas.map((p) => `- ${p.title} (${p.days} días): ${p.summary} → ${p.url}`).join('\n');
  const faq = c.faq.map((f) => `P: ${f.q}\nR: ${f.a}`).join('\n');
  return `Eres el asistente virtual de ${c.site.name}, tour operador en ${c.site.city} (${c.site.region}, Chile) desde ${c.site.foundingYear}.
Tu objetivo: ayudar a elegir experiencias o alojamientos y llevar a la persona a reservar.

Reglas:
- Responde en español de Chile, cercano y breve (máximo 5 líneas). Si te escriben en otro idioma, responde en ese idioma.
- Usa SOLO la información del catálogo. Nunca inventes precios, horarios, disponibilidad ni servicios. Si no sabes algo, dilo y ofrece WhatsApp.
- Cuando recomiendes algo, incluye su ruta (por ejemplo /experiencias/sup-penco) para que la persona pueda abrirla.
- Para reservar, indica la ruta /reservas o el WhatsApp https://wa.me/${c.site.whatsapp}. La disponibilidad se confirma por el equipo.
- Si piden precio de una experiencia "a consultar", explica que depende del grupo y fecha, y ofrece cotizar por WhatsApp o /reservas.
- No uses markdown (ni asteriscos ni encabezados). Texto plano con saltos de línea.

Contacto: WhatsApp ${c.site.phone} (${c.site.hours}), correo ${c.site.email}.

EXPERIENCIAS:
${exps}

ALOJAMIENTOS (precios en CLP):
${alojs}

PROGRAMAS:
${progs}

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
  if (/(dias|programa|itinerario|fin de semana|finde)/.test(t))
    return `Tenemos programas armados:\n${list(c.programas)}\nLos ajustamos a tus fechas.`;
  if (/(precio|valor|cuesta|cuanto|tarifa|costo)/.test(t))
    return `Los alojamientos van desde ${clp(Math.min(...c.alojamientos.map((a) => a.pricePerNight)))} por noche (ver /alojamientos). El precio de las experiencias depende del grupo y la fecha: cotiza sin compromiso en /reservas o por WhatsApp ${wa}`;
  if (/(reserv|agendar|disponib|cupo|fecha)/.test(t))
    return `Puedes enviar tu solicitud en /reservas (no se cobra nada al enviarla) y te confirmamos disponibilidad y pago, normalmente el mismo día. Si prefieres, escríbenos por WhatsApp: ${wa}`;
  if (/(lluvia|clima|tiempo|llueve)/.test(t)) return c.faq.find((f) => norm(f.q).includes('tiempo'))?.a ?? `Escríbenos por WhatsApp: ${wa}`;
  if (/(pago|pagar|transfer|tarjeta)/.test(t)) return c.faq.find((f) => norm(f.q).includes('pagar'))?.a ?? `Escríbenos por WhatsApp: ${wa}`;
  if (/(donde|ubicad|direcc|comuna|operan)/.test(t)) return c.faq.find((f) => norm(f.q).includes('operan'))!.a + ' Mira el mapa en /destinos';
  if (/(hola|buenas|buenos)/.test(t)) return '¡Hola! ¿Qué te gustaría hacer en el Biobío? Puedo recomendarte experiencias en el agua, trekking, city tours o alojamientos.';

  const words = t.split(/\W+/).filter((w) => w.length > 3);
  const hits = c.experiencias.filter((e) => words.some((w) => norm(`${e.title} ${e.summary} ${e.destinos.join(' ')}`).includes(w))).slice(0, 4);
  if (hits.length) return `Esto puede servirte:\n${list(hits)}`;
  return `Puedo ayudarte con experiencias (/experiencias), alojamientos (/alojamientos) y reservas (/reservas). Si prefieres hablar con una persona, escríbenos por WhatsApp: ${wa}`;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  if (await rateLimited(request, 'chat', 40, 600)) return bad('Demasiados mensajes. Intenta en unos minutos.', 429);
  let payload: { messages?: Msg[]; page?: string };
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

  if (env.DB) {
    waitUntil(
      env.DB.prepare('INSERT INTO chat_logs (page, question, answer, engine) VALUES (?1, ?2, ?3, ?4)')
        .bind(clean(payload.page, 200), last.content, reply.slice(0, 2000), engine)
        .run()
        .catch(() => {}),
    );
  }
  return json({ reply });
};
