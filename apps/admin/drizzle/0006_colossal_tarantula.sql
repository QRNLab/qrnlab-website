CREATE TABLE `blog_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`postId` text NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`submittedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`reviewedAt` integer,
	`reviewedBy` text,
	`reviewNote` text,
	FOREIGN KEY (`postId`) REFERENCES `blog_posts`(`id`) ON UPDATE no action ON DELETE cascade
);
