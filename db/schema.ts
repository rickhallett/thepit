import { jsonb, pgEnum, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

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
