/**
 * Automation Tier Mapping
 *
 * Maps each test ID to its automation tier based on the feasibility analysis.
 */

export type AutomationTier = 'api' | 'browser' | 'partial' | 'human'

/**
 * Complete mapping of test IDs to automation tiers
 *
 * - api: Can be tested via HTTP/curl/database queries
 * - browser: Requires Playwright/browser automation
 * - partial: Automatable but needs specific setup or edge cases
 * - human: Cannot be automated (real payments, OAuth, etc.)
 */
export const AUTOMATION_TIERS: Record<string, AutomationTier> = {
  // Navigation - all browser
  'NAV-001': 'browser',
  'NAV-002': 'browser',
  'NAV-003': 'browser',
  'NAV-004': 'browser',
  'NAV-005': 'browser',
  'NAV-006': 'browser',
  'NAV-007': 'browser',
  'NAV-008': 'browser',

  // Authentication - mixed
  'AUTH-001': 'browser',
  'AUTH-002': 'browser',
  'AUTH-003': 'partial', // Needs test account
  'AUTH-004': 'human',   // Google OAuth
  'AUTH-005': 'partial', // Needs test account
  'AUTH-006': 'browser',
  'AUTH-007': 'partial', // Clerk test mode
  'AUTH-008': 'api',     // Database check
  'AUTH-009': 'api',     // Cookie check
  'AUTH-010': 'browser',
  'AUTH-011': 'browser',
  'AUTH-012': 'browser',
  'AUTH-013': 'browser',

  // Home Page - all browser
  'HOME-001': 'browser',
  'HOME-002': 'browser',
  'HOME-003': 'browser',
  'HOME-004': 'browser',
  'HOME-005': 'browser',
  'HOME-006': 'browser',
  'HOME-007': 'browser',
  'HOME-008': 'browser',
  'HOME-009': 'browser',
  'HOME-010': 'browser',
  'HOME-011': 'browser',

  // Arena Page - mostly browser
  'ARENA-001': 'browser',
  'ARENA-002': 'browser',
  'ARENA-003': 'browser',
  'ARENA-004': 'browser',
  'ARENA-005': 'browser',
  'ARENA-006': 'browser',
  'ARENA-007': 'browser',
  'ARENA-008': 'browser',
  'ARENA-009': 'browser',
  'ARENA-010': 'browser',
  'ARENA-011': 'browser',
  'ARENA-012': 'partial', // Premium account
  'ARENA-013': 'partial', // BYOK setup
  'ARENA-014': 'browser',
  'ARENA-015': 'browser',
  'ARENA-016': 'browser',
  'ARENA-017': 'browser',
  'ARENA-018': 'browser',
  'ARENA-019': 'partial', // Paid account
  'ARENA-020': 'browser',
  'ARENA-021': 'partial', // Stripe redirect
  'ARENA-022': 'browser',
  'ARENA-023': 'browser',
  'ARENA-024': 'partial', // Pool state

  // Bout Streaming - mostly browser
  'BOUT-001': 'browser',
  'BOUT-002': 'browser',
  'BOUT-003': 'browser',
  'BOUT-004': 'partial', // Timing verification
  'BOUT-005': 'browser',
  'BOUT-006': 'partial', // Scroll timing
  'BOUT-007': 'browser',
  'BOUT-008': 'browser',
  'BOUT-009': 'browser',
  'BOUT-010': 'browser',
  'BOUT-011': 'browser',
  'BOUT-012': 'browser',
  'BOUT-013': 'browser',
  'BOUT-014': 'browser',
  'BOUT-015': 'browser',
  'BOUT-016': 'browser',
  'BOUT-017': 'browser',
  'BOUT-018': 'browser',
  'BOUT-019': 'browser',
  'BOUT-020': 'api',     // Redirect check
  'BOUT-021': 'partial', // Trigger timeout
  'BOUT-022': 'partial', // Trigger rate limit
  'BOUT-023': 'partial', // Trigger failure

  // Custom Arena - all browser
  'CUSTOM-001': 'browser',
  'CUSTOM-002': 'browser',
  'CUSTOM-003': 'browser',
  'CUSTOM-004': 'browser',
  'CUSTOM-005': 'browser',
  'CUSTOM-006': 'browser',
  'CUSTOM-007': 'browser',
  'CUSTOM-008': 'browser',
  'CUSTOM-009': 'browser',
  'CUSTOM-010': 'browser',

  // Agents - mostly browser
  'AGENT-001': 'browser',
  'AGENT-002': 'browser',
  'AGENT-003': 'browser',
  'AGENT-004': 'browser',
  'AGENT-005': 'browser',
  'AGENT-006': 'browser',
  'AGENT-007': 'browser',
  'AGENT-008': 'browser',
  'AGENT-009': 'browser',
  'AGENT-010': 'browser',
  'AGENT-011': 'browser',
  'AGENT-012': 'browser',
  'AGENT-013': 'browser',
  'AGENT-014': 'browser',
  'AGENT-015': 'browser',
  'AGENT-016': 'browser',
  'AGENT-017': 'browser',
  'AGENT-018': 'browser',
  'AGENT-019': 'browser',
  'AGENT-020': 'browser',
  'AGENT-021': 'browser',
  'AGENT-022': 'browser',
  'AGENT-023': 'partial', // Free tier limit
  'AGENT-024': 'browser',
  'AGENT-025': 'api',     // Database check

  // Leaderboard - all browser
  'LEADER-001': 'browser',
  'LEADER-002': 'browser',
  'LEADER-003': 'browser',
  'LEADER-004': 'browser',
  'LEADER-005': 'browser',
  'LEADER-006': 'browser',
  'LEADER-007': 'browser',
  'LEADER-008': 'browser',
  'LEADER-009': 'browser',

  // Research - all browser
  'RESEARCH-001': 'browser',
  'RESEARCH-002': 'browser',
  'RESEARCH-003': 'browser',
  'RESEARCH-004': 'browser',
  'RESEARCH-005': 'browser',

  // Feedback - all browser
  'FEEDBACK-001': 'browser',
  'FEEDBACK-002': 'browser',
  'FEEDBACK-003': 'browser',
  'FEEDBACK-004': 'browser',
  'FEEDBACK-005': 'browser',
  'FEEDBACK-006': 'browser',
  'FEEDBACK-007': 'browser',
  'FEEDBACK-008': 'browser',
  'FEEDBACK-009': 'browser',

  // Contact - mostly browser
  'CONTACT-001': 'browser',
  'CONTACT-002': 'partial', // Email delivery
  'CONTACT-003': 'browser',
  'CONTACT-004': 'browser',
  'CONTACT-005': 'browser',

  // Credits & Billing - mixed
  'CREDIT-001': 'api',
  'CREDIT-002': 'browser',
  'CREDIT-003': 'api',
  'CREDIT-004': 'partial', // Time-based
  'CREDIT-005': 'partial', // Two accounts
  'CREDIT-006': 'human',   // Real Stripe
  'CREDIT-007': 'human',   // Real Stripe
  'CREDIT-008': 'partial', // Mock webhook
  'CREDIT-009': 'browser',
  'CREDIT-010': 'api',
  'CREDIT-011': 'api',
  'CREDIT-012': 'partial', // Zero credits
  'CREDIT-013': 'human',   // Real subscription
  'CREDIT-014': 'human',   // Real subscription
  'CREDIT-015': 'partial', // Portal redirect
  'CREDIT-016': 'human',   // Webhook lifecycle
  'CREDIT-017': 'human',   // Cancel lifecycle

  // API Endpoints - mostly API
  'API-001': 'api',
  'API-002': 'api',
  'API-003': 'api',
  'API-004': 'api',
  'API-005': 'api',
  'API-006': 'api',
  'API-007': 'api',
  'API-008': 'api',
  'API-009': 'api',
  'API-010': 'api',
  'API-011': 'api',
  'API-012': 'api',
  'API-013': 'api',
  'API-014': 'partial', // Email delivery
  'API-015': 'api',
  'API-016': 'api',
  'API-017': 'api',
  'API-018': 'api',
  'API-019': 'api',
  'API-020': 'api',
  'API-021': 'api',
  'API-022': 'partial', // Mock signature
  'API-023': 'api',

  // Security Tests - Authorization Bypass
  'SEC-AUTH-001': 'api',
  'SEC-AUTH-002': 'api',
  'SEC-AUTH-003': 'api',
  'SEC-AUTH-004': 'api',
  'SEC-AUTH-005': 'api',
  'SEC-AUTH-006': 'api',
  'SEC-AUTH-007': 'api',
  'SEC-AUTH-008': 'api',
  'SEC-AUTH-009': 'api',
  'SEC-AUTH-010': 'api',

  // Security Tests - Injection
  'SEC-INJ-001': 'api',
  'SEC-INJ-002': 'api',
  'SEC-INJ-003': 'api',
  'SEC-INJ-004': 'api',
  'SEC-INJ-005': 'api',
  'SEC-INJ-006': 'api',
  'SEC-INJ-007': 'api',
  'SEC-INJ-008': 'api',
  'SEC-INJ-009': 'api',
  'SEC-INJ-010': 'api',

  // Security Tests - IDOR
  'SEC-IDOR-001': 'api',
  'SEC-IDOR-002': 'api',
  'SEC-IDOR-003': 'api',
  'SEC-IDOR-004': 'api',
  'SEC-IDOR-005': 'api',
  'SEC-IDOR-006': 'api',
  'SEC-IDOR-007': 'api',
  'SEC-IDOR-008': 'api',

  // Security Tests - Credits
  'SEC-CRED-001': 'api',
  'SEC-CRED-002': 'api',
  'SEC-CRED-003': 'api',
  'SEC-CRED-004': 'api',
  'SEC-CRED-005': 'api',
  'SEC-CRED-006': 'api',
  'SEC-CRED-007': 'api',
  'SEC-CRED-008': 'api',
  'SEC-CRED-009': 'api',
  'SEC-CRED-010': 'api',

  // Security Tests - Race Conditions
  'SEC-RACE-001': 'api',
  'SEC-RACE-002': 'api',
  'SEC-RACE-003': 'api',
  'SEC-RACE-004': 'api',
  'SEC-RACE-005': 'api',
  'SEC-RACE-006': 'api',
  'SEC-RACE-007': 'api',
  'SEC-RACE-008': 'api',

  // Security Tests - Payment/Webhook
  'SEC-PAY-001': 'api',
  'SEC-PAY-002': 'api',
  'SEC-PAY-003': 'api',
  'SEC-PAY-004': 'api',
  'SEC-PAY-005': 'api',
  'SEC-PAY-006': 'api',
  'SEC-PAY-007': 'api',
  'SEC-PAY-008': 'api',
  'SEC-PAY-009': 'api',
  'SEC-PAY-010': 'api',
  'SEC-PAY-011': 'api',
  'SEC-PAY-012': 'api',
  'SEC-PAY-013': 'api',
  'SEC-PAY-014': 'api',
  'SEC-PAY-015': 'api',

  // Security Tests - Rate Limiting
  'SEC-RATE-001': 'api',
  'SEC-RATE-002': 'api',
  'SEC-RATE-003': 'api',
  'SEC-RATE-004': 'api',
  'SEC-RATE-005': 'api',
  'SEC-RATE-006': 'api',
  'SEC-RATE-007': 'api',
  'SEC-RATE-008': 'api',
}

/**
 * Get tier for a test ID, defaulting to 'browser' if unknown
 */
export function getTier(testId: string): AutomationTier {
  return AUTOMATION_TIERS[testId] || 'browser'
}

/**
 * Get all test IDs for a specific tier
 */
export function getTestsByTier(tier: AutomationTier): string[] {
  return Object.entries(AUTOMATION_TIERS)
    .filter(([, t]) => t === tier)
    .map(([id]) => id)
}

/**
 * Get tier statistics
 */
export function getTierStats(): Record<AutomationTier, number> {
  const stats: Record<AutomationTier, number> = {
    api: 0,
    browser: 0,
    partial: 0,
    human: 0,
  }

  for (const tier of Object.values(AUTOMATION_TIERS)) {
    stats[tier]++
  }

  return stats
}
