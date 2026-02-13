#!/usr/bin/env tsx
/**
 * QA Test Account Teardown Script
 *
 * Removes test accounts from Clerk and database.
 * Run with: pnpm run qa:teardown
 *
 * Prerequisites:
 * - CLERK_SECRET_KEY must be set (development instance)
 * - DATABASE_URL must be set
 */

import { createClerkClient } from '@clerk/backend'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'

import { users, credits } from '../../db/schema.js'

// --------------------------------------------------------------------------
// Configuration
// --------------------------------------------------------------------------

const TEST_EMAILS = [
  'qa-free@thepit.test',
  'qa-premium@thepit.test',
  'qa-exhausted@thepit.test',
]

// --------------------------------------------------------------------------
// Script
// --------------------------------------------------------------------------

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║  QA Test Account Teardown                                  ║')
  console.log('╚════════════════════════════════════════════════════════════╝\n')

  // Validate environment
  const clerkSecretKey = process.env.CLERK_SECRET_KEY
  const databaseUrl = process.env.DATABASE_URL

  if (!clerkSecretKey) {
    console.error('❌ CLERK_SECRET_KEY is required')
    process.exit(1)
  }

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is required')
    process.exit(1)
  }

  // Safety check
  if (!clerkSecretKey.startsWith('sk_test_')) {
    console.error('❌ CLERK_SECRET_KEY must be a test/development key (sk_test_*)')
    console.error('   Refusing to delete users from production Clerk instance')
    process.exit(1)
  }

  // Confirm with user
  const args = process.argv.slice(2)
  if (!args.includes('--yes') && !args.includes('-y')) {
    console.log('This will DELETE the following test accounts:')
    TEST_EMAILS.forEach((email) => console.log(`  - ${email}`))
    console.log('')
    console.log('Run with --yes to confirm deletion')
    process.exit(0)
  }

  // Initialize clients
  const clerk = createClerkClient({ secretKey: clerkSecretKey })
  const sql = neon(databaseUrl)
  const db = drizzle(sql, { schema: { users, credits } })

  let deletedCount = 0
  let notFoundCount = 0

  for (const email of TEST_EMAILS) {
    console.log(`\n━━━ Removing ${email} ━━━`)

    try {
      // Find user in Clerk
      const existingUsers = await clerk.users.getUserList({
        emailAddress: [email],
      })

      if (existingUsers.data.length === 0) {
        console.log(`    ⊘ User not found in Clerk`)
        notFoundCount++
        continue
      }

      const userId = existingUsers.data[0].id

      // Delete from database first (foreign key safe order)
      await db.delete(credits).where(eq(credits.userId, userId))
      console.log(`    ✓ Deleted credits record`)

      await db.delete(users).where(eq(users.id, userId))
      console.log(`    ✓ Deleted user record`)

      // Delete from Clerk
      await clerk.users.deleteUser(userId)
      console.log(`    ✓ Deleted from Clerk: ${userId}`)

      deletedCount++
    } catch (error) {
      console.error(`    ❌ Failed:`, error instanceof Error ? error.message : error)
    }
  }

  // Print summary
  console.log('\n╔════════════════════════════════════════════════════════════╗')
  console.log('║  Teardown Complete                                         ║')
  console.log('╚════════════════════════════════════════════════════════════╝\n')

  console.log(`Deleted: ${deletedCount}`)
  console.log(`Not found: ${notFoundCount}`)

  if (deletedCount > 0) {
    console.log('\nRemember to remove the QA_*_USER_ID variables from .env.test')
  }
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
