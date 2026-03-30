// Run report assembly -- composite read model for evaluated runs (M2.5).
//
// Pure read, never writes. Assembles existing data into a RunReport.
// If evaluations exist for the rubric, includes scorecards, comparison,
// and stored summary. If not, returns the report shell with
// needsEvaluation=true.

import type { DbOrTx } from '@/db';
import type { RunId, RubricId } from '@/lib/domain-ids';
import type { RunReport } from './types';
import type { TraceMessage } from '@/db/schema';

import { getRunWithTraces } from '@/lib/run/queries';
import { getEvaluationsForRun } from './evaluations';
import { getRubric } from './rubrics';
import { getFailureTagsForRun } from './failure-tags';
import { buildScorecard, compareRun } from './scoring';

/**
 * Assemble a run report from existing data. Pure read -- no model
 * calls, no writes. If evaluations exist for the rubric, includes
 * scorecards, comparison, and pre-generated summary. If not,
 * returns the report shell with needsEvaluation=true.
 */
export async function assembleRunReport(
  db: DbOrTx,
  runId: RunId,
  rubricId: RubricId,
): Promise<RunReport | null> {
  // 1. Load run with task, contestants, traces
  const runData = await getRunWithTraces(db, runId);
  if (!runData) return null;

  const { task, contestants: contestantsWithTraces, ...run } = runData;

  // 2. Load rubric
  const rubric = await getRubric(db, rubricId);
  if (!rubric) return null;

  // 3. Load all failure tags for this run
  const allFailureTags = await getFailureTagsForRun(db, runId);

  // 4. Load evaluations and filter by rubricId
  const allEvaluations = await getEvaluationsForRun(db, runId);

  // Get latest evaluation per contestant for this rubric
  const evaluationsByContestant = new Map<string, typeof allEvaluations[0]>();
  for (const evaluation of allEvaluations) {
    if (evaluation.rubricId !== rubricId) continue;
    const existing = evaluationsByContestant.get(evaluation.contestantId);
    if (!existing || evaluation.createdAt > existing.createdAt) {
      evaluationsByContestant.set(evaluation.contestantId, evaluation);
    }
  }

  const hasEvaluations = evaluationsByContestant.size > 0;

  // 5. Build per-contestant report entries
  const reportContestants = contestantsWithTraces.map((c) => {
    const contestantFailureTags = allFailureTags.filter(
      (ft) => ft.contestantId === c.id,
    );

    const evaluation = evaluationsByContestant.get(c.id);
    const scorecard = evaluation
      ? buildScorecard(evaluation, c, rubric)
      : null;

    // Separate the trace from the contestant fields
    const { trace, ...contestant } = c;

    return {
      contestant,
      trace,
      scorecard,
      failureTags: contestantFailureTags,
    };
  });

  // 6. Build comparison if evaluations exist
  let comparison: RunReport['comparison'] = null;
  let summary: string | null = null;

  if (hasEvaluations) {
    const latestEvaluations = [...evaluationsByContestant.values()];
    const evaluatedContestants = contestantsWithTraces.filter((c) =>
      evaluationsByContestant.has(c.id),
    );

    comparison = compareRun(latestEvaluations, evaluatedContestants, rubric, task);

    // Use the first evaluation's rationale as a summary if available
    const firstEvaluation = latestEvaluations[0];
    summary = firstEvaluation?.rationale ?? null;
  }

  return {
    run,
    task,
    rubric,
    needsEvaluation: !hasEvaluations,
    contestants: reportContestants,
    comparison,
    summary,
  };
}

/**
 * Build the summary generation prompt from comparison data.
 * Internal helper for future use -- summary generation is not
 * called during report assembly (GET must be safe/idempotent).
 */
export function buildSummaryPrompt(
  comparison: NonNullable<RunReport['comparison']>,
  contestants: RunReport['contestants'],
): TraceMessage[] {
  return [
    {
      role: 'system',
      content: `You are a technical report writer. Summarize evaluation results.
Be specific about what each contestant did well and poorly.
Reference specific criterion scores and failure tags.
Do not use filler language. State facts and conclusions.`,
    },
    {
      role: 'user',
      content: `## Comparison data
${JSON.stringify(comparison, null, 2)}

## Failure tags
${contestants.map((c) =>
  `${c.contestant.label}: ${c.failureTags.length > 0
    ? c.failureTags.map((t) => `${t.category}: ${t.description}`).join('; ')
    : 'none'}`
).join('\n')}

Write a 2-3 paragraph summary explaining:
1. Which contestant won and by what margin
2. The key criteria where they differed
3. Any failure patterns observed
4. Whether the result is decisive or marginal`,
    },
  ];
}
