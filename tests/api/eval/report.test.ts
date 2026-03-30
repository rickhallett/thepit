import { describe, expect, it, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mockRequireDb = vi.hoisted(() => vi.fn().mockReturnValue({}));
const mockAssembleRunReport = vi.hoisted(() => vi.fn());

vi.mock('@/db', () => ({ requireDb: mockRequireDb }));
vi.mock('@/lib/eval/report', () => ({ assembleRunReport: mockAssembleRunReport }));
vi.mock('@/lib/logger', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const fakeReport = {
  run: {
    id: 'run-000000000000000000',
    taskId: 'task-0000000000000000000',
    status: 'completed',
    ownerId: 'user-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  task: {
    id: 'task-0000000000000000000',
    name: 'Test Task',
    prompt: 'Do something.',
  },
  rubric: {
    id: 'rubric-00000000000000',
    name: 'Test Rubric',
    criteria: [{ name: 'quality', weight: 1.0, scale: { min: 1, max: 5 } }],
  },
  needsEvaluation: false,
  contestants: [
    {
      contestant: { id: 'cont-a', label: 'GPT-4o' },
      trace: { id: 'trace-a', responseContent: 'Response' },
      scorecard: { overallScore: 0.75 },
      failureTags: [],
    },
  ],
  comparison: {
    taskName: 'Test Task',
    rubricName: 'Test Rubric',
    contestants: [],
    winner: { contestantId: 'cont-a', label: 'GPT-4o', margin: 0.25 },
    criterionBreakdown: [],
  },
  summary: 'Contestant A performed well.',
};

function makeRequest(method: string, url: string): Request {
  return new Request(url, { method });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/runs/:id/report', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssembleRunReport.mockResolvedValue(fakeReport);
  });

  it('returns report (200)', async () => {
    const { GET } = await import('@/app/api/runs/[id]/report/route');
    const req = makeRequest(
      'GET',
      'http://localhost/api/runs/run-000/report?rubricId=rubric-00000000000000',
    );
    const res = await GET(req, { params: Promise.resolve({ id: 'run-000' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.run.id).toBe('run-000000000000000000');
    expect(json.needsEvaluation).toBe(false);
    expect(json.comparison.winner.contestantId).toBe('cont-a');
    expect(json.summary).toBe('Contestant A performed well.');
  });

  it('requires rubricId query param (400)', async () => {
    const { GET } = await import('@/app/api/runs/[id]/report/route');
    const req = makeRequest(
      'GET',
      'http://localhost/api/runs/run-000/report',
    );
    const res = await GET(req, { params: Promise.resolve({ id: 'run-000' }) });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('rubricId');
  });

  it('returns 404 for missing run', async () => {
    mockAssembleRunReport.mockResolvedValue(null);

    const { GET } = await import('@/app/api/runs/[id]/report/route');
    const req = makeRequest(
      'GET',
      'http://localhost/api/runs/missing/report?rubricId=rubric-00000000000000',
    );
    const res = await GET(req, { params: Promise.resolve({ id: 'missing' }) });

    expect(res.status).toBe(404);
  });
});
