import { describe, expect, it, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mockAuth = vi.hoisted(() => vi.fn().mockResolvedValue({ userId: 'user-1' }));
const mockRequireDb = vi.hoisted(() => vi.fn().mockReturnValue({}));
const mockCreateRubric = vi.hoisted(() => vi.fn());
const mockListRubrics = vi.hoisted(() => vi.fn());
const mockGetRubric = vi.hoisted(() => vi.fn());

vi.mock('@clerk/nextjs/server', () => ({ auth: mockAuth }));
vi.mock('@/db', () => ({ requireDb: mockRequireDb }));
vi.mock('@/lib/eval/rubrics', () => ({
  createRubric: mockCreateRubric,
  listRubrics: mockListRubrics,
  getRubric: mockGetRubric,
}));
vi.mock('@/lib/api-logging', () => ({
  withLogging: (_handler: (req: Request) => Promise<Response>, _name: string) => _handler,
}));
vi.mock('@/lib/logger', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const fakeRubric = {
  id: 'rubric-000000000000000',
  name: 'Test Rubric',
  description: 'A rubric for testing',
  domain: 'test',
  criteria: [
    {
      name: 'quality',
      description: 'How good',
      weight: 1.0,
      scale: { min: 1, max: 5 },
    },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const validCreateBody = {
  name: 'Test Rubric',
  description: 'A rubric for testing',
  domain: 'test',
  criteria: [
    {
      name: 'quality',
      description: 'How good',
      weight: 1.0,
      scale: { min: 1, max: 5 },
    },
  ],
};

function makeRequest(method: string, url: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ---------------------------------------------------------------------------
// Tests -- POST /api/rubrics
// ---------------------------------------------------------------------------

describe('POST /api/rubrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1' });
    mockCreateRubric.mockResolvedValue(fakeRubric);
  });

  it('creates rubric (201)', async () => {
    const { POST } = await import('@/app/api/rubrics/route');
    const req = makeRequest('POST', 'http://localhost/api/rubrics', validCreateBody);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.id).toBe(fakeRubric.id);
    expect(mockCreateRubric).toHaveBeenCalledTimes(1);
  });

  it('rejects unauthenticated (401)', async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const { POST } = await import('@/app/api/rubrics/route');
    const req = makeRequest('POST', 'http://localhost/api/rubrics', validCreateBody);
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('rejects invalid body (400)', async () => {
    const { POST } = await import('@/app/api/rubrics/route');
    const req = makeRequest('POST', 'http://localhost/api/rubrics', { name: '' });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Tests -- GET /api/rubrics
// ---------------------------------------------------------------------------

describe('GET /api/rubrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListRubrics.mockResolvedValue([fakeRubric]);
  });

  it('returns list (200)', async () => {
    const { GET } = await import('@/app/api/rubrics/route');
    const req = makeRequest('GET', 'http://localhost/api/rubrics');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toHaveLength(1);
    expect(json[0].id).toBe(fakeRubric.id);
  });

  it('passes domain filter', async () => {
    const { GET } = await import('@/app/api/rubrics/route');
    const req = makeRequest('GET', 'http://localhost/api/rubrics?domain=test');
    await GET(req);

    expect(mockListRubrics).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ domain: 'test' }),
    );
  });
});

// ---------------------------------------------------------------------------
// Tests -- GET /api/rubrics/:id
// ---------------------------------------------------------------------------

describe('GET /api/rubrics/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns rubric (200)', async () => {
    mockGetRubric.mockResolvedValue(fakeRubric);

    const { GET } = await import('@/app/api/rubrics/[id]/route');
    const req = makeRequest('GET', 'http://localhost/api/rubrics/rubric-000000000000000');
    const res = await GET(req, { params: Promise.resolve({ id: 'rubric-000000000000000' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.id).toBe(fakeRubric.id);
  });

  it('returns 404 for missing rubric', async () => {
    mockGetRubric.mockResolvedValue(null);

    const { GET } = await import('@/app/api/rubrics/[id]/route');
    const req = makeRequest('GET', 'http://localhost/api/rubrics/nonexistent-00000000');
    const res = await GET(req, { params: Promise.resolve({ id: 'nonexistent-00000000' }) });

    expect(res.status).toBe(404);
  });
});
