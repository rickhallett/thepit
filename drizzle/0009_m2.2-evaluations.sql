-- M2.2: Evaluations table for judge scoring records
CREATE TABLE IF NOT EXISTS "evaluations" (
  "id" varchar(21) PRIMARY KEY NOT NULL,
  "run_id" varchar(21) NOT NULL REFERENCES "runs"("id") ON DELETE CASCADE,
  "contestant_id" varchar(21) NOT NULL REFERENCES "contestants"("id") ON DELETE CASCADE,
  "rubric_id" varchar(21) NOT NULL REFERENCES "rubrics"("id"),
  "judge_model" varchar(128) NOT NULL,
  "scores" jsonb NOT NULL,
  "overall_score" real NOT NULL,
  "rationale" text NOT NULL,
  "raw_judge_response" text,
  "reconciliation" jsonb,
  "input_tokens" integer,
  "output_tokens" integer,
  "latency_ms" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "evaluations_run_id_idx" ON "evaluations" ("run_id");
CREATE INDEX IF NOT EXISTS "evaluations_contestant_id_idx" ON "evaluations" ("contestant_id");
CREATE INDEX IF NOT EXISTS "evaluations_rubric_id_idx" ON "evaluations" ("rubric_id");
