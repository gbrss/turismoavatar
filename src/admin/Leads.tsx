// Mensajes del formulario de contacto, empresas y proveedores, y suscriptores del newsletter.
import { useEffect, useState } from 'react';
import { api, Empty, Loading, Panel, cls, fmtDateTime, useAdmin, waLink } from './lib';

interface Lead {
  id: number;
  created_at: string;
  kind: string;
  name: string;
  email: string;
  phone: string | null;
  org: string | null;
  message: string;
  status: string;
}
const KIND: Record<string, string> = { contacto: 'Contacto', empresa: 'Empresa / grupo', proveedor: 'Quiere publicar' };

export default function Leads() {
  const { me, toast } = useAdmin();
  const [tab, setTab] = useState<'mensajes' | 'suscriptores'>('mensajes');
  const [items, setItems] = useState<Lead[] | null>(null);
  const [subs, setSubs] = useState<{ email: string; created_at: string; source: string }[] | null>(null);

  useEffect(() => {
    if (!me.servicios.db) return;
    if (tab === 'mensajes') api<{ items: Lead[] }>('/api/admin/leads').then((r) => setItems(r.items));
    else api<{ items: NonNullable<typeof subs> }>('/api/admin/leads?tipo=suscriptores').then((r) => setSubs(r.items));
  }, [tab, me]);

  const setStatus = async (l: Lead, status: string) => {
    await api('/api/admin/leads', { method: 'PATCH', body: JSON.stringify({ id: l.id, status }) });
    setItems((x) => x!.map((i) => (i.id === l.id ? { ...i, status } : i)));
    toast('Actualizado');
  };

  if (!me.servicios.db) return <Empty>Conecta la base de datos D1 para ver los mensajes (ver ADMIN.md).</Empty>;
  return (
    <div className="grid gap-5">
      <div className="flex gap-2">
        {(['mensajes', 'suscriptores'] as const).map((t) => (
          <button key={t} type="button" aria-pressed={tab === t} onClick={() => setTab(t)} className="rounded-full px-4 py-2 text-sm font-bold capitalize ring-1 ring-roca aria-pressed:bg-marino aria-pressed:text-white">
            {t}
          </button>
        ))}
      </div>
      {tab === 'mensajes' ? (
        !items ? (
          <Loading />
        ) : !items.length ? (
          <Empty>Sin mensajes todavía.</Empty>
        ) : (
          items.map((l) => (
            <article key={l.id} className={cls('rounded-2xl bg-white p-5 ring-1 ring-roca', l.status === 'archivado' && 'opacity-60')}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-gris">
                    {KIND[l.kind] ?? l.kind} · {fmtDateTime(l.created_at)}
                  </p>
                  <h3 className="mt-1 font-display text-lg font-extrabold">
                    {l.name}
                    {l.org ? ` · ${l.org}` : ''}
                  </h3>
                  <p className="text-sm text-gris">
                    {l.email}
                    {l.phone ? ` · ${l.phone}` : ''}
                  </p>
                </div>
                <select value={l.status} onChange={(e) => setStatus(l, e.target.value)} className="rounded-full bg-niebla px-3 py-2 text-sm font-bold" aria-label="Estado">
                  <option value="nuevo">Nuevo</option>
                  <option value="respondido">Respondido</option>
                  <option value="archivado">Archivado</option>
                </select>
              </div>
              <p className="mt-3 whitespace-pre-line">{l.message}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {l.phone && (
                  <a href={waLink(l.phone, `Hola ${l.name.split(' ')[0]} 👋 Te escribimos de Turismo Avatar por tu mensaje.`)} target="_blank" rel="noopener" className="inline-flex min-h-10 items-center rounded-full bg-[#157a3e] px-4 text-sm font-bold text-white">
                    WhatsApp
                  </a>
                )}
                <a href={`mailto:${l.email}`} className="inline-flex min-h-10 items-center rounded-full px-4 text-sm font-bold ring-1 ring-roca">
                  Responder por correo
                </a>
              </div>
            </article>
          ))
        )
      ) : !subs ? (
        <Loading />
      ) : (
        <Panel
          title={`${subs.length} suscriptores`}
          actions={
            <button
              type="button"
              onClick={() => {
                const blob = new Blob(['﻿correo;fecha;origen\r\n' + subs.map((s) => `${s.email};${s.created_at};${s.source ?? ''}`).join('\r\n')], { type: 'text/csv' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'suscriptores.csv';
                a.click();
              }}
              className="inline-flex min-h-10 items-center rounded-full px-4 text-sm font-bold ring-1 ring-roca hover:bg-niebla"
            >
              Descargar CSV
            </button>
          }
        >
          <ul className="divide-y divide-roca">
            {subs.map((s) => (
              <li key={s.email} className="flex justify-between gap-3 py-2 text-sm">
                <span className="font-semibold">{s.email}</span>
                <span className="text-gris">{fmtDateTime(s.created_at)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
