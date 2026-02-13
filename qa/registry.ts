/**
 * Test Registry Module
 *
 * Provides the test registry and registration function.
 * This module must be imported before any test modules to avoid
 * circular dependency issues with ES module hoisting.
 */

import type { AutomationTier } from './tiers.js'
import type { QAConfig } from './config.js'

export interface TestContext {
  config: QAConfig
}

/**
 * Simple result returned by test run function.
 * The runner adds id, functional, and timestamp to create full TestResult.
 */
export interface RunResult {
  passed: boolean
  error?: string
  evidence?: string
  duration?: number
}

export interface TestImplementation {
  id: string
  tier: AutomationTier
  setup?: (ctx: TestContext) => Promise<void>
  run: (ctx: TestContext) => Promise<RunResult>
  teardown?: (ctx: TestContext) => Promise<void>
}

/**
 * Registry of test implementations
 * Tests are registered here as they are implemented
 */
export const TEST_REGISTRY: Map<string, TestImplementation> = new Map()

/**
 * Register a test implementation
 */
export function registerTest(impl: TestImplementation): void {
  TEST_REGISTRY.set(impl.id, impl)
}

/**
 * Get registered test implementation
 */
export function getTest(id: string): TestImplementation | undefined {
  return TEST_REGISTRY.get(id)
}
