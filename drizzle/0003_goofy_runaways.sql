CREATE TABLE "profile_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"submittedAt" timestamp DEFAULT now() NOT NULL,
	"reviewedAt" timestamp,
	"reviewedBy" text
);
--> statement-breakpoint
ALTER TABLE "profile_submissions" ADD CONSTRAINT "profile_submissions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;