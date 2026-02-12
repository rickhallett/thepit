-- Migration 0004: Analytics page views + pending tables (short_links, short_link_clicks, remix_events, research_exports)
--
-- Catches up 4 tables that existed in db/schema.ts but had no migration,
-- then adds the new page_views table for server-side analytics.

--> statement-breakpoint

-- short_links: shareable slugs that resolve to a bout
CREATE TABLE IF NOT EXISTS "short_links" (
  "id" serial PRIMARY KEY NOT NULL,
  "slug" varchar(32) NOT NULL,
  "bout_id" varchar(21) NOT NULL,
  "created_by_user_id" varchar(128),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "short_links_bout_id_idx" ON "short_links" USING btree ("bout_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "short_links_slug_idx" ON "short_links" USING btree ("slug");

--> statement-breakpoint

-- short_link_clicks: click analytics for each short-link resolution
CREATE TABLE IF NOT EXISTS "short_link_clicks" (
  "id" serial PRIMARY KEY NOT NULL,
  "short_link_id" integer NOT NULL,
  "bout_id" varchar(21) NOT NULL,
  "ref_code" varchar(64),
  "utm_source" varchar(128),
  "utm_medium" varchar(128),
  "utm_campaign" varchar(128),
  "utm_term" varchar(128),
  "utm_content" varchar(128),
  "referer" text,
  "user_agent" text,
  "ip_hash" varchar(66),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'short_link_clicks_short_link_id_short_links_id_fk'
  ) THEN
    ALTER TABLE "short_link_clicks"
      ADD CONSTRAINT "short_link_clicks_short_link_id_short_links_id_fk"
      FOREIGN KEY ("short_link_id") REFERENCES "short_links"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
  END IF;
END $$;

--> statement-breakpoint

-- remix_events: tracks agent remix/clone lineage and reward payouts
CREATE TABLE IF NOT EXISTS "remix_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "source_agent_id" varchar(128) NOT NULL,
  "remixed_agent_id" varchar(128),
  "remixer_user_id" varchar(128) NOT NULL,
  "source_owner_id" varchar(128),
  "outcome" varchar(32) NOT NULL,
  "reason" varchar(64),
  "reward_remixer_micro" bigint NOT NULL DEFAULT 0,
  "reward_source_owner_micro" bigint NOT NULL DEFAULT 0,
  "metadata" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint

-- research_exports: snapshot payloads for research dataset downloads
CREATE TABLE IF NOT EXISTS "research_exports" (
  "id" serial PRIMARY KEY NOT NULL,
  "version" varchar(16) NOT NULL,
  "generated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "bout_count" integer NOT NULL,
  "reaction_count" integer NOT NULL,
  "vote_count" integer NOT NULL,
  "agent_count" integer NOT NULL,
  "payload" jsonb NOT NULL
);

--> statement-breakpoint

-- page_views: server-side page view analytics
CREATE TABLE IF NOT EXISTS "page_views" (
  "id" serial PRIMARY KEY NOT NULL,
  "path" varchar(512) NOT NULL,
  "user_id" varchar(128),
  "session_id" varchar(32) NOT NULL,
  "referrer" varchar(1024),
  "user_agent" varchar(512),
  "ip_hash" varchar(66),
  "utm_source" varchar(128),
  "utm_medium" varchar(128),
  "utm_campaign" varchar(128),
  "country" varchar(2),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "page_views_path_created_idx" ON "page_views" USING btree ("path", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "page_views_session_idx" ON "page_views" USING btree ("session_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "page_views_created_at_idx" ON "page_views" USING btree ("created_at");
