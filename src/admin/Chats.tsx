// Conversaciones con Cami: lista por sesión, conversación completa y preguntas más repetidas.
import { useEffect, useRef, useState } from "react";
import { useSilentReload } from "./live";
import {
  api,
  Btn,
  Empty,
  Loading,
  Panel,
  cls,
  fmtDateTime,
  useAdmin,
  useDebounced,
} from "./lib";

interface Sesion {
  sesion: string;
  inicio: string;
  fin: string;
  mensajes: number;
  humano: number;
  pagina: string;
  pais: string | null;
  primera: string;
}
interface Msg {
  id: number;
  created_at: string;
  page: string;
  question: string;
  answer: string;
  engine: string;
  handoff: number;
}
interface Staff {
  id: number;
  created_at: string;
  author: string;
  body: string;
}
interface Toma {
  agent: string;
  email: string;
  activa: number;
}

export default function Chats() {
  const { me, rev } = useAdmin();
  const caja = useRef<HTMLDivElement>(null);
  const alFinal = () =>
    requestAnimationFrame(
      () =>
        caja.current &&
        caja.current.scrollTo({
          top: caja.current.scrollHeight,
          behavior: "smooth",
        }),
    );
  const [dias, setDias] = useState(30);
  const [q, setQ] = useState("");
  const [humano, setHumano] = useState(false);
  const dq = useDebounced(q, 350);
  const [data, setData] = useState<{
    items: Sesion[];
    resumen: { mensajes: number; conversaciones: number; derivadas: number };
    top: { pregunta: string; n: number }[];
  } | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [toma, setToma] = useState<Toma | null>(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const { toast } = useAdmin();
  const nombreGuardado = () => {
    try {
      return localStorage.getItem("ta-agente") ?? undefined;
    } catch {
      return undefined;
    }
  };
  const [nombre, setNombre] = useState<string | undefined>(nombreGuardado);

  const loadList = (silent = false) => {
    if (!me.servicios.db) return;
    if (!silent) setData(null);
    api<NonNullable<typeof data>>(
      `/api/admin/chats?dias=${dias}&q=${encodeURIComponent(dq)}${humano ? "&humano=1" : ""}`,
    )
      .then(setData)
      .catch(
        () =>
          !silent &&
          setData({
            items: [],
            resumen: { mensajes: 0, conversaciones: 0, derivadas: 0 },
            top: [],
          }),
      );
  };
  const loadMsgs = (silent = false) => {
    if (!sel) return;
    if (!silent) setMsgs(null);
    api<{ items: Msg[]; staff: Staff[]; toma: Toma | null }>(
      `/api/admin/chats?sesion=${encodeURIComponent(sel)}`,
    ).then((r) => {
      setStaff(r.staff ?? []);
      setToma(r.toma ?? null);
      setMsgs((prev) => {
        // Mensajes nuevos de la conversación abierta: baja al final
        if (!prev || r.items.length + (r.staff?.length ?? 0) > prev.length) setTimeout(alFinal, 30);
        return r.items;
      });
    });
  };
  const vivo = async (accion: "tomar" | "soltar" | "enviar" | "nombre") => {
    if (!sel) return;
    let nombre: string | undefined;
    if (accion === "nombre") {
      const actual = nombreGuardado() ?? toma?.agent ?? "";
      nombre = prompt("¿Con qué nombre te verá el cliente?", actual)?.trim();
      if (!nombre) return;
      try {
        localStorage.setItem("ta-agente", nombre);
      } catch {
        /* sin almacenamiento */
      }
      setNombre(nombre);
      if (!toma?.activa) return toast("Nombre guardado.");
    }
    if (accion === "tomar") {
      try {
        nombre = localStorage.getItem("ta-agente") ?? undefined;
      } catch {
        /* sin almacenamiento */
      }
      if (!nombre) {
        nombre = prompt("¿Con qué nombre te verá el cliente? (por ejemplo: Camila, del equipo)", "")?.trim();
        if (!nombre) return;
        try {
          localStorage.setItem("ta-agente", nombre);
        } catch {
          /* sin almacenamiento */
        }
      }
    }
    setEnviando(true);
    try {
      await api("/api/admin/chat-live", { method: "POST", body: JSON.stringify({ sesion: sel, accion, texto, nombre }) });
      if (accion === "enviar") setTexto("");
      if (accion === "soltar") toast("Listo: Cami retoma la conversación.");
      loadMsgs(true);
    } catch (e) {
      toast((e as Error).message, "error");
      loadMsgs(true);
    } finally {
      setEnviando(false);
    }
  };
  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dias, dq, humano, me]);
  useEffect(() => {
    loadMsgs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel]);
  useSilentReload(rev.chats, () => (loadList(true), loadMsgs(true)));

  if (!me.servicios.db)
    return (
      <Empty>
        Conecta la base de datos D1 para guardar y ver las conversaciones (ver
        ADMIN.md).
      </Empty>
    );
  return (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Conversaciones", data?.resumen.conversaciones],
          ["Mensajes", data?.resumen.mensajes],
          ["Pidieron WhatsApp o persona", data?.resumen.derivadas],
        ].map(([l, v]) => (
          <div
            key={l as string}
            className="rounded-2xl bg-white p-5 ring-1 ring-roca"
          >
            <p className="text-sm font-bold text-gris">{l}</p>
            <p className="mt-1 font-display text-3xl font-extrabold">
              {v ?? "—"}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Panel title="Conversaciones">
          <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <input
              className="input"
              placeholder="Buscar palabra…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Buscar"
            />
            <select
              className="input"
              value={dias}
              onChange={(e) => setDias(+e.target.value)}
              aria-label="Período"
            >
              <option value={7}>7 días</option>
              <option value={30}>30 días</option>
              <option value={90}>90 días</option>
              <option value={365}>1 año</option>
            </select>
            <label className="flex items-center gap-2 text-sm font-bold">
              <input
                type="checkbox"
                checked={humano}
                onChange={(e) => setHumano(e.target.checked)}
                className="h-5 w-5 accent-naranja"
              />
              Solo derivadas
            </label>
          </div>
          {!data ? (
            <Loading />
          ) : !data.items.length ? (
            <Empty>Sin conversaciones en este período.</Empty>
          ) : (
            <ul className="-mx-2 max-h-[60dvh] overflow-y-auto overscroll-contain lg:max-h-[calc(100dvh-28.5rem)] lg:min-h-80">
              {data.items.map((s) => (
                <li key={s.sesion}>
                  <button
                    type="button"
                    onClick={() => setSel(s.sesion)}
                    className={cls(
                      "w-full rounded-xl px-3 py-3 text-left hover:bg-niebla",
                      sel === s.sesion && "bg-niebla ring-2 ring-naranja",
                    )}
                  >
                    <span className="flex items-center justify-between gap-2 text-xs font-semibold text-gris">
                      <span>
                        {fmtDateTime(s.fin)} · {s.mensajes}{" "}
                        {s.mensajes === 1 ? "pregunta" : "preguntas"}
                        {s.pais ? ` · ${s.pais}` : ""}
                      </span>
                      {s.humano ? (
                        <span className="rounded-full bg-[#157a3e]/12 px-2 py-0.5 font-bold text-[#157a3e]">
                          WhatsApp
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 line-clamp-2 block font-semibold">
                      {s.primera}
                    </span>
                    <span className="block truncate text-xs text-gris">
                      desde {s.pagina || "/"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={sel ? "Conversación" : "Lo que más preguntan"}>
          {sel ? (
            !msgs ? (
              <Loading />
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setSel(null)}
                  className="mb-3 text-sm font-bold text-cielo-700"
                >
                  ← Ver preguntas frecuentes
                </button>
                <div
                  ref={caja}
                  className="-mx-2 max-h-[60dvh] overflow-y-auto overscroll-contain px-2 lg:max-h-[calc(100dvh-28.5rem)] lg:min-h-80"
                  tabIndex={0}
                  aria-label="Mensajes de la conversación"
                >
                  <ol className="grid gap-3 pb-1">
                    {[
                      ...msgs.map((m) => ({ t: m.created_at, m, s: null as Staff | null })),
                      ...staff.map((x) => ({ t: x.created_at, m: null as Msg | null, s: x })),
                    ]
                      .sort((a, b) => (a.t < b.t ? -1 : a.t > b.t ? 1 : 0))
                      .map((e) =>
                        e.s ? (
                          <li key={`s${e.s.id}`} className="max-w-[90%] rounded-2xl rounded-bl-md bg-[#157a3e]/12 px-4 py-2.5 ring-1 ring-[#157a3e]/30">
                            <p className="whitespace-pre-line">{e.s.body}</p>
                            <p className="mt-1.5 text-[11px] font-semibold text-[#157a3e]">
                              {e.s.author} (equipo) · {fmtDateTime(e.s.created_at)}
                            </p>
                          </li>
                        ) : (
                          <li key={e.m!.id} className="grid gap-2">
                            <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-marino px-4 py-2.5 text-white">{e.m!.question}</p>
                            {e.m!.engine === "persona" ? null : (
                              <div className="max-w-[90%] rounded-2xl rounded-bl-md bg-niebla px-4 py-2.5">
                                <p className="whitespace-pre-line">{e.m!.answer}</p>
                                <p className="mt-1.5 text-[11px] font-semibold text-gris">
                                  Cami · {fmtDateTime(e.m!.created_at)} ·{" "}
                                  {e.m!.engine === "ai" ? "IA" : e.m!.engine === "humano" ? "derivó a persona" : "respuesta automática"}
                                  {e.m!.handoff ? " · ofreció WhatsApp" : ""}
                                </p>
                              </div>
                            )}
                          </li>
                        ),
                      )}
                  </ol>
                </div>
                <Atencion nombre={nombre} sel={sel} toma={toma} yo={me.email} texto={texto} setTexto={setTexto} enviando={enviando} vivo={vivo} />
                <p className="mt-4 text-xs text-gris">
                  Las conversaciones no guardan nombres ni teléfonos: si el
                  cliente siguió por WhatsApp, la verás en tu WhatsApp.
                </p>
              </>
            )
          ) : !data ? (
            <Loading />
          ) : data.top.length ? (
            <>
              <p className="mb-3 text-sm text-gris">
                Preguntas repetidas en el período. Si algo se pregunta mucho,
                conviene responderlo en la página o en las preguntas frecuentes.
              </p>
              <ol className="divide-y divide-roca">
                {data.top.map((t) => (
                  <li
                    key={t.pregunta}
                    className="flex items-start justify-between gap-4 py-2.5"
                  >
                    <span className="first-letter:uppercase">{t.pregunta}</span>
                    <span className="shrink-0 rounded-full bg-naranja/15 px-2.5 py-0.5 text-sm font-bold text-naranja-700">
                      {t.n}
                    </span>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <Empty>Elige una conversación para verla completa.</Empty>
          )}
        </Panel>
      </div>
    </div>
  );
}

// Caja para atender al cliente en vivo
function Atencion({
  nombre,
  sel,
  toma,
  yo,
  texto,
  setTexto,
  enviando,
  vivo,
}: {
  nombre?: string;
  sel: string;
  toma: Toma | null;
  yo: string;
  texto: string;
  setTexto: (t: string) => void;
  enviando: boolean;
  vivo: (a: "tomar" | "soltar" | "enviar" | "nombre") => void;
}) {
  if (sel.startsWith("msg-"))
    return <p className="mt-4 rounded-xl bg-niebla p-3 text-sm text-gris">Esta conversación es antigua y no se puede atender en vivo.</p>;
  const activa = Boolean(toma?.activa);
  if (!activa)
    return (
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-niebla p-3">
        <Btn onClick={() => vivo("tomar")} disabled={enviando}>
          Tomar conversación
        </Btn>
        <p className="min-w-0 flex-1 text-sm text-gris">
          Cami deja de responder y tú le escribes al cliente directamente en el chat del sitio.
          {nombre ? (
            <>
              {" "}
              Atenderás como <strong>{nombre}</strong>.
            </>
          ) : null}{" "}
          <button type="button" onClick={() => vivo("nombre")} className="font-bold text-cielo-700 underline">
            {nombre ? "Cambiar nombre" : "Elegir nombre"}
          </button>
        </p>
      </div>
    );
  if (toma && toma.email !== yo)
    return <p className="mt-4 rounded-xl bg-naranja/15 p-3 text-sm font-semibold text-naranja-700">{toma.agent} está atendiendo esta conversación.</p>;
  return (
    <form
      className="mt-4 grid gap-2 rounded-xl bg-[#157a3e]/10 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (texto.trim()) vivo("enviar");
      }}
    >
      <p className="text-sm font-bold text-[#157a3e]">
        Atiendes como {toma?.agent}. Cami está en pausa.{" "}
        <button type="button" onClick={() => vivo("nombre")} className="font-bold text-cielo-700 underline">
          Cambiar nombre
        </button>
      </p>
      <textarea
        className="input min-h-20"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (texto.trim()) vivo("enviar");
          }
        }}
        placeholder="Escribe tu respuesta… (Enter envía, Shift+Enter salto de línea)"
        maxLength={800}
        aria-label="Respuesta al cliente"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Btn type="submit" disabled={enviando || !texto.trim()}>
          Enviar
        </Btn>
        <Btn variant="ghost" onClick={() => vivo("soltar")} disabled={enviando}>
          Devolver a Cami
        </Btn>
        <span className="text-xs text-gris">Si pasan 20 minutos sin que escribas, Cami retoma sola.</span>
      </div>
    </form>
  );
}
