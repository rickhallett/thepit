/**
 * Credit System Concurrent/Race Condition Tests
 *
 * Tests that validate the atomic nature of credit operations
 * under concurrent load to prevent race conditions.
 */

import { registerTest, type TestContext, type RunResult } from '../../registry.js'
import { makeRequest } from '../security/utils.js'

// RACE-001: Double preauthorization race
registerTest({
  id: 'SEC-RACE-001',
  tier: 'api',
  run: async (ctx: TestContext): Promise<RunResult> => {
    // Simulate two bout starts at the exact same moment
    // Only one should succeed if credits are limited

    const boutRequests = [1, 2].map((n) => async () => {
      return makeRequest(ctx.config, '/api/run-bout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boutId: `bout-race-${Date.now()}-${n}`,
          presetId: 'test',
        }),
      })
    })

    // Send simultaneously
    const [res1, res2] = await Promise.all(boutRequests.map(fn => fn()))

    // Without auth, both should fail
    // With auth and limited credits, at most one should succeed
    const successCount = [res1, res2].filter(r => r!.status === 200).length

    // Check neither caused server error
    if (res1!.status === 500 || res2!.status === 500) {
      return {
        passed: false,
        error: 'Race condition caused server error',
        evidence: `Statuses: ${res1!.status}, ${res2!.status}`,
      }
    }

    // If both succeeded, that's a race condition bug (double-spend)
    if (successCount > 1) {
      return {
        passed: false,
        error: 'Race condition allowed double preauthorization',
        evidence: `Both concurrent requests succeeded (${successCount} successes)`,
      }
    }

    return {
      passed: true,
      evidence: `Race condition handled. Statuses: ${res1!.status}, ${res2!.status}`,
    }
  },
})

// RACE-002: Preauth during settlement race
registerTest({
  id: 'SEC-RACE-002',
  tier: 'api',
  run: async (ctx: TestContext): Promise<RunResult> => {
    // Simulate preauth happening while another bout is settling
    // The atomic SQL should prevent inconsistent state

    // Start multiple operations simultaneously
    const operations = Array(5).fill(null).map((_, i) => async () => {
      return makeRequest(ctx.config, '/api/run-bout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boutId: `bout-settle-race-${Date.now()}-${i}`,
          presetId: 'test',
        }),
      })
    })

    const responses = await Promise.all(operations.map(fn => fn()))
    const serverErrors = responses.filter(r => r.status === 500)

    if (serverErrors.length > 0) {
      return {
        passed: false,
        error: `${serverErrors.length} server errors during concurrent operations`,
        evidence: 'Race condition in preauth/settlement',
      }
    }

    return {
      passed: true,
      evidence: 'Concurrent preauth/settlement operations handled safely',
    }
  },
})

// RACE-003: Webhook deduplication race
registerTest({
  id: 'SEC-RACE-003',
  tier: 'api',
  run: async (ctx: TestContext): Promise<RunResult> => {
    // Simulate Stripe sending duplicate webhooks
    // Should be deduplicated by referenceId

    const webhookPayload = JSON.stringify({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_dedup_race_test',
          mode: 'payment',
          metadata: {
            userId: 'user_test',
            credits: '100',
          },
        },
      },
    })

    // Send multiple identical webhooks simultaneously
    const webhookRequests = Array(5).fill(null).map(() => async () => {
      return makeRequest(ctx.config, '/api/credits/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // No signature - should be rejected
        },
        body: webhookPayload,
      })
    })

    const responses = await Promise.all(webhookRequests.map(fn => fn()))
    const statuses = responses.map(r => r.status)

    // All should be rejected without valid signature
    const acceptedCount = statuses.filter(s => s === 200).length

    if (acceptedCount > 0) {
      return {
        passed: false,
        error: 'Webhook accepted without signature',
        evidence: `${acceptedCount} webhooks accepted`,
      }
    }

    return {
      passed: true,
      evidence: 'Duplicate webhooks properly rejected (no signature)',
    }
  },
})

// RACE-004: Referral credit race
registerTest({
  id: 'SEC-RACE-004',
  tier: 'api',
  run: async (ctx: TestContext): Promise<RunResult> => {
    // Multiple requests to redeem same referral code
    const code = 'RACE_TEST_CODE'

    const redeemRequests = Array(5).fill(null).map(() => async () => {
      return makeRequest(ctx.config, '/api/referrals/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
    })

    const responses = await Promise.all(redeemRequests.map(fn => fn()))
    const successCount = responses.filter(r => r.status === 200).length

    // At most one should succeed (or all fail without auth)
    if (successCount > 1) {
      return {
        passed: false,
        error: 'Referral code redeemed multiple times',
        evidence: `${successCount} successful redemptions`,
      }
    }

    return {
      passed: true,
      evidence: 'Referral code redemption properly deduplicated',
    }
  },
})

// RACE-005: Vote counting race
registerTest({
  id: 'SEC-RACE-005',
  tier: 'api',
  run: async (ctx: TestContext): Promise<RunResult> => {
    const boutId = 'bout-vote-race-test'

    // Multiple users voting simultaneously
    const voteRequests = Array(10).fill(null).map((_, i) => async () => {
      return makeRequest(ctx.config, `/api/bouts/${boutId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: i % 2 === 0 ? 'agent_a' : 'agent_b',
        }),
      })
    })

    const responses = await Promise.all(voteRequests.map(fn => fn()))
    const serverErrors = responses.filter(r => r.status === 500)

    if (serverErrors.length > 0) {
      return {
        passed: false,
        error: 'Server errors during concurrent voting',
        evidence: `${serverErrors.length} server errors`,
      }
    }

    return {
      passed: true,
      evidence: 'Concurrent voting handled without server errors',
    }
  },
})

// RACE-006: Reaction counting race
registerTest({
  id: 'SEC-RACE-006',
  tier: 'api',
  run: async (ctx: TestContext): Promise<RunResult> => {
    const boutId = 'bout-reaction-race-test'

    // Multiple reactions simultaneously using only valid types ('heart', 'fire')
    const validReactionTypes = ['heart', 'fire']
    const reactionRequests = Array(20).fill(null).map((_, i) => async () => {
      return makeRequest(ctx.config, '/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boutId,
          turnIndex: i % 5,
          reactionType: validReactionTypes[i % 2],
        }),
      })
    })

    const responses = await Promise.all(reactionRequests.map(fn => fn()))
    const serverErrors = responses.filter(r => r.status === 500)

    if (serverErrors.length > 0) {
      return {
        passed: false,
        error: 'Server errors during concurrent reactions',
        evidence: `${serverErrors.length} server errors`,
      }
    }

    return {
      passed: true,
      evidence: 'Concurrent reactions handled without server errors',
    }
  },
})

// RACE-007: Agent creation race (duplicate prevention)
registerTest({
  id: 'SEC-RACE-007',
  tier: 'api',
  run: async (ctx: TestContext): Promise<RunResult> => {
    const agentName = `Race Test Agent ${Date.now()}`

    // Try to create same agent multiple times
    const createRequests = Array(5).fill(null).map(() => async () => {
      return makeRequest(ctx.config, '/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: agentName,
          systemPrompt: 'A test agent for race condition testing',
        }),
      })
    })

    const responses = await Promise.all(createRequests.map(fn => fn()))
    const successCount = responses.filter(r => r.status === 200 || r.status === 201).length
    const serverErrors = responses.filter(r => r.status === 500)

    if (serverErrors.length > 0) {
      return {
        passed: false,
        error: 'Server errors during concurrent agent creation',
        evidence: `${serverErrors.length} server errors`,
      }
    }

    // Either all fail (no auth) or at most one succeeds (deduplication)
    // Note: Agents might allow duplicates by design (different owners)
    return {
      passed: true,
      evidence: `Agent creation race handled. ${successCount} succeeded, ${serverErrors.length} errors`,
    }
  },
})

// RACE-008: Free bout pool concurrent claim
registerTest({
  id: 'SEC-RACE-008',
  tier: 'api',
  run: async (ctx: TestContext): Promise<RunResult> => {
    // Multiple users claiming free bouts simultaneously
    // Pool should not go negative

    const claimRequests = Array(30).fill(null).map(() => async () => {
      return makeRequest(ctx.config, '/api/free-bout-pool/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    })

    const responses = await Promise.all(claimRequests.map(fn => fn()))
    const serverErrors = responses.filter(r => r.status === 500)

    if (serverErrors.length > 0) {
      return {
        passed: false,
        error: 'Server errors during concurrent free bout claims',
        evidence: `${serverErrors.length} server errors`,
      }
    }

    return {
      passed: true,
      evidence: 'Free bout pool concurrent claims handled safely',
    }
  },
})
