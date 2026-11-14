#!/usr/bin/env node
// Exporta el contenido del WordPress actual (REST API) y descarga las imágenes al repo.
//   node scripts/export-wp.mjs            → imágenes usadas por el sitio + destacadas de productos/alojamientos
//   ALL_MEDIA=1 node scripts/export-wp.mjs → además toda la biblioteca de medios
// Resultado:
//   migration/wp-export/*.json   → páginas, entradas, productos, alojamientos, tipos de contenido
//   migration/wp-export/RESUMEN.md
//   src/assets/media/AAAA/MM/... → imágenes (redimensionadas a máx. 2400 px) que Astro optimiza en build
import { mkdir, readFile, readdir, writeFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const BASE = process.env.WP_URL ?? 'https://www.turismoavatar.cl';
const OUT = 'migration/wp-export';
const MEDIA_DIR = 'src/assets/media';
const ALL_MEDIA = process.env.ALL_MEDIA === '1';
const UA = 'Mozilla/5.0 (compatible; TurismoAvatarMigration/1.0; +https://github.com/gbrss/turismoavatar)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, asJson = true) {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': UA, accept: asJson ? 'application/json' : '*/*' } });
      if (res.status === 404 || res.status === 400 || res.status === 401) return null;
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return asJson ? { data: await res.json(), headers: res.headers } : { data: Buffer.from(await res.arrayBuffer()), headers: res.headers };
    } catch (e) {
      if (i === 2) {
        console.warn('  ✗', e.message);
        return null;
      }
      await sleep(1000 * (i + 1));
    }
  }
}

async function getAll(path) {
  const items = [];
  for (let page = 1; page < 50; page++) {
    const sep = path.includes('?') ? '&' : '?';
    const r = await get(`${BASE}${path}${sep}per_page=100&page=${page}`);
    if (!r || !Array.isArray(r.data) || r.data.length === 0) break;
    items.push(...r.data);
    const total = Number(r.headers.get('x-wp-totalpages') ?? 1);
    if (page >= total) break;
  }
  return items;
}

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

const UPLOAD_RE = /(?:https?:\/\/(?:www\.)?turismoavatar\.cl)?\/wp-content\/uploads\/(\d{4}\/\d{2}\/[^"'\s)?#]+?\.(?:jpe?g|png|webp|gif))/gi;
const KEY_RE = /\b(\d{4}\/\d{2}\/[\w.\-%]+?\.(?:jpe?g|png|webp|gif))\b/gi;

async function main() {
  await mkdir(OUT, { recursive: true });
  console.log(`Exportando ${BASE}`);

  const probe = await fetch(`${BASE}/wp-json/wp/v2/types`, { headers: { 'user-agent': UA } }).catch((e) => ({ ok: false, status: e.message }));
  if (!probe.ok) {
    console.error(`\n✗ El WordPress no respondió (${probe.status}). Probablemente el hosting bloquea servidores/IPs de data center.`);
    console.error('  Ejecuta este script desde tu computador: npm install && npm run wp:export, y luego haz commit y push.\n');
    process.exit(1);
  }
  const types = (await probe.json()) ?? {};
  await writeFile(join(OUT, 'types.json'), JSON.stringify(types, null, 2));

  const exported = {};
  const skip = new Set(['attachment', 'nav_menu_item', 'wp_block', 'wp_template', 'wp_template_part', 'wp_navigation', 'wp_global_styles', 'wp_font_family', 'wp_font_face']);
  for (const [slug, t] of Object.entries(types)) {
    if (skip.has(slug) || !t.rest_base) continue;
    const ns = t.rest_namespace ?? 'wp/v2';
    const items = await getAll(`/wp-json/${ns}/${t.rest_base}?_embed=wp:featuredmedia`);
    if (!items.length) continue;
    exported[slug] = items;
    await writeFile(join(OUT, `${slug}.json`), JSON.stringify(items, null, 2));
    console.log(`  ✓ ${slug}: ${items.length}`);
  }

  // WooCommerce Store API (pública): precios, descripciones e imágenes de productos/experiencias
  const products = await getAll('/wp-json/wc/store/v1/products');
  if (products.length) {
    exported.wc_products = products;
    await writeFile(join(OUT, 'wc-products.json'), JSON.stringify(products, null, 2));
    console.log(`  ✓ productos WooCommerce: ${products.length}`);
  }
  const categories = (await get(`${BASE}/wp-json/wc/store/v1/products/categories`))?.data;
  if (categories) await writeFile(join(OUT, 'wc-categories.json'), JSON.stringify(categories, null, 2));

  const media = await getAll('/wp-json/wp/v2/media');
  if (media.length) await writeFile(join(OUT, 'media.json'), JSON.stringify(media.map((m) => ({ id: m.id, source_url: m.source_url, alt: m.alt_text, title: m.title?.rendered, post: m.post })), null, 2));
  console.log(`  ✓ biblioteca de medios: ${media.length}`);

  // ── Imágenes a descargar ──
  const wanted = new Set();
  // 1) Las que referencia el sitio Astro
  for (const f of [...(await walk('src/content')), ...(await walk('src/data')), ...(await walk('src/pages')), ...(await walk('src/components'))]) {
    const txt = await readFile(f, 'utf8');
    for (const m of txt.matchAll(KEY_RE)) wanted.add(m[1]);
  }
  wanted.add('2024/10/LOGO.png');
  // 2) Las que aparecen en el contenido exportado (destacadas, galerías, productos)
  const blob = JSON.stringify(exported);
  for (const m of blob.replace(/\\\//g, '/').matchAll(UPLOAD_RE)) {
    const key = decodeURIComponent(m[1]);
    // evitamos miniaturas pequeñas del WP
    if (!/-(1[0-4]\d|[1-9]\d)x\d+\./.test(key)) wanted.add(key);
  }
  // 3) Toda la biblioteca si se pidió
  if (ALL_MEDIA) for (const m of media) {
    const k = m.source_url?.split('/wp-content/uploads/')[1];
    if (k) wanted.add(decodeURIComponent(k));
  }

  console.log(`Descargando ${wanted.size} imágenes…`);
  let ok = 0;
  const missing = [];
  for (const key of wanted) {
    const dest = join(MEDIA_DIR, key);
    if (await stat(dest).then(() => true, () => false)) {
      ok++;
      continue;
    }
    let r = await get(`${BASE}/wp-content/uploads/${encodeURI(key)}`, false);
    // Si la variante redimensionada no existe, probamos con la original
    if (!r) {
      const original = key.replace(/-(\d+x\d+|scaled)(?=\.[a-z]+$)/i, '');
      if (original !== key) r = await get(`${BASE}/wp-content/uploads/${encodeURI(original)}`, false);
    }
    if (!r) {
      missing.push(key);
      continue;
    }
    await mkdir(dirname(dest), { recursive: true });
    try {
      const img = sharp(r.data, { failOn: 'none' }).rotate();
      const meta = await img.metadata();
      const out = meta.width && meta.width > 2400 ? await img.resize({ width: 2400 }).toBuffer() : r.data;
      await writeFile(dest, out);
      ok++;
    } catch {
      missing.push(key);
    }
  }
  console.log(`  ✓ ${ok} imágenes listas, ${missing.length} no disponibles`);

  // ── Resumen para revisar y completar el catálogo ──
  const lines = [`# Exportación WordPress — ${new Date().toISOString().slice(0, 10)}`, '', `Origen: ${BASE}`, ''];
  for (const [k, items] of Object.entries(exported)) {
    lines.push(`## ${k} (${items.length})`, '');
    for (const it of items) {
      const title = it.title?.rendered ?? it.name ?? it.slug;
      const price = it.prices ? ` — ${it.prices.currency_symbol}${Number(it.prices.price) / 10 ** (it.prices.currency_minor_unit ?? 0)}` : '';
      lines.push(`- **${String(title).replace(/<[^>]+>/g, '')}**${price} · \`${it.link ?? it.permalink ?? ''}\``);
    }
    lines.push('');
  }
  if (missing.length) lines.push('## Imágenes no encontradas', '', ...missing.map((m) => `- ${m}`), '');
  await writeFile(join(OUT, 'RESUMEN.md'), lines.join('\n'));
  console.log(`Resumen en ${join(OUT, 'RESUMEN.md')}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
