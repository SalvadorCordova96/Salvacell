CREATE TABLE customer_devices (
  id serial PRIMARY KEY,
  creation_key text NOT NULL UNIQUE,
  customer_id integer REFERENCES customers(id) ON DELETE SET NULL,
  created_at text NOT NULL,
  updated_at text NOT NULL
);
--> statement-breakpoint
CREATE INDEX idx_customer_devices_customer ON customer_devices(customer_id, created_at);
--> statement-breakpoint
ALTER TABLE orders ADD COLUMN device_id integer REFERENCES customer_devices(id) ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX idx_orders_device_id ON orders(device_id);
--> statement-breakpoint
INSERT INTO customer_devices (creation_key, customer_id, created_at, updated_at)
SELECT 'legacy-order-device-' || id, customer_id, created_at, updated_at
FROM orders
WHERE device_id IS NULL;
--> statement-breakpoint
UPDATE orders
SET device_id = customer_devices.id
FROM customer_devices
WHERE orders.device_id IS NULL
  AND customer_devices.creation_key = 'legacy-order-device-' || orders.id;
