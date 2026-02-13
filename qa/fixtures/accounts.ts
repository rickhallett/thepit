/**
 * Test Account Definitions
 *
 * Defines the test accounts needed for QA testing.
 * Actual credentials come from environment variables via config.ts.
 */

export interface TestAccountSpec {
  type: 'anonymous' | 'standard' | 'premium' | 'exhausted'
  description: string
  requiredFor: string[]
  tier?: 'free' | 'pit_pass' | 'pit_lab'
  credits?: number
}

/**
 * Test account specifications
 */
export const TEST_ACCOUNTS: TestAccountSpec[] = [
  {
    type: 'anonymous',
    description: 'No authentication, fresh browser session',
    requiredFor: [
      'NAV-*',
      'HOME-*',
      'ARENA-023',
      'ARENA-024',
      'AUTH-001',
      'AUTH-002',
      'AUTH-006',
    ],
  },
  {
    type: 'standard',
    description: 'Free tier authenticated user',
    tier: 'free',
    credits: 500,
    requiredFor: [
      'AUTH-003',
      'AUTH-010',
      'AUTH-011',
      'AUTH-012',
      'AUTH-013',
      'ARENA-001',
      'ARENA-002',
      'ARENA-018',
      'AGENT-014',
      'AGENT-022',
      'AGENT-023',
      'BOUT-014',
      'BOUT-016',
      'FEEDBACK-001',
      'FEEDBACK-007',
    ],
  },
  {
    type: 'premium',
    description: 'Pit Pass or Pit Lab subscriber',
    tier: 'pit_pass',
    credits: 1000,
    requiredFor: [
      'ARENA-012',
      'ARENA-019',
      'API-002',
      'API-021',
    ],
  },
  {
    type: 'exhausted',
    description: 'User with zero credits remaining',
    tier: 'free',
    credits: 0,
    requiredFor: [
      'CREDIT-012',
    ],
  },
]

/**
 * Get account spec by type
 */
export function getAccountSpec(type: TestAccountSpec['type']): TestAccountSpec | undefined {
  return TEST_ACCOUNTS.find((a) => a.type === type)
}

/**
 * Get required account type for a test ID
 */
export function getRequiredAccountType(testId: string): TestAccountSpec['type'] {
  // Check if test ID matches any pattern
  for (const account of TEST_ACCOUNTS) {
    for (const pattern of account.requiredFor) {
      if (pattern.endsWith('*')) {
        const prefix = pattern.slice(0, -1)
        if (testId.startsWith(prefix)) {
          return account.type
        }
      } else if (pattern === testId) {
        return account.type
      }
    }
  }

  // Default to standard for most authenticated tests
  return 'standard'
}
