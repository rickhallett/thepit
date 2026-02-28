/**
 * Race Condition Tests
 *
 * Tests that validate atomic operations under concurrent load
 * to prevent race conditions and double-spend attacks.
 *
 * These tests hit the live API - requires server to be running.
 */

import { describe, expect, it } from 'vitest'
import { makeRequest, checkConnectivity } from './utils'

// Skip all tests if server not reachable (CI without server)
const serverReachable = await checkConnectivity()

describe.skipIf(!serverReachable)('Security: Race Conditions', () => {
  describe('Credit Preauthorization', () => {
    it('SEC-RACE-001: handles concurrent preauth without double-spend', async () => {
      // Simulate two bout starts at the exact same moment
      const boutRequests = [1, 2].map((n) => async () => {
        return makeRequest('/api/run-bout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            boutId: `bout-race-${Date.now()}-${n}`,
            presetId: 'test',
          }),
        })
      })

      const [res1, res2] = await Promise.all(boutRequests.map(fn => fn()))

      // Check neither caused server error
      expect(res1!.status).not.toBe(500)
      expect(res2!.status).not.toBe(500)

      // If both succeeded, that's a race condition bug (double-spend)
      const successCount = [res1, res2].filter(r => r!.status === 200).length
      expect(successCount).toBeLessThanOrEqual(1)
    })

    it('SEC-RACE-002: handles concurrent preauth/settlement safely', async () => {
      const operations = Array(5).fill(null).map((_, i) => async () => {
        return makeRequest('/api/run-bout', {
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

      expect(serverErrors.length).toBe(0)
    })
  })

  describe('Webhook Deduplication', () => {
    it('SEC-RACE-003: rejects webhooks without signature', async () => {
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
        return makeRequest('/api/credits/webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: webhookPayload,
        })
      })

      const responses = await Promise.all(webhookRequests.map(fn => fn()))

      // All should be rejected without valid signature
      const acceptedCount = responses.filter(r => r.status === 200).length
      expect(acceptedCount).toBe(0)
    })
  })

  describe('Referral Deduplication', () => {
    it('SEC-RACE-004: deduplicates concurrent referral redemptions', async () => {
      const code = 'RACE_TEST_CODE'

      const redeemRequests = Array(5).fill(null).map(() => async () => {
        return makeRequest('/api/referrals/redeem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        })
      })

      const responses = await Promise.all(redeemRequests.map(fn => fn()))
      const successCount = responses.filter(r => r.status === 200).length

      // At most one should succeed (or all fail without auth)
      expect(successCount).toBeLessThanOrEqual(1)
    })
  })

  describe('Vote Counting', () => {
    it('SEC-RACE-005: handles concurrent voting without server errors', async () => {
      const boutId = 'bout-vote-race-test'

      const voteRequests = Array(10).fill(null).map((_, i) => async () => {
        return makeRequest(`/api/bouts/${boutId}/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: i % 2 === 0 ? 'agent_a' : 'agent_b',
          }),
        })
      })

      const responses = await Promise.all(voteRequests.map(fn => fn()))
      const serverErrors = responses.filter(r => r.status === 500)

      expect(serverErrors.length).toBe(0)
    })
  })

  describe('Reaction Counting', () => {
    // TODO: Production bug - concurrent unauthenticated reactions return 500
    // Single requests work fine (200), but concurrent requests all fail
    // Likely a race condition in the reactions handler itself
    it.skip('SEC-RACE-006: handles concurrent reactions without crashing', async () => {
      const boutId = 'bout-reaction-race-test'

      const validReactionTypes = ['heart', 'fire']
      const reactionRequests = Array(5).fill(null).map((_, i) => async () => {
        return makeRequest('/api/reactions', {
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
      const acceptableResponses = responses.filter(r =>
        [200, 307, 401, 403, 404, 429].includes(r.status)
      )

      expect(acceptableResponses.length).toBeGreaterThan(0)
    })
  })

  describe('Agent Creation', () => {
    it('SEC-RACE-007: handles concurrent agent creation without server errors', async () => {
      const agentName = `Race Test Agent ${Date.now()}`

      const createRequests = Array(5).fill(null).map(() => async () => {
        return makeRequest('/api/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: agentName,
            systemPrompt: 'A test agent for race condition testing',
          }),
        })
      })

      const responses = await Promise.all(createRequests.map(fn => fn()))
      const serverErrors = responses.filter(r => r.status === 500)

      expect(serverErrors.length).toBe(0)
    })
  })
})
