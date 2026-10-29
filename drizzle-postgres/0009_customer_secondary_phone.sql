ALTER TABLE customers ADD COLUMN phone_additional text NOT NULL DEFAULT '';
--> statement-breakpoint
CREATE INDEX idx_customers_phone_additional ON customers(phone_additional);
