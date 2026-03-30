// GET /api/comparisons -- side-by-side comparison for a run (M2.3).
//
// Query params: runId (required), rubricId (required).
// Returns a RunComparison with scorecards, winner, and criterion breakdown.

import { requireDb } from '@/db';
import { asRunId, asRubricId } from '@/lib/domain-ids';
import { errorResponse, API_ERRORS } from '@/lib/api-utils';
import { log } from '@/lib/logger';
import { getRunWithTraces } from '@/lib/run/queries';
import { getEvaluationsForRun } from '@/lib/eval/evaluations';
import { getRubric } from '@/lib/eval/rubrics';
import { compareRun } from '@/lib/eval/scoring';
import { withLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

export const GET = withLogging(async function GET(req: Request) {
  const url = new URL(req.url);
  const runId = url.searchParams.get('runId');
  const rubricId = url.searchParams.get('rubricId');

  if (!runId || !rubricId) {
    return errorResponse('runId and rubricId query params are required', 400);
  }

  try {
    const db = requireDb();
    const run = await getRunWithTraces(db, asRunId(runId));

    if (!run) {
      return errorResponse('Run not found', 404);
    }

    const allEvaluations = await getEvaluationsForRun(db, asRunId(runId));

    // Get latest evaluation per contestant for this rubric
    const evaluationsByContestant = new Map<string, typeof allEvaluations[0]>();
    for (const evaluation of allEvaluations) {
      if (evaluation.rubricId !== rubricId) continue;
      const existing = evaluationsByContestant.get(evaluation.contestantId);
      if (!existing || evaluation.createdAt > existing.createdAt) {
        evaluationsByContestant.set(evaluation.contestantId, evaluation);
      }
    }

    if (evaluationsByContestant.size === 0) {
      return errorResponse('No evaluations found for this run and rubric', 404);
    }

    const rubric = await getRubric(db, asRubricId(rubricId));
    if (!rubric) {
      return errorResponse('Rubric not found', 404);
    }

    const latestEvaluations = [...evaluationsByContestant.values()];
    const contestants = run.contestants.filter((c) =>
      evaluationsByContestant.has(c.id),
    );

    const comparison = compareRun(latestEvaluations, contestants, rubric, run.task);

    return Response.json(comparison, { status: 200 });
  } catch (error) {
    log.error('GET /api/comparisons failed', error instanceof Error ? error : new Error(String(error)));
    return errorResponse(API_ERRORS.INTERNAL, 500);
  }
}, 'comparisons');
