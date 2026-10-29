ALTER TABLE settings ADD COLUMN last_backup_at TEXT;
ALTER TABLE settings ADD COLUMN backup_warning_days INTEGER NOT NULL DEFAULT 7;
