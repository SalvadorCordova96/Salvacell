ALTER TABLE suppliers
  ADD COLUMN supplies_parts integer NOT NULL DEFAULT 0 CHECK (supplies_parts IN (0,1)),
  ADD COLUMN supplies_accessories integer NOT NULL DEFAULT 0 CHECK (supplies_accessories IN (0,1));
