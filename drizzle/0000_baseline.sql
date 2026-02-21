CREATE TYPE "public"."agent_tier" AS ENUM('free', 'premium', 'custom');--> statement-breakpoint
CREATE TYPE "public"."bout_status" AS ENUM('running', 'completed', 'error');--> statement-breakpoint
CREATE TYPE "public"."reaction_type" AS ENUM('heart', 'fire');--> statement-breakpoint
CREATE TYPE "public"."user_tier" AS ENUM('free', 'pass', 'lab');--> statement-breakpoint
CREATE TABLE "agent_flags" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" varchar(128) NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"reason" varchar(32) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
	"attested_at" timestamp with time zone,
	"archived" boolean DEFAULT false NOT NULL
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
	"max_turns" integer,
	"agent_lineup" jsonb,
	"share_line" text,
	"share_generated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
CREATE TABLE "feature_request_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"feature_request_id" integer NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"category" varchar(64) NOT NULL,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"admin_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "free_bout_pool" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" varchar(10) NOT NULL,
	"used" integer DEFAULT 0 NOT NULL,
	"max_daily" integer NOT NULL,
	"spend_micro" bigint DEFAULT 0 NOT NULL,
	"spend_cap_micro" bigint DEFAULT 200000 NOT NULL,
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
CREATE TABLE "page_views" (
	"id" serial PRIMARY KEY NOT NULL,
	"path" varchar(512) NOT NULL,
	"user_id" varchar(128),
	"session_id" varchar(32) NOT NULL,
	"referrer" varchar(1024),
	"user_agent" varchar(512),
	"ip_hash" varchar(66),
	"utm_source" varchar(128),
	"utm_medium" varchar(128),
	"utm_campaign" varchar(128),
	"utm_term" varchar(128),
	"utm_content" varchar(128),
	"country" varchar(2),
	"copy_variant" varchar(32),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paper_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"arxiv_id" varchar(32) NOT NULL,
	"arxiv_url" varchar(512) NOT NULL,
	"title" varchar(500) NOT NULL,
	"authors" varchar(1000) NOT NULL,
	"abstract" text,
	"justification" text NOT NULL,
	"relevance_area" varchar(64) NOT NULL,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"admin_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"bout_id" varchar(21) NOT NULL,
	"turn_index" integer NOT NULL,
	"reaction_type" "reaction_type" NOT NULL,
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
CREATE TABLE "remix_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_agent_id" varchar(128) NOT NULL,
	"remixed_agent_id" varchar(128),
	"remixer_user_id" varchar(128) NOT NULL,
	"source_owner_id" varchar(128),
	"outcome" varchar(32) NOT NULL,
	"reason" varchar(64),
	"reward_remixer_micro" bigint DEFAULT 0 NOT NULL,
	"reward_source_owner_micro" bigint DEFAULT 0 NOT NULL,
	"metadata" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "research_exports" (
	"id" serial PRIMARY KEY NOT NULL,
	"version" varchar(16) NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"bout_count" integer NOT NULL,
	"reaction_count" integer NOT NULL,
	"vote_count" integer NOT NULL,
	"agent_count" integer NOT NULL,
	"payload" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "short_link_clicks" (
	"id" serial PRIMARY KEY NOT NULL,
	"short_link_id" integer NOT NULL,
	"bout_id" varchar(21) NOT NULL,
	"sharer_id" varchar(128),
	"ref_code" varchar(64),
	"utm_source" varchar(128),
	"utm_medium" varchar(128),
	"utm_campaign" varchar(128),
	"utm_term" varchar(128),
	"utm_content" varchar(128),
	"referer" text,
	"user_agent" text,
	"ip_hash" varchar(66),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "short_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(32) NOT NULL,
	"bout_id" varchar(21) NOT NULL,
	"created_by_user_id" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"email" varchar(256),
	"display_name" varchar(128),
	"image_url" varchar(512),
	"referral_code" varchar(32),
	"subscription_tier" "user_tier" DEFAULT 'free' NOT NULL,
	"subscription_status" varchar(32),
	"subscription_id" varchar(128),
	"subscription_current_period_end" timestamp with time zone,
	"stripe_customer_id" varchar(128),
	"free_bouts_used" integer DEFAULT 0 NOT NULL,
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
ALTER TABLE "agent_flags" ADD CONSTRAINT "agent_flags_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_flags" ADD CONSTRAINT "agent_flags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_parent_id_agents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bouts" ADD CONSTRAINT "bouts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credits" ADD CONSTRAINT "credits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_request_votes" ADD CONSTRAINT "feature_request_votes_feature_request_id_feature_requests_id_fk" FOREIGN KEY ("feature_request_id") REFERENCES "public"."feature_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_request_votes" ADD CONSTRAINT "feature_request_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_requests" ADD CONSTRAINT "feature_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_submissions" ADD CONSTRAINT "paper_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_bout_id_bouts_id_fk" FOREIGN KEY ("bout_id") REFERENCES "public"."bouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_users_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_id_users_id_fk" FOREIGN KEY ("referred_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remix_events" ADD CONSTRAINT "remix_events_source_agent_id_agents_id_fk" FOREIGN KEY ("source_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remix_events" ADD CONSTRAINT "remix_events_remixed_agent_id_agents_id_fk" FOREIGN KEY ("remixed_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remix_events" ADD CONSTRAINT "remix_events_remixer_user_id_users_id_fk" FOREIGN KEY ("remixer_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remix_events" ADD CONSTRAINT "remix_events_source_owner_id_users_id_fk" FOREIGN KEY ("source_owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "short_link_clicks" ADD CONSTRAINT "short_link_clicks_bout_id_bouts_id_fk" FOREIGN KEY ("bout_id") REFERENCES "public"."bouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "short_link_clicks" ADD CONSTRAINT "short_link_clicks_sharer_id_users_id_fk" FOREIGN KEY ("sharer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "short_link_clicks" ADD CONSTRAINT "short_link_clicks_short_link_id_short_links_id_fk" FOREIGN KEY ("short_link_id") REFERENCES "public"."short_links"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "short_links" ADD CONSTRAINT "short_links_bout_id_bouts_id_fk" FOREIGN KEY ("bout_id") REFERENCES "public"."bouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "short_links" ADD CONSTRAINT "short_links_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "winner_votes" ADD CONSTRAINT "winner_votes_bout_id_bouts_id_fk" FOREIGN KEY ("bout_id") REFERENCES "public"."bouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "winner_votes" ADD CONSTRAINT "winner_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_flags_unique" ON "agent_flags" USING btree ("agent_id","user_id");--> statement-breakpoint
CREATE INDEX "agents_archived_created_idx" ON "agents" USING btree ("archived","created_at");--> statement-breakpoint
CREATE INDEX "bouts_created_at_idx" ON "bouts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "bouts_status_created_at_idx" ON "bouts" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "credit_txn_user_created_idx" ON "credit_transactions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "credit_txn_reference_id_idx" ON "credit_transactions" USING btree ("reference_id");--> statement-breakpoint
CREATE UNIQUE INDEX "feature_request_votes_unique" ON "feature_request_votes" USING btree ("feature_request_id","user_id");--> statement-breakpoint
CREATE INDEX "feature_requests_created_at_idx" ON "feature_requests" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "free_bout_pool_date_idx" ON "free_bout_pool" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_signups_email_idx" ON "newsletter_signups" USING btree ("email");--> statement-breakpoint
CREATE INDEX "page_views_path_created_idx" ON "page_views" USING btree ("path","created_at");--> statement-breakpoint
CREATE INDEX "page_views_session_idx" ON "page_views" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "page_views_created_at_idx" ON "page_views" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "paper_submissions_user_idx" ON "paper_submissions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "paper_submissions_unique" ON "paper_submissions" USING btree ("user_id","arxiv_id");--> statement-breakpoint
CREATE INDEX "reactions_bout_id_idx" ON "reactions" USING btree ("bout_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reactions_unique_idx" ON "reactions" USING btree ("bout_id","turn_index","reaction_type","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "short_links_bout_id_idx" ON "short_links" USING btree ("bout_id");--> statement-breakpoint
CREATE UNIQUE INDEX "short_links_slug_idx" ON "short_links" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "users_referral_code_idx" ON "users" USING btree ("referral_code");--> statement-breakpoint
CREATE UNIQUE INDEX "winner_votes_unique" ON "winner_votes" USING btree ("bout_id","user_id");--> statement-breakpoint
CREATE INDEX "winner_votes_created_at_idx" ON "winner_votes" USING btree ("created_at");