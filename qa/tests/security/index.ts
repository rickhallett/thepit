/**
 * Security Tests Index
 *
 * Exports all security test implementations.
 * Import this file to register all security tests with the QA runner.
 */

// Import all test modules to register them
import './auth-bypass.js'
import './injection.js'
import './idor.js'

// Re-export utilities for other test modules
export * from './utils.js'

/**
 * Security test IDs for reference:
 *
 * Authorization Bypass (auth-bypass.ts):
 * - SEC-AUTH-001: Access another user's bout
 * - SEC-AUTH-002: Execute bout without ownership
 * - SEC-AUTH-003: Admin endpoint without token
 * - SEC-AUTH-004: Admin token timing attack resistance
 * - SEC-AUTH-005: BYOK key cross-user access
 * - SEC-AUTH-006: Free tier accessing premium models
 * - SEC-AUTH-007: Exhausted credits starting bout
 * - SEC-AUTH-008: Anonymous bout when pool empty
 * - SEC-AUTH-009: Authorization header manipulation
 * - SEC-AUTH-010: Privilege escalation via credit grant
 *
 * Injection Tests (injection.ts):
 * - SEC-INJ-001: XSS in agent name
 * - SEC-INJ-002: XSS in custom system prompt
 * - SEC-INJ-003: SQL injection via bout ID
 * - SEC-INJ-004: Prompt injection in topic field
 * - SEC-INJ-005: Malicious preset ID
 * - SEC-INJ-006: Oversized request body
 * - SEC-INJ-007: Null byte injection
 * - SEC-INJ-008: CRLF injection
 * - SEC-INJ-009: Unicode normalization attacks
 * - SEC-INJ-010: Contact form validation
 *
 * IDOR Tests (idor.ts):
 * - SEC-IDOR-001: Bout ID enumeration
 * - SEC-IDOR-002: Agent access
 * - SEC-IDOR-003: Credit transactions access
 * - SEC-IDOR-004: User profile access
 * - SEC-IDOR-005: Resource modification
 * - SEC-IDOR-006: Research export enumeration
 * - SEC-IDOR-007: Winner vote manipulation
 * - SEC-IDOR-008: Reaction manipulation
 */
