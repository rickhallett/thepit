-- Migration 0009: Add sharer_id column to short_link_clicks for viral attribution.
--
-- Tracks which user shared the link that was clicked. Enables viral loop
-- measurement: who shared → who clicked → who signed up → who converted.
-- Used by the growth analytics instrumentation (OCE-252).

ALTER TABLE "short_link_clicks" ADD COLUMN "sharer_id" varchar(128);--> statement-breakpoint
ALTER TABLE "short_link_clicks" ADD CONSTRAINT "short_link_clicks_sharer_id_users_id_fk" FOREIGN KEY ("sharer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
