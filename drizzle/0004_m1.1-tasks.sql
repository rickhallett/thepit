-- M1.1: tasks table for the run model.
-- Coexists alongside the bout model (no FK between runs and bouts).

DO $$ BEGIN
  CREATE TYPE "public"."expected_output_shape" AS ENUM('text', 'json', 'code');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "tasks" (
  "id" varchar(21) PRIMARY KEY NOT NULL,
  "name" varchar(256) NOT NULL,
  "description" text,
  "prompt" text NOT NULL,
  "constraints" jsonb,
  "expected_output_shape" "expected_output_shape",
  "acceptance_criteria" jsonb,
  "domain" varchar(64),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "tasks_domain_idx" ON "tasks" USING btree ("domain");
CREATE INDEX IF NOT EXISTS "tasks_created_at_idx" ON "tasks" USING btree ("created_at");
