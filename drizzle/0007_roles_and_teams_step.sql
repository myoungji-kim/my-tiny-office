CREATE TABLE `roles` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_roles_company` ON `roles` (`company_id`);--> statement-breakpoint
CREATE TABLE `teams` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`suggested` text,
	`name` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "teams_named" CHECK("teams"."suggested" is not null or "teams"."name" is not null)
);
--> statement-breakpoint
CREATE INDEX `idx_teams_company` ON `teams` (`company_id`);--> statement-breakpoint
ALTER TABLE `employees` ADD `species` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `role_id` text REFERENCES roles(id);--> statement-breakpoint
ALTER TABLE `employees` ADD `team_id` text REFERENCES teams(id);--> statement-breakpoint
-- Every company starts with the same roles a new one does, plus each title its
-- people already hold; then each person points at their title by id. Species
-- did not exist, so everyone made before it is a cat until changed.
INSERT INTO `roles`("id", "company_id", "name", "created_at")
SELECT 'role-' || c."id" || '-' || k."n", c."id", k."name", c."founded_at"
FROM `companies` c, (SELECT 'Backend Engineer' AS "name", 0 AS "n" UNION ALL SELECT 'Frontend Engineer' AS "name", 1 AS "n" UNION ALL SELECT 'Product Manager' AS "name", 2 AS "n" UNION ALL SELECT 'DBA' AS "name", 3 AS "n" UNION ALL SELECT 'DevOps Engineer' AS "name", 4 AS "n" UNION ALL SELECT 'QA Engineer' AS "name", 5 AS "n") k;--> statement-breakpoint
INSERT INTO `roles`("id", "company_id", "name", "created_at")
SELECT DISTINCT 'role-' || e."company_id" || '-' || lower(hex(e."role")), e."company_id", e."role", e."hired_at"
FROM `employees` e
WHERE NOT EXISTS (SELECT 1 FROM `roles` r WHERE r."company_id" = e."company_id" AND r."name" = e."role");--> statement-breakpoint
UPDATE `employees` SET
  "role_id" = (SELECT r."id" FROM `roles` r WHERE r."company_id" = `employees`."company_id" AND r."name" = `employees`."role" ORDER BY r."created_at" LIMIT 1),
  "species" = 'cat';
