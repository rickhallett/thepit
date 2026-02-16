-- Migration 0008: Add copy_variant column to page_views for A/B testing.
--
-- Tracks which copy variant was active when a page view was recorded.
-- Enables SQL-level analysis of A/B test impact on user behavior without
-- depending solely on PostHog.

ALTER TABLE "page_views" ADD COLUMN "copy_variant" varchar(32);
