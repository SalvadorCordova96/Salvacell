ALTER TABLE `orders` ADD `legacy_order_number` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `legacy_order_date` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `legacy_status` text;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_orders_legacy_order_number` ON `orders` (`legacy_order_number`);