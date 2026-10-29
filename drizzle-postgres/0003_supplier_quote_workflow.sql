ALTER TABLE settings ADD COLUMN quote_response_wait_minutes integer NOT NULL DEFAULT 20 CHECK (quote_response_wait_minutes BETWEEN 1 AND 1440);--> statement-breakpoint
ALTER TABLE price_requests ADD COLUMN quote_id integer REFERENCES quotes(id);--> statement-breakpoint
ALTER TABLE price_requests ADD COLUMN repair_id integer REFERENCES order_repairs(id);--> statement-breakpoint
ALTER TABLE price_requests ADD COLUMN closed_at text;--> statement-breakpoint
ALTER TABLE price_requests ADD COLUMN selected_supplier_id integer REFERENCES suppliers(id);--> statement-breakpoint
ALTER TABLE price_requests ADD COLUMN selected_at text;--> statement-breakpoint
ALTER TABLE price_requests DROP CONSTRAINT price_request_status;--> statement-breakpoint
ALTER TABLE price_requests ADD CONSTRAINT price_request_status CHECK (status IN ('pendiente','atendida','cerrada','cancelada'));--> statement-breakpoint
CREATE INDEX idx_price_requests_quote_id ON price_requests(quote_id);--> statement-breakpoint
CREATE INDEX idx_price_requests_repair_id ON price_requests(repair_id);--> statement-breakpoint
CREATE TABLE price_request_suppliers (
  id serial PRIMARY KEY,
  price_request_id integer NOT NULL REFERENCES price_requests(id),
  supplier_id integer NOT NULL REFERENCES suppliers(id),
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','respondio','sin_disponibilidad','cancelado')),
  last_message_at text,
  created_at text NOT NULL,
  UNIQUE (price_request_id, supplier_id)
);--> statement-breakpoint
CREATE INDEX idx_price_request_suppliers_request ON price_request_suppliers(price_request_id);--> statement-breakpoint
CREATE TABLE supplier_responses (
  id serial PRIMARY KEY,
  price_request_supplier_id integer NOT NULL REFERENCES price_request_suppliers(id),
  request_key text NOT NULL UNIQUE,
  original_message text NOT NULL DEFAULT '',
  technical_summary text NOT NULL DEFAULT '',
  price_cents integer CHECK (price_cents IS NULL OR price_cents >= 0),
  shipping_cents integer CHECK (shipping_cents IS NULL OR shipping_cents >= 0),
  quality text NOT NULL DEFAULT '',
  availability text NOT NULL DEFAULT 'por_confirmar' CHECK (availability IN ('por_confirmar','disponible','agotada','bajo_pedido','sin_disponibilidad')),
  delivery_time text NOT NULL DEFAULT '',
  needs_review integer NOT NULL DEFAULT 0 CHECK (needs_review IN (0,1)),
  is_late integer NOT NULL DEFAULT 0 CHECK (is_late IN (0,1)),
  received_at text NOT NULL
);--> statement-breakpoint
CREATE INDEX idx_supplier_responses_supplier_request ON supplier_responses(price_request_supplier_id, received_at);
--> statement-breakpoint
ALTER TABLE price_requests ADD COLUMN selected_response_id integer REFERENCES supplier_responses(id);
