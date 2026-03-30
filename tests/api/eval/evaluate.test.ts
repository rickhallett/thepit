import { describe, expect, it, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mockAuth = vi.hoisted(() => vi.fn().mockResolvedValue({ userId: 'user-1' }));
const mockRequireDb = vi.hoisted(() => vi.fn().mockReturnValue({}));
const mockEvaluateRun = vi.hoisted(() => vi.fn());

vi.mock('@clerk/nextjs/server', () => ({ auth: mockAuth }));
vi.mock('@/db', () => ({ requireDb: mockRequireDb }));
vi.mock('@/lib/eval/judge', () => ({ evaluateRun: mockEvaluateRun }));
vi.mock('@/lib/logger', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const fakeEvaluation = {
  id: 'eval-00000000000000000',
  runId: 'run-000000000000000000',
  contestantId: 'cont-00000000000000000',
  rubricId: 'rubric-00000000000000',
  judgeModel: 'gpt-4o',
  scores: [
    { criterionName: 'relevance', score: 4, rationale: 'Good' },
  ],
  overallScore: 0.75,
  rationale: 'Decent overall.',
  rawJudgeResponse: null,
  reconciliation: null,
  inputTokens: 200,
  outputTokens: 100,
  latencyMs: 500,
  createdAt: new Date().toISOString(),
};

const validBody = {
  rubricId: 'rubric-00000000000000',
};

function makeRequest(method: string, url: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/runs/:id/evaluate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1' });
    mockEvaluateRun.mockResolvedValue([fakeEvaluation]);
  });

  it('returns evaluations (200)', async () => {
    const { POST } = await import('@/app/api/runs/[id]/evaluate/route');
    const req = makeRequest('POST', 'http://localhost/api/runs/run-000/evaluate', validBody);
    const res = await POST(req, { params: Promise.resolve({ id: 'run-000' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toHaveLength(1);
    expect(json[0].id).toBe(fakeEvaluation.id);
  });

  it('rejects unauthenticated (401)', async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const { POST } = await import('@/app/api/runs/[id]/evaluate/route');
    const req = makeRequest('POST', 'http://localhost/api/runs/run-000/evaluate', validBody);
    const res = await POST(req, { params: Promise.resolve({ id: 'run-000' }) });

    expect(res.status).toBe(401);
  });

  it('returns 404 for missing run', async () => {
    mockEvaluateRun.mockRejectedValue(new Error('Run not found: run-000'));

    const { POST } = await import('@/app/api/runs/[id]/evaluate/route');
    const req = makeRequest('POST', 'http://localhost/api/runs/run-000/evaluate', validBody);
    const res = await POST(req, { params: Promise.resolve({ id: 'run-000' }) });

    expect(res.status).toBe(404);
  });

  it('returns 409 for non-terminal run', async () => {
    mockEvaluateRun.mockRejectedValue(
      new Error('Run run-000 is pending, expected completed or failed'),
    );

    const { POST } = await import('@/app/api/runs/[id]/evaluate/route');
    const req = makeRequest('POST', 'http://localhost/api/runs/run-000/evaluate', validBody);
    const res = await POST(req, { params: Promise.resolve({ id: 'run-000' }) });

    expect(res.status).toBe(409);
  });

  it('rejects invalid body (400)', async () => {
    const { POST } = await import('@/app/api/runs/[id]/evaluate/route');
    const req = makeRequest('POST', 'http://localhost/api/runs/run-000/evaluate', { rubricId: 'short' });
    const res = await POST(req, { params: Promise.resolve({ id: 'run-000' }) });

    expect(res.status).toBe(400);
  });
});
