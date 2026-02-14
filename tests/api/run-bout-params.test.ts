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
  resolveResponseLengthMock,
  resolveResponseFormatMock,
  MODELS,
} = vi.hoisted(() => {
  const db = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  };
  const MODELS = {
    HAIKU: 'claude-haiku-4-5-20251001',
    SONNET: 'claude-sonnet-4-5-20250929',
    OPUS_45: 'claude-opus-4-5-20251101',
    OPUS_46: 'claude-opus-4-6',
  } as const;
  return {
    mockDb: db,
    authMock: vi.fn(),
    getPresetByIdMock: vi.fn(),
    streamTextMock: vi.fn(),
    createUIMessageStreamMock: vi.fn(),
    createUIMessageStreamResponseMock: vi.fn(),
    resolveResponseLengthMock: vi.fn(),
    resolveResponseFormatMock: vi.fn(),
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
    MODELS.SONNET,
    MODELS.OPUS_45,
  ],
  DEFAULT_PREMIUM_MODEL_ID: MODELS.SONNET,
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
  resolveResponseLength: resolveResponseLengthMock,
}));

vi.mock('@/lib/response-formats', () => ({
  resolveResponseFormat: resolveResponseFormatMock,
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

const STANDARD_LENGTH = {
  id: 'standard',
  label: 'Standard',
  hint: '3-5 sentences',
  maxOutputTokens: 200,
  outputTokensPerTurn: 120,
};

const CONCISE_LENGTH = {
  id: 'concise',
  label: 'Concise',
  hint: '1-2 sentences',
  maxOutputTokens: 80,
  outputTokensPerTurn: 50,
};

const MARKDOWN_FORMAT = {
  id: 'spaced',
  label: 'Text + spacing',
  hint: 'rich formatting',
  instruction: 'Respond in Markdown.',
};

const PLAIN_FORMAT = {
  id: 'plain',
  label: 'Plain Text',
  hint: 'no formatting',
  instruction: 'Respond in plain text.',
};

const makeRequest = (body: Record<string, unknown>) =>
  new Request('http://localhost/api/run-bout', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });

const setupDbSelect = (
  overrides: Record<string, unknown> = {},
) => {
  const defaults = { status: 'running', presetId: 'darwin-special', transcript: [] };
  mockDb.select.mockImplementation(() => ({
    from: () => ({
      where: () => ({
        limit: async () => [{ ...defaults, ...overrides }],
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

describe('run-bout parameter passthrough', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: 'user-1' });
    getPresetByIdMock.mockReturnValue(MINIMAL_PRESET);
    setupDbSelect();
    setupDbInsert();
    setupDbUpdate();
    setupStreamMocks();
    resolveResponseLengthMock.mockReturnValue(STANDARD_LENGTH);
    resolveResponseFormatMock.mockReturnValue(MARKDOWN_FORMAT);
    streamTextMock.mockReturnValue({
      textStream: (async function* () {
        yield 'hello';
      })(),
      usage: Promise.resolve({ inputTokens: 10, outputTokens: 20 }),
    });
  });

  // -------------------------------------------------------------------------
  // 1. Topic is stored in bout INSERT
  // -------------------------------------------------------------------------
  it('stores topic in the bout insert', async () => {
    let insertedValues: Record<string, unknown> | undefined;
    mockDb.insert.mockImplementation(() => ({
      values: (v: Record<string, unknown>) => {
        insertedValues = v;
        return { onConflictDoNothing: async () => ({}) };
      },
    }));

    const res = await POST(
      makeRequest({
        boutId: 'params-1',
        presetId: 'darwin-special',
        topic: 'Is AI sentient?',
      }),
    );
    expect(res.status).toBe(200);
    expect(insertedValues).toBeDefined();
    expect(insertedValues!.topic).toBe('Is AI sentient?');
  });

  // -------------------------------------------------------------------------
  // 2. ResponseLength is stored in bout INSERT
  // -------------------------------------------------------------------------
  it('stores responseLength in the bout insert', async () => {
    resolveResponseLengthMock.mockReturnValue(CONCISE_LENGTH);

    let insertedValues: Record<string, unknown> | undefined;
    mockDb.insert.mockImplementation(() => ({
      values: (v: Record<string, unknown>) => {
        insertedValues = v;
        return { onConflictDoNothing: async () => ({}) };
      },
    }));

    const res = await POST(
      makeRequest({
        boutId: 'params-2',
        presetId: 'darwin-special',
        length: 'concise',
      }),
    );
    expect(res.status).toBe(200);
    expect(insertedValues).toBeDefined();
    expect(insertedValues!.responseLength).toBe('concise');
  });

  // -------------------------------------------------------------------------
  // 3. ResponseFormat is stored in bout INSERT
  // -------------------------------------------------------------------------
  it('stores responseFormat in the bout insert', async () => {
    resolveResponseFormatMock.mockReturnValue(PLAIN_FORMAT);

    let insertedValues: Record<string, unknown> | undefined;
    mockDb.insert.mockImplementation(() => ({
      values: (v: Record<string, unknown>) => {
        insertedValues = v;
        return { onConflictDoNothing: async () => ({}) };
      },
    }));

    const res = await POST(
      makeRequest({
        boutId: 'params-3',
        presetId: 'darwin-special',
        format: 'plain',
      }),
    );
    expect(res.status).toBe(200);
    expect(insertedValues).toBeDefined();
    expect(insertedValues!.responseFormat).toBe('plain');
  });

  // -------------------------------------------------------------------------
  // 4. All params stored together
  // -------------------------------------------------------------------------
  it('stores topic, responseLength, and responseFormat together', async () => {
    resolveResponseLengthMock.mockReturnValue(CONCISE_LENGTH);
    resolveResponseFormatMock.mockReturnValue(PLAIN_FORMAT);

    let insertedValues: Record<string, unknown> | undefined;
    mockDb.insert.mockImplementation(() => ({
      values: (v: Record<string, unknown>) => {
        insertedValues = v;
        return { onConflictDoNothing: async () => ({}) };
      },
    }));

    const res = await POST(
      makeRequest({
        boutId: 'params-4',
        presetId: 'darwin-special',
        topic: 'Climate change',
        length: 'concise',
        format: 'plain',
      }),
    );
    expect(res.status).toBe(200);
    expect(insertedValues).toBeDefined();
    expect(insertedValues!.topic).toBe('Climate change');
    expect(insertedValues!.responseLength).toBe('concise');
    expect(insertedValues!.responseFormat).toBe('plain');
  });

  // -------------------------------------------------------------------------
  // 5. Empty topic stored as null
  // -------------------------------------------------------------------------
  it('stores null when topic is empty string', async () => {
    let insertedValues: Record<string, unknown> | undefined;
    mockDb.insert.mockImplementation(() => ({
      values: (v: Record<string, unknown>) => {
        insertedValues = v;
        return { onConflictDoNothing: async () => ({}) };
      },
    }));

    const res = await POST(
      makeRequest({
        boutId: 'params-5',
        presetId: 'darwin-special',
        topic: '',
      }),
    );
    expect(res.status).toBe(200);
    expect(insertedValues).toBeDefined();
    expect(insertedValues!.topic).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 6. Topic is trimmed
  // -------------------------------------------------------------------------
  it('trims whitespace from topic', async () => {
    let insertedValues: Record<string, unknown> | undefined;
    mockDb.insert.mockImplementation(() => ({
      values: (v: Record<string, unknown>) => {
        insertedValues = v;
        return { onConflictDoNothing: async () => ({}) };
      },
    }));

    const res = await POST(
      makeRequest({
        boutId: 'params-6',
        presetId: 'darwin-special',
        topic: '  Quantum computing  ',
      }),
    );
    expect(res.status).toBe(200);
    expect(insertedValues).toBeDefined();
    expect(insertedValues!.topic).toBe('Quantum computing');
  });

  // -------------------------------------------------------------------------
  // 7. Idempotency: existing bout with status=error allows retry
  // -------------------------------------------------------------------------
  it('allows retry when existing bout has status=error', async () => {
    setupDbSelect({ status: 'error', transcript: [{ turn: 0, text: 'partial' }] });

    const res = await POST(
      makeRequest({ boutId: 'retry-1', presetId: 'darwin-special' }),
    );

    // Should NOT be 409 — error status allows retry
    expect(res.status).not.toBe(409);
    expect(res.status).toBe(200);
  });

  // -------------------------------------------------------------------------
  // 8. Idempotency: running with transcript → 409
  // -------------------------------------------------------------------------
  it('blocks running bout with existing transcript', async () => {
    setupDbSelect({
      status: 'running',
      transcript: [{ agentId: 'a1', text: 'hello', turn: 0 }],
    });

    const res = await POST(
      makeRequest({ boutId: 'retry-2', presetId: 'darwin-special' }),
    );

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'Bout is already running.' });
  });

  // -------------------------------------------------------------------------
  // 9. Idempotency: completed → 409
  // -------------------------------------------------------------------------
  it('blocks completed bout from re-running', async () => {
    setupDbSelect({ status: 'completed' });

    const res = await POST(
      makeRequest({ boutId: 'retry-3', presetId: 'darwin-special' }),
    );

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'Bout has already completed.' });
  });

  // -------------------------------------------------------------------------
  // 10. PresetId falls back to existing bout's presetId
  // -------------------------------------------------------------------------
  it('uses existing bout presetId when not in payload', async () => {
    setupDbSelect({ presetId: 'darwin-special' });

    const res = await POST(
      makeRequest({ boutId: 'fallback-1' }),
    );

    // Should proceed (not 400 for missing presetId) because it
    // falls back to the bout's presetId
    expect(res.status).toBe(200);
  });

  // -------------------------------------------------------------------------
  // 11. Missing presetId and no existing bout → 400
  // -------------------------------------------------------------------------
  it('returns 400 when no presetId and no existing bout', async () => {
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [],
        }),
      }),
    }));

    const res = await POST(makeRequest({ boutId: 'no-preset' }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Missing presetId.' });
  });

  // -------------------------------------------------------------------------
  // 12. DB insert failure → 503
  // -------------------------------------------------------------------------
  it('returns 503 when bout insert fails', async () => {
    mockDb.insert.mockImplementation(() => ({
      values: () => ({
        onConflictDoNothing: async () => {
          throw new Error('DB connection lost');
        },
      }),
    }));

    const res = await POST(
      makeRequest({ boutId: 'insert-fail', presetId: 'darwin-special' }),
    );

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'Service temporarily unavailable.' });
  });

  // -------------------------------------------------------------------------
  // 13. resolveResponseLength is called with length key
  // -------------------------------------------------------------------------
  it('calls resolveResponseLength with the length key from payload', async () => {
    const res = await POST(
      makeRequest({
        boutId: 'params-len',
        presetId: 'darwin-special',
        length: 'verbose',
      }),
    );
    expect(res.status).toBe(200);
    expect(resolveResponseLengthMock).toHaveBeenCalledWith('verbose');
  });

  // -------------------------------------------------------------------------
  // 14. resolveResponseFormat is called with format key
  // -------------------------------------------------------------------------
  it('calls resolveResponseFormat with the format key from payload', async () => {
    const res = await POST(
      makeRequest({
        boutId: 'params-fmt',
        presetId: 'darwin-special',
        format: 'haiku',
      }),
    );
    expect(res.status).toBe(200);
    expect(resolveResponseFormatMock).toHaveBeenCalledWith('haiku');
  });
});
