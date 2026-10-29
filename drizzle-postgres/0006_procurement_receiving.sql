CREATE TABLE purchase_orders (
  id serial PRIMARY KEY,
  request_key text NOT NULL UNIQUE,
  supplier_id integer NOT NULL REFERENCES suppliers(id),
  status text NOT NULL DEFAULT 'borrador'
    CHECK (status IN ('borrador','solicitada','parcial','recibida','cancelada')),
  currency text NOT NULL CHECK (currency IN ('MXN','USD')),
  subtotal_cents integer NOT NULL CHECK (subtotal_cents >= 0),
  shipping_cents integer NOT NULL DEFAULT 0 CHECK (shipping_cents >= 0),
  total_cents integer NOT NULL CHECK (total_cents = subtotal_cents + shipping_cents),
  notes text NOT NULL DEFAULT '',
  ordered_at text,
  cancelled_at text,
  cancel_reason text NOT NULL DEFAULT '',
  revision integer NOT NULL DEFAULT 1,
  created_at text NOT NULL,
  updated_at text NOT NULL
);
--> statement-breakpoint
CREATE INDEX idx_purchase_orders_supplier_status
  ON purchase_orders(supplier_id, status, created_at DESC);
--> statement-breakpoint
CREATE TABLE purchase_order_items (
  id serial PRIMARY KEY,
  request_key text NOT NULL UNIQUE,
  purchase_order_id integer NOT NULL REFERENCES purchase_orders(id),
  supplier_response_id integer REFERENCES supplier_responses(id),
  price_request_supplier_id integer REFERENCES price_request_suppliers(id),
  part_request_id integer REFERENCES part_requests(id),
  repair_id integer REFERENCES order_repairs(id),
  quote_id integer REFERENCES quotes(id),
  product_id integer REFERENCES products(id),
  destination text NOT NULL CHECK (destination IN ('repair','inventory')),
  item_name text NOT NULL,
  brand text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  quality text NOT NULL DEFAULT '',
  quantity integer NOT NULL CHECK (quantity > 0),
  received_quantity integer NOT NULL DEFAULT 0 CHECK (received_quantity BETWEEN 0 AND quantity),
  unit_cost_cents integer NOT NULL CHECK (unit_cost_cents >= 0),
  allocated_shipping_cents integer NOT NULL DEFAULT 0 CHECK (allocated_shipping_cents >= 0),
  received_shipping_cents integer NOT NULL DEFAULT 0 CHECK (received_shipping_cents BETWEEN 0 AND allocated_shipping_cents),
  returnable integer NOT NULL DEFAULT 0 CHECK (returnable IN (0,1)),
  created_at text NOT NULL,
  CHECK (
    (destination = 'repair' AND part_request_id IS NOT NULL AND repair_id IS NOT NULL)
    OR (destination = 'inventory' AND product_id IS NOT NULL)
  )
);
--> statement-breakpoint
CREATE UNIQUE INDEX uq_purchase_item_response
  ON purchase_order_items(supplier_response_id) WHERE supplier_response_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX idx_purchase_items_order ON purchase_order_items(purchase_order_id, id);
--> statement-breakpoint
CREATE INDEX idx_purchase_items_part_request ON purchase_order_items(part_request_id);
--> statement-breakpoint
CREATE INDEX idx_purchase_items_product ON purchase_order_items(product_id);
--> statement-breakpoint
CREATE TABLE supplier_payments (
  id serial PRIMARY KEY,
  request_key text NOT NULL UNIQUE,
  purchase_order_id integer NOT NULL REFERENCES purchase_orders(id),
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  method text NOT NULL CHECK (method IN ('efectivo','transferencia','tarjeta','otro')),
  notes text NOT NULL DEFAULT '',
  created_at text NOT NULL,
  voided_at text,
  void_reason text NOT NULL DEFAULT ''
);
--> statement-breakpoint
CREATE INDEX idx_supplier_payments_order ON supplier_payments(purchase_order_id, created_at);
--> statement-breakpoint
CREATE TABLE purchase_receipts (
  id serial PRIMARY KEY,
  request_key text NOT NULL UNIQUE,
  purchase_order_id integer NOT NULL REFERENCES purchase_orders(id),
  received_at text NOT NULL,
  notes text NOT NULL DEFAULT '',
  created_at text NOT NULL
);
--> statement-breakpoint
CREATE INDEX idx_purchase_receipts_order ON purchase_receipts(purchase_order_id, received_at);
--> statement-breakpoint
CREATE TABLE purchase_receipt_items (
  id serial PRIMARY KEY,
  receipt_id integer NOT NULL REFERENCES purchase_receipts(id),
  purchase_order_item_id integer NOT NULL REFERENCES purchase_order_items(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_cost_cents integer NOT NULL CHECK (unit_cost_cents >= 0),
  shipping_cents integer NOT NULL DEFAULT 0 CHECK (shipping_cents >= 0),
  UNIQUE (receipt_id, purchase_order_item_id)
);
--> statement-breakpoint
CREATE INDEX idx_purchase_receipt_items_order_item ON purchase_receipt_items(purchase_order_item_id);
--> statement-breakpoint
ALTER TABLE stock_movements ADD COLUMN source_type text;
--> statement-breakpoint
ALTER TABLE stock_movements ADD COLUMN source_id integer;
--> statement-breakpoint
CREATE UNIQUE INDEX uq_stock_movement_source
  ON stock_movements(source_type, source_id)
  WHERE source_type IS NOT NULL AND source_id IS NOT NULL;
--> statement-breakpoint
ALTER TABLE part_requests DROP CONSTRAINT part_status;
--> statement-breakpoint
ALTER TABLE part_requests ADD CONSTRAINT part_status
  CHECK (status IN ('por_verificar','solicitada','disponible','no_disponible','instalada','cancelada'));
