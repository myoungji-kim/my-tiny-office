CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`folder` text,
	`commands` text DEFAULT '[]' NOT NULL,
	`status` text NOT NULL,
	`priority` text NOT NULL,
	`held_reason` text,
	`created_at` integer NOT NULL,
	`started_at` integer,
	`finished_at` integer,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "projects_status" CHECK("projects"."status" in ('planned', 'active', 'held', 'done')),
	CONSTRAINT "projects_priority" CHECK("projects"."priority" in ('low', 'normal', 'high')),
	CONSTRAINT "projects_folder" CHECK("projects"."status" = 'planned' or "projects"."folder" is not null),
	CONSTRAINT "projects_held_reason" CHECK("projects"."status" <> 'held' or "projects"."held_reason" is not null),
	CONSTRAINT "projects_finished_at" CHECK("projects"."status" <> 'done' or "projects"."finished_at" is not null)
);
--> statement-breakpoint
CREATE INDEX `idx_projects_company` ON `projects` (`company_id`);--> statement-breakpoint
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
	`changes_requested` text,
	`created_at` integer NOT NULL,
	`started_at` integer,
	`worked_for` integer DEFAULT 0 NOT NULL,
	`running_since` integer,
	`finished_at` integer,
	`applied_at` integer,
	`estimated_duration` integer,
	`completed_at` integer,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assignee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "tasks_status" CHECK("__new_tasks"."status" in ('backlog', 'working', 'approval', 'done', 'held')),
	CONSTRAINT "tasks_priority" CHECK("__new_tasks"."priority" in ('low', 'normal', 'high')),
	CONSTRAINT "tasks_worked_for" CHECK("__new_tasks"."worked_for" >= 0),
	CONSTRAINT "tasks_working" CHECK("__new_tasks"."status" <> 'working' or ("__new_tasks"."assignee_id" is not null and "__new_tasks"."started_at" is not null)),
	CONSTRAINT "tasks_running" CHECK("__new_tasks"."running_since" is null or "__new_tasks"."status" = 'working'),
	CONSTRAINT "tasks_held" CHECK("__new_tasks"."status" <> 'held' or ("__new_tasks"."held_reason" is not null and "__new_tasks"."held_from" is not null)),
	CONSTRAINT "tasks_finished" CHECK("__new_tasks"."status" not in ('approval', 'done') or "__new_tasks"."finished_at" is not null),
	CONSTRAINT "tasks_applied" CHECK("__new_tasks"."status" <> 'done' or "__new_tasks"."applied_at" is not null)
);
--> statement-breakpoint
-- Tasks made before projects existed move into one planned project per company,
-- nothing dropped. The simulated "ready" and "working" had no agent behind them,
-- so both go back to the backlog with their assignee kept.
INSERT INTO `projects`("id", "company_id", "name", "status", "priority", "created_at")
SELECT 'moved-' || "id", "id", 'Tasks', 'planned', 'normal', "founded_at" FROM `companies`
WHERE EXISTS (SELECT 1 FROM `tasks` WHERE `tasks`."company_id" = `companies`."id");--> statement-breakpoint
INSERT INTO `__new_tasks`("id", "company_id", "project_id", "title", "description", "priority", "assignee_id", "status", "created_at", "started_at", "worked_for", "finished_at", "applied_at", "estimated_duration", "completed_at")
SELECT "id", "company_id", 'moved-' || "company_id", "title", "description", "priority", "assignee_id",
  CASE "status" WHEN 'done' THEN 'done' ELSE 'backlog' END,
  "created_at", "started_at",
  CASE WHEN "status" = 'done' AND "started_at" IS NOT NULL THEN "completed_at" - "started_at" ELSE 0 END,
  CASE "status" WHEN 'done' THEN "completed_at" END,
  CASE "status" WHEN 'done' THEN "completed_at" END,
  "estimated_duration", "completed_at"
FROM `tasks`;--> statement-breakpoint
DROP TABLE `tasks`;--> statement-breakpoint
ALTER TABLE `__new_tasks` RENAME TO `tasks`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_tasks_company_status` ON `tasks` (`company_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_tasks_project` ON `tasks` (`project_id`);--> statement-breakpoint
ALTER TABLE `employees` ADD `vacation_since` integer;