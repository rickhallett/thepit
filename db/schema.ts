/**
 * db/schema.ts — all table definitions for The Pit v2.
 *
 * 4 enums, 11 tables (subscriptions data lives on users table).
 * Source of truth: SPEC.md Data Model section.
 * Column names match SPEC.md exactly (snake_case).
 */

import {
  boolean,
  bigint,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

// ── Enums ─────────────────────────────────────────────────

export const boutStatusEnum = pgEnum("bout_status", [
  "running",
  "completed",
  "error",
]);

export const agentTierEnum = pgEnum("agent_tier", [
  "free",
  "premium",
  "custom",
]);

export const userTierEnum = pgEnum("user_tier", [
  "free",
  "pass",
  "lab",
]);

export const reactionTypeEnum = pgEnum("reaction_type", [
  "heart",
  "fire",
]);

// ── Tables ────────────────────────────────────────────────

export const users = pgTable("users", {
  id: varchar("id", { length: 128 }).primaryKey(),
  email: varchar("email", { length: 256 }),
  displayName: varchar("display_name", { length: 256 }),
  imageUrl: text("image_url"),
  referralCode: varchar("referral_code", { length: 16 }).unique(),
  subscriptionTier: userTierEnum("subscription_tier").default("free"),
  subscriptionId: varchar("subscription_id", { length: 256 }),
  subscriptionStatus: varchar("subscription_status", { length: 32 }),
  stripeCustomerId: varchar("stripe_customer_id", { length: 256 }),
  freeBoutsUsed: integer("free_bouts_used").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

export const bouts = pgTable("bouts", {
  id: varchar("id", { length: 21 }).primaryKey(),
  ownerId: varchar("owner_id", { length: 128 }).references(() => users.id),
  presetId: varchar("preset_id", { length: 64 }),
  topic: varchar("topic", { length: 500 }),
  agentLineup: jsonb("agent_lineup"),
  transcript: jsonb("transcript"),
  shareLine: text("share_line"),
  status: boutStatusEnum("status"),
  model: varchar("model", { length: 64 }),
  responseLength: varchar("response_length", { length: 16 }),
  responseFormat: varchar("response_format", { length: 16 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

export const agents = pgTable("agents", {
  id: varchar("id", { length: 128 }).primaryKey(),
  ownerId: varchar("owner_id", { length: 128 }).references(() => users.id),
  name: varchar("name", { length: 80 }),
  systemPrompt: text("system_prompt"),
  presetId: varchar("preset_id", { length: 64 }),
  archetype: varchar("archetype", { length: 200 }),
  tone: varchar("tone", { length: 200 }),
  quirks: text("quirks").array(),
  speechPattern: varchar("speech_pattern", { length: 200 }),
  openingMove: varchar("opening_move", { length: 500 }),
  signatureMove: varchar("signature_move", { length: 500 }),
  weakness: varchar("weakness", { length: 500 }),
  goal: varchar("goal", { length: 500 }),
  promptHash: varchar("prompt_hash", { length: 66 }),
  tier: agentTierEnum("tier"),
  archived: boolean("archived").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const credits = pgTable("credits", {
  userId: varchar("user_id", { length: 128 })
    .primaryKey()
    .references(() => users.id),
  balanceMicro: bigint("balance_micro", { mode: "number" }).default(10000),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

export const creditTransactions = pgTable("credit_transactions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 128 }).references(() => users.id),
  deltaMicro: bigint("delta_micro", { mode: "number" }),
  source: varchar("source", { length: 32 }),
  referenceId: varchar("reference_id", { length: 256 }).unique(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reactions = pgTable(
  "reactions",
  {
    id: serial("id").primaryKey(),
    boutId: varchar("bout_id", { length: 21 }).references(() => bouts.id),
    turnIndex: integer("turn_index"),
    reactionType: reactionTypeEnum("reaction_type"),
    userId: varchar("user_id", { length: 128 }).references(() => users.id),
    clientFingerprint: varchar("client_fingerprint", { length: 128 }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [
    unique("reactions_unique").on(
      t.boutId,
      t.turnIndex,
      t.reactionType,
      t.clientFingerprint,
    ),
  ],
);

export const winnerVotes = pgTable(
  "winner_votes",
  {
    id: serial("id").primaryKey(),
    boutId: varchar("bout_id", { length: 21 }).references(() => bouts.id),
    userId: varchar("user_id", { length: 128 }).references(() => users.id),
    agentId: varchar("agent_id", { length: 128 }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [unique("winner_votes_unique").on(t.boutId, t.userId)],
);

export const shortLinks = pgTable("short_links", {
  id: serial("id").primaryKey(),
  boutId: varchar("bout_id", { length: 21 })
    .references(() => bouts.id)
    .unique(),
  slug: varchar("slug", { length: 16 }).unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: varchar("referrer_id", { length: 128 }).references(
    () => users.id,
  ),
  referredId: varchar("referred_id", { length: 128 }).references(
    () => users.id,
  ),
  code: varchar("code", { length: 16 }),
  credited: boolean("credited").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const introPool = pgTable("intro_pool", {
  id: serial("id").primaryKey(),
  initialMicro: bigint("initial_micro", { mode: "number" }).default(1000000),
  claimedMicro: bigint("claimed_micro", { mode: "number" }).default(0),
  halfLifeDays: numeric("half_life_days").default("3"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pageViews = pgTable("page_views", {
  id: serial("id").primaryKey(),
  path: varchar("path", { length: 512 }),
  sessionId: varchar("session_id", { length: 64 }),
  userId: varchar("user_id", { length: 128 }),
  ipHash: varchar("ip_hash", { length: 64 }),
  referrer: text("referrer"),
  userAgent: text("user_agent"),
  country: varchar("country", { length: 8 }),
  createdAt: timestamp("created_at").defaultNow(),
});
