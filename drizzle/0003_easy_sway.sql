CREATE TABLE `part_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'por_verificar' NOT NULL,
	`internal_cost_cents` integer,
	`supplier` text DEFAULT '' NOT NULL,
	`quality` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "part_status" CHECK("part_requests"."status" IN ('por_verificar','solicitada','disponible','no_disponible')),
	CONSTRAINT "part_internal_cost" CHECK("part_requests"."internal_cost_cents" IS NULL OR "part_requests"."internal_cost_cents">=0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `part_requests_order_id_unique` ON `part_requests` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_part_requests_status` ON `part_requests` (`status`);