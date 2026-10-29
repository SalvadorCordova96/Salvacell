CREATE TABLE form_drafts (
  id text PRIMARY KEY,
  owner_user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('order','reception')),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload)='object'),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at text NOT NULL,
  updated_at text NOT NULL
);
--> statement-breakpoint
CREATE INDEX idx_form_drafts_owner_updated ON form_drafts(owner_user_id,updated_at DESC);
