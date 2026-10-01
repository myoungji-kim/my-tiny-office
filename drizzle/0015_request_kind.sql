PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`project_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`area` text,
	`priority` text NOT NULL,
	`assignee_id` text,
	`status` text NOT NULL,
	`blocker` text,
	`held_reason` text,
	`held_from` text,
	`held_with_project` integer DEFAULT false NOT NULL,
	`changes_requested` text,
	`reviewer_id` text,
	`created_at` integer NOT NULL,
	`started_at` integer,
	`worked_for` integer DEFAULT 0 NOT NULL,
	`running_since` integer,
	`finished_at` integer,
	`applied_at` integer,
	`published_url` text,
	`revised_at` integer,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`area`) REFERENCES `areas`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assignee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "tasks_status" CHECK("__new_tasks"."status" in ('backlog', 'working', 'approval', 'done', 'held')),
	CONSTRAINT "tasks_priority" CHECK("__new_tasks"."priority" in ('low', 'normal', 'high')),
	CONSTRAINT "tasks_held_from" CHECK("__new_tasks"."held_from" is null or "__new_tasks"."held_from" in ('backlog', 'working', 'approval')),
	CONSTRAINT "tasks_worked_for" CHECK("__new_tasks"."worked_for" >= 0),
	CONSTRAINT "tasks_working" CHECK("__new_tasks"."status" <> 'working' or ("__new_tasks"."assignee_id" is not null and "__new_tasks"."started_at" is not null)),
	CONSTRAINT "tasks_running" CHECK("__new_tasks"."running_since" is null or "__new_tasks"."status" = 'working'),
	CONSTRAINT "tasks_held" CHECK("__new_tasks"."status" <> 'held' or "__new_tasks"."held_from" is not null),
	CONSTRAINT "tasks_finished" CHECK("__new_tasks"."status" not in ('approval', 'done') or "__new_tasks"."finished_at" is not null),
	CONSTRAINT "tasks_applied" CHECK("__new_tasks"."status" <> 'done' or "__new_tasks"."applied_at" is not null)
);
--> statement-breakpoint
INSERT INTO `__new_tasks`("id", "company_id", "project_id", "title", "description", "area", "priority", "assignee_id", "status", "blocker", "held_reason", "held_from", "held_with_project", "changes_requested", "reviewer_id", "created_at", "started_at", "worked_for", "running_since", "finished_at", "applied_at", "published_url", "revised_at") SELECT "id", "company_id", "project_id", "title", "description", "area", "priority", "assignee_id", "status", "blocker", "held_reason", "held_from", "held_with_project", "changes_requested", "reviewer_id", "created_at", "started_at", "worked_for", "running_since", "finished_at", "applied_at", "published_url", "revised_at" FROM `tasks`;--> statement-breakpoint
DROP TABLE `tasks`;--> statement-breakpoint
ALTER TABLE `__new_tasks` RENAME TO `tasks`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_tasks_company_status` ON `tasks` (`company_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_tasks_project` ON `tasks` (`project_id`);--> statement-breakpoint
CREATE TABLE `__new_task_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`task_id` text NOT NULL,
	`at` integer NOT NULL,
	`text` text NOT NULL,
	`kind` text DEFAULT 'sentBack' NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "task_requests_kind" CHECK("__new_task_requests"."kind" in ('sentBack', 'note'))
);
--> statement-breakpoint
INSERT INTO `__new_task_requests`("id", "company_id", "task_id", "at", "text") SELECT "id", "company_id", "task_id", "at", "text" FROM `task_requests`;--> statement-breakpoint
DROP TABLE `task_requests`;--> statement-breakpoint
ALTER TABLE `__new_task_requests` RENAME TO `task_requests`;--> statement-breakpoint
CREATE INDEX `idx_task_requests_task` ON `task_requests` (`task_id`,`at`);