CREATE TABLE `part_quotes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`supplier_id` integer NOT NULL,
	`part_request_id` integer,
	`brand` text NOT NULL,
	`model` text NOT NULL,
	`part_name` text NOT NULL,
	`quality` text DEFAULT '' NOT NULL,
	`availability` text DEFAULT 'por_confirmar' NOT NULL,
	`warranty` text DEFAULT '' NOT NULL,
	`cost_cents` integer NOT NULL,
	`client_price_cents` integer,
	`currency` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`quoted_at` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`part_request_id`) REFERENCES `part_requests`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "quote_part_cost_positive" CHECK("part_quotes"."cost_cents">=0),
	CONSTRAINT "quote_part_client_price_positive" CHECK("part_quotes"."client_price_cents" IS NULL OR "part_quotes"."client_price_cents">=0),
	CONSTRAINT "quote_part_currency" CHECK("part_quotes"."currency" IN ('MXN','USD')),
	CONSTRAINT "quote_part_availability" CHECK("part_quotes"."availability" IN ('por_confirmar','disponible','agotada','bajo_pedido'))
);
--> statement-breakpoint
CREATE INDEX `idx_part_quotes_model` ON `part_quotes` (`brand`,`model`,`part_name`);--> statement-breakpoint
CREATE INDEX `idx_part_quotes_supplier` ON `part_quotes` (`supplier_id`);--> statement-breakpoint
CREATE TABLE `price_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`part_request_id` integer,
	`brand` text NOT NULL,
	`model` text NOT NULL,
	`part_name` text NOT NULL,
	`status` text DEFAULT 'pendiente' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`part_request_id`) REFERENCES `part_requests`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "price_request_status" CHECK("price_requests"."status" IN ('pendiente','atendida'))
);
--> statement-breakpoint
CREATE INDEX `idx_price_requests_status` ON `price_requests` (`status`);--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_suppliers_name` ON `suppliers` (`name`);