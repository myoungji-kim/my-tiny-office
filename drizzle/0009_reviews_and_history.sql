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
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_milestones_company` ON `milestones` (`company_id`,`at`);--> statement-breakpoint
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
	CONSTRAINT "reviews_state" CHECK("reviews"."state" in ('suggested', 'queued', 'reviewing', 'settled')),
	CONSTRAINT "reviews_reviewer" CHECK("reviews"."state" = 'suggested' or "reviews"."reviewer_id" is not null),
	CONSTRAINT "reviews_started" CHECK("reviews"."state" not in ('reviewing', 'settled') or "reviews"."started_at" is not null),
	CONSTRAINT "reviews_settled" CHECK("reviews"."state" <> 'settled' or "reviews"."settled_at" is not null)
);
--> statement-breakpoint
CREATE INDEX `idx_reviews_company` ON `reviews` (`company_id`);--> statement-breakpoint
-- A company made before the history existed keeps what is known exactly: when
-- it was founded, and when each person joined. Nothing else is reconstructed.
INSERT INTO `milestones`("id", "company_id", "kind", "at")
SELECT 'founded-' || "id", "id", 'founded', "founded_at" FROM `companies`;--> statement-breakpoint
INSERT INTO `milestones`("id", "company_id", "kind", "at", "employee_id", "employee_name", "first")
SELECT 'joined-' || e."id", e."company_id", 'joined', e."hired_at", e."id", e."name",
  NOT EXISTS (SELECT 1 FROM `employees` o WHERE o."company_id" = e."company_id" AND (o."hired_at" < e."hired_at" OR (o."hired_at" = e."hired_at" AND o."id" < e."id")))
FROM `employees` e;
