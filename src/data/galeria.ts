// Fotos reales de Turismo Avatar (extraídas del sitio WordPress y del canal de YouTube).
// Las que no estén descargadas se omiten automáticamente.
export type GaleriaTag = 'nautico' | 'trekking' | 'ciudad' | 'costa' | 'alojamiento';

export const galeriaTags: Record<GaleriaTag, string> = {
  nautico: 'SUP y kayak',
  trekking: 'Trekking y aventura',
  ciudad: 'Concepción',
  costa: 'Costa',
  alojamiento: 'Alojamientos',
};

export const galeria: { src: string; alt: string; tag: GaleriaTag }[] = [
  { src: '2024/11/GOPR3756_1737677330009-scaled.jpg', alt: 'Grupo remando en SUP en la bahía de Dichato', tag: 'nautico' },
  { src: '2025/07/GOPR3576_1737327895652-scaled.jpg', alt: 'Grupo en el Trekking Tour Tomé', tag: 'trekking' },
  { src: '2024/11/Bismarck-scaled.jpg', alt: 'Torre Bismarck en el Cerro Caracol, Concepción', tag: 'ciudad' },
  { src: '2025/08/GOPR5827-scaled-e1747705915168-1024x1024-1.webp', alt: 'Guía de Turismo Avatar con su tabla de SUP', tag: 'nautico' },
  { src: '2025/08/IMG_20231204_121219.jpg', alt: 'Vuelo en parapente sobre el Biobío', tag: 'trekking' },
  { src: '2025/08/CabalgataHualpen-600x338-1.webp', alt: 'Cabalgata por los senderos de Hualpén', tag: 'trekking' },
  { src: 'youtube/Bk-u5Fe__eI.jpg', alt: 'Atardecer en Laguna Grande, San Pedro de la Paz', tag: 'ciudad' },
  { src: '2025/08/casa-poli-768x432-1.webp', alt: 'Atardecer frente a Casa Poli, Coliumo', tag: 'costa' },
  { src: '2025/08/tunel-penco-300x300-1.webp', alt: 'Ruta por el túnel ferroviario de Penco', tag: 'trekking' },
  { src: '2025/08/Penco-600x398-1.webp', alt: 'Playa de Penco en verano', tag: 'costa' },
  { src: 'youtube/ieE0XLv0mW4.jpg', alt: 'Sonrisas arriba de la tabla de SUP', tag: 'nautico' },
  { src: '2025/08/CCP-teatro-1-600x601-1.webp', alt: 'Atardecer sobre el río Biobío y el Teatro Biobío', tag: 'ciudad' },
  { src: 'youtube/B__VK6fS8u8.jpg', alt: 'Turismo Avatar en la nieve del volcán', tag: 'trekking' },
  { src: 'youtube/WzfrMOR4XJk.jpg', alt: 'Remando en SUP por aguas tranquilas', tag: 'nautico' },
  { src: '2025/08/tour-300x300-1.webp', alt: 'Grupo de trekking en ruta', tag: 'trekking' },
  { src: 'youtube/aUodZdx7wPw.jpg', alt: 'Equipo de Turismo Avatar en el Rally Chile Biobío', tag: 'trekking' },
  { src: '2024/11/Sup-agua-Cristalina-Penco.jpg', alt: 'SUP en las aguas cristalinas de Penco', tag: 'nautico' },
  { src: '2024/11/Sup-Stand-Penco-copia.jpg', alt: 'Grupo de SUP en Penco', tag: 'nautico' },
  { src: '2024/11/Ramuntcho.jpg', alt: 'Playa Ramuntcho en Hualpén', tag: 'costa' },
  { src: '2024/11/rock.jpg', alt: 'Concepción, la Ciudad del Rock', tag: 'ciudad' },
  { src: '2024/10/IMG-20231118-WA0235.jpg', alt: 'Salida grupal de Turismo Avatar', tag: 'nautico' },
  { src: '2024/10/arauco-1.jpg', alt: 'Costa de Arauco', tag: 'costa' },
  { src: '2024/11/GOPR1647_1720721831625.jpg', alt: 'Cabaña con piscina y tinaja en Coliumo', tag: 'alojamiento' },
  { src: '2024/11/GOPR1129.jpg', alt: 'Tinaja de la cabaña en Coliumo', tag: 'alojamiento' },
  { src: '2024/11/GOPR0913.jpg', alt: 'Habitación de hotel en Dichato', tag: 'alojamiento' },
  { src: '2025/08/GOPR1056.webp', alt: 'Cabaña de madera para descansar', tag: 'alojamiento' },
  { src: '2024/11/GOPR1146.jpg', alt: 'Cabaña en Los Quiyalles, Tomé', tag: 'alojamiento' },
  { src: '2024/11/GOPR1130.jpg', alt: 'Cabaña en Rucalhue, Santa Bárbara', tag: 'alojamiento' },
];
