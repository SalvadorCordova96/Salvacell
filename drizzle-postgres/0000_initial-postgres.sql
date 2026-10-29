CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity" text NOT NULL,
	"entity_id" integer,
	"action" text NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"active" integer DEFAULT 1 NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "brands_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_repairs" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"repair_type" text NOT NULL,
	"problem" text DEFAULT '' NOT NULL,
	"diagnosis" text DEFAULT '' NOT NULL,
	"solution" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"service_cents" integer DEFAULT 0 NOT NULL,
	"parts_cents" integer DEFAULT 0 NOT NULL,
	"review_cents" integer DEFAULT 0 NOT NULL,
	"part_name" text DEFAULT '' NOT NULL,
	"part_cost_cents" integer,
	"supplier_id" integer,
	"supplier_name" text DEFAULT '' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "order_repair_prices" CHECK ("order_repairs"."service_cents">=0 AND "order_repairs"."parts_cents">=0 AND "order_repairs"."review_cents">=0 AND ("order_repairs"."part_cost_cents" IS NULL OR "order_repairs"."part_cost_cents">=0))
);
--> statement-breakpoint
CREATE TABLE "order_resolutions" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_key" text NOT NULL,
	"order_id" integer NOT NULL,
	"payment_id" integer,
	"kind" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text NOT NULL,
	"method" text,
	"reason" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "order_resolutions_request_key_unique" UNIQUE("request_key"),
	CONSTRAINT "resolution_kind" CHECK ("order_resolutions"."kind" IN ('cancel','refund')),
	CONSTRAINT "resolution_amount" CHECK ((("order_resolutions"."kind"='cancel' AND "order_resolutions"."amount_cents"=0 AND "order_resolutions"."method" IS NULL) OR ("order_resolutions"."kind"='refund' AND "order_resolutions"."amount_cents">0 AND "order_resolutions"."method" IN ('efectivo','transferencia','tarjeta','otro')))),
	CONSTRAINT "resolution_currency" CHECK ("order_resolutions"."currency" IN ('MXN','USD')),
	CONSTRAINT "resolution_reason" CHECK (length(trim("order_resolutions"."reason")) BETWEEN 1 AND 500),
	CONSTRAINT "resolution_order_aggregate" CHECK ("order_resolutions"."payment_id" IS NULL)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"creation_key" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"phone" text NOT NULL,
	"brand" text NOT NULL,
	"model" text NOT NULL,
	"problem" text DEFAULT '' NOT NULL,
	"repair_type" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"currency" text DEFAULT 'MXN' NOT NULL,
	"service_cents" integer DEFAULT 0 NOT NULL,
	"parts_cents" integer DEFAULT 0 NOT NULL,
	"review_cents" integer DEFAULT 0 NOT NULL,
	"review_usd_cents" integer DEFAULT 500 NOT NULL,
	"apply_review" integer DEFAULT 0 NOT NULL,
	"exchange_rate" real,
	"revision" integer DEFAULT 1 NOT NULL,
	"customer_id" integer,
	"reception_id" integer,
	"device_type" text DEFAULT 'movil' NOT NULL,
	"status" text DEFAULT 'nueva' NOT NULL,
	"quote_id" integer,
	"legacy_order_number" text,
	"legacy_order_date" text,
	"legacy_status" text,
	"imei" text DEFAULT '' NOT NULL,
	"unlock_code" text DEFAULT '' NOT NULL,
	"accessories_left" text DEFAULT '' NOT NULL,
	"physical_condition" text DEFAULT '' NOT NULL,
	"promised_date" text,
	"technician" text DEFAULT '' NOT NULL,
	"warranty_days" integer DEFAULT 0 NOT NULL,
	"delivered_at" text,
	"cancel_reason" text DEFAULT '' NOT NULL,
	CONSTRAINT "orders_creation_key_unique" UNIQUE("creation_key"),
	CONSTRAINT "order_costs_positive" CHECK ("orders"."service_cents">=0 AND "orders"."parts_cents">=0 AND "orders"."review_cents">=0),
	CONSTRAINT "order_currency" CHECK ("orders"."currency" IN ('MXN','USD')),
	CONSTRAINT "order_status" CHECK ("orders"."status" IN ('nueva','proceso','esperando_refaccion','terminada','entregada','cancelada')),
	CONSTRAINT "order_warranty_days" CHECK ("orders"."warranty_days">=0)
);
--> statement-breakpoint
CREATE TABLE "part_quotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_id" integer NOT NULL,
	"part_request_id" integer,
	"brand" text NOT NULL,
	"model" text NOT NULL,
	"part_name" text NOT NULL,
	"quality" text DEFAULT '' NOT NULL,
	"availability" text DEFAULT 'por_confirmar' NOT NULL,
	"warranty" text DEFAULT '' NOT NULL,
	"cost_cents" integer NOT NULL,
	"client_price_cents" integer,
	"currency" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"quoted_at" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "quote_part_cost_positive" CHECK ("part_quotes"."cost_cents">=0),
	CONSTRAINT "quote_part_client_price_positive" CHECK ("part_quotes"."client_price_cents" IS NULL OR "part_quotes"."client_price_cents">=0),
	CONSTRAINT "quote_part_currency" CHECK ("part_quotes"."currency" IN ('MXN','USD')),
	CONSTRAINT "quote_part_availability" CHECK ("part_quotes"."availability" IN ('por_confirmar','disponible','agotada','bajo_pedido'))
);
--> statement-breakpoint
CREATE TABLE "part_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"repair_id" integer,
	"name" text NOT NULL,
	"status" text DEFAULT 'por_verificar' NOT NULL,
	"internal_cost_cents" integer,
	"supplier" text DEFAULT '' NOT NULL,
	"quality" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "part_status" CHECK ("part_requests"."status" IN ('por_verificar','solicitada','disponible','no_disponible')),
	CONSTRAINT "part_internal_cost" CHECK ("part_requests"."internal_cost_cents" IS NULL OR "part_requests"."internal_cost_cents">=0)
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"active" integer DEFAULT 1 NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "payment_methods_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_key" text NOT NULL,
	"order_id" integer NOT NULL,
	"amount_cents" integer NOT NULL,
	"kind" text DEFAULT 'pago' NOT NULL,
	"method" text DEFAULT 'efectivo' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" text NOT NULL,
	"voided_at" text,
	"void_reason" text DEFAULT '' NOT NULL,
	CONSTRAINT "payments_request_key_unique" UNIQUE("request_key"),
	CONSTRAINT "payment_positive" CHECK ("payments"."amount_cents">0)
);
--> statement-breakpoint
CREATE TABLE "price_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"part_request_id" integer,
	"brand" text NOT NULL,
	"model" text NOT NULL,
	"part_name" text NOT NULL,
	"status" text DEFAULT 'pendiente' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "price_request_status" CHECK ("price_requests"."status" IN ('pendiente','atendida'))
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"sku" text DEFAULT '' NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"price_cents" integer NOT NULL,
	"cost_cents" integer,
	"currency" text DEFAULT 'MXN' NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"active" integer DEFAULT 1 NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "product_price_positive" CHECK ("products"."price_cents">=0),
	CONSTRAINT "product_stock_positive" CHECK ("products"."stock">=0),
	CONSTRAINT "product_currency" CHECK ("products"."currency" IN ('MXN','USD'))
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"creation_key" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"phone" text NOT NULL,
	"brand" text NOT NULL,
	"model" text NOT NULL,
	"problem" text DEFAULT '' NOT NULL,
	"repair_type" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"currency" text DEFAULT 'MXN' NOT NULL,
	"service_cents" integer DEFAULT 0 NOT NULL,
	"parts_cents" integer DEFAULT 0 NOT NULL,
	"review_cents" integer DEFAULT 0 NOT NULL,
	"review_usd_cents" integer DEFAULT 500 NOT NULL,
	"apply_review" integer DEFAULT 0 NOT NULL,
	"exchange_rate" real,
	"revision" integer DEFAULT 1 NOT NULL,
	"valid_until" text,
	CONSTRAINT "quotes_creation_key_unique" UNIQUE("creation_key"),
	CONSTRAINT "quote_costs_positive" CHECK ("quotes"."service_cents">=0 AND "quotes"."parts_cents">=0 AND "quotes"."review_cents">=0),
	CONSTRAINT "quote_currency" CHECK ("quotes"."currency" IN ('MXN','USD'))
);
--> statement-breakpoint
CREATE TABLE "receptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"creation_key" text NOT NULL,
	"customer_id" integer NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "receptions_creation_key_unique" UNIQUE("creation_key")
);
--> statement-breakpoint
CREATE TABLE "restore_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" text NOT NULL,
	"payload" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sale_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"sale_id" integer NOT NULL,
	"product_id" integer,
	"product_name" text NOT NULL,
	"sku" text DEFAULT '' NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"subtotal_cents" integer NOT NULL,
	CONSTRAINT "sale_item_quantity_positive" CHECK ("sale_items"."quantity">0),
	CONSTRAINT "sale_item_price_positive" CHECK ("sale_items"."unit_price_cents">=0)
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" serial PRIMARY KEY NOT NULL,
	"creation_key" text NOT NULL,
	"created_at" text NOT NULL,
	"method" text NOT NULL,
	"currency" text NOT NULL,
	"total_cents" integer NOT NULL,
	"amount_received_cents" integer NOT NULL,
	"change_cents" integer DEFAULT 0 NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"order_id" integer,
	"customer_id" integer,
	"order_payment_cents" integer DEFAULT 0 NOT NULL,
	"voided_at" text,
	"void_reason" text DEFAULT '' NOT NULL,
	"discount_cents" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "sales_creation_key_unique" UNIQUE("creation_key"),
	CONSTRAINT "sale_total_positive" CHECK ("sales"."total_cents">0),
	CONSTRAINT "sale_change_positive" CHECK ("sales"."change_cents">=0),
	CONSTRAINT "sale_currency" CHECK ("sales"."currency" IN ('MXN','USD')),
	CONSTRAINT "sale_order_payment_positive" CHECK ("sales"."order_payment_cents">=0)
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"base_price_cents" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'MXN' NOT NULL,
	"warranty_days" integer DEFAULT 0 NOT NULL,
	"active" integer DEFAULT 1 NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "services_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"created_at" text NOT NULL,
	"expires_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY NOT NULL,
	"workshop_name" text DEFAULT 'Salvacel' NOT NULL,
	"default_currency" text DEFAULT 'MXN' NOT NULL,
	"review_usd_cents" integer DEFAULT 500 NOT NULL,
	"exchange_rate" real,
	"revision" integer DEFAULT 1 NOT NULL,
	"logo_data_url" text,
	"phone" text DEFAULT '686 226 2377' NOT NULL,
	"whatsapp" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"city" text DEFAULT 'Mexicali, Baja California' NOT NULL,
	"timezone" text DEFAULT 'America/Tijuana' NOT NULL,
	"ticket_order_note" text DEFAULT 'Conserva este ticket para recoger tu equipo.' NOT NULL,
	"ticket_payment_note" text DEFAULT 'Gracias por tu pago.' NOT NULL,
	"ticket_sale_note" text DEFAULT 'Gracias por tu compra.' NOT NULL,
	"ticket_paper_mm" integer DEFAULT 58 NOT NULL,
	"low_stock_threshold" integer DEFAULT 3 NOT NULL,
	"quote_stale_days" integer DEFAULT 30 NOT NULL,
	"folio_prefix_order" text DEFAULT 'SC' NOT NULL,
	"folio_prefix_quote" text DEFAULT 'PR' NOT NULL,
	"folio_prefix_sale" text DEFAULT 'VTA' NOT NULL,
	"last_backup_at" text,
	"backup_warning_days" integer DEFAULT 7 NOT NULL,
	"wa_template_ready" text DEFAULT 'Hola {cliente}, tu equipo {equipo} está listo para entregar. Tu saldo es {saldo}. — {taller}' NOT NULL,
	"wa_template_quote" text DEFAULT 'Hola {cliente}, te compartimos el presupuesto {folio} para {equipo}. Total: {saldo}. — {taller}' NOT NULL,
	"wa_template_reminder" text DEFAULT 'Hola {cliente}, te recordamos que el saldo de tu equipo {equipo} es {saldo}. — {taller}' NOT NULL,
	"overdue_days" integer DEFAULT 15 NOT NULL,
	"quote_valid_days" integer DEFAULT 7 NOT NULL,
	"pin_hash" text,
	"pin_salt" text,
	"pin_enabled" integer DEFAULT 0 NOT NULL,
	"pin_idle_minutes" integer DEFAULT 10 NOT NULL,
	"warranty_terms" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"delta" integer NOT NULL,
	"reason" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"active" integer DEFAULT 1 NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warranty_claims" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_key" text NOT NULL,
	"order_id" integer NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'recibida' NOT NULL,
	"outcome" text DEFAULT '' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "warranty_claims_request_key_unique" UNIQUE("request_key"),
	CONSTRAINT "warranty_claim_status" CHECK ("warranty_claims"."status" IN ('recibida','en_revision','esperando_pieza','resuelta','cerrada')),
	CONSTRAINT "warranty_claim_text" CHECK (length(trim("warranty_claims"."reason")) BETWEEN 1 AND 2000 AND length("warranty_claims"."outcome")<=2000),
	CONSTRAINT "warranty_claim_closed_outcome" CHECK ("warranty_claims"."status" NOT IN ('resuelta','cerrada') OR length(trim("warranty_claims"."outcome"))>0)
);
--> statement-breakpoint
ALTER TABLE "order_repairs" ADD CONSTRAINT "order_repairs_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_repairs" ADD CONSTRAINT "order_repairs_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_resolutions" ADD CONSTRAINT "order_resolutions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_resolutions" ADD CONSTRAINT "order_resolutions_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_reception_id_receptions_id_fk" FOREIGN KEY ("reception_id") REFERENCES "public"."receptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part_quotes" ADD CONSTRAINT "part_quotes_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part_quotes" ADD CONSTRAINT "part_quotes_part_request_id_part_requests_id_fk" FOREIGN KEY ("part_request_id") REFERENCES "public"."part_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part_requests" ADD CONSTRAINT "part_requests_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part_requests" ADD CONSTRAINT "part_requests_repair_id_order_repairs_id_fk" FOREIGN KEY ("repair_id") REFERENCES "public"."order_repairs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_requests" ADD CONSTRAINT "price_requests_part_request_id_part_requests_id_fk" FOREIGN KEY ("part_request_id") REFERENCES "public"."part_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receptions" ADD CONSTRAINT "receptions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_log_created" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_customers_name" ON "customers" USING btree ("last_name","first_name");--> statement-breakpoint
CREATE INDEX "idx_customers_phone" ON "customers" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "idx_order_repairs_order" ON "order_repairs" USING btree ("order_id","position");--> statement-breakpoint
CREATE INDEX "idx_order_resolutions_order" ON "order_resolutions" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_order_resolutions_payment" ON "order_resolutions" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "idx_orders_status" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_orders_quote_id" ON "orders" USING btree ("quote_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_orders_legacy_order_number" ON "orders" USING btree ("legacy_order_number");--> statement-breakpoint
CREATE INDEX "idx_part_quotes_model" ON "part_quotes" USING btree ("brand","model","part_name");--> statement-breakpoint
CREATE INDEX "idx_part_quotes_supplier" ON "part_quotes" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "idx_part_requests_order_id" ON "part_requests" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_part_requests_repair_id" ON "part_requests" USING btree ("repair_id");--> statement-breakpoint
CREATE INDEX "idx_part_requests_status" ON "part_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_payments_order_id" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_price_requests_status" ON "price_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_products_name" ON "products" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_receptions_customer" ON "receptions" USING btree ("customer_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_restore_snapshots_created" ON "restore_snapshots" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_sale_items_sale_id" ON "sale_items" USING btree ("sale_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_sale_items_sale_product" ON "sale_items" USING btree ("sale_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_sales_created_at" ON "sales" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_sales_order_id" ON "sales" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_sales_customer_id" ON "sales" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_expires" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_stock_movements_product" ON "stock_movements" USING btree ("product_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_suppliers_name" ON "suppliers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_warranty_claims_order" ON "warranty_claims" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_warranty_claims_status" ON "warranty_claims" USING btree ("status");