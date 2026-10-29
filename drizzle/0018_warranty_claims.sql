-- Manual, order-linked warranty follow-up. This records the workshop's own
-- handling without deciding legal eligibility or coverage.
CREATE TABLE warranty_claims (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 request_key TEXT NOT NULL UNIQUE,
 order_id INTEGER NOT NULL REFERENCES orders(id),
 reason TEXT NOT NULL CHECK(length(trim(reason)) BETWEEN 1 AND 2000),
 status TEXT NOT NULL DEFAULT 'recibida'
   CHECK(status IN ('recibida','en_revision','esperando_pieza','resuelta','cerrada')),
 outcome TEXT NOT NULL DEFAULT '' CHECK(length(outcome)<=2000),
 revision INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 CHECK(status NOT IN ('resuelta','cerrada') OR length(trim(outcome))>0)
);
CREATE INDEX idx_warranty_claims_order ON warranty_claims(order_id,created_at);
CREATE INDEX idx_warranty_claims_status ON warranty_claims(status);

CREATE TRIGGER warranty_claims_no_delete BEFORE DELETE ON warranty_claims
BEGIN SELECT RAISE(ABORT,'El historial de garantía es inmutable.'); END;
