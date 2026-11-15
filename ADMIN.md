# Panel de administración (`/admin`)

El dueño de Turismo Avatar administra el sitio desde **https://www.turismoavatar.cl/admin**:

| Sección | Qué hace |
|---|---|
| **Resumen** | Reservas por confirmar, próximas salidas, conversaciones del mes y accesos rápidos. |
| **Reservas** | Filtros por estado, tipo, fecha y búsqueda. Cambiar estado (pendiente → confirmada → pagada / cancelada), notas internas, WhatsApp y correo al cliente con el mensaje listo, y descarga a Excel (CSV). |
| **Conversaciones Cami** | Cada conversación completa con el asistente, de qué página vino, si pidió WhatsApp o una persona, y las preguntas que más se repiten. |
| **Mensajes** | Formularios de contacto, empresas y proveedores + suscriptores del newsletter (descarga CSV). |
| **Editar home** | Editor visual tipo Elementor: arrastrar secciones, duplicar, ocultar, reordenar, editar textos directamente sobre la página, cambiar fotos y video de portada, vista celular / tablet / computador, guardado automático de borrador, historial de versiones y botón **Publicar**. |
| **Experiencias y alojamientos** | Crear, editar y eliminar fichas: precios, fotos, galería, itinerario, incluye, destinos, destacada en el home. |
| **Fotos y videos** | Biblioteca. Las fotos se convierten a WebP en varios tamaños en el navegador antes de subir (el sitio sigue rápido). |

## Cómo funciona

- **Publicar** guarda el contenido en este repositorio (commit en `main`). Cloudflare Pages lo detecta y reconstruye el sitio estático en 1 a 3 minutos. El sitio sigue 100 % estático (PageSpeed alto) y cada publicación queda en el historial (se puede restaurar desde el editor).
  - Home: `src/content/pages/home.json`
  - Fichas: `src/content/experiencias/*.md` y `src/content/alojamientos/*.md`
- **Borradores** del editor: tabla `cms_drafts` de D1 (no se ven en el sitio hasta publicar).
- **Fotos/videos subidos**: bucket R2 `turismoavatar-media`, servidos en `/cms-media/…` con caché de 1 año.
- **Reservas, mensajes y conversaciones**: base D1 `turismoavatar`.

> Como el panel hace commits en `main`, antes de trabajar en el código haz `git pull`.

## Configuración (una sola vez)

**Rápido, con wrangler:** crea D1 y R2, aplica las tablas, activa los bindings en `wrangler.toml` y pide los secretos:
```bash
npx wrangler login
bash scripts/setup-admin.sh
git add wrangler.toml && git commit -m "Panel: D1 y R2" && git push
```
Antes del script crea la aplicación de Cloudflare Access (paso 3) para tener a mano el dominio del equipo y el AUD, y el token de GitHub (paso 4).
Los secretos también se pueden cargar uno por uno:
```bash
npx wrangler pages secret put CF_ACCESS_TEAM_DOMAIN --project-name turismoavatar
npx wrangler pages secret put CF_ACCESS_AUD --project-name turismoavatar
npx wrangler pages secret put GITHUB_TOKEN --project-name turismoavatar
npx wrangler pages secret put ADMIN_PASSWORD --project-name turismoavatar   # opcional, respaldo
```
`GITHUB_REPO` y `GITHUB_BRANCH` ya están en `[vars]` de `wrangler.toml`.

Paso a paso manual:

### 1. Base de datos D1
```bash
npx wrangler d1 create turismoavatar        # copia el database_id
```
Descomenta el bloque `[[d1_databases]]` de `wrangler.toml`, pega el id y crea las tablas:
```bash
npm run db:init
# Si la base ya existía antes del panel:
npx wrangler d1 execute turismoavatar --remote --file=db/migrations/0002_panel.sql
```

### 2. Almacenamiento R2 (fotos y videos)
```bash
npx wrangler r2 bucket create turismoavatar-media
```
Descomenta el bloque `[[r2_buckets]]` de `wrangler.toml`.

### 3. Login con código al correo (Cloudflare Access, gratis hasta 50 usuarios)
1. Cloudflare → **Zero Trust** → *Settings → Authentication*: activa **One-time PIN**.
2. *Access → Applications → Add an application → Self-hosted*:
   - Dominio `www.turismoavatar.cl`, rutas `admin` y `api/admin` (agrega también `turismoavatar.pages.dev` con las mismas rutas).
   - Política **Allow** → *Emails*: los correos del dueño y su equipo.
3. Copia el **Application Audience (AUD) Tag** y el dominio del equipo (`<equipo>.cloudflareaccess.com`).
4. En Pages → *Settings → Variables and secrets* (Producción):
   - `CF_ACCESS_TEAM_DOMAIN` = `<equipo>.cloudflareaccess.com`
   - `CF_ACCESS_AUD` = el AUD tag

Las funciones verifican la firma del token de Access en cada petición: aunque alguien entre por otra URL, sin token válido no ve nada.
Mientras Access no esté configurado se puede usar el respaldo `ADMIN_PASSWORD` (usuario `admin`).

### 4. Publicación (token de GitHub)
GitHub → *Settings → Developer settings → Fine-grained tokens → Generate new token*:
- Repository access: **solo** `gbrss/turismoavatar`
- Permisos: **Contents: Read and write**, **Checks: Read**, **Commit statuses: Read**

Guárdalo como secreto `GITHUB_TOKEN` en Pages (opcionales: `GITHUB_REPO`, `GITHUB_BRANCH`).
El proyecto de Pages debe estar conectado al repositorio de GitHub (despliegue automático en `main`).

### 5. Activar la caché de build (recomendado)
Pages → *Settings → Build → Build cache → Enable*. Guarda `node_modules/.astro` (las fotos ya optimizadas):
sin caché un build tarda ~5 min; con caché, publicar desde el panel toma 1 a 3 minutos.

### 6. Volver a desplegar
Después de agregar bindings y secretos, haz un nuevo deploy (o un commit) para que tomen efecto.

## Desarrollo local
```bash
npm run build
npx wrangler d1 execute turismoavatar --local --file=db/schema.sql
echo "ADMIN_PASSWORD=test123" > .dev.vars
npx wrangler pages dev ./dist      # http://localhost:8788/admin  (admin / test123)
```

## Agregar un bloque nuevo al editor
1. Crea el componente React en `src/blocks/` (usa `Img`, `useSite`, clases Tailwind del sitio).
2. Regístralo en `src/blocks/registry.tsx` (render del sitio) y en `src/admin/puck-config.tsx` (campos en español y valores iniciales).
El mismo componente se usa para el editor y para generar el HTML estático: lo que se ve en el editor es lo que se publica.
