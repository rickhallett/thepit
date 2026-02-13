#!/usr/bin/env tsx
/**
 * QA Test Account Setup Script
 *
 * Creates test accounts in Clerk and corresponding database records.
 * Run with: pnpm run qa:setup
 *
 * Prerequisites:
 * - CLERK_SECRET_KEY must be set (development instance)
 * - DATABASE_URL must be set
 * - QA_TEST_PASSWORD should be set (or uses default)
 */

import { createClerkClient } from '@clerk/backend'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'

import { users, credits } from '../../db/schema.js'

// --------------------------------------------------------------------------
// Configuration
// --------------------------------------------------------------------------

interface AccountConfig {
  key: string
  email: string
  firstName: string
  lastName: string
  tier: 'free' | 'pass' | 'lab'
  creditsMicro: number
}

const TEST_ACCOUNTS: AccountConfig[] = [
  {
    key: 'standard',
    email: 'qa-standard@thepit.cloud',
    firstName: 'QA',
    lastName: 'Standard',
    tier: 'free',
    creditsMicro: 50000, // 500 credits
  },
  {
    key: 'premium',
    email: 'qa-premium@thepit.cloud',
    firstName: 'QA',
    lastName: 'Premium',
    tier: 'pass',
    creditsMicro: 100000, // 1000 credits
  },
  {
    key: 'exhausted',
    email: 'qa-exhausted@thepit.cloud',
    firstName: 'QA',
    lastName: 'Exhausted',
    tier: 'free',
    creditsMicro: 0,
  },
]

// --------------------------------------------------------------------------
// Script
// --------------------------------------------------------------------------

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║  QA Test Account Setup                                     ║')
  console.log('╚════════════════════════════════════════════════════════════╝\n')

  // Validate environment
  const clerkSecretKey = process.env.CLERK_SECRET_KEY
  const databaseUrl = process.env.DATABASE_URL
  const testPassword = process.env.QA_TEST_PASSWORD || 'QaTest123!'

  if (!clerkSecretKey) {
    console.error('❌ CLERK_SECRET_KEY is required')
    process.exit(1)
  }

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is required')
    process.exit(1)
  }

  // Warn about development instance
  if (!clerkSecretKey.startsWith('sk_test_')) {
    console.warn('⚠️  Warning: CLERK_SECRET_KEY does not start with sk_test_')
    console.warn('   Make sure you are using a DEVELOPMENT Clerk instance!')
    console.warn('')
  }

  // Initialize clients
  const clerk = createClerkClient({ secretKey: clerkSecretKey })
  const sql = neon(databaseUrl)
  const db = drizzle(sql, { schema: { users, credits } })

  const results: { key: string; email: string; userId: string }[] = []

  for (const account of TEST_ACCOUNTS) {
    console.log(`\n━━━ Setting up ${account.key} account ━━━`)
    console.log(`    Email: ${account.email}`)

    try {
      // Step 1: Check if user exists in Clerk
      let userId: string
      const existingUsers = await clerk.users.getUserList({
        emailAddress: [account.email],
      })

      if (existingUsers.data.length > 0) {
        userId = existingUsers.data[0].id
        console.log(`    ✓ User exists in Clerk: ${userId}`)
      } else {
        // Create user in Clerk
        const newUser = await clerk.users.createUser({
          emailAddress: [account.email],
          firstName: account.firstName,
          lastName: account.lastName,
          password: testPassword,
        })
        userId = newUser.id
        console.log(`    ✓ Created user in Clerk: ${userId}`)
      }

      // Step 2: Upsert user record in database
      const [existingDbUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)

      if (existingDbUser) {
        await db
          .update(users)
          .set({
            email: account.email,
            displayName: `${account.firstName} ${account.lastName}`,
            subscriptionTier: account.tier,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId))
        console.log(`    ✓ Updated user record in database`)
      } else {
        await db.insert(users).values({
          id: userId,
          email: account.email,
          displayName: `${account.firstName} ${account.lastName}`,
          subscriptionTier: account.tier,
        })
        console.log(`    ✓ Created user record in database`)
      }

      // Step 3: Upsert credits record
      const [existingCredits] = await db
        .select()
        .from(credits)
        .where(eq(credits.userId, userId))
        .limit(1)

      if (existingCredits) {
        await db
          .update(credits)
          .set({
            balanceMicro: account.creditsMicro,
            updatedAt: new Date(),
          })
          .where(eq(credits.userId, userId))
        console.log(`    ✓ Updated credits: ${account.creditsMicro / 100} credits`)
      } else {
        await db.insert(credits).values({
          userId,
          balanceMicro: account.creditsMicro,
        })
        console.log(`    ✓ Created credits: ${account.creditsMicro / 100} credits`)
      }

      results.push({ key: account.key, email: account.email, userId })
    } catch (error) {
      // Clerk errors have additional details in the 'errors' array
      if (error && typeof error === 'object' && 'errors' in error) {
        const clerkError = error as { errors: Array<{ message: string; code: string; meta?: Record<string, unknown> }> }
        console.error(`    ❌ Failed:`)
        for (const err of clerkError.errors) {
          console.error(`       - ${err.code}: ${err.message}`)
          if (err.meta) console.error(`         ${JSON.stringify(err.meta)}`)
        }
      } else {
        console.error(`    ❌ Failed:`, error instanceof Error ? error.message : error)
      }
    }
  }

  // Print summary
  console.log('\n╔════════════════════════════════════════════════════════════╗')
  console.log('║  Setup Complete                                            ║')
  console.log('╚════════════════════════════════════════════════════════════╝\n')

  if (results.length > 0) {
    console.log('Add these to your .env.test file:\n')
    console.log('# QA Test Accounts (generated by qa:setup)')
    console.log(`QA_TEST_PASSWORD=${testPassword}`)
    console.log('')

    for (const result of results) {
      const envPrefix = result.key === 'standard' ? 'QA_TEST' : `QA_${result.key.toUpperCase()}`
      console.log(`${envPrefix}_USER_EMAIL=${result.email}`)
      console.log(`${envPrefix}_USER_ID=${result.userId}`)
    }

    console.log('\n# Note: All accounts use QA_TEST_PASSWORD')
  }

  if (results.length < TEST_ACCOUNTS.length) {
    console.warn(`\n⚠️  ${TEST_ACCOUNTS.length - results.length} account(s) failed to set up`)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
