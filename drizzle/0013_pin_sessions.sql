ALTER TABLE settings ADD COLUMN pin_hash TEXT;
ALTER TABLE settings ADD COLUMN pin_salt TEXT;
ALTER TABLE settings ADD COLUMN pin_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE settings ADD COLUMN pin_idle_minutes INTEGER NOT NULL DEFAULT 10;
CREATE TABLE sessions (token_hash TEXT PRIMARY KEY,created_at TEXT NOT NULL,expires_at TEXT NOT NULL);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
