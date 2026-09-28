CREATE TABLE `agents` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`runtime` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "agents_runtime" CHECK("agents"."runtime" in ('claudeCode'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agents_employee_id_unique` ON `agents` (`employee_id`);--> statement-breakpoint
CREATE INDEX `idx_agents_company` ON `agents` (`company_id`);--> statement-breakpoint
CREATE TABLE `run_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`task_id` text NOT NULL,
	`run_id` text NOT NULL,
	`at` integer NOT NULL,
	`kind` text NOT NULL,
	`detail` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`run_id`) REFERENCES `runs`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "run_steps_kind" CHECK("run_steps"."kind" in ('read', 'edit', 'run', 'say'))
);
--> statement-breakpoint
CREATE INDEX `idx_run_steps_task` ON `run_steps` (`task_id`,`at`);--> statement-breakpoint
CREATE TABLE `runs` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`task_id` text NOT NULL,
	`agent_id` text NOT NULL,
	`session_id` text,
	`state` text NOT NULL,
	`end` text,
	`denied_command` text,
	`cost_usd` real DEFAULT 0 NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "runs_state" CHECK("runs"."state" in ('starting', 'running', 'ended')),
	CONSTRAINT "runs_end" CHECK("runs"."end" is null or "runs"."end" in ('finished', 'denied', 'budgetReached', 'failed', 'stopped', 'disconnected')),
	CONSTRAINT "runs_ended" CHECK(("runs"."state" = 'ended') = ("runs"."end" is not null and "runs"."ended_at" is not null)),
	CONSTRAINT "runs_denied" CHECK(("runs"."end" = 'denied') = ("runs"."denied_command" is not null))
);
--> statement-breakpoint
CREATE INDEX `idx_runs_company` ON `runs` (`company_id`,`started_at`);