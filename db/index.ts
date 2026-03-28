import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';

import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

// Use neon-serverless (WebSocket Pool) instead of neon-http to support
// interactive transactions (db.transaction()). neon-http is stateless and
// throws "No transactions support in neon-http driver" at runtime.
// Node 22+ has native WebSocket — no ws polyfill needed.
export const db = connectionString
  ? drizzle({ client: new Pool({ connectionString }), schema })
  : null;

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
