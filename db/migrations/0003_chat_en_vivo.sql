-- Atención en vivo: una persona toma una conversación de Cami y responde al cliente desde el panel
CREATE TABLE IF NOT EXISTS chat_takeovers (
  session_id TEXT PRIMARY KEY,
  agent TEXT NOT NULL,                 -- nombre que ve el cliente
  email TEXT,
  taken_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_at TEXT NOT NULL DEFAULT (datetime('now')),   -- última actividad de la persona (si pasan 20 min, vuelve Cami)
  released_at TEXT
);
CREATE TABLE IF NOT EXISTS chat_staff_msgs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  session_id TEXT NOT NULL,
  author TEXT NOT NULL,
  body TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_staff_session ON chat_staff_msgs (session_id, id);
