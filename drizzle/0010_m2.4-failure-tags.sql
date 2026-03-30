-- M2.4: Failure tags for run evaluation

CREATE TYPE "public"."failure_category" AS ENUM(
  'wrong_answer',
  'partial_answer',
  'refusal',
  'off_topic',
  'unsafe_output',
  'hallucination',
  'format_violation',
  'context_misuse',
  'instruction_violation'
);

CREATE TABLE "failure_tags" (
  "id" varchar(21) PRIMARY KEY NOT NULL,
  "run_id" varchar(21) NOT NULL REFERENCES "runs"("id") ON DELETE CASCADE,
  "contestant_id" varchar(21) NOT NULL REFERENCES "contestants"("id") ON DELETE CASCADE,
  "category" "failure_category" NOT NULL,
  "description" text,
  "source" varchar(32) NOT NULL,
  "evaluation_id" varchar(21) REFERENCES "evaluations"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "failure_tags_run_id_idx" ON "failure_tags" USING btree ("run_id");
CREATE INDEX "failure_tags_contestant_id_idx" ON "failure_tags" USING btree ("contestant_id");
CREATE INDEX "failure_tags_category_idx" ON "failure_tags" USING btree ("category");
