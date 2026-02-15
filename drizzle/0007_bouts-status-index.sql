-- Migration 0007: Add composite (status, created_at) index on bouts.
--
-- Three query sites filter by status = 'completed' with ORDER BY created_at:
--   - lib/recent-bouts.ts (arena replay list)
--   - app/sitemap.ts (sitemap generation)
--   - lib/research-exports.ts (research dataset)
-- Without this index, these degrade to full table scans as bout count grows.

CREATE INDEX CONCURRENTLY IF NOT EXISTS "bouts_status_created_at_idx"
  ON "bouts" ("status", "created_at");
