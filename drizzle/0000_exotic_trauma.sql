CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`creation_key` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`phone` text NOT NULL,
	`brand` text NOT NULL,
	`model` text NOT NULL,
	`problem` text DEFAULT '' NOT NULL,
	`repair_type` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`currency` text DEFAULT 'MXN' NOT NULL,
	`service_cents` integer DEFAULT 0 NOT NULL,
	`parts_cents` integer DEFAULT 0 NOT NULL,
	`review_cents` integer DEFAULT 0 NOT NULL,
	`review_usd_cents` integer DEFAULT 500 NOT NULL,
	`apply_review` integer DEFAULT 0 NOT NULL,
	`exchange_rate` real,
	`revision` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'nueva' NOT NULL,
	`quote_id` integer,
	FOREIGN KEY (`quote_id`) REFERENCES `quotes`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "order_costs_positive" CHECK("orders"."service_cents">=0 AND "orders"."parts_cents">=0 AND "orders"."review_cents">=0),
	CONSTRAINT "order_currency" CHECK("orders"."currency" IN ('MXN','USD')),
	CONSTRAINT "order_status" CHECK("orders"."status" IN ('nueva','proceso','terminada'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_creation_key_unique` ON `orders` (`creation_key`);--> statement-breakpoint
CREATE INDEX `idx_orders_status` ON `orders` (`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_orders_quote_id` ON `orders` (`quote_id`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`request_key` text NOT NULL,
	`order_id` integer NOT NULL,
	`amount_cents` integer NOT NULL,
	`kind` text DEFAULT 'pago' NOT NULL,
	`method` text DEFAULT 'efectivo' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "payment_positive" CHECK("payments"."amount_cents">0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payments_request_key_unique` ON `payments` (`request_key`);--> statement-breakpoint
CREATE INDEX `idx_payments_order_id` ON `payments` (`order_id`);--> statement-breakpoint
CREATE TABLE `quotes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`creation_key` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`phone` text NOT NULL,
	`brand` text NOT NULL,
	`model` text NOT NULL,
	`problem` text DEFAULT '' NOT NULL,
	`repair_type` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`currency` text DEFAULT 'MXN' NOT NULL,
	`service_cents` integer DEFAULT 0 NOT NULL,
	`parts_cents` integer DEFAULT 0 NOT NULL,
	`review_cents` integer DEFAULT 0 NOT NULL,
	`review_usd_cents` integer DEFAULT 500 NOT NULL,
	`apply_review` integer DEFAULT 0 NOT NULL,
	`exchange_rate` real,
	`revision` integer DEFAULT 1 NOT NULL,
	CONSTRAINT "quote_costs_positive" CHECK("quotes"."service_cents">=0 AND "quotes"."parts_cents">=0 AND "quotes"."review_cents">=0),
	CONSTRAINT "quote_currency" CHECK("quotes"."currency" IN ('MXN','USD'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `quotes_creation_key_unique` ON `quotes` (`creation_key`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`workshop_name` text DEFAULT 'Salvacel' NOT NULL,
	`default_currency` text DEFAULT 'MXN' NOT NULL,
	`review_usd_cents` integer DEFAULT 500 NOT NULL,
	`exchange_rate` real,
	`revision` integer DEFAULT 1 NOT NULL
);
