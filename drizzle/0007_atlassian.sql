PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`task_id` text NOT NULL,
	`agent_id` text NOT NULL,
	`session_id` text,
	`state` text NOT NULL,
	`end` text,
	`denied_command` text,
	`cost_usd` real DEFAULT 0 NOT NULL,
	`memories_used` text DEFAULT '[]' NOT NULL,
	`suggestions` text DEFAULT '[]' NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "runs_state" CHECK("__new_runs"."state" in ('starting', 'running', 'ended')),
	CONSTRAINT "runs_end" CHECK("__new_runs"."end" is null or "__new_runs"."end" in ('finished', 'denied', 'writeDenied', 'budgetReached', 'failed', 'stopped', 'disconnected')),
	CONSTRAINT "runs_ended" CHECK(("__new_runs"."state" = 'ended') = ("__new_runs"."end" is not null and "__new_runs"."ended_at" is not null)),
	CONSTRAINT "runs_denied" CHECK(("__new_runs"."end" in ('denied', 'writeDenied')) = ("__new_runs"."denied_command" is not null))
);
--> statement-breakpoint
INSERT INTO `__new_runs`("id", "company_id", "task_id", "agent_id", "session_id", "state", "end", "denied_command", "cost_usd", "memories_used", "suggestions", "started_at", "ended_at") SELECT "id", "company_id", "task_id", "agent_id", "session_id", "state", "end", "denied_command", "cost_usd", "memories_used", "suggestions", "started_at", "ended_at" FROM `runs`;--> statement-breakpoint
DROP TABLE `runs`;--> statement-breakpoint
ALTER TABLE `__new_runs` RENAME TO `runs`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_runs_company` ON `runs` (`company_id`,`started_at`);--> statement-breakpoint
ALTER TABLE `projects` ADD `atlassian` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `writes` text DEFAULT '[]' NOT NULL;