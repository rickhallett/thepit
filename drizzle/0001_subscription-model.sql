CREATE TYPE "public"."user_tier" AS ENUM('free', 'pass', 'lab');--> statement-breakpoint
CREATE TABLE "agent_flags" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" varchar(128) NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"reason" varchar(32) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "free_bout_pool" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" varchar(10) NOT NULL,
	"used" integer DEFAULT 0 NOT NULL,
	"max_daily" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "subscription_tier" "user_tier" DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "subscription_status" varchar(32);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "subscription_id" varchar(128);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "subscription_current_period_end" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_customer_id" varchar(128);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "free_bouts_used" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_flags_unique" ON "agent_flags" USING btree ("agent_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "free_bout_pool_date_idx" ON "free_bout_pool" USING btree ("date");