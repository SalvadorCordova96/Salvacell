-- Customer profiles, one reception containing independent device orders, and
-- repeatable repair/work rows per order. Existing rows are preserved as-is.
CREATE TABLE customers (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 first_name TEXT NOT NULL,
 last_name TEXT NOT NULL,
 phone TEXT NOT NULL DEFAULT '',
 notes TEXT NOT NULL DEFAULT '',
 revision INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX idx_customers_name ON customers(last_name,first_name);
CREATE INDEX idx_customers_phone ON customers(phone);

CREATE TABLE receptions (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 creation_key TEXT NOT NULL UNIQUE,
 customer_id INTEGER NOT NULL REFERENCES customers(id),
 notes TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX idx_receptions_customer ON receptions(customer_id,created_at);

-- Reuse a profile only for an exact normalized name + valid normalized phone.
-- Missing/invalid phones remain separate profiles; no fuzzy or phone-only match.
WITH normalized AS (
 SELECT id,first_name,last_name,phone,created_at,updated_at,
        lower(trim(first_name)) AS first_key,lower(trim(last_name)) AS last_key,
        replace(replace(replace(replace(replace(replace(trim(phone),' ',''),'-',''),'(',''),')',''),'+',''),'.','') AS phone_key
 FROM orders
), valid AS (
 SELECT * FROM normalized
 WHERE length(phone_key) BETWEEN 7 AND 15 AND phone_key NOT GLOB '*[^0-9]*'
)
INSERT INTO customers(id,first_name,last_name,phone,created_at,updated_at)
 SELECT MIN(id),MIN(first_name),MIN(last_name),MIN(phone),MIN(created_at),MAX(updated_at)
 FROM valid GROUP BY first_key,last_key,phone_key;
INSERT INTO customers(id,first_name,last_name,phone,created_at,updated_at)
 SELECT o.id,o.first_name,o.last_name,o.phone,o.created_at,o.updated_at FROM orders o
 WHERE NOT EXISTS (
  SELECT 1 FROM customers c
  WHERE lower(trim(c.first_name))=lower(trim(o.first_name))
   AND lower(trim(c.last_name))=lower(trim(o.last_name))
   AND replace(replace(replace(replace(replace(replace(trim(c.phone),' ',''),'-',''),'(',''),')',''),'+',''),'.','')=
       replace(replace(replace(replace(replace(replace(trim(o.phone),' ',''),'-',''),'(',''),')',''),'+',''),'.','')
   AND length(replace(replace(replace(replace(replace(replace(trim(o.phone),' ',''),'-',''),'(',''),')',''),'+',''),'.','')) BETWEEN 7 AND 15
   AND replace(replace(replace(replace(replace(replace(trim(o.phone),' ',''),'-',''),'(',''),')',''),'+',''),'.','') NOT GLOB '*[^0-9]*'
 );
INSERT INTO receptions(id,creation_key,customer_id,created_at,updated_at)
 SELECT o.id,'legacy-reception-'||o.id,
        COALESCE((SELECT c.id FROM customers c
          WHERE lower(trim(c.first_name))=lower(trim(o.first_name))
            AND lower(trim(c.last_name))=lower(trim(o.last_name))
            AND replace(replace(replace(replace(replace(replace(trim(c.phone),' ',''),'-',''),'(',''),')',''),'+',''),'.','')=
                replace(replace(replace(replace(replace(replace(trim(o.phone),' ',''),'-',''),'(',''),')',''),'+',''),'.','')
            AND length(replace(replace(replace(replace(replace(replace(trim(o.phone),' ',''),'-',''),'(',''),')',''),'+',''),'.','')) BETWEEN 7 AND 15
            AND replace(replace(replace(replace(replace(replace(trim(o.phone),' ',''),'-',''),'(',''),')',''),'+',''),'.','') NOT GLOB '*[^0-9]*'
          ORDER BY c.id LIMIT 1),o.id),o.created_at,o.updated_at FROM orders o ORDER BY o.id;

ALTER TABLE orders ADD COLUMN customer_id INTEGER REFERENCES customers(id);
ALTER TABLE orders ADD COLUMN reception_id INTEGER REFERENCES receptions(id);
ALTER TABLE orders ADD COLUMN device_type TEXT NOT NULL DEFAULT 'movil';
UPDATE orders SET reception_id=id;
UPDATE orders SET customer_id=(SELECT customer_id FROM receptions WHERE receptions.id=orders.id);
CREATE INDEX idx_orders_customer_id ON orders(customer_id,created_at);
CREATE INDEX idx_orders_reception_id ON orders(reception_id);

ALTER TABLE sales ADD COLUMN customer_id INTEGER REFERENCES customers(id);
CREATE INDEX idx_sales_customer_id ON sales(customer_id);

CREATE TABLE order_repairs (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 order_id INTEGER NOT NULL REFERENCES orders(id),
 position INTEGER NOT NULL DEFAULT 0,
 repair_type TEXT NOT NULL DEFAULT '',
 problem TEXT NOT NULL DEFAULT '',
 diagnosis TEXT NOT NULL DEFAULT '',
 solution TEXT NOT NULL DEFAULT '',
 notes TEXT NOT NULL DEFAULT '',
 service_cents INTEGER NOT NULL DEFAULT 0,
 parts_cents INTEGER NOT NULL DEFAULT 0,
 review_cents INTEGER NOT NULL DEFAULT 0,
 part_name TEXT NOT NULL DEFAULT '',
 part_cost_cents INTEGER,
 supplier_id INTEGER REFERENCES suppliers(id),
 supplier_name TEXT NOT NULL DEFAULT '',
 revision INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 CHECK(service_cents>=0 AND parts_cents>=0 AND review_cents>=0),
 CHECK(part_cost_cents IS NULL OR part_cost_cents>=0)
);
CREATE INDEX idx_order_repairs_order ON order_repairs(order_id,position);

-- Preserve all current order-level amounts and descriptions as one initial line.
INSERT INTO order_repairs(order_id,position,repair_type,problem,diagnosis,notes,service_cents,parts_cents,review_cents,part_name,part_cost_cents,supplier_name,created_at,updated_at)
 SELECT o.id,0,o.repair_type,o.problem,o.problem,o.notes,o.service_cents,o.parts_cents,o.review_cents,
        COALESCE(pr.name,''),pr.internal_cost_cents,COALESCE(pr.supplier,''),o.created_at,o.updated_at
 FROM orders o LEFT JOIN part_requests pr ON pr.order_id=o.id ORDER BY o.id;

-- Allow a separate part request for each repair while retaining legacy requests.
-- Child quote tables keep their part_request_id values; deferred checking lets
-- the replacement parent table be installed under the same name in this file.
PRAGMA defer_foreign_keys=ON;
CREATE TABLE part_requests_new (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 order_id INTEGER NOT NULL REFERENCES orders(id),
 repair_id INTEGER REFERENCES order_repairs(id),
 name TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'por_verificar',
 internal_cost_cents INTEGER,
 supplier TEXT NOT NULL DEFAULT '',
 quality TEXT NOT NULL DEFAULT '',
 note TEXT NOT NULL DEFAULT '',
 revision INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 CHECK(status IN ('por_verificar','solicitada','disponible','no_disponible')),
 CHECK(internal_cost_cents IS NULL OR internal_cost_cents>=0)
);
INSERT INTO part_requests_new(id,order_id,name,status,internal_cost_cents,supplier,quality,note,revision,created_at,updated_at)
 SELECT id,order_id,name,status,internal_cost_cents,supplier,quality,note,revision,created_at,updated_at FROM part_requests;
DROP TABLE part_requests;
ALTER TABLE part_requests_new RENAME TO part_requests;
CREATE INDEX idx_part_requests_order_id ON part_requests(order_id);
CREATE INDEX idx_part_requests_repair_id ON part_requests(repair_id);
CREATE INDEX idx_part_requests_status ON part_requests(status);

PRAGMA foreign_key_check;
