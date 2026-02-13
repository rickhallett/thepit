#!/usr/bin/env tsx
/**
 * QA Test Runner
 *
 * Main orchestration for running QA tests. Parses the QA report,
 * filters tests by criteria, and updates results.
 *
 * Usage:
 *   tsx qa/runner.ts                    # Run all tests
 *   tsx qa/runner.ts --dry-run          # Parse and report, don't run
 *   tsx qa/runner.ts --filter NAV-001   # Run specific test
 *   tsx qa/runner.ts --category Nav     # Run category
 *   tsx qa/runner.ts --tier api         # Run by automation tier
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseArgs } from 'node:util'

import { parseQAReport, filterByCategory, summarize, type ParsedTest } from './parser.js'
import { writeResults, generateSummary, type TestResult } from './writer.js'
import { loadConfig, validateConfig, printConfig, type QAConfig } from './config.js'
import { AUTOMATION_TIERS, type AutomationTier } from './tiers.js'
import {
  TEST_REGISTRY,
  registerTest,
  getTest,
  type TestContext,
  type RunResult,
  type TestImplementation,
} from './registry.js'

// Import test implementations to register them
import './tests/index.js'

// Re-export types and functions for test implementations
export type { ParsedTest, TestResult, QAConfig }
export type { TestContext, RunResult, TestImplementation }
export { registerTest, getTest }

interface RunOptions {
  filter?: string[]
  category?: string
  tier?: AutomationTier
  dryRun: boolean
  verbose: boolean
}

/**
 * Check if the target server is reachable
 */
async function checkConnectivity(baseUrl: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    await fetch(baseUrl, {
      method: 'HEAD',
      signal: controller.signal,
    })
    clearTimeout(timeout)

    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('ECONNREFUSED')) {
      return { ok: false, error: `Server not running at ${baseUrl}` }
    }
    if (message.includes('abort')) {
      return { ok: false, error: `Connection timeout to ${baseUrl}` }
    }
    return { ok: false, error: `Cannot connect to ${baseUrl}: ${message}` }
  }
}

/**
 * Run QA tests based on options
 */
async function runQA(options: RunOptions): Promise<void> {
  console.log('🧪 THE PIT QA Runner\n')

  // Load and validate config
  const config = loadConfig()
  const errors = validateConfig(config)

  if (errors.length > 0) {
    console.error('Configuration errors:')
    errors.forEach((e) => {
      console.error(`  ❌ ${e}`)
    })
    process.exit(1)
  }

  if (options.verbose) {
    printConfig(config)
    console.log('')
  }

  // Check connectivity before running tests (skip for dry runs)
  if (!options.dryRun) {
    console.log(`🔗 Checking connectivity to ${config.baseUrl}...`)
    const connectivity = await checkConnectivity(config.baseUrl)

    if (!connectivity.ok) {
      console.error(`\n❌ ${connectivity.error}`)
      console.error('\nTo run tests locally:')
      console.error('  1. Start the dev server: npm run dev')
      console.error('  2. Ensure QA_BASE_URL is set correctly in .env')
      console.error(`     Current: QA_BASE_URL=${config.baseUrl}`)
      process.exit(1)
    }

    console.log('✅ Server is reachable\n')
  }

  // Parse QA report
  const reportPath = join(process.cwd(), 'docs', 'qa-report.md')
  const content = await readFile(reportPath, 'utf-8')
  const allTests = parseQAReport(content)

  console.log(`📋 Parsed ${allTests.length} tests from QA report\n`)

  // Filter tests
  let tests = allTests

  if (options.filter && options.filter.length > 0) {
    // Support both exact match and prefix match (e.g., "SEC-" matches "SEC-AUTH-001")
    tests = tests.filter((t) =>
      options.filter!.some((f) => t.id === f || t.id.startsWith(f))
    )

    // Also include registered tests not in the report (e.g., security tests)
    const registeredIds = Array.from(TEST_REGISTRY.keys())
    const matchingRegistered = registeredIds.filter((id) =>
      options.filter!.some((f) => id === f || id.startsWith(f))
    )

    // Add synthetic test entries for registered tests not in report
    for (const id of matchingRegistered) {
      if (!tests.some((t) => t.id === id)) {
        tests.push({
          id,
          category: 'Security',
          subcategory: id.split('-').slice(0, 2).join('-'),
          description: `Security test: ${id}`,
          expectedBehavior: '',
          qa: false,
          func: false,
          broken: false,
          lineNumber: 0,
        })
      }
    }

    console.log(`🔍 Filtered to ${tests.length} tests by ID: ${options.filter.join(', ')}`)
  }

  if (options.category) {
    tests = filterByCategory(tests, options.category)
    console.log(`🔍 Filtered to ${tests.length} tests in category: ${options.category}`)
  }

  if (options.tier) {
    tests = tests.filter((t) => AUTOMATION_TIERS[t.id] === options.tier)
    console.log(`🔍 Filtered to ${tests.length} tests with tier: ${options.tier}`)
  }

  if (tests.length === 0) {
    console.log('No tests match the filter criteria.')
    return
  }

  // Dry run: just show what would run
  if (options.dryRun) {
    console.log('\n📝 Dry run - tests to run:')
    for (const test of tests) {
      const tier = AUTOMATION_TIERS[test.id] || 'unknown'
      const impl = TEST_REGISTRY.has(test.id) ? '✓' : '○'
      console.log(`  ${impl} [${tier}] ${test.id}: ${test.description.slice(0, 50)}...`)
    }

    const summary = summarize(tests)
    console.log(`\n📊 Summary: ${summary.total} total, ${TEST_REGISTRY.size} implemented`)
    console.log(`   By category: ${Object.entries(summary.byCategory).map(([k, v]) => `${k}=${v}`).join(', ')}`)
    return
  }

  // Execute tests
  const results: TestResult[] = []
  const ctx: TestContext = { config }

  for (const test of tests) {
    const impl = TEST_REGISTRY.get(test.id)
    const tier = AUTOMATION_TIERS[test.id] || 'unknown'

    if (!impl) {
      if (options.verbose) {
        console.log(`⏭️  ${test.id}: No implementation`)
      }
      continue
    }

    if (impl.tier === 'human') {
      console.log(`👤 ${test.id}: Requires human testing`)
      results.push({
        id: test.id,
        passed: false,
        functional: false,
        error: 'HUMAN_REQUIRED',
        timestamp: new Date().toISOString(),
      })
      continue
    }

    const shortDesc = test.description.slice(0, 50)
    console.log(`▶️  [${tier}] ${test.id}: ${shortDesc}...`)

    const startTime = Date.now()
    let setupComplete = false

    try {
      if (impl.setup) {
        await impl.setup(ctx)
      }
      setupComplete = true

      const result = await impl.run(ctx)
      result.duration = Date.now() - startTime

      results.push({
        id: test.id,
        passed: result.passed,
        functional: result.passed,
        error: result.error,
        evidence: result.evidence,
        duration: result.duration,
        timestamp: new Date().toISOString(),
      })

      const icon = result.passed ? '✅' : '❌'
      const time = `${result.duration}ms`
      console.log(`${icon} ${test.id} (${time})${result.error ? `: ${result.error}` : ''}`)

    } catch (err) {
      const duration = Date.now() - startTime
      const errorMsg = err instanceof Error ? err.message : String(err)

      results.push({
        id: test.id,
        passed: false,
        functional: false,
        error: errorMsg,
        duration,
        timestamp: new Date().toISOString(),
      })

      console.log(`❌ ${test.id} (${duration}ms): ${errorMsg}`)
    } finally {
      // Always run teardown if setup completed (prevents resource leaks)
      if (setupComplete && impl.teardown) {
        try {
          await impl.teardown(ctx)
        } catch (teardownErr) {
          console.warn(`⚠️  Teardown failed for ${test.id}: ${teardownErr instanceof Error ? teardownErr.message : String(teardownErr)}`)
        }
      }
    }
  }

  // Update report if we have results
  if (results.length > 0) {
    await writeResults(results, { reportPath })
    console.log(`\n📝 Updated ${results.length} test results in qa-report.md`)
  }

  // Print summary
  console.log(generateSummary(results))
}

/**
 * CLI entry point
 */
async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      'dry-run': { type: 'boolean', default: false },
      'filter': { type: 'string', multiple: true },
      'category': { type: 'string' },
      'tier': { type: 'string' },
      'verbose': { type: 'boolean', short: 'v', default: false },
      'help': { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
  })

  if (values.help) {
    console.log(`
QA Test Runner for THE PIT

Usage:
  tsx qa/runner.ts [options]

Options:
  --dry-run           Parse and report, don't run tests
  --filter <id>       Run specific test(s) by ID (can repeat)
  --category <name>   Run tests in category (partial match)
  --tier <tier>       Run tests by automation tier (api|browser|partial|human)
  -v, --verbose       Show detailed output
  -h, --help          Show this help

Examples:
  tsx qa/runner.ts --dry-run
  tsx qa/runner.ts --filter NAV-001 --filter NAV-002
  tsx qa/runner.ts --category Navigation
  tsx qa/runner.ts --tier api
`)
    return
  }

  const options: RunOptions = {
    dryRun: values['dry-run'] ?? false,
    filter: values.filter as string[] | undefined,
    category: values.category,
    tier: values.tier as AutomationTier | undefined,
    verbose: values.verbose ?? false,
  }

  await runQA(options)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
