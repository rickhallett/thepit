import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks — these run before any import resolves.
// ---------------------------------------------------------------------------

const {
  mockDb,
  authMock,
  getPresetByIdMock,
  streamTextMock,
  createUIMessageStreamMock,
  createUIMessageStreamResponseMock,
  preauthorizeCreditsMock,
  settleCreditsMock,
  applyCreditDeltaMock,
  estimateBoutCostGbpMock,
  computeCostGbpMock,
  toMicroCreditsMock,
  estimateTokensFromTextMock,
} = vi.hoisted(() => {
  const db = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  };
  return {
    mockDb: db,
    authMock: vi.fn(),
    getPresetByIdMock: vi.fn(),
    streamTextMock: vi.fn(),
    createUIMessageStreamMock: vi.fn(),
    createUIMessageStreamResponseMock: vi.fn(),
    preauthorizeCreditsMock: vi.fn(),
    settleCreditsMock: vi.fn(),
    applyCreditDeltaMock: vi.fn(),
    estimateBoutCostGbpMock: vi.fn(),
    computeCostGbpMock: vi.fn(),
    toMicroCreditsMock: vi.fn(),
    estimateTokensFromTextMock: vi.fn(),
  };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@/db', () => ({ requireDb: () => mockDb }));

vi.mock('@/db/schema', () => ({
  bouts: {
    id: 'id',
    status: 'status',
    presetId: 'preset_id',
    transcript: 'transcript',
    topic: 'topic',
    responseLength: 'response_length',
    responseFormat: 'response_format',
    agentLineup: 'agent_lineup',
    ownerId: 'owner_id',
    updatedAt: 'updated_at',
    shareLine: 'share_line',
    shareGeneratedAt: 'share_generated_at',
    createdAt: 'created_at',
  },
}));

vi.mock('@clerk/nextjs/server', () => ({ auth: authMock }));

vi.mock('@/lib/tier', () => ({
  SUBSCRIPTIONS_ENABLED: false,
  getUserTier: vi.fn(),
  canRunBout: vi.fn(),
  canAccessModel: vi.fn(),
  incrementFreeBoutsUsed: vi.fn(),
}));

vi.mock('@/lib/free-bout-pool', () => ({
  consumeFreeBout: vi.fn(),
}));

vi.mock('@/lib/ai', () => ({
  FREE_MODEL_ID: 'claude-haiku-4-5-20251001',
  PREMIUM_MODEL_OPTIONS: [
    'claude-sonnet-4-5-20250929',
    'claude-opus-4-5-20251101',
  ],
  DEFAULT_PREMIUM_MODEL_ID: 'claude-sonnet-4-5-20250929',
  getModel: vi.fn(() => 'mock-model'),
}));

vi.mock('@/lib/presets', () => ({
  getPresetById: getPresetByIdMock,
  ARENA_PRESET_ID: 'arena',
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({
    success: true,
    remaining: 4,
    resetAt: Date.now() + 3600000,
  })),
  getClientIdentifier: vi.fn(() => 'test-ip'),
}));

vi.mock('@/lib/credits', () => ({
  CREDITS_ENABLED: true,
  BYOK_ENABLED: false,
  applyCreditDelta: applyCreditDeltaMock,
  computeCostGbp: computeCostGbpMock,
  estimateBoutCostGbp: estimateBoutCostGbpMock,
  estimateTokensFromText: estimateTokensFromTextMock,
  preauthorizeCredits: preauthorizeCreditsMock,
  settleCredits: settleCreditsMock,
  toMicroCredits: toMicroCreditsMock,
}));

vi.mock('@/lib/response-lengths', () => ({
  resolveResponseLength: vi.fn(() => ({
    id: 'standard',
    label: 'Standard',
    hint: '3-5 sentences',
    maxOutputTokens: 200,
    outputTokensPerTurn: 120,
  })),
}));

vi.mock('@/lib/response-formats', () => ({
  resolveResponseFormat: vi.fn(() => ({
    id: 'markdown',
    label: 'Markdown',
    hint: 'rich formatting',
    instruction: 'Respond in Markdown.',
  })),
}));

vi.mock('@/app/api/byok-stash/route', () => ({
  readAndClearByokKey: vi.fn(() => null),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(() => null),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

vi.mock('ai', () => ({
  streamText: streamTextMock,
  createUIMessageStream: createUIMessageStreamMock,
  createUIMessageStreamResponse: createUIMessageStreamResponseMock,
}));

// ---------------------------------------------------------------------------
// SUT
// ---------------------------------------------------------------------------

import { POST } from '@/app/api/run-bout/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MINIMAL_PRESET = {
  id: 'darwin-special',
  name: 'Test',
  agents: [
    { id: 'a1', name: 'Agent1', systemPrompt: 'test', color: '#fff' },
  ],
  maxTurns: 2,
  tier: 'free' as const,
};

const makeRequest = (body: Record<string, unknown>) =>
  new Request('http://localhost/api/run-bout', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });

const setupDbSelect = () => {
  mockDb.select.mockImplementation(() => ({
    from: () => ({
      where: () => ({
        limit: async () => [
          { status: 'running', presetId: 'darwin-special', transcript: [] },
        ],
      }),
    }),
  }));
};

const setupDbInsert = () => {
  mockDb.insert.mockImplementation(() => ({
    values: () => ({
      onConflictDoNothing: async () => ({}),
    }),
  }));
};

const setupDbUpdate = () => {
  mockDb.update.mockImplementation(() => ({
    set: () => ({
      where: async () => ({}),
    }),
  }));
};

const setupStreamMocks = () => {
  createUIMessageStreamMock.mockImplementation(
    ({ execute }: { execute: (opts: unknown) => Promise<void> }) => {
      const mockWriter = { write: vi.fn() };
      execute({ writer: mockWriter }).catch(() => {});
      return 'mock-stream';
    },
  );
  createUIMessageStreamResponseMock.mockReturnValue(
    new Response('stream', { status: 200 }),
  );
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('run-bout credit flow (CREDITS_ENABLED=true)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: 'user-1' });
    getPresetByIdMock.mockReturnValue(MINIMAL_PRESET);
    setupDbSelect();
    setupDbInsert();
    setupDbUpdate();
    setupStreamMocks();
    estimateBoutCostGbpMock.mockReturnValue(0.005);
    toMicroCreditsMock.mockReturnValue(5000);
    computeCostGbpMock.mockReturnValue(0.003);
    estimateTokensFromTextMock.mockReturnValue(0);
    preauthorizeCreditsMock.mockResolvedValue({ success: true });
    settleCreditsMock.mockResolvedValue({});
    applyCreditDeltaMock.mockResolvedValue({});
    streamTextMock.mockReturnValue({
      textStream: (async function* () {
        yield 'hello';
      })(),
      usage: Promise.resolve({ inputTokens: 10, outputTokens: 20 }),
    });
  });

  // -------------------------------------------------------------------------
  // 1. No userId + credits enabled → 401
  // -------------------------------------------------------------------------
  it('returns 401 when CREDITS_ENABLED and no userId', async () => {
    authMock.mockResolvedValue({ userId: null });

    const res = await POST(
      makeRequest({ boutId: 'b1', presetId: 'darwin-special' }),
    );
    expect(res.status).toBe(401);
    expect(await res.text()).toBe('Sign in required.');
  });

  // -------------------------------------------------------------------------
  // 2. Preauthorization fails → 402
  // -------------------------------------------------------------------------
  it('returns 402 when preauthorizeCredits fails', async () => {
    preauthorizeCreditsMock.mockResolvedValue({ success: false });

    const res = await POST(
      makeRequest({ boutId: 'b2', presetId: 'darwin-special' }),
    );
    expect(res.status).toBe(402);
    expect(await res.text()).toBe('Insufficient credits.');
  });

  // -------------------------------------------------------------------------
  // 3. Preauthorization is called with correct args
  // -------------------------------------------------------------------------
  it('calls preauthorizeCredits with estimated cost', async () => {
    estimateBoutCostGbpMock.mockReturnValue(0.01);
    toMicroCreditsMock.mockReturnValue(10000);

    const res = await POST(
      makeRequest({ boutId: 'b3', presetId: 'darwin-special' }),
    );
    expect(res.status).toBe(200);
    expect(preauthorizeCreditsMock).toHaveBeenCalledWith(
      'user-1',
      10000,
      'preauth',
      expect.objectContaining({
        presetId: 'darwin-special',
        boutId: 'b3',
        estimatedCostGbp: 0.01,
        referenceId: 'b3',
      }),
    );
  });

  // -------------------------------------------------------------------------
  // 4. Settlement on success: settleCredits called with delta
  // -------------------------------------------------------------------------
  it('calls settleCredits with delta on successful bout', async () => {
    toMicroCreditsMock
      .mockReturnValueOnce(5000)   // preauth
      .mockReturnValueOnce(3000);  // actual
    computeCostGbpMock.mockReturnValue(0.003);

    // Ensure the stream completes the execute callback synchronously
    // so we can check settleCredits afterward
    let resolveExecute: () => void;
    const executePromise = new Promise<void>((r) => { resolveExecute = r; });

    streamTextMock.mockReturnValue({
      textStream: (async function* () {
        yield 'turn-text';
      })(),
      usage: Promise.resolve({ inputTokens: 10, outputTokens: 20 }),
    });

    createUIMessageStreamMock.mockImplementation(
      ({ execute }: { execute: (opts: unknown) => Promise<void> }) => {
        const mockWriter = { write: vi.fn() };
        execute({ writer: mockWriter }).then(() => resolveExecute!()).catch(() => resolveExecute!());
        return 'mock-stream';
      },
    );

    const res = await POST(
      makeRequest({ boutId: 'b4', presetId: 'darwin-special' }),
    );
    expect(res.status).toBe(200);

    // Wait for the async execute to finish
    await executePromise;

    // delta = actualMicro - preauthMicro = 3000 - 5000 = -2000
    expect(settleCreditsMock).toHaveBeenCalledWith(
      'user-1',
      -2000,
      'settlement',
      expect.objectContaining({
        boutId: 'b4',
        inputTokens: expect.any(Number),
        outputTokens: expect.any(Number),
        preauthMicro: 5000,
        referenceId: 'b4',
      }),
    );
  });

  // -------------------------------------------------------------------------
  // 5. Settlement skipped when delta is zero
  // -------------------------------------------------------------------------
  it('does not call settleCredits when actual cost equals preauth', async () => {
    toMicroCreditsMock.mockReturnValue(5000); // same for preauth and actual
    computeCostGbpMock.mockReturnValue(0.005);

    let resolveExecute: () => void;
    const executePromise = new Promise<void>((r) => { resolveExecute = r; });

    streamTextMock.mockReturnValue({
      textStream: (async function* () {
        yield 'hello';
      })(),
      usage: Promise.resolve({ inputTokens: 10, outputTokens: 20 }),
    });

    createUIMessageStreamMock.mockImplementation(
      ({ execute }: { execute: (opts: unknown) => Promise<void> }) => {
        const mockWriter = { write: vi.fn() };
        execute({ writer: mockWriter }).then(() => resolveExecute!()).catch(() => resolveExecute!());
        return 'mock-stream';
      },
    );

    await POST(makeRequest({ boutId: 'b5', presetId: 'darwin-special' }));
    await executePromise;

    expect(settleCreditsMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 6. Error path: credits refunded via applyCreditDelta
  // -------------------------------------------------------------------------
  it('refunds credits via applyCreditDelta when streaming errors', async () => {
    toMicroCreditsMock
      .mockReturnValueOnce(5000)   // preauth
      .mockReturnValueOnce(1000);  // actual (partial usage before error)
    computeCostGbpMock.mockReturnValue(0.001);

    let resolveExecute: () => void;
    const executePromise = new Promise<void>((r) => { resolveExecute = r; });

    streamTextMock.mockReturnValue({
      textStream: (async function* () {
        throw new Error('API connection lost');
      })(),
      usage: Promise.resolve({ inputTokens: 0, outputTokens: 0 }),
    });

    createUIMessageStreamMock.mockImplementation(
      ({ execute }: { execute: (opts: unknown) => Promise<void> }) => {
        const mockWriter = { write: vi.fn() };
        execute({ writer: mockWriter })
          .catch(() => {})
          .finally(() => resolveExecute!());
        return 'mock-stream';
      },
    );

    const res = await POST(
      makeRequest({ boutId: 'b6', presetId: 'darwin-special' }),
    );
    expect(res.status).toBe(200);

    await executePromise;

    // delta = actualMicro - preauthMicro = 1000 - 5000 = -4000 (refund)
    expect(applyCreditDeltaMock).toHaveBeenCalledWith(
      'user-1',
      -4000,
      'settlement-error',
      expect.objectContaining({
        boutId: 'b6',
        preauthMicro: 5000,
        referenceId: 'b6',
      }),
    );
  });

  // -------------------------------------------------------------------------
  // 7. Error path: no refund when delta is zero
  // -------------------------------------------------------------------------
  it('does not refund when error-path delta is zero', async () => {
    toMicroCreditsMock.mockReturnValue(5000);
    computeCostGbpMock.mockReturnValue(0.005);

    let resolveExecute: () => void;
    const executePromise = new Promise<void>((r) => { resolveExecute = r; });

    streamTextMock.mockReturnValue({
      textStream: (async function* () {
        throw new Error('boom');
      })(),
      usage: Promise.resolve({ inputTokens: 0, outputTokens: 0 }),
    });

    createUIMessageStreamMock.mockImplementation(
      ({ execute }: { execute: (opts: unknown) => Promise<void> }) => {
        const mockWriter = { write: vi.fn() };
        execute({ writer: mockWriter })
          .catch(() => {})
          .finally(() => resolveExecute!());
        return 'mock-stream';
      },
    );

    await POST(makeRequest({ boutId: 'b7', presetId: 'darwin-special' }));
    await executePromise;

    expect(applyCreditDeltaMock).not.toHaveBeenCalled();
  });
});
