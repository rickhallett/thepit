-- M1.3: contestants table for the run model.
-- Agent configurations that compete within a run.
-- Cascade delete: deleting a run deletes its contestants.

CREATE TABLE IF NOT EXISTS "contestants" (
  "id" varchar(21) PRIMARY KEY NOT NULL,
  "run_id" varchar(21) NOT NULL REFERENCES "runs"("id") ON DELETE CASCADE,
  "label" varchar(128) NOT NULL,
  "model" varchar(128) NOT NULL,
  "provider" varchar(64),
  "system_prompt" text,
  "temperature" real,
  "max_tokens" integer,
  "tool_access" jsonb,
  "context_bundle" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "contestants_run_id_idx" ON "contestants" USING btree ("run_id");
