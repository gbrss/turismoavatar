// Información del programa Vacaciones Tercera Edad (Sernatur): https://vacacionesterceraedad.cl
// Valores y condiciones tomados de ese sitio; los precios son por persona, base habitación doble, y se confirman al reservar.
export const fuente = { nombre: 'vacacionesterceraedad.cl', url: 'https://vacacionesterceraedad.cl/' };

export const contactoSernatur = { atiende: '600 600 60 66', whatsapp: '+56 9 9458 0453', correo: 'turismoatiende@sernatur.cl' };

export interface DestinoDetalle {
  /** id del programa (src/content/programas) */
  id: string;
  foto: string;
  temporada?: string;
  excursion?: { nombre: string; duracion: string; detalle: string[] };
  opcional?: { nombre: string; duracion: string; detalle: string; precio?: string; minimo?: string };
  alojamiento?: string[];
  nota?: string;
}

export const destinos: DestinoDetalle[] = [
  {
    id: 'tercera-edad-angostura-del-biobio',
    foto: '2026/11/ta-angostura.webp',
    temporada: 'Temporada baja',
    excursion: {
      nombre: 'Museo Pehuenche Alto Biobío y Parque Angostura',
      duracion: '3 horas',
      detalle: ['Visita al museo pehuenche', 'Mirador Huequecura en el Parque Angostura', 'Recorrido para conocer la energía de la zona'],
    },
    opcional: {
      nombre: 'Ruta de la Miel, Santa Bárbara',
      duracion: '3 horas',
      detalle: 'Santa Bárbara, conocida por su miel: centro cultural, apicultores locales y las letras volumétricas del pueblo.',
      precio: '$35.000',
      minimo: 'mínimo 40 pasajeros',
    },
    alojamiento: ['Cabañas Rincón del Lago', 'Cabañas Wirkaleufu'],
  },
  {
    id: 'tercera-edad-canete-lago-lanalhue',
    foto: '2026/11/ta-canete.webp',
    nota: 'Te confirmamos excursiones, alojamiento y fechas al reservar.',
  },
  {
    id: 'tercera-edad-lonquimay',
    foto: '2026/11/ta-lonquimay.webp',
    temporada: 'Temporada media',
    excursion: {
      nombre: 'Reserva Nacional Malalcahuello',
      duracion: '3 horas',
      detalle: [
        'Recorrido por la reserva: fauna como la vizcacha de montaña y el halcón peregrino, y flora de araucarias y especies nativas',
        'Vista desde las cercanías del volcán Lonquimay',
        'Caminata corta por el Sendero Pehuenco hasta la laguna del mismo nombre',
      ],
    },
    nota: 'El alojamiento y las fechas se confirman al reservar.',
  },
  {
    id: 'tercera-edad-valle-las-trancas',
    foto: '2026/11/ta-trancas.webp',
    nota: 'Te confirmamos excursiones, alojamiento y fechas al reservar.',
  },
];

export const incluye = [
  'Transporte terrestre',
  'Alojamiento en habitación doble o triple con baño privado (hoteles, cabañas, lodges o similares)',
  'Pensión completa: desayuno, almuerzo y cena',
  'Guía de turismo',
  'Dos excursiones incluidas y una actividad recreativa',
  'Asistencia paramédica preventiva, en el horario publicado en cada alojamiento',
  'Seguro de asistencia en viaje (no es un seguro de salud)',
];

export const noIncluye = ['Tours opcionales, que paga cada pasajero', 'Extras personales como lavandería, llamadas o frigobar', 'Habitación individual, salvo que el hotel la tenga: se paga la diferencia'];

export const quienes = [
  'Personas de 60 años o más, chilenas o extranjeras con cédula chilena.',
  'Jubilados, pensionados o montepiados de cualquier sistema previsional, mayores de 18 años, aunque tengan menos de 60.',
  'Personas con discapacidad mayores de 18 años, solas o con alguien que las ayude en el viaje y en las actividades.',
  'Cada pasajero con cupo regular puede viajar con un acompañante mayor de 18 años.',
  'No pueden viajar menores de 18 años.',
];

export const documentos = [
  'Cédula de identidad de todos los pasajeros.',
  'Jubilados y pensionados: último comprobante de pago o documento equivalente, anterior al viaje.',
  'Personas con discapacidad: credencial COMPIN o SENADIS, o certificado o resolución equivalente, anterior al viaje.',
];

export const cancelaciones = [
  { cuando: '30 días o más antes de la salida', que: 'Devolución total menos la comisión de agencia. El cambio de fecha es gratis.' },
  { cuando: 'Entre 29 y 21 días', que: 'Devolución menos la comisión de agencia y el 10 % del copago.' },
  { cuando: 'Entre 20 y 15 días', que: 'Devolución menos la comisión de agencia y el 20 % del copago.' },
  { cuando: 'Entre 14 y 7 días', que: 'Devolución menos la comisión de agencia y el 40 % del copago.' },
  { cuando: '6 días o menos', que: 'Devolución menos la comisión de agencia y el 70 % del copago.' },
];

export const preguntas = [
  { q: '¿Qué es Vacaciones Tercera Edad?', a: 'Es el programa de turismo social de Sernatur, con más de 20 años, que ofrece paquetes subsidiados para personas mayores, jubiladas, pensionadas y con discapacidad. Busca llevar turismo a destinos de baja demanda y apoyar a los negocios locales.' },
  { q: '¿Qué son las Escapadas?', a: 'Viajes cortos de 3 o 4 días dentro de tu región o regiones vecinas, con transporte terrestre y todo incluido. Los destinos van desde Arica hasta Magallanes.' },
  { q: '¿Qué diferencia hay entre cupo regular y cupo social?', a: 'El cupo regular se compra directamente a través de una agencia, sin postular. El cupo social se entrega a municipalidades y clubes de adulto mayor que postulan antes a Sernatur; las personas se inscriben con su municipalidad.' },
  { q: '¿Cómo se paga?', a: 'En efectivo o con tarjetas bancarias o comerciales, en cuotas según el contrato de tu tarjeta. Sernatur no recibe pagos: en el cupo regular se paga al operador del viaje.' },
  { q: '¿Qué pasa si viajo solo?', a: 'Compartes habitación con otro pasajero del mismo sexo. Si el hotel tiene habitación individual puedes pedirla pagando la diferencia.' },
  { q: '¿Y si necesito una dieta especial?', a: 'Avísanos al reservar y adjunta el certificado médico. Se pueden atender dietas bajas en sal o calorías, vegetarianas y sin gluten.' },
  { q: '¿Las fechas son fijas?', a: 'No. Todas las fechas de viaje están sujetas a cambios y se confirman con la agencia. Cuando hay nuevas salidas se anuncian en las redes de Sernatur.' },
  { q: '¿Cuánto pagaría si soy extranjero sin cédula chilena?', a: 'No recibes el subsidio, pero no se te puede cobrar más que el valor completo del paquete.' },
];
