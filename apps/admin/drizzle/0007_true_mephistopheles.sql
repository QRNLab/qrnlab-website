ALTER TABLE `member_profiles` ADD `researchIdentity` text;--> statement-breakpoint
UPDATE `member_profiles` SET `researchIdentity` = `focus` WHERE `focus` IS NOT NULL;--> statement-breakpoint
ALTER TABLE `member_profiles` DROP COLUMN `title`;--> statement-breakpoint
ALTER TABLE `member_profiles` DROP COLUMN `focus`;