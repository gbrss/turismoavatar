// Editor visual del home (Puck): arrastrar, ordenar, duplicar y editar secciones con vista previa real.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Puck, usePuck, type Data } from '@puckeditor/core';
import '@puckeditor/core/puck.css';
import { makeConfig, dictionary, viewports } from './puck-config';
import { api, Btn, Loading, Modal, fmtDateTime, useAdmin } from './lib';

type Estado = 'sin-cambios' | 'guardando' | 'guardado' | 'error';
type Deploy = { state: 'esperando' | 'publicando' | 'publicado' | 'error' | 'desconocido'; url?: string } | null;

interface EdCtx {
  estado: Estado;
  deploy: Deploy;
  publishing: boolean;
  publish: () => void;
  history: () => void;
  dirty: boolean;
  etiquetas: Record<string, string>;
}
const EditorCtx = createContext<EdCtx | null>(null);

// Mostrar u ocultar cada sección del home con un interruptor, sin abrir sus campos
function Secciones() {
  const c = useContext(EditorCtx)!;
  const { appState, dispatch } = usePuck();
  const [abierto, setAbierto] = useState(false);
  const items = appState.data.content;
  const ocultas = items.filter((b) => (b.props as { hidden?: boolean }).hidden).length;
  const alternar = (id: string) => {
    const content = items.map((b) => (b.props.id === id ? { ...b, props: { ...b.props, hidden: !(b.props as { hidden?: boolean }).hidden } } : b));
    dispatch({ type: 'setData', data: { content } });
  };
  return (
    <div className="relative">
      <Btn variant="ghost" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto}>
        Secciones{ocultas ? ` (${ocultas} oculta${ocultas > 1 ? 's' : ''})` : ''}
      </Btn>
      {abierto && (
        <>
          <button type="button" aria-label="Cerrar" className="fixed inset-0 z-[998] cursor-default" onClick={() => setAbierto(false)} />
          <div className="fixed right-4 top-16 z-[999] w-80 max-w-[90vw] rounded-2xl bg-white p-3 text-tinta shadow-xl ring-1 ring-roca" role="dialog" aria-label="Secciones del home">
            <p className="px-2 pb-2 text-sm font-bold">Secciones del home</p>
            <ul className="max-h-[60vh] overflow-y-auto">
              {items.map((b) => {
                const oculta = Boolean((b.props as { hidden?: boolean }).hidden);
                const titulo = (b.props as { title?: string }).title;
                return (
                  <li key={b.props.id} className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 hover:bg-niebla">
                    <span className="min-w-0">
                      <span className={`block truncate text-sm font-bold ${oculta ? 'text-gris line-through' : ''}`}>{c.etiquetas[b.type] ?? b.type}</span>
                      {titulo && <span className="block truncate text-xs text-gris">{titulo}</span>}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!oculta}
                      aria-label={`${oculta ? 'Mostrar' : 'Ocultar'} ${c.etiquetas[b.type] ?? b.type}`}
                      onClick={() => alternar(b.props.id)}
                      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${oculta ? 'bg-roca' : 'bg-[#1f9d55]'}`}
                    >
                      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${oculta ? 'left-0.5' : 'left-[22px]'}`} />
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="px-2 pt-2 text-xs text-gris">Las ocultas no aparecen en el sitio. Presiona Publicar para aplicar.</p>
          </div>
        </>
      )}
    </div>
  );
}

function HeaderActions() {
  const c = useContext(EditorCtx)!;
  const label = { 'sin-cambios': 'Sin cambios', guardando: 'Guardando…', guardado: 'Borrador guardado', error: 'No se pudo guardar' }[c.estado];
  const dep = c.deploy && {
    esperando: 'En cola para publicar…',
    publicando: 'Publicando en el sitio…',
    publicado: '✓ Publicado en el sitio',
    error: 'Error al publicar',
    desconocido: 'Publicado (revisa el sitio en 2-3 min)',
  }[c.deploy.state];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a href="#/" className="rounded-full px-3 py-2 text-sm font-bold text-gris hover:bg-niebla">
        ← Panel
      </a>
      <span className={`hidden max-w-40 text-xs font-semibold xl:inline ${c.estado === 'error' ? 'text-red-700' : 'text-gris'}`}>{dep ?? label}</span>
      <Secciones />
      <Btn variant="ghost" onClick={c.history}>
        Historial
      </Btn>
      <a href="/" target="_blank" rel="noopener" className="hidden rounded-full px-3 py-2 text-sm font-bold text-cielo-700 hover:bg-niebla 2xl:inline">
        Ver sitio
      </a>
      <Btn onClick={c.publish} disabled={c.publishing || (!c.dirty && c.deploy?.state !== 'error')}>
        {c.publishing ? 'Publicando…' : 'Publicar'}
      </Btn>
    </div>
  );
}

// Estable entre renders: si cambiara, el encabezado se volvería a montar y el menú de secciones se cerraría al tocar un interruptor
const overrides = { headerActions: () => <HeaderActions /> };

export default function HomeEditor() {
  const { data: admin, me, toast } = useAdmin();
  const config = useMemo(() => makeConfig(admin), [admin]);
  const etiquetas = useMemo(() => Object.fromEntries(Object.entries(config.components).map(([k, v]) => [k, (v as { label?: string }).label ?? k])), [config]);
  const [initial, setInitial] = useState<Data | null>(null);
  const [version, setVersion] = useState(0);
  const [aviso, setAviso] = useState<string | null>(null);
  const [estado, setEstado] = useState<Estado>('sin-cambios');
  const [dirty, setDirty] = useState(false);
  const [deploy, setDeploy] = useState<Deploy>(null);
  const [publishing, setPublishing] = useState(false);
  const [histOpen, setHistOpen] = useState(false);
  const current = useRef<Data | null>(null);
  const baseline = useRef('');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Carga: borrador pendiente → versión publicada más reciente (GitHub) → la del último build
  useEffect(() => {
    (async () => {
      let base = admin.home as Data;
      if (me.servicios.github) {
        const r = await api<{ text: string | null }>('/api/admin/history?target=home&actual=1').catch(() => null);
        if (r?.text) base = JSON.parse(r.text);
      }
      const d = await api<{ draft: { data: Data; updated_at: string; updated_by: string } | null }>('/api/admin/drafts/home').catch(() => ({ draft: null }));
      if (d.draft) {
        setAviso(`Estás viendo un borrador sin publicar (${fmtDateTime(d.draft.updated_at)}, ${d.draft.updated_by}).`);
        setDirty(true);
        current.current = d.draft.data;
        baseline.current = JSON.stringify(d.draft.data);
        setInitial(d.draft.data);
      } else {
        current.current = base;
        baseline.current = JSON.stringify(base);
        setInitial(base);
      }
    })();
  }, [admin, me]);

  const onChange = useCallback(
    (d: Data) => {
      current.current = d;
      const json = JSON.stringify(d);
      if (json === baseline.current) return; // carga inicial: nada cambió
      baseline.current = json;
      setDirty(true);
      setEstado('guardando');
      clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        try {
          await api('/api/admin/drafts/home', { method: 'PUT', body: JSON.stringify(d) });
          setEstado('guardado');
        } catch {
          setEstado('error');
        }
      }, 1500);
    },
    [],
  );

  // Seguimiento del build en Cloudflare Pages
  const poll = useCallback(async (sha: string) => {
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, i ? 8000 : 4000));
      const s = await api<NonNullable<Deploy>>(`/api/admin/publish?sha=${sha}`).catch(() => ({ state: 'desconocido' as const }));
      setDeploy(s);
      if (s.state === 'publicado' || s.state === 'error' || s.state === 'desconocido') return;
    }
  }, []);

  const publish = useCallback(async () => {
    if (!current.current) return;
    if (!me.servicios.github) return toast('Falta configurar GITHUB_TOKEN para publicar (ver ADMIN.md).', 'error');
    setPublishing(true);
    try {
      clearTimeout(timer.current);
      const r = await api<{ sha: string }>('/api/admin/publish', { method: 'POST', body: JSON.stringify({ target: 'home', data: current.current }) });
      setDirty(false);
      setAviso(null);
      setEstado('sin-cambios');
      setDeploy({ state: 'esperando' });
      toast('Enviado. El sitio se actualiza en 1 a 3 minutos.');
      poll(r.sha);
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setPublishing(false);
    }
  }, [me, toast, poll]);

  const discard = async () => {
    if (!confirm('¿Descartar el borrador y volver a lo publicado?')) return;
    await api('/api/admin/drafts/home', { method: 'DELETE' });
    location.reload();
  };

  const restore = (d: Data) => {
    current.current = d;
    setInitial(d);
    setVersion((v) => v + 1);
    onChange(d);
    setHistOpen(false);
    toast('Versión cargada. Revísala y presiona Publicar para dejarla en el sitio.');
  };

  if (!initial) return <Loading />;
  return (
    <EditorCtx.Provider value={{ estado, deploy, publishing, publish, history: () => setHistOpen(true), dirty, etiquetas }}>
      {aviso && (
        <div className="flex flex-wrap items-center justify-center gap-3 bg-naranja/15 px-4 py-2 text-sm font-semibold text-naranja-700">
          {aviso}
          <button type="button" onClick={discard} className="underline">
            Descartar borrador
          </button>
        </div>
      )}
      <Puck
        key={version}
        config={config}
        data={initial}
        onChange={onChange}
        headerTitle="Home de turismoavatar.cl"
        dictionary={dictionary}
        viewports={viewports}
        height={aviso ? 'calc(100dvh - 36px)' : '100dvh'}
        iframe={{ enabled: true, waitForStyles: true }}
        overrides={overrides}
      />
      <History open={histOpen} onClose={() => setHistOpen(false)} onRestore={restore} />
    </EditorCtx.Provider>
  );
}

function History({ open, onClose, onRestore }: { open: boolean; onClose: () => void; onRestore: (d: Data) => void }) {
  const [items, setItems] = useState<{ sha: string; message: string; author: string; date: string }[] | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!open) return;
    setItems(null);
    api<{ items: typeof items; error?: string }>('/api/admin/history?target=home')
      .then((r) => (setItems(r.items ?? []), setErr(r.error ?? '')))
      .catch((e) => setErr(e.message));
  }, [open]);
  const load = async (sha: string) => {
    const r = await api<{ text: string }>(`/api/admin/history?target=home&sha=${sha}`);
    onRestore(JSON.parse(r.text));
  };
  return (
    <Modal open={open} onClose={onClose} title="Versiones publicadas">
      {err && <p className="mb-3 text-sm text-red-700">{err}</p>}
      {!items ? (
        <Loading />
      ) : (
        <ol className="divide-y divide-roca">
          {items.map((c, i) => (
            <li key={c.sha} className="flex items-center justify-between gap-3 py-3">
              <span>
                <span className="block text-sm font-bold">{c.message.replace(/^Panel: /, '')}</span>
                <span className="text-xs text-gris">
                  {fmtDateTime(c.date)} · {c.author}
                  {i === 0 ? ' · actual' : ''}
                </span>
              </span>
              <Btn variant="ghost" onClick={() => load(c.sha)}>
                Restaurar
              </Btn>
            </li>
          ))}
        </ol>
      )}
    </Modal>
  );
}
