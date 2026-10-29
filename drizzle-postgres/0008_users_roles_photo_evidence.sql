CREATE TABLE roles (
  id serial PRIMARY KEY,
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  active integer NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at text NOT NULL,
  updated_at text NOT NULL
);
--> statement-breakpoint
INSERT INTO roles (key,name,permissions,created_at,updated_at) VALUES
  ('administrador','Administrador','["*"]'::jsonb,now()::text,now()::text),
  ('tecnico','Técnico','["workshop.read","customers.write","orders.write","repairs.write","quotes.write","parts.write","suppliers.read","warranties.write"]'::jsonb,now()::text,now()::text),
  ('caja','Caja','["workshop.read","customers.read","orders.read","payments.write","pos.write","cash.write"]'::jsonb,now()::text,now()::text)
ON CONFLICT (key) DO NOTHING;
--> statement-breakpoint
CREATE TABLE users (
  id serial PRIMARY KEY,
  username text NOT NULL UNIQUE,
  display_name text NOT NULL,
  password_hash text NOT NULL,
  password_salt text NOT NULL,
  role_id integer NOT NULL REFERENCES roles(id),
  active integer NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at text NOT NULL,
  updated_at text NOT NULL,
  last_login_at text
);
--> statement-breakpoint
ALTER TABLE sessions ADD COLUMN user_id integer REFERENCES users(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE sessions ADD COLUMN last_seen_at text;
--> statement-breakpoint
ALTER TABLE sessions ADD COLUMN revoked_at text;
--> statement-breakpoint
CREATE INDEX idx_sessions_user ON sessions(user_id,expires_at);
--> statement-breakpoint
ALTER TABLE audit_log ADD COLUMN actor_user_id integer REFERENCES users(id) ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX idx_audit_log_actor_created ON audit_log(actor_user_id,created_at);
--> statement-breakpoint
CREATE TABLE repair_photo_upload_tokens (
  token_hash text PRIMARY KEY,
  order_id integer NOT NULL REFERENCES orders(id),
  created_by_user_id integer NOT NULL REFERENCES users(id),
  created_at text NOT NULL,
  expires_at text NOT NULL,
  redeemed_at text,
  upload_session_hash text,
  upload_session_expires_at text,
  revoked_at text,
  upload_count integer NOT NULL DEFAULT 0,
  max_uploads integer NOT NULL DEFAULT 10,
  CHECK (upload_count >= 0 AND upload_count <= max_uploads),
  CHECK (max_uploads BETWEEN 1 AND 20)
);
--> statement-breakpoint
CREATE INDEX idx_photo_tokens_order ON repair_photo_upload_tokens(order_id,created_at);
--> statement-breakpoint
CREATE INDEX idx_photo_tokens_expiry ON repair_photo_upload_tokens(expires_at);
--> statement-breakpoint
CREATE TABLE repair_photos (
  id serial PRIMARY KEY,
  order_id integer NOT NULL REFERENCES orders(id),
  upload_token_hash text NOT NULL REFERENCES repair_photo_upload_tokens(token_hash),
  storage_key text NOT NULL UNIQUE,
  thumbnail_key text NOT NULL UNIQUE,
  original_name text NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('image/jpeg','image/png','image/webp')),
  size_bytes integer NOT NULL CHECK (size_bytes BETWEEN 1 AND 12000000),
  thumbnail_size_bytes integer NOT NULL CHECK (thumbnail_size_bytes BETWEEN 1 AND 12000000),
  sha256 text NOT NULL,
  created_by_user_id integer NOT NULL REFERENCES users(id),
  created_at text NOT NULL,
  deleted_at text,
  delete_reason text NOT NULL DEFAULT ''
);
--> statement-breakpoint
CREATE INDEX idx_repair_photos_order ON repair_photos(order_id,created_at);
