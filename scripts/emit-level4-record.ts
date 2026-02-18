#!/usr/bin/env tsx
import { mkdir, readFile, appendFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { parseArgs } from 'node:util'

type Decision = 'approved' | 'rejected' | 'failed'
type PipelineClass = 'low_risk_feature' | 'medium_integration'

type PitstormSnapshot = {
  retries?: number
}

type QaResults = {
  summary?: {
    total?: number
    passed?: number
  }
}

type EvalRecord = {
  window_id: string
  run_id: string
  pipeline_id: string
  pipeline_class: PipelineClass
  scenario_total: number
  scenario_passed: number
  first_pass_success: boolean
  retries: number
  interventions: number
  decision: Decision
  decision_reversed: boolean
  critical_incident: boolean
  timestamp: string
}

function parseBool(v: string | undefined, fallback: boolean): boolean {
  if (v === undefined) return fallback
  const normalized = v.toLowerCase()
  if (normalized === 'true') return true
  if (normalized === 'false') return false
  throw new Error(`invalid boolean: ${v}`)
}

async function maybeReadJSON<T>(path: string | undefined): Promise<T | undefined> {
  if (!path) return undefined
  const raw = await readFile(path, 'utf8')
  return JSON.parse(raw) as T
}

async function main() {
  const { values } = parseArgs({
    options: {
      window: { type: 'string' },
      run: { type: 'string' },
      pipeline: { type: 'string' },
      class: { type: 'string' },
      out: { type: 'string' },
      pitstorm: { type: 'string' },
      qa: { type: 'string' },
      'scenario-total': { type: 'string' },
      'scenario-passed': { type: 'string' },
      'first-pass': { type: 'string' },
      retries: { type: 'string' },
      interventions: { type: 'string' },
      decision: { type: 'string' },
      'decision-reversed': { type: 'string' },
      'critical-incident': { type: 'string' },
      timestamp: { type: 'string' },
    },
    allowPositionals: false,
  })

  const windowId = values.window
  const runId = values.run
  const pipelineId = values.pipeline
  const pipelineClass = values.class as PipelineClass | undefined
  const outPath = values.out || (windowId ? `runs/${windowId}.ndjson` : '')

  if (!windowId || !runId || !pipelineId || !pipelineClass || !outPath) {
    throw new Error('required: --window --run --pipeline --class --out?')
  }
  if (pipelineClass !== 'low_risk_feature' && pipelineClass !== 'medium_integration') {
    throw new Error(`invalid --class: ${pipelineClass}`)
  }

  const decision = (values.decision || 'approved') as Decision
  if (!['approved', 'rejected', 'failed'].includes(decision)) {
    throw new Error(`invalid --decision: ${decision}`)
  }

  const pitstorm = await maybeReadJSON<PitstormSnapshot>(values.pitstorm)
  const qa = await maybeReadJSON<QaResults>(values.qa)

  const scenarioTotal = values['scenario-total']
    ? Number(values['scenario-total'])
    : (qa?.summary?.total ?? 0)
  const scenarioPassed = values['scenario-passed']
    ? Number(values['scenario-passed'])
    : (qa?.summary?.passed ?? 0)

  if (!Number.isFinite(scenarioTotal) || !Number.isFinite(scenarioPassed)) {
    throw new Error('scenario values must be numeric')
  }
  if (scenarioTotal < 1 || scenarioPassed < 0 || scenarioPassed > scenarioTotal) {
    throw new Error(`invalid scenario counts: passed=${scenarioPassed}, total=${scenarioTotal}`)
  }

  const retries = values.retries ? Number(values.retries) : (pitstorm?.retries ?? 0)
  const interventions = values.interventions ? Number(values.interventions) : 0
  if (!Number.isFinite(retries) || retries < 0) throw new Error('invalid retries')
  if (!Number.isFinite(interventions) || interventions < 0) throw new Error('invalid interventions')

  const defaultFirstPass = decision === 'approved' && retries === 0
  const firstPassSuccess = parseBool(values['first-pass'], defaultFirstPass)
  const decisionReversed = parseBool(values['decision-reversed'], false)
  const criticalIncident = parseBool(values['critical-incident'], false)
  const timestamp = values.timestamp || new Date().toISOString()

  const record: EvalRecord = {
    window_id: windowId,
    run_id: runId,
    pipeline_id: pipelineId,
    pipeline_class: pipelineClass,
    scenario_total: scenarioTotal,
    scenario_passed: scenarioPassed,
    first_pass_success: firstPassSuccess,
    retries,
    interventions,
    decision,
    decision_reversed: decisionReversed,
    critical_incident: criticalIncident,
    timestamp,
  }

  await mkdir(dirname(outPath), { recursive: true })
  await appendFile(outPath, `${JSON.stringify(record)}\n`, 'utf8')

  console.log(JSON.stringify({ ok: true, out: outPath, record }, null, 2))
}

main().catch((err) => {
  console.error(`emit-level4-record: ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
})
