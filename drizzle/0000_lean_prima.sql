CREATE TABLE `companies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`founded_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`availability` text NOT NULL,
	`hired_at` integer NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "employees_availability" CHECK("employees"."availability" in ('available', 'onVacation'))
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`status` text NOT NULL,
	`priority` text NOT NULL,
	`assignee_id` text,
	`estimated_duration` integer NOT NULL,
	`created_at` integer NOT NULL,
	`started_at` integer,
	`completed_at` integer,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assignee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "tasks_status" CHECK("tasks"."status" in ('backlog', 'ready', 'working', 'done')),
	CONSTRAINT "tasks_priority" CHECK("tasks"."priority" in ('low', 'normal', 'high')),
	CONSTRAINT "tasks_estimated_duration" CHECK("tasks"."estimated_duration" > 0),
	CONSTRAINT "tasks_started_at" CHECK("tasks"."status" <> 'working' or "tasks"."started_at" is not null),
	CONSTRAINT "tasks_completed_at" CHECK("tasks"."status" <> 'done' or "tasks"."completed_at" is not null)
);
--> statement-breakpoint
CREATE INDEX `idx_tasks_company_status` ON `tasks` (`company_id`,`status`);