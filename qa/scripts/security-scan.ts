#!/usr/bin/env tsx
/**
 * Security Scan Runner
 *
 * Orchestrates automated security scanning tools:
 * - OWASP ZAP baseline scan
 * - Nuclei vulnerability scanner
 * - Custom security tests
 *
 * Usage:
 *   tsx qa/scripts/security-scan.ts                    # Run all scans
 *   tsx qa/scripts/security-scan.ts --target https://staging.example.com
 *   tsx qa/scripts/security-scan.ts --output report.html
 *   tsx qa/scripts/security-scan.ts --quick            # Quick scan only
 */

import { spawn, execFileSync } from 'node:child_process'
import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { parseArgs } from 'node:util'

interface ScanResult {
  tool: string
  success: boolean
  findings: Finding[]
  error?: string
  duration: number
}

interface Finding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  title: string
  description: string
  url?: string
  evidence?: string
}

interface ScanOptions {
  target: string
  output?: string
  quick: boolean
  verbose: boolean
}

/**
 * Check if a command is available using execFileSync (safe)
 */
function commandExists(cmd: string): boolean {
  try {
    execFileSync('which', [cmd], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

/**
 * Run OWASP ZAP baseline scan
 */
async function runZapScan(target: string, quick: boolean): Promise<ScanResult> {
  const startTime = Date.now()
  const findings: Finding[] = []

  // Check if ZAP is available (via Docker or native)
  const hasDocker = commandExists('docker')
  const hasZap = commandExists('zap-cli') || commandExists('zap.sh')

  if (!hasDocker && !hasZap) {
    return {
      tool: 'OWASP ZAP',
      success: false,
      findings: [],
      error: 'OWASP ZAP not installed. Install via Docker: docker pull owasp/zap2docker-stable',
      duration: Date.now() - startTime,
    }
  }

  console.log('🔍 Running OWASP ZAP baseline scan...')

  return new Promise((resolve) => {
    const args = hasDocker
      ? ['run', '--rm', '-t', 'owasp/zap2docker-stable', 'zap-baseline.py', '-t', target, '-J', '/dev/stdout']
      : ['zap-baseline.py', '-t', target, '-J', '/dev/stdout']

    const cmd = hasDocker ? 'docker' : 'zap-baseline.py'
    const child = spawn(cmd, args, {
      timeout: quick ? 120000 : 600000, // 2 min for quick, 10 min for full
    })

    let output = ''

    child.stdout?.on('data', (data) => {
      output += data.toString()
    })

    child.stderr?.on('data', (data) => {
      if (process.env.DEBUG) {
        console.error('ZAP stderr:', data.toString())
      }
    })

    child.on('close', (code) => {
      try {
        // Parse ZAP JSON output
        const results = JSON.parse(output)
        for (const site of results.site || []) {
          for (const alert of site.alerts || []) {
            findings.push({
              severity: mapZapRisk(alert.riskcode),
              title: alert.name,
              description: alert.desc,
              url: alert.instances?.[0]?.uri,
              evidence: alert.instances?.[0]?.evidence,
            })
          }
        }
      } catch {
        // ZAP might output non-JSON on error
      }

      resolve({
        tool: 'OWASP ZAP',
        success: code === 0,
        findings,
        error: code !== 0 ? `ZAP exited with code ${code}` : undefined,
        duration: Date.now() - startTime,
      })
    })

    child.on('error', (err) => {
      resolve({
        tool: 'OWASP ZAP',
        success: false,
        findings: [],
        error: `Failed to run ZAP: ${err.message}`,
        duration: Date.now() - startTime,
      })
    })
  })
}

/**
 * Run Nuclei vulnerability scanner
 */
async function runNucleiScan(target: string, quick: boolean): Promise<ScanResult> {
  const startTime = Date.now()
  const findings: Finding[] = []

  if (!commandExists('nuclei')) {
    return {
      tool: 'Nuclei',
      success: false,
      findings: [],
      error: 'Nuclei not installed. Install via: go install github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest',
      duration: Date.now() - startTime,
    }
  }

  console.log('🔍 Running Nuclei vulnerability scan...')

  return new Promise((resolve) => {
    const args = [
      '-u', target,
      '-json',
      '-severity', quick ? 'critical,high' : 'critical,high,medium',
      '-silent',
    ]

    if (quick) {
      args.push('-rate-limit', '50')
    }

    const child = spawn('nuclei', args, {
      timeout: quick ? 120000 : 600000,
    })

    let output = ''

    child.stdout?.on('data', (data) => {
      output += data.toString()
    })

    child.on('close', (code) => {
      // Parse JSONL output
      for (const line of output.split('\n')) {
        if (!line.trim()) continue
        try {
          const result = JSON.parse(line)
          findings.push({
            severity: result.info?.severity || 'info',
            title: result.info?.name || result.template,
            description: result.info?.description || '',
            url: result.matched,
            evidence: result.extracted_results?.join(', '),
          })
        } catch {
          // Skip non-JSON lines
        }
      }

      resolve({
        tool: 'Nuclei',
        success: true,
        findings,
        duration: Date.now() - startTime,
      })
    })

    child.on('error', (err) => {
      resolve({
        tool: 'Nuclei',
        success: false,
        findings: [],
        error: `Failed to run Nuclei: ${err.message}`,
        duration: Date.now() - startTime,
      })
    })
  })
}

/**
 * Run custom security tests via QA runner
 */
async function runCustomTests(target: string): Promise<ScanResult> {
  const startTime = Date.now()
  const findings: Finding[] = []

  console.log('🔍 Running custom security tests...')

  return new Promise((resolve) => {
    const child = spawn('tsx', ['qa/runner.ts', '--tier', 'api'], {
      env: { ...process.env, QA_BASE_URL: target },
      cwd: process.cwd(),
      timeout: 300000, // 5 minutes
    })

    let output = ''

    child.stdout?.on('data', (data) => {
      output += data.toString()
      process.stdout.write(data)
    })

    child.stderr?.on('data', (data) => {
      process.stderr.write(data)
    })

    child.on('close', (code) => {
      // Parse test output for failures
      const failureRegex = /❌ (SEC-[A-Z]+-\d+)[^\n]*: (.+)/g
      let match
      while ((match = failureRegex.exec(output)) !== null) {
        findings.push({
          severity: 'high',
          title: match[1],
          description: match[2],
        })
      }

      resolve({
        tool: 'Custom Tests',
        success: code === 0,
        findings,
        error: code !== 0 ? `Tests failed with ${findings.length} security issues` : undefined,
        duration: Date.now() - startTime,
      })
    })

    child.on('error', (err) => {
      resolve({
        tool: 'Custom Tests',
        success: false,
        findings: [],
        error: `Failed to run tests: ${err.message}`,
        duration: Date.now() - startTime,
      })
    })
  })
}

/**
 * Map ZAP risk codes to severity
 */
function mapZapRisk(riskcode: number | string): Finding['severity'] {
  const code = typeof riskcode === 'string' ? parseInt(riskcode, 10) : riskcode
  switch (code) {
    case 3: return 'critical'
    case 2: return 'high'
    case 1: return 'medium'
    case 0: return 'low'
    default: return 'info'
  }
}

/**
 * Generate HTML report
 */
function generateHtmlReport(results: ScanResult[]): string {
  const allFindings = results.flatMap(r => r.findings)
  const bySeverity = {
    critical: allFindings.filter(f => f.severity === 'critical'),
    high: allFindings.filter(f => f.severity === 'high'),
    medium: allFindings.filter(f => f.severity === 'medium'),
    low: allFindings.filter(f => f.severity === 'low'),
    info: allFindings.filter(f => f.severity === 'info'),
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Security Scan Report - THE PIT</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { color: #1a1a1a; }
    .summary { display: flex; gap: 20px; margin-bottom: 30px; }
    .stat { padding: 20px; border-radius: 8px; text-align: center; }
    .stat.critical { background: #fee2e2; color: #991b1b; }
    .stat.high { background: #ffedd5; color: #c2410c; }
    .stat.medium { background: #fef3c7; color: #b45309; }
    .stat.low { background: #dbeafe; color: #1e40af; }
    .stat h2 { margin: 0; font-size: 2rem; }
    .stat p { margin: 5px 0 0; }
    .finding { border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 15px; }
    .finding.critical { border-left: 4px solid #dc2626; }
    .finding.high { border-left: 4px solid #ea580c; }
    .finding.medium { border-left: 4px solid #d97706; }
    .finding.low { border-left: 4px solid #2563eb; }
    .finding h3 { margin: 0 0 10px; }
    .finding .meta { color: #6b7280; font-size: 0.875rem; }
    .tool { margin-top: 30px; padding: 15px; background: #f9fafb; border-radius: 8px; }
    .tool h3 { margin: 0 0 10px; }
    .tool.success { border-left: 4px solid #22c55e; }
    .tool.failure { border-left: 4px solid #ef4444; }
  </style>
</head>
<body>
  <h1>🛡️ Security Scan Report</h1>
  <p>Generated: ${new Date().toISOString()}</p>

  <div class="summary">
    <div class="stat critical">
      <h2>${bySeverity.critical.length}</h2>
      <p>Critical</p>
    </div>
    <div class="stat high">
      <h2>${bySeverity.high.length}</h2>
      <p>High</p>
    </div>
    <div class="stat medium">
      <h2>${bySeverity.medium.length}</h2>
      <p>Medium</p>
    </div>
    <div class="stat low">
      <h2>${bySeverity.low.length}</h2>
      <p>Low</p>
    </div>
  </div>

  <h2>Scan Results by Tool</h2>
  ${results.map(r => `
    <div class="tool ${r.success ? 'success' : 'failure'}">
      <h3>${r.tool} ${r.success ? '✅' : '❌'}</h3>
      <p>Duration: ${(r.duration / 1000).toFixed(1)}s | Findings: ${r.findings.length}</p>
      ${r.error ? `<p style="color: #dc2626;">Error: ${r.error}</p>` : ''}
    </div>
  `).join('')}

  <h2>Findings</h2>
  ${['critical', 'high', 'medium', 'low'].map(severity => {
    const findings = bySeverity[severity as keyof typeof bySeverity]
    if (findings.length === 0) return ''
    return `
      <h3 style="text-transform: capitalize;">${severity} (${findings.length})</h3>
      ${findings.map(f => `
        <div class="finding ${severity}">
          <h3>${f.title}</h3>
          <p>${f.description}</p>
          ${f.url ? `<p class="meta">URL: ${f.url}</p>` : ''}
          ${f.evidence ? `<p class="meta">Evidence: ${f.evidence}</p>` : ''}
        </div>
      `).join('')}
    `
  }).join('')}
</body>
</html>`
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      'target': { type: 'string', short: 't' },
      'output': { type: 'string', short: 'o' },
      'quick': { type: 'boolean', short: 'q', default: false },
      'verbose': { type: 'boolean', short: 'v', default: false },
      'help': { type: 'boolean', short: 'h', default: false },
    },
  })

  if (values.help) {
    console.log(`
Security Scan Runner for THE PIT

Usage:
  tsx qa/scripts/security-scan.ts [options]

Options:
  -t, --target <url>    Target URL to scan (default: from QA_BASE_URL env)
  -o, --output <file>   Output HTML report path (default: qa/results/security-report.html)
  -q, --quick           Run quick scan (fewer checks, faster)
  -v, --verbose         Show detailed output
  -h, --help            Show this help

Examples:
  tsx qa/scripts/security-scan.ts --target https://staging.thepit.cloud
  tsx qa/scripts/security-scan.ts --quick --output report.html
`)
    return
  }

  const options: ScanOptions = {
    target: values.target || process.env.QA_BASE_URL || 'http://localhost:3000',
    output: values.output,
    quick: values.quick ?? false,
    verbose: values.verbose ?? false,
  }

  console.log(`
🛡️  THE PIT Security Scan
================================
Target: ${options.target}
Mode: ${options.quick ? 'Quick' : 'Full'}
================================
`)

  const results: ScanResult[] = []

  // Run scans
  results.push(await runCustomTests(options.target))

  if (!options.quick) {
    results.push(await runZapScan(options.target, options.quick))
    results.push(await runNucleiScan(options.target, options.quick))
  }

  // Generate report
  const reportHtml = generateHtmlReport(results)
  const outputDir = join(process.cwd(), 'qa', 'results')
  const outputPath = options.output || join(outputDir, 'security-report.html')

  await mkdir(outputDir, { recursive: true })
  await writeFile(outputPath, reportHtml)

  // Print summary
  console.log(`
================================
📋 Scan Summary
================================`)

  for (const result of results) {
    const icon = result.success ? '✅' : '❌'
    console.log(`${icon} ${result.tool}: ${result.findings.length} findings (${(result.duration / 1000).toFixed(1)}s)`)
    if (result.error) {
      console.log(`   ⚠️  ${result.error}`)
    }
  }

  const allFindings = results.flatMap(r => r.findings)
  const critical = allFindings.filter(f => f.severity === 'critical')
  const high = allFindings.filter(f => f.severity === 'high')

  console.log(`
================================
Total: ${critical.length} critical, ${high.length} high, ${allFindings.length} total findings
Report: ${outputPath}
================================`)

  // Exit with error if critical/high findings
  if (critical.length > 0 || high.length > 0) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
