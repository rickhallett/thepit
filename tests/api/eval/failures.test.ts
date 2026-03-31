import { describe, expect, it, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mockAuth = vi.hoisted(() => vi.fn().mockResolvedValue({ userId: 'user-1' }));
const mockRequireDb = vi.hoisted(() => vi.fn().mockReturnValue({}));
const mockAddFailureTag = vi.hoisted(() => vi.fn());
const mockGetFailureTagsForRun = vi.hoisted(() => vi.fn());
const mockGetRunIfOwner = vi.hoisted(() => vi.fn());

vi.mock('@clerk/nextjs/server', () => ({ auth: mockAuth }));
vi.mock('@/db', () => ({ requireDb: mockRequireDb }));
vi.mock('@/lib/eval/failure-tags', () => ({
  addFailureTag: mockAddFailureTag,
  getFailureTagsForRun: mockGetFailureTagsForRun,
}));
vi.mock('@/lib/run/runs', () => ({ getRunIfOwner: mockGetRunIfOwner }));
vi.mock('@/lib/logger', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const fakeTag = {
  id: 'ftag-00000000000000000',
  runId: 'run-000000000000000000',
  contestantId: 'cont-0000000000000000',
  category: 'wrong_answer',
  description: 'Incorrect output',
  source: 'manual',
  evaluationId: null,
  createdAt: new Date().toISOString(),
};

const validBody = {
  contestantId: 'cont-0000000000000000',
  category: 'wrong_answer',
  description: 'Incorrect output',
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

const fakeRun = { id: 'run-000000000000000000', ownerId: 'user-1', status: 'completed' };

describe('POST /api/runs/:id/failures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1' });
    mockGetRunIfOwner.mockResolvedValue(fakeRun);
    mockAddFailureTag.mockResolvedValue(fakeTag);
  });

  it('creates tag (201)', async () => {
    const { POST } = await import('@/app/api/runs/[id]/failures/route');
    const req = makeRequest('POST', 'http://localhost/api/runs/run-000/failures', validBody);
    const res = await POST(req, { params: Promise.resolve({ id: 'run-000' }) });
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.id).toBe(fakeTag.id);
    expect(json.category).toBe('wrong_answer');
    expect(json.source).toBe('manual');
  });

  it('validates category enum (400)', async () => {
    const { POST } = await import('@/app/api/runs/[id]/failures/route');
    const req = makeRequest('POST', 'http://localhost/api/runs/run-000/failures', {
      contestantId: 'cont-0000000000000000',
      category: 'nonexistent_category',
    });
    const res = await POST(req, { params: Promise.resolve({ id: 'run-000' }) });

    expect(res.status).toBe(400);
  });

  it('rejects unauthenticated (401)', async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const { POST } = await import('@/app/api/runs/[id]/failures/route');
    const req = makeRequest('POST', 'http://localhost/api/runs/run-000/failures', validBody);
    const res = await POST(req, { params: Promise.resolve({ id: 'run-000' }) });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/runs/:id/failures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1' });
    mockGetRunIfOwner.mockResolvedValue(fakeRun);
    mockGetFailureTagsForRun.mockResolvedValue([fakeTag]);
  });

  it('returns tags (200)', async () => {
    const { GET } = await import('@/app/api/runs/[id]/failures/route');
    const req = makeRequest('GET', 'http://localhost/api/runs/run-000/failures');
    const res = await GET(req, { params: Promise.resolve({ id: 'run-000' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toHaveLength(1);
    expect(json[0].category).toBe('wrong_answer');
  });
});
