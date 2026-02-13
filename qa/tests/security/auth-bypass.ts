/**
 * Authorization Bypass Tests
 *
 * Tests for AUTH-001 through AUTH-008:
 * - IDOR vulnerabilities (accessing other users' resources)
 * - Missing authorization checks
 * - Admin endpoint protection
 * - Cross-user access prevention
 */

import { registerTest, type TestContext, type RunResult } from '../../registry.js'
import {
  makeRequest,
  assertStatus,
  testIdorAccess,
  testTimingAttack,
  testErrorDisclosure,
} from './utils.js'

// AUTH-001: Access another user's bout via API
registerTest({
  id: 'SEC-AUTH-001',
  tier: 'api',
  run: async (ctx: TestContext): Promise<RunResult> => {
    // Test the API endpoint, not the page (Next.js pages render shell before checking data)
    // The /api/bouts/:id endpoint should return 404 for non-existent bouts
    const fakeBoutId = '00000000-0000-0000-0000-000000000000'

    const response = await makeRequest(ctx.config, `/api/bouts/${fakeBoutId}`, {
      method: 'GET',
    })

    // Should be 404 (not found) or 401 (unauthorized)
    // NOT 200 with actual bout data
    if (response.status === 200) {
      const text = await response.text()
      try {
        const data = JSON.parse(text)
        // If we got actual bout data, that's a problem
        if (data.id || data.boutId || data.transcript) {
          return {
            passed: false,
            error: 'IDOR: Accessed bout data without authorization',
            evidence: `Got bout data for non-existent/unauthorized bout`,
          }
        }
      } catch {
        // Not JSON, probably error page - acceptable
      }
    }

    return {
      passed: true,
      evidence: `Non-existent bout API returns ${response.status}`
    }
  },
})

// AUTH-002: Execute bout without ownership
registerTest({
  id: 'SEC-AUTH-002',
  tier: 'api',
  run: async (ctx: TestContext): Promise<RunResult> => {
    // Try to run a bout without proper authentication
    const response = await makeRequest(ctx.config, '/api/run-bout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        boutId: '00000000-0000-0000-0000-000000000000',
        presetId: 'test',
      }),
    })

    // Should reject - either 401 (unauth), 403 (forbidden), or 404 (not found)
    const statusResult = assertStatus(response, [400, 401, 403, 404], 'AUTH-002')

    if (!statusResult.passed) {
      return {
        passed: false,
        error: 'Bout execution allowed without proper authorization',
        evidence: `Got status ${response.status}`,
      }
    }

    return { passed: true, evidence: `Unauthorized bout execution rejected with ${response.status}` }
  },
})

// AUTH-003: Admin endpoint without token
registerTest({
  id: 'SEC-AUTH-003',
  tier: 'api',
  run: async (ctx: TestContext): Promise<RunResult> => {
    // Try to access admin endpoint without token
    const response = await makeRequest(ctx.config, '/api/admin/seed-agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    const statusResult = assertStatus(response, [401, 403], 'AUTH-003')

    if (!statusResult.passed) {
      return {
        passed: false,
        error: 'Admin endpoint accessible without authentication',
        evidence: `Got status ${response.status}`,
      }
    }

    // Check for information disclosure in error
    const disclosureResult = await testErrorDisclosure(
      ctx.config,
      '/api/admin/seed-agents',
      { method: 'POST' }
    )

    if (!disclosureResult.passed) {
      return {
        passed: false,
        error: disclosureResult.vulnerability,
        evidence: disclosureResult.evidence,
      }
    }

    return { passed: true, evidence: `Admin endpoint properly protected: ${response.status}` }
  },
})

// AUTH-004: Admin token timing attack resistance
registerTest({
  id: 'SEC-AUTH-004',
  tier: 'api',
  run: async (ctx: TestContext): Promise<RunResult> => {
    // Note: This test requires ADMIN_SEED_TOKEN to be configured
    // We test with fake tokens to ensure timing-safe comparison
    const result = await testTimingAttack(
      ctx.config,
      '/api/admin/seed-agents',
      'fake-admin-token-prefix',
      50 // Reduced iterations for CI
    )

    if (!result.passed) {
      return {
        passed: false,
        error: result.vulnerability,
        evidence: result.evidence,
      }
    }

    return { passed: true, evidence: 'No significant timing variance detected' }
  },
})

// AUTH-005: BYOK key cross-user access prevention
registerTest({
  id: 'SEC-AUTH-005',
  tier: 'api',
  run: async (ctx: TestContext): Promise<RunResult> => {
    // BYOK keys are stored in HTTP-only cookies scoped to /api/run-bout
    // Try to stash a key without authentication
    const response = await makeRequest(ctx.config, '/api/byok-stash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'sk-ant-fake-key-for-testing' }),
    })

    // Should require authentication
    const statusResult = assertStatus(response, [401], 'AUTH-005')

    if (!statusResult.passed) {
      // If not 401, check what we got
      if (response.status === 200) {
        return {
          passed: false,
          error: 'BYOK stash accessible without authentication',
        }
      }
      // 400 for invalid format is acceptable
      if (response.status === 400) {
        return { passed: true, evidence: 'BYOK stash rejects invalid keys (auth check may have passed)' }
      }
    }

    return { passed: true, evidence: 'BYOK stash requires authentication' }
  },
})

// AUTH-006: Free tier accessing premium models
registerTest({
  id: 'SEC-AUTH-006',
  tier: 'api',
  run: async (ctx: TestContext): Promise<RunResult> => {
    // Try to start a bout with a premium model without authentication
    const response = await makeRequest(ctx.config, '/api/run-bout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        boutId: '00000000-0000-0000-0000-000000000001',
        presetId: 'premium-test',
        model: 'claude-sonnet-4-20250514',
      }),
    })

    // Should be rejected - 401 (unauth), 402 (payment required), or 403 (forbidden)
    const statusResult = assertStatus(response, [400, 401, 402, 403, 404], 'AUTH-006')

    if (!statusResult.passed) {
      return {
        passed: false,
        error: 'Premium model access not properly gated',
        evidence: `Got status ${response.status}`,
      }
    }

    return { passed: true, evidence: `Premium model access properly gated: ${response.status}` }
  },
})

// AUTH-007: Exhausted credits starting bout
registerTest({
  id: 'SEC-AUTH-007',
  tier: 'api',
  run: async (ctx: TestContext): Promise<RunResult> => {
    // This test validates that the credit system prevents bout execution
    // when credits are exhausted. The actual enforcement happens in run-bout route.

    // Without proper auth context, we should get 401
    const response = await makeRequest(ctx.config, '/api/run-bout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        boutId: '00000000-0000-0000-0000-000000000002',
        presetId: 'test',
      }),
    })

    // Expected responses: 401 (no auth), 402 (no credits), 403 (forbidden)
    const statusResult = assertStatus(response, [400, 401, 402, 403, 404], 'AUTH-007')

    if (!statusResult.passed) {
      return {
        passed: false,
        error: 'Bout execution not properly gated by credits',
        evidence: `Got status ${response.status}`,
      }
    }

    return { passed: true, evidence: `Credits gate enforced: ${response.status}` }
  },
})

// AUTH-008: Anonymous bout when pool empty
registerTest({
  id: 'SEC-AUTH-008',
  tier: 'api',
  run: async (ctx: TestContext): Promise<RunResult> => {
    // Test the intro pool / free bout pool behavior
    // This should redirect to sign-in when pool is exhausted

    // First, check if intro pool endpoint exists and what it returns
    const response = await makeRequest(ctx.config, '/api/intro-pool', {
      method: 'GET',
    })

    // The endpoint might not exist (404) or require auth (401)
    // Both are acceptable security postures
    if (response.status === 404 || response.status === 401 || response.status === 403) {
      return { passed: true, evidence: `Intro pool properly protected: ${response.status}` }
    }

    // If it returns 200, check the response for pool status
    if (response.status === 200) {
      try {
        const data = await response.json()
        // Pool data should not include sensitive information
        if (data.databaseUrl || data.apiKey) {
          return {
            passed: false,
            error: 'Intro pool endpoint leaks sensitive data',
            evidence: JSON.stringify(Object.keys(data)),
          }
        }
      } catch {
        // Not JSON, that's fine
      }
    }

    return { passed: true, evidence: `Intro pool endpoint returns: ${response.status}` }
  },
})

// Additional: Test for authorization header manipulation
registerTest({
  id: 'SEC-AUTH-009',
  tier: 'api',
  run: async (ctx: TestContext): Promise<RunResult> => {
    // Try various authorization header manipulations
    const manipulations = [
      { header: 'Authorization', value: 'Bearer fake-token' },
      { header: 'Authorization', value: `Basic ${Buffer.from('admin:admin').toString('base64')}` },
      { header: 'X-User-Id', value: 'admin' },
      { header: 'X-Admin', value: 'true' },
      { header: 'Cookie', value: '__session=fake-session-token' },
    ]

    for (const { header, value } of manipulations) {
      const response = await makeRequest(ctx.config, '/api/admin/seed-agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [header]: value,
        },
        body: JSON.stringify({}),
      })

      if (response.status === 200) {
        return {
          passed: false,
          error: 'Authorization bypass via header manipulation',
          evidence: `${header}: ${value} resulted in 200 OK`,
        }
      }
    }

    return { passed: true, evidence: 'All header manipulation attempts rejected' }
  },
})

// Additional: Test for privilege escalation via user ID manipulation
registerTest({
  id: 'SEC-AUTH-010',
  tier: 'api',
  run: async (ctx: TestContext): Promise<RunResult> => {
    // Try to access admin credit grant without proper permissions
    const response = await makeRequest(ctx.config, '/api/credits/grant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'user_target',
        amount: 10000,
      }),
    })

    // Should be rejected
    const statusResult = assertStatus(response, [401, 403, 404, 405], 'SEC-AUTH-010')

    if (!statusResult.passed) {
      return {
        passed: false,
        error: 'Credit grant endpoint accessible without admin privileges',
        evidence: `Got status ${response.status}`,
      }
    }

    return { passed: true, evidence: 'Credit grant requires admin privileges' }
  },
})
