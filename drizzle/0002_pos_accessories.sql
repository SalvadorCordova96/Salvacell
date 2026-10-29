CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sku` text DEFAULT '' NOT NULL,
	`name` text NOT NULL,
	`category` text DEFAULT '' NOT NULL,
	`price_cents` integer NOT NULL,
	`currency` text DEFAULT 'MXN' NOT NULL,
	`stock` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "product_price_positive" CHECK("products"."price_cents">=0),
	CONSTRAINT "product_stock_positive" CHECK("products"."stock">=0),
	CONSTRAINT "product_currency" CHECK("products"."currency" IN ('MXN','USD'))
);
--> statement-breakpoint
CREATE INDEX `idx_products_name` ON `products` (`name`);--> statement-breakpoint
CREATE TABLE `sale_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sale_id` integer NOT NULL,
	`product_id` integer,
	`product_name` text NOT NULL,
	`sku` text DEFAULT '' NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price_cents` integer NOT NULL,
	`subtotal_cents` integer NOT NULL,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "sale_item_quantity_positive" CHECK("sale_items"."quantity">0),
	CONSTRAINT "sale_item_price_positive" CHECK("sale_items"."unit_price_cents">=0)
);
--> statement-breakpoint
CREATE INDEX `idx_sale_items_sale_id` ON `sale_items` (`sale_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_sale_items_sale_product` ON `sale_items` (`sale_id`,`product_id`);--> statement-breakpoint
CREATE TABLE `sales` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`creation_key` text NOT NULL,
	`created_at` text NOT NULL,
	`method` text NOT NULL,
	`currency` text NOT NULL,
	`total_cents` integer NOT NULL,
	`amount_received_cents` integer NOT NULL,
	`change_cents` integer DEFAULT 0 NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	CONSTRAINT "sale_total_positive" CHECK("sales"."total_cents">0),
	CONSTRAINT "sale_change_positive" CHECK("sales"."change_cents">=0),
	CONSTRAINT "sale_currency" CHECK("sales"."currency" IN ('MXN','USD'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sales_creation_key_unique` ON `sales` (`creation_key`);--> statement-breakpoint
CREATE INDEX `idx_sales_created_at` ON `sales` (`created_at`);
