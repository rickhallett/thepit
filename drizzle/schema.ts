import { pgTable, index, varchar, text, timestamp, jsonb, boolean, serial, integer, uniqueIndex, foreignKey, bigint, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const agentTier = pgEnum("agent_tier", ['free', 'premium', 'custom'])
export const boutStatus = pgEnum("bout_status", ['running', 'completed', 'error'])
export const userTier = pgEnum("user_tier", ['free', 'pass', 'lab'])


export const agents = pgTable("agents", {
	id: varchar({ length: 128 }).primaryKey().notNull(),
	name: varchar({ length: 128 }).notNull(),
	systemPrompt: text("system_prompt").notNull(),
	presetId: varchar("preset_id", { length: 64 }),
	tier: agentTier().notNull(),
	model: varchar({ length: 128 }),
	responseLength: varchar("response_length", { length: 32 }).notNull(),
	responseFormat: varchar("response_format", { length: 32 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	ownerId: varchar("owner_id", { length: 128 }),
	parentId: varchar("parent_id", { length: 128 }),
	promptHash: varchar("prompt_hash", { length: 66 }).notNull(),
	manifestHash: varchar("manifest_hash", { length: 66 }).notNull(),
	attestationUid: varchar("attestation_uid", { length: 128 }),
	attestationTxHash: varchar("attestation_tx_hash", { length: 66 }),
	attestedAt: timestamp("attested_at", { withTimezone: true, mode: 'string' }),
	archetype: text(),
	tone: text(),
	quirks: jsonb(),
	speechPattern: text("speech_pattern"),
	openingMove: text("opening_move"),
	signatureMove: text("signature_move"),
	weakness: text(),
	goal: text(),
	fears: text(),
	customInstructions: text("custom_instructions"),
	archived: boolean().default(false).notNull(),
}, (table) => [
	index("agents_archived_created_idx").using("btree", table.archived.asc().nullsLast().op("timestamptz_ops"), table.createdAt.asc().nullsLast().op("timestamptz_ops")),
]);

export const reactions = pgTable("reactions", {
	id: serial().primaryKey().notNull(),
	boutId: varchar("bout_id", { length: 21 }).notNull(),
	turnIndex: integer("turn_index").notNull(),
	reactionType: varchar("reaction_type", { length: 32 }).notNull(),
	userId: varchar("user_id", { length: 128 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("reactions_bout_id_idx").using("btree", table.boutId.asc().nullsLast().op("text_ops")),
]);

export const users = pgTable("users", {
	id: varchar({ length: 128 }).primaryKey().notNull(),
	email: varchar({ length: 256 }),
	displayName: varchar("display_name", { length: 128 }),
	imageUrl: varchar("image_url", { length: 512 }),
	referralCode: varchar("referral_code", { length: 32 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	subscriptionTier: userTier("subscription_tier").default('free').notNull(),
	subscriptionStatus: varchar("subscription_status", { length: 32 }),
	subscriptionId: varchar("subscription_id", { length: 128 }),
	subscriptionCurrentPeriodEnd: timestamp("subscription_current_period_end", { withTimezone: true, mode: 'string' }),
	stripeCustomerId: varchar("stripe_customer_id", { length: 128 }),
	freeBoutsUsed: integer("free_bouts_used").default(0).notNull(),
}, (table) => [
	uniqueIndex("users_referral_code_idx").using("btree", table.referralCode.asc().nullsLast().op("text_ops")),
]);

export const shortLinks = pgTable("short_links", {
	id: serial().primaryKey().notNull(),
	slug: varchar({ length: 32 }).notNull(),
	boutId: varchar("bout_id", { length: 21 }).notNull(),
	createdByUserId: varchar("created_by_user_id", { length: 128 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("short_links_bout_id_idx").using("btree", table.boutId.asc().nullsLast().op("text_ops")),
	uniqueIndex("short_links_slug_idx").using("btree", table.slug.asc().nullsLast().op("text_ops")),
]);

export const shortLinkClicks = pgTable("short_link_clicks", {
	id: serial().primaryKey().notNull(),
	shortLinkId: integer("short_link_id").notNull(),
	boutId: varchar("bout_id", { length: 21 }).notNull(),
	refCode: varchar("ref_code", { length: 64 }),
	utmSource: varchar("utm_source", { length: 128 }),
	utmMedium: varchar("utm_medium", { length: 128 }),
	utmCampaign: varchar("utm_campaign", { length: 128 }),
	utmTerm: varchar("utm_term", { length: 128 }),
	utmContent: varchar("utm_content", { length: 128 }),
	referer: text(),
	userAgent: text("user_agent"),
	ipHash: varchar("ip_hash", { length: 66 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.shortLinkId],
			foreignColumns: [shortLinks.id],
			name: "short_link_clicks_short_link_id_short_links_id_fk"
		}),
]);

export const remixEvents = pgTable("remix_events", {
	id: serial().primaryKey().notNull(),
	sourceAgentId: varchar("source_agent_id", { length: 128 }).notNull(),
	remixedAgentId: varchar("remixed_agent_id", { length: 128 }),
	remixerUserId: varchar("remixer_user_id", { length: 128 }).notNull(),
	sourceOwnerId: varchar("source_owner_id", { length: 128 }),
	outcome: varchar({ length: 32 }).notNull(),
	reason: varchar({ length: 64 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	rewardRemixerMicro: bigint("reward_remixer_micro", { mode: "number" }).default(0).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	rewardSourceOwnerMicro: bigint("reward_source_owner_micro", { mode: "number" }).default(0).notNull(),
	metadata: jsonb().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const researchExports = pgTable("research_exports", {
	id: serial().primaryKey().notNull(),
	version: varchar({ length: 16 }).notNull(),
	generatedAt: timestamp("generated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	boutCount: integer("bout_count").notNull(),
	reactionCount: integer("reaction_count").notNull(),
	voteCount: integer("vote_count").notNull(),
	agentCount: integer("agent_count").notNull(),
	payload: jsonb().notNull(),
});

export const winnerVotes = pgTable("winner_votes", {
	id: serial().primaryKey().notNull(),
	boutId: varchar("bout_id", { length: 21 }).notNull(),
	agentId: varchar("agent_id", { length: 128 }).notNull(),
	userId: varchar("user_id", { length: 128 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("winner_votes_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	uniqueIndex("winner_votes_unique").using("btree", table.boutId.asc().nullsLast().op("text_ops"), table.userId.asc().nullsLast().op("text_ops")),
]);

export const creditTransactions = pgTable("credit_transactions", {
	id: serial().primaryKey().notNull(),
	userId: varchar("user_id", { length: 128 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	deltaMicro: bigint("delta_micro", { mode: "number" }).notNull(),
	source: varchar({ length: 64 }).notNull(),
	referenceId: varchar("reference_id", { length: 128 }),
	metadata: jsonb().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("credit_txn_reference_id_idx").using("btree", table.referenceId.asc().nullsLast().op("text_ops")),
	index("credit_txn_user_created_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.createdAt.asc().nullsLast().op("text_ops")),
]);

export const credits = pgTable("credits", {
	userId: varchar("user_id", { length: 128 }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	balanceMicro: bigint("balance_micro", { mode: "number" }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const introPool = pgTable("intro_pool", {
	id: serial().primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	initialMicro: bigint("initial_micro", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	claimedMicro: bigint("claimed_micro", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	drainRateMicroPerMinute: bigint("drain_rate_micro_per_minute", { mode: "number" }).notNull(),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const referrals = pgTable("referrals", {
	id: serial().primaryKey().notNull(),
	referrerId: varchar("referrer_id", { length: 128 }).notNull(),
	referredId: varchar("referred_id", { length: 128 }).notNull(),
	code: varchar({ length: 32 }).notNull(),
	credited: boolean().default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const newsletterSignups = pgTable("newsletter_signups", {
	id: serial().primaryKey().notNull(),
	email: varchar({ length: 256 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("newsletter_signups_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
]);

export const agentFlags = pgTable("agent_flags", {
	id: serial().primaryKey().notNull(),
	agentId: varchar("agent_id", { length: 128 }).notNull(),
	userId: varchar("user_id", { length: 128 }).notNull(),
	reason: varchar({ length: 32 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("agent_flags_unique").using("btree", table.agentId.asc().nullsLast().op("text_ops"), table.userId.asc().nullsLast().op("text_ops")),
]);

export const freeBoutPool = pgTable("free_bout_pool", {
	id: serial().primaryKey().notNull(),
	date: varchar({ length: 10 }).notNull(),
	used: integer().default(0).notNull(),
	maxDaily: integer("max_daily").notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("free_bout_pool_date_idx").using("btree", table.date.asc().nullsLast().op("text_ops")),
]);

export const bouts = pgTable("bouts", {
	id: varchar({ length: 21 }).primaryKey().notNull(),
	presetId: varchar("preset_id", { length: 64 }).notNull(),
	status: boutStatus().notNull(),
	transcript: jsonb().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	ownerId: varchar("owner_id", { length: 128 }),
	topic: text(),
	responseLength: varchar("response_length", { length: 32 }),
	responseFormat: varchar("response_format", { length: 32 }),
	agentLineup: jsonb("agent_lineup"),
	shareLine: text("share_line"),
	shareGeneratedAt: timestamp("share_generated_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("bouts_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
]);
