// Bloques libres para armar secciones nuevas desde el editor.
import type { ReactNode } from 'react';
import { Img, Rich, Estrella, fondo, linkProps, type Boton, type Fondo } from './core';

type T = ReactNode;
const muted = (f?: Fondo) => (f === 'marino' ? 'text-white/80' : 'text-gris');

function Btn({ b, ghost }: { b?: Boton; ghost?: boolean }) {
  if (!b?.label) return null;
  return (
    <a href={b.href || '#'} className={`btn ${ghost ? 'btn-ghost' : 'btn-primary'}`} {...linkProps(b.href)}>
      {b.label}
    </a>
  );
}

export interface TextImageProps {
  eyebrow: T;
  title: T;
  text: unknown;
  image: string;
  imageAlt: string;
  lado: 'izquierda' | 'derecha';
  boton: Boton;
  fondo: Fondo;
}
export function TextImage(p: TextImageProps) {
  return (
    <section className={fondo(p.fondo)}>
      <div className="wrap grid gap-12 py-20 sm:py-24 lg:grid-cols-2 lg:items-center">
        <div className={`aspect-[4/3] overflow-hidden rounded-3xl bg-marino ${p.lado === 'derecha' ? 'lg:order-2' : ''}`}>
          <Img k={p.image} alt={p.imageAlt} sizes="(min-width: 1024px) 45vw, 100vw" />
        </div>
        <div>
          {p.eyebrow && <p className="font-display font-bold text-cielo-700">{p.eyebrow}</p>}
          <h2 className="mt-2 text-h2">{p.title}</h2>
          <Rich v={p.text} className={`mt-5 text-lg ${muted(p.fondo)}`} />
          {p.boton?.label && (
            <div className="mt-8">
              <Btn b={p.boton} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export interface BannerProps {
  image: string;
  title: T;
  text: T;
  boton: Boton;
  alto: 'media' | 'alta';
  alineacion: 'izquierda' | 'centro';
}
export function Banner(p: BannerProps) {
  const center = p.alineacion === 'centro';
  return (
    <section className={`relative isolate flex overflow-hidden bg-marino text-white ${p.alto === 'alta' ? 'min-h-[80svh]' : 'min-h-[28rem]'} items-end`}>
      <div className="absolute inset-0 -z-10">
        <Img k={p.image} alt="" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-marino-900/90 via-marino-900/45 to-marino-900/10" />
      </div>
      <div className={`wrap py-16 ${center ? 'text-center' : ''}`}>
        <h2 className={`text-h1 ${center ? 'mx-auto' : ''} max-w-3xl`}>{p.title}</h2>
        {p.text && <p className={`mt-4 max-w-xl text-lg text-white/85 ${center ? 'mx-auto' : ''}`}>{p.text}</p>}
        {p.boton?.label && (
          <div className="mt-8">
            <Btn b={p.boton} />
          </div>
        )}
      </div>
    </section>
  );
}

export interface CardsProps {
  title: T;
  text: T;
  items: { image: string; title: string; text: string; href: string }[];
  columnas: '2' | '3' | '4';
  fondo: Fondo;
}
export function Cards(p: CardsProps) {
  const cols = { '2': 'sm:grid-cols-2', '3': 'sm:grid-cols-2 lg:grid-cols-3', '4': 'sm:grid-cols-2 lg:grid-cols-4' }[p.columnas] ?? 'sm:grid-cols-3';
  return (
    <section className={fondo(p.fondo)}>
      <div className="wrap py-20 sm:py-24">
        {p.title && <h2 className="max-w-2xl text-h2">{p.title}</h2>}
        {p.text && <p className={`mt-3 max-w-xl text-lg ${muted(p.fondo)}`}>{p.text}</p>}
        <div className={`mt-10 grid gap-x-6 gap-y-10 ${cols}`}>
          {(p.items ?? []).map((it, i) => {
            const inner = (
              <>
                <div className="aspect-[4/3] overflow-hidden rounded-xl bg-marino">
                  <Img k={it.image} alt={it.title} sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw" className="transition-transform duration-500 group-hover:scale-[1.03]" />
                </div>
                <h3 className="mt-4 font-display text-[1.3rem] font-extrabold leading-tight">{it.title}</h3>
                {it.text && <p className={`mt-2 ${muted(p.fondo)}`}>{it.text}</p>}
              </>
            );
            return it.href ? (
              <a key={i} href={it.href} className="group block" {...linkProps(it.href)}>
                {inner}
              </a>
            ) : (
              <div key={i} className="group">
                {inner}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export interface TestimonialsProps {
  title: T;
  items: { quote: string; name: string; detail: string }[];
  fondo: Fondo;
}
export function Testimonials(p: TestimonialsProps) {
  return (
    <section className={fondo(p.fondo)}>
      <div className="wrap py-20 sm:py-24">
        {p.title && <h2 className="max-w-2xl text-h2">{p.title}</h2>}
        <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {(p.items ?? []).map((t, i) => (
            <li key={i} className={`flex flex-col rounded-3xl p-7 ${p.fondo === 'marino' ? 'bg-white/8 ring-1 ring-white/15' : 'bg-white ring-1 ring-roca'}`}>
              <Estrella className="h-7 w-7" />
              <blockquote className="mt-4 flex-1 text-lg leading-relaxed">“{t.quote}”</blockquote>
              <p className="mt-5 font-display font-extrabold">{t.name}</p>
              {t.detail && <p className={`text-sm ${muted(p.fondo)}`}>{t.detail}</p>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export interface VideoProps {
  title: T;
  text: T;
  youtube: string;
  fondo: Fondo;
}
export function Video(p: VideoProps) {
  const id = (p.youtube ?? '').match(/(?:v=|youtu\.be\/|shorts\/|embed\/)?([\w-]{11})/)?.[1] ?? '';
  return (
    <section className={fondo(p.fondo)}>
      <div className="wrap py-20 sm:py-24">
        {p.title && <h2 className="max-w-2xl text-h2">{p.title}</h2>}
        {p.text && <p className={`mt-3 max-w-xl text-lg ${muted(p.fondo)}`}>{p.text}</p>}
        {id && (
          <button type="button" data-video-open={id} data-video-title={typeof p.title === 'string' ? p.title : 'Video'} className="group relative mt-10 block aspect-video w-full overflow-hidden rounded-3xl bg-marino-900">
            <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" className="h-full w-full object-cover opacity-90 transition duration-500 group-hover:scale-[1.02]" />
            <span className="absolute inset-0 grid place-items-center">
              <span className="grid h-20 w-20 place-items-center rounded-full bg-naranja text-marino shadow-xl transition group-hover:scale-110">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </span>
            <span className="sr-only">Reproducir video</span>
          </button>
        )}
      </div>
    </section>
  );
}

export interface TextProps {
  title: T;
  text: unknown;
  centrado: boolean;
  boton: Boton;
  fondo: Fondo;
}
export function Text(p: TextProps) {
  return (
    <section className={fondo(p.fondo)}>
      <div className={`wrap py-16 sm:py-20 ${p.centrado ? 'text-center [&_.prose-ta]:mx-auto' : ''}`}>
        {p.title && <h2 className={`max-w-3xl text-h2 ${p.centrado ? 'mx-auto' : ''}`}>{p.title}</h2>}
        <Rich v={p.text} className={`mt-5 text-lg ${muted(p.fondo)}`} />
        {p.boton?.label && (
          <div className="mt-8">
            <Btn b={p.boton} />
          </div>
        )}
      </div>
    </section>
  );
}
