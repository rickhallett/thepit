// Score/cost tradeoff aggregation (M3.2).
//
// Pure aggregation over cost_ledger and evaluations tables.
// No new tables. No migrations. No HTTP awareness.

import { eq, and, desc, sql } from 'drizzle-orm';

import { costLedger, contestants, evaluations } from '@/db/schema';
import type { DbOrTx } from '@/db';
import type { RunId, RubricId, ContestantId } from '@/lib/domain-ids';

/** Per-contestant economics with optional score-based tradeoff metrics. */
export type ContestantEconomics = {
  contestantId: ContestantId;
  label: string;
  model: string;
  costMicro: number;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  /** Overall score normalized 0..1. Null if not yet evaluated. */
  overallScore: number | null;
  /** overallScore / (costMicro / 1_000_000). Null if score or cost unavailable. */
  scorePerDollar: number | null;
  /** overallScore / (latencyMs / 1000). Null if score or latency unavailable. */
  scorePerSecond: number | null;
};

/** Aggregated economics for a run. */
export type RunEconomics = {
  runId: RunId;
  totalCostMicro: number;
  totalTokens: number;
  totalLatencyMs: number;
  contestants: ContestantEconomics[];
  cheapestContestant: string | null;
  fastestContestant: string | null;
  bestValueContestant: string | null;
};

/**
 * Compute economics for a run by aggregating cost_ledger entries
 * and optionally joining the latest evaluation scores.
 *
 * Returns null if no cost ledger entries exist for the run
 * (which means either the run does not exist or has not been executed).
 */
export async function getRunEconomics(
  db: DbOrTx,
  runId: RunId,
  rubricId?: RubricId,
): Promise<RunEconomics | null> {
  // 1. Aggregate cost_ledger by contestantId
  const costRows = await db
    .select({
      contestantId: costLedger.contestantId,
      costMicro: sql<number>`sum(${costLedger.totalCostMicro})`.as('cost_micro'),
      inputTokens: sql<number>`sum(${costLedger.inputTokens})`.as('input_tokens'),
      outputTokens: sql<number>`sum(${costLedger.outputTokens})`.as('output_tokens'),
      latencyMs: sql<number>`sum(${costLedger.latencyMs})`.as('latency_ms'),
    })
    .from(costLedger)
    .where(eq(costLedger.runId, runId))
    .groupBy(costLedger.contestantId);

  if (costRows.length === 0) return null;

  // 2. Load contestant metadata for labels and models
  const contestantRows = await db
    .select({
      id: contestants.id,
      label: contestants.label,
      model: contestants.model,
    })
    .from(contestants)
    .where(eq(contestants.runId, runId));

  const contestantMap = new Map(
    contestantRows.map((c) => [c.id, c]),
  );

  // 3. Load evaluations per contestant, ordered by createdAt desc.
  // Filter by rubricId if provided for deterministic selection.
  const evalConditions = [eq(evaluations.runId, runId)];
  if (rubricId) {
    evalConditions.push(eq(evaluations.rubricId, rubricId));
  }

  const evalRows = await db
    .select({
      contestantId: evaluations.contestantId,
      overallScore: evaluations.overallScore,
      createdAt: evaluations.createdAt,
    })
    .from(evaluations)
    .where(and(...evalConditions))
    .orderBy(desc(evaluations.createdAt));

  // Build a map of contestantId -> latest overallScore.
  // Rows are ordered newest-first, so the first seen per contestant is the latest.
  const scoreMap = new Map<string, number>();
  for (const row of evalRows) {
    if (!scoreMap.has(row.contestantId)) {
      scoreMap.set(row.contestantId, row.overallScore);
    }
  }

  // 4. Combine into ContestantEconomics[]
  let totalCostMicro = 0;
  let totalTokens = 0;
  let totalLatencyMs = 0;

  const contestantEconomics: ContestantEconomics[] = [];

  for (const cost of costRows) {
    // Skip run-level summary costs (contestantId is null)
    if (cost.contestantId === null) {
      totalCostMicro += Number(cost.costMicro);
      totalTokens += Number(cost.inputTokens) + Number(cost.outputTokens);
      totalLatencyMs += Number(cost.latencyMs);
      continue;
    }

    const meta = contestantMap.get(cost.contestantId);
    if (!meta) continue;

    const costMicro = Number(cost.costMicro);
    const inputTokens = Number(cost.inputTokens);
    const outputTokens = Number(cost.outputTokens);
    const latencyMs = Number(cost.latencyMs);
    const overallScore = scoreMap.get(cost.contestantId) ?? null;

    let scorePerDollar: number | null = null;
    let scorePerSecond: number | null = null;

    if (overallScore !== null && costMicro > 0) {
      scorePerDollar = overallScore / (costMicro / 1_000_000);
    }
    if (overallScore !== null && latencyMs > 0) {
      scorePerSecond = overallScore / (latencyMs / 1000);
    }

    totalCostMicro += costMicro;
    totalTokens += inputTokens + outputTokens;
    totalLatencyMs += latencyMs;

    contestantEconomics.push({
      contestantId: cost.contestantId as ContestantId,
      label: meta.label,
      model: meta.model,
      costMicro,
      inputTokens,
      outputTokens,
      latencyMs,
      overallScore,
      scorePerDollar,
      scorePerSecond,
    });
  }

  // If we only had null-contestantId rows (summary costs) and no contestant rows,
  // there is nothing meaningful to return.
  if (contestantEconomics.length === 0 && costRows.every((r) => r.contestantId === null)) {
    return null;
  }

  // 5. Identify cheapest, fastest, best value
  const cheapestContestant = contestantEconomics.length > 0
    ? contestantEconomics.reduce((a, b) => a.costMicro <= b.costMicro ? a : b).contestantId
    : null;

  const fastestContestant = contestantEconomics.length > 0
    ? contestantEconomics.reduce((a, b) => a.latencyMs <= b.latencyMs ? a : b).contestantId
    : null;

  const withScores = contestantEconomics.filter((c) => c.scorePerDollar !== null);
  const bestValueContestant = withScores.length > 0
    ? withScores.reduce((a, b) => (a.scorePerDollar! >= b.scorePerDollar! ? a : b)).contestantId
    : null;

  return {
    runId,
    totalCostMicro,
    totalTokens,
    totalLatencyMs,
    contestants: contestantEconomics,
    cheapestContestant,
    fastestContestant,
    bestValueContestant,
  };
}
