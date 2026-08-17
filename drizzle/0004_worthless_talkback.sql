CREATE TABLE "news_updates" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"date" date NOT NULL,
	"text" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "news_updates_slug_unique" UNIQUE("slug")
);
