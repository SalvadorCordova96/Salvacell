PRAGMA foreign_keys=OFF;
CREATE TABLE orders_new (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 creation_key TEXT NOT NULL UNIQUE,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 first_name TEXT NOT NULL,
 last_name TEXT NOT NULL,
 phone TEXT NOT NULL,
 brand TEXT NOT NULL,
 model TEXT NOT NULL,
 problem TEXT NOT NULL DEFAULT '',
 repair_type TEXT NOT NULL DEFAULT '',
 notes TEXT NOT NULL DEFAULT '',
 currency TEXT NOT NULL DEFAULT 'MXN',
 service_cents INTEGER NOT NULL DEFAULT 0,
 parts_cents INTEGER NOT NULL DEFAULT 0,
 review_cents INTEGER NOT NULL DEFAULT 0,
 review_usd_cents INTEGER NOT NULL DEFAULT 500,
 apply_review INTEGER NOT NULL DEFAULT 0,
 exchange_rate REAL,
 revision INTEGER NOT NULL DEFAULT 1,
 status TEXT NOT NULL DEFAULT 'nueva',
 quote_id INTEGER REFERENCES quotes(id),
 legacy_order_number TEXT,
 legacy_order_date TEXT,
 legacy_status TEXT,
 imei TEXT NOT NULL DEFAULT '',
 unlock_code TEXT NOT NULL DEFAULT '',
 accessories_left TEXT NOT NULL DEFAULT '',
 physical_condition TEXT NOT NULL DEFAULT '',
 promised_date TEXT,
 technician TEXT NOT NULL DEFAULT '',
 warranty_days INTEGER NOT NULL DEFAULT 0,
 delivered_at TEXT,
 cancel_reason TEXT NOT NULL DEFAULT '',
 CHECK (service_cents>=0 AND parts_cents>=0 AND review_cents>=0),
 CHECK (currency IN ('MXN','USD')),
 CHECK (status IN ('nueva','proceso','esperando_refaccion','terminada','entregada','cancelada')),
 CHECK (warranty_days>=0)
);
INSERT INTO orders_new (id,creation_key,created_at,updated_at,first_name,last_name,phone,brand,model,problem,repair_type,notes,currency,service_cents,parts_cents,review_cents,review_usd_cents,apply_review,exchange_rate,revision,status,quote_id,legacy_order_number,legacy_order_date,legacy_status)
 SELECT id,creation_key,created_at,updated_at,first_name,last_name,phone,brand,model,problem,repair_type,notes,currency,service_cents,parts_cents,review_cents,review_usd_cents,apply_review,exchange_rate,revision,status,quote_id,legacy_order_number,legacy_order_date,legacy_status FROM orders;
DROP TABLE orders;
ALTER TABLE orders_new RENAME TO orders;
CREATE INDEX idx_orders_status ON orders(status);
CREATE UNIQUE INDEX idx_orders_quote_id ON orders(quote_id);
CREATE UNIQUE INDEX idx_orders_legacy_order_number ON orders(legacy_order_number);
ALTER TABLE settings ADD COLUMN wa_template_ready TEXT NOT NULL DEFAULT 'Hola {cliente}, tu equipo {equipo} está listo para entregar. Tu saldo es {saldo}. — {taller}';
ALTER TABLE settings ADD COLUMN wa_template_quote TEXT NOT NULL DEFAULT 'Hola {cliente}, te compartimos el presupuesto {folio} para {equipo}. Total: {saldo}. — {taller}';
ALTER TABLE settings ADD COLUMN wa_template_reminder TEXT NOT NULL DEFAULT 'Hola {cliente}, te recordamos que el saldo de tu equipo {equipo} es {saldo}. — {taller}';
PRAGMA foreign_keys=ON;
PRAGMA foreign_key_check;
