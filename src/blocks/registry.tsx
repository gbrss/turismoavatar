// Mapa de bloques y render del contenido guardado por el editor (formato de datos de Puck).
import type { ComponentType } from 'react';
import { SiteProvider, type SiteData } from './core';
import { Hero, Experiences, Escapadas, Promos, WhyUs, Destinos, Lodgings, MediaGallery, Business, Faq, Cta } from './home';
import { TextImage, Banner, Cards, Testimonials, Video, Text } from './generic';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const blocks: Record<string, ComponentType<any>> = {
  Hero,
  Experiences,
  Escapadas,
  Promos,
  WhyUs,
  Destinos,
  Lodgings,
  MediaGallery,
  Business,
  Faq,
  Cta,
  TextImage,
  Banner,
  Cards,
  Testimonials,
  Video,
  Text,
};

export interface PageData {
  root: { props: { title?: string; description?: string } };
  content: { type: string; props: Record<string, unknown> & { id: string; hidden?: boolean } }[];
  zones?: Record<string, unknown>;
}

/** HTML estático del home (sin JavaScript de React en el navegador). */
export default function PageRender({ page, site }: { page: PageData; site: SiteData }) {
  return (
    <SiteProvider data={site}>
      {page.content
        .filter((b) => !b.props.hidden && blocks[b.type])
        .map((b) => {
          const C = blocks[b.type];
          return <C key={b.props.id} {...b.props} />;
        })}
    </SiteProvider>
  );
}
