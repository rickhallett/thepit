// GET /api/runs/:id/scores -- scorecards for all contestants in a run (M2.3).
//
// Loads the run, its contestants, the latest evaluation per contestant,
// and the rubric. Builds a scorecard per contestant and returns the array.

import { requireDb } from '@/db';
import { asRunId, asRubricId } from '@/lib/domain-ids';
import { errorResponse, API_ERRORS } from '@/lib/api-utils';
import { log } from '@/lib/logger';
import { getRunWithTraces } from '@/lib/run/queries';
import { getEvaluationsForRun } from '@/lib/eval/evaluations';
import { getRubric } from '@/lib/eval/rubrics';
import { buildScorecard } from '@/lib/eval/scoring';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(req.url);
  const rubricId = url.searchParams.get('rubricId');

  try {
    const db = requireDb();
    const run = await getRunWithTraces(db, asRunId(id));

    if (!run) {
      return errorResponse('Run not found', 404);
    }

    const allEvaluations = await getEvaluationsForRun(db, asRunId(id));
    if (allEvaluations.length === 0) {
      return errorResponse('No evaluations found for this run', 404);
    }

    // Filter by rubricId if provided, otherwise use the first rubric found
    const targetRubricId = rubricId ?? allEvaluations[0]!.rubricId;

    // Get latest evaluation per contestant for the target rubric
    const evaluationsByContestant = new Map<string, typeof allEvaluations[0]>();
    for (const evaluation of allEvaluations) {
      if (evaluation.rubricId !== targetRubricId) continue;
      const existing = evaluationsByContestant.get(evaluation.contestantId);
      if (!existing || evaluation.createdAt > existing.createdAt) {
        evaluationsByContestant.set(evaluation.contestantId, evaluation);
      }
    }

    if (evaluationsByContestant.size === 0) {
      return errorResponse('No evaluations found for this rubric', 404);
    }

    const rubric = await getRubric(db, asRubricId(targetRubricId));
    if (!rubric) {
      return errorResponse('Rubric not found', 404);
    }

    const scorecards = [];
    for (const [contestantId, evaluation] of evaluationsByContestant) {
      const contestant = run.contestants.find((c) => c.id === contestantId);
      if (!contestant) continue;
      scorecards.push(buildScorecard(evaluation, contestant, rubric));
    }

    return Response.json(scorecards, { status: 200 });
  } catch (error) {
    log.error('GET /api/runs/[id]/scores failed', error instanceof Error ? error : new Error(String(error)));
    return errorResponse(API_ERRORS.INTERNAL, 500);
  }
}
