-- M3.1: Cost ledger table for tracking model call costs.

CREATE TYPE "public"."cost_source_type" AS ENUM('trace', 'evaluation', 'summary');

CREATE TABLE "cost_ledger" (
  "id" varchar(21) PRIMARY KEY NOT NULL,
  "source_type" "cost_source_type" NOT NULL,
  "source_id" varchar(21) NOT NULL,
  "run_id" varchar(21) NOT NULL,
  "contestant_id" varchar(21),
  "model" varchar(128) NOT NULL,
  "input_tokens" integer NOT NULL,
  "output_tokens" integer NOT NULL,
  "input_cost_micro" integer NOT NULL,
  "output_cost_micro" integer NOT NULL,
  "total_cost_micro" integer NOT NULL,
  "latency_ms" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "cost_ledger"
  ADD CONSTRAINT "cost_ledger_run_id_runs_id_fk"
  FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "cost_ledger"
  ADD CONSTRAINT "cost_ledger_contestant_id_contestants_id_fk"
  FOREIGN KEY ("contestant_id") REFERENCES "public"."contestants"("id")
  ON DELETE cascade ON UPDATE no action;

CREATE INDEX "cost_ledger_run_id_idx" ON "cost_ledger" USING btree ("run_id");
CREATE INDEX "cost_ledger_contestant_id_idx" ON "cost_ledger" USING btree ("contestant_id");
CREATE INDEX "cost_ledger_source_idx" ON "cost_ledger" USING btree ("source_type", "source_id");
