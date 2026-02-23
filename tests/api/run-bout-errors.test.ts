import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const {
  mockDb,
  authMock,
  getPresetByIdMock,
  streamTextMock,
  createUIMessageStreamMock,
  createUIMessageStreamResponseMock,
  MODELS,
} = vi.hoisted(() => {
  const db = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  };
  const MODELS = {
    HAIKU: 'claude-haiku-4-5-20251001',
    SONNET_45: 'claude-sonnet-4-5-20250929',
    SONNET_46: 'claude-sonnet-4-6',
  } as const;
  return {
    mockDb: db,
    authMock: vi.fn(),
    getPresetByIdMock: vi.fn(),
    streamTextMock: vi.fn(),
    createUIMessageStreamMock: vi.fn(),
    createUIMessageStreamResponseMock: vi.fn(),
    MODELS,
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
  FREE_MODEL_ID: MODELS.HAIKU,
  PREMIUM_MODEL_OPTIONS: [
    MODELS.SONNET_45,
    MODELS.SONNET_46,
  ],
  DEFAULT_PREMIUM_MODEL_ID: MODELS.SONNET_46,
  getModel: vi.fn(() => 'mock-model'),
  getInputTokenBudget: vi.fn(() => 170_000),
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
  CREDITS_ENABLED: false,
  BYOK_ENABLED: false,
  applyCreditDelta: vi.fn(),
  computeCostGbp: vi.fn(() => 0),
  computeCostUsd: vi.fn(() => ({ inputCostUsd: 0, outputCostUsd: 0, totalCostUsd: 0 })),
  estimateBoutCostGbp: vi.fn(() => 0),
  estimateTokensFromText: vi.fn(() => 0),
  preauthorizeCredits: vi.fn(),
  settleCredits: vi.fn(),
  toMicroCredits: vi.fn(() => 0),
}));

vi.mock('@/lib/intro-pool', () => ({
  getIntroPoolStatus: vi.fn(),
  consumeIntroPoolAnonymous: vi.fn(),
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
    id: 'spaced',
    label: 'Text + spacing',
    hint: 'rich formatting',
    instruction: 'Respond in Markdown.',
  })),
}));

vi.mock('@/lib/byok', () => ({
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('run-bout streaming error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: 'user-1' });
    getPresetByIdMock.mockReturnValue(MINIMAL_PRESET);
    setupDbSelect();
    setupDbInsert();
    setupDbUpdate();
    streamTextMock.mockReturnValue({
      textStream: (async function* () {
        yield 'hello';
      })(),
      usage: Promise.resolve({ inputTokens: 10, outputTokens: 20 }),
    });
  });

  // -------------------------------------------------------------------------
  // 1. Share line generation succeeds
  // -------------------------------------------------------------------------
  it('writes share line to DB and stream on success', async () => {
    let capturedWriter: { write: ReturnType<typeof vi.fn> };
    let resolveExecute: () => void;
    const executePromise = new Promise<void>((r) => { resolveExecute = r; });

    // First call: bout turns; Second call: share line generation
    let callCount = 0;
    streamTextMock.mockImplementation(() => {
      callCount += 1;
      if (callCount <= MINIMAL_PRESET.maxTurns) {
        return {
          textStream: (async function* () {
            yield 'debate-text';
          })(),
          usage: Promise.resolve({ inputTokens: 10, outputTokens: 20 }),
        };
      }
      // Share line call
      return {
        textStream: (async function* () {
          yield 'This bout was wild';
        })(),
        usage: Promise.resolve({ inputTokens: 5, outputTokens: 10 }),
      };
    });

    const dbUpdateCalls: Array<Record<string, unknown>> = [];
    mockDb.update.mockImplementation(() => ({
      set: (data: Record<string, unknown>) => {
        dbUpdateCalls.push(data);
        return { where: async () => ({}) };
      },
    }));

    createUIMessageStreamMock.mockImplementation(
      ({ execute }: { execute: (opts: unknown) => Promise<void> }) => {
        capturedWriter = { write: vi.fn() };
        execute({ writer: capturedWriter })
          .then(() => resolveExecute!())
          .catch(() => resolveExecute!());
        return 'mock-stream';
      },
    );
    createUIMessageStreamResponseMock.mockReturnValue(
      new Response('stream', { status: 200 }),
    );

    const res = await POST(
      makeRequest({ boutId: 'bout-share', presetId: 'darwin-special' }),
    );
    expect(res.status).toBe(200);

    await executePromise;

    // Verify the final DB update includes shareLine and status 'completed'
    const completedUpdate = dbUpdateCalls.find(
      (call) => call.status === 'completed',
    );
    expect(completedUpdate).toBeDefined();
    expect(completedUpdate!.shareLine).toBe('This bout was wild');

    // Verify share line was written to stream
    const shareWrite = capturedWriter!.write.mock.calls.find(
      (call: unknown[]) =>
        (call[0] as { type?: string }).type === 'data-share-line',
    );
    expect(shareWrite).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // 2. Share line generation fails (non-fatal)
  // -------------------------------------------------------------------------
  it('completes bout even when share line generation fails', async () => {
    let resolveExecute: () => void;
    const executePromise = new Promise<void>((r) => { resolveExecute = r; });

    let callCount = 0;
    streamTextMock.mockImplementation(() => {
      callCount += 1;
      if (callCount <= MINIMAL_PRESET.maxTurns) {
        return {
          textStream: (async function* () {
            yield 'debate-text';
          })(),
          usage: Promise.resolve({ inputTokens: 10, outputTokens: 20 }),
        };
      }
      // Share line call throws
      return {
        textStream: (async function* () {
          throw new Error('Share generation failed');
        })(),
        usage: Promise.resolve({ inputTokens: 0, outputTokens: 0 }),
      };
    });

    const dbUpdateCalls: Array<Record<string, unknown>> = [];
    mockDb.update.mockImplementation(() => ({
      set: (data: Record<string, unknown>) => {
        dbUpdateCalls.push(data);
        return { where: async () => ({}) };
      },
    }));

    createUIMessageStreamMock.mockImplementation(
      ({ execute }: { execute: (opts: unknown) => Promise<void> }) => {
        const mockWriter = { write: vi.fn() };
        execute({ writer: mockWriter })
          .then(() => resolveExecute!())
          .catch(() => resolveExecute!());
        return 'mock-stream';
      },
    );
    createUIMessageStreamResponseMock.mockReturnValue(
      new Response('stream', { status: 200 }),
    );

    const res = await POST(
      makeRequest({ boutId: 'bout-share-fail', presetId: 'darwin-special' }),
    );
    expect(res.status).toBe(200);

    await executePromise;

    // Should still complete — share line failure is non-fatal
    const completedUpdate = dbUpdateCalls.find(
      (call) => call.status === 'completed',
    );
    expect(completedUpdate).toBeDefined();
    // Share line should be null since generation failed
    expect(completedUpdate!.shareLine).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 3. DB update sets status to 'error' on streaming failure
  // -------------------------------------------------------------------------
  it('sets bout status to error when streaming throws', async () => {
    let resolveExecute: () => void;
    const executePromise = new Promise<void>((r) => { resolveExecute = r; });

    streamTextMock.mockReturnValue({
      textStream: (async function* () {
        throw new Error('Connection lost');
      })(),
      usage: Promise.resolve({ inputTokens: 0, outputTokens: 0 }),
    });

    const dbUpdateCalls: Array<Record<string, unknown>> = [];
    mockDb.update.mockImplementation(() => ({
      set: (data: Record<string, unknown>) => {
        dbUpdateCalls.push(data);
        return { where: async () => ({}) };
      },
    }));

    createUIMessageStreamMock.mockImplementation(
      ({ execute }: { execute: (opts: unknown) => Promise<void> }) => {
        const mockWriter = { write: vi.fn() };
        execute({ writer: mockWriter })
          .catch(() => {})
          .finally(() => resolveExecute!());
        return 'mock-stream';
      },
    );
    createUIMessageStreamResponseMock.mockReturnValue(
      new Response('stream', { status: 200 }),
    );

    await POST(
      makeRequest({ boutId: 'bout-err', presetId: 'darwin-special' }),
    );
    await executePromise;

    const errorUpdate = dbUpdateCalls.find(
      (call) => call.status === 'error',
    );
    expect(errorUpdate).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // 4. onError: timeout error → descriptive message
  // -------------------------------------------------------------------------
  it('returns timeout message for timeout errors', async () => {
    let capturedOnError: ((error: unknown) => string) | undefined;

    createUIMessageStreamMock.mockImplementation(
      ({ onError }: { execute: (opts: unknown) => Promise<void>; onError?: (error: unknown) => string }) => {
        capturedOnError = onError;
        // Don't run execute — we only need onError
        return 'mock-stream';
      },
    );
    createUIMessageStreamResponseMock.mockReturnValue(
      new Response('stream', { status: 200 }),
    );

    await POST(
      makeRequest({ boutId: 'bout-timeout', presetId: 'darwin-special' }),
    );

    expect(capturedOnError).toBeDefined();
    const result = capturedOnError!(new Error('Request timeout exceeded'));
    expect(result).toBe(
      'The bout timed out. Try a shorter length or fewer turns.',
    );
  });

  // -------------------------------------------------------------------------
  // 5. onError: 429 rate limit → descriptive message
  // -------------------------------------------------------------------------
  it('returns rate limit message for 429 errors', async () => {
    let capturedOnError: ((error: unknown) => string) | undefined;

    createUIMessageStreamMock.mockImplementation(
      ({ onError }: { execute: (opts: unknown) => Promise<void>; onError?: (error: unknown) => string }) => {
        capturedOnError = onError;
        return 'mock-stream';
      },
    );
    createUIMessageStreamResponseMock.mockReturnValue(
      new Response('stream', { status: 200 }),
    );

    await POST(
      makeRequest({ boutId: 'bout-429', presetId: 'darwin-special' }),
    );

    expect(capturedOnError).toBeDefined();
    const result = capturedOnError!(new Error('429 Too Many Requests'));
    expect(result).toBe(
      'API rate limited. Please wait a moment and try again.',
    );
  });

  // -------------------------------------------------------------------------
  // 6. onError: 529 overloaded → descriptive message
  // -------------------------------------------------------------------------
  it('returns overloaded message for 529 errors', async () => {
    let capturedOnError: ((error: unknown) => string) | undefined;

    createUIMessageStreamMock.mockImplementation(
      ({ onError }: { execute: (opts: unknown) => Promise<void>; onError?: (error: unknown) => string }) => {
        capturedOnError = onError;
        return 'mock-stream';
      },
    );
    createUIMessageStreamResponseMock.mockReturnValue(
      new Response('stream', { status: 200 }),
    );

    await POST(
      makeRequest({ boutId: 'bout-529', presetId: 'darwin-special' }),
    );

    expect(capturedOnError).toBeDefined();
    const result = capturedOnError!(new Error('529 model overloaded'));
    expect(result).toBe(
      'The model is overloaded. Please try again shortly.',
    );
  });

  // -------------------------------------------------------------------------
  // 7. onError: DEADLINE error → timeout message
  // -------------------------------------------------------------------------
  it('returns timeout message for DEADLINE errors', async () => {
    let capturedOnError: ((error: unknown) => string) | undefined;

    createUIMessageStreamMock.mockImplementation(
      ({ onError }: { execute: (opts: unknown) => Promise<void>; onError?: (error: unknown) => string }) => {
        capturedOnError = onError;
        return 'mock-stream';
      },
    );
    createUIMessageStreamResponseMock.mockReturnValue(
      new Response('stream', { status: 200 }),
    );

    await POST(
      makeRequest({ boutId: 'bout-deadline', presetId: 'darwin-special' }),
    );

    expect(capturedOnError).toBeDefined();
    const result = capturedOnError!(new Error('DEADLINE exceeded'));
    expect(result).toBe(
      'The bout timed out. Try a shorter length or fewer turns.',
    );
  });

  // -------------------------------------------------------------------------
  // 8. onError: unknown error → generic message
  // -------------------------------------------------------------------------
  it('returns generic message for unclassified errors', async () => {
    let capturedOnError: ((error: unknown) => string) | undefined;

    createUIMessageStreamMock.mockImplementation(
      ({ onError }: { execute: (opts: unknown) => Promise<void>; onError?: (error: unknown) => string }) => {
        capturedOnError = onError;
        return 'mock-stream';
      },
    );
    createUIMessageStreamResponseMock.mockReturnValue(
      new Response('stream', { status: 200 }),
    );

    await POST(
      makeRequest({ boutId: 'bout-unknown', presetId: 'darwin-special' }),
    );

    expect(capturedOnError).toBeDefined();
    const result = capturedOnError!(new Error('Something completely unexpected'));
    expect(result).toBe('The arena short-circuited.');
  });

  // -------------------------------------------------------------------------
  // 9. onError: non-Error value → generic message
  // -------------------------------------------------------------------------
  it('handles non-Error values in onError', async () => {
    let capturedOnError: ((error: unknown) => string) | undefined;

    createUIMessageStreamMock.mockImplementation(
      ({ onError }: { execute: (opts: unknown) => Promise<void>; onError?: (error: unknown) => string }) => {
        capturedOnError = onError;
        return 'mock-stream';
      },
    );
    createUIMessageStreamResponseMock.mockReturnValue(
      new Response('stream', { status: 200 }),
    );

    await POST(
      makeRequest({ boutId: 'bout-string', presetId: 'darwin-special' }),
    );

    expect(capturedOnError).toBeDefined();
    const result = capturedOnError!('plain string error');
    expect(result).toBe('The arena short-circuited.');
  });

  // -------------------------------------------------------------------------
  // 10. onError: rate keyword in message → rate limited
  // -------------------------------------------------------------------------
  it('returns rate limit message for errors containing "rate"', async () => {
    let capturedOnError: ((error: unknown) => string) | undefined;

    createUIMessageStreamMock.mockImplementation(
      ({ onError }: { execute: (opts: unknown) => Promise<void>; onError?: (error: unknown) => string }) => {
        capturedOnError = onError;
        return 'mock-stream';
      },
    );
    createUIMessageStreamResponseMock.mockReturnValue(
      new Response('stream', { status: 200 }),
    );

    await POST(
      makeRequest({ boutId: 'bout-rate', presetId: 'darwin-special' }),
    );

    expect(capturedOnError).toBeDefined();
    const result = capturedOnError!(new Error('rate limit exceeded'));
    expect(result).toBe(
      'API rate limited. Please wait a moment and try again.',
    );
  });
});
