// Fotos de la galería (rutas del WordPress original: wp-content/uploads/AAAA/MM/archivo).
// Se descargan al repo con la GitHub Action "Migrar WordPress" → src/assets/media/...
export type GaleriaTag = 'nautico' | 'trekking' | 'ciudad' | 'costa' | 'alojamiento';

export const galeriaTags: Record<GaleriaTag, string> = {
  nautico: 'SUP y kayak',
  trekking: 'Trekking y cabalgatas',
  ciudad: 'Concepción',
  costa: 'Costa',
  alojamiento: 'Alojamientos',
};

export const galeria: { src: string; alt: string; tag: GaleriaTag }[] = [
  { src: '2024/11/Sup-agua-Cristalina-Penco.jpg', alt: 'SUP en las aguas cristalinas de la bahía de Penco', tag: 'nautico' },
  { src: '2024/11/Bismarck-scaled.jpg', alt: 'Torre Bismarck en el Cerro Caracol, Concepción', tag: 'trekking' },
  { src: '2024/10/CabalgataHualpen-scaled.jpg', alt: 'Cabalgata por la península de Hualpén', tag: 'trekking' },
  { src: '2024/11/Sup-espalda-penco.jpg', alt: 'Remando en SUP frente a Penco', tag: 'nautico' },
  { src: '2024/11/rock.jpg', alt: 'Concepción, la Ciudad del Rock', tag: 'ciudad' },
  { src: '2024/10/tunel-penco.jpg', alt: 'Túnel ferroviario de Penco', tag: 'trekking' },
  { src: '2024/11/Ramuntcho.jpg', alt: 'Playa Ramuntcho en Hualpén', tag: 'costa' },
  { src: '2024/10/supdichato-scaled-e1732736023522.jpg', alt: 'Clase de SUP en Dichato', tag: 'nautico' },
  { src: '2024/11/CCP-teatro-1.jpg', alt: 'Teatro Biobío en Concepción', tag: 'ciudad' },
  { src: '2024/10/casa-poli-e1732202603523.jpg', alt: 'Casa Poli en Coliumo, Tomé', tag: 'costa' },
  { src: '2024/11/Sup-Stand-Penco-copia.jpg', alt: 'Grupo de SUP en Penco', tag: 'nautico' },
  { src: '2024/10/IMG_20230826_153908-scaled.jpg', alt: 'Grupo en ruta de trekking en el Biobío', tag: 'trekking' },
  { src: '2024/10/IMG-20231118-WA0235.jpg', alt: 'Salida grupal de Turismo Avatar', tag: 'nautico' },
  { src: '2024/10/IMG-20231118-WA0230.jpg', alt: 'Viajeros disfrutando una experiencia en el Biobío', tag: 'nautico' },
  { src: '2024/10/arauco-1.jpg', alt: 'Costa de Arauco', tag: 'costa' },
  { src: '2024/11/GOPR1647_1720721831625-1024x1024.jpg', alt: 'Cabaña con piscina y tinaja en Coliumo', tag: 'alojamiento' },
  { src: '2024/11/GOPR1129-1024x1024.jpg', alt: 'Cabaña con tinaja en Coliumo', tag: 'alojamiento' },
  { src: '2024/11/GOPR0913-1024x1024.jpg', alt: 'Habitación de hotel en Dichato', tag: 'alojamiento' },
];
