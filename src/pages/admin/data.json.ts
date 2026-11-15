// Datos para el panel (protegido por /admin): catálogo, biblioteca de fotos optimizadas, fichas y home publicado.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { getSiteData } from '@/lib/sitedata';
import { allMediaKeys } from '@/lib/media';
import { destinos } from '@/data/destinos';
import home from '@/content/pages/home.json';

export const GET: APIRoute = async () => {
  const site = await getSiteData({ library: true });
  const exps = (await getCollection('experiencias')).sort((a, b) => a.data.order - b.data.order);
  const alojs = (await getCollection('alojamientos')).sort((a, b) => a.data.order - b.data.order);
  const body = {
    builtAt: new Date().toISOString(),
    site,
    library: allMediaKeys().sort(),
    destinos: destinos.map((d) => ({ slug: d.slug, name: d.name })),
    fichas: {
      experiencias: exps.map((e) => ({ id: e.id, data: e.data, body: e.body ?? '' })),
      alojamientos: alojs.map((a) => ({ id: a.id, data: a.data, body: a.body ?? '' })),
    },
    home,
  };
  return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json; charset=utf-8' } });
};
