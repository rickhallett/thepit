import { describe, expect, it, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const {
  mockDb, mockSelectWhere, mockGenerateObject,
  mockGetRubric, mockInsertEvaluation,
} = vi.hoisted(() => {
  const mockSelectWhere = vi.fn();

  const mockDb = {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: mockSelectWhere,
      }),
    }),
  };

  const mockGenerateObject = vi.fn();
  const mockGetRubric = vi.fn();
  const mockInsertEvaluation = vi.fn();

  return {
    mockDb, mockSelectWhere,
    mockGenerateObject, mockGetRubric, mockInsertEvaluation,
  };
});

vi.mock('@/db/schema', () => ({
  runs: { id: 'id', taskId: 'task_id', status: 'status' },
  tasks: { id: 'id' },
  contestants: { runId: 'run_id' },
  traces: { runId: 'run_id', contestantId: 'contestant_id' },
  evaluations: {},
  rubrics: {},
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ _eq: val })),
  desc: vi.fn((_col: unknown) => ({ _desc: true })),
  and: vi.fn((...args: unknown[]) => ({ _and: args })),
}));

vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'eval-nanoid-000000000'),
}));

vi.mock('ai', () => ({
  generateObject: mockGenerateObject,
}));

vi.mock('@/lib/ai', () => ({
  getModel: vi.fn(() => 'mocked-model-instance'),
}));

vi.mock('@/lib/eval/rubrics', () => ({
  getRubric: mockGetRubric,
}));

vi.mock('@/lib/eval/evaluations', () => ({
  insertEvaluation: mockInsertEvaluation,
}));

import { buildJudgePrompt, evaluateContestant, evaluateRun } from '@/lib/eval/judge';
import type { JudgeConfig } from '@/lib/eval/judge';
import type { DbOrTx } from '@/db';
import type { RunId, RubricId, ContestantId } from '@/lib/domain-ids';
import type { Rubric } from '@/lib/eval/types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const fakeRubricId = 'rubric-00000000000000' as RubricId;

const fakeRubric: Rubric = {
  id: fakeRubricId,
  name: 'Test Rubric',
  description: 'A test rubric',
  domain: 'test',
  criteria: [
    {
      name: 'relevance',
      description: 'How relevant is the response',
      weight: 0.6,
      scale: { min: 1, max: 5 },
    },
    {
      name: 'clarity',
      description: 'How clear is the response',
      weight: 0.4,
      scale: { min: 1, max: 5 },
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const fakeRunId = 'run-abc-000000000000' as RunId;

const fakeRun = {
  id: fakeRunId,
  taskId: 'task-abc-00000000000',
  status: 'completed',
  ownerId: null,
  startedAt: new Date(),
  completedAt: new Date(),
  error: null,
  metadata: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const fakeTask = {
  id: 'task-abc-00000000000',
  name: 'Test task',
  prompt: 'Write a cover letter.',
};

const fakeContestant1 = {
  id: 'cont-1-00000000000' as ContestantId,
  runId: fakeRunId,
  label: 'GPT-4o',
  model: 'gpt-4o',
};

const fakeContestant2 = {
  id: 'cont-2-00000000000' as ContestantId,
  runId: fakeRunId,
  label: 'Claude',
  model: 'claude-sonnet-4-6',
};

const fakeTrace1 = {
  id: 'trace-10000000000000',
  runId: fakeRunId,
  contestantId: 'cont-1-00000000000',
  responseContent: 'Dear hiring manager, I am writing to apply...',
  status: 'success',
};

const fakeTrace2 = {
  id: 'trace-20000000000000',
  runId: fakeRunId,
  contestantId: 'cont-2-00000000000',
  responseContent: 'I would like to express my interest...',
  status: 'success',
};

const fakeEvaluation = {
  id: 'eval-nanoid-000000000',
  runId: fakeRunId,
  contestantId: 'cont-1-00000000000',
  rubricId: fakeRubricId,
  judgeModel: 'gpt-4o',
  scores: [
    { criterionName: 'relevance', score: 4, rationale: 'Good relevance' },
    { criterionName: 'clarity', score: 3, rationale: 'Decent clarity' },
  ],
  overallScore: 0.7,
  rationale: 'Overall decent response.',
  rawJudgeResponse: null,
  reconciliation: null,
  inputTokens: 200,
  outputTokens: 100,
  latencyMs: 500,
  createdAt: new Date(),
};

const defaultJudgeOutput = {
  scores: [
    { criterionName: 'relevance', score: 4, rationale: 'Good relevance' },
    { criterionName: 'clarity', score: 3, rationale: 'Decent clarity' },
  ],
  overallRationale: 'Overall decent response.',
};

const fakeConfig: JudgeConfig = {
  model: 'gpt-4o',
  rubricId: fakeRubricId,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let selectCallCount = 0;

function resetMocks() {
  selectCallCount = 0;

  mockGenerateObject.mockResolvedValue({
    object: defaultJudgeOutput,
    usage: { inputTokens: 200, outputTokens: 100 },
  });

  mockInsertEvaluation.mockResolvedValue(fakeEvaluation);
  mockGetRubric.mockResolvedValue(fakeRubric);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setupRunMocks(opts?: { run?: any; contestants?: any[]; traces?: any[] }) {
  const run = opts?.run ?? fakeRun;
  const contestantList = opts?.contestants ?? [fakeContestant1, fakeContestant2];
  const traceList = opts?.traces ?? [fakeTrace1, fakeTrace2];

  selectCallCount = 0;
  mockSelectWhere.mockImplementation(() => {
    selectCallCount++;
    if (selectCallCount === 1) {
      // run lookup
      return { limit: vi.fn().mockResolvedValue([run]) };
    }
    if (selectCallCount === 2) {
      // task lookup
      return { limit: vi.fn().mockResolvedValue([fakeTask]) };
    }
    if (selectCallCount === 3) {
      // contestants
      return Promise.resolve(contestantList);
    }
    // traces
    return Promise.resolve(traceList);
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('lib/eval/judge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMocks();
  });

  // -- buildJudgePrompt ---------------------------------------------------

  describe('buildJudgePrompt', () => {
    it('includes all rubric criteria', () => {
      const messages = buildJudgePrompt(fakeTask, fakeRubric, 'test response');
      const userMsg = messages.find((m) => m.role === 'user')!;
      expect(userMsg.content).toContain('relevance');
      expect(userMsg.content).toContain('clarity');
      expect(userMsg.content).toContain('weight: 0.6');
      expect(userMsg.content).toContain('weight: 0.4');
    });

    it('includes task prompt and contestant response', () => {
      const messages = buildJudgePrompt(fakeTask, fakeRubric, 'My cover letter...');
      const userMsg = messages.find((m) => m.role === 'user')!;
      expect(userMsg.content).toContain('Write a cover letter.');
      expect(userMsg.content).toContain('My cover letter...');
    });

    it('includes system prompt with judge instructions', () => {
      const messages = buildJudgePrompt(fakeTask, fakeRubric, 'test');
      const sysMsg = messages.find((m) => m.role === 'system')!;
      expect(sysMsg.content).toContain('evaluation judge');
      expect(sysMsg.content).toContain('EVERY criterion');
    });
  });

  // -- evaluateContestant -------------------------------------------------

  describe('evaluateContestant', () => {
    it('persists evaluation with scores', async () => {
      await evaluateContestant(
        mockDb as unknown as DbOrTx,
        fakeConfig,
        fakeTrace1,
        fakeTask,
        fakeRubric,
      );

      expect(mockInsertEvaluation).toHaveBeenCalledTimes(1);
      const insertArg = mockInsertEvaluation.mock.calls[0]![1];
      expect(insertArg.scores).toHaveLength(2);
      expect(insertArg.rubricId).toBe(fakeRubricId);
      expect(insertArg.judgeModel).toBe('gpt-4o');
    });

    it('captures judge token usage', async () => {
      await evaluateContestant(
        mockDb as unknown as DbOrTx,
        fakeConfig,
        fakeTrace1,
        fakeTask,
        fakeRubric,
      );

      const insertArg = mockInsertEvaluation.mock.calls[0]![1];
      expect(insertArg.inputTokens).toBe(200);
      expect(insertArg.outputTokens).toBe(100);
    });

    it('handles judge model error gracefully', async () => {
      mockGenerateObject.mockRejectedValue(new Error('Model unavailable'));

      await expect(
        evaluateContestant(
          mockDb as unknown as DbOrTx,
          fakeConfig,
          fakeTrace1,
          fakeTask,
          fakeRubric,
        ),
      ).rejects.toThrow('Model unavailable');
    });

    // -- Reconciliation tests -----------------------------------------------

    it('scores missing criterion as scale minimum with flag', async () => {
      mockGenerateObject.mockResolvedValue({
        object: {
          scores: [
            { criterionName: 'relevance', score: 4, rationale: 'Good' },
            // clarity is missing
          ],
          overallRationale: 'Partial scores.',
        },
        usage: { inputTokens: 200, outputTokens: 100 },
      });

      await evaluateContestant(
        mockDb as unknown as DbOrTx,
        fakeConfig,
        fakeTrace1,
        fakeTask,
        fakeRubric,
      );

      const insertArg = mockInsertEvaluation.mock.calls[0]![1];
      // Should have 2 scores: relevance scored normally, clarity defaulted to min
      expect(insertArg.scores).toHaveLength(2);
      const clarityScore = insertArg.scores.find(
        (s: { criterionName: string }) => s.criterionName === 'clarity',
      );
      expect(clarityScore!.score).toBe(1); // scale.min
      expect(insertArg.reconciliation).toContainEqual(
        expect.objectContaining({ type: 'missing_criterion', criterionName: 'clarity' }),
      );
    });

    it('discards extra criterion from judge output', async () => {
      mockGenerateObject.mockResolvedValue({
        object: {
          scores: [
            { criterionName: 'relevance', score: 4, rationale: 'Good' },
            { criterionName: 'clarity', score: 3, rationale: 'OK' },
            { criterionName: 'creativity', score: 5, rationale: 'Extra' },
          ],
          overallRationale: 'Extra criterion included.',
        },
        usage: { inputTokens: 200, outputTokens: 100 },
      });

      await evaluateContestant(
        mockDb as unknown as DbOrTx,
        fakeConfig,
        fakeTrace1,
        fakeTask,
        fakeRubric,
      );

      const insertArg = mockInsertEvaluation.mock.calls[0]![1];
      // Only 2 rubric criteria should be in scores, not 3
      expect(insertArg.scores).toHaveLength(2);
      expect(insertArg.scores.find(
        (s: { criterionName: string }) => s.criterionName === 'creativity',
      )).toBeUndefined();
      expect(insertArg.reconciliation).toContainEqual(
        expect.objectContaining({ type: 'extra_criterion', criterionName: 'creativity' }),
      );
    });

    it('clamps out-of-range scores with flag', async () => {
      mockGenerateObject.mockResolvedValue({
        object: {
          scores: [
            { criterionName: 'relevance', score: 8, rationale: 'Way too high' },
            { criterionName: 'clarity', score: 3, rationale: 'OK' },
          ],
          overallRationale: 'Out of range.',
        },
        usage: { inputTokens: 200, outputTokens: 100 },
      });

      await evaluateContestant(
        mockDb as unknown as DbOrTx,
        fakeConfig,
        fakeTrace1,
        fakeTask,
        fakeRubric,
      );

      const insertArg = mockInsertEvaluation.mock.calls[0]![1];
      const relevanceScore = insertArg.scores.find(
        (s: { criterionName: string }) => s.criterionName === 'relevance',
      );
      expect(relevanceScore!.score).toBe(5); // clamped to max
      expect(insertArg.reconciliation).toContainEqual(
        expect.objectContaining({ type: 'score_clamped', criterionName: 'relevance' }),
      );
    });

    it('treats misspelled criterion as missing (no fuzzy match)', async () => {
      mockGenerateObject.mockResolvedValue({
        object: {
          scores: [
            { criterionName: 'relevence', score: 4, rationale: 'Misspelled' }, // typo
            { criterionName: 'clarity', score: 3, rationale: 'OK' },
          ],
          overallRationale: 'Misspelling test.',
        },
        usage: { inputTokens: 200, outputTokens: 100 },
      });

      await evaluateContestant(
        mockDb as unknown as DbOrTx,
        fakeConfig,
        fakeTrace1,
        fakeTask,
        fakeRubric,
      );

      const insertArg = mockInsertEvaluation.mock.calls[0]![1];
      // relevance should be missing (scored at min), relevence should be extra
      const relevanceScore = insertArg.scores.find(
        (s: { criterionName: string }) => s.criterionName === 'relevance',
      );
      expect(relevanceScore!.score).toBe(1); // scale.min
      expect(insertArg.reconciliation).toContainEqual(
        expect.objectContaining({ type: 'missing_criterion', criterionName: 'relevance' }),
      );
      expect(insertArg.reconciliation).toContainEqual(
        expect.objectContaining({ type: 'extra_criterion', criterionName: 'relevence' }),
      );
    });
  });

  // -- evaluateRun --------------------------------------------------------

  describe('evaluateRun', () => {
    it('evaluates all contestants in a run', async () => {
      setupRunMocks();

      const results = await evaluateRun(
        mockDb as unknown as DbOrTx,
        fakeRunId,
        fakeConfig,
      );

      expect(results).toHaveLength(2);
      expect(mockGenerateObject).toHaveBeenCalledTimes(2);
    });

    it('accepts completed runs', async () => {
      setupRunMocks({ run: { ...fakeRun, status: 'completed' } });

      const results = await evaluateRun(
        mockDb as unknown as DbOrTx,
        fakeRunId,
        fakeConfig,
      );

      expect(results).toHaveLength(2);
    });

    it('accepts failed runs with partial traces (skips error traces)', async () => {
      const errorTrace = {
        ...fakeTrace2,
        status: 'error',
        responseContent: null as string | null,
      };

      setupRunMocks({
        run: { ...fakeRun, status: 'failed' },
        traces: [fakeTrace1, errorTrace],
      });

      const results = await evaluateRun(
        mockDb as unknown as DbOrTx,
        fakeRunId,
        fakeConfig,
      );

      // Only 1 contestant should be evaluated (the one with success trace)
      expect(results).toHaveLength(1);
      expect(mockGenerateObject).toHaveBeenCalledTimes(1);
    });

    it('rejects pending runs', async () => {
      setupRunMocks({ run: { ...fakeRun, status: 'pending' } });

      await expect(
        evaluateRun(mockDb as unknown as DbOrTx, fakeRunId, fakeConfig),
      ).rejects.toThrow('expected completed or failed');
    });

    it('rejects running runs', async () => {
      setupRunMocks({ run: { ...fakeRun, status: 'running' } });

      await expect(
        evaluateRun(mockDb as unknown as DbOrTx, fakeRunId, fakeConfig),
      ).rejects.toThrow('expected completed or failed');
    });

    it('throws when run not found', async () => {
      selectCallCount = 0;
      mockSelectWhere.mockImplementation(() => {
        selectCallCount++;
        return { limit: vi.fn().mockResolvedValue([]) };
      });

      await expect(
        evaluateRun(mockDb as unknown as DbOrTx, fakeRunId, fakeConfig),
      ).rejects.toThrow('Run not found');
    });
  });
});
