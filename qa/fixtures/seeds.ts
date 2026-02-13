/**
 * Database Seed Helpers
 *
 * Helpers for creating test data in the database.
 * Used for setting up specific test scenarios.
 */

// Note: These will use the actual db client when integrated
// For now, define the interfaces and stubs

export interface SeedBout {
  presetId: string
  status: 'running' | 'completed' | 'error'
  ownerId?: string
  topic?: string
}

export interface SeedAgent {
  name: string
  presetId?: string
  tier: 'free' | 'premium' | 'custom'
  ownerId?: string
}

export interface SeedUser {
  email: string
  displayName: string
  tier: 'free' | 'pit_pass' | 'pit_lab'
  credits: number
}

/**
 * Seed data templates for common test scenarios
 */
export const SEED_TEMPLATES = {
  /**
   * A completed bout with transcript for reaction/voting tests
   */
  completedBout: {
    presetId: 'darwin-special',
    status: 'completed' as const,
    transcript: [
      { speaker: 'Darwin', content: 'Natural selection has produced...' },
      { speaker: 'Einstein', content: 'But relativity shows us...' },
    ],
  },

  /**
   * A running bout for streaming tests
   */
  runningBout: {
    presetId: 'roast-battle',
    status: 'running' as const,
  },

  /**
   * A custom agent for clone/edit tests
   */
  testAgent: {
    name: 'QA Test Agent',
    tier: 'custom' as const,
    systemPrompt: 'You are a test agent for QA purposes.',
  },
}

/**
 * Placeholder for actual database seeding
 * Will be implemented when db client is integrated
 */
export async function seedBout(_bout: SeedBout): Promise<string> {
  console.warn('seedBout: Database seeding not yet implemented')
  return 'mock-bout-id'
}

export async function seedAgent(_agent: SeedAgent): Promise<string> {
  console.warn('seedAgent: Database seeding not yet implemented')
  return 'mock-agent-id'
}

export async function seedUser(_user: SeedUser): Promise<string> {
  console.warn('seedUser: Database seeding not yet implemented')
  return 'mock-user-id'
}

/**
 * Clean up test data after test run
 */
export async function cleanupTestData(_prefix: string = 'qa-test-'): Promise<void> {
  console.warn('cleanupTestData: Database cleanup not yet implemented')
}
