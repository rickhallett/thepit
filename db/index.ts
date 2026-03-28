import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

// postgres-js driver: works with any standard Postgres (Supabase, Neon, etc.).
// Supports interactive transactions natively. Connection-pooler compatible.
const client = connectionString
  ? postgres(connectionString, { prepare: false })
  : null;

export const db = client ? drizzle(client, { schema }) : null;

export function requireDb() {
  if (!db) {
    throw new Error('DATABASE_URL is not set.');
  }
  return db;
}

/** Database or transaction handle for composable operations.
 *  When a caller provides a DbOrTx, the caller owns the transaction boundary -
 *  operations run within the caller's transaction instead of creating their own.
 *  Standardised in SD-329. */
export type DbOrTx = Pick<
  ReturnType<typeof requireDb>,
  'select' | 'insert' | 'update' | 'delete'
>;

export * from './schema';
