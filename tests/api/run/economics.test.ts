import { describe, expect, it, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mockRequireDb = vi.hoisted(() => vi.fn().mockReturnValue({}));
const mockGetRunEconomics = vi.hoisted(() => vi.fn());

vi.mock('@/db', () => ({ requireDb: mockRequireDb }));
vi.mock('@/lib/run/economics', () => ({ getRunEconomics: mockGetRunEconomics }));
vi.mock('@/lib/logger', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const RUN_ID = 'run-000000000000000000';
const CONTESTANT_A = 'cont-AAAAAAAAAAAAAAAAAAA';
const CONTESTANT_B = 'cont-BBBBBBBBBBBBBBBBBBB';

const fakeEconomics = {
  runId: RUN_ID,
  totalCostMicro: 8000,
  totalTokens: 2700,
  totalLatencyMs: 2000,
  contestants: [
    {
      contestantId: CONTESTANT_A,
      label: 'GPT-4o',
      model: 'gpt-4o',
      costMicro: 5000,
      inputTokens: 1000,
      outputTokens: 500,
      latencyMs: 1200,
      overallScore: 0.85,
      scorePerDollar: 170,
      scorePerSecond: 0.7083,
    },
    {
      contestantId: CONTESTANT_B,
      label: 'Gemini Flash',
      model: 'gemini-2.0-flash',
      costMicro: 3000,
      inputTokens: 800,
      outputTokens: 400,
      latencyMs: 800,
      overallScore: 0.72,
      scorePerDollar: 240,
      scorePerSecond: 0.9,
    },
  ],
  cheapestContestant: CONTESTANT_B,
  fastestContestant: CONTESTANT_B,
  bestValueContestant: CONTESTANT_B,
};

function makeRequest(method: string, url: string): Request {
  return new Request(url, { method });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/runs/:id/economics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns economics (200)', async () => {
    mockGetRunEconomics.mockResolvedValue(fakeEconomics);

    const { GET } = await import('@/app/api/runs/[id]/economics/route');
    const req = makeRequest('GET', `http://localhost/api/runs/${RUN_ID}/economics`);
    const res = await GET(req, { params: Promise.resolve({ id: RUN_ID }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.runId).toBe(RUN_ID);
    expect(json.totalCostMicro).toBe(8000);
    expect(json.contestants).toHaveLength(2);
    expect(json.cheapestContestant).toBe(CONTESTANT_B);
    expect(json.bestValueContestant).toBe(CONTESTANT_B);
  });

  it('returns 404 for missing run', async () => {
    mockGetRunEconomics.mockResolvedValue(null);

    const { GET } = await import('@/app/api/runs/[id]/economics/route');
    const req = makeRequest('GET', 'http://localhost/api/runs/nonexistent/economics');
    const res = await GET(req, { params: Promise.resolve({ id: 'nonexistent' }) });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe('Run not found');
  });
});
