import {
  jsonb,
  pgEnum,
  pgTable,
  serial,
  timestamp,
  varchar,
  bigint,
  text,
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
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const creditAccounts = pgTable('credit_accounts', {
  id: varchar('id', { length: 64 }).primaryKey(),
  balanceMicro: bigint('balance_micro', { mode: 'number' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const creditEvents = pgTable('credit_events', {
  id: serial('id').primaryKey(),
  accountId: varchar('account_id', { length: 64 }).notNull(),
  deltaMicro: bigint('delta_micro', { mode: 'number' }).notNull(),
  reason: varchar('reason', { length: 64 }).notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull(),
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
