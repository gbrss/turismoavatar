-- Esquema D1 de Turismo Avatar. Ejecutar: npm run db:init
CREATE TABLE IF NOT EXISTS bookings (
  code TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  kind TEXT NOT NULL,                 -- experiencia | alojamiento | programa | cotizacion
  item_slug TEXT NOT NULL,
  item_title TEXT NOT NULL,
  date TEXT NOT NULL,
  date_end TEXT,
  people INTEGER NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  notes TEXT,
  estimated_total INTEGER,
  status TEXT NOT NULL DEFAULT 'pendiente', -- pendiente | confirmada | pagada | cancelada
  source TEXT,
  country TEXT,
  admin_notes TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_bookings_item ON bookings (item_slug, status, date);
CREATE INDEX IF NOT EXISTS idx_bookings_created ON bookings (created_at);

CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  kind TEXT NOT NULL,                 -- contacto | empresa | proveedor
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  org TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'nuevo'
);

CREATE TABLE IF NOT EXISTS subscribers (
  email TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  source TEXT
);

-- Preguntas al chatbot: sirven para descubrir demanda y mejorar contenido
CREATE TABLE IF NOT EXISTS chat_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  page TEXT,
  question TEXT NOT NULL,
  answer TEXT,
  engine TEXT,
  session_id TEXT,
  handoff INTEGER NOT NULL DEFAULT 0,
  country TEXT
);
CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_logs (session_id, id);
CREATE INDEX IF NOT EXISTS idx_chat_created ON chat_logs (created_at);


-- ───── Panel de administración ─────
-- Borradores del editor visual (se guardan solos mientras editas)
CREATE TABLE IF NOT EXISTS cms_drafts (
  key TEXT PRIMARY KEY,              -- home | experiencias/<slug> | alojamientos/<slug>
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by TEXT
);

-- Fotos y videos subidos (archivos en R2)
CREATE TABLE IF NOT EXISTS cms_media (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,                 -- cms/<id>/<ancho>x<alto> | cms-video/<id>.mp4
  kind TEXT NOT NULL,                -- image | video
  name TEXT,
  alt TEXT,
  width INTEGER,
  height INTEGER,
  bytes INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT
);

-- Publicaciones y cambios hechos desde el panel
CREATE TABLE IF NOT EXISTS admin_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  email TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT
);
