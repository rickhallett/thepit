-- M1.2: runs table for the run model.
-- Tracks execution lifecycle: pending -> running -> completed | failed.

DO $$ BEGIN
  CREATE TYPE "public"."run_status" AS ENUM('pending', 'running', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "runs" (
  "id" varchar(21) PRIMARY KEY NOT NULL,
  "task_id" varchar(21) NOT NULL REFERENCES "tasks"("id"),
  "status" "run_status" DEFAULT 'pending' NOT NULL,
  "owner_id" varchar(128) REFERENCES "users"("id") ON DELETE SET NULL,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "error" text,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "runs_task_id_idx" ON "runs" USING btree ("task_id");
CREATE INDEX IF NOT EXISTS "runs_owner_id_idx" ON "runs" USING btree ("owner_id");
CREATE INDEX IF NOT EXISTS "runs_status_created_idx" ON "runs" USING btree ("status", "created_at");
