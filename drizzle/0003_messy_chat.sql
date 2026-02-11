CREATE TABLE "feature_request_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"feature_request_id" integer NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"category" varchar(64) NOT NULL,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"admin_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paper_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"arxiv_id" varchar(32) NOT NULL,
	"arxiv_url" varchar(512) NOT NULL,
	"title" varchar(500) NOT NULL,
	"authors" varchar(1000) NOT NULL,
	"abstract" text,
	"justification" text NOT NULL,
	"relevance_area" varchar(64) NOT NULL,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"admin_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "feature_request_votes_unique" ON "feature_request_votes" USING btree ("feature_request_id","user_id");--> statement-breakpoint
CREATE INDEX "feature_requests_created_at_idx" ON "feature_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "paper_submissions_user_idx" ON "paper_submissions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "paper_submissions_unique" ON "paper_submissions" USING btree ("user_id","arxiv_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reactions_unique_idx" ON "reactions" USING btree ("bout_id","turn_index","reaction_type","user_id");