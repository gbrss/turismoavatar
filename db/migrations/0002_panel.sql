-- Solo si la base D1 ya existía antes del panel (bases nuevas: basta con db/schema.sql).
-- npx wrangler d1 execute turismoavatar --remote --file=db/migrations/0002_panel.sql
ALTER TABLE bookings ADD COLUMN admin_notes TEXT;
ALTER TABLE bookings ADD COLUMN updated_at TEXT;
ALTER TABLE chat_logs ADD COLUMN session_id TEXT;
ALTER TABLE chat_logs ADD COLUMN handoff INTEGER NOT NULL DEFAULT 0;
ALTER TABLE chat_logs ADD COLUMN country TEXT;
CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_logs (session_id, id);
CREATE INDEX IF NOT EXISTS idx_chat_created ON chat_logs (created_at);
CREATE TABLE IF NOT EXISTS cms_drafts (key TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT (datetime('now')), updated_by TEXT);
CREATE TABLE IF NOT EXISTS cms_media (id TEXT PRIMARY KEY, key TEXT NOT NULL, kind TEXT NOT NULL, name TEXT, alt TEXT, width INTEGER, height INTEGER, bytes INTEGER, created_at TEXT NOT NULL DEFAULT (datetime('now')), created_by TEXT);
CREATE TABLE IF NOT EXISTS admin_log (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL DEFAULT (datetime('now')), email TEXT NOT NULL, action TEXT NOT NULL, detail TEXT);
