CREATE TABLE "contact_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"email" varchar(256) NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "reactions_unique_idx";--> statement-breakpoint
ALTER TABLE "reactions" ADD COLUMN "client_fingerprint" varchar(192) NOT NULL;--> statement-breakpoint
CREATE INDEX "agents_owner_archived_idx" ON "agents" USING btree ("owner_id","archived");--> statement-breakpoint
CREATE INDEX "bouts_owner_status_idx" ON "bouts" USING btree ("owner_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "credit_txn_reference_id_unique" ON "credit_transactions" USING btree ("reference_id") WHERE "credit_transactions"."reference_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "referrals_referred_id_idx" ON "referrals" USING btree ("referred_id");--> statement-breakpoint
CREATE INDEX "remix_events_source_agent_idx" ON "remix_events" USING btree ("source_agent_id");--> statement-breakpoint
CREATE INDEX "users_stripe_customer_idx" ON "users" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reactions_unique_idx" ON "reactions" USING btree ("bout_id","turn_index","reaction_type","client_fingerprint");