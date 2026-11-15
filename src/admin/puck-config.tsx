// Configuración del editor visual: qué bloques hay, sus campos (en español) y valores iniciales.
import type { Config, Field } from '@puckeditor/core';
import { Hero, Experiences, Promos, WhyUs, Destinos, Lodgings, MediaGallery, Business, Faq, Cta } from '@/blocks/home';
import { TextImage, Banner, Cards, Testimonials, Video, Text } from '@/blocks/generic';
import { ImageInput, VideoInput } from './Media';
import type { AdminData } from './lib';
import { SiteProvider } from '@/blocks/core';
import type { ComponentType } from 'react';

// Las secciones ocultas se ven atenuadas en el editor (en el sitio no aparecen)
const wrap = (C: ComponentType<any>) =>
  function Bloque(props: any) {
    if (!props.hidden) return <C {...props} />;
    return (
      <div className="relative opacity-40 grayscale">
        <span className="absolute left-3 top-3 z-50 rounded-full bg-marino px-3 py-1 text-xs font-bold text-white">Oculta en el sitio</span>
        <C {...props} />
      </div>
    );
  };

/* eslint-disable @typescript-eslint/no-explicit-any */
const text = (label: string, inline = false): Field => ({ type: 'text', label, contentEditable: inline }) as Field;
const area = (label: string, inline = false): Field => ({ type: 'textarea', label, contentEditable: inline }) as Field;
const rich = (label: string): Field => ({ type: 'richtext', label, contentEditable: true }) as Field;
const num = (label: string, min = 0, max = 50): Field => ({ type: 'number', label, min, max });
const yesno = (label: string): Field => ({ type: 'radio', label, options: [{ label: 'Sí', value: true }, { label: 'No', value: false }] }) as Field;
const image = (label: string): Field =>
  ({ type: 'custom', label, render: ({ value, onChange, field }: any) => <ImageInput label={field.label} value={value} onChange={onChange} /> }) as Field;
const video = (label: string): Field => ({ type: 'custom', label, render: ({ value, onChange }: any) => <VideoInput value={value} onChange={onChange} /> }) as Field;
const fondo: Field = {
  type: 'select',
  label: 'Fondo',
  options: [
    { label: 'Gris claro', value: 'claro' },
    { label: 'Blanco', value: 'blanco' },
    { label: 'Azul marino', value: 'marino' },
  ],
};
const boton = (label: string): Field =>
  ({ type: 'object', label, objectFields: { label: text('Texto del botón'), href: text('Enlace (ej. /experiencias, /reservas o https://…)') } }) as Field;
const hidden: Field = { type: 'radio', label: 'Visible en el sitio', options: [{ label: 'Visible', value: false }, { label: 'Oculta', value: true }] } as Field;

export function makeConfig(d: AdminData): Config {
  const exps = d.site.experiencias.map((e) => ({ label: e.title, value: e.id }));
  const cats = Object.entries(d.site.categorias).map(([value, label]) => ({ label, value }));
  return {
    categories: {
      home: { title: 'Secciones Turismo Avatar', components: ['Hero', 'Experiences', 'Promos', 'WhyUs', 'Destinos', 'Lodgings', 'MediaGallery', 'Business', 'Faq', 'Cta'] },
      libres: { title: 'Bloques libres', components: ['TextImage', 'Banner', 'Cards', 'Testimonials', 'Video', 'Text'] },
    },
    root: {
      fields: {
        title: text('Título para Google (opcional)'),
        description: area('Descripción para Google y WhatsApp (opcional)'),
      },
      render: ({ children }: any) => (
        <SiteProvider data={d.site} editing>
          <div className="min-h-dvh bg-niebla">{children}</div>
        </SiteProvider>
      ),
    },
    components: {
      Hero: {
        label: 'Portada',
        fields: {
          eyebrow: text('Frase superior', true),
          title: area('Título', true),
          text: area('Texto', true),
          image: image('Foto de fondo'),
          imageAlt: text('Descripción de la foto'),
          video: video('Video de fondo (sin audio)'),
          focus: text('Encuadre del video (ej. 62% 45%)'),
          primary: boton('Botón principal'),
          whatsappLabel: text('Botón de WhatsApp (vacío = ocultar)'),
          videoButton: text('Botón "Ver video" (vacío = ocultar)'),
          destacada: { type: 'select', label: 'Tarjeta destacada', options: [{ label: 'Ninguna', value: '' }, ...exps] },
          destacadaLabel: text('Etiqueta de la tarjeta'),
          showNav: yesno('Mostrar barra de categorías'),
          hidden,
        },
        defaultProps: {
          eyebrow: 'Tour operador en Concepción',
          title: 'Diseñamos experiencias memorables en el Biobío',
          text: '',
          image: '',
          imageAlt: '',
          video: '',
          focus: '50% 50%',
          primary: { label: 'Ver experiencias', href: '/experiencias' },
          whatsappLabel: 'Cotizar por WhatsApp',
          videoButton: '',
          destacada: '',
          destacadaLabel: 'La más reservada',
          showNav: false,
          hidden: false,
        },
        render: wrap(Hero),
      },
      Experiences: {
        label: 'Experiencias',
        fields: {
          title: text('Título', true),
          text: area('Texto', true),
          linkLabel: text('Enlace "ver todas" ({n} = cantidad)'),
          modo: {
            type: 'radio',
            label: '¿Cuáles mostrar?',
            options: [
              { label: 'Destacadas', value: 'destacadas' },
              { label: 'Elegidas a mano', value: 'elegidas' },
              { label: 'De una categoría', value: 'categoria' },
            ],
          },
          elegidas: { type: 'array', label: 'Experiencias elegidas', arrayFields: { id: { type: 'select', label: 'Experiencia', options: exps } }, getItemSummary: (i: any) => exps.find((e) => e.value === i.id)?.label ?? 'Elige una' } as Field,
          categoria: { type: 'select', label: 'Categoría', options: cats },
          limite: num('Máximo a mostrar', 1, 12),
          fondo,
          hidden,
        },
        defaultProps: { title: 'Nuestras experiencias', text: '', linkLabel: 'Ver las {n} experiencias', modo: 'destacadas', elegidas: [], categoria: cats[0]?.value, limite: 4, fondo: 'claro', hidden: false },
        render: wrap(Experiences),
      },
      Promos: {
        label: 'Promociones',
        fields: {
          title: text('Título', true),
          grande: {
            type: 'object',
            label: 'Tarjeta grande',
            objectFields: {
              title: text('Título'),
              text: area('Texto'),
              tags: { type: 'array', label: 'Etiquetas', arrayFields: { t: text('Etiqueta') }, getItemSummary: (i: any) => i.t || 'Etiqueta' },
              image: image('Foto'),
              href: text('Enlace'),
              button: text('Texto del botón'),
            },
          } as Field,
          lista: { type: 'object', label: 'Tarjeta Tercera Edad (lista automática)', objectFields: { eyebrow: text('Frase superior'), title: text('Título'), href: text('Enlace') } } as Field,
          chica: { type: 'object', label: 'Tarjeta chica', objectFields: { eyebrow: text('Frase superior'), title: text('Título'), linkLabel: text('Texto del enlace'), image: image('Foto'), href: text('Enlace') } } as Field,
          hidden,
        },
        defaultProps: {
          title: 'Promociones de temporada',
          grande: { title: 'Nueva promoción', text: '', tags: [], image: '', href: '/programas', button: 'Reservar' },
          lista: { eyebrow: 'Vacaciones Tercera Edad', title: 'Viaja, relájate y disfruta Chile', href: '/programas#tercera-edad' },
          chica: { eyebrow: '', title: 'Otra promoción', linkLabel: 'Ver más', image: '', href: '/' },
          hidden: false,
        },
        render: wrap(Promos),
      },
      WhyUs: {
        label: 'Por qué elegirnos',
        fields: {
          eyebrow: text('Frase superior', true),
          title: text('Título', true),
          text: area('Texto', true),
          pilares: { type: 'array', label: 'Puntos fuertes', arrayFields: { title: text('Título'), text: area('Texto') }, getItemSummary: (i: any) => i.title || 'Punto' } as Field,
          image1: image('Foto grande'),
          image1Alt: text('Descripción foto grande'),
          image2: image('Foto chica'),
          image2Alt: text('Descripción foto chica'),
          statLabel: text('Texto junto a los años'),
          showMemberships: yesno('Mostrar asociaciones'),
          hidden,
        },
        defaultProps: { eyebrow: '', title: 'Por qué elegirnos', text: '', pilares: [], image1: '', image1Alt: '', image2: '', image2Alt: '', statLabel: 'años creando experiencias', showMemberships: true, hidden: false },
        render: wrap(WhyUs),
      },
      Destinos: {
        label: 'Mapa de destinos',
        fields: { title: text('Título', true), text: area('Texto', true), fondo, hidden },
        defaultProps: { title: 'Escoge tu próximo destino', text: '', fondo: 'blanco', hidden: false },
        render: wrap(Destinos),
      },
      Lodgings: {
        label: 'Alojamientos',
        fields: { title: text('Título', true), text: area('Texto', true), button: text('Texto del botón'), hidden },
        defaultProps: { title: '¿Necesitas alojamiento?', text: '', button: 'Ver alojamientos', hidden: false },
        render: wrap(Lodgings),
      },
      MediaGallery: {
        label: 'Videos y galería',
        fields: { title: text('Título', true), text: area('Texto', true), instagramLabel: text('Enlace a Instagram'), videos: num('Videos de YouTube', 0, 6), fotos: num('Fotos', 0, 24), button: text('Botón a la galería'), hidden },
        defaultProps: { title: 'Nuestra galería de aventuras', text: '', instagramLabel: 'Síguenos en Instagram', videos: 3, fotos: 12, button: 'Ver galería completa', hidden: false },
        render: wrap(MediaGallery),
      },
      Business: {
        label: 'Tarjetas de llamado',
        fields: {
          cards: {
            type: 'array',
            label: 'Tarjetas',
            max: 4,
            arrayFields: {
              title: text('Título'),
              text: area('Texto'),
              linkLabel: text('Texto del enlace'),
              href: text('Enlace'),
              estilo: { type: 'select', label: 'Estilo', options: [{ label: 'Naranja', value: 'naranja' }, { label: 'Con borde', value: 'borde' }, { label: 'Azul marino', value: 'marino' }] },
            },
            getItemSummary: (i: any) => i.title || 'Tarjeta',
          } as Field,
          hidden,
        },
        defaultProps: { cards: [{ title: 'Título', text: '', linkLabel: 'Ver más', href: '/', estilo: 'naranja' }], hidden: false },
        render: wrap(Business),
      },
      Faq: {
        label: 'Preguntas frecuentes',
        fields: { title: text('Título', true), cantidad: num('Preguntas a mostrar', 1, 20), linkLabel: text('Enlace a todas'), hidden },
        defaultProps: { title: 'Preguntas frecuentes', cantidad: 4, linkLabel: 'Ver todas las preguntas', hidden: false },
        render: wrap(Faq),
      },
      Cta: {
        label: 'Franja de contacto',
        fields: { title: text('Título', true), text: area('Texto', true), message: area('Mensaje de WhatsApp precargado (opcional)'), hidden },
        defaultProps: { title: '¿Armamos tu próxima aventura?', text: '', message: '', hidden: false },
        render: wrap(Cta),
      },
      TextImage: {
        label: 'Texto con foto',
        fields: {
          eyebrow: text('Frase superior', true),
          title: text('Título', true),
          text: rich('Texto'),
          image: image('Foto'),
          imageAlt: text('Descripción de la foto'),
          lado: { type: 'radio', label: 'Foto a la', options: [{ label: 'Izquierda', value: 'izquierda' }, { label: 'Derecha', value: 'derecha' }] },
          boton: boton('Botón'),
          fondo,
          hidden,
        },
        defaultProps: { eyebrow: '', title: 'Nuevo título', text: '<p>Escribe aquí el texto de esta sección.</p>', image: '', imageAlt: '', lado: 'izquierda', boton: { label: '', href: '' }, fondo: 'blanco', hidden: false },
        render: wrap(TextImage),
      },
      Banner: {
        label: 'Banner con foto',
        fields: {
          image: image('Foto de fondo'),
          title: text('Título', true),
          text: area('Texto', true),
          boton: boton('Botón'),
          alto: { type: 'radio', label: 'Alto', options: [{ label: 'Medio', value: 'media' }, { label: 'Alto', value: 'alta' }] },
          alineacion: { type: 'radio', label: 'Alineación', options: [{ label: 'Izquierda', value: 'izquierda' }, { label: 'Centro', value: 'centro' }] },
          hidden,
        },
        defaultProps: { image: '', title: 'Título del banner', text: '', boton: { label: 'Reservar', href: '/reservas' }, alto: 'media', alineacion: 'izquierda', hidden: false },
        render: wrap(Banner),
      },
      Cards: {
        label: 'Tarjetas con foto',
        fields: {
          title: text('Título', true),
          text: area('Texto', true),
          items: { type: 'array', label: 'Tarjetas', arrayFields: { image: image('Foto'), title: text('Título'), text: area('Texto'), href: text('Enlace (opcional)') }, getItemSummary: (i: any) => i.title || 'Tarjeta' } as Field,
          columnas: { type: 'radio', label: 'Columnas', options: [{ label: '2', value: '2' }, { label: '3', value: '3' }, { label: '4', value: '4' }] },
          fondo,
          hidden,
        },
        defaultProps: { title: 'Título', text: '', items: [{ image: '', title: 'Tarjeta', text: '', href: '' }], columnas: '3', fondo: 'claro', hidden: false },
        render: wrap(Cards),
      },
      Testimonials: {
        label: 'Testimonios',
        fields: {
          title: text('Título', true),
          items: { type: 'array', label: 'Testimonios', arrayFields: { quote: area('Comentario'), name: text('Nombre'), detail: text('Detalle (ej. SUP en Dichato, marzo 2026)') }, getItemSummary: (i: any) => i.name || 'Testimonio' } as Field,
          fondo,
          hidden,
        },
        defaultProps: { title: 'Lo que dicen nuestros viajeros', items: [{ quote: 'Una experiencia increíble, los guías se preocuparon de todo.', name: 'Nombre del cliente', detail: 'Experiencia y fecha' }], fondo: 'blanco', hidden: false },
        render: wrap(Testimonials),
      },
      Video: {
        label: 'Video de YouTube',
        fields: { title: text('Título', true), text: area('Texto', true), youtube: text('Enlace o ID del video de YouTube'), fondo, hidden },
        defaultProps: { title: 'Mira la experiencia', text: '', youtube: '', fondo: 'claro', hidden: false },
        render: wrap(Video),
      },
      Text: {
        label: 'Texto',
        fields: { title: text('Título', true), text: rich('Texto'), centrado: yesno('Centrado'), boton: boton('Botón'), fondo, hidden },
        defaultProps: { title: 'Título', text: '<p>Texto</p>', centrado: false, boton: { label: '', href: '' }, fondo: 'claro', hidden: false },
        render: wrap(Text),
      },
    },
  } as unknown as Config;
}

export const dictionary = {
  'header-publish': 'Publicar',
  'header-undo': 'Deshacer',
  'header-redo': 'Rehacer',
  'header-toggle-leftsidebar': 'Mostrar u ocultar bloques',
  'header-toggle-rightsidebar': 'Mostrar u ocultar ajustes',
  'header-toggle-menubar': 'Menú',
  'action-selectparent': 'Seleccionar contenedor',
  'action-drag': 'Arrastrar para mover',
  'action-duplicate': 'Duplicar',
  'action-delete': 'Eliminar',
  'label-page': 'Página',
  'label-component': 'Sección',
  'outline-empty': 'Sin secciones',
  'outline-item-collapse': 'Contraer',
  'outline-item-expand': 'Expandir',
  'outline-header-title': 'Estructura',
  'outline-header-collapseall': 'Contraer todo',
  'outline-item-duplicate': 'Duplicar',
  'outline-item-delete': 'Eliminar',
  'drawer-category-collapse': 'Contraer {title}',
  'drawer-category-expand': 'Expandir {title}',
  'drawer-category-other': 'Otros',
  'canvas-noconfig': 'Bloque desconocido: {type}',
  'field-readonly': 'Solo lectura',
  'field-arrayitem-summary': 'Elemento {index}',
  'field-arrayitem-duplicate': 'Duplicar',
  'field-arrayitem-delete': 'Eliminar',
  'field-richtext-bold': 'Negrita',
  'field-richtext-italic': 'Cursiva',
  'field-richtext-underline': 'Subrayado',
  'field-richtext-strikethrough': 'Tachado',
  'field-richtext-blockquote': 'Cita',
  'field-richtext-list-bullet': 'Lista con viñetas',
  'field-richtext-list-ordered': 'Lista numerada',
  'field-richtext-align-left': 'Alinear a la izquierda',
  'field-richtext-align-center': 'Centrar',
  'field-richtext-align-right': 'Alinear a la derecha',
  'field-richtext-align-justify': 'Justificar',
  'field-richtext-headingselect-2': 'Subtítulo',
  'field-richtext-headingselect-3': 'Subtítulo chico',
  'viewport-zoom-in': 'Acercar',
  'viewport-zoom-out': 'Alejar',
  'viewport-zoom-auto': '{zoom}% (auto)',
  'viewport-switch': 'Ver en {label}',
  'plugin-blocks': 'Bloques',
  'plugin-outline': 'Estructura',
  'plugin-fields': 'Ajustes',
  'plugin-components': 'Bloques',
  'loader-loading': 'cargando',
};

export const viewports = [
  { width: 390, height: 'auto' as const, label: 'Celular', icon: 'Smartphone' as const },
  { width: 820, height: 'auto' as const, label: 'Tablet', icon: 'Tablet' as const },
  { width: 1280, height: 'auto' as const, label: 'Computador', icon: 'Monitor' as const },
];
