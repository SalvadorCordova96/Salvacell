CREATE TABLE operator_transcriptions (
  id serial PRIMARY KEY,
  operator_user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transcript_text text,
  extracted_fields jsonb,
  status text NOT NULL DEFAULT 'pendiente',
  created_at text NOT NULL,
  expires_at text NOT NULL,
  used_at text,
  used_document_type text,
  used_document_id integer,
  discarded_at text,
  CHECK (status IN ('pendiente','usada','caducada','descartada')),
  CHECK (transcript_text IS NULL OR length(transcript_text) BETWEEN 1 AND 12000),
  CHECK (extracted_fields IS NULL OR jsonb_typeof(extracted_fields)='object'),
  CHECK ((status='pendiente') OR (transcript_text IS NULL AND extracted_fields IS NULL)),
  CHECK ((status='usada' AND used_at IS NOT NULL AND used_document_type IN ('order','quote') AND used_document_id IS NOT NULL)
    OR (status<>'usada' AND used_at IS NULL AND used_document_type IS NULL AND used_document_id IS NULL))
);
--> statement-breakpoint
CREATE INDEX idx_operator_transcriptions_owner_created ON operator_transcriptions(operator_user_id,created_at DESC);
--> statement-breakpoint
CREATE INDEX idx_operator_transcriptions_expiry ON operator_transcriptions(status,expires_at);
