// Productos de la tienda (WooCommerce original: categoría "Accesorios"). Venta por WhatsApp / solicitud.
export interface Producto {
  slug: string;
  name: string;
  price: number;
  compareAt?: number;
  image: string;
  summary: string;
  specs: string[];
}

export const productos: Producto[] = [
  {
    slug: 'mochila-camping-90l',
    name: 'Mochila de camping 90L',
    price: 25000,
    compareAt: 29990,
    image: '2024/09/medium-shot-woman-sitting-log-scaled.webp',
    summary: 'Mochila impermeable de gran capacidad, con sistema de transporte cómodo y transpirable que mejora la circulación de aire entre el cuerpo y la mochila.',
    specs: [
      'Material: nylon impermeable',
      'Tamaño: 36 × 60 × 20 cm',
      'Unisex · colores negro, verde, azul y rojo',
      'Bolsillo para computador, celular y tarjetas, y bolsillo oculto con cierre',
      'Para senderismo, viajes y vacaciones',
    ],
  },
  {
    slug: 'mochila',
    name: 'Mochila',
    price: 35000,
    image: '2024/09/medium-shot-woman-sitting-log.webp',
    summary: 'Mochila para tus salidas de trekking y viajes.',
    specs: ['Ideal para trekking y viajes', 'Consulta colores y disponibilidad por WhatsApp'],
  },
];
