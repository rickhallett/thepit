CREATE TYPE "public"."agent_tier" AS ENUM('free', 'premium', 'custom');--> statement-breakpoint
CREATE TYPE "public"."bout_status" AS ENUM('running', 'completed', 'error');--> statement-breakpoint
CREATE TABLE "agents" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"system_prompt" text NOT NULL,
	"preset_id" varchar(64),
	"tier" "agent_tier" NOT NULL,
	"model" varchar(128),
	"response_length" varchar(32) NOT NULL,
	"response_format" varchar(32) NOT NULL,
	"archetype" text,
	"tone" text,
	"quirks" jsonb,
	"speech_pattern" text,
	"opening_move" text,
	"signature_move" text,
	"weakness" text,
	"goal" text,
	"fears" text,
	"custom_instructions" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"owner_id" varchar(128),
	"parent_id" varchar(128),
	"prompt_hash" varchar(66) NOT NULL,
	"manifest_hash" varchar(66) NOT NULL,
	"attestation_uid" varchar(128),
	"attestation_tx_hash" varchar(66),
	"attested_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "bouts" (
	"id" varchar(21) PRIMARY KEY NOT NULL,
	"preset_id" varchar(64) NOT NULL,
	"status" "bout_status" NOT NULL,
	"transcript" jsonb NOT NULL,
	"owner_id" varchar(128),
	"topic" text,
	"response_length" varchar(32),
	"response_format" varchar(32),
	"agent_lineup" jsonb,
	"share_line" text,
	"share_generated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"delta_micro" bigint NOT NULL,
	"source" varchar(64) NOT NULL,
	"reference_id" varchar(128),
	"metadata" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credits" (
	"user_id" varchar(128) PRIMARY KEY NOT NULL,
	"balance_micro" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intro_pool" (
	"id" serial PRIMARY KEY NOT NULL,
	"initial_micro" bigint NOT NULL,
	"claimed_micro" bigint NOT NULL,
	"drain_rate_micro_per_minute" bigint NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "newsletter_signups" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(256) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"bout_id" varchar(21) NOT NULL,
	"turn_index" integer NOT NULL,
	"reaction_type" varchar(32) NOT NULL,
	"user_id" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" serial PRIMARY KEY NOT NULL,
	"referrer_id" varchar(128) NOT NULL,
	"referred_id" varchar(128) NOT NULL,
	"code" varchar(32) NOT NULL,
	"credited" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"email" varchar(256),
	"display_name" varchar(128),
	"image_url" varchar(512),
	"referral_code" varchar(32),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "winner_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"bout_id" varchar(21) NOT NULL,
	"agent_id" varchar(128) NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "users_referral_code_idx" ON "users" USING btree ("referral_code");--> statement-breakpoint
CREATE UNIQUE INDEX "winner_votes_unique" ON "winner_votes" USING btree ("bout_id","user_id");