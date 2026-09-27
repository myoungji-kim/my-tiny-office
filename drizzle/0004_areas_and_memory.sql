CREATE TABLE `areas` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`starting` text,
	`name` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "areas_named" CHECK("areas"."starting" is not null or "areas"."name" is not null)
);
--> statement-breakpoint
CREATE INDEX `idx_areas_company` ON `areas` (`company_id`);--> statement-breakpoint
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
-- Companies made before areas existed start with the same seven a new one does.
INSERT INTO `areas`("id", "company_id", "starting", "created_at")
SELECT 'start-' || c."id" || '-' || k."starting", c."id", k."starting", c."founded_at"
FROM `companies` c, (SELECT 'architecture' AS "starting" UNION ALL SELECT 'typeSafety' AS "starting" UNION ALL SELECT 'database' AS "starting" UNION ALL SELECT 'security' AS "starting" UNION ALL SELECT 'localization' AS "starting" UNION ALL SELECT 'product' AS "starting" UNION ALL SELECT 'quality' AS "starting") k;
