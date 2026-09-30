PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_milestones` (
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
	CONSTRAINT "milestones_kind" CHECK("__new_milestones"."kind" in ('founded', 'joined', 'left', 'teamFormed', 'firstTaskDone', 'tasksDone', 'firstReview', 'memories', 'projectFinished'))
);
--> statement-breakpoint
INSERT INTO `__new_milestones`("id", "company_id", "kind", "at", "employee_id", "employee_name", "first", "team_id", "count", "project_id", "project_name") SELECT "id", "company_id", "kind", "at", "employee_id", "employee_name", "first", "team_id", "count", "project_id", "project_name" FROM `milestones`;--> statement-breakpoint
DROP TABLE `milestones`;--> statement-breakpoint
ALTER TABLE `__new_milestones` RENAME TO `milestones`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_milestones_company` ON `milestones` (`company_id`,`at`);