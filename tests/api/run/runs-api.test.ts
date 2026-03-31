import { describe, expect, it, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mockAuth = vi.hoisted(() => vi.fn().mockResolvedValue({ userId: 'user-1' }));
const mockRequireDb = vi.hoisted(() => vi.fn().mockReturnValue({}));
const mockCreateTask = vi.hoisted(() => vi.fn());
const mockCreateRun = vi.hoisted(() => vi.fn());
const mockAddContestant = vi.hoisted(() => vi.fn());
const mockListRuns = vi.hoisted(() => vi.fn());
const mockGetRunIfOwner = vi.hoisted(() => vi.fn());
const mockGetRunWithTraces = vi.hoisted(() => vi.fn());
const mockExecuteRun = vi.hoisted(() => vi.fn());

vi.mock('@clerk/nextjs/server', () => ({ auth: mockAuth }));
vi.mock('@/db', () => ({ requireDb: mockRequireDb }));
vi.mock('@/lib/run/tasks', () => ({ createTask: mockCreateTask }));
vi.mock('@/lib/run/runs', () => ({
  createRun: mockCreateRun,
  listRuns: mockListRuns,
  getRunIfOwner: mockGetRunIfOwner,
}));
vi.mock('@/lib/run/contestants', () => ({ addContestant: mockAddContestant }));
vi.mock('@/lib/run/queries', () => ({ getRunWithTraces: mockGetRunWithTraces }));
vi.mock('@/lib/run/engine', () => ({ executeRun: mockExecuteRun }));
vi.mock('@/lib/api-logging', () => ({
  withLogging: (_handler: (req: Request) => Promise<Response>, _name: string) => _handler,
}));
vi.mock('@/lib/anomaly', () => ({ checkAnomaly: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const fakeTask = {
  id: 'task-00000000000000000',
  name: 'Test task',
  prompt: 'Do something.',
};

const fakeRun = {
  id: 'run-000000000000000000',
  taskId: fakeTask.id,
  status: 'pending',
  ownerId: 'user-1',
  createdAt: new Date().toISOString(),
};

const fakeContestant1 = {
  id: 'cont-00000000000000000',
  runId: fakeRun.id,
  label: 'GPT-4o',
  model: 'gpt-4o',
};

const fakeContestant2 = {
  id: 'cont-11111111111111111',
  runId: fakeRun.id,
  label: 'Claude',
  model: 'claude-sonnet-4-6',
};

const validCreateBody = {
  task: { name: 'Test', prompt: 'Do something.' },
  contestants: [
    { label: 'GPT-4o', model: 'gpt-4o' },
    { label: 'Claude', model: 'claude-sonnet-4-6' },
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
// Tests -- POST /api/runs
// ---------------------------------------------------------------------------

describe('POST /api/runs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1' });
    mockCreateTask.mockResolvedValue(fakeTask);
    mockCreateRun.mockResolvedValue(fakeRun);
    mockAddContestant
      .mockResolvedValueOnce(fakeContestant1)
      .mockResolvedValueOnce(fakeContestant2);
  });

  it('creates a run with inline task and contestants (201)', async () => {
    const { POST } = await import('@/app/api/runs/route');
    const req = makeRequest('POST', 'http://localhost/api/runs', validCreateBody);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.id).toBe(fakeRun.id);
    expect(json.contestants).toHaveLength(2);
    expect(mockCreateTask).toHaveBeenCalledTimes(1);
    expect(mockAddContestant).toHaveBeenCalledTimes(2);
  });

  it('creates a run with taskId reference (201)', async () => {
    const { POST } = await import('@/app/api/runs/route');
    const body = {
      task: { taskId: 'task-0000000000000000' },
      contestants: validCreateBody.contestants,
    };
    const req = makeRequest('POST', 'http://localhost/api/runs', body);
    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(mockCreateTask).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated requests (401)', async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const { POST } = await import('@/app/api/runs/route');
    const req = makeRequest('POST', 'http://localhost/api/runs', validCreateBody);
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('rejects fewer than 2 contestants (400)', async () => {
    const { POST } = await import('@/app/api/runs/route');
    const body = {
      task: { name: 'Test', prompt: 'Do something.' },
      contestants: [{ label: 'Solo', model: 'gpt-4o' }],
    };
    const req = makeRequest('POST', 'http://localhost/api/runs', body);
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it('rejects empty task prompt (400)', async () => {
    const { POST } = await import('@/app/api/runs/route');
    const body = {
      task: { name: 'Test', prompt: '' },
      contestants: validCreateBody.contestants,
    };
    const req = makeRequest('POST', 'http://localhost/api/runs', body);
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Tests -- GET /api/runs
// ---------------------------------------------------------------------------

describe('GET /api/runs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1' });
    mockListRuns.mockResolvedValue([fakeRun]);
  });

  it('returns list of runs (200)', async () => {
    const { GET } = await import('@/app/api/runs/route');
    const req = makeRequest('GET', 'http://localhost/api/runs');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toHaveLength(1);
    expect(json[0].id).toBe(fakeRun.id);
  });

  it('passes status filter', async () => {
    const { GET } = await import('@/app/api/runs/route');
    const req = makeRequest('GET', 'http://localhost/api/runs?status=completed');
    await GET(req);

    expect(mockListRuns).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'completed' }),
    );
  });

  it('clamps limit to 100', async () => {
    const { GET } = await import('@/app/api/runs/route');
    const req = makeRequest('GET', 'http://localhost/api/runs?limit=500');
    await GET(req);

    expect(mockListRuns).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ limit: 100 }),
    );
  });
});

// ---------------------------------------------------------------------------
// Tests -- GET /api/runs/:id
// ---------------------------------------------------------------------------

describe('GET /api/runs/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1' });
    mockGetRunIfOwner.mockResolvedValue(fakeRun);
  });

  it('returns run with traces (200)', async () => {
    const fullRun = { ...fakeRun, task: fakeTask, contestants: [] };
    mockGetRunWithTraces.mockResolvedValue(fullRun);

    const { GET } = await import('@/app/api/runs/[id]/route');
    const req = makeRequest('GET', 'http://localhost/api/runs/run-000000000000000000');
    const res = await GET(req, { params: Promise.resolve({ id: 'run-000000000000000000' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.id).toBe(fakeRun.id);
    expect(json.task).toBeDefined();
  });

  it('returns 404 for missing run', async () => {
    mockGetRunIfOwner.mockResolvedValue(null);
    mockGetRunWithTraces.mockResolvedValue(null);

    const { GET } = await import('@/app/api/runs/[id]/route');
    const req = makeRequest('GET', 'http://localhost/api/runs/nonexistent');
    const res = await GET(req, { params: Promise.resolve({ id: 'nonexistent' }) });

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Tests -- POST /api/runs/:id/execute
// ---------------------------------------------------------------------------

describe('POST /api/runs/:id/execute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1' });
    mockGetRunIfOwner.mockResolvedValue(fakeRun);
  });

  it('executes a pending run (200)', async () => {
    const executedRun = { ...fakeRun, status: 'completed', task: fakeTask, contestants: [] };
    mockExecuteRun.mockResolvedValue(executedRun);

    const { POST } = await import('@/app/api/runs/[id]/execute/route');
    const req = makeRequest('POST', 'http://localhost/api/runs/run-000/execute');
    const res = await POST(req, { params: Promise.resolve({ id: 'run-000' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe('completed');
  });

  it('rejects unauthenticated requests (401)', async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const { POST } = await import('@/app/api/runs/[id]/execute/route');
    const req = makeRequest('POST', 'http://localhost/api/runs/run-000/execute');
    const res = await POST(req, { params: Promise.resolve({ id: 'run-000' }) });

    expect(res.status).toBe(401);
  });

  it('returns 404 for missing run', async () => {
    mockGetRunIfOwner.mockResolvedValue(null);

    const { POST } = await import('@/app/api/runs/[id]/execute/route');
    const req = makeRequest('POST', 'http://localhost/api/runs/run-000/execute');
    const res = await POST(req, { params: Promise.resolve({ id: 'run-000' }) });

    expect(res.status).toBe(404);
  });

  it('returns 409 for non-pending run', async () => {
    mockExecuteRun.mockRejectedValue(new Error('Run run-000 is completed, expected pending'));

    const { POST } = await import('@/app/api/runs/[id]/execute/route');
    const req = makeRequest('POST', 'http://localhost/api/runs/run-000/execute');
    const res = await POST(req, { params: Promise.resolve({ id: 'run-000' }) });

    expect(res.status).toBe(409);
  });
});
