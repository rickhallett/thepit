/**
 * Production data reset script.
 *
 * Clears activity data (bouts, votes, reactions, analytics) while preserving
 * users, agents, and configuration. Resets intro pool to specified amount.
 *
 * Usage:
 *   DATABASE_URL=<prod_url> npx tsx scripts/reset-prod-data.ts [--dry-run]
 *
 * WARNING: This is a destructive operation. Use with caution.
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';

const INTRO_POOL_CREDITS = 15000;
const MICRO_PER_CREDIT = 100;
const INTRO_POOL_MICRO = INTRO_POOL_CREDITS * MICRO_PER_CREDIT;
const DRAIN_RATE_MICRO_PER_MINUTE = MICRO_PER_CREDIT; // 1 credit per minute

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  process.exit(1);
}

const isDryRun = process.argv.includes('--dry-run');

async function main() {
  console.log('='.repeat(60));
  console.log('PRODUCTION DATA RESET');
  console.log('='.repeat(60));
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes will be made)' : 'LIVE'}`);
  console.log(`Intro pool will be set to: ${INTRO_POOL_CREDITS} credits`);
  console.log('');

  const db = drizzle(neon(connectionString));

  // Tables to truncate (all activity data)
  const tablesToTruncate = [
    'bouts',
    'reactions',
    'winner_votes',
    'short_links',
    'short_link_clicks',
    'page_views',
    'remix_events',
    'research_exports',
    'credit_transactions',
    'free_bout_pool',
  ];

  console.log('Tables to TRUNCATE:');
  for (const table of tablesToTruncate) {
    console.log(`  - ${table}`);
  }
  console.log('');

  console.log('Tables to UPDATE:');
  console.log('  - users.free_bouts_used → 0');
  console.log(`  - intro_pool → ${INTRO_POOL_CREDITS} credits (${INTRO_POOL_MICRO} micro)`);
  console.log('');

  console.log('Tables PRESERVED:');
  console.log('  - agents');
  console.log('  - users (except free_bouts_used)');
  console.log('  - credits');
  console.log('  - newsletter_signups');
  console.log('  - referrals');
  console.log('  - paper_submissions');
  console.log('  - feature_requests');
  console.log('  - feature_request_votes');
  console.log('');

  if (isDryRun) {
    console.log('DRY RUN - No changes made. Remove --dry-run to execute.');
    return;
  }

  // Confirm before proceeding
  console.log('Proceeding with reset...');
  console.log('');

  // Truncate tables (order matters for foreign keys)
  console.log('Truncating tables...');

  // short_link_clicks references short_links, so truncate it first
  await db.execute(sql`TRUNCATE TABLE short_link_clicks CASCADE`);
  console.log('  ✓ short_link_clicks');

  await db.execute(sql`TRUNCATE TABLE short_links CASCADE`);
  console.log('  ✓ short_links');

  await db.execute(sql`TRUNCATE TABLE reactions CASCADE`);
  console.log('  ✓ reactions');

  await db.execute(sql`TRUNCATE TABLE winner_votes CASCADE`);
  console.log('  ✓ winner_votes');

  await db.execute(sql`TRUNCATE TABLE bouts CASCADE`);
  console.log('  ✓ bouts');

  await db.execute(sql`TRUNCATE TABLE page_views CASCADE`);
  console.log('  ✓ page_views');

  await db.execute(sql`TRUNCATE TABLE remix_events CASCADE`);
  console.log('  ✓ remix_events');

  await db.execute(sql`TRUNCATE TABLE research_exports CASCADE`);
  console.log('  ✓ research_exports');

  await db.execute(sql`TRUNCATE TABLE credit_transactions CASCADE`);
  console.log('  ✓ credit_transactions');

  await db.execute(sql`TRUNCATE TABLE free_bout_pool CASCADE`);
  console.log('  ✓ free_bout_pool');

  console.log('');

  // Reset user free bouts used
  console.log('Resetting user free_bouts_used...');
  const userResult = await db.execute(sql`UPDATE users SET free_bouts_used = 0`);
  console.log(`  ✓ Reset ${userResult.rowCount ?? 0} users`);
  console.log('');

  // Reset intro pool
  console.log('Resetting intro pool...');
  // First, check if intro_pool has any rows
  const existingPool = await db.execute(sql`SELECT id FROM intro_pool LIMIT 1`);

  if (existingPool.rows.length > 0) {
    // Update existing row
    await db.execute(sql`
      UPDATE intro_pool
      SET
        initial_micro = ${INTRO_POOL_MICRO},
        claimed_micro = 0,
        drain_rate_micro_per_minute = ${DRAIN_RATE_MICRO_PER_MINUTE},
        started_at = NOW(),
        updated_at = NOW()
      WHERE id = (SELECT id FROM intro_pool ORDER BY id LIMIT 1)
    `);
    console.log('  ✓ Updated existing intro_pool row');
  } else {
    // Insert new row
    await db.execute(sql`
      INSERT INTO intro_pool (initial_micro, claimed_micro, drain_rate_micro_per_minute, started_at, updated_at)
      VALUES (${INTRO_POOL_MICRO}, 0, ${DRAIN_RATE_MICRO_PER_MINUTE}, NOW(), NOW())
    `);
    console.log('  ✓ Created new intro_pool row');
  }
  console.log(`  ✓ Intro pool set to ${INTRO_POOL_CREDITS} credits`);
  console.log('');

  console.log('='.repeat(60));
  console.log('RESET COMPLETE');
  console.log('='.repeat(60));
}

main().catch((error) => {
  console.error('Reset failed:', error);
  process.exit(1);
});
