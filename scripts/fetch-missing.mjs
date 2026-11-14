#!/usr/bin/env node
// Descarga las imágenes que faltaron en la extracción (el hosting tiene protección anti-hotlink:
// exige Referer del propio dominio). Revisa:
//   - las fallidas de migration/original/assets.json
//   - las rutas AAAA/MM/archivo referenciadas en src/ que aún no existen
//   - versiones grandes de miniaturas (-600x338, -300x300, -1024x1024...)
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdir, readFile, readdir, writeFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const ORIGIN = (process.env.WP_URL ?? 'https://www.turismoavatar.cl').replace(/\/$/, '');
const MEDIA = 'src/assets/media';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const exists = (p) => stat(p).then(() => true, () => false);

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

const wanted = new Map(); // key destino → [urls candidatas]
const add = (key, ...urls) => {
  const list = wanted.get(key) ?? [];
  for (const u of urls) if (!list.includes(u)) list.push(u);
  wanted.set(key, list);
};
const up = (k) => `${ORIGIN}/wp-content/uploads/${k.split('/').map(encodeURIComponent).join('/')}`;

const assets = JSON.parse(await readFile('migration/original/assets.json', 'utf8').catch(() => '[]'));
for (const a of assets) if (!a.file && /^\d{4}\//.test(a.key)) add(a.key, up(a.key), a.url);

for (const f of [...(await walk('src/content')), ...(await walk('src/data'))]) {
  const txt = await readFile(f, 'utf8');
  for (const m of txt.matchAll(/\b(\d{4}\/\d{2}\/[\w.\-%]+?\.(?:jpe?g|png|webp))\b/gi)) {
    if (!(await exists(join(MEDIA, m[1])))) add(m[1], up(m[1]));
  }
}
// Originales grandes de las miniaturas 2025/08 (p. ej. CabalgataHualpen-600x338-1.webp → 2024/10/CabalgataHualpen-scaled.jpg)
const bigGuesses = {
  '2024/10/CabalgataHualpen-scaled.jpg': [],
  '2024/10/tunel-penco.jpg': [],
  '2024/10/casa-poli-e1732202603523.jpg': ['2024/10/casa-poli.jpg'],
  '2024/11/CCP-teatro-1.jpg': [],
  '2024/10/Penco.jpg': ['2024/11/Penco.jpg', '2024/10/Penco-scaled.jpg'],
  '2024/10/tour.jpg': ['2024/11/tour.jpg', '2024/10/tour-scaled.jpg'],
  '2024/10/IMG_20231204_121219.jpg': [],
  '2024/10/GOPR5827-scaled-e1747705915168.jpg': ['2025/05/GOPR5827-scaled-e1747705915168.jpg', '2024/11/GOPR5827-scaled.jpg', '2024/10/GOPR5827-scaled.jpg'],
  '2024/10/LOGO.png': [],
};
for (const [k, alts] of Object.entries(bigGuesses)) if (!(await exists(join(MEDIA, k)))) add(k, up(k), ...alts.map(up));

console.log(`Faltan ${wanted.size} imágenes`);
const browser = await chromium.launch();
const ctx = await browser.newContext({ userAgent: UA, extraHTTPHeaders: { referer: `${ORIGIN}/`, 'accept-language': 'es-CL,es;q=0.9' } });
// Visitamos la portada primero para obtener cookies del sitio
const page = await ctx.newPage();
await page.goto(`${ORIGIN}/`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});

const report = [];
for (const [key, urls] of wanted) {
  let saved = null;
  for (const u of urls) {
    const r = await ctx.request.get(u, { timeout: 90000, headers: { accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8', referer: `${ORIGIN}/galeria/` } }).catch(() => null);
    if (!r || !r.ok()) continue;
    const type = r.headers()['content-type'] ?? '';
    if (!type.startsWith('image/')) continue;
    const buf = Buffer.from(await r.body());
    try {
      const img = sharp(buf, { failOn: 'none' }).rotate();
      const m = await img.metadata();
      const out = m.width > 2400 ? await img.resize({ width: 2400 }).toBuffer() : buf;
      const dest = join(MEDIA, key);
      await mkdir(dirname(dest), { recursive: true });
      await writeFile(dest, out);
      saved = { key, from: u, width: m.width, height: m.height };
      break;
    } catch {}
  }
  report.push(saved ?? { key, error: 'no disponible', tried: urls });
  console.log(saved ? `  ✓ ${key} (${saved.width}×${saved.height})` : `  ✗ ${key}`);
}
await browser.close();
await writeFile('migration/original/faltantes.json', JSON.stringify(report, null, 2));
