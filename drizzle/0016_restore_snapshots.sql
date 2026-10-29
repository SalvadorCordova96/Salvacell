CREATE TABLE restore_snapshots (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 created_at TEXT NOT NULL,
 payload TEXT NOT NULL
);
CREATE INDEX idx_restore_snapshots_created ON restore_snapshots(created_at);
