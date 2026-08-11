ALTER TABLE "member_profiles" ADD COLUMN "category" text DEFAULT 'member' NOT NULL;--> statement-breakpoint
ALTER TABLE "member_profiles" ADD COLUMN "currentPosition" text;--> statement-breakpoint
ALTER TABLE "member_profiles" ADD COLUMN "currentInstitution" text;--> statement-breakpoint
ALTER TABLE "member_profiles" ADD COLUMN "yearGraduated" integer;