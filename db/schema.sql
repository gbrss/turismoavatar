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
  country TEXT
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
  engine TEXT
);
