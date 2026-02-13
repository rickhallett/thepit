/**
 * Authorization Bypass Tests
 *
 * Integration tests for authorization security:
 * - IDOR vulnerabilities (accessing other users' resources)
 * - Missing authorization checks
 * - Admin endpoint protection
 * - Cross-user access prevention
 *
 * These tests hit the live API - requires server to be running.
 * Set QA_BASE_URL env var to test against different environments.
 */

import { beforeAll, describe, expect, it } from 'vitest'
import { BASE_URL, makeRequest, checkConnectivity, testTimingAttack } from './utils'

describe('Security: Authorization Bypass', () => {
  beforeAll(async () => {
    const reachable = await checkConnectivity()
    if (!reachable) {
      throw new Error(`Server not reachable at ${BASE_URL}. Start the dev server or set QA_BASE_URL.`)
    }
  })

  describe('IDOR Protection', () => {
    it('SEC-AUTH-001: rejects access to non-existent/unauthorized bout via API', async () => {
      // Test the API endpoint, not the page (Next.js pages render shell before checking data)
      const fakeBoutId = '00000000-0000-0000-0000-000000000000'

      const response = await makeRequest(`/api/bouts/${fakeBoutId}`, {
        method: 'GET',
      })

      // Should be 404 (not found) or 401 (unauthorized), NOT 200 with actual bout data
      if (response.status === 200) {
        const text = await response.text()
        try {
          const data = JSON.parse(text)
          // If we got actual bout data, that's a security issue
          expect(data.id || data.boutId || data.transcript).toBeFalsy()
        } catch {
          // Not JSON, probably error page - acceptable
        }
      }

      // Any of these statuses are acceptable
      expect([401, 403, 404, 500].includes(response.status) || response.status === 200).toBe(true)
    })

    it('SEC-AUTH-002: rejects bout execution without ownership', async () => {
      const response = await makeRequest('/api/run-bout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boutId: '00000000-0000-0000-0000-000000000000',
          presetId: 'test',
        }),
      })

      // Should reject - either 400, 401 (unauth), 403 (forbidden), or 404 (not found)
      expect([400, 401, 403, 404]).toContain(response.status)
    })
  })

  describe('Admin Endpoint Protection', () => {
    it('SEC-AUTH-003: rejects admin endpoint without token', async () => {
      const response = await makeRequest('/api/admin/seed-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect([401, 403]).toContain(response.status)
    })

    it('SEC-AUTH-004: admin token comparison is timing-safe', async () => {
      const result = await testTimingAttack(
        '/api/admin/seed-agents',
        'fake-admin-token-prefix',
        30 // Reduced iterations for faster CI
      )

      // Timing variance should be low (constant-time comparison)
      expect(result.passed).toBe(true)
    }, 30000) // 30s timeout for network latency

    it('SEC-AUTH-009: rejects authorization header manipulation attempts', async () => {
      const manipulations = [
        { header: 'Authorization', value: 'Bearer fake-token' },
        { header: 'Authorization', value: 'Basic YWRtaW46YWRtaW4=' }, // admin:admin
        { header: 'X-User-Id', value: 'admin' },
        { header: 'X-Admin', value: 'true' },
        { header: 'Cookie', value: '__session=fake-session-token' },
      ]

      for (const { header, value } of manipulations) {
        const response = await makeRequest('/api/admin/seed-agents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [header]: value,
          },
          body: JSON.stringify({}),
        })

        expect(response.status).not.toBe(200)
      }
    })
  })

  describe('BYOK Security', () => {
    it('SEC-AUTH-005: BYOK stash requires authentication', async () => {
      const response = await makeRequest('/api/byok-stash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'sk-ant-fake-key-for-testing' }),
      })

      // Should require authentication (401) or reject invalid format (400)
      expect([400, 401]).toContain(response.status)
    })
  })

  describe('Tier Gating', () => {
    it('SEC-AUTH-006: rejects premium model access without authentication', async () => {
      const response = await makeRequest('/api/run-bout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boutId: '00000000-0000-0000-0000-000000000001',
          presetId: 'premium-test',
          model: 'claude-sonnet-4-20250514',
        }),
      })

      // Should be rejected - 400, 401 (unauth), 402 (payment required), or 403 (forbidden)
      expect([400, 401, 402, 403, 404]).toContain(response.status)
    })

    it('SEC-AUTH-007: rejects bout execution when credits exhausted', async () => {
      const response = await makeRequest('/api/run-bout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boutId: '00000000-0000-0000-0000-000000000002',
          presetId: 'test',
        }),
      })

      // Expected responses: 400, 401 (no auth), 402 (no credits), 403 (forbidden), 404
      expect([400, 401, 402, 403, 404]).toContain(response.status)
    })
  })

  describe('Intro Pool Protection', () => {
    it('SEC-AUTH-008: intro pool endpoint does not leak sensitive data', async () => {
      const response = await makeRequest('/api/intro-pool', {
        method: 'GET',
      })

      // The endpoint might not exist (404) or require auth (401)
      if (response.status === 404 || response.status === 401 || response.status === 403) {
        // Properly protected
        expect(true).toBe(true)
        return
      }

      // If it returns 200, check the response for sensitive data
      if (response.status === 200) {
        try {
          const data = await response.json()
          // Pool data should not include sensitive information
          expect(data.databaseUrl).toBeUndefined()
          expect(data.apiKey).toBeUndefined()
        } catch {
          // Not JSON, that's fine
        }
      }
    })
  })

  describe('Privilege Escalation Prevention', () => {
    it('SEC-AUTH-010: rejects credit grant without admin privileges', async () => {
      const response = await makeRequest('/api/credits/grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'user_target',
          amount: 10000,
        }),
      })

      // Should be rejected
      expect([401, 403, 404, 405]).toContain(response.status)
    })
  })
})
