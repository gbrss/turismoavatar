// Secciones del home de Turismo Avatar como bloques editables.
import type { ReactNode } from 'react';
import { Img, Estrella, clp, fondo, linkProps, useSite, useWhatsapp, videoUrl, type Boton, type Fondo } from './core';

type T = ReactNode; // texto: string en el sitio, editable en línea dentro del panel
const linkCls = 'text-white/80 hover:text-white hover:underline hover:decoration-naranja hover:decoration-2 hover:underline-offset-8';

/* ───────────── Portada ───────────── */
export interface HeroProps {
  eyebrow: T;
  title: T;
  text: T;
  image: string;
  imageAlt: string;
  focus: string;
  video: string;
  primary: Boton;
  whatsappLabel: string;
  videoButton: string;
  destacada: string;
  destacadaLabel: string;
  showNav: boolean;
  ocultas?: string[];
}
export function Hero(p: HeroProps) {
  const { data } = useSite();
  const wa = useWhatsapp();
  const exp = data.experiencias.find((e) => e.id === p.destacada);
  const video = videoUrl(p.video);
  return (
    <section className="relative isolate flex min-h-[94svh] flex-col justify-end overflow-hidden bg-marino text-white" data-hero>
      <div className="absolute inset-0 -z-10">
        <Img k={p.image} alt={p.imageAlt} sizes="100vw" eager className="" />
        {video && (
          <video
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 motion-reduce:hidden"
            style={{ objectPosition: p.focus || '62% 45%' }}
            data-hero-video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden="true"
            tabIndex={-1}
          >
            <source src={video} type="video/mp4" />
          </video>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-marino-900 via-marino-900/40 to-marino-900/10" />
        <div className="absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r from-marino-900/60 to-transparent" />
      </div>

      <div className="wrap grid gap-10 pb-10 pt-36 lg:grid-cols-[1fr_auto] lg:items-end lg:pb-14">
        <div>
          {p.eyebrow && <p className="font-display text-lg font-bold text-naranja">{p.eyebrow}</p>}
          <h1 className="mt-4 max-w-4xl text-display">{p.title}</h1>
          {p.text && <p className="mt-6 max-w-xl text-lg text-white/85 sm:text-xl">{p.text}</p>}
          <div className="mt-8 flex flex-wrap gap-3">
            {p.primary?.label && (
              <a href={p.primary.href || '/experiencias'} className="btn btn-primary" {...linkProps(p.primary.href)}>
                {p.primary.label}
              </a>
            )}
            {p.whatsappLabel && (
              <a href={wa()} target="_blank" rel="noopener" className="btn btn-ghost" data-track="whatsapp_hero">
                {p.whatsappLabel}
              </a>
            )}
            {p.videoButton && (
              <button type="button" className="btn text-white hover:bg-white/10" data-video-open={data.site.featuredVideo} data-video-title={`${data.site.name} en Chile`}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-2 14.5v-9l7 4.5-7 4.5z" />
                </svg>
                {p.videoButton}
              </button>
            )}
          </div>
        </div>

        {exp && (
          <a href={`/experiencias/${exp.id}`} className="group hidden w-80 rounded-2xl bg-white/95 p-5 text-tinta shadow-2xl backdrop-blur lg:block">
            <p className="text-sm font-bold text-cielo-700">{p.destacadaLabel}</p>
            <p className="mt-1 font-display text-xl font-extrabold leading-tight group-hover:text-naranja-700">{exp.title}</p>
            <p className="mt-2 text-sm text-gris">
              {exp.duration}
              {exp.minAge ? ` · desde ${exp.minAge} años` : ''}
            </p>
            <p className="mt-3 flex items-baseline justify-between">
              <span className="font-display text-2xl font-extrabold">{exp.priceFrom ? clp(exp.priceFrom) : 'Consultar'}</span>
              <span className="text-sm font-bold text-naranja-700 underline decoration-2 underline-offset-4">Reservar</span>
            </p>
          </a>
        )}
      </div>

      {p.showNav && (
        <nav aria-label="¿Qué quieres vivir?" className="border-t border-white/15 bg-marino-900/40 backdrop-blur-sm">
          <ul className="wrap flex flex-wrap gap-x-7 gap-y-2 py-4 font-display text-[0.95rem] font-bold">
            {heroChips(data.categorias)
              .filter((c) => !(p.ocultas ?? []).includes(c.key))
              .map((c) => (
                <li key={c.key}>
                  <a href={c.href} className={linkCls}>
                    {c.label}
                  </a>
                </li>
              ))}
          </ul>
        </nav>
      )}
    </section>
  );
}

/** Enlaces de la barra de categorías de la portada (el editor usa la misma lista para ocultarlos). */
export const heroChips = (categorias: Record<string, string>) => [
  ...Object.entries(categorias).map(([k, label]) => ({ key: k, label, href: `/experiencias?categoria=${k}` })),
  { key: 'alojamientos', label: 'Alojamientos', href: '/alojamientos' },
  { key: 'tercera-edad', label: 'Tercera edad', href: '/tercera-edad' },
  { key: 'rally-wrc', label: 'Rally WRC', href: '/rally-wrc' },
  { key: 'tienda', label: 'Tienda', href: '/tienda' },
];

/* ───────────── Tarjeta de experiencia ───────────── */
export function ExperienceCard({ id }: { id: string }) {
  const { data } = useSite();
  const e = data.experiencias.find((x) => x.id === id);
  if (!e) return null;
  const lugares = e.destinos.map((s) => data.destinos.find((d) => d.slug === s)?.name ?? s).join(' y ');
  return (
    <article className="group relative">
      <div className="aspect-[4/3] overflow-hidden rounded-xl bg-marino sm:aspect-[4/5]">
        <Img k={e.image} alt={e.title} sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="transition-transform duration-500 group-hover:scale-[1.03]" />
      </div>
      <p className="mt-4 text-sm font-bold text-cielo-700">{data.categorias[e.category]}</p>
      <h3 className="mt-1 font-display text-[1.3rem] font-extrabold leading-[1.05]">
        <a href={`/experiencias/${e.id}`} className="after:absolute after:inset-0 hover:text-marino">
          {e.title}
        </a>
      </h3>
      <p className="mt-2 text-gris">
        {e.duration} en {lugares}
      </p>
      <p className="mt-2 font-display font-extrabold">{e.priceFrom ? `Desde ${clp(e.priceFrom)} por ${e.priceUnit}` : 'Precio a consultar'}</p>
    </article>
  );
}

/* ───────────── Experiencias ───────────── */
export interface ExperiencesProps {
  title: T;
  text: T;
  linkLabel: string;
  modo: 'destacadas' | 'elegidas' | 'categoria';
  elegidas: { id: string }[];
  categoria: string;
  limite: number;
  fondo: Fondo;
}
export function Experiences(p: ExperiencesProps) {
  const { data } = useSite();
  let list = data.experiencias;
  if (p.modo === 'destacadas') list = list.filter((e) => e.featured);
  if (p.modo === 'categoria') list = list.filter((e) => e.category === p.categoria);
  if (p.modo === 'elegidas') list = (p.elegidas ?? []).map((x) => data.experiencias.find((e) => e.id === x.id)!).filter(Boolean);
  list = list.slice(0, p.limite || 4);
  return (
    <section className={fondo(p.fondo)}>
      <div className="wrap py-20 sm:py-28">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="max-w-2xl text-h2">{p.title}</h2>
            {p.text && <p className={`mt-3 max-w-xl text-lg ${p.fondo === 'marino' ? 'text-white/75' : 'text-gris'}`}>{p.text}</p>}
          </div>
          {p.linkLabel && (
            <a href="/experiencias" className="font-bold text-naranja-700 underline decoration-2 underline-offset-4">
              {p.linkLabel.replace('{n}', String(data.experiencias.length))}
            </a>
          )}
        </div>
        <div className="mt-12 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {list.map((e) => (
            <ExperienceCard key={e.id} id={e.id} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────── Escapadas Tercera Edad (formato del slide: banner animado + 4 tarjetas con movimiento) ───────────── */
export interface EscapadasProps {
  title: T;
  heroImage: string;
  heroAlt: string;
  fotos: { programa: string; image: string }[];
  ctaLabel: string;
  fondo: Fondo;
}
const ESC_COLORES = ['#1d3fae', '#0f7a3a', '#7b1fa2', '#e8680f'];
export function Escapadas(p: EscapadasProps) {
  const { data } = useSite();
  const lista = data.programas.filter((x) => x.group === 'tercera-edad');
  if (!lista.length) return null;
  const foto = (id: string, own?: string) => (p.fotos ?? []).find((f) => f.programa === id)?.image || own || '';
  return (
    <section id="tercera-edad" className={`scroll-mt-20 overflow-hidden py-16 sm:py-24 ${fondo(p.fondo) || 'bg-white'}`} data-escapadas>
      <div className="wrap">
        <div className="ta-hero">
          <Img k={p.heroImage} alt={p.heroAlt} sizes="(min-width: 1280px) 1248px, 100vw" className="ta-hero-img" />
          <span className="ta-rays" aria-hidden="true" />
          <span className="ta-sun" aria-hidden="true" />
          <span className="ta-shine" aria-hidden="true" />
        </div>
        <h2 className="ta-title">
          <span className="ta-spark" aria-hidden="true" />
          {p.title}
          <span className="ta-spark ta-spark-r" aria-hidden="true" />
        </h2>
        <ul className="ta-grid">
          {lista.map((x, i) => {
            const img = foto(x.id, x.image);
            const detalle = `${x.title}, ${x.days} días${x.nights != null ? ` y ${x.nights} noches` : ''}${x.priceFrom ? `, desde ${clp(x.priceFrom)} por persona` : ''}`;
            return (
              <li key={x.id} className="ta-item" style={{ ['--d' as string]: `${i * 0.6}s`, ['--c' as string]: ESC_COLORES[i % ESC_COLORES.length] }}>
                <a href={`/tercera-edad?destino=${x.id}#reservar`} className="ta-card" aria-label={`${detalle}. Reservar`}>
                  {img ? (
                    <Img k={img} alt="" sizes="(min-width: 1024px) 300px, 50vw" className="ta-card-img" />
                  ) : (
                    <span className="ta-card-vacia">
                      <span className="esc-num">{i + 1}</span>
                      <span className="block font-display text-xl font-extrabold">{x.title}</span>
                      <span className="text-sm">
                        {x.days} días{x.nights != null ? ` · ${x.nights} noches` : ''}
                      </span>
                      {x.priceFrom ? <span className="font-display text-2xl font-extrabold">{clp(x.priceFrom)}</span> : null}
                    </span>
                  )}
                  <span className="ta-card-shine" aria-hidden="true" />
                </a>
              </li>
            );
          })}
        </ul>
        {p.ctaLabel && (
          <div className="mt-10 flex justify-center">
            <a href="/tercera-edad#reservar" className="esc-cta">
              {p.ctaLabel}
              <span className="esc-hand" aria-hidden="true">
                👆
              </span>
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

/* ───────────── Promociones ───────────── */
export interface PromosProps {
  title: T;
  grande: { title: string; text: string; tags: { t: string }[]; image: string; href: string; button: string };
  lista: { eyebrow: string; title: string; href: string };
  chica: { eyebrow: string; title: string; linkLabel: string; image: string; href: string };
}
export function Promos(p: PromosProps) {
  const { data } = useSite();
  const tercera = data.programas.filter((x) => x.group === 'tercera-edad');
  const min = Math.min(...tercera.map((x) => x.priceFrom ?? Infinity));
  const g = p.grande ?? ({} as PromosProps['grande']);
  const l = p.lista ?? ({} as PromosProps['lista']);
  const c = p.chica ?? ({} as PromosProps['chica']);
  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="wrap">
        <h2 className="text-h2">{p.title}</h2>
        <div className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_1fr]">
          <a href={g.href} className="group relative isolate flex min-h-[26rem] flex-col justify-end overflow-hidden rounded-3xl p-7 text-white sm:p-9">
            <div className="absolute inset-0 -z-10">
              <Img k={g.image} alt="" sizes="(min-width: 1024px) 55vw, 100vw" className="object-[center_35%] transition duration-700 group-hover:scale-[1.03]" />
              <div className="absolute inset-0 bg-gradient-to-t from-marino-900/95 via-marino-900/40 to-transparent" />
            </div>
            {!!g.tags?.length && (
              <ul className="flex flex-wrap gap-2">
                {g.tags.map((t, i) => (
                  <li key={i} className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold backdrop-blur">
                    {t.t}
                  </li>
                ))}
              </ul>
            )}
            <h3 className="mt-4 font-display text-4xl font-extrabold sm:text-5xl">{g.title}</h3>
            {g.text && <p className="mt-2 max-w-md text-lg text-white/85">{g.text}</p>}
            {g.button && <span className="btn btn-primary mt-6 self-start">{g.button}</span>}
          </a>
          <div className="grid gap-6">
            <a href={l.href} className="group rounded-3xl bg-marino p-7 text-white sm:p-9">
              <p className="font-bold text-naranja">{l.eyebrow}</p>
              <h3 className="mt-2 font-display text-3xl font-extrabold">{l.title}</h3>
              <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3">
                {tercera.map((x) => (
                  <li key={x.id} className="border-l-2 border-cielo pl-3">
                    <span className="block font-display font-bold leading-tight">{x.title}</span>
                    <span className="text-sm text-white/70">
                      {x.days} días{x.priceFrom ? ` · desde ${clp(x.priceFrom)}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
              {Number.isFinite(min) && (
                <span className="mt-6 inline-block font-bold underline decoration-naranja decoration-2 underline-offset-4 group-hover:text-naranja">Desde {clp(min)} por persona</span>
              )}
            </a>
            <a href={c.href} className="group relative isolate flex items-end overflow-hidden rounded-3xl p-7 text-white sm:p-9">
              <div className="absolute inset-0 -z-10">
                <Img k={c.image} alt="" sizes="(min-width: 1024px) 45vw, 100vw" />
                <div className="absolute inset-0 bg-gradient-to-r from-marino-900/95 via-marino-900/85 to-marino-900/60" />
              </div>
              <div>
                <p className="font-bold text-naranja">{c.eyebrow}</p>
                <h3 className="mt-1 font-display text-2xl font-extrabold">{c.title}</h3>
                {c.linkLabel && <span className="mt-3 inline-block font-bold underline decoration-naranja decoration-2 underline-offset-4">{c.linkLabel}</span>}
              </div>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────── Por qué nosotros ───────────── */
export interface WhyUsProps {
  eyebrow: T;
  title: T;
  text: T;
  pilares: { title: string; text: string }[];
  image1: string;
  image1Alt: string;
  image2: string;
  image2Alt: string;
  statLabel: string;
  showMemberships: boolean;
}
export function WhyUs(p: WhyUsProps) {
  const { data } = useSite();
  const years = new Date().getFullYear() - data.site.foundingYear;
  return (
    <section className="wrap grid gap-14 py-20 sm:py-28 lg:grid-cols-2 lg:items-center">
      <div className="relative order-2 grid grid-cols-[1.2fr_1fr] gap-4 lg:order-1">
        <div className="row-span-2 aspect-[3/4] overflow-hidden rounded-3xl bg-marino">
          <Img k={p.image1} alt={p.image1Alt} sizes="(min-width: 1024px) 28vw, 55vw" />
        </div>
        <div className="aspect-square overflow-hidden rounded-3xl bg-marino">
          <Img k={p.image2} alt={p.image2Alt} sizes="(min-width: 1024px) 20vw, 40vw" />
        </div>
        <div className="flex flex-col justify-end rounded-3xl bg-naranja p-5 text-marino">
          <span className="font-display text-5xl font-extrabold leading-none">{years}+</span>
          <span className="mt-1 font-bold leading-tight">{p.statLabel}</span>
        </div>
      </div>
      <div className="order-1 lg:order-2">
        {p.eyebrow && <p className="font-display font-bold text-cielo-700">{p.eyebrow}</p>}
        <h2 className="mt-2 text-h2">{p.title}</h2>
        {p.text && <p className="mt-5 max-w-xl text-lg text-gris">{p.text}</p>}
        <dl className="mt-10 grid gap-x-8 gap-y-7 sm:grid-cols-2">
          {(p.pilares ?? []).map((x, i) => (
            <div key={i}>
              <dt className="flex items-center gap-3 font-display text-lg font-extrabold">
                <Estrella />
                {x.title}
              </dt>
              <dd className="mt-1.5 pl-10 text-gris">{x.text}</dd>
            </div>
          ))}
        </dl>
        {p.showMemberships && <p className="mt-10 text-sm text-gris">Somos parte de: {data.site.memberships.join(' · ')}</p>}
      </div>
    </section>
  );
}

/* ───────────── Mapa de destinos ───────────── */
const LNG0 = -73.4;
const LAT0 = -36.5;
const px = (lng: number) => +((lng - LNG0) * 800).toFixed(1);
const py = (lat: number) => +((LAT0 - lat) * 1000).toFixed(1);
const path = (pts: [number, number][]) => pts.map(([lat, lng], i) => `${i ? 'L' : 'M'}${px(lng)} ${py(lat)}`).join(' ');
const coast: [number, number][] = [
  [-36.5, -72.925], [-36.545, -72.935], [-36.53, -72.962], [-36.565, -72.967], [-36.615, -72.955], [-36.66, -72.98],
  [-36.71, -72.975], [-36.737, -72.995], [-36.77, -73.04], [-36.765, -73.09], [-36.722, -73.112], [-36.66, -73.09],
  [-36.615, -73.1], [-36.655, -73.125], [-36.728, -73.142], [-36.752, -73.172], [-36.772, -73.207], [-36.8, -73.19],
  [-36.82, -73.166], [-36.87, -73.165], [-36.95, -73.168], [-37.02, -73.162], [-37.09, -73.168], [-37.14, -73.21],
  [-37.17, -73.195], [-37.245, -73.322], [-37.3, -73.385],
];
const land = `${path(coast)} L${px(-72.85)} ${py(-37.3)} L${px(-72.85)} ${py(-36.5)} Z`;
const river = path([[-37.14, -72.85], [-37.07, -72.92], [-37.0, -72.945], [-36.93, -73.015], [-36.86, -73.055], [-36.835, -73.1], [-36.82, -73.166]]);
const W = px(-72.85);
const H = py(-37.3);
const labelLeft = new Set(['talcahuano', 'hualpen', 'coronel', 'lota', 'arauco', 'san-pedro-de-la-paz', 'santa-juana']);

export function DestinosMap() {
  const { data } = useSite();
  const t = (x: number, y: number, cls: string, s: string, extra = {}) => (
    <text x={x} y={y} className={cls} {...extra}>
      {s}
    </text>
  );
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,26rem)_1fr] lg:items-start" data-map>
      <figure className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl bg-[#d9f1fc]">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="group" aria-label="Mapa de destinos de Turismo Avatar en el Gran Concepción">
          <defs>
            <pattern id="olas" width="22" height="10" patternUnits="userSpaceOnUse">
              <path d="M0 6 Q5.5 2 11 6 T22 6" fill="none" stroke="#00a8e8" strokeOpacity=".28" strokeWidth="1.2" />
            </pattern>
          </defs>
          <rect width={W} height={H} fill="url(#olas)" />
          <path d={land} fill="#ffffff" stroke="#192a3d" strokeWidth="1.6" strokeLinejoin="round" />
          <path d={river} fill="none" stroke="#00a8e8" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          {t(px(-72.99), py(-36.985), 'fill-cielo-700 font-display text-[13px] font-semibold italic', 'río Biobío', { transform: `rotate(-48 ${px(-72.99)} ${py(-36.985)})` })}
          {t(px(-73.33), py(-36.62), 'fill-marino font-display text-[15px] font-semibold opacity-60', 'Océano Pacífico')}
          {t(px(-73.06), py(-36.69), 'fill-marino font-display text-[11px] font-semibold opacity-60', 'Bahía de')}
          {t(px(-73.06), py(-36.705), 'fill-marino font-display text-[11px] font-semibold opacity-60', 'Concepción')}
          {t(px(-73.32), py(-37.12), 'fill-marino font-display text-[12px] font-semibold opacity-60', 'Golfo de Arauco')}
          {data.destinos
            .filter((d) => d.onMap !== false)
            .map((d) => {
              const x = px(d.lng);
              const y = py(d.lat);
              const left = labelLeft.has(d.slug);
              return (
                <a key={d.slug} href={`/destinos/${d.slug}`} data-dest={d.slug} className="group outline-none" aria-label={`${d.name}: ${d.count} experiencias`}>
                  <circle cx={x} cy={y} r="16" fill="transparent" />
                  <circle cx={x} cy={y} r="7" className="fill-naranja-700 stroke-white transition-[r] group-hover:[r:10] group-focus-visible:[r:10] group-[.is-active]:[r:10]" strokeWidth="2.5" />
                  <text
                    x={left ? x - 13 : x + 13}
                    y={y + 5}
                    textAnchor={left ? 'end' : 'start'}
                    className="fill-tinta font-display text-[13px] font-bold [paint-order:stroke] [stroke:#ffffff] [stroke-width:4px] group-hover:fill-naranja-700 group-[.is-active]:fill-naranja-700"
                  >
                    {d.name}
                  </text>
                </a>
              );
            })}
        </svg>
        <figcaption className="sr-only">Mapa ilustrativo, no a escala exacta.</figcaption>
      </figure>
      <ul className="grid gap-x-8 sm:grid-cols-2">
        {data.destinos.map((d) => (
          <li key={d.slug} className="border-b border-roca">
            <a href={`/destinos/${d.slug}`} data-dest-item={d.slug} className="group flex items-baseline justify-between gap-4 py-4">
              <span>
                <span className="block font-display text-[1.2rem] font-extrabold leading-tight group-hover:text-naranja-700">{d.name}</span>
                <span className="mt-1 line-clamp-2 block text-[0.95rem] text-gris">{d.summary}</span>
              </span>
              <span className="shrink-0 text-sm font-semibold text-cielo-700">{d.count ? `${d.count} exp.` : 'Ver'}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface DestinosProps {
  title: T;
  text: T;
  fondo: Fondo;
}
export function Destinos(p: DestinosProps) {
  return (
    <section className={`py-20 sm:py-28 ${p.fondo === 'claro' ? '' : 'bg-white'}`}>
      <div className="wrap">
        <h2 className="text-h2">{p.title}</h2>
        {p.text && <p className="mt-3 max-w-2xl text-lg text-gris">{p.text}</p>}
        <div className="mt-12">
          <DestinosMap />
        </div>
      </div>
    </section>
  );
}

/* ───────────── Alojamientos ───────────── */
export interface LodgingsProps {
  title: T;
  text: T;
  button: string;
}
export function Lodgings(p: LodgingsProps) {
  const { data } = useSite();
  return (
    <section className="wrap grid gap-12 py-20 sm:py-28 lg:grid-cols-[1fr_1.6fr]">
      <div className="lg:sticky lg:top-28 lg:self-start">
        <h2 className="text-h2">{p.title}</h2>
        {p.text && <p className="mt-4 text-lg text-gris">{p.text}</p>}
        {p.button && (
          <a href="/alojamientos" className="btn btn-primary mt-8">
            {p.button}
          </a>
        )}
      </div>
      <div className="grid gap-8 sm:grid-cols-2 sm:gap-x-8">
        {data.alojamientos.map((a) => (
          <article key={a.id} className="group relative grid grid-cols-[7.5rem_1fr] gap-4 sm:grid-cols-[10rem_1fr]">
            <div className="aspect-square overflow-hidden rounded-xl bg-marino">
              <Img k={a.image} alt={a.title} sizes="10rem" />
            </div>
            <div className="self-center">
              <p className="text-sm font-semibold text-cielo-700">{a.location}</p>
              <h3 className="mt-0.5 font-display text-[1.15rem] font-extrabold leading-tight">
                <a href={`/alojamientos/${a.id}`} className="after:absolute after:inset-0 hover:text-marino">
                  {a.title}
                </a>
              </h3>
              <p className="mt-1.5 text-gris">
                Hasta {a.capacity} personas, {a.beds} {a.beds === 1 ? 'cama' : 'camas'}
                {a.shared ? ', espacios compartidos' : ''}
              </p>
              <p className="mt-1 font-display font-extrabold">
                {clp(a.pricePerNight)} <span className="font-normal text-gris">por noche</span>
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ───────────── Videos y galería ───────────── */
export function VideoGrid({ videos, dark }: { videos: { id: string; title: string }[]; dark?: boolean }) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {videos.map((v) => (
        <li key={v.id}>
          <button type="button" data-video-open={v.id} data-video-title={v.title} className="group block w-full text-left">
            <span className="relative block aspect-video overflow-hidden rounded-2xl bg-marino-900">
              <Img k={`youtube/${v.id}.jpg`} alt="" sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw" className="opacity-90 transition duration-500 group-hover:scale-[1.03] group-hover:opacity-100" />
              <span className="absolute inset-0 grid place-items-center">
                <span className="grid h-16 w-16 place-items-center rounded-full bg-naranja text-marino shadow-xl transition group-hover:scale-110">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              </span>
            </span>
            <span className={`mt-3 block font-display font-bold leading-snug ${dark ? 'text-white' : 'text-tinta'}`}>
              <span className="sr-only">Reproducir video: </span>
              {v.title}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function GalleryStrip({ count }: { count: number }) {
  const { data } = useSite();
  const items = data.galeria.slice(0, count);
  return (
    <div data-gallery>
      <ul className="flex snap-x gap-3 overflow-x-auto pb-2">
        {items.map((it, i) => (
          <li key={it.src} className="w-72 shrink-0 snap-start">
            <button type="button" data-index={i} data-full={it.full} data-alt={it.alt} className="group relative block w-full overflow-hidden rounded-xl bg-marino text-left" style={{ aspectRatio: '4/3' }}>
              <span className="sr-only">Ampliar: {it.alt}</span>
              <Img k={it.src} alt={it.alt} sizes="18rem" className="transition duration-500 group-hover:scale-[1.03] group-hover:brightness-110" />
            </button>
          </li>
        ))}
      </ul>
      <dialog data-lightbox className="m-auto max-h-none max-w-none bg-transparent p-0 backdrop:bg-marino-900/92" aria-label="Foto ampliada">
        <figure className="grid h-dvh w-screen grid-rows-[1fr_auto] place-items-center gap-3 p-4 sm:p-10">
          <img data-lb-img alt="" className="max-h-full max-w-full rounded-lg object-contain" />
          <figcaption data-lb-cap className="text-center text-white/85" />
        </figure>
        {[
          ['data-lb-close', 'Cerrar', 'right-4 top-4', 'M6 6l12 12M18 6L6 18'],
          ['data-lb-prev', 'Foto anterior', 'left-3 top-1/2 -translate-y-1/2', 'M15 5l-7 7 7 7'],
          ['data-lb-next', 'Foto siguiente', 'right-3 top-1/2 -translate-y-1/2', 'M9 5l7 7-7 7'],
        ].map(([attr, label, pos, d]) => (
          <button key={attr} type="button" {...{ [attr]: '' }} className={`absolute grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 ${pos}`}>
            <span className="sr-only">{label}</span>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" aria-hidden="true">
              <path d={d} />
            </svg>
          </button>
        ))}
      </dialog>
    </div>
  );
}

export interface MediaProps {
  title: T;
  text: T;
  instagramLabel: string;
  videos: number;
  fotos: number;
  button: string;
}
export function MediaGallery(p: MediaProps) {
  const { data } = useSite();
  return (
    <section className="bg-marino py-20 text-white sm:py-28">
      <div className="wrap">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="max-w-2xl text-h2">{p.title}</h2>
            {p.text && <p className="mt-3 max-w-xl text-lg text-white/75">{p.text}</p>}
          </div>
          {p.instagramLabel && (
            <a href={data.site.instagram} target="_blank" rel="noopener" className="font-bold text-naranja underline decoration-2 underline-offset-4">
              {p.instagramLabel}
            </a>
          )}
        </div>
        {p.videos > 0 && (
          <div className="mt-10">
            <VideoGrid videos={data.site.videos.slice(0, p.videos)} dark />
          </div>
        )}
        {p.fotos > 0 && (
          <div className="mt-10">
            <GalleryStrip count={p.fotos} />
          </div>
        )}
        {p.button && (
          <a href="/galeria" className="btn btn-ghost mt-8">
            {p.button}
          </a>
        )}
      </div>
    </section>
  );
}

/* ───────────── Tarjetas de negocio ───────────── */
export interface BusinessProps {
  cards: { title: string; text: string; linkLabel: string; href: string; estilo: 'naranja' | 'borde' | 'marino' }[];
}
export function Business(p: BusinessProps) {
  const estilos = {
    naranja: ['bg-naranja text-marino', 'text-marino', ''],
    borde: ['border-2 border-marino', 'text-gris', 'text-naranja-700'],
    marino: ['bg-marino text-white', 'text-white/80', 'text-naranja'],
  } as const;
  return (
    <section className="wrap grid gap-6 py-20 sm:py-28 md:grid-cols-2">
      {(p.cards ?? []).map((c, i) => {
        const [box, txt, link] = estilos[c.estilo] ?? estilos.borde;
        return (
          <a key={i} href={c.href} className={`group rounded-3xl p-8 sm:p-10 ${box}`} {...linkProps(c.href)}>
            <h2 className="font-display text-[1.75rem] font-extrabold leading-tight sm:text-[2rem]">{c.title}</h2>
            {c.text && <p className={`mt-3 max-w-md ${txt}`}>{c.text}</p>}
            {c.linkLabel && <span className={`mt-8 inline-block font-bold underline decoration-2 underline-offset-4 ${link}`}>{c.linkLabel}</span>}
          </a>
        );
      })}
    </section>
  );
}

/* ───────────── Preguntas frecuentes ───────────── */
export interface FaqProps {
  title: T;
  cantidad: number;
  linkLabel: string;
}
export function Faq(p: FaqProps) {
  const { data } = useSite();
  return (
    <section className="wrap pb-20 sm:pb-28">
      <h2 className="text-h2">{p.title}</h2>
      <div className="mt-8 max-w-3xl divide-y divide-roca border-y border-roca">
        {data.faq.slice(0, p.cantidad || 4).map((f) => (
          <details key={f.q} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-bold">
              {f.q}
              <span className="text-2xl text-naranja-700 transition group-open:rotate-45" aria-hidden="true">
                +
              </span>
            </summary>
            <p className="mt-3 text-gris">{f.a}</p>
          </details>
        ))}
      </div>
      {p.linkLabel && (
        <a href="/preguntas-frecuentes" className="mt-6 inline-block font-bold text-naranja-700 underline decoration-2 underline-offset-4">
          {p.linkLabel}
        </a>
      )}
    </section>
  );
}

/* ───────────── Franja de contacto ───────────── */
export interface CtaProps {
  title: T;
  text: T;
  message: string;
}
export function Cta(p: CtaProps) {
  const wa = useWhatsapp();
  return (
    <section className="relative overflow-hidden bg-marino text-white">
      <svg className="pointer-events-none absolute -right-24 -top-24 h-[28rem] w-[28rem] text-naranja opacity-[0.12]" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M50 12 L61 44 L94 44 L67 63 L77 94 L50 75 L23 94 L33 63 L6 44 L39 44 Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      </svg>
      <div className="wrap relative grid gap-6 py-16 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <h2 className="text-h2">{p.title}</h2>
          {p.text && <p className="mt-3 max-w-2xl text-lg text-white/80">{p.text}</p>}
        </div>
        <div className="flex flex-wrap gap-3">
          <a href="/reservas" className="btn btn-primary">
            Solicitar reserva
          </a>
          <a href={wa(p.message)} target="_blank" rel="noopener" className="btn btn-wa">
            WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
