-- Leave was stored as onVacation; it is onLeave from here on, with the same since.
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_employees` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`availability` text NOT NULL,
	`vacation_since` integer,
	`leave_since` integer,
	`hired_at` integer NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "employees_availability" CHECK("__new_employees"."availability" in ('available', 'onVacation', 'onLeave'))
);
--> statement-breakpoint
INSERT INTO `__new_employees`("id", "company_id", "name", "role", "availability", "vacation_since", "leave_since", "hired_at") SELECT "id", "company_id", "name", "role", CASE "availability" WHEN 'onVacation' THEN 'onLeave' ELSE "availability" END, "vacation_since", "vacation_since", "hired_at" FROM `employees`;--> statement-breakpoint
DROP TABLE `employees`;--> statement-breakpoint
ALTER TABLE `__new_employees` RENAME TO `employees`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_employees_company` ON `employees` (`company_id`);