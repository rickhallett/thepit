-- Add unique partial index on credit_transactions.reference_id to prevent
-- duplicate webhook deliveries from double-granting credits.
--
-- Partial index (WHERE reference_id IS NOT NULL) allows multiple NULLs
-- while enforcing uniqueness for non-null values.
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "credit_txn_reference_id_unique"
  ON "credit_transactions" ("reference_id")
  WHERE "reference_id" IS NOT NULL;
