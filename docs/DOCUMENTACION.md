# Turismo Avatar — Documentación del sitio

Documentación completa de **turismoavatar.cl**: qué hace cada parte del sitio y del panel, cómo está construido y cómo se opera. Complementa a [README.md](../README.md) (puesta en marcha y migración) y [ADMIN.md](../ADMIN.md) (configuración paso a paso del panel).

Última actualización: 16 de noviembre de 2026.

## Contenido

1. [Visión general](#1-visión-general)
2. [Arquitectura](#2-arquitectura)
3. [Estructura del repositorio](#3-estructura-del-repositorio)
4. [El sitio público](#4-el-sitio-público)
5. [Reservas](#5-reservas)
6. [Formularios](#6-formularios)
7. [Cami, el chatbot, y la atención en vivo](#7-cami-el-chatbot-y-la-atención-en-vivo)
8. [Panel de administración](#8-panel-de-administración)
9. [Editor visual del home](#9-editor-visual-del-home)
10. [Cómo se publica un cambio](#10-cómo-se-publica-un-cambio)
11. [Base de datos (D1)](#11-base-de-datos-d1)
12. [Referencia de la API](#12-referencia-de-la-api)
13. [Seguridad](#13-seguridad)
14. [SEO y rendimiento](#14-seo-y-rendimiento)
15. [Configuración y despliegue](#15-configuración-y-despliegue)
16. [Tareas frecuentes](#16-tareas-frecuentes)
17. [Limitaciones conocidas y pendientes](#17-limitaciones-conocidas-y-pendientes)

---

## 1. Visión general

Turismo Avatar es un tour operador de Concepción (Región del Biobío, Chile) que vende experiencias (SUP, trekking, city tours), alojamientos, programas de varios días, vacaciones para la tercera edad (Sernatur) y paquetes del Rally WRC. El sitio reemplaza al WordPress anterior.

Lo que ofrece:

- **Sitio público** rápido y estático, con catálogo, destinos, galería y SEO.
- **Reservas** por solicitud (el cliente envía la solicitud; el equipo confirma y cobra aparte).
- **Cami**, asistente de chat con IA, con derivación a WhatsApp y **atención humana en vivo** desde el panel.
- **Panel de administración** (`/admin`) con reservas, conversaciones, mensajes, editor visual del home, fichas y biblioteca de fotos y videos.

## 2. Arquitectura

| Capa | Tecnología | Para qué |
|---|---|---|
| Sitio | **Astro 7** (estático) + Tailwind CSS 4 | Páginas HTML pre-generadas; JavaScript solo donde hace falta |
| Panel y editor | **React 19** + **Puck** (editor visual), cargados solo en `/admin` | Administración |
| Servidor | **Cloudflare Pages Functions** (`/functions`) | API de reservas, formularios, chat y panel |
| Base de datos | **Cloudflare D1** (`turismoavatar`) | Reservas, mensajes, conversaciones, borradores, auditoría |
| Archivos | **Cloudflare R2** (`turismoavatar-media`) | Fotos y videos subidos desde el panel |
| IA | **Workers AI** (binding `AI`) | Respuestas de Cami |
| Correo | **Resend** | Avisos de reservas y mensajes |
| Acceso al panel | **Cloudflare Access** (código al correo) o contraseña de respaldo | Login |
| Contenido | Archivos del repositorio (`src/content`) | Fichas y home; el panel publica haciendo commits en GitHub |
| Despliegue | **Cloudflare Pages** conectado a `gbrss/turismoavatar` (rama `main`) | Cada commit reconstruye el sitio |

Idea central: **el sitio es estático** (rápido y barato) y lo dinámico vive en funciones. Editar contenido desde el panel crea un commit en GitHub y Pages reconstruye el sitio en 1 a 3 minutos.

```
Cliente ──► Cloudflare Pages (HTML estático + imágenes AVIF/WebP)
               │
               ├─ /api/*   Functions ──► D1 (reservas, mensajes, chats)
               │                    └─► Workers AI (Cami) · Resend (correos)
               ├─ /cms-media/*  ──────► R2 (fotos y videos del panel)
               └─ /admin   (React + Puck) ──► /api/admin/* ──► D1 · R2 · GitHub (commits)
```

## 3. Estructura del repositorio

```
src/
  pages/            Rutas del sitio (una .astro por página) + /admin
  components/       Header, Footer, BookingWizard, ChatWidget, Gallery, etc.
  blocks/           Bloques del home (los usa el sitio y el editor)
  admin/            Panel React: App, Bookings, Chats, Leads, Fichas, Media, HomeEditor, StatusBar, puck-config
  content/          Contenido editable: experiencias, alojamientos, programas (.md) y pages/home.json
  data/             Datos del negocio: site.ts, destinos, faq, galería, rally, tienda, tercera-edad, generador
  assets/           Imágenes (se optimizan al compilar)
  layouts/Base.astro  Estructura común, SEO, schema.org
  styles/global.css   Tema (colores, tipografías), animaciones y modo oscuro del panel
functions/
  api/              reservas, contacto, newsletter, disponibilidad, chat, chat-poll
  api/admin/        bookings, chats, chat-live, leads, media, drafts, history, publish, pulse, me
  admin/_middleware.ts   Protege /admin
  admin-salir.ts    Cierre de sesión con contraseña
  cms-media/        Sirve las fotos y videos de R2
server/             lib.ts (utilidades, correo, antispam), admin.ts (login, GitHub), content.ts
db/                 schema.sql y migrations/
public/             _redirects, _headers, robots.txt, iconos, /media
scripts/            Extracción y migración desde WordPress, setup-admin.sh
```

## 4. El sitio público

### 4.1 Páginas

| Página | Ruta | Qué hace |
|---|---|---|
| Inicio | `/` | Secciones definidas en `home.json` (ver [sección 9](#9-editor-visual-del-home)) |
| Experiencias | `/experiencias`, `/experiencias/[slug]` | Listado con filtros por tipo y comuna; ficha con recorrido, qué incluye, qué llevar, galería y formulario de reserva |
| Alojamientos | `/alojamientos`, `/alojamientos/[slug]` | Precio por noche, total estimado y aviso de fechas ocupadas |
| Programas | `/programas` | Programas de varios días, **Generador de programas turísticos** y Vacaciones Tercera Edad |
| Tercera edad | `/tercera-edad` | Programa Sernatur Escapadas 2026: 4 destinos, qué incluye y qué no, quiénes pueden participar, documentos, cancelaciones, preguntas y formulario de reserva |
| Destinos | `/destinos`, `/destinos/[slug]` | 11 comunas, cada una con landing "Qué hacer en …" |
| Rally WRC | `/rally-wrc` | Paquetes de referencia y lista de espera |
| Tienda | `/tienda` | Productos; la compra se hace por WhatsApp |
| Galería | `/galeria` | Videos (cargan a pedido) y fotos con filtros y visor con teclado y gestos |
| Reservas | `/reservas` | Asistente de reserva en 3 pasos |
| Empresas | `/empresas` | Cotización de grupos, colegios y team building |
| Publica tu experiencia | `/publica-tu-experiencia` | Postulación de proveedores |
| Quiénes somos, Contacto, Preguntas frecuentes, Políticas | `/quienes-somos`, `/contacto`, `/preguntas-frecuentes`, `/politicas` | Páginas informativas |
| Sesión cerrada | `/sesion-cerrada` | Se muestra al cerrar sesión del panel con contraseña |
| 404 | — | Página de error |
| Catálogo | `/catalogo.json` | Se genera en cada build; lo usan Cami y las reservas para conocer el catálogo |

### 4.2 Menú y pie de página

El menú (`nav` en `src/data/site.ts`) tiene: Experiencias, Alojamientos, Programas, Tercera edad, Destinos, Tienda, Galería, Nosotros y Contacto. **El menú sigue lo que se muestra en el home**: si una sección del home se oculta, su enlace desaparece del menú de arriba, del menú del celular, del pie de página y de la barra de categorías de la portada.

| Sección del home | Enlace que se oculta con ella |
|---|---|
| Experiencias | Experiencias |
| Alojamientos | Alojamientos |
| Escapadas Tercera Edad | Tercera edad |
| Mapa de destinos | Destinos |
| Videos y galería | Galería |
| Por qué elegirnos | Nosotros |
| Tarjetas de llamado (Cta) | Contacto |

Las páginas siguen existiendo; solo se quitan los enlaces. Programas y Tienda no tienen sección en el home, así que siempre se muestran. La lista está en `MENU_DE_SECCION` (`src/data/site.ts`).

### 4.3 Portada y barra de categorías

La portada admite foto o video de fondo (sin audio), una tarjeta con la experiencia destacada y botones. La **barra de categorías** (City tours, Trekking, Náuticas, Aventura, Patrimonio, Alojamientos, Tercera edad, Rally WRC, Tienda) se muestra en varias líneas, sin recortes, y cada categoría se puede ocultar desde el editor (campo *Categorías de la barra* en la Portada).

### 4.4 Sección "Vacaciones Tercera Edad / Escapadas 2026"

Bloque del home con un banner animado (rayos de sol, destello y título con destellos), cuatro tarjetas flotantes (Angostura del Biobío, Cañete–Lago Lanalhue, Lonquimay, Valle Las Trancas) y botón de reserva. Las tarjetas y el botón llevan a `/tercera-edad?destino=<id>#reservar`, donde el formulario ya viene con el destino elegido. Respeta `prefers-reduced-motion` (sin animaciones).

### 4.5 Generador de programas turísticos

En `/programas`. El visitante elige perfil (aventurero, familia, romántico, cultural, enoturismo, indígena), origen y duración; el sitio arma un itinerario con narrativa, momento cumbre, episodios por hora, precio sugerido y factor WOW, con envío por WhatsApp. Datos en `src/data/generador.ts`.

### 4.6 Galería

Videos del canal (se cargan solo al tocarlos) y fotos con filtros y visor a pantalla completa. Lógica en `src/scripts/gallery.ts`.

### 4.7 Mapa de destinos

Mapa interactivo de las comunas donde opera (`src/scripts/map.ts`, `src/components/DestinosMap.astro`).

## 5. Reservas

### 5.1 Flujo del cliente

1. **Elige** qué reservar: experiencia, alojamiento, programa, tercera edad o cotización a medida.
2. **Fecha y personas**: calendario con rangos (para alojamientos) y fechas ocupadas; total estimado en vivo.
3. **Datos**: nombre, correo, teléfono, preferencia de contacto y comentarios.

Al enviar, el cliente recibe un **código** (formato `TA-…`), un enlace a WhatsApp y un archivo de calendario `.ics`. La reserva se puede preseleccionar por URL, por ejemplo `/reservas?item=experiencia:sup-dichato&fecha=2026-12-01&personas=2`.

**No se cobra al enviar.** El equipo confirma disponibilidad y coordina el pago (transferencia u otro medio), normalmente el mismo día.

### 5.2 Qué pasa en el servidor (`POST /api/reservas`)

- Antispam: honeypot, límite de 8 solicitudes cada 10 minutos por IP y Turnstile opcional.
- Valida nombre, correo, teléfono, fecha no pasada y que el ítem exista en el catálogo.
- Calcula el total estimado cuando hay precio publicado.
- Guarda en la tabla `bookings` (estados: `pendiente`, `confirmada`, `pagada`, `cancelada`).
- Envía correo al equipo y confirmación al cliente (Resend).

### 5.3 Disponibilidad

`GET /api/disponibilidad?item=<alojamiento>` devuelve los rangos de fechas ocupados (reservas `confirmada` o `pagada`) para avisar en el calendario.

## 6. Formularios

| Formulario | Dónde | Dónde queda |
|---|---|---|
| Contacto | `/contacto` | `leads` (tipo `contacto`) + correo |
| Cotización de empresa o grupo | `/empresas` | `leads` (tipo `empresa`) + correo |
| Postulación de proveedor | `/publica-tu-experiencia` | `leads` (tipo `proveedor`) + correo |
| Lista de espera Rally | `/rally-wrc` | `leads` (tipo `rally`) + correo |
| Newsletter | Pie de página | `subscribers` |

Todos tienen honeypot y límite de envíos por IP.

## 7. Cami, el chatbot, y la atención en vivo

### 7.1 Cami

Widget flotante en todas las páginas: globo animado que invita a conversar, panel tipo hoja inferior en el celular y ventana flotante en escritorio, sugerencias rápidas (¿Qué tours tienen?, Precios, Alojamientos, Quiero hacer SUP, Hablar con una persona, Viajes tercera edad) y botón de WhatsApp.

- **Cerebro**: Workers AI con el catálogo completo (experiencias, alojamientos, programas, rally, tienda, preguntas frecuentes). Responde en español de Chile, breve, sin inventar precios ni disponibilidad.
- **Respaldo**: si la IA falla, responde con reglas (palabras clave) usando el mismo catálogo.
- **Honestidad**: si preguntan en serio si es una persona, responde que es una asistente virtual.
- **Derivación**: ante "quiero hablar con una persona" (y similares) o cuando sugiere WhatsApp, muestra un botón de WhatsApp con la consulta ya escrita. Esas conversaciones quedan marcadas como derivadas.
- **Registro**: cada pregunta y respuesta se guarda en `chat_logs`, agrupada por una sesión anónima (sin nombres ni teléfonos).
- Límite: 40 mensajes cada 10 minutos por IP.

### 7.2 Atención en vivo (tomar una conversación)

Una persona del equipo puede tomar una conversación y responder al cliente directamente:

1. En el panel, **Conversaciones Cami** → abrir la conversación → **Tomar conversación** (la primera vez pide el nombre con que verá el cliente).
2. Cami deja de responder. Los mensajes del cliente se guardan, se marcan como derivados y avisan en el panel con sonido.
3. El equipo escribe en la caja (Enter envía, Shift+Enter salto de línea). El cliente ve sus mensajes en verde con el nombre y "equipo Turismo Avatar", y el encabezado dice "Te atiende …".
4. **Devolver a Cami** reactiva a Cami. Si pasan **20 minutos** sin que el agente escriba, Cami retoma sola.
5. **Cambiar nombre** permite corregir el nombre del agente (también durante la atención).

Detalles técnicos: el chat del sitio consulta `GET /api/chat-poll` cada 5 segundos mientras está abierto (menos seguido tras 2 minutos sin actividad). Solo una persona puede atender una conversación a la vez. Las conversaciones anteriores a esta función (sin sesión) no se pueden tomar. Tablas: `chat_takeovers` y `chat_staff_msgs`.

## 8. Panel de administración

Entrada: `https://www.turismoavatar.cl/admin`. Acceso con código al correo (Cloudflare Access) o, mientras no esté configurado, usuario `admin` + contraseña de respaldo.

### 8.1 Barra de estado

Barra horizontal fija arriba de cada sección con: título de la sección, indicador **En vivo / Conectando / Sin conexión** (toca para actualizar), **fecha y hora en tiempo real**, botón de **tema claro/oscuro** (se recuerda en el navegador; usa el tema del sistema la primera vez) y **Cerrar sesión**. Con Cloudflare Access cierra la sesión de verdad; con contraseña, borra las credenciales guardadas y muestra la página "Cerraste la sesión". En el celular los botones se muestran solo con íconos.

### 8.2 Tiempo real

El panel consulta `/api/admin/pulse` cada pocos segundos (consultas livianas) y solo recarga lo que cambió. Cuando llega una reserva o un mensaje de chat nuevo suena un aviso y aparece una notificación.

### 8.3 Resumen

Reservas por confirmar, próximas salidas confirmadas, solicitudes de los últimos 30 días, conversaciones con Cami, valor estimado de las reservas confirmadas y pagadas, y la lista "Por confirmar" con acciones rápidas. Muestra avisos si falta configurar algo (por ejemplo el token de GitHub).

### 8.4 Reservas

- Filtros por estado, tipo, fecha y búsqueda; descarga a Excel (CSV).
- **Cambiar estado**: pendiente → confirmada → pagada / cancelada.
- **Notas internas** (solo las ve el equipo).
- **WhatsApp y correo** al cliente con el mensaje listo.
- **Editar**: nombre, correo, teléfono, ítem, fechas, personas, total y notas; valida que la fecha final no sea anterior a la inicial.
- **Eliminar**: con confirmación en la misma tarjeta; guarda una copia de los datos en el registro de auditoría.

### 8.5 Conversaciones Cami

Lista de conversaciones por sesión (con país, página de origen y si pidió WhatsApp o una persona), buscador, filtro "Solo derivadas", período (7 días a 1 año), conversación completa y ranking de las **preguntas más repetidas**. Desde aquí se atiende en vivo (ver 7.2).

### 8.6 Mensajes

Formularios de contacto, empresas, proveedores y lista de espera del Rally, con estado (nuevo, respondido, archivado), más los suscriptores del newsletter (descarga CSV).

### 8.7 Editar home

Editor visual (sección 9).

### 8.8 Experiencias y alojamientos (fichas)

Crear, editar y eliminar fichas: precios, fotos, galería, itinerario, qué incluye, destinos y si va destacada en el home. Cada cambio se publica como commit (sección 10).

### 8.9 Fotos y videos

Biblioteca de medios. Las fotos se convierten a WebP en varios anchos (480, 960, 1440, 1920 y 2400 px) en el navegador antes de subir; los videos se suben tal cual. Se guardan en R2 y se sirven desde `/cms-media/…` con caché.

### 8.10 Registro de auditoría

Las acciones sensibles (editar o eliminar reservas, cambiar estados, publicar, tomar o soltar conversaciones) quedan en `admin_log` con el correo de quien las hizo.

## 9. Editor visual del home

El home es una lista de **bloques** guardada en `src/content/pages/home.json`. El editor (Puck) permite arrastrar, ordenar, duplicar, editar textos directamente sobre la página, cambiar fotos y ver el resultado en celular, tablet y computador. El mismo componente se usa en el editor y en el sitio: lo que ves es lo que se publica.

**Bloques del home**: Portada (Hero), Experiencias, Escapadas Tercera Edad, Promociones, Por qué elegirnos, Mapa de destinos, Alojamientos, Videos y galería, Tarjetas de llamado, Preguntas frecuentes y Cierre de contacto. Además hay **bloques libres**: Texto e imagen, Banner, Tarjetas, Testimonios, Video y Texto.

### Mostrar u ocultar secciones

- Botón **Secciones** (arriba, junto a Historial): lista todas las secciones con un interruptor. Apagar una la oculta del sitio; el botón muestra cuántas hay ocultas y, en la vista previa, la sección queda atenuada con la etiqueta "Oculta en el sitio".
- Ocultar una sección también quita su enlace del menú (ver 4.2).
- Cada bloque también tiene el campo *Visible en el sitio* en su propio panel de edición.

### Borradores, historial y publicación

- Los cambios se guardan solos como **borrador** (tabla `cms_drafts`) y no se ven en el sitio hasta publicar.
- **Historial**: versiones publicadas (commits de GitHub) que se pueden restaurar y revisar antes de volver a publicar.
- **Publicar** crea el commit; el botón queda deshabilitado si no hay cambios. El editor muestra el estado del build ("En cola", "Publicando", "Publicado").
- Si hay un borrador sin publicar, aparece un aviso con la opción de descartarlo.

## 10. Cómo se publica un cambio

1. El panel envía el contenido a `POST /api/admin/publish`.
2. La función hace un commit en `main` del repositorio (home: `src/content/pages/home.json`; fichas: `src/content/experiencias/*.md` y `src/content/alojamientos/*.md`) con el token `GITHUB_TOKEN`.
3. Cloudflare Pages detecta el commit y reconstruye el sitio (1 a 3 minutos con la caché de build activada; unos 5 sin ella).
4. El editor consulta el estado del build hasta que termina.

Como el panel hace commits en `main`, **antes de trabajar en el código local hay que hacer `git pull`**.

## 11. Base de datos (D1)

Base `turismoavatar`. Esquema completo en `db/schema.sql`; migraciones en `db/migrations/`.

| Tabla | Contenido |
|---|---|
| `bookings` | Reservas: código, tipo (`experiencia`, `alojamiento`, `programa`, `cotizacion`), ítem, fechas, personas, datos del cliente, total, estado, notas internas |
| `leads` | Mensajes de contacto, empresas, proveedores y rally, con estado |
| `subscribers` | Suscriptores del newsletter |
| `chat_logs` | Cada pregunta y respuesta de Cami, con sesión, página, motor (`ai`, `reglas`, `humano`, `persona`), derivación y país |
| `chat_takeovers` | Conversaciones tomadas por una persona: nombre del agente, correo, última actividad, liberación |
| `chat_staff_msgs` | Mensajes escritos por el equipo en las conversaciones tomadas |
| `cms_drafts` | Borradores del editor (por ejemplo `home`) |
| `cms_media` | Biblioteca de fotos y videos (clave en R2, medidas, texto alternativo) |
| `admin_log` | Auditoría de acciones del panel |

## 12. Referencia de la API

### Pública

| Método y ruta | Qué hace |
|---|---|
| `POST /api/reservas` | Crea una solicitud de reserva |
| `GET /api/disponibilidad?item=` | Rangos ocupados de un alojamiento |
| `POST /api/contacto` | Contacto, empresas, proveedores y rally |
| `POST /api/newsletter` | Suscripción |
| `POST /api/chat` | Mensaje a Cami (o al agente si hay atención en vivo) |
| `GET /api/chat-poll?session=&after=` | Estado de la atención en vivo y mensajes nuevos del equipo |
| `GET /cms-media/…` | Fotos y videos de R2 (con caché) |

### Panel (`/api/admin/*`, requieren login)

| Ruta | Qué hace |
|---|---|
| `GET /me` | Usuario, forma de acceso y servicios conectados |
| `GET /pulse` | Contadores para el tiempo real |
| `GET, PATCH, DELETE /bookings` | Listar, editar o cambiar estado, y eliminar reservas |
| `GET /chats` | Lista, conversación completa y preguntas frecuentes |
| `POST /chat-live` | Acciones `tomar`, `enviar`, `nombre` y `soltar` |
| `GET, PATCH /leads` | Mensajes y suscriptores |
| `GET, POST, DELETE /media` | Biblioteca de fotos y videos |
| `GET, PUT, DELETE /drafts/[key]` | Borradores del editor |
| `GET /history` | Versiones publicadas y contenido actual |
| `POST /publish`, `GET /publish?sha=` | Publicar (commit) y ver el estado del build |

## 13. Seguridad

- **Login del panel**: Cloudflare Access verifica la firma del token en cada petición; sin token válido no se ve nada, aunque se entre por otra URL. Respaldo con `ADMIN_PASSWORD`.
- **CSRF**: las escrituras del panel exigen que el origen sea el propio sitio.
- **Antispam**: honeypot en formularios, límites por IP y Turnstile opcional.
- **Cabeceras** (`public/_headers`): `nosniff`, `Referrer-Policy`, `X-Frame-Options`, HSTS y permisos restringidos. `/admin/*` va con `noindex` y sin caché.
- **Datos personales**: el chat no guarda nombres ni teléfonos; las reservas y mensajes viven en D1.
- **Secretos**: nunca en el repositorio; se cargan en Cloudflare Pages.

## 14. SEO y rendimiento

- Sitemap, `robots.txt`, canonical y Open Graph.
- **schema.org**: `TravelAgency`, `TouristTrip`, `Accommodation`, `TouristDestination`, `FAQPage` y `BreadcrumbList`.
- Redirecciones 301 de las URLs del WordPress en `public/_redirects`.
- Imágenes AVIF/WebP con `srcset`, optimizadas al compilar (`astro:assets`); archivos de `_astro/` con caché inmutable de un año.
- Fotos de R2 servidas con caché de borde (Cache API).
- Tipografías Montserrat (títulos) y Nunito Sans (texto) alojadas en el propio sitio.
- Marca: naranjo `#f47800`, celeste `#00a8e8`, azul marino `#192a3d`, fondo `#f2f5f7`. Botones con texto marino sobre naranjo (contraste 5.2:1).
- Accesibilidad: foco visible, navegación por teclado, `prefers-reduced-motion` respetado.

## 15. Configuración y despliegue

Paso a paso en [ADMIN.md](../ADMIN.md) y [README.md](../README.md). Resumen:

**Bindings** (`wrangler.toml`): `DB` (D1 `turismoavatar`), `MEDIA` (R2 `turismoavatar-media`), `AI` (Workers AI).

**Variables** (`[vars]`): `SITE_NAME`, `WHATSAPP_NUMBER`, `NOTIFY_EMAIL`, `MAIL_FROM`, `GITHUB_REPO`, `GITHUB_BRANCH`. Opcional: `AI_MODEL`.

**Secretos** (Pages → Settings → Variables and secrets):

| Secreto | Para qué |
|---|---|
| `RESEND_API_KEY` | Enviar correos de reservas y mensajes |
| `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD` | Login del panel con código al correo |
| `GITHUB_TOKEN` | Publicar desde el panel (Contents: lectura y escritura, solo este repositorio) |
| `ADMIN_PASSWORD` | Respaldo del login (usuario `admin`) |
| `TURNSTILE_SECRET` + variable de build `PUBLIC_TURNSTILE_SITEKEY` | Antispam opcional |

**Pages**: framework Astro, build `npm run build`, salida `dist`, `NODE_VERSION=22`, caché de build activada.

**Migraciones de base de datos**: `db/schema.sql` crea todo desde cero; las migraciones (`0002_panel.sql`, `0003_chat_en_vivo.sql`) llevan una base existente al estado actual.

**Desarrollo local**:

```bash
npm install
npm run dev          # sitio en http://localhost:4321 (sin funciones)
npm run build
npx wrangler d1 execute turismoavatar --local --file=db/schema.sql
echo "ADMIN_PASSWORD=test123" > .dev.vars
npx wrangler pages dev ./dist     # sitio + funciones + panel (admin / test123)
npm run check        # revisión de tipos
```

## 16. Tareas frecuentes

| Quiero… | Cómo |
|---|---|
| Cambiar textos o fotos del home | Panel → Editar home → Publicar |
| Ocultar o mostrar una sección del home | Editar home → Secciones → interruptor → Publicar (también actualiza el menú) |
| Ocultar una categoría de la portada | Editar home → Portada → *Categorías de la barra* |
| Cambiar precio de una experiencia o alojamiento | Panel → Experiencias y alojamientos |
| Subir fotos o videos | Panel → Fotos y videos |
| Confirmar o corregir una reserva | Panel → Reservas |
| Atender a un cliente en el chat | Panel → Conversaciones Cami → Tomar conversación |
| Ver qué preguntan los clientes | Panel → Conversaciones Cami (preguntas más repetidas) |
| Cambiar teléfono, redes o datos del negocio | `src/data/site.ts` |
| Editar programas de tercera edad | `src/content/programas/tercera-edad-*.md` y `src/data/tercera-edad.ts` |
| Editar preguntas frecuentes | `src/data/faq.ts` |
| Agregar un bloque nuevo al editor | Crear el componente en `src/blocks/`, registrarlo en `src/blocks/registry.tsx` y `src/admin/puck-config.tsx` |
| Agregar una redirección | `public/_redirects` |

## 17. Limitaciones conocidas y pendientes

- Las **tarjetas de Tercera Edad** usan recortes de una imagen de presentación con nombres y precios dentro de la foto; si cambian los precios hay que subir imágenes nuevas desde el editor.
- **Cañete–Lanalhue y Valle Las Trancas** no tienen detalle oficial en los materiales de Sernatur Escapadas; la página lo dice de forma genérica.
- No está confirmada la autorización de Turismo Avatar como agencia del programa Escapadas de Sernatur.
- El **pago en línea** (Webpay, Mercado Pago o Flow) no existe: el flujo es solicitud → confirmación → pago por fuera.
- Precios de algunas experiencias (Clases de SUP, SUP río Menque, Kayak, Cabalgata, Ruta del túnel de Penco) figuran "a consultar".
- Las conversaciones de Cami anteriores a la atención en vivo no se pueden tomar.
- Los enlaces del menú principal siguen a siete secciones del home; Programas y Tienda no se pueden ocultar con ese interruptor.
- El editor visual (Puck) mantiene su propio encabezado y tema claro, aunque el resto del panel tenga modo oscuro.
- Falta configurar Cloudflare Access y los secretos del panel en producción para dejar el login definitivo (hoy sirve el respaldo con contraseña).
