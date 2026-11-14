#!/usr/bin/env node
// Extrae TODO el sitio original (WordPress) con un navegador real:
//   textos por página, imágenes (img, srcset, lazy, fondos CSS), videos, logo, favicon,
//   colores y tipografías computadas, variables CSS del tema y capturas de pantalla.
// Si el hosting bloquea la IP/agent, cae a modo proxy (HTML/CSS vía allorigins/jina, imágenes vía wsrv.nl).
//
//   node scripts/extract-site.mjs
//   WP_URL=https://www.turismoavatar.cl MAX_PAGES=150 node scripts/extract-site.mjs
//
// Salida:
//   migration/original/pages.json        → contenido de cada página (bloques de texto en orden, imágenes, videos, links)
//   migration/original/brand.json        → colores, variables CSS, tipografías, logo, favicon
//   migration/original/assets.json       → url original → archivo local
//   migration/original/RESUMEN.md
//   migration/original/screenshots/*.jpg → captura de cada página principal
//   src/assets/media/AAAA/MM/...         → imágenes (máx. 2400 px)
//   public/media/video/*.mp4             → videos propios recomprimidos (si existen)
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { dirname, join, basename, extname } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const ORIGIN = (process.env.WP_URL ?? 'https://www.turismoavatar.cl').replace(/\/$/, '');
const HOST = new URL(ORIGIN).host.replace(/^www\./, '');
const MAX_PAGES = Number(process.env.MAX_PAGES ?? 150);
const OUT = 'migration/original';
const MEDIA = 'src/assets/media';
const VIDEO_DIR = 'public/media/video';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const diag = { origin: ORIGIN, startedAt: new Date().toISOString(), probes: {}, mode: null, errors: [] };

// ───────────────────────── utilidades ─────────────────────────
const isSameHost = (u) => {
  try {
    return new URL(u).host.replace(/^www\./, '') === HOST;
  } catch {
    return false;
  }
};
const normalize = (u) => {
  const x = new URL(u, ORIGIN);
  x.hash = '';
  x.search = '';
  x.host = new URL(ORIGIN).host;
  x.protocol = new URL(ORIGIN).protocol;
  if (!x.pathname.endsWith('/') && !extname(x.pathname)) x.pathname += '/';
  return x.href;
};
const crawlable = (u) => {
  try {
    const x = new URL(u, ORIGIN);
    if (!isSameHost(x.href)) return false;
    if (/\.(jpe?g|png|gif|webp|avif|svg|ico|pdf|zip|mp4|webm|mov|mp3|xml|css|js|json|txt)$/i.test(x.pathname)) return false;
    if (/^\/(wp-admin|wp-login|wp-json|wp-content|wp-includes|feed|comments|carrito|cart|checkout|finalizar-compra|mi-cuenta|my-account|xmlrpc)/i.test(x.pathname)) return false;
    if (/\/feed\/?$|\/embed\/?$|\/page\/\d+/.test(x.pathname)) return false;
    if (/add-to-cart|replytocom|share=|orderby|filter_|[?&]s=|wc-ajax|lang=/.test(x.search)) return false;
    return true;
  } catch {
    return false;
  }
};
const slugOf = (u) => new URL(u).pathname.replace(/^\/|\/$/g, '').replace(/\//g, '__') || 'inicio';
const rgbToHex = (v) => {
  const m = v.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!m) return v;
  if (m[4] !== undefined && Number(m[4]) < 0.5) return null;
  return '#' + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('');
};
const uploadsKey = (u) => {
  const m = decodeURIComponent(new URL(u).pathname).match(/\/wp-content\/uploads\/(.+)$/);
  return m ? m[1] : null;
};
const stripSize = (k) => k.replace(/-\d{2,5}x\d{2,5}(?=\.[a-z0-9]+$)/i, '');
const exists = (p) => stat(p).then(() => true, () => false);

// ───────────────────────── proxies (modo bloqueado) ─────────────────────────
async function proxyText(url) {
  if (process.env.PROXY_DIRECT) return fetch(url).then((r) => (r.ok ? r.text() : null)).catch(() => null);
  const tries = [
    [`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, {}],
    [`https://r.jina.ai/${url}`, { 'x-return-format': 'html', 'x-no-cache': 'true' }],
    [`https://corsproxy.io/?url=${encodeURIComponent(url)}`, {}],
  ];
  for (const [p, headers] of tries) {
    try {
      const r = await fetch(p, { headers: { 'user-agent': UA, ...headers }, signal: AbortSignal.timeout(45000) });
      if (r.ok) {
        const t = await r.text();
        if (t && t.length > 200 && !/Access denied|403 Forbidden/i.test(t.slice(0, 600))) return t;
      }
    } catch {}
    await sleep(500);
  }
  return null;
}
async function proxyBinary(url) {
  if (process.env.PROXY_DIRECT) return fetch(url).then(async (r) => (r.ok ? Buffer.from(await r.arrayBuffer()) : null)).catch(() => null);
  const tries = [
    `https://wsrv.nl/?url=${encodeURIComponent(url.replace(/^https?:\/\//, ''))}&n=-1`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  ];
  for (const p of tries) {
    try {
      const r = await fetch(p, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(90000) });
      if (r.ok) {
        const b = Buffer.from(await r.arrayBuffer());
        if (b.length > 200) return b;
      }
    } catch {}
  }
  return null;
}

// ───────────────────────── extracción en la página ─────────────────────────
const EXTRACT = () => {
  const abs = (u) => {
    try {
      return u ? new URL(u.trim(), document.baseURI).href : null;
    } catch {
      return null;
    }
  };
  const clean = (t) => (t || '').replace(/\s+/g, ' ').trim();
  const images = new Map();
  const add = (u, alt, kind, el) => {
    const a = abs(u);
    if (!a || a.startsWith('data:') || /\.(mp4|webm|mov)(\?|$)/i.test(a)) return;
    const prev = images.get(a);
    const r = el?.getBoundingClientRect?.();
    const info = { url: a, alt: clean(alt), kind, w: r ? Math.round(r.width) : 0, h: r ? Math.round(r.height) : 0, inHeader: !!el?.closest?.('header, .elementor-location-header'), inFooter: !!el?.closest?.('footer, .elementor-location-footer') };
    if (!prev || (!prev.alt && info.alt)) images.set(a, info);
  };
  const best = (srcset) =>
    (srcset || '')
      .split(',')
      .map((s) => s.trim().split(/\s+/))
      .filter((p) => p[0])
      .sort((a, b) => parseInt(b[1] || '0') - parseInt(a[1] || '0'))[0]?.[0];

  document.querySelectorAll('img').forEach((img) => {
    const alt = img.alt || img.title || img.closest('figure')?.querySelector('figcaption')?.textContent || '';
    [best(img.getAttribute('srcset')), best(img.dataset.srcset), best(img.dataset.lazySrcset), img.getAttribute('data-orig-file'), img.getAttribute('data-large-file'), img.dataset.src, img.dataset.lazySrc, img.getAttribute('src'), img.currentSrc]
      .filter(Boolean)
      .forEach((c) => add(c, alt, 'img', img));
  });
  document.querySelectorAll('picture source[srcset], source[data-srcset]').forEach((s) => add(best(s.getAttribute('srcset') || s.dataset.srcset), '', 'source', s.parentElement));
  document.querySelectorAll('a[href]').forEach((a) => {
    if (/\.(jpe?g|png|webp|gif)(\?|$)/i.test(a.href)) add(a.href, a.title || a.querySelector('img')?.alt || '', 'link', a);
  });
  const all = [...document.querySelectorAll('body *')];
  all.forEach((el) => {
    const cs = getComputedStyle(el);
    for (const prop of ['backgroundImage', 'listStyleImage']) {
      const bg = cs[prop];
      if (bg && bg !== 'none') for (const m of bg.matchAll(/url\(["']?([^"')]+)["']?\)/g)) add(m[1], el.getAttribute('aria-label') || '', 'background', el);
    }
    for (const attr of ['data-bg', 'data-background', 'data-bg-image', 'data-src']) {
      const v = el.getAttribute(attr);
      if (v && !el.matches('img,iframe')) add(v, '', 'data-attr', el);
    }
  });
  const rawHtml = document.documentElement.outerHTML.replace(/\\\//g, '/');
  document.querySelectorAll('[data-settings]').forEach((el) => {
    const s = (el.getAttribute('data-settings') || '').replace(/\\\//g, '/');
    for (const m of s.matchAll(/https?:\/\/[^"'\s]+?\.(?:jpe?g|png|webp|gif)/gi)) add(m[0], '', 'slideshow', el);
  });

  const videos = new Set();
  document.querySelectorAll('video').forEach((v) => {
    [v.src, v.currentSrc, ...[...v.querySelectorAll('source')].map((s) => s.src)].filter(Boolean).forEach((s) => videos.add(abs(s)));
    if (v.poster) add(v.poster, 'poster', 'poster', v);
  });
  document.querySelectorAll('iframe').forEach((f) => {
    const s = f.getAttribute('src') || f.dataset.src || f.dataset.lazySrc;
    if (s && /youtube|youtu\.be|vimeo|tiktok|instagram|facebook\.com\/plugins\/video|google\.com\/maps/i.test(s)) videos.add(abs(s));
  });
  for (const m of rawHtml.matchAll(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/g)) videos.add('https://www.youtube.com/watch?v=' + m[1]);
  for (const m of rawHtml.matchAll(/https?:\/\/[^"'\s<>]+?\.(?:mp4|webm|mov)/gi)) videos.add(m[0]);

  // Bloques de texto en orden del documento (sin header/footer)
  const SKIP = 'header, footer, nav, script, style, noscript, .elementor-location-header, .elementor-location-footer, .screen-reader-text, [aria-hidden="true"]';
  const blocks = [];
  const seen = new Set();
  document
    .querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,dt,dd,th,td,.price,.elementor-button-text,.elementor-heading-title,.elementor-icon-box-title,.elementor-icon-box-description,.elementor-image-box-title,.elementor-image-box-description,.elementor-testimonial-content,.elementor-testimonial-name,.elementor-counter-number-wrapper,.elementor-counter-title,.elementor-icon-list-text,.elementor-price-table__heading,.elementor-price-list-title,.elementor-price-list-price,.elementor-tab-title,.elementor-tab-content,.elementor-toggle-title,.elementor-accordion-title,.woocommerce-product-details__short-description,.product_title,.summary .price')
    .forEach((el) => {
      if (el.closest(SKIP)) return;
      if (el.matches('li') && el.querySelector('p,h1,h2,h3,h4,ul')) return;
      if (el.matches('p, li') && el.closest('.elementor-heading-title, .elementor-icon-box-description, .elementor-tab-content')) return;
      const t = clean(el.innerText);
      if (!t || t.length < 2) return;
      const key = el.tagName + t;
      if (seen.has(key)) return;
      seen.add(key);
      const cls = typeof el.className === 'string' ? el.className.split(/\s+/).filter((c) => /elementor-|price|title|description|testimonial|counter|button/.test(c)).slice(0, 2).join(' ') : '';
      blocks.push({ tag: el.tagName.toLowerCase(), cls, text: t.slice(0, 4000) });
    });

  const links = [...document.querySelectorAll('a[href]')].map((a) => ({ href: a.href, text: clean(a.innerText).slice(0, 120), inNav: !!a.closest('nav, header, .elementor-location-header'), inFooter: !!a.closest('footer, .elementor-location-footer') }));

  // Colores y fuentes computadas (ponderadas por área / texto visible)
  const colors = {};
  const fonts = {};
  const headingFonts = {};
  for (const el of all.slice(0, 6000)) {
    const r = el.getBoundingClientRect();
    if (r.width * r.height < 4) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    const area = Math.min(r.width * r.height, 1.5e6) / 1000;
    const bump = (k, w) => (colors[k] = (colors[k] || 0) + w);
    if (ownText) bump('text|' + cs.color, 1);
    if (cs.backgroundColor && !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor)) bump('bg|' + cs.backgroundColor, area);
    if (cs.borderTopWidth !== '0px' && cs.borderTopStyle !== 'none') bump('border|' + cs.borderTopColor, 0.3);
    if (ownText) {
      fonts[cs.fontFamily] = (fonts[cs.fontFamily] || 0) + 1;
      if (/^H[1-6]$/.test(el.tagName) || el.classList.contains('elementor-heading-title')) headingFonts[`${cs.fontFamily} | ${cs.fontWeight} | ${cs.textTransform}`] = (headingFonts[`${cs.fontFamily} | ${cs.fontWeight} | ${cs.textTransform}`] || 0) + 1;
    }
  }
  const cssVars = {};
  for (const sheet of document.styleSheets) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of rules || []) {
      if (!rule.style) continue;
      for (const name of rule.style) {
        if (!name.startsWith('--')) continue;
        if (!/color|font|typography|primary|secondary|accent|text/i.test(name)) continue;
        const v = rule.style.getPropertyValue(name).trim();
        if (v && v.length < 200) cssVars[name] = v;
      }
    }
  }
  const logos = [...document.querySelectorAll('.custom-logo, .site-logo img, .elementor-widget-theme-site-logo img, header img, .elementor-location-header img, [class*="logo"] img, img[class*="logo"], img[alt*="logo" i], img[src*="logo" i]')].map((i) => ({
    src: abs(best(i.getAttribute('srcset')) || i.getAttribute('src') || i.dataset.src),
    alt: i.alt,
    w: i.naturalWidth,
    h: i.naturalHeight,
  }));
  const icons = [...document.querySelectorAll('link[rel*="icon"], link[rel="apple-touch-icon"]')].map((l) => ({ rel: l.rel, href: l.href, sizes: l.getAttribute('sizes') }));
  const meta = {
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.content || document.querySelector('meta[property="og:description"]')?.content || '',
    ogImage: document.querySelector('meta[property="og:image"]')?.content || '',
    h1: clean(document.querySelector('h1')?.innerText),
    lang: document.documentElement.lang,
    bodyClass: document.body.className,
    generator: document.querySelector('meta[name="generator"]')?.content || '',
  };
  const jsonld = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent.slice(0, 20000));
  const headerText = clean(document.querySelector('header, .elementor-location-header')?.innerText).slice(0, 2000);
  const footerText = clean(document.querySelector('footer, .elementor-location-footer')?.innerText).slice(0, 4000);
  const stylesheets = [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.href);
  return { meta, blocks, images: [...images.values()], videos: [...videos].filter(Boolean), links, colors, fonts, headingFonts, cssVars, logos, icons, jsonld, headerText, footerText, stylesheets, height: document.documentElement.scrollHeight };
};

// ───────────────────────── carga de páginas ─────────────────────────
let browser, ctx;
async function openLive(url) {
  const page = await ctx.newPage();
  let status = 0;
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    status = resp?.status() ?? 0;
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    // Scroll para disparar lazy-load y animaciones
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 150));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(800);
  } catch (e) {
    diag.errors.push(`live ${url}: ${e.message}`);
  }
  return { page, status };
}

async function openProxied(url) {
  const html = await proxyText(url);
  if (!html) return { page: null, status: 0 };
  // Incrusta las hojas de estilo (vía proxy) para poder calcular colores y fondos
  const linkRe = /<link[^>]+rel=["']?stylesheet["']?[^>]*>/gi;
  const links = html.match(linkRe) ?? [];
  let doc = html;
  for (const tag of links.slice(0, 40)) {
    const href = tag.match(/href=["']([^"']+)["']/)?.[1];
    if (!href) continue;
    const abs = new URL(href.replace(/&amp;/g, '&'), url).href;
    if (!isSameHost(abs) && !/fonts\.googleapis/.test(abs)) continue;
    const css = (await proxyText(abs)) ?? '';
    const fixed = css.replace(/url\(\s*["']?(?!data:|https?:|\/\/)([^"')]+)["']?\s*\)/g, (_, p) => `url("${new URL(p, abs).href}")`);
    doc = doc.replace(tag, `<style data-href="${abs}">${fixed.replace(/<\/style/gi, '')}</style>`);
  }
  doc = doc.replace(/<head([^>]*)>/i, `<head$1><base href="${url}">`);
  const page = await ctx.newPage();
  await page.route('**/*', (route) => (route.request().resourceType() === 'document' ? route.continue() : route.abort()));
  await page.setContent(doc, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch((e) => diag.errors.push(`setContent ${url}: ${e.message}`));
  return { page, status: 200 };
}

const blocked = (status, title = '') => status === 0 || status === 403 || status === 429 || status >= 500 || /just a moment|access denied|attention required|forbidden|not acceptable/i.test(title);


// ───────────────────────── extras: YouTube, Instagram, chatbot ─────────────────────────
async function extras() {
  const out = {};
  // Videos del canal de YouTube
  try {
    const r = await fetch('https://www.youtube.com/@turismoavatar/videos', { headers: { 'user-agent': UA, 'accept-language': 'es-CL,es;q=0.9' } });
    const html = await r.text();
    const vids = new Map();
    for (const m of html.matchAll(/"videoId":"([\w-]{11})"[\s\S]{0,1500}?"title":\{"runs":\[\{"text":"([^"]+)"/g)) if (!vids.has(m[1])) vids.set(m[1], m[2]);
    const shorts = await fetch('https://www.youtube.com/@turismoavatar/shorts', { headers: { 'user-agent': UA } }).then((x) => x.text()).catch(() => '');
    for (const m of shorts.matchAll(/"videoId":"([\w-]{11})"/g)) if (!vids.has(m[1])) vids.set(m[1], '(short)');
    out.youtube = [...vids].map(([id, title]) => ({ id, title }));
    const desc = html.match(/"description":"([^"]{10,800})"/);
    if (desc) out.youtubeDescription = desc[1];
  } catch (e) {
    out.youtubeError = e.message;
  }
  // Instagram y otras redes (lectura best-effort vía r.jina.ai)
  for (const [k, u] of [
    ['instagram', 'https://www.instagram.com/turismoavatar/'],
    ['facebook', 'https://www.facebook.com/turismoavatarchile'],
    ['tiktok', 'https://www.tiktok.com/@turismoavatar'],
    ['chatbot', 'https://turismo-avatar-bot-446018569219.southamerica-west1.run.app/'],
  ]) {
    try {
      const r = await fetch(`https://r.jina.ai/${u}`, { headers: { 'user-agent': UA, 'x-no-cache': 'true' }, signal: AbortSignal.timeout(60000) });
      out[k] = r.ok ? (await r.text()).slice(0, 30000) : `HTTP ${r.status}`;
    } catch (e) {
      out[k] = e.message;
    }
  }
  return out;
}

// ───────────────────────── main ─────────────────────────
async function main() {
  await mkdir(join(OUT, 'screenshots'), { recursive: true });

  // Diagnóstico de acceso directo
  for (const [name, ua] of [['fetch-browser-ua', UA], ['fetch-bot-ua', 'TurismoAvatarMigration/1.0']]) {
    try {
      const r = await fetch(ORIGIN + '/', { headers: { 'user-agent': ua, accept: 'text/html' }, signal: AbortSignal.timeout(30000) });
      diag.probes[name] = { status: r.status, headers: Object.fromEntries([...r.headers].filter(([k]) => /server|^cf-|^x-|via|powered/i.test(k))) };
    } catch (e) {
      diag.probes[name] = { error: e.message };
    }
  }

  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox'] });
  ctx = await browser.newContext({ userAgent: UA, locale: 'es-CL', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

  const first = await openLive(ORIGIN + '/');
  const firstTitle = first.page ? await first.page.title().catch(() => '') : '';
  diag.probes.playwright = { status: first.status, title: firstTitle };
  diag.mode = process.env.FORCE_MODE || (blocked(first.status, firstTitle) ? 'proxy' : 'browser');
  await first.page?.close();
  console.log(`Modo: ${diag.mode}`, diag.probes);
  const open = diag.mode === 'browser' ? openLive : openProxied;

  // Descubrir URLs: sitemaps + links
  const queue = [ORIGIN + '/'];
  const fetchText = async (u) => {
    if (diag.mode === 'browser') {
      const r = await ctx.request.get(u, { timeout: 30000 }).catch(() => null);
      return r && r.ok() ? r.text() : null;
    }
    return proxyText(u);
  };
  for (const sm of ['/wp-sitemap.xml', '/sitemap_index.xml', '/sitemap.xml', '/page-sitemap.xml', '/product-sitemap.xml']) {
    const xml = await fetchText(ORIGIN + sm);
    if (!xml || !xml.includes('<loc>')) continue;
    const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));
    for (const loc of locs) {
      if (/\.xml/.test(loc)) {
        const sub = await fetchText(loc);
        if (sub) for (const m of sub.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) if (crawlable(m[1])) queue.push(m[1]);
      } else if (crawlable(loc)) queue.push(loc);
    }
    diag.sitemap = sm;
    break;
  }

  const visited = new Set();
  const pages = [];
  const brandAgg = { colors: {}, fonts: {}, headingFonts: {}, cssVars: {}, logos: [], icons: [] };
  let shots = 0;

  while (queue.length && pages.length < MAX_PAGES) {
    const url = normalize(queue.shift());
    if (visited.has(url) || !crawlable(url)) continue;
    visited.add(url);
    const { page, status } = await open(url);
    if (!page) {
      diag.errors.push(`sin contenido: ${url}`);
      continue;
    }
    try {
      const data = await page.evaluate(EXTRACT);
      const slug = slugOf(url);
      if (shots < 40) {
        const buf = await page.screenshot({ fullPage: true, type: 'jpeg', quality: 70, timeout: 60000 }).catch(() => null);
        if (buf) {
          const meta = await sharp(buf).metadata();
          await sharp(buf).resize({ width: 720 }).jpeg({ quality: 62 }).toFile(join(OUT, 'screenshots', `${slug}.jpg`));
          if (shots < 3 && meta.height > 900) await sharp(buf).extract({ left: 0, top: 0, width: meta.width, height: Math.min(900, meta.height) }).jpeg({ quality: 75 }).toFile(join(OUT, 'screenshots', `${slug}--viewport.jpg`));
          shots++;
        }
        if (shots <= 6 && diag.mode === 'browser') {
          const mp = await browser.newPage({ userAgent: UA, viewport: { width: 390, height: 844 } });
          await mp.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
          const mb = await mp.screenshot({ fullPage: true, type: 'jpeg', quality: 65 }).catch(() => null);
          if (mb) await sharp(mb).resize({ width: 390 }).jpeg({ quality: 60 }).toFile(join(OUT, 'screenshots', `${slug}--movil.jpg`));
          await mp.close();
        }
      }
      for (const [k, v] of Object.entries(data.colors)) brandAgg.colors[k] = (brandAgg.colors[k] || 0) + v;
      for (const [k, v] of Object.entries(data.fonts)) brandAgg.fonts[k] = (brandAgg.fonts[k] || 0) + v;
      for (const [k, v] of Object.entries(data.headingFonts)) brandAgg.headingFonts[k] = (brandAgg.headingFonts[k] || 0) + v;
      Object.assign(brandAgg.cssVars, data.cssVars);
      brandAgg.logos.push(...data.logos);
      brandAgg.icons.push(...data.icons);
      for (const l of data.links) if (crawlable(l.href)) queue.push(l.href);
      const { colors, fonts, headingFonts, cssVars, logos, icons, ...rest } = data;
      pages.push({ url, slug, status, ...rest, links: [...new Map(data.links.filter((l) => isSameHost(l.href) || /instagram|facebook|youtube|tiktok|wa\.me|whatsapp|mailto|tel:/.test(l.href)).map((l) => [l.href + l.text, l])).values()] });
      console.log(`  ✓ [${pages.length}] ${url} — ${data.blocks.length} bloques, ${data.images.length} imágenes, ${data.videos.length} videos`);
    } catch (e) {
      diag.errors.push(`extract ${url}: ${e.message}`);
    }
    await page.close().catch(() => {});
    if (diag.mode === 'proxy') await sleep(800);
  }

  // ── Marca ──
  const topColors = (prefix) =>
    Object.entries(brandAgg.colors)
      .filter(([k]) => k.startsWith(prefix + '|'))
      .map(([k, v]) => [rgbToHex(k.split('|')[1]), v])
      .filter(([h]) => h)
      .reduce((acc, [h, v]) => ((acc[h] = (acc[h] || 0) + v), acc), {});
  const sortObj = (o, n = 20) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ value: k, weight: Math.round(v) }));
  const brand = {
    textColors: sortObj(topColors('text')),
    backgroundColors: sortObj(topColors('bg')),
    borderColors: sortObj(topColors('border'), 10),
    cssVars: brandAgg.cssVars,
    fonts: sortObj(brandAgg.fonts, 10),
    headingFonts: sortObj(brandAgg.headingFonts, 10),
    logos: [...new Map(brandAgg.logos.filter((l) => l.src).map((l) => [l.src, l])).values()],
    icons: [...new Map(brandAgg.icons.map((l) => [l.href, l])).values()],
  };

  // ── Assets ──
  const assetMap = new Map();
  for (const p of pages) {
    for (const im of p.images) {
      if (!/^https?:/.test(im.url)) continue;
      const a = assetMap.get(im.url) ?? { url: im.url, alts: new Set(), pages: new Set(), kinds: new Set(), maxW: 0 };
      if (im.alt) a.alts.add(im.alt);
      a.pages.add(p.slug);
      a.kinds.add(im.kind);
      a.maxW = Math.max(a.maxW, im.w);
      assetMap.set(im.url, a);
    }
  }
  for (const l of brand.logos) if (!assetMap.has(l.src)) assetMap.set(l.src, { url: l.src, alts: new Set(['logo']), pages: new Set(['logo']), kinds: new Set(['logo']), maxW: l.w });
  for (const i of brand.icons) if (!assetMap.has(i.href)) assetMap.set(i.href, { url: i.href, alts: new Set(['icono']), pages: new Set(['icono']), kinds: new Set(['icon']), maxW: 0 });

  // Una sola descarga por imagen original (WordPress repite la misma foto en varios tamaños)
  const byKey = new Map();
  for (const a of assetMap.values()) {
    const up = isSameHost(a.url) ? uploadsKey(a.url) : null;
    const key = up ? stripSize(up) : `externas/${new URL(a.url).host.replace(/[^\w.-]/g, '_')}/${basename(new URL(a.url).pathname) || 'img'}`;
    const prev = byKey.get(key);
    if (prev) {
      a.alts.forEach((x) => prev.alts.add(x));
      a.pages.forEach((x) => prev.pages.add(x));
      a.kinds.forEach((x) => prev.kinds.add(x));
      prev.variants.add(a.url);
    } else byKey.set(key, { ...a, key, variants: new Set([a.url]) });
  }

  const getBinary = async (u) => {
    if (diag.mode === 'browser') {
      const r = await ctx.request.get(u, { timeout: 90000 }).catch(() => null);
      if (r && r.ok()) return Buffer.from(await r.body());
    }
    return proxyBinary(u);
  };

  console.log(`Descargando ${byKey.size} imágenes…`);
  const assets = [];
  const entries = [...byKey.values()];
  const worker = async () => {
    while (entries.length) {
      const a = entries.shift();
      const ext = extname(a.key).toLowerCase();
      const dest = join(MEDIA, a.key);
      const rec = { key: a.key, url: a.url, alts: [...a.alts], pages: [...a.pages], kinds: [...a.kinds], displayW: a.maxW, file: null };
      if (await exists(dest)) {
        rec.file = dest;
        assets.push(rec);
        continue;
      }
      // Preferimos el archivo sin sufijo de tamaño (más grande); si no existe usamos la variante vista
      const candidates = [];
      if (isSameHost(a.url) && uploadsKey(a.url)) candidates.push(`${ORIGIN}/wp-content/uploads/${a.key.split('/').map(encodeURIComponent).join('/')}`);
      candidates.push(...[...a.variants]);
      let buf = null;
      for (const c of candidates) {
        buf = await getBinary(c);
        if (buf) break;
      }
      if (!buf) {
        rec.error = 'no descargada';
        assets.push(rec);
        continue;
      }
      await mkdir(dirname(dest), { recursive: true });
      try {
        if (['.svg', '.ico', '.gif'].includes(ext)) await writeFile(dest, buf);
        else {
          const img = sharp(buf, { failOn: 'none' }).rotate();
          const m = await img.metadata();
          rec.width = m.width;
          rec.height = m.height;
          const out = m.width > 2400 ? await img.resize({ width: 2400 }).toBuffer() : buf;
          await writeFile(dest, out);
        }
        rec.file = dest;
        rec.bytes = (await stat(dest)).size;
      } catch (e) {
        rec.error = e.message;
      }
      assets.push(rec);
    }
  };
  await Promise.all(Array.from({ length: diag.mode === 'browser' ? 6 : 3 }, worker));

  // ── Videos ──
  const videoSet = new Set(pages.flatMap((p) => p.videos));
  const videos = [];
  await mkdir(VIDEO_DIR, { recursive: true });
  for (const v of videoSet) {
    const yt = v.match(/(?:watch\?v=|embed\/|youtu\.be\/|shorts\/)([\w-]{11})/);
    if (yt) {
      const id = yt[1];
      if (videos.some((x) => x.youtube === id)) continue;
      const rec = { youtube: id, url: `https://www.youtube.com/watch?v=${id}`, pages: pages.filter((p) => p.videos.some((x) => x.includes(id))).map((p) => p.slug) };
      for (const q of ['maxresdefault', 'sddefault', 'hqdefault']) {
        try {
          const r = await fetch(`https://i.ytimg.com/vi/${id}/${q}.jpg`);
          if (r.ok) {
            const dest = join(MEDIA, 'youtube', `${id}.jpg`);
            await mkdir(dirname(dest), { recursive: true });
            await writeFile(dest, Buffer.from(await r.arrayBuffer()));
            rec.thumbnail = dest;
            break;
          }
        } catch {}
      }
      try {
        const o = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
        if (o.ok) Object.assign(rec, { title: (await o.json()).title });
      } catch {}
      videos.push(rec);
    } else if (/\.(mp4|webm|mov)(\?|$)/i.test(v) && isSameHost(v)) {
      const name = basename(new URL(v).pathname).replace(/\.(webm|mov)$/i, '.mp4');
      const rec = { url: v, pages: pages.filter((p) => p.videos.includes(v)).map((p) => p.slug) };
      const raw = await getBinary(v);
      if (raw) {
        const tmp = join('/tmp', 'in-' + basename(new URL(v).pathname));
        await writeFile(tmp, raw);
        const dest = join(VIDEO_DIR, name);
        try {
          await run('ffmpeg', ['-y', '-i', tmp, '-vf', "scale='min(1600,iw)':-2", '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '27', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', dest], { maxBuffer: 1e8 });
          await run('ffmpeg', ['-y', '-ss', '1', '-i', dest, '-frames:v', '1', '-q:v', '3', join(MEDIA, 'video', name.replace(/\.mp4$/, '.jpg'))]).catch(async () => {
            await mkdir(join(MEDIA, 'video'), { recursive: true });
            await run('ffmpeg', ['-y', '-ss', '1', '-i', dest, '-frames:v', '1', '-q:v', '3', join(MEDIA, 'video', name.replace(/\.mp4$/, '.jpg'))]);
          });
          rec.file = dest;
          rec.bytes = (await stat(dest)).size;
          rec.originalBytes = raw.length;
        } catch (e) {
          rec.error = e.message.slice(0, 300);
        }
      } else rec.error = 'no descargado';
      videos.push(rec);
    } else videos.push({ url: v, pages: pages.filter((p) => p.videos.includes(v)).map((p) => p.slug) });
  }

  if (!process.env.SKIP_EXTRAS) {
    const ex = await extras();
    await writeFile(join(OUT, 'redes.json'), JSON.stringify(ex, null, 2));
    for (const v of ex.youtube ?? []) {
      if (videos.some((x) => x.youtube === v.id)) continue;
      const rec = { youtube: v.id, url: `https://www.youtube.com/watch?v=${v.id}`, title: v.title, source: 'canal' };
      try {
        const r = await fetch(`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`);
        if (r.ok) {
          const dest = join(MEDIA, 'youtube', `${v.id}.jpg`);
          await mkdir(dirname(dest), { recursive: true });
          await writeFile(dest, Buffer.from(await r.arrayBuffer()));
          rec.thumbnail = dest;
        }
      } catch {}
      videos.push(rec);
    }
  }

  diag.finishedAt = new Date().toISOString();
  await writeFile(join(OUT, 'pages.json'), JSON.stringify(pages, null, 1));
  await writeFile(join(OUT, 'brand.json'), JSON.stringify(brand, null, 2));
  await writeFile(join(OUT, 'assets.json'), JSON.stringify(assets.sort((a, b) => a.key.localeCompare(b.key)), null, 1));
  await writeFile(join(OUT, 'videos.json'), JSON.stringify(videos, null, 2));
  await writeFile(join(OUT, 'diagnostico.json'), JSON.stringify(diag, null, 2));

  // ── Resumen legible ──
  const ok = assets.filter((a) => a.file).length;
  const L = [
    `# Extracción de ${ORIGIN}`,
    '',
    `Fecha: ${diag.finishedAt} · Modo: **${diag.mode}** · Páginas: ${pages.length} · Imágenes: ${ok}/${assets.length} · Videos: ${videos.length}`,
    '',
    '## Colores de texto',
    ...brand.textColors.slice(0, 12).map((c) => `- \`${c.value}\` (${c.weight})`),
    '',
    '## Colores de fondo',
    ...brand.backgroundColors.slice(0, 12).map((c) => `- \`${c.value}\` (${c.weight})`),
    '',
    '## Variables CSS de color del tema',
    ...Object.entries(brand.cssVars)
      .filter(([k]) => /e-global|primary|secondary|accent|theme|brand/i.test(k))
      .slice(0, 40)
      .map(([k, v]) => `- \`${k}\`: \`${v}\``),
    '',
    '## Tipografías',
    ...brand.fonts.map((f) => `- ${f.value} (${f.weight})`),
    '',
    '## Títulos',
    ...brand.headingFonts.map((f) => `- ${f.value} (${f.weight})`),
    '',
    '## Logo',
    ...brand.logos.map((l) => `- ${l.src} (${l.w}×${l.h}) ${l.alt ?? ''}`),
    '',
    '## Videos',
    ...videos.map((v) => `- ${v.title ?? ''} ${v.url} → ${v.file ?? v.thumbnail ?? v.error ?? ''}`),
    '',
    '## Páginas',
    ...pages.map((p) => `- [${p.meta.title}](${p.url}) — h1: ${p.meta.h1 || '—'} · ${p.blocks.length} bloques · ${p.images.length} imágenes`),
    '',
  ];
  if (diag.errors.length) L.push('## Errores', ...diag.errors.slice(0, 80).map((e) => `- ${e}`), '');
  await writeFile(join(OUT, 'RESUMEN.md'), L.join('\n'));
  await browser.close();
  console.log(`Listo: ${pages.length} páginas, ${ok} imágenes, ${videos.length} videos. Modo ${diag.mode}.`);
  if (pages.length === 0) process.exit(1);
}

main().catch(async (e) => {
  console.error(e);
  diag.fatal = String(e?.stack ?? e);
  await mkdir(OUT, { recursive: true });
  await writeFile(join(OUT, 'diagnostico.json'), JSON.stringify(diag, null, 2)).catch(() => {});
  process.exit(1);
});
