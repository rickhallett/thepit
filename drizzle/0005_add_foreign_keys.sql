-- Migration 0005: Add foreign key constraints to enforce referential integrity.
--
-- Previously only short_link_clicks → short_links had a FK. This migration
-- adds constraints for all parent-child relationships.
--
-- Strategy:
--   - CASCADE for child rows that have no meaning without the parent
--     (reactions, votes, credit_transactions, etc.)
--   - SET NULL for optional ownership references (bouts.owner_id, agents.owner_id)
--   - NO ACTION for remix_events → agents (agents are soft-deleted via archived flag)
--
-- Each constraint is guarded with IF NOT EXISTS so the migration is idempotent.
--
-- IMPORTANT: Run the orphan cleanup queries BEFORE this migration in production.
-- See the cleanup script at the bottom of this file.

--> statement-breakpoint

-- ─── bouts.owner_id → users.id ──────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bouts_owner_id_users_id_fk'
  ) THEN
    ALTER TABLE "bouts"
      ADD CONSTRAINT "bouts_owner_id_users_id_fk"
      FOREIGN KEY ("owner_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

--> statement-breakpoint

-- ─── credits.user_id → users.id ─────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'credits_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "credits"
      ADD CONSTRAINT "credits_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

--> statement-breakpoint

-- ─── credit_transactions.user_id → users.id ─────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'credit_txn_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "credit_transactions"
      ADD CONSTRAINT "credit_txn_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

--> statement-breakpoint

-- ─── reactions.bout_id → bouts.id ───────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reactions_bout_id_bouts_id_fk'
  ) THEN
    ALTER TABLE "reactions"
      ADD CONSTRAINT "reactions_bout_id_bouts_id_fk"
      FOREIGN KEY ("bout_id") REFERENCES "bouts"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

--> statement-breakpoint

-- ─── reactions.user_id → users.id (nullable) ────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reactions_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "reactions"
      ADD CONSTRAINT "reactions_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

--> statement-breakpoint

-- ─── winner_votes.bout_id → bouts.id ────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'winner_votes_bout_id_bouts_id_fk'
  ) THEN
    ALTER TABLE "winner_votes"
      ADD CONSTRAINT "winner_votes_bout_id_bouts_id_fk"
      FOREIGN KEY ("bout_id") REFERENCES "bouts"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

--> statement-breakpoint

-- ─── winner_votes.user_id → users.id ────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'winner_votes_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "winner_votes"
      ADD CONSTRAINT "winner_votes_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

--> statement-breakpoint

-- ─── referrals.referrer_id → users.id ───────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'referrals_referrer_id_users_id_fk'
  ) THEN
    ALTER TABLE "referrals"
      ADD CONSTRAINT "referrals_referrer_id_users_id_fk"
      FOREIGN KEY ("referrer_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

--> statement-breakpoint

-- ─── referrals.referred_id → users.id ───────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'referrals_referred_id_users_id_fk'
  ) THEN
    ALTER TABLE "referrals"
      ADD CONSTRAINT "referrals_referred_id_users_id_fk"
      FOREIGN KEY ("referred_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

--> statement-breakpoint

-- ─── agents.owner_id → users.id (nullable) ──────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'agents_owner_id_users_id_fk'
  ) THEN
    ALTER TABLE "agents"
      ADD CONSTRAINT "agents_owner_id_users_id_fk"
      FOREIGN KEY ("owner_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

--> statement-breakpoint

-- ─── agents.parent_id → agents.id (self-referential, nullable) ──────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'agents_parent_id_agents_id_fk'
  ) THEN
    ALTER TABLE "agents"
      ADD CONSTRAINT "agents_parent_id_agents_id_fk"
      FOREIGN KEY ("parent_id") REFERENCES "agents"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

--> statement-breakpoint

-- ─── agent_flags.agent_id → agents.id ───────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'agent_flags_agent_id_agents_id_fk'
  ) THEN
    ALTER TABLE "agent_flags"
      ADD CONSTRAINT "agent_flags_agent_id_agents_id_fk"
      FOREIGN KEY ("agent_id") REFERENCES "agents"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

--> statement-breakpoint

-- ─── agent_flags.user_id → users.id ─────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'agent_flags_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "agent_flags"
      ADD CONSTRAINT "agent_flags_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

--> statement-breakpoint

-- ─── short_links.bout_id → bouts.id ─────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'short_links_bout_id_bouts_id_fk'
  ) THEN
    ALTER TABLE "short_links"
      ADD CONSTRAINT "short_links_bout_id_bouts_id_fk"
      FOREIGN KEY ("bout_id") REFERENCES "bouts"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

--> statement-breakpoint

-- ─── short_links.created_by_user_id → users.id (nullable) ───────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'short_links_created_by_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "short_links"
      ADD CONSTRAINT "short_links_created_by_user_id_users_id_fk"
      FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

--> statement-breakpoint

-- ─── short_link_clicks.bout_id → bouts.id ───────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'short_link_clicks_bout_id_bouts_id_fk'
  ) THEN
    ALTER TABLE "short_link_clicks"
      ADD CONSTRAINT "short_link_clicks_bout_id_bouts_id_fk"
      FOREIGN KEY ("bout_id") REFERENCES "bouts"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

--> statement-breakpoint

-- ─── feature_requests.user_id → users.id ─────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'feature_requests_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "feature_requests"
      ADD CONSTRAINT "feature_requests_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

--> statement-breakpoint

-- ─── feature_request_votes.feature_request_id → feature_requests.id ──
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'feature_request_votes_fr_id_fk'
  ) THEN
    ALTER TABLE "feature_request_votes"
      ADD CONSTRAINT "feature_request_votes_fr_id_fk"
      FOREIGN KEY ("feature_request_id") REFERENCES "feature_requests"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

--> statement-breakpoint

-- ─── feature_request_votes.user_id → users.id ───────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'feature_request_votes_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "feature_request_votes"
      ADD CONSTRAINT "feature_request_votes_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

--> statement-breakpoint

-- ─── paper_submissions.user_id → users.id ────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'paper_submissions_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "paper_submissions"
      ADD CONSTRAINT "paper_submissions_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

--> statement-breakpoint

-- ─── remix_events.source_agent_id → agents.id (NOT NULL — NO ACTION) ─
-- Agents are soft-deleted (archived flag), not hard-deleted.
-- NO ACTION prevents accidental deletion of agents that have remix history.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'remix_events_source_agent_id_agents_id_fk'
  ) THEN
    ALTER TABLE "remix_events"
      ADD CONSTRAINT "remix_events_source_agent_id_agents_id_fk"
      FOREIGN KEY ("source_agent_id") REFERENCES "agents"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION;
  END IF;
END $$;

--> statement-breakpoint

-- ─── remix_events.remixed_agent_id → agents.id (nullable) ───────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'remix_events_remixed_agent_id_agents_id_fk'
  ) THEN
    ALTER TABLE "remix_events"
      ADD CONSTRAINT "remix_events_remixed_agent_id_agents_id_fk"
      FOREIGN KEY ("remixed_agent_id") REFERENCES "agents"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

--> statement-breakpoint

-- ─── remix_events.remixer_user_id → users.id ────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'remix_events_remixer_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "remix_events"
      ADD CONSTRAINT "remix_events_remixer_user_id_users_id_fk"
      FOREIGN KEY ("remixer_user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

--> statement-breakpoint

-- ─── remix_events.source_owner_id → users.id (nullable) ─────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'remix_events_source_owner_id_users_id_fk'
  ) THEN
    ALTER TABLE "remix_events"
      ADD CONSTRAINT "remix_events_source_owner_id_users_id_fk"
      FOREIGN KEY ("source_owner_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

-- ─── ORPHAN CLEANUP (run BEFORE applying this migration in production) ──
--
-- These queries identify and remove rows referencing non-existent parents.
-- Review output before running DELETE variants. In production, consider
-- soft-archiving instead of deleting.
--
-- SELECT count(*) FROM bouts WHERE owner_id IS NOT NULL AND owner_id NOT IN (SELECT id FROM users);
-- SELECT count(*) FROM credits WHERE user_id NOT IN (SELECT id FROM users);
-- SELECT count(*) FROM credit_transactions WHERE user_id NOT IN (SELECT id FROM users);
-- SELECT count(*) FROM reactions WHERE bout_id NOT IN (SELECT id FROM bouts);
-- SELECT count(*) FROM reactions WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM users);
-- SELECT count(*) FROM winner_votes WHERE bout_id NOT IN (SELECT id FROM bouts);
-- SELECT count(*) FROM winner_votes WHERE user_id NOT IN (SELECT id FROM users);
-- SELECT count(*) FROM referrals WHERE referrer_id NOT IN (SELECT id FROM users);
-- SELECT count(*) FROM referrals WHERE referred_id NOT IN (SELECT id FROM users);
-- SELECT count(*) FROM agents WHERE owner_id IS NOT NULL AND owner_id NOT IN (SELECT id FROM users);
-- SELECT count(*) FROM agents WHERE parent_id IS NOT NULL AND parent_id NOT IN (SELECT id FROM agents);
-- SELECT count(*) FROM agent_flags WHERE agent_id NOT IN (SELECT id FROM agents);
-- SELECT count(*) FROM agent_flags WHERE user_id NOT IN (SELECT id FROM users);
-- SELECT count(*) FROM short_links WHERE bout_id NOT IN (SELECT id FROM bouts);
-- SELECT count(*) FROM short_link_clicks WHERE bout_id NOT IN (SELECT id FROM bouts);
-- SELECT count(*) FROM feature_requests WHERE user_id NOT IN (SELECT id FROM users);
-- SELECT count(*) FROM feature_request_votes WHERE feature_request_id NOT IN (SELECT id FROM feature_requests);
-- SELECT count(*) FROM feature_request_votes WHERE user_id NOT IN (SELECT id FROM users);
-- SELECT count(*) FROM paper_submissions WHERE user_id NOT IN (SELECT id FROM users);
-- SELECT count(*) FROM remix_events WHERE source_agent_id NOT IN (SELECT id FROM agents);
-- SELECT count(*) FROM remix_events WHERE remixed_agent_id IS NOT NULL AND remixed_agent_id NOT IN (SELECT id FROM agents);
-- SELECT count(*) FROM remix_events WHERE remixer_user_id NOT IN (SELECT id FROM users);
-- SELECT count(*) FROM remix_events WHERE source_owner_id IS NOT NULL AND source_owner_id NOT IN (SELECT id FROM users);
