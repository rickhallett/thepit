/**
 * Payment Tests Index
 *
 * Exports all payment flow test implementations.
 * Import this file to register all payment tests with the QA runner.
 */

// Import all test modules to register them
import './webhook.js'
import './subscription.js'

/**
 * Payment test IDs for reference:
 *
 * Webhook Security (webhook.ts):
 * - SEC-PAY-006: Invalid webhook signature rejection
 * - SEC-PAY-007: Duplicate webhook idempotency
 * - SEC-PAY-008: Tampered webhook payload rejection
 * - SEC-PAY-009: Unexpected event type handling
 * - SEC-PAY-010: Malformed JSON handling
 *
 * Subscription Lifecycle (subscription.ts):
 * - SEC-PAY-001: Checkout session requires auth
 * - SEC-PAY-002: Subscription upgrade requires auth
 * - SEC-PAY-003: Subscription downgrade requires auth
 * - SEC-PAY-004: Subscription cancellation requires auth
 * - SEC-PAY-005: Billing portal requires auth
 * - SEC-PAY-011: Invalid package ID handling
 * - SEC-PAY-012: Checkout amount manipulation prevention
 * - SEC-PAY-013: Subscription tier manipulation prevention
 * - SEC-PAY-014: Promo code injection handling
 * - SEC-PAY-015: Webhook metadata injection prevention
 */
