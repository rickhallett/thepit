/**
 * QA Configuration Module
 *
 * Loads configuration from environment variables for QA test runs.
 */

export interface TestAccount {
  email: string
  password: string
  displayName?: string
}

export interface QAConfig {
  baseUrl: string
  databaseUrl: string
  testAccounts: {
    anonymous: null
    standard: TestAccount | null
    premium: TestAccount | null
    exhausted: TestAccount | null
  }
  timeouts: {
    navigation: number
    streaming: number
    api: number
  }
  features: {
    creditsEnabled: boolean
    premiumEnabled: boolean
    byokEnabled: boolean
  }
}

/**
 * Load configuration from environment variables
 */
export function loadConfig(): QAConfig {
  return {
    baseUrl: process.env.QA_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    databaseUrl: process.env.QA_DATABASE_URL || process.env.DATABASE_URL || '',

    testAccounts: {
      anonymous: null,

      standard: process.env.QA_TEST_USER_EMAIL
        ? {
            email: process.env.QA_TEST_USER_EMAIL,
            password: process.env.QA_TEST_USER_PASSWORD || '',
            displayName: process.env.QA_TEST_USER_NAME || 'Test User',
          }
        : null,

      premium: process.env.QA_PREMIUM_USER_EMAIL
        ? {
            email: process.env.QA_PREMIUM_USER_EMAIL,
            password: process.env.QA_PREMIUM_USER_PASSWORD || '',
            displayName: process.env.QA_PREMIUM_USER_NAME || 'Premium Tester',
          }
        : null,

      exhausted: process.env.QA_EXHAUSTED_USER_EMAIL
        ? {
            email: process.env.QA_EXHAUSTED_USER_EMAIL,
            password: process.env.QA_EXHAUSTED_USER_PASSWORD || '',
            displayName: 'Exhausted User',
          }
        : null,
    },

    timeouts: {
      navigation: parseInt(process.env.QA_TIMEOUT_NAV || '10000', 10),
      streaming: parseInt(process.env.QA_TIMEOUT_STREAM || '120000', 10),
      api: parseInt(process.env.QA_TIMEOUT_API || '5000', 10),
    },

    features: {
      creditsEnabled: process.env.CREDITS_ENABLED === 'true',
      premiumEnabled: process.env.PREMIUM_ENABLED === 'true',
      byokEnabled: process.env.BYOK_ENABLED === 'true',
    },
  }
}

/**
 * Validate configuration has required values
 */
export function validateConfig(config: QAConfig): string[] {
  const errors: string[] = []

  if (!config.baseUrl) {
    errors.push('QA_BASE_URL or NEXT_PUBLIC_APP_URL is required')
  }

  if (!config.databaseUrl) {
    errors.push('QA_DATABASE_URL or DATABASE_URL is required')
  }

  // Warn about missing test accounts (not errors, just warnings)
  const warnings: string[] = []

  if (!config.testAccounts.standard) {
    warnings.push('No standard test account configured (QA_TEST_USER_EMAIL)')
  }

  if (!config.testAccounts.premium) {
    warnings.push('No premium test account configured (QA_PREMIUM_USER_EMAIL)')
  }

  if (warnings.length > 0) {
    console.warn('Configuration warnings:')
    warnings.forEach((w) => {
      console.warn(`  ⚠️  ${w}`)
    })
  }

  return errors
}

/**
 * Print configuration summary (redacting sensitive values)
 */
export function printConfig(config: QAConfig): void {
  console.log('QA Configuration:')
  console.log(`  Base URL: ${config.baseUrl}`)
  console.log(`  Database: ${config.databaseUrl ? '[configured]' : '[missing]'}`)
  console.log(`  Standard account: ${config.testAccounts.standard ? config.testAccounts.standard.email : '[not configured]'}`)
  console.log(`  Premium account: ${config.testAccounts.premium ? config.testAccounts.premium.email : '[not configured]'}`)
  console.log(`  Timeouts: nav=${config.timeouts.navigation}ms, stream=${config.timeouts.streaming}ms, api=${config.timeouts.api}ms`)
  console.log(`  Features: credits=${config.features.creditsEnabled}, premium=${config.features.premiumEnabled}, byok=${config.features.byokEnabled}`)
}

/**
 * Get environment variable template for .env.test file
 */
export function getEnvTemplate(): string {
  return `# QA Test Configuration
# Copy to .env.test and fill in values

# Base URL for testing (default: http://localhost:3000)
QA_BASE_URL=http://localhost:3000

# Database connection (can reuse DATABASE_URL)
QA_DATABASE_URL=

# Standard test account (free tier)
QA_TEST_USER_EMAIL=
QA_TEST_USER_PASSWORD=
QA_TEST_USER_NAME=Test User

# Premium test account (Pit Pass or Pit Lab tier)
QA_PREMIUM_USER_EMAIL=
QA_PREMIUM_USER_PASSWORD=
QA_PREMIUM_USER_NAME=Premium Tester

# Exhausted test account (0 credits)
QA_EXHAUSTED_USER_EMAIL=
QA_EXHAUSTED_USER_PASSWORD=

# Timeouts (milliseconds)
QA_TIMEOUT_NAV=10000
QA_TIMEOUT_STREAM=120000
QA_TIMEOUT_API=5000
`
}
