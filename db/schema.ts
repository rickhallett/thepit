// Drizzle ORM schema for THE PIT's PostgreSQL database (Neon serverless).
//
// Key design decisions:
//   - bouts.id uses varchar(21) because nanoid() produces 21-char IDs by default.
//   - credits.balanceMicro is a bigint in micro-credits (1 credit = 100 micro)
//     to avoid floating-point rounding in financial operations.
//   - bouts.agentLineup is JSONB rather than a join table because arena-mode
//     lineups are ephemeral, user-composed, and only read alongside the bout.
//   - agents has both promptHash and manifestHash: promptHash identifies the
//     behaviour (system prompt only), manifestHash identifies the full identity
//     (all fields). Both are used in on-chain EAS attestations.
//   - winnerVotes has a unique index on (boutId, userId) to enforce one vote per
//     user per bout at the database level.

import {
  jsonb,
  pgEnum,
  pgTable,
  serial,
  timestamp,
  varchar,
  bigint,
  text,
  uniqueIndex,
  index,
  boolean,
  integer,
} from 'drizzle-orm/pg-core';

export type TranscriptEntry = {
  turn: number;
  agentId: string;
  agentName: string;
  text: string;
};

export type ArenaAgent = {
  id: string;
  name: string;
  systemPrompt: string;
  color?: string;
  avatar?: string;
};

export const boutStatus = pgEnum('bout_status', [
  'running',
  'completed',
  'error',
]);

export const agentTier = pgEnum('agent_tier', ['free', 'premium', 'custom']);

export const userTier = pgEnum('user_tier', ['free', 'pass', 'lab']);

export const bouts = pgTable('bouts', {
  id: varchar('id', { length: 21 }).primaryKey(),
  presetId: varchar('preset_id', { length: 64 }).notNull(),
  status: boutStatus('status').notNull(),
  transcript: jsonb('transcript').$type<TranscriptEntry[]>().notNull(),
  ownerId: varchar('owner_id', { length: 128 }),
  topic: text('topic'),
  responseLength: varchar('response_length', { length: 32 }),
  responseFormat: varchar('response_format', { length: 32 }),
  agentLineup: jsonb('agent_lineup').$type<ArenaAgent[]>(),
  shareLine: text('share_line'),
  shareGeneratedAt: timestamp('share_generated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => ({
  createdAtIdx: index('bouts_created_at_idx').on(table.createdAt),
}));

export const users = pgTable('users', {
  id: varchar('id', { length: 128 }).primaryKey(),
  email: varchar('email', { length: 256 }),
  displayName: varchar('display_name', { length: 128 }),
  imageUrl: varchar('image_url', { length: 512 }),
  referralCode: varchar('referral_code', { length: 32 }),
  subscriptionTier: userTier('subscription_tier').notNull().default('free'),
  subscriptionStatus: varchar('subscription_status', { length: 32 }),
  subscriptionId: varchar('subscription_id', { length: 128 }),
  subscriptionCurrentPeriodEnd: timestamp('subscription_current_period_end', {
    withTimezone: true,
  }),
  stripeCustomerId: varchar('stripe_customer_id', { length: 128 }),
  freeBoutsUsed: integer('free_bouts_used').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => ({
  referralCodeIdx: uniqueIndex('users_referral_code_idx').on(
    table.referralCode,
  ),
}));

export const credits = pgTable('credits', {
  userId: varchar('user_id', { length: 128 }).primaryKey(),
  balanceMicro: bigint('balance_micro', { mode: 'number' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const creditTransactions = pgTable('credit_transactions', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 128 }).notNull(),
  deltaMicro: bigint('delta_micro', { mode: 'number' }).notNull(),
  source: varchar('source', { length: 64 }).notNull(),
  referenceId: varchar('reference_id', { length: 128 }),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => ({
  userCreatedIdx: index('credit_txn_user_created_idx').on(
    table.userId,
    table.createdAt,
  ),
  referenceIdIdx: index('credit_txn_reference_id_idx').on(table.referenceId),
}));

export const introPool = pgTable('intro_pool', {
  id: serial('id').primaryKey(),
  initialMicro: bigint('initial_micro', { mode: 'number' }).notNull(),
  claimedMicro: bigint('claimed_micro', { mode: 'number' }).notNull(),
  drainRateMicroPerMinute: bigint('drain_rate_micro_per_minute', {
    mode: 'number',
  }).notNull(),
  startedAt: timestamp('started_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const referrals = pgTable('referrals', {
  id: serial('id').primaryKey(),
  referrerId: varchar('referrer_id', { length: 128 }).notNull(),
  referredId: varchar('referred_id', { length: 128 }).notNull(),
  code: varchar('code', { length: 32 }).notNull(),
  credited: boolean('credited').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const reactions = pgTable('reactions', {
  id: serial('id').primaryKey(),
  boutId: varchar('bout_id', { length: 21 }).notNull(),
  turnIndex: integer('turn_index').notNull(),
  reactionType: varchar('reaction_type', { length: 32 }).notNull(),
  userId: varchar('user_id', { length: 128 }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => ({
  boutIdIdx: index('reactions_bout_id_idx').on(table.boutId),
  uniqueReaction: uniqueIndex('reactions_unique_idx').on(
    table.boutId,
    table.turnIndex,
    table.reactionType,
    table.userId,
  ),
}));

export const winnerVotes = pgTable(
  'winner_votes',
  {
    id: serial('id').primaryKey(),
    boutId: varchar('bout_id', { length: 21 }).notNull(),
    agentId: varchar('agent_id', { length: 128 }).notNull(),
    userId: varchar('user_id', { length: 128 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    uniqueVote: uniqueIndex('winner_votes_unique').on(
      table.boutId,
      table.userId,
    ),
    createdAtIdx: index('winner_votes_created_at_idx').on(table.createdAt),
  }),
);

export const newsletterSignups = pgTable('newsletter_signups', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 256 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => ({
  emailIdx: uniqueIndex('newsletter_signups_email_idx').on(table.email),
}));

export const agents = pgTable('agents', {
  id: varchar('id', { length: 128 }).primaryKey(),
  name: varchar('name', { length: 128 }).notNull(),
  systemPrompt: text('system_prompt').notNull(),
  presetId: varchar('preset_id', { length: 64 }),
  tier: agentTier('tier').notNull(),
  model: varchar('model', { length: 128 }),
  responseLength: varchar('response_length', { length: 32 }).notNull(),
  responseFormat: varchar('response_format', { length: 32 }).notNull(),
  archetype: text('archetype'),
  tone: text('tone'),
  quirks: jsonb('quirks').$type<string[]>(),
  speechPattern: text('speech_pattern'),
  openingMove: text('opening_move'),
  signatureMove: text('signature_move'),
  weakness: text('weakness'),
  goal: text('goal'),
  fears: text('fears'),
  customInstructions: text('custom_instructions'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  ownerId: varchar('owner_id', { length: 128 }),
  parentId: varchar('parent_id', { length: 128 }),
  promptHash: varchar('prompt_hash', { length: 66 }).notNull(),
  manifestHash: varchar('manifest_hash', { length: 66 }).notNull(),
  attestationUid: varchar('attestation_uid', { length: 128 }),
  attestationTxHash: varchar('attestation_tx_hash', { length: 66 }),
  attestedAt: timestamp('attested_at', { withTimezone: true }),
  archived: boolean('archived').notNull().default(false),
}, (table) => ({
  archivedCreatedIdx: index('agents_archived_created_idx').on(
    table.archived,
    table.createdAt,
  ),
}));

export const freeBoutPool = pgTable('free_bout_pool', {
  id: serial('id').primaryKey(),
  date: varchar('date', { length: 10 }).notNull(),
  used: integer('used').notNull().default(0),
  maxDaily: integer('max_daily').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => ({
  dateIdx: uniqueIndex('free_bout_pool_date_idx').on(table.date),
}));

export const agentFlags = pgTable(
  'agent_flags',
  {
    id: serial('id').primaryKey(),
    agentId: varchar('agent_id', { length: 128 }).notNull(),
    userId: varchar('user_id', { length: 128 }).notNull(),
    reason: varchar('reason', { length: 32 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    uniqueFlag: uniqueIndex('agent_flags_unique').on(
      table.agentId,
      table.userId,
    ),
  }),
);
