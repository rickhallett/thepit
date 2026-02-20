/**
 * QA Results Writer
 *
 * Updates docs/qa-report.md with test results, modifying the
 * [qa:_][func:_][broken:_] status flags for each tested story.
 */

import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export interface TestResult {
  id: string
  passed: boolean
  functional: boolean
  error?: string
  evidence?: string
  duration?: number
  timestamp: string
}

export interface WriteOptions {
  reportPath?: string
  dryRun?: boolean
}

/**
 * Update a single line's status flags
 */
function updateStatusFlags(
  line: string,
  result: TestResult
): string {
  // Don't modify flags for human-required tests - they weren't actually tested
  if (result.error === 'HUMAN_REQUIRED') {
    return line
  }

  const qa = 'x' // We tested it
  const func = result.functional ? 'x' : '_'
  const broken = result.passed ? '_' : 'x'

  return line.replace(
    /`\[qa:.\]\[func:.\]\[broken:.\]`/,
    `\`[qa:${qa}][func:${func}][broken:${broken}]\``
  )
}

/**
 * Update QA report with test results
 *
 * @param content - Current report content
 * @param results - Array of test results to apply
 * @returns Updated report content
 */
export function updateQAReport(
  content: string,
  results: TestResult[]
): string {
  const lines = content.split('\n')
  const resultMap = new Map(results.map((r) => [r.id, r]))

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue
    // Check each line for a test ID
    for (const [id, result] of resultMap) {
      if (line.includes(`**${id}**`)) {
        lines[i] = updateStatusFlags(line, result)
        resultMap.delete(id) // Remove processed result
        break
      }
    }
  }

  return lines.join('\n')
}

/**
 * Read report, update with results, and write back
 */
export async function writeResults(
  results: TestResult[],
  options: WriteOptions = {}
): Promise<{ updated: number; content: string }> {
  const reportPath = options.reportPath || join(process.cwd(), 'docs', 'qa-report.md')

  const content = await readFile(reportPath, 'utf-8')
  const updated = updateQAReport(content, results)

  if (!options.dryRun) {
    await writeFile(reportPath, updated, 'utf-8')
  }

  return {
    updated: results.length,
    content: updated,
  }
}

/**
 * Generate a test run summary report
 */
export function generateSummary(results: TestResult[]): string {
  const passed = results.filter((r) => r.passed).length
  const failed = results.filter((r) => !r.passed && r.error !== 'HUMAN_REQUIRED').length
  const human = results.filter((r) => r.error === 'HUMAN_REQUIRED').length
  const total = results.length

  const lines = [
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '  QA Run Complete',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    `  ✅ Passed:  ${passed}`,
    `  ❌ Failed:  ${failed}`,
    `  👤 Human:   ${human}`,
    `  📊 Total:   ${total}`,
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
  ]

  // Add failed test details
  const failures = results.filter((r) => !r.passed && r.error !== 'HUMAN_REQUIRED')
  if (failures.length > 0) {
    lines.push('Failed tests:')
    for (const f of failures) {
      lines.push(`  ${f.id}: ${f.error}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Create a JSON results file for CI integration
 */
export function toJSON(results: TestResult[]): string {
  return JSON.stringify(
    {
      timestamp: new Date().toISOString(),
      summary: {
        total: results.length,
        passed: results.filter((r) => r.passed).length,
        failed: results.filter((r) => !r.passed).length,
      },
      results,
    },
    null,
    2
  )
}
