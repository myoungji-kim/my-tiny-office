PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_employees` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`name` text NOT NULL,
	`species` text NOT NULL,
	`role_id` text NOT NULL,
	`team_id` text,
	`availability` text NOT NULL,
	`leave_since` integer,
	`hired_at` integer NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "employees_availability" CHECK("__new_employees"."availability" in ('available', 'onLeave'))
);
--> statement-breakpoint
INSERT INTO `__new_employees`("id", "company_id", "name", "species", "role_id", "team_id", "availability", "leave_since", "hired_at") SELECT "id", "company_id", "name", "species", "role_id", "team_id", "availability", "leave_since", "hired_at" FROM `employees`;--> statement-breakpoint
DROP TABLE `employees`;--> statement-breakpoint
ALTER TABLE `__new_employees` RENAME TO `employees`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_employees_company` ON `employees` (`company_id`);