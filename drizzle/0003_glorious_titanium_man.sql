CREATE TABLE `education_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`section` text DEFAULT 'lecture-notes' NOT NULL,
	`heading` text NOT NULL,
	`description` text,
	`links` text DEFAULT '[]',
	`youtubeLinks` text DEFAULT '[]',
	`sortOrder` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
