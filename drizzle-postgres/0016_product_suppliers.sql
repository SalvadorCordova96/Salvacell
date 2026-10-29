CREATE TABLE product_suppliers (
  product_id integer NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supplier_id integer NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  created_at text NOT NULL,
  PRIMARY KEY (product_id, supplier_id)
);
--> statement-breakpoint
CREATE INDEX idx_product_suppliers_supplier ON product_suppliers(supplier_id, product_id);
