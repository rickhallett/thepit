import {
  jsonb,
  pgEnum,
  pgTable,
  serial,
  timestamp,
  varchar,
  bigint,
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
