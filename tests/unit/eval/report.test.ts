import { describe, expect, it, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mockGetRunWithTraces = vi.hoisted(() => vi.fn());
const mockGetEvaluationsForRun = vi.hoisted(() => vi.fn());
const mockGetRubric = vi.hoisted(() => vi.fn());
const mockGetFailureTagsForRun = vi.hoisted(() => vi.fn());
const mockBuildScorecard = vi.hoisted(() => vi.fn());
const mockCompareRun = vi.hoisted(() => vi.fn());

vi.mock('@/lib/run/queries', () => ({ getRunWithTraces: mockGetRunWithTraces }));
vi.mock('@/lib/eval/evaluations', () => ({ getEvaluationsForRun: mockGetEvaluationsForRun }));
vi.mock('@/lib/eval/rubrics', () => ({ getRubric: mockGetRubric }));
vi.mock('@/lib/eval/failure-tags', () => ({ getFailureTagsForRun: mockGetFailureTagsForRun }));
vi.mock('@/lib/eval/scoring', () => ({
  buildScorecard: mockBuildScorecard,
  compareRun: mockCompareRun,
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const fakeRun = {
  id: 'run-000000000000000000',
  taskId: 'task-0000000000000000000',
  status: 'completed',
  ownerId: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const fakeTask = {
  id: 'task-0000000000000000000',
  name: 'Test Task',
  prompt: 'Do something.',
  domain: null,
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const fakeContestantA = {
  id: 'cont-aaaaaaaaaaaaaaaaaa',
  runId: 'run-000000000000000000',
  label: 'GPT-4o',
  model: 'gpt-4o',
  systemPrompt: null,
  contextBundle: null,
  createdAt: new Date(),
};

const fakeContestantB = {
  id: 'cont-bbbbbbbbbbbbbbbbbb',
  runId: 'run-000000000000000000',
  label: 'Claude',
  model: 'claude-sonnet-4-6',
  systemPrompt: null,
  contextBundle: null,
  createdAt: new Date(),
};

const fakeTraceA = {
  id: 'trace-aaaaaaaaaaaaaaaa',
  runId: 'run-000000000000000000',
  contestantId: 'cont-aaaaaaaaaaaaaaaaaa',
  status: 'completed',
  responseContent: 'Response A',
  messages: [],
  createdAt: new Date(),
};

const fakeTraceB = {
  id: 'trace-bbbbbbbbbbbbbbbb',
  runId: 'run-000000000000000000',
  contestantId: 'cont-bbbbbbbbbbbbbbbbbb',
  status: 'completed',
  responseContent: 'Response B',
  messages: [],
  createdAt: new Date(),
};

const fakeRunWithTraces = {
  ...fakeRun,
  task: fakeTask,
  contestants: [
    { ...fakeContestantA, trace: fakeTraceA },
    { ...fakeContestantB, trace: fakeTraceB },
  ],
};

const fakeRubric = {
  id: 'rubric-00000000000000',
  name: 'Test Rubric',
  description: 'A test rubric.',
  domain: null,
  criteria: [
    { name: 'quality', description: 'Quality of response', weight: 1.0, scale: { min: 1, max: 5 } },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const fakeEvaluationA = {
  id: 'eval-aaaaaaaaaaaaaaaa0',
  runId: 'run-000000000000000000',
  contestantId: 'cont-aaaaaaaaaaaaaaaaaa',
  rubricId: 'rubric-00000000000000',
  judgeModel: 'gpt-4o',
  scores: [{ criterionName: 'quality', score: 4, rationale: 'Good' }],
  overallScore: 0.75,
  rationale: 'Contestant A performed well overall.',
  rawJudgeResponse: null,
  reconciliation: null,
  inputTokens: null,
  outputTokens: null,
  latencyMs: null,
  createdAt: new Date('2026-03-30T10:00:00Z'),
};

const fakeEvaluationB = {
  id: 'eval-bbbbbbbbbbbbbbbb0',
  runId: 'run-000000000000000000',
  contestantId: 'cont-bbbbbbbbbbbbbbbbbb',
  rubricId: 'rubric-00000000000000',
  judgeModel: 'gpt-4o',
  scores: [{ criterionName: 'quality', score: 3, rationale: 'Adequate' }],
  overallScore: 0.5,
  rationale: 'Contestant B was adequate.',
  rawJudgeResponse: null,
  reconciliation: null,
  inputTokens: null,
  outputTokens: null,
  latencyMs: null,
  createdAt: new Date('2026-03-30T10:00:00Z'),
};

const fakeScorecardA = {
  runId: 'run-000000000000000000',
  contestantId: 'cont-aaaaaaaaaaaaaaaaaa',
  contestantLabel: 'GPT-4o',
  rubricName: 'Test Rubric',
  overallScore: 0.75,
  criterionScores: [
    { name: 'quality', score: 4, normalizedScore: 0.75, weight: 1.0, weightedScore: 0.75, rationale: 'Good' },
  ],
};

const fakeScorecardB = {
  runId: 'run-000000000000000000',
  contestantId: 'cont-bbbbbbbbbbbbbbbbbb',
  contestantLabel: 'Claude',
  rubricName: 'Test Rubric',
  overallScore: 0.5,
  criterionScores: [
    { name: 'quality', score: 3, normalizedScore: 0.5, weight: 1.0, weightedScore: 0.5, rationale: 'Adequate' },
  ],
};

const fakeComparison = {
  taskName: 'Test Task',
  rubricName: 'Test Rubric',
  contestants: [fakeScorecardA, fakeScorecardB],
  winner: { contestantId: 'cont-aaaaaaaaaaaaaaaaaa', label: 'GPT-4o', margin: 0.25 },
  criterionBreakdown: [
    {
      criterionName: 'quality',
      scores: [
        { contestantLabel: 'GPT-4o', score: 4 },
        { contestantLabel: 'Claude', score: 3 },
      ],
      winner: 'GPT-4o',
    },
  ],
};

const fakeFailureTag = {
  id: 'ftag-00000000000000000',
  runId: 'run-000000000000000000',
  contestantId: 'cont-bbbbbbbbbbbbbbbbbb',
  category: 'partial_answer',
  description: 'Missed key detail',
  source: 'judge',
  evaluationId: 'eval-bbbbbbbbbbbbbbbb0',
  createdAt: new Date(),
};

const fakeDb = {};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('assembleRunReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns report with evaluations when they exist', async () => {
    mockGetRunWithTraces.mockResolvedValue(fakeRunWithTraces);
    mockGetRubric.mockResolvedValue(fakeRubric);
    mockGetFailureTagsForRun.mockResolvedValue([]);
    mockGetEvaluationsForRun.mockResolvedValue([fakeEvaluationA, fakeEvaluationB]);
    mockBuildScorecard
      .mockReturnValueOnce(fakeScorecardA)
      .mockReturnValueOnce(fakeScorecardB);
    mockCompareRun.mockReturnValue(fakeComparison);

    const { assembleRunReport } = await import('@/lib/eval/report');
    const report = await assembleRunReport(
      fakeDb as never,
      'run-000000000000000000' as never,
      'rubric-00000000000000' as never,
    );

    expect(report).not.toBeNull();
    expect(report!.needsEvaluation).toBe(false);
    expect(report!.run.id).toBe('run-000000000000000000');
    expect(report!.task.name).toBe('Test Task');
    expect(report!.rubric.name).toBe('Test Rubric');
    expect(report!.contestants).toHaveLength(2);
    expect(report!.contestants[0]!.scorecard).toEqual(fakeScorecardA);
    expect(report!.contestants[1]!.scorecard).toEqual(fakeScorecardB);
    expect(report!.comparison).toEqual(fakeComparison);
    expect(report!.summary).toBe('Contestant A performed well overall.');
  });

  it('returns needsEvaluation=true when no evaluations exist', async () => {
    mockGetRunWithTraces.mockResolvedValue(fakeRunWithTraces);
    mockGetRubric.mockResolvedValue(fakeRubric);
    mockGetFailureTagsForRun.mockResolvedValue([]);
    mockGetEvaluationsForRun.mockResolvedValue([]);

    const { assembleRunReport } = await import('@/lib/eval/report');
    const report = await assembleRunReport(
      fakeDb as never,
      'run-000000000000000000' as never,
      'rubric-00000000000000' as never,
    );

    expect(report).not.toBeNull();
    expect(report!.needsEvaluation).toBe(true);
    expect(report!.contestants[0]!.scorecard).toBeNull();
    expect(report!.contestants[1]!.scorecard).toBeNull();
    expect(report!.comparison).toBeNull();
    expect(report!.summary).toBeNull();
  });

  it('includes failure tags per contestant', async () => {
    mockGetRunWithTraces.mockResolvedValue(fakeRunWithTraces);
    mockGetRubric.mockResolvedValue(fakeRubric);
    mockGetFailureTagsForRun.mockResolvedValue([fakeFailureTag]);
    mockGetEvaluationsForRun.mockResolvedValue([fakeEvaluationA, fakeEvaluationB]);
    mockBuildScorecard
      .mockReturnValueOnce(fakeScorecardA)
      .mockReturnValueOnce(fakeScorecardB);
    mockCompareRun.mockReturnValue(fakeComparison);

    const { assembleRunReport } = await import('@/lib/eval/report');
    const report = await assembleRunReport(
      fakeDb as never,
      'run-000000000000000000' as never,
      'rubric-00000000000000' as never,
    );

    expect(report).not.toBeNull();
    // Contestant A has no failure tags
    expect(report!.contestants[0]!.failureTags).toHaveLength(0);
    // Contestant B has the failure tag
    expect(report!.contestants[1]!.failureTags).toHaveLength(1);
    expect(report!.contestants[1]!.failureTags[0]!.category).toBe('partial_answer');
  });

  it('returns null comparison when unevaluated', async () => {
    mockGetRunWithTraces.mockResolvedValue(fakeRunWithTraces);
    mockGetRubric.mockResolvedValue(fakeRubric);
    mockGetFailureTagsForRun.mockResolvedValue([fakeFailureTag]);
    mockGetEvaluationsForRun.mockResolvedValue([]);

    const { assembleRunReport } = await import('@/lib/eval/report');
    const report = await assembleRunReport(
      fakeDb as never,
      'run-000000000000000000' as never,
      'rubric-00000000000000' as never,
    );

    expect(report).not.toBeNull();
    expect(report!.comparison).toBeNull();
    expect(report!.needsEvaluation).toBe(true);
    // Failure tags are still present even without evaluations
    expect(report!.contestants[1]!.failureTags).toHaveLength(1);
  });

  it('returns null when run does not exist', async () => {
    mockGetRunWithTraces.mockResolvedValue(null);

    const { assembleRunReport } = await import('@/lib/eval/report');
    const report = await assembleRunReport(
      fakeDb as never,
      'run-missing000000000000' as never,
      'rubric-00000000000000' as never,
    );

    expect(report).toBeNull();
  });

  it('returns null when rubric does not exist', async () => {
    mockGetRunWithTraces.mockResolvedValue(fakeRunWithTraces);
    mockGetRubric.mockResolvedValue(null);

    const { assembleRunReport } = await import('@/lib/eval/report');
    const report = await assembleRunReport(
      fakeDb as never,
      'run-000000000000000000' as never,
      'rubric-missing0000000' as never,
    );

    expect(report).toBeNull();
  });
});
