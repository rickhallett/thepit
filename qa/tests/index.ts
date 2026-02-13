/**
 * QA Tests Index
 *
 * Imports all test modules to register them with the QA runner.
 * Import this file before running tests.
 */

// Security Tests
import './security/index.js'
import './credits/index.js'
import './payments/index.js'
import './rate-limiting/index.js'

/**
 * Test Registration Summary:
 *
 * Security Tests (qa/tests/security/):
 * - auth-bypass.ts: 10 authorization bypass tests (SEC-AUTH-*)
 * - injection.ts: 10 injection tests (SEC-INJ-*)
 * - idor.ts: 8 IDOR tests (SEC-IDOR-*)
 *
 * Credit Tests (qa/tests/credits/):
 * - edge-cases.ts: 10 credit edge case tests (SEC-CRED-*)
 * - concurrent.ts: 8 race condition tests (SEC-RACE-*)
 *
 * Payment Tests (qa/tests/payments/):
 * - webhook.ts: 5 webhook security tests (SEC-PAY-006 to SEC-PAY-010)
 * - subscription.ts: 10 subscription tests (SEC-PAY-001 to SEC-PAY-005, SEC-PAY-011 to SEC-PAY-015)
 *
 * Rate Limiting Tests (qa/tests/rate-limiting/):
 * - index.ts: 8 rate limiting tests (SEC-RATE-*)
 *
 * Total: 69 security tests
 */
