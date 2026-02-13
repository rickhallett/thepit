/**
 * IDOR (Insecure Direct Object Reference) Tests
 *
 * Tests for unauthorized access to resources belonging to other users:
 * - Bout access
 * - Agent access
 * - Credit transactions
 * - User profiles
 */

import { registerTest, type TestContext, type RunResult } from '../../registry.js'
import { makeRequest } from './utils.js'

// IDOR-001: Access other user's bout by ID enumeration
registerTest({
  id: 'SEC-IDOR-001',
  tier: 'api',
  run: async (ctx: TestContext): Promise<RunResult> => {
    // Test sequential ID enumeration (if IDs were sequential)
    // Since we use UUIDs, this tests that UUIDs are properly validated
    const testIds = [
      '1',
      '12345',
      'admin',
      'null',
      'undefined',
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000003',
    ]

    const failures: string[] = []

    for (const id of testIds) {
      const response = await makeRequest(ctx.config, `/bout/${id}`)

      // Should return 404 (not found) for non-existent bouts
      // or 401/403 if authentication is required
      if (response.status === 200) {
        const text = await response.text()
        // Check if we got actual bout data vs empty/error response
        if (text.includes('transcript') || text.includes('agentLineup')) {
          failures.push(`Bout ${id} accessible without authorization`)
        }
      }
    }

    if (failures.length > 0) {
      return {
        passed: false,
        error: 'IDOR vulnerability in bout access',
        evidence: failures.join('; '),
      }
    }

    return { passed: true, evidence: 'Bout ID enumeration properly handled' }
  },
})

// IDOR-002: Access other user's agent
registerTest({
  id: 'SEC-IDOR-002',
  tier: 'api',
  run: async (ctx: TestContext): Promise<RunResult> => {
    const testIds = [
      '1',
      'admin-agent',
      '00000000-0000-0000-0000-000000000001',
    ]

    const failures: string[] = []

    for (const id of testIds) {
      const response = await makeRequest(ctx.config, `/api/agents/${id}`)

      if (response.status === 200) {
        const text = await response.text()
        // Check if we got sensitive agent data
        if (text.includes('systemPrompt') && text.includes('customInstructions')) {
          failures.push(`Agent ${id} exposed sensitive data`)
        }
      }
    }

    if (failures.length > 0) {
      return {
        passed: false,
        error: 'IDOR vulnerability in agent access',
        evidence: failures.join('; '),
      }
    }

    return { passed: true, evidence: 'Agent access properly controlled' }
  },
})

// IDOR-003: Access other user's credit transactions
registerTest({
  id: 'SEC-IDOR-003',
  tier: 'api',
  run: async (ctx: TestContext): Promise<RunResult> => {
    const testUserIds = [
      'user_2abc123',
      'admin',
      '1',
      'user_other',
    ]

    const failures: string[] = []

    for (const userId of testUserIds) {
      // Try to access credit transactions endpoint with user ID
      const response = await makeRequest(
        ctx.config,
        `/api/credits/transactions?userId=${userId}`
      )

      // Should require authentication and only return own transactions
      if (response.status === 200) {
        const text = await response.text()
        try {
          const data = JSON.parse(text)
          if (Array.isArray(data) && data.length > 0) {
            failures.push(`Credit transactions for ${userId} exposed`)
          }
        } catch {
          // Not JSON, might be error page
        }
      }
    }

    if (failures.length > 0) {
      return {
        passed: false,
        error: 'IDOR vulnerability in credit transactions',
        evidence: failures.join('; '),
      }
    }

    return { passed: true, evidence: 'Credit transactions access controlled' }
  },
})

// IDOR-004: Access other user's profile
registerTest({
  id: 'SEC-IDOR-004',
  tier: 'api',
  run: async (ctx: TestContext): Promise<RunResult> => {
    const testUserIds = [
      'user_admin',
      'user_test',
      '1',
    ]

    const failures: string[] = []

    for (const userId of testUserIds) {
      const response = await makeRequest(ctx.config, `/api/users/${userId}`)

      if (response.status === 200) {
        const text = await response.text()
        // Check for sensitive data in response
        const sensitiveFields = ['email', 'stripeCustomerId', 'subscriptionId']
        for (const field of sensitiveFields) {
          if (text.includes(field)) {
            failures.push(`User ${userId} exposed ${field}`)
          }
        }
      }
    }

    if (failures.length > 0) {
      return {
        passed: false,
        error: 'IDOR vulnerability in user profile access',
        evidence: failures.join('; '),
      }
    }

    return { passed: true, evidence: 'User profile access controlled' }
  },
})

// IDOR-005: Modify other user's resources
registerTest({
  id: 'SEC-IDOR-005',
  tier: 'api',
  run: async (ctx: TestContext): Promise<RunResult> => {
    // Try to modify resources that don't belong to us
    const targets = [
      {
        path: '/api/agents/00000000-0000-0000-0000-000000000001',
        method: 'PATCH' as const,
        body: { name: 'Hacked Agent' },
      },
      {
        path: '/api/agents/00000000-0000-0000-0000-000000000001',
        method: 'DELETE' as const,
        body: {},
      },
      {
        path: '/api/bouts/00000000-0000-0000-0000-000000000001/vote',
        method: 'POST' as const,
        body: { agentId: 'winner' },
      },
    ]

    const failures: string[] = []

    for (const { path, method, body } of targets) {
      const response = await makeRequest(ctx.config, path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      // Modification should be rejected
      if (response.status === 200 || response.status === 204) {
        failures.push(`${method} ${path} succeeded without authorization`)
      }
    }

    if (failures.length > 0) {
      return {
        passed: false,
        error: 'IDOR vulnerability - unauthorized resource modification',
        evidence: failures.join('; '),
      }
    }

    return { passed: true, evidence: 'Resource modifications require authorization' }
  },
})

// IDOR-006: Research export ID enumeration
registerTest({
  id: 'SEC-IDOR-006',
  tier: 'api',
  run: async (ctx: TestContext): Promise<RunResult> => {
    // Test if research exports use predictable IDs
    const testIds = ['1', '2', '100', 'export_1', 'v1', 'latest']

    const failures: string[] = []

    for (const id of testIds) {
      const response = await makeRequest(ctx.config, `/api/admin/research-export/${id}`)

      // Should require admin token
      if (response.status === 200) {
        failures.push(`Research export ${id} accessible without admin`)
      }
    }

    if (failures.length > 0) {
      return {
        passed: false,
        error: 'Research export IDOR vulnerability',
        evidence: failures.join('; '),
      }
    }

    return { passed: true, evidence: 'Research exports require admin access' }
  },
})

// IDOR-007: Winner vote manipulation
registerTest({
  id: 'SEC-IDOR-007',
  tier: 'api',
  run: async (ctx: TestContext): Promise<RunResult> => {
    // Try to vote multiple times on a bout
    const boutId = '00000000-0000-0000-0000-000000000001'

    // First vote
    const vote1 = await makeRequest(ctx.config, `/api/bouts/${boutId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'agent1' }),
    })

    // Second vote (should be rejected)
    const vote2 = await makeRequest(ctx.config, `/api/bouts/${boutId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'agent2' }),
    })

    // Without auth, both should fail with 401
    // With auth, second should fail with 409 (conflict) or similar
    if (vote1.status === 200 && vote2.status === 200) {
      return {
        passed: false,
        error: 'Multiple votes allowed per user',
        evidence: 'Both vote requests succeeded',
      }
    }

    return { passed: true, evidence: 'Vote duplication prevented' }
  },
})

// IDOR-008: Reaction manipulation
registerTest({
  id: 'SEC-IDOR-008',
  tier: 'api',
  run: async (ctx: TestContext): Promise<RunResult> => {
    // Try to add multiple reactions without auth
    const boutId = '00000000-0000-0000-0000-000000000001'

    const responses: number[] = []

    for (let i = 0; i < 5; i++) {
      const response = await makeRequest(ctx.config, `/api/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boutId,
          turnIndex: 0,
          reactionType: 'fire',
        }),
      })
      responses.push(response.status)
    }

    // Should require auth or rate limit
    const successCount = responses.filter((s) => s === 200 || s === 201).length

    if (successCount > 1) {
      return {
        passed: false,
        error: 'Multiple reactions allowed without auth/rate limiting',
        evidence: `${successCount} successful reactions without auth`,
      }
    }

    return { passed: true, evidence: 'Reaction spam prevented' }
  },
})
