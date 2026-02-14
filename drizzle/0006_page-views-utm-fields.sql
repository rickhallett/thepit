-- Migration 0006: Add utm_term and utm_content columns to page_views.
--
-- Aligns page_views with short_link_clicks which already stores all 5 UTM params.
-- The middleware cookie captures all 5 params but the /api/pv handler previously
-- discarded utm_term and utm_content.

ALTER TABLE "page_views" ADD COLUMN IF NOT EXISTS "utm_term" varchar(128);
ALTER TABLE "page_views" ADD COLUMN IF NOT EXISTS "utm_content" varchar(128);
