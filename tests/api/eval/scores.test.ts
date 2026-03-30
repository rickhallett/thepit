import { describe, expect, it, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mockRequireDb = vi.hoisted(() => vi.fn().mockReturnValue({}));
const mockGetRunWithTraces = vi.hoisted(() => vi.fn());
const mockGetEvaluationsForRun = vi.hoisted(() => vi.fn());
const mockGetRubric = vi.hoisted(() => vi.fn());
const mockBuildScorecard = vi.hoisted(() => vi.fn());
const mockCompareRun = vi.hoisted(() => vi.fn());

vi.mock('@/db', () => ({ requireDb: mockRequireDb }));
vi.mock('@/lib/run/queries', () => ({ getRunWithTraces: mockGetRunWithTraces }));
vi.mock('@/lib/eval/evaluations', () => ({ getEvaluationsForRun: mockGetEvaluationsForRun }));
vi.mock('@/lib/eval/rubrics', () => ({ getRubric: mockGetRubric }));
vi.mock('@/lib/eval/scoring', () => ({
  buildScorecard: mockBuildScorecard,
  compareRun: mockCompareRun,
}));
vi.mock('@/lib/logger', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('@/lib/api-logging', () => ({
  withLogging: (_handler: (req: Request) => Promise<Response>, _name: string) => _handler,
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const fakeRun = {
  id: 'run-000000000000000000',
  taskId: 'task-0000000000000000000',
  status: 'completed',
  task: { id: 'task-0000000000000000000', name: 'Test Task' },
  contestants: [
    { id: 'cont-a', label: 'GPT-4o' },
    { id: 'cont-b', label: 'Claude' },
  ],
};

const fakeEvaluation = {
  id: 'eval-00000000000000000',
  runId: 'run-000000000000000000',
  contestantId: 'cont-a',
  rubricId: 'rubric-00000000000000',
  judgeModel: 'gpt-4o',
  scores: [{ criterionName: 'quality', score: 4, rationale: 'Good' }],
  overallScore: 0.75,
  rationale: 'Overall.',
  rawJudgeResponse: null,
  reconciliation: null,
  inputTokens: null,
  outputTokens: null,
  latencyMs: null,
  createdAt: new Date(),
};

const fakeRubric = {
  id: 'rubric-00000000000000',
  name: 'Test Rubric',
  criteria: [{ name: 'quality', weight: 1.0, scale: { min: 1, max: 5 } }],
};

const fakeScorecard = {
  runId: 'run-000000000000000000',
  contestantId: 'cont-a',
  contestantLabel: 'GPT-4o',
  rubricName: 'Test Rubric',
  overallScore: 0.75,
  criterionScores: [],
};

const fakeComparison = {
  taskName: 'Test Task',
  rubricName: 'Test Rubric',
  contestants: [fakeScorecard],
  winner: { contestantId: 'cont-a', label: 'GPT-4o', margin: 0.25 },
  criterionBreakdown: [],
};

function makeRequest(method: string, url: string): Request {
  return new Request(url, { method });
}

// ---------------------------------------------------------------------------
// Tests -- GET /api/runs/:id/scores
// ---------------------------------------------------------------------------

describe('GET /api/runs/:id/scores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRunWithTraces.mockResolvedValue(fakeRun);
    mockGetEvaluationsForRun.mockResolvedValue([fakeEvaluation]);
    mockGetRubric.mockResolvedValue(fakeRubric);
    mockBuildScorecard.mockReturnValue(fakeScorecard);
  });

  it('returns scorecards (200)', async () => {
    const { GET } = await import('@/app/api/runs/[id]/scores/route');
    const req = makeRequest('GET', 'http://localhost/api/runs/run-000/scores');
    const res = await GET(req, { params: Promise.resolve({ id: 'run-000' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toHaveLength(1);
    expect(json[0].contestantLabel).toBe('GPT-4o');
  });

  it('returns 404 for missing run', async () => {
    mockGetRunWithTraces.mockResolvedValue(null);

    const { GET } = await import('@/app/api/runs/[id]/scores/route');
    const req = makeRequest('GET', 'http://localhost/api/runs/missing/scores');
    const res = await GET(req, { params: Promise.resolve({ id: 'missing' }) });

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Tests -- GET /api/comparisons
// ---------------------------------------------------------------------------

describe('GET /api/comparisons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRunWithTraces.mockResolvedValue(fakeRun);
    mockGetEvaluationsForRun.mockResolvedValue([fakeEvaluation]);
    mockGetRubric.mockResolvedValue(fakeRubric);
    mockCompareRun.mockReturnValue(fakeComparison);
  });

  it('returns comparison (200)', async () => {
    const { GET } = await import('@/app/api/comparisons/route');
    const req = makeRequest('GET', 'http://localhost/api/comparisons?runId=run-000&rubricId=rubric-00000000000000');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.taskName).toBe('Test Task');
    expect(json.winner.contestantId).toBe('cont-a');
  });

  it('requires runId and rubricId (400)', async () => {
    const { GET } = await import('@/app/api/comparisons/route');
    const req = makeRequest('GET', 'http://localhost/api/comparisons');
    const res = await GET(req);

    expect(res.status).toBe(400);
  });

  it('requires rubricId (400)', async () => {
    const { GET } = await import('@/app/api/comparisons/route');
    const req = makeRequest('GET', 'http://localhost/api/comparisons?runId=run-000');
    const res = await GET(req);

    expect(res.status).toBe(400);
  });
});
