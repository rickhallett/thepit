// Score computation -- pure functions for weighted score aggregation (M2.2).
//
// No database calls. Operates on in-memory data passed to it.
// All overallScore values are normalized to 0..1 range.

import type { CriterionScore, RubricCriterion } from '@/db/schema';

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
