ALTER TABLE `employees` ADD `career_session` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `career_folder` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `career_from` integer;--> statement-breakpoint
ALTER TABLE `employees` ADD `career_to` integer;--> statement-breakpoint
ALTER TABLE `memories` ADD `brought_in` integer DEFAULT false NOT NULL;