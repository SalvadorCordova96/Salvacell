ALTER TABLE `sales` ADD COLUMN `order_id` integer REFERENCES `orders`(`id`);--> statement-breakpoint
ALTER TABLE `sales` ADD COLUMN `order_payment_cents` integer NOT NULL DEFAULT 0 CHECK (`order_payment_cents`>=0);--> statement-breakpoint
CREATE INDEX `idx_sales_order_id` ON `sales` (`order_id`);--> statement-breakpoint
