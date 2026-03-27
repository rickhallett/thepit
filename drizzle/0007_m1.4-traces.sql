-- M1.4: traces table for the run model.
-- Append-only record of each model call during run execution.
-- Cascade delete: deleting a run deletes its traces.

CREATE TABLE IF NOT EXISTS "traces" (
  "id" varchar(21) PRIMARY KEY NOT NULL,
  "run_id" varchar(21) NOT NULL REFERENCES "runs"("id") ON DELETE CASCADE,
  "contestant_id" varchar(21) NOT NULL REFERENCES "contestants"("id") ON DELETE CASCADE,
  "request_messages" jsonb NOT NULL,
  "request_model" varchar(128) NOT NULL,
  "request_temperature" real,
  "response_content" text,
  "response_finish_reason" varchar(32),
  "input_tokens" integer,
  "output_tokens" integer,
  "total_tokens" integer,
  "latency_ms" integer,
  "status" varchar(16) NOT NULL,
  "error" text,
  "started_at" timestamp with time zone NOT NULL,
  "completed_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "traces_run_id_idx" ON "traces" USING btree ("run_id");
CREATE INDEX IF NOT EXISTS "traces_contestant_id_idx" ON "traces" USING btree ("contestant_id");
