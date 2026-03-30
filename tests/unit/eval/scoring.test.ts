import { describe, expect, it } from 'vitest';

import { computeWeightedScore, buildScorecard, compareRun } from '@/lib/eval/scoring';
import type { CriterionScore, RubricCriterion } from '@/db/schema';
import type { Evaluation, Rubric } from '@/lib/eval/types';
import type { Contestant, Task } from '@/lib/run/types';
import type { RunId, ContestantId, RubricId, EvaluationId } from '@/lib/domain-ids';

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

  // -------------------------------------------------------------------------
  // buildScorecard (M2.3)
  // -------------------------------------------------------------------------

  describe('buildScorecard', () => {
    function makeEvaluation(overrides: Partial<Evaluation> = {}): Evaluation {
      return {
        id: 'eval-00000000000000000' as EvaluationId,
        runId: 'run-000000000000000000' as RunId,
        contestantId: 'cont-00000000000000000' as ContestantId,
        rubricId: 'rubric-00000000000000' as RubricId,
        judgeModel: 'gpt-4o',
        scores: [
          makeScore('relevance', 5),
          makeScore('clarity', 3),
        ],
        overallScore: 0.75,
        rationale: 'Overall rationale.',
        rawJudgeResponse: null,
        reconciliation: null,
        inputTokens: null,
        outputTokens: null,
        latencyMs: null,
        createdAt: new Date(),
        ...overrides,
      };
    }

    function makeContestant(overrides: Partial<Contestant> = {}): Contestant {
      return {
        id: 'cont-00000000000000000' as ContestantId,
        runId: 'run-000000000000000000' as RunId,
        label: 'GPT-4o',
        model: 'gpt-4o',
        provider: 'openai',
        systemPrompt: null,
        temperature: null,
        maxTokens: null,
        toolAccess: null,
        contextBundle: null,
        createdAt: new Date(),
        ...overrides,
      };
    }

    function makeRubric(overrides: Partial<Rubric> = {}): Rubric {
      return {
        id: 'rubric-00000000000000' as RubricId,
        name: 'Test Rubric',
        description: 'A test rubric',
        domain: 'test',
        criteria: [
          makeCriterion('relevance', 0.5),
          makeCriterion('clarity', 0.5),
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
      };
    }

    it('computes weighted scores correctly', () => {
      const evaluation = makeEvaluation();
      const contestant = makeContestant();
      const rubric = makeRubric();

      const scorecard = buildScorecard(evaluation, contestant, rubric);

      expect(scorecard.runId).toBe(evaluation.runId);
      expect(scorecard.contestantId).toBe(contestant.id);
      expect(scorecard.contestantLabel).toBe('GPT-4o');
      expect(scorecard.rubricName).toBe('Test Rubric');
      // relevance: (5-1)/(5-1)*0.5=0.5, clarity: (3-1)/(5-1)*0.5=0.25
      expect(scorecard.overallScore).toBeCloseTo(0.75);
    });

    it('includes per-criterion breakdown', () => {
      const evaluation = makeEvaluation();
      const contestant = makeContestant();
      const rubric = makeRubric();

      const scorecard = buildScorecard(evaluation, contestant, rubric);

      expect(scorecard.criterionScores).toHaveLength(2);

      const relevance = scorecard.criterionScores.find((c) => c.name === 'relevance')!;
      expect(relevance.score).toBe(5);
      expect(relevance.normalizedScore).toBeCloseTo(1.0);
      expect(relevance.weight).toBe(0.5);
      expect(relevance.weightedScore).toBeCloseTo(0.5);
      expect(relevance.rationale).toBe('Rationale for relevance');

      const clarity = scorecard.criterionScores.find((c) => c.name === 'clarity')!;
      expect(clarity.score).toBe(3);
      expect(clarity.normalizedScore).toBeCloseTo(0.5);
      expect(clarity.weight).toBe(0.5);
      expect(clarity.weightedScore).toBeCloseTo(0.25);
    });
  });

  // -------------------------------------------------------------------------
  // compareRun (M2.3)
  // -------------------------------------------------------------------------

  describe('compareRun', () => {
    function makeEvaluation(
      contestantId: string,
      scores: CriterionScore[],
      overallScore: number,
    ): Evaluation {
      return {
        id: `eval-${contestantId}` as EvaluationId,
        runId: 'run-000000000000000000' as RunId,
        contestantId: contestantId as ContestantId,
        rubricId: 'rubric-00000000000000' as RubricId,
        judgeModel: 'gpt-4o',
        scores,
        overallScore,
        rationale: 'Rationale.',
        rawJudgeResponse: null,
        reconciliation: null,
        inputTokens: null,
        outputTokens: null,
        latencyMs: null,
        createdAt: new Date(),
      };
    }

    function makeContestant(id: string, label: string): Contestant {
      return {
        id: id as ContestantId,
        runId: 'run-000000000000000000' as RunId,
        label,
        model: 'gpt-4o',
        provider: 'openai',
        systemPrompt: null,
        temperature: null,
        maxTokens: null,
        toolAccess: null,
        contextBundle: null,
        createdAt: new Date(),
      };
    }

    const rubric: Rubric = {
      id: 'rubric-00000000000000' as RubricId,
      name: 'Test Rubric',
      description: 'A test rubric',
      domain: 'test',
      criteria: [
        makeCriterion('relevance', 0.5),
        makeCriterion('clarity', 0.5),
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const task: Task = {
      id: 'task-0000000000000000000',
      name: 'Test Task',
      description: 'A test task',
      prompt: 'Do something',
      constraints: null,
      expectedOutputShape: null,
      acceptanceCriteria: null,
      domain: 'test',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Task;

    it('identifies winner by highest overall score', () => {
      const evaluations = [
        makeEvaluation('cont-a', [makeScore('relevance', 5), makeScore('clarity', 5)], 1.0),
        makeEvaluation('cont-b', [makeScore('relevance', 3), makeScore('clarity', 3)], 0.5),
      ];
      const contestants = [
        makeContestant('cont-a', 'GPT-4o'),
        makeContestant('cont-b', 'Claude'),
      ];

      const result = compareRun(evaluations, contestants, rubric, task);

      expect(result.winner).not.toBeNull();
      expect(result.winner!.contestantId).toBe('cont-a');
      expect(result.winner!.label).toBe('GPT-4o');
      expect(result.winner!.margin).toBeCloseTo(0.5);
    });

    it('returns null winner on tie', () => {
      const evaluations = [
        makeEvaluation('cont-a', [makeScore('relevance', 4), makeScore('clarity', 4)], 0.75),
        makeEvaluation('cont-b', [makeScore('relevance', 4), makeScore('clarity', 4)], 0.75),
      ];
      const contestants = [
        makeContestant('cont-a', 'GPT-4o'),
        makeContestant('cont-b', 'Claude'),
      ];

      const result = compareRun(evaluations, contestants, rubric, task);

      expect(result.winner).toBeNull();
    });

    it('includes per-criterion breakdown with per-criterion winners', () => {
      const evaluations = [
        makeEvaluation('cont-a', [makeScore('relevance', 5), makeScore('clarity', 2)], 0.625),
        makeEvaluation('cont-b', [makeScore('relevance', 3), makeScore('clarity', 4)], 0.625),
      ];
      const contestants = [
        makeContestant('cont-a', 'GPT-4o'),
        makeContestant('cont-b', 'Claude'),
      ];

      const result = compareRun(evaluations, contestants, rubric, task);

      expect(result.criterionBreakdown).toHaveLength(2);

      const relevanceBreakdown = result.criterionBreakdown.find((c) => c.criterionName === 'relevance')!;
      expect(relevanceBreakdown.winner).toBe('GPT-4o');
      expect(relevanceBreakdown.scores).toHaveLength(2);

      const clarityBreakdown = result.criterionBreakdown.find((c) => c.criterionName === 'clarity')!;
      expect(clarityBreakdown.winner).toBe('Claude');
    });

    it('handles single contestant', () => {
      const evaluations = [
        makeEvaluation('cont-a', [makeScore('relevance', 4), makeScore('clarity', 4)], 0.75),
      ];
      const contestants = [
        makeContestant('cont-a', 'GPT-4o'),
      ];

      const result = compareRun(evaluations, contestants, rubric, task);

      expect(result.contestants).toHaveLength(1);
      expect(result.winner).not.toBeNull();
      expect(result.winner!.contestantId).toBe('cont-a');
      expect(result.winner!.label).toBe('GPT-4o');
      expect(result.winner!.margin).toBeCloseTo(0.75);
      expect(result.criterionBreakdown).toHaveLength(2);
    });
  });
});
