/**
 * db/index.ts — Neon serverless connection + Drizzle instance.
 *
 * Uses Pool (not HTTP driver) for transaction support.
 * DATABASE_URL comes from env validation (lib/common/env.ts).
 */

import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle(pool, { schema });
