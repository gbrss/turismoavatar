# Turismo Avatar — turismoavatar.cl

Migración del sitio WordPress de **Turismo Avatar** (tour operador en Concepción, Región del Biobío) a **Astro 7**, optimizado para **Cloudflare Pages**.

- Sitio 100 % estático (HTML + CSS, JS mínimo por componente), imágenes AVIF/WebP con `srcset`.
- Reservas, contacto, newsletter, chatbot y panel de administración con **Cloudflare Pages Functions** (`/functions`).
- SEO: sitemap, `robots.txt`, canonical, Open Graph, schema.org (`TravelAgency`, `TouristTrip`, `Accommodation`, `TouristDestination`, `FAQPage`, `BreadcrumbList`) y redirecciones 301 desde las URLs de WordPress.

## Qué incluye

| Sección | Ruta | Notas |
|---|---|---|
| Inicio | `/` | Portada, destacadas, mapa de destinos, alojamientos, programas, galería, B2B, FAQ |
| Experiencias | `/experiencias`, `/experiencias/[slug]` | Filtros por tipo y comuna, recorrido, incluye/qué llevar, formulario de reserva |
| Alojamientos | `/alojamientos`, `/alojamientos/[slug]` | Precio por noche, total estimado y aviso de fechas ocupadas |
| Programas | `/programas` | Itinerarios de 1 a 3 días (ex "Itinerario") |
| Destinos | `/destinos`, `/destinos/[slug]` | 11 comunas, landing SEO "Qué hacer en …" |
| Galería | `/galeria` | Filtros + lightbox accesible (teclado y swipe) |
| Reservas | `/reservas?item=experiencia:sup-penco&fecha=2026-12-01` | Preselección por URL (útil para links desde Instagram) |
| Empresas | `/empresas` | Cotización de grupos, colegios y team building |
| Proveedores | `/publica-tu-experiencia` | Postulación de emprendedores turísticos |
| Chatbot | widget en todas las páginas | Workers AI con el catálogo; respuestas por reglas si la IA no está disponible |
| Panel | `/admin/reservas` | Reservas (cambiar estado, exportar CSV), leads y preguntas del chatbot |

## Editar contenido

- **Experiencias**: `src/content/experiencias/*.md` (un archivo por experiencia; `priceFrom` opcional — sin precio se muestra "Precio a consultar").
- **Alojamientos**: `src/content/alojamientos/*.md`
- **Programas**: `src/content/programas/*.md`
- **Datos del negocio** (teléfono, redes, misión…): `src/data/site.ts`
- **Destinos**, **galería**, **preguntas frecuentes**: `src/data/*.ts`
- **Imágenes**: `src/assets/media/AAAA/MM/archivo.jpg` (misma ruta que en `wp-content/uploads`). Mientras una imagen no exista se muestra un fondo de marca.

El chatbot lee `/catalogo.json`, que se genera en cada build: al editar el contenido el bot se actualiza solo.

## Migrar imágenes y contenido del WordPress

`scripts/export-wp.mjs` descarga las imágenes usadas por el sitio y exporta páginas, productos WooCommerce y alojamientos a `migration/wp-export/` (con un `RESUMEN.md`).

**Recomendado — desde tu computador** (el hosting actual bloquea a los servidores de GitHub):

```bash
npm install
npm run wp:export                 # ALL_MEDIA=1 npm run wp:export para toda la biblioteca
git add src/assets/media migration && git commit -m "Migrar imágenes WordPress" && git push
```

También existe la GitHub Action **Migrar WordPress** (*Actions → Run workflow*), útil si el hosting deja de bloquear.

> ⚠️ Ejecútala **antes** de apuntar el dominio a Cloudflare Pages, mientras el WordPress siga en línea.

## Desplegar en Cloudflare Pages

1. **Workers & Pages → Create → Pages → Connect to Git** → `gbrss/turismoavatar`.
   - Framework: Astro · Build: `npm run build` · Output: `dist`
   - Variable de entorno: `NODE_VERSION = 22`
2. **Secrets** (Settings → Variables and Secrets):
   - `RESEND_API_KEY` — emails de reservas ([resend.com](https://resend.com), verificar el dominio `turismoavatar.cl`)
   - `ADMIN_PASSWORD` — acceso a `/admin/reservas` (usuario `admin`)
   - Opcional antispam: `TURNSTILE_SECRET` + variable de build `PUBLIC_TURNSTILE_SITEKEY`
3. **Base de datos D1** (recomendado):
   ```bash
   npx wrangler d1 create turismoavatar   # copia el database_id en wrangler.toml y descomenta el bloque
   npm run db:init
   ```
4. **Workers AI** ya está declarado en `wrangler.toml` (binding `AI`). Modelo configurable con la variable `AI_MODEL`.
5. **Dominio**: agrega `www.turismoavatar.cl` y `turismoavatar.cl` como Custom domains. Para redirigir el dominio sin `www` usa una *Bulk Redirect* (`turismoavatar.cl/*` → `https://www.turismoavatar.cl/$1`).

Las redirecciones de URLs antiguas están en `public/_redirects`. Tras la exportación, revisa `migration/wp-export/RESUMEN.md` y agrega redirecciones específicas para productos si hace falta.

## Desarrollo

```bash
npm install
npm run dev        # sitio en http://localhost:4321 (sin Functions)
npm run build
npm run preview    # sitio + Functions con wrangler (copiar .dev.vars.example → .dev.vars)
npm run check      # tipos
```

## Pendiente de validar con el cliente

- Precios, horarios y puntos de encuentro de cada experiencia (el WordPress no los publicaba; se muestran como "a consultar").
- Asignación foto ↔ alojamiento (se tomó el orden del sitio anterior).
- Reseñas reales de clientes (Google / Instagram) para agregar prueba social.
- Pago en línea (Webpay / Mercado Pago / Flow): el flujo actual es solicitud → confirmación → pago.
