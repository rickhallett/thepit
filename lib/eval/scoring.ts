// Score computation -- pure functions for weighted score aggregation (M2.2, M2.3).
//
// No database calls. Operates on in-memory data passed to it.
// All overallScore values are normalized to 0..1 range.

import type { CriterionScore, RubricCriterion } from '@/db/schema';
import { asRunId, asContestantId } from '@/lib/domain-ids';
import type { Evaluation, Rubric, Scorecard, RunComparison } from './types';
import type { Contestant, Task } from '@/lib/run/types';

/**
 * Compute the weighted overall score from per-criterion scores and rubric criteria.
 *
 * For each criterion:
 *   normalized = (score - scale.min) / (scale.max - scale.min)  // 0..1
 *   weightedScore = normalized * criterion.weight
 *
 * overallScore = sum of all weightedScores  // 0..1
 *
 * Scores outside [min, max] are clamped before normalizing.
 * Missing criteria (no matching score) contribute 0.
 */
export function computeWeightedScore(
  scores: CriterionScore[],
  criteria: RubricCriterion[],
): number {
  let overallScore = 0;

  for (const criterion of criteria) {
    const match = scores.find(
      (s) => s.criterionName.trim().toLowerCase() === criterion.name.trim().toLowerCase(),
    );

    if (!match) {
      // Missing criterion contributes 0
      continue;
    }

    // Clamp score to [min, max]
    const clamped = Math.min(Math.max(match.score, criterion.scale.min), criterion.scale.max);

    // Normalize to 0..1
    const range = criterion.scale.max - criterion.scale.min;
    const normalized = range > 0 ? (clamped - criterion.scale.min) / range : 0;

    overallScore += normalized * criterion.weight;
  }

  return overallScore;
}

// ---------------------------------------------------------------------------
// Scorecard and comparison (M2.3)
// ---------------------------------------------------------------------------

/**
 * Build a scorecard for a single contestant from its evaluation and rubric.
 *
 * Computes normalizedScore and weightedScore per criterion, then
 * uses computeWeightedScore for the overall score.
 */
export function buildScorecard(
  evaluation: Evaluation,
  contestant: Contestant,
  rubric: Rubric,
): Scorecard {
  const criteria = rubric.criteria as RubricCriterion[];

  const criterionScores = criteria.map((criterion) => {
    const match = evaluation.scores.find(
      (s) => s.criterionName.trim().toLowerCase() === criterion.name.trim().toLowerCase(),
    );

    const rawScore = match?.score ?? criterion.scale.min;
    const clamped = Math.min(Math.max(rawScore, criterion.scale.min), criterion.scale.max);
    const range = criterion.scale.max - criterion.scale.min;
    const normalizedScore = range > 0 ? (clamped - criterion.scale.min) / range : 0;

    return {
      name: criterion.name,
      score: clamped,
      normalizedScore,
      weight: criterion.weight,
      weightedScore: normalizedScore * criterion.weight,
      rationale: match?.rationale ?? '',
    };
  });

  return {
    runId: asRunId(evaluation.runId),
    contestantId: asContestantId(evaluation.contestantId),
    contestantLabel: contestant.label,
    rubricName: rubric.name,
    overallScore: computeWeightedScore(evaluation.scores, criteria),
    criterionScores,
  };
}

/**
 * Compare all contestants in a run by building scorecards and identifying the winner.
 *
 * Winner is the contestant with the highest overallScore.
 * Margin is the difference between winner and runner-up.
 * Returns null winner on tie (two or more contestants share the top score).
 */
export function compareRun(
  evaluations: Evaluation[],
  contestants: Contestant[],
  rubric: Rubric,
  task: Task,
): RunComparison {
  const criteria = rubric.criteria as RubricCriterion[];

  // Build a scorecard per contestant
  const scorecards = evaluations.map((evaluation) => {
    const contestant = contestants.find((c) => c.id === evaluation.contestantId);
    if (!contestant) {
      throw new Error(`Contestant ${evaluation.contestantId} not found`);
    }
    return buildScorecard(evaluation, contestant, rubric);
  });

  // Sort by overallScore descending
  const sorted = [...scorecards].sort((a, b) => b.overallScore - a.overallScore);

  // Determine winner (null on tie)
  let winner: RunComparison['winner'] = null;
  if (sorted.length >= 2) {
    const top = sorted[0]!;
    const runnerUp = sorted[1]!;
    if (top.overallScore !== runnerUp.overallScore) {
      winner = {
        contestantId: top.contestantId,
        label: top.contestantLabel,
        margin: top.overallScore - runnerUp.overallScore,
      };
    }
  } else if (sorted.length === 1) {
    // Single contestant is the winner by default
    const only = sorted[0]!;
    winner = {
      contestantId: only.contestantId,
      label: only.contestantLabel,
      margin: only.overallScore,
    };
  }

  // Per-criterion breakdown
  const criterionBreakdown = criteria.map((criterion) => {
    const scores = scorecards.map((sc) => {
      const cs = sc.criterionScores.find(
        (c) => c.name.trim().toLowerCase() === criterion.name.trim().toLowerCase(),
      );
      return {
        contestantLabel: sc.contestantLabel,
        score: cs?.score ?? criterion.scale.min,
      };
    });

    // Find criterion winner
    let criterionWinner: string | null = null;
    if (scores.length >= 2) {
      const sortedScores = [...scores].sort((a, b) => b.score - a.score);
      if (sortedScores[0]!.score !== sortedScores[1]!.score) {
        criterionWinner = sortedScores[0]!.contestantLabel;
      }
    } else if (scores.length === 1) {
      criterionWinner = scores[0]!.contestantLabel;
    }

    return {
      criterionName: criterion.name,
      scores,
      winner: criterionWinner,
    };
  });

  return {
    taskName: task.name,
    rubricName: rubric.name,
    contestants: scorecards,
    winner,
    criterionBreakdown,
  };
}
