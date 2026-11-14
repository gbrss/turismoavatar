// Catálogo en JSON generado en build: lo consume el chatbot (/api/chat) y sirve para integraciones.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { site } from '@/data/site';
import { destinos } from '@/data/destinos';
import { faq } from '@/data/faq';
import { categorias } from '@/content.config';

export const GET: APIRoute = async () => {
  const exps = (await getCollection('experiencias')).sort((a, b) => a.data.order - b.data.order);
  const alojs = (await getCollection('alojamientos')).sort((a, b) => a.data.order - b.data.order);
  const progs = (await getCollection('programas')).sort((a, b) => a.data.order - b.data.order);
  const body = {
    site: { name: site.name, phone: site.phoneDisplay, whatsapp: site.whatsapp, email: site.email, city: site.city, region: site.region, hours: site.hours, foundingYear: site.foundingYear },
    experiencias: exps.map((e) => ({
      slug: e.id,
      url: `/experiencias/${e.id}`,
      title: e.data.title,
      category: categorias[e.data.category],
      destinos: e.data.destinos,
      summary: e.data.summary,
      duration: e.data.duration,
      difficulty: e.data.difficulty,
      price: e.data.priceFrom ? `desde $${e.data.priceFrom.toLocaleString('es-CL')} por ${e.data.priceUnit}` : 'a consultar',
      minAge: e.data.minAge,
      meetingPoint: e.data.meetingPoint,
      includes: e.data.includes,
    })),
    alojamientos: alojs.map((a) => ({
      slug: a.id,
      url: `/alojamientos/${a.id}`,
      title: a.data.title,
      location: a.data.location,
      pricePerNight: a.data.pricePerNight,
      capacity: a.data.capacity,
      amenities: a.data.amenities,
    })),
    programas: progs.map((p) => ({ slug: p.id, url: `/programas#${p.id}`, title: p.data.title, days: p.data.days, summary: p.data.summary })),
    destinos: destinos.map((d) => ({ slug: d.slug, name: d.name, url: `/destinos/${d.slug}`, summary: d.summary })),
    faq,
  };
  return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json; charset=utf-8' } });
};
