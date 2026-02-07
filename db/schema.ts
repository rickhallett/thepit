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
  boolean,
} from 'drizzle-orm/pg-core';

export type TranscriptEntry = {
  turn: number;
  agentId: string;
  agentName: string;
  text: string;
};

export const boutStatus = pgEnum('bout_status', [
  'running',
  'completed',
  'error',
]);

export const agentTier = pgEnum('agent_tier', ['free', 'premium', 'custom']);

export const bouts = pgTable('bouts', {
  id: varchar('id', { length: 21 }).primaryKey(),
  presetId: varchar('preset_id', { length: 64 }).notNull(),
  status: boutStatus('status').notNull(),
  transcript: jsonb('transcript').$type<TranscriptEntry[]>().notNull(),
  ownerId: varchar('owner_id', { length: 128 }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const users = pgTable('users', {
  id: varchar('id', { length: 128 }).primaryKey(),
  email: varchar('email', { length: 256 }),
  displayName: varchar('display_name', { length: 128 }),
  imageUrl: varchar('image_url', { length: 512 }),
  referralCode: varchar('referral_code', { length: 32 }),
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
});

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

export const agents = pgTable('agents', {
  id: varchar('id', { length: 128 }).primaryKey(),
  name: varchar('name', { length: 128 }).notNull(),
  systemPrompt: text('system_prompt').notNull(),
  presetId: varchar('preset_id', { length: 64 }),
  tier: agentTier('tier').notNull(),
  model: varchar('model', { length: 128 }),
  responseLength: varchar('response_length', { length: 32 }).notNull(),
  responseFormat: varchar('response_format', { length: 32 }).notNull(),
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
});
