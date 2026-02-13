/**
 * Credit System Tests Index
 *
 * Exports all credit system test implementations.
 * Import this file to register all credit tests with the QA runner.
 */

// Import all test modules to register them
import './edge-cases.js'
import './concurrent.js'

/**
 * Credit test IDs for reference:
 *
 * Edge Cases (edge-cases.ts):
 * - SEC-CRED-001: Concurrent preauth with insufficient balance
 * - SEC-CRED-002: Settlement when balance is 0
 * - SEC-CRED-003: Bout error mid-execution refund
 * - SEC-CRED-004: Webhook replay attack prevention
 * - SEC-CRED-005: Referral self-referral rejection
 * - SEC-CRED-006: Referral code reuse
 * - SEC-CRED-007: Intro pool exhaustion race
 * - SEC-CRED-008: Negative deltaMicro in settlement
 * - SEC-CRED-009: Free bout pool exhaustion
 * - SEC-CRED-010: Credit transaction atomicity
 *
 * Race Conditions (concurrent.ts):
 * - SEC-RACE-001: Double preauthorization race
 * - SEC-RACE-002: Preauth during settlement race
 * - SEC-RACE-003: Webhook deduplication race
 * - SEC-RACE-004: Referral credit race
 * - SEC-RACE-005: Vote counting race
 * - SEC-RACE-006: Reaction counting race
 * - SEC-RACE-007: Agent creation race
 * - SEC-RACE-008: Free bout pool concurrent claim
 */
