CREATE TABLE cash_outflows (
  id serial PRIMARY KEY,
  request_key text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('gasto','retiro_propietario')),
  label text NOT NULL CHECK (length(trim(label)) BETWEEN 1 AND 160),
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL CHECK (currency IN ('MXN','USD')),
  method text NOT NULL CHECK (method IN ('efectivo','transferencia','tarjeta','otro')),
  notes text NOT NULL DEFAULT '',
  recurring_expense_id integer,
  recurring_occurrence_id integer,
  created_at text NOT NULL,
  voided_at text,
  void_reason text NOT NULL DEFAULT ''
);
--> statement-breakpoint
CREATE INDEX idx_cash_outflows_date_method ON cash_outflows(created_at, currency, method) WHERE voided_at IS NULL;
--> statement-breakpoint
CREATE TABLE recurring_expenses (
  id serial PRIMARY KEY,
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 160),
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL CHECK (currency IN ('MXN','USD')),
  frequency text NOT NULL CHECK (frequency IN ('semanal','quincenal','mensual','anual')),
  next_due_on date NOT NULL,
  active integer NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  revision integer NOT NULL DEFAULT 1,
  created_at text NOT NULL,
  updated_at text NOT NULL
);
--> statement-breakpoint
CREATE INDEX idx_recurring_expenses_due ON recurring_expenses(active,next_due_on);
--> statement-breakpoint
CREATE TABLE recurring_expense_occurrences (
  id serial PRIMARY KEY,
  recurring_expense_id integer NOT NULL REFERENCES recurring_expenses(id),
  due_on date NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL CHECK (currency IN ('MXN','USD')),
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','pagada')),
  paid_at text,
  UNIQUE (recurring_expense_id,due_on),
  CHECK ((status='pendiente' AND paid_at IS NULL) OR (status='pagada' AND paid_at IS NOT NULL))
);
--> statement-breakpoint
CREATE INDEX idx_recurring_occurrences_status_due ON recurring_expense_occurrences(status,due_on,recurring_expense_id);
--> statement-breakpoint
ALTER TABLE cash_outflows ADD CONSTRAINT cash_outflows_recurring_expense_fk FOREIGN KEY (recurring_expense_id) REFERENCES recurring_expenses(id);
--> statement-breakpoint
ALTER TABLE cash_outflows ADD CONSTRAINT cash_outflows_recurring_occurrence_fk FOREIGN KEY (recurring_occurrence_id) REFERENCES recurring_expense_occurrences(id);
--> statement-breakpoint
CREATE UNIQUE INDEX uq_cash_outflow_recurring_occurrence ON cash_outflows(recurring_occurrence_id) WHERE recurring_occurrence_id IS NOT NULL;
--> statement-breakpoint
CREATE TABLE cash_closings (
  id serial PRIMARY KEY,
  request_key text NOT NULL UNIQUE,
  business_date date NOT NULL,
  currency text NOT NULL CHECK (currency IN ('MXN','USD')),
  method text NOT NULL CHECK (method IN ('efectivo','transferencia','tarjeta','otro')),
  opening_cents integer NOT NULL DEFAULT 0 CHECK (opening_cents >= 0),
  expected_cents integer NOT NULL,
  counted_cents integer NOT NULL CHECK (counted_cents >= 0),
  difference_cents integer NOT NULL CHECK (difference_cents = counted_cents - expected_cents),
  notes text NOT NULL DEFAULT '',
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at text NOT NULL,
  UNIQUE (business_date,currency,method,revision)
);
--> statement-breakpoint
CREATE INDEX idx_cash_closings_date ON cash_closings(business_date DESC,currency,method);
