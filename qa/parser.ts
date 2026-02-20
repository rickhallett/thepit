/**
 * QA Report Parser
 *
 * Parses docs/qa-report.md and extracts test definitions with their
 * IDs, categories, descriptions, and status flags.
 */

export interface ParsedTest {
  id: string
  category: string
  subcategory: string
  description: string
  expectedBehavior: string
  qa: boolean
  func: boolean
  broken: boolean
  lineNumber: number
}

export type AutomationTier = 'api' | 'browser' | 'partial' | 'human'

const STORY_REGEX =
  /- \[.\] `\[qa:(.)\]\[func:(.)\]\[broken:(.)\]` \*\*([A-Z]+-\d+)\*\*: (.+)/

const BEHAVIOR_REGEX = /^\s+- Expected: (.+)$/

/**
 * Parse the QA report markdown and extract all test definitions
 */
export function parseQAReport(content: string): ParsedTest[] {
  const lines = content.split('\n')
  const tests: ParsedTest[] = []

  let currentCategory = ''
  let currentSubcategory = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue

    // Track category headers (## 1. Navigation & Layout)
    if (line.startsWith('## ')) {
      currentCategory = line.replace(/^## /, '').trim()
      currentSubcategory = ''
    }

    // Track subcategory headers (### 1.1 Site Header)
    if (line.startsWith('### ')) {
      currentSubcategory = line.replace(/^### /, '').trim()
    }

    // Parse test definition
    const match = STORY_REGEX.exec(line)
    if (match) {
      const [, qa, func, broken, id, description] = match

      // Look for expected behavior on next line
      let expectedBehavior = ''
      if (i + 1 < lines.length) {
        const behaviorMatch = BEHAVIOR_REGEX.exec(lines[i + 1] ?? '')
        if (behaviorMatch) {
          expectedBehavior = behaviorMatch[1] ?? ''
        }
      }

      tests.push({
        id: id ?? '',
        category: currentCategory,
        subcategory: currentSubcategory,
        description: description ?? '',
        expectedBehavior,
        qa: qa === 'x',
        func: func === 'x',
        broken: broken === 'x',
        lineNumber: i + 1,
      })
    }
  }

  return tests
}

/**
 * Get tests filtered by category prefix (e.g., "NAV", "AUTH", "API")
 */
export function filterByPrefix(tests: ParsedTest[], prefix: string): ParsedTest[] {
  return tests.filter((t) => t.id.startsWith(prefix))
}

/**
 * Get tests filtered by category name (partial match)
 */
export function filterByCategory(tests: ParsedTest[], category: string): ParsedTest[] {
  const lower = category.toLowerCase()
  return tests.filter((t) => t.category.toLowerCase().includes(lower))
}

/**
 * Get untested tests only
 */
export function filterUntested(tests: ParsedTest[]): ParsedTest[] {
  return tests.filter((t) => !t.qa)
}

/**
 * Get broken tests only
 */
export function filterBroken(tests: ParsedTest[]): ParsedTest[] {
  return tests.filter((t) => t.broken)
}

/**
 * Generate summary statistics
 */
export function summarize(tests: ParsedTest[]): {
  total: number
  tested: number
  untested: number
  functional: number
  broken: number
  byCategory: Record<string, number>
} {
  const byCategory: Record<string, number> = {}

  for (const test of tests) {
    const prefix = test.id.split('-')[0] ?? ''
    byCategory[prefix] = (byCategory[prefix] ?? 0) + 1
  }

  return {
    total: tests.length,
    tested: tests.filter((t) => t.qa).length,
    untested: tests.filter((t) => !t.qa).length,
    functional: tests.filter((t) => t.func).length,
    broken: tests.filter((t) => t.broken).length,
    byCategory,
  }
}
