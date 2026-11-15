// Conversaciones con Cami: lista por sesión, conversación completa y preguntas más repetidas.
import { useEffect, useRef, useState } from "react";
import { useSilentReload } from "./live";
import {
  api,
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
    api<{ items: Msg[] }>(
      `/api/admin/chats?sesion=${encodeURIComponent(sel)}`,
    ).then((r) =>
      setMsgs((prev) => {
        // Mensajes nuevos de la conversación abierta: baja al final
        if (!prev || r.items.length > prev.length) setTimeout(alFinal, 30);
        return r.items;
      }),
    );
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
                    {msgs.map((m) => (
                      <li key={m.id} className="grid gap-2">
                        <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-marino px-4 py-2.5 text-white">
                          {m.question}
                        </p>
                        <div className="max-w-[90%] rounded-2xl rounded-bl-md bg-niebla px-4 py-2.5">
                          <p className="whitespace-pre-line">{m.answer}</p>
                          <p className="mt-1.5 text-[11px] font-semibold text-gris">
                            Cami · {fmtDateTime(m.created_at)} ·{" "}
                            {m.engine === "ai"
                              ? "IA"
                              : m.engine === "humano"
                                ? "derivó a persona"
                                : "respuesta automática"}
                            {m.handoff ? " · ofreció WhatsApp" : ""}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
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
