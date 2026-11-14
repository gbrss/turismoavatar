// Destinos del Gran Concepción y alrededores (los 11 que publicaba el sitio WordPress).
// lat/lng aproximados: se usan para el mapa ilustrado de la portada y para schema.org.
export interface Destino {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  summary: string;
  highlights: string[];
  image?: string;
}

export const destinos: Destino[] = [
  {
    slug: 'concepcion',
    name: 'Concepción',
    lat: -36.827,
    lng: -73.05,
    summary:
      'La capital del Biobío y Ciudad del Rock: lagunas en medio de la ciudad, el Cerro Caracol, el campus de la UdeC y su vida cultural.',
    highlights: ['Parque Ecuador y Cerro Caracol', 'Torre Bismarck', 'Laguna Lo Galindo y Lo Méndez', 'Campus Universidad de Concepción', 'Teatro Biobío'],
    image: '2024/11/CCP-teatro-1.jpg',
  },
  {
    slug: 'tome',
    name: 'Tomé',
    lat: -36.617,
    lng: -72.957,
    summary:
      'Costa de playas y caletas: Dichato, Coliumo y el río Menque. Nuestra base para SUP, cabañas con tinaja y desconexión frente al mar.',
    highlights: ['Dichato', 'Coliumo', 'Río Menque', 'Playa Bellavista', 'Casa Poli'],
    image: '2024/10/supdichato-scaled-e1732736023522.jpg',
  },
  {
    slug: 'penco',
    name: 'Penco',
    lat: -36.74,
    lng: -72.996,
    summary:
      'Bahía de aguas tranquilas y cristalinas, ideal para SUP. Historia ferroviaria con su antiguo túnel y la playa de Penco.',
    highlights: ['SUP en aguas cristalinas', 'Túnel ferroviario', 'Fuerte La Planchada', 'Playa de Penco'],
    image: '2024/11/Sup-agua-Cristalina-Penco.jpg',
  },
  {
    slug: 'talcahuano',
    name: 'Talcahuano',
    lat: -36.725,
    lng: -73.117,
    summary: 'Puerto, caletas y la península de Tumbes con vistas a la Isla Quiriquina y la bahía de Concepción.',
    highlights: ['Península de Tumbes', 'Caleta Tumbes', 'Costanera y puerto', 'Huáscar'],
  },
  {
    slug: 'hualpen',
    name: 'Hualpén',
    lat: -36.79,
    lng: -73.13,
    summary:
      'Santuario de la naturaleza: desembocadura del Biobío, Caleta Lenga, playa Ramuntcho, cabalgatas y canopy entre bosque nativo.',
    highlights: ['Desembocadura del Biobío', 'Caleta Lenga', 'Playa Ramuntcho', 'Cabalgatas', 'Parque Museo Pedro del Río Zañartu'],
    image: '2024/10/CabalgataHualpen-scaled.jpg',
  },
  {
    slug: 'san-pedro-de-la-paz',
    name: 'San Pedro de la Paz',
    lat: -36.845,
    lng: -73.105,
    summary: 'Lagunas Grande y Chica para remar en aguas calmas, atardeceres y humedales a minutos de Concepción.',
    highlights: ['Laguna Grande', 'Laguna Chica', 'Humedal Los Batros'],
  },
  {
    slug: 'chiguayante',
    name: 'Chiguayante',
    lat: -36.925,
    lng: -73.03,
    summary: 'A orillas del río Biobío, con cerros y senderos verdes para caminatas cortas y miradores.',
    highlights: ['Ribera del Biobío', 'Senderos y miradores'],
  },
  {
    slug: 'coronel',
    name: 'Coronel',
    lat: -37.03,
    lng: -73.155,
    summary: 'Ciudad carbonífera y costera: patrimonio minero, playas y caletas del golfo de Arauco.',
    highlights: ['Patrimonio minero', 'Playa Blanca', 'Caleta Lo Rojas'],
  },
  {
    slug: 'lota',
    name: 'Lota',
    lat: -37.09,
    lng: -73.157,
    summary: 'Circuito patrimonial del carbón: Chiflón del Diablo, Parque Isidora Cousiño y vistas al golfo de Arauco.',
    highlights: ['Mina Chiflón del Diablo', 'Parque Isidora Cousiño', 'Pabellón 83'],
  },
  {
    slug: 'arauco',
    name: 'Arauco',
    lat: -37.247,
    lng: -73.317,
    summary: 'Cerro Colo Colo, playas extensas y la puerta de entrada a la provincia de Arauco.',
    highlights: ['Cerro Colo Colo', 'Playa Llico', 'Laraquete'],
    image: '2024/10/arauco-1.jpg',
  },
  {
    slug: 'santa-juana',
    name: 'Santa Juana',
    lat: -37.17,
    lng: -72.94,
    summary: 'Interior rural junto al Biobío: fuerte colonial, cerros y vida de campo.',
    highlights: ['Fuerte de Santa Juana', 'Río Biobío', 'Turismo rural'],
  },
];

export const destinoBySlug = (slug: string) => destinos.find((d) => d.slug === slug);
