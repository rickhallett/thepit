-- M2.1: Rubrics table for evaluation criteria
CREATE TABLE IF NOT EXISTS "rubrics" (
  "id" varchar(21) PRIMARY KEY NOT NULL,
  "name" varchar(256) NOT NULL,
  "description" text,
  "domain" varchar(64),
  "criteria" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
