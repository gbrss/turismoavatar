// Datos centrales del negocio. Editar aquí actualiza todo el sitio, el schema.org y el chatbot.
export const site = {
  name: 'Turismo Avatar',
  legalName: 'Turismo Avatar',
  tagline: 'Diseñamos experiencias memorables en la Región del Biobío',
  description:
    'Tour operador en Concepción desde 2018. City tours, trekking al Cerro Caracol, SUP, kayak, canopy, lagunas, playas y alojamientos en el Gran Concepción y la Región del Biobío.',
  url: 'https://www.turismoavatar.cl',
  foundingYear: 2018,
  founder: 'Antonio Osses',
  phone: '+56949981427',
  phoneDisplay: '+56 9 4998 1427',
  whatsapp: '56949981427',
  whatsappGreeting: 'Hola Turismo Avatar 👋 Quiero información sobre',
  email: 'contacto@turismoavatar.cl',
  email2: 'turismoavatar@gmail.com',
  address: 'Barros Arana 492, oficina 78',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Barros+Arana+492+Concepci%C3%B3n+Chile',
  city: 'Concepción',
  region: 'Región del Biobío',
  country: 'CL',
  // Coordenadas aproximadas de Concepción centro (para schema.org / mapas)
  geo: { lat: -36.8279, lng: -73.0512 },
  hours: 'Atención por WhatsApp las 24 horas',
  social: {
    instagram: 'https://www.instagram.com/turismoavatar',
    facebook: 'https://www.facebook.com/turismoavatarchile',
    youtube: 'https://www.youtube.com/@turismoavatar',
    tiktok: 'https://www.tiktok.com/@turismoavatar',
    threads: 'https://www.threads.com/@turismoavatar',
  },
  featuredVideo: 'B__VK6fS8u8',
  // Video de fondo del hero (YouTube, sin audio ni controles). Tramo en segundos.
  heroVideo: { id: 'WzfrMOR4XJk', start: 95, end: 125 },
  assistantName: 'Cami',
  // Videos del canal de YouTube @turismoavatar (miniaturas descargadas en src/assets/media/youtube)
  videos: [
    { id: 'B__VK6fS8u8', title: 'Turismo Avatar en Chile' },
    { id: 'ieE0XLv0mW4', title: 'Increíble descubrimiento en SUP en el Biobío' },
    { id: 'bzR2UUQxBPk', title: 'Biobío me inspira' },
    { id: 'Bk-u5Fe__eI', title: 'Atardecer en Laguna Grande, San Pedro de la Paz' },
    { id: 'WzfrMOR4XJk', title: 'Remando en SUP por el Biobío' },
    { id: 'aUodZdx7wPw', title: 'Rally Chile Biobío con Turismo Avatar' },
  ],
  shorts: ['3Ntig1N9F1k', 'RyMleOQLDmc', 'ytzjz8hy4bs'],
  mission:
    'Crear experiencias turísticas transformadoras en el Biobío que despierten el alma de quienes nos visitan, fortaleciendo el desarrollo local mediante alianzas sostenibles y generando valor para nuestros clientes, comunidades y nuestro equipo.',
  vision:
    'Consolidarnos como la empresa líder en experiencias turísticas del Biobío, uniendo el crecimiento económico con un turismo que transforma vidas y enriquece comunidades.',
  memberships: [
    'Corporación de Turismo de Tomé',
    'Cooperativa de Borde Costero Tomé',
    'Registro de Servicios Turísticos SERNATUR',
  ],
  press: [
    {
      outlet: 'TVU — Matinal Siempre Juntos',
      title: 'Turismo Avatar ofrece city tours, actividades náuticas, trekking y más en la Región del Biobío',
      url: 'https://www.tvu.cl/programas/siempre-juntos/2024/02/06/turismo-avatar-ofrece-city-tours-actividades-nauticas-trekking-y-mas-en-la-region-del-biobio.html',
      date: '2024-02-06',
    },
    {
      outlet: 'TVU — Matinal Siempre Juntos',
      title: 'Contacto con la naturaleza: city tours, actividades náuticas y trekking',
      url: 'https://www.tvu.cl/programas/siempre-juntos/2024/09/03/contacto-con-la-naturaleza-turismo-avatar-ofrece-city-tours-actividades-nauticas-y-trekking.html',
      date: '2024-09-03',
    },
  ],
} as const;

export const nav = [
  { href: '/experiencias', label: 'Experiencias' },
  { href: '/alojamientos', label: 'Alojamientos' },
  { href: '/programas', label: 'Programas' },
  { href: '/tercera-edad', label: 'Tercera edad' },
  { href: '/destinos', label: 'Destinos' },
  { href: '/tienda', label: 'Tienda' },
  { href: '/galeria', label: 'Galería' },
  { href: '/quienes-somos', label: 'Nosotros' },
  { href: '/contacto', label: 'Contacto' },
] as const;

export function whatsappLink(message?: string) {
  const text = message ?? `${site.whatsappGreeting} sus experiencias.`;
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;
}

export const clp = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
