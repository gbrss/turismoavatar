#!/usr/bin/env node
// Extrae el "Generador de Programas Turísticos" de www.turismoavatar.cl/programas:
// HTML renderizado, scripts (inline y externos que lo mencionan) y el resultado de TODAS las
// combinaciones perfil × origen × duración (texto del programa + mensaje de WhatsApp).
// Salida: migration/original/programas/
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const URL_PAGE = process.env.URL_PAGE ?? 'https://www.turismoavatar.cl/programas/';
const OUT = 'migration/original/programas';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const PERFILES = ['Aventurero', 'Familia', 'Romántico', 'Cultural', 'Enoturismo', 'Turismo Indígena'];
const ORIGENES = ['Chile', 'Latinoamérica', 'Europa', 'Corporativo', 'Estudiantes'];
const DURACIONES = ['Medio día', '1 día completo', '2 días'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await mkdir(OUT, { recursive: true });
const log = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1280, height: 900 }, locale: 'es-CL' });
const page = await ctx.newPage();
const scripts = [];
page.on('response', async (r) => {
  try {
    const u = r.url();
    if (r.request().resourceType() === 'script' || /\.js(\?|$)/.test(u)) {
      const body = await r.text();
      scripts.push({ url: u, size: body.length, body });
    }
  } catch {}
});
// Captura window.open (botón "Enviar a WhatsApp")
await page.addInitScript(() => {
  window.__opened = [];
  const o = window.open;
  window.open = (u, ...a) => {
    window.__opened.push(String(u));
    return null;
  };
});

await page.goto(URL_PAGE, { waitUntil: 'networkidle', timeout: 90000 }).catch((e) => log.push('goto: ' + e.message));
await sleep(3000);
await writeFile(`${OUT}/rendered.html`, await page.content());
await page.screenshot({ path: `${OUT}/paso1.jpg`, fullPage: true, quality: 70, type: 'jpeg' });

// Frame que contiene el generador (puede ser un iframe)
const frames = page.frames();
let frame = page.mainFrame();
for (const f of frames) {
  const has = await f.evaluate(() => document.body?.innerText?.includes('Perfil del turista')).catch(() => false);
  if (has) frame = f;
}
log.push(`frames: ${frames.map((f) => f.url()).join(' | ')} → usando ${frame.url()}`);
if (frame !== page.mainFrame()) await writeFile(`${OUT}/iframe.html`, await frame.content());

// Scripts inline y externos que contienen la lógica
const inline = await frame.evaluate(() => [...document.scripts].map((s) => ({ src: s.src, text: s.src ? '' : s.textContent })));
await writeFile(`${OUT}/inline-scripts.json`, JSON.stringify(inline, null, 1));
const relevantes = scripts.filter((s) => /Aventurero|Enoturismo|lafkenche|Perfil del turista|SERNATUR/i.test(s.body));
for (const [i, s] of relevantes.entries()) await writeFile(`${OUT}/script-${i}.js`, `// ${s.url}\n${s.body}`);
log.push(`scripts cargados: ${scripts.length}, relevantes: ${relevantes.map((s) => s.url).join(', ')}`);
const inlineRel = inline.filter((s) => /Aventurero|Enoturismo|lafkenche/i.test(s.text));
for (const [i, s] of inlineRel.entries()) await writeFile(`${OUT}/inline-${i}.js`, s.text);

// Variables globales nuevas (datos del generador)
const globals = await frame.evaluate(() => {
  const base = new Set(Object.getOwnPropertyNames(document.createElement('iframe').contentWindow ?? {}));
  const out = {};
  for (const k of Object.getOwnPropertyNames(window)) {
    if (base.has(k) || k.startsWith('__') || /^(jQuery|wp|webpack)/.test(k)) continue;
    try {
      const v = window[k];
      if (v && typeof v === 'object' && !(v instanceof Node)) {
        const s = JSON.stringify(v);
        if (s && s.length < 400000 && /Aventurero|Enoturismo|Familia|itinerar|program/i.test(s)) out[k] = v;
      }
    } catch {}
  }
  return out;
});
await writeFile(`${OUT}/globals.json`, JSON.stringify(globals, null, 1));

// Recorre todas las combinaciones
const clickText = async (text) => {
  const loc = frame.getByText(text, { exact: false });
  const n = await loc.count();
  for (let i = 0; i < n; i++) {
    const el = loc.nth(i);
    if (await el.isVisible().catch(() => false)) {
      await el.click({ timeout: 5000 }).catch(() => {});
      await sleep(700);
      return true;
    }
  }
  return false;
};
const reset = async () => {
  if (!(await clickText('Nuevo'))) {
    await page.goto(URL_PAGE, { waitUntil: 'networkidle' }).catch(() => {});
    await sleep(1500);
  }
};
const text = () => frame.evaluate(() => document.body.innerText);
const resultados = [];
let first = true;
for (const p of PERFILES) {
  for (const o of ORIGENES) {
    for (const d of DURACIONES) {
      await page.goto(URL_PAGE, { waitUntil: 'networkidle' }).catch(() => {});
      await sleep(1200);
      for (const f of page.frames()) if (await f.evaluate(() => document.body?.innerText?.includes('Perfil del turista')).catch(() => false)) frame = f;
      const pasos = [await clickText(p), await clickText(o), await clickText(d)];
      await sleep(1200);
      const t = await text();
      const links = await frame.evaluate(() => [...document.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp"]')].map((a) => a.href));
      await frame.evaluate(() => (window.__opened = [])).catch(() => {});
      await clickText('Enviar a WhatsApp');
      const opened = await frame.evaluate(() => window.__opened ?? []).catch(() => []);
      const html = await frame.evaluate(() => {
        const el = [...document.querySelectorAll('section, div, article')].filter((x) => /Enviar a WhatsApp/.test(x.innerText)).sort((a, b) => a.innerText.length - b.innerText.length)[0];
        return el?.parentElement?.outerHTML ?? '';
      });
      if (first) {
        await page.screenshot({ path: `${OUT}/resultado-ejemplo.jpg`, fullPage: true, quality: 70, type: 'jpeg' });
        await writeFile(`${OUT}/resultado-ejemplo.html`, html);
        first = false;
      }
      resultados.push({ perfil: p, origen: o, duracion: d, clics: pasos, texto: t.slice(0, 20000), whatsapp: [...links, ...opened] });
      console.log(p, o, d, pasos);
    }
  }
}
await writeFile(`${OUT}/combinaciones.json`, JSON.stringify(resultados, null, 1));
await writeFile(`${OUT}/log.txt`, log.join('\n'));
await browser.close();
