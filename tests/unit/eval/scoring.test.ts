import { describe, expect, it } from 'vitest';

import { computeWeightedScore } from '@/lib/eval/scoring';
import type { CriterionScore, RubricCriterion } from '@/db/schema';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeCriterion(
  name: string,
  weight: number,
  min = 1,
  max = 5,
): RubricCriterion {
  return { name, description: `Evaluates ${name}`, weight, scale: { min, max } };
}

function makeScore(criterionName: string, score: number): CriterionScore {
  return { criterionName, score, rationale: `Rationale for ${criterionName}` };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('lib/eval/scoring', () => {
  describe('computeWeightedScore', () => {
    it('computes correctly with uniform weights', () => {
      const criteria = [
        makeCriterion('relevance', 0.5),
        makeCriterion('clarity', 0.5),
      ];
      const scores = [
        makeScore('relevance', 5), // normalized: (5-1)/(5-1) = 1.0
        makeScore('clarity', 3),   // normalized: (3-1)/(5-1) = 0.5
      ];

      const result = computeWeightedScore(scores, criteria);
      // 1.0 * 0.5 + 0.5 * 0.5 = 0.75
      expect(result).toBeCloseTo(0.75);
    });

    it('respects weight differences', () => {
      const criteria = [
        makeCriterion('relevance', 0.8),
        makeCriterion('clarity', 0.2),
      ];
      const scores = [
        makeScore('relevance', 5), // normalized: 1.0
        makeScore('clarity', 1),   // normalized: 0.0
      ];

      const result = computeWeightedScore(scores, criteria);
      // 1.0 * 0.8 + 0.0 * 0.2 = 0.8
      expect(result).toBeCloseTo(0.8);
    });

    it('normalizes to 0-1 range', () => {
      const criteria = [
        makeCriterion('quality', 1.0, 0, 10),
      ];
      const scores = [
        makeScore('quality', 7), // normalized: 7/10 = 0.7
      ];

      const result = computeWeightedScore(scores, criteria);
      expect(result).toBeCloseTo(0.7);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('clamps out-of-range before normalizing', () => {
      const criteria = [
        makeCriterion('quality', 1.0, 1, 5),
      ];
      const scores = [
        makeScore('quality', 8), // should be clamped to 5
      ];

      const result = computeWeightedScore(scores, criteria);
      // (5-1)/(5-1) = 1.0
      expect(result).toBeCloseTo(1.0);
    });

    it('clamps below-minimum scores', () => {
      const criteria = [
        makeCriterion('quality', 1.0, 1, 5),
      ];
      const scores = [
        makeScore('quality', -2), // should be clamped to 1
      ];

      const result = computeWeightedScore(scores, criteria);
      // (1-1)/(5-1) = 0.0
      expect(result).toBeCloseTo(0.0);
    });

    it('handles missing criterion (scores 0 contribution)', () => {
      const criteria = [
        makeCriterion('relevance', 0.5),
        makeCriterion('clarity', 0.5),
      ];
      const scores = [
        makeScore('relevance', 5), // normalized: 1.0
        // clarity is missing
      ];

      const result = computeWeightedScore(scores, criteria);
      // 1.0 * 0.5 + 0 = 0.5
      expect(result).toBeCloseTo(0.5);
    });

    it('matches case-insensitively', () => {
      const criteria = [
        makeCriterion('Relevance', 1.0),
      ];
      const scores = [
        makeScore('RELEVANCE', 5),
      ];

      const result = computeWeightedScore(scores, criteria);
      expect(result).toBeCloseTo(1.0);
    });

    it('returns 0 when all criteria are missing', () => {
      const criteria = [
        makeCriterion('relevance', 0.5),
        makeCriterion('clarity', 0.5),
      ];
      const scores: CriterionScore[] = [];

      const result = computeWeightedScore(scores, criteria);
      expect(result).toBe(0);
    });
  });
});
