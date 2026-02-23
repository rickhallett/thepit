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
    MODELS.SONNET_46,
    MODELS.SONNET_45,
  ],
  DEFAULT_PREMIUM_MODEL_ID: MODELS.SONNET_46,
  getModel: vi.fn(() => 'mock-model'),
  getInputTokenBudget: vi.fn(() => 170_000),
}));

vi.mock('@/lib/presets', () => ({
  getPresetById: getPresetByIdMock,
  ARENA_PRESET_ID: 'arena',
  DEFAULT_AGENT_COLOR: '#f8fafc',
  DEFAULT_ARENA_MAX_TURNS: 6,
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

const ARENA_LINEUP = [
  {
    id: 'agent-x',
    name: 'Agent X',
    systemPrompt: 'You are Agent X',
    color: '#ff0000',
    avatar: '🤖',
  },
  {
    id: 'agent-y',
    name: 'Agent Y',
    systemPrompt: 'You are Agent Y',
    color: '#00ff00',
    avatar: '🧠',
  },
];

const makeRequest = (body: Record<string, unknown>) =>
  new Request('http://localhost/api/run-bout', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });

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

describe('run-bout arena mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: 'user-1' });
    // By default, getPresetById returns undefined for 'arena' — the route
    // then falls through to the DB lookup path.
    getPresetByIdMock.mockReturnValue(undefined);
    setupDbInsert();
    setupDbUpdate();
    setupStreamMocks();
    streamTextMock.mockReturnValue({
      textStream: (async function* () {
        yield 'arena-text';
      })(),
      usage: Promise.resolve({ inputTokens: 10, outputTokens: 20 }),
    });
  });

  // -------------------------------------------------------------------------
  // 1. Arena mode: reads agentLineup from DB and constructs dynamic preset
  // -------------------------------------------------------------------------
  it('constructs dynamic preset from agent lineup in DB', async () => {
    // First select: idempotency check returns existing bout with arena preset
    // Second select: arena lookup returns agentLineup
    let selectCallCount = 0;
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: async () => {
            selectCallCount += 1;
            if (selectCallCount === 1) {
              // Idempotency check
              return [
                { status: 'running', presetId: 'arena', transcript: [] },
              ];
            }
            // Arena lineup lookup
            return [
              {
                agentLineup: ARENA_LINEUP,
                topic: 'AI ethics',
                responseLength: 'standard',
                responseFormat: 'spaced',
              },
            ];
          },
        }),
      }),
    }));

    const res = await POST(
      makeRequest({ boutId: 'arena-1', presetId: 'arena' }),
    );

    expect(res.status).toBe(200);
    // streamText should have been called (bout actually ran)
    expect(streamTextMock).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 2. Arena mode: returns 404 when no agentLineup in DB
  // -------------------------------------------------------------------------
  it('returns 404 when arena bout has no agentLineup', async () => {
    let selectCallCount = 0;
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: async () => {
            selectCallCount += 1;
            if (selectCallCount === 1) {
              return [
                { status: 'running', presetId: 'arena', transcript: [] },
              ];
            }
            // No agentLineup
            return [{ agentLineup: null, topic: null, responseLength: null, responseFormat: null }];
          },
        }),
      }),
    }));

    const res = await POST(
      makeRequest({ boutId: 'arena-no-lineup', presetId: 'arena' }),
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Unknown preset.' });
  });

  // -------------------------------------------------------------------------
  // 3. Arena mode: returns 404 when no bout row found at all
  // -------------------------------------------------------------------------
  it('returns 404 when arena bout row does not exist in DB', async () => {
    let selectCallCount = 0;
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: async () => {
            selectCallCount += 1;
            if (selectCallCount === 1) {
              return [
                { status: 'running', presetId: 'arena', transcript: [] },
              ];
            }
            // No row found
            return [];
          },
        }),
      }),
    }));

    const res = await POST(
      makeRequest({ boutId: 'arena-missing', presetId: 'arena' }),
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Unknown preset.' });
  });

  // -------------------------------------------------------------------------
  // 4. Arena mode: uses topic from DB when not in payload
  // -------------------------------------------------------------------------
  it('uses topic from DB when payload has no topic', async () => {
    let selectCallCount = 0;
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: async () => {
            selectCallCount += 1;
            if (selectCallCount === 1) {
              return [
                { status: 'running', presetId: 'arena', transcript: [] },
              ];
            }
            return [
              {
                agentLineup: ARENA_LINEUP,
                topic: 'DB-provided topic',
                responseLength: 'concise',
                responseFormat: 'plain',
              },
            ];
          },
        }),
      }),
    }));

    let resolveExecute: () => void;
    const executePromise = new Promise<void>((r) => { resolveExecute = r; });

    createUIMessageStreamMock.mockImplementation(
      ({ execute }: { execute: (opts: unknown) => Promise<void> }) => {
        const mockWriter = { write: vi.fn() };
        execute({ writer: mockWriter })
          .then(() => resolveExecute!())
          .catch(() => resolveExecute!());
        return 'mock-stream';
      },
    );

    const res = await POST(
      makeRequest({ boutId: 'arena-topic', presetId: 'arena' }),
    );
    expect(res.status).toBe(200);

    await executePromise;

    // streamText should have been called with the DB-provided topic
    const firstCall = streamTextMock.mock.calls[0]!;
    expect(firstCall).toBeDefined();
    const messages = firstCall[0]!.messages;
    const userMessage = messages.find(
      (m: { role: string }) => m.role === 'user',
    );
    expect(userMessage.content).toContain('DB-provided topic');
  });

  // -------------------------------------------------------------------------
  // 5. Arena mode: agents from lineup are used in turn rotation
  // -------------------------------------------------------------------------
  it('rotates through lineup agents in turns', async () => {
    let selectCallCount = 0;
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: async () => {
            selectCallCount += 1;
            if (selectCallCount === 1) {
              return [
                { status: 'running', presetId: 'arena', transcript: [] },
              ];
            }
            return [
              {
                agentLineup: ARENA_LINEUP,
                topic: 'Arena debate',
                responseLength: null,
                responseFormat: null,
              },
            ];
          },
        }),
      }),
    }));

    let capturedWriter: { write: ReturnType<typeof vi.fn> };
    let resolveExecute: () => void;
    const executePromise = new Promise<void>((r) => { resolveExecute = r; });

    createUIMessageStreamMock.mockImplementation(
      ({ execute }: { execute: (opts: unknown) => Promise<void> }) => {
        capturedWriter = { write: vi.fn() };
        execute({ writer: capturedWriter })
          .then(() => resolveExecute!())
          .catch(() => resolveExecute!());
        return 'mock-stream';
      },
    );

    const res = await POST(
      makeRequest({ boutId: 'arena-turns', presetId: 'arena' }),
    );
    expect(res.status).toBe(200);

    await executePromise;

    // Check data-turn writes for agent rotation
    const turnWrites = capturedWriter!.write.mock.calls.filter(
      (call: unknown[]) =>
        (call[0] as { type?: string }).type === 'data-turn',
    );

    // The dynamic preset has maxTurns=6, but streamText is mocked to
    // yield once per call, so we should see turns written
    expect(turnWrites.length).toBeGreaterThan(0);

    // First turn should use Agent X, second Agent Y (if enough turns)
    if (turnWrites.length >= 2) {
      expect(turnWrites[0]![0].data.agentName).toBe('Agent X');
      expect(turnWrites[1]![0].data.agentName).toBe('Agent Y');
    }
  });

  // -------------------------------------------------------------------------
  // 6. Non-arena unknown preset → 404
  // -------------------------------------------------------------------------
  it('returns 404 for non-arena unknown preset', async () => {
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [
            { status: 'running', presetId: 'nonexistent', transcript: [] },
          ],
        }),
      }),
    }));

    const res = await POST(
      makeRequest({ boutId: 'unknown-preset', presetId: 'nonexistent' }),
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Unknown preset.' });
  });

  // -------------------------------------------------------------------------
  // 7. Arena mode: agent colors default to #f8fafc
  // -------------------------------------------------------------------------
  it('defaults agent color to #f8fafc when not specified', async () => {
    const lineupNoColor = [
      {
        id: 'agent-nocolor',
        name: 'Colorless',
        systemPrompt: 'No color',
        avatar: '👻',
        // no color field
      },
    ];

    let selectCallCount = 0;
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: async () => {
            selectCallCount += 1;
            if (selectCallCount === 1) {
              return [
                { status: 'running', presetId: 'arena', transcript: [] },
              ];
            }
            return [
              {
                agentLineup: lineupNoColor,
                topic: 'Color test',
                responseLength: null,
                responseFormat: null,
              },
            ];
          },
        }),
      }),
    }));

    let capturedWriter: { write: ReturnType<typeof vi.fn> };
    let resolveExecute: () => void;
    const executePromise = new Promise<void>((r) => { resolveExecute = r; });

    createUIMessageStreamMock.mockImplementation(
      ({ execute }: { execute: (opts: unknown) => Promise<void> }) => {
        capturedWriter = { write: vi.fn() };
        execute({ writer: capturedWriter })
          .then(() => resolveExecute!())
          .catch(() => resolveExecute!());
        return 'mock-stream';
      },
    );

    const res = await POST(
      makeRequest({ boutId: 'arena-nocolor', presetId: 'arena' }),
    );
    expect(res.status).toBe(200);

    await executePromise;

    // Find a data-turn write and check the color default
    const turnWrite = capturedWriter!.write.mock.calls.find(
      (call: unknown[]) =>
        (call[0] as { type?: string }).type === 'data-turn',
    );
    expect(turnWrite).toBeDefined();
    expect(turnWrite![0].data.color).toBe('#f8fafc');
  });
});
