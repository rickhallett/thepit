-- Drop dead tables: free_bout_pool (replaced by intro_pool) and agent_flags
-- (created but never used). See RD-022 and RD-023.
DROP TABLE IF EXISTS "free_bout_pool";
DROP TABLE IF EXISTS "agent_flags";
