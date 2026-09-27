CREATE TABLE `areas` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`starting` text,
	`name` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "areas_starting" CHECK("areas"."starting" is null or "areas"."starting" in ('architecture', 'typeSafety', 'database', 'security', 'localization', 'product', 'quality')),
	CONSTRAINT "areas_named" CHECK("areas"."starting" is not null or "areas"."name" is not null)
);
--> statement-breakpoint
CREATE INDEX `idx_areas_company` ON `areas` (`company_id`);--> statement-breakpoint
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
	`species` text NOT NULL,
	`role_id` text NOT NULL,
	`team_id` text,
	`availability` text NOT NULL,
	`leave_since` integer,
	`hired_at` integer NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "employees_species" CHECK("employees"."species" in ('cat', 'fox', 'squirrel', 'bunny', 'dog', 'bear', 'panda', 'mouse', 'hamster', 'koala', 'chick', 'owl', 'sheep', 'hedgehog', 'duck', 'penguin', 'pig', 'cow', 'deer', 'frog')),
	CONSTRAINT "employees_availability" CHECK("employees"."availability" in ('available', 'onLeave')),
	CONSTRAINT "employees_leave" CHECK("employees"."availability" = 'onLeave' or "employees"."leave_since" is null)
);
--> statement-breakpoint
CREATE INDEX `idx_employees_company` ON `employees` (`company_id`);--> statement-breakpoint
CREATE TABLE `memories` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`kind` text NOT NULL,
	`employee_id` text,
	`area_id` text,
	`text` text NOT NULL,
	`source_task_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`area_id`) REFERENCES `areas`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "memories_kind" CHECK("memories"."kind" in ('expertise', 'style', 'company')),
	CONSTRAINT "memories_area" CHECK(("memories"."kind" = 'expertise') = ("memories"."area_id" is not null)),
	CONSTRAINT "memories_owner" CHECK(("memories"."kind" = 'company') = ("memories"."employee_id" is null))
);
--> statement-breakpoint
CREATE INDEX `idx_memories_company` ON `memories` (`company_id`);--> statement-breakpoint
CREATE TABLE `milestones` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`kind` text NOT NULL,
	`at` integer NOT NULL,
	`employee_id` text,
	`employee_name` text,
	`first` integer,
	`team_id` text,
	`count` integer,
	`project_id` text,
	`project_name` text,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "milestones_kind" CHECK("milestones"."kind" in ('founded', 'joined', 'teamFormed', 'firstTaskDone', 'tasksDone', 'firstReview', 'memories', 'projectFinished'))
);
--> statement-breakpoint
CREATE INDEX `idx_milestones_company` ON `milestones` (`company_id`,`at`);--> statement-breakpoint
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
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`task_id` text NOT NULL,
	`reviewer_id` text,
	`state` text NOT NULL,
	`created_at` integer NOT NULL,
	`started_at` integer,
	`settled_at` integer,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "reviews_state" CHECK("reviews"."state" in ('suggested', 'queued', 'reviewing', 'settled', 'withdrawn')),
	CONSTRAINT "reviews_reviewer" CHECK("reviews"."state" not in ('queued', 'reviewing', 'settled') or "reviews"."reviewer_id" is not null),
	CONSTRAINT "reviews_started" CHECK("reviews"."state" not in ('reviewing', 'settled') or "reviews"."started_at" is not null),
	CONSTRAINT "reviews_settled" CHECK("reviews"."state" <> 'settled' or "reviews"."settled_at" is not null)
);
--> statement-breakpoint
CREATE INDEX `idx_reviews_company` ON `reviews` (`company_id`);--> statement-breakpoint
CREATE TABLE `roles` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_roles_company` ON `roles` (`company_id`);--> statement-breakpoint
CREATE TABLE `tasks` (
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
	`created_at` integer NOT NULL,
	`started_at` integer,
	`worked_for` integer DEFAULT 0 NOT NULL,
	`running_since` integer,
	`finished_at` integer,
	`applied_at` integer,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`area`) REFERENCES `areas`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assignee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "tasks_status" CHECK("tasks"."status" in ('backlog', 'working', 'approval', 'done', 'held')),
	CONSTRAINT "tasks_priority" CHECK("tasks"."priority" in ('low', 'normal', 'high')),
	CONSTRAINT "tasks_held_from" CHECK("tasks"."held_from" is null or "tasks"."held_from" in ('backlog', 'working', 'approval')),
	CONSTRAINT "tasks_worked_for" CHECK("tasks"."worked_for" >= 0),
	CONSTRAINT "tasks_working" CHECK("tasks"."status" <> 'working' or ("tasks"."assignee_id" is not null and "tasks"."started_at" is not null)),
	CONSTRAINT "tasks_running" CHECK("tasks"."running_since" is null or "tasks"."status" = 'working'),
	CONSTRAINT "tasks_held" CHECK("tasks"."status" <> 'held' or ("tasks"."held_reason" is not null and "tasks"."held_from" is not null)),
	CONSTRAINT "tasks_finished" CHECK("tasks"."status" not in ('approval', 'done') or "tasks"."finished_at" is not null),
	CONSTRAINT "tasks_applied" CHECK("tasks"."status" <> 'done' or "tasks"."applied_at" is not null)
);
--> statement-breakpoint
CREATE INDEX `idx_tasks_company_status` ON `tasks` (`company_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_tasks_project` ON `tasks` (`project_id`);--> statement-breakpoint
CREATE TABLE `teams` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`suggested` text,
	`name` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "teams_suggested" CHECK("teams"."suggested" is null or "teams"."suggested" in ('backend', 'frontend', 'planning', 'design')),
	CONSTRAINT "teams_named" CHECK("teams"."suggested" is not null or "teams"."name" is not null)
);
--> statement-breakpoint
CREATE INDEX `idx_teams_company` ON `teams` (`company_id`);