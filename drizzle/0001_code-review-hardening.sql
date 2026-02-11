-- Migration: 0001_code-review-hardening
-- Created: 2026-02-11
-- Purpose: Add missing indexes, updated_at to bouts, unique constraint on
--          newsletter_signups.email, and catch up on schema drift (archived
--          column on agents, agent_flags table).
--
-- All statements are idempotent (IF NOT EXISTS / CREATE INDEX CONCURRENTLY
-- would be ideal but Drizzle migrations run in transactions, so we use
-- plain CREATE INDEX with IF NOT EXISTS where possible).

-- =============================================================================
-- 1. Schema drift catch-up: agents.archived + agent_flags table
--    These were added in b9fd3db but after the initial 0000 migration snapshot.
-- =============================================================================

ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "archived" boolean NOT NULL DEFAULT false;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "agent_flags" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" varchar(128) NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"reason" varchar(32) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "agent_flags_unique" ON "agent_flags" USING btree ("agent_id","user_id");--> statement-breakpoint

-- =============================================================================
-- 2. Add updated_at to bouts for status-transition tracking (#22)
-- =============================================================================

ALTER TABLE "bouts" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint

-- =============================================================================
-- 3. Missing performance indexes (#20)
-- =============================================================================

-- bouts: leaderboard queries filter by created_at
CREATE INDEX IF NOT EXISTS "bouts_created_at_idx" ON "bouts" USING btree ("created_at");--> statement-breakpoint

-- credit_transactions: getCreditTransactions(userId) with ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS "credit_txn_user_created_idx" ON "credit_transactions" USING btree ("user_id","created_at");--> statement-breakpoint

-- credit_transactions: Stripe webhook idempotency check on reference_id
CREATE INDEX IF NOT EXISTS "credit_txn_reference_id_idx" ON "credit_transactions" USING btree ("reference_id");--> statement-breakpoint

-- agents: catalog and leaderboard filter WHERE archived = false
CREATE INDEX IF NOT EXISTS "agents_archived_created_idx" ON "agents" USING btree ("archived","created_at");--> statement-breakpoint

-- reactions: every bout page loads reaction counts grouped by bout_id
CREATE INDEX IF NOT EXISTS "reactions_bout_id_idx" ON "reactions" USING btree ("bout_id");--> statement-breakpoint

-- winner_votes: leaderboard queries filter by created_at
CREATE INDEX IF NOT EXISTS "winner_votes_created_at_idx" ON "winner_votes" USING btree ("created_at");--> statement-breakpoint

-- =============================================================================
-- 4. Unique constraint on newsletter_signups.email (#20)
--    Required for onConflictDoNothing() dedup to actually work.
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS "newsletter_signups_email_idx" ON "newsletter_signups" USING btree ("email");
