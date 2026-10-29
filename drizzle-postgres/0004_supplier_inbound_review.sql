ALTER TABLE price_request_suppliers
  ADD COLUMN correlation_ref text NOT NULL DEFAULT gen_random_uuid()::text;--> statement-breakpoint
CREATE UNIQUE INDEX uq_price_request_suppliers_correlation_ref ON price_request_suppliers(correlation_ref);--> statement-breakpoint
CREATE TABLE supplier_inbound_messages (
  id serial PRIMARY KEY,
  channel text NOT NULL CHECK (channel IN ('whatsapp','manual','simulated')),
  external_message_id text NOT NULL,
  sender_hash text NOT NULL,
  sender_hint text NOT NULL DEFAULT '',
  conversation_hash text,
  supplier_id integer REFERENCES suppliers(id),
  original_message text NOT NULL,
  received_at text NOT NULL,
  correlation_ref text,
  status text NOT NULL DEFAULT 'unmatched' CHECK (status IN ('unmatched','needs_review','ambiguous','linked','late','ignored')),
  suggested_price_request_supplier_id integer REFERENCES price_request_suppliers(id),
  candidate_association_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  proposal jsonb,
  review_reason text NOT NULL DEFAULT '',
  linked_price_request_supplier_id integer REFERENCES price_request_suppliers(id),
  reviewed_at text,
  created_at text NOT NULL,
  UNIQUE (channel, external_message_id)
);--> statement-breakpoint
CREATE INDEX idx_supplier_inbound_status ON supplier_inbound_messages(status, received_at);--> statement-breakpoint
CREATE INDEX idx_supplier_inbound_supplier ON supplier_inbound_messages(supplier_id, received_at);--> statement-breakpoint
ALTER TABLE supplier_responses ADD COLUMN inbound_message_id integer REFERENCES supplier_inbound_messages(id);--> statement-breakpoint
ALTER TABLE supplier_responses ADD COLUMN inbound_offer_index integer;--> statement-breakpoint
CREATE UNIQUE INDEX uq_supplier_response_inbound_offer ON supplier_responses(inbound_message_id, inbound_offer_index);
