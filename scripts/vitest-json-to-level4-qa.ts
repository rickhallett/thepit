#!/usr/bin/env tsx
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { parseArgs } from 'node:util'

type VitestReport = {
  numTotalTests?: number
  numPassedTests?: number
  numFailedTests?: number
  testResults?: Array<{
    assertionResults?: Array<{ status?: string }>
  }>
}

type QaLikeSummary = {
  timestamp: string
  summary: {
    total: number
    passed: number
    failed: number
  }
}

function countFromAssertions(report: VitestReport): { total: number; passed: number; failed: number } {
  const assertions = (report.testResults || [])
    .flatMap((t) => t.assertionResults || [])
  const total = assertions.length
  const passed = assertions.filter((a) => a.status === 'passed').length
  const failed = assertions.filter((a) => a.status === 'failed').length
  return { total, passed, failed }
}

async function main() {
  // Strip bare '--' separators injected by pnpm/npm before parseArgs sees them
  const args = process.argv.slice(2).filter((a) => a !== '--')

  const { values } = parseArgs({
    args,
    options: {
      in: { type: 'string' },
      out: { type: 'string' },
    },
    allowPositionals: false,
  })

  const inPath = values.in
  const outPath = values.out
  if (!inPath || !outPath) {
    throw new Error('required: --in <vitest-json> --out <qa-summary-json>')
  }

  const raw = await readFile(inPath, 'utf8')
  const report = JSON.parse(raw) as VitestReport

  let total = report.numTotalTests ?? 0
  let passed = report.numPassedTests ?? 0
  let failed = report.numFailedTests ?? 0

  if (total === 0 && report.testResults) {
    const c = countFromAssertions(report)
    total = c.total
    passed = c.passed
    failed = c.failed
  }

  const out: QaLikeSummary = {
    timestamp: new Date().toISOString(),
    summary: { total, passed, failed },
  }

  await mkdir(dirname(outPath), { recursive: true })
  await writeFile(outPath, JSON.stringify(out, null, 2), 'utf8')
  console.log(JSON.stringify({ ok: true, out: outPath, summary: out.summary }, null, 2))
}

main().catch((err) => {
  console.error(`vitest-json-to-level4-qa: ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
})

