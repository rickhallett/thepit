import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks — these run before any import resolves.
// ---------------------------------------------------------------------------

const {
  mockDb,
  authMock,
  getUserTierMock,
  canRunBoutMock,
  canAccessModelMock,
  incrementFreeBoutsUsedMock,
  consumeFreeBoutMock,
  getPresetByIdMock,
  streamTextMock,
  createUIMessageStreamMock,
  createUIMessageStreamResponseMock,
  readAndClearByokKeyMock,
} = vi.hoisted(() => {
  const db = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  };
  return {
    mockDb: db,
    authMock: vi.fn(),
    getUserTierMock: vi.fn(),
    canRunBoutMock: vi.fn(),
    canAccessModelMock: vi.fn(),
    incrementFreeBoutsUsedMock: vi.fn(),
    consumeFreeBoutMock: vi.fn(),
    getPresetByIdMock: vi.fn(),
    streamTextMock: vi.fn(),
    createUIMessageStreamMock: vi.fn(),
    createUIMessageStreamResponseMock: vi.fn(),
    readAndClearByokKeyMock: vi.fn(),
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
  SUBSCRIPTIONS_ENABLED: true,
  getUserTier: getUserTierMock,
  canRunBout: canRunBoutMock,
  canAccessModel: canAccessModelMock,
  incrementFreeBoutsUsed: incrementFreeBoutsUsedMock,
}));

vi.mock('@/lib/free-bout-pool', () => ({
  consumeFreeBout: consumeFreeBoutMock,
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
  getClientIdentifier: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/credits', () => ({
  CREDITS_ENABLED: false,
  BYOK_ENABLED: true,
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
  readAndClearByokKey: readAndClearByokKeyMock,
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

/** Build a Request with the given JSON payload. */
const makeRequest = (body: Record<string, unknown>) =>
  new Request('http://localhost/api/run-bout', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });

/** Set up the default happy-path mock chain for the DB select call. */
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

/**
 * Set up createUIMessageStream to invoke its execute callback so the route
 * doesn't hang, and createUIMessageStreamResponse to return a 200 Response.
 */
const setupStreamMocks = () => {
  createUIMessageStreamMock.mockImplementation(({ execute }: { execute: (opts: unknown) => Promise<void> }) => {
    const mockWriter = {
      write: vi.fn(),
    };
    // Fire-and-forget so the route can proceed
    execute({ writer: mockWriter }).catch(() => {});
    return 'mock-stream';
  });
  createUIMessageStreamResponseMock.mockReturnValue(
    new Response('stream', { status: 200 }),
  );
};

/** Set up the insert mock (needed for the happy path where the route inserts/upserts the bout). */
const setupDbInsert = () => {
  mockDb.insert.mockImplementation(() => ({
    values: () => ({
      onConflictDoNothing: async () => ({}),
    }),
  }));
};

/** Set up the update mock (streaming path calls db.update). */
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

describe('run-bout tier-based access control', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Authenticated user by default
    authMock.mockResolvedValue({ userId: 'user-1' });
    // Default preset resolution
    getPresetByIdMock.mockReturnValue(MINIMAL_PRESET);
    // DB: bout exists with empty transcript (normal flow)
    setupDbSelect();
    setupDbInsert();
    setupDbUpdate();
    setupStreamMocks();
    // Default tier helpers: everything allowed
    getUserTierMock.mockResolvedValue('free');
    canRunBoutMock.mockResolvedValue({ allowed: true });
    canAccessModelMock.mockReturnValue(true);
    consumeFreeBoutMock.mockResolvedValue({ consumed: true, remaining: 99 });
    incrementFreeBoutsUsedMock.mockResolvedValue(1);
    readAndClearByokKeyMock.mockReturnValue(null);
    // streamText mock for the streaming execute path
    streamTextMock.mockReturnValue({
      textStream: (async function* () {
        yield 'hello';
      })(),
      usage: Promise.resolve({ inputTokens: 10, outputTokens: 20 }),
    });
  });

  // -------------------------------------------------------------------------
  // 1. canRunBout denied → 402
  // -------------------------------------------------------------------------
  it('returns 402 when canRunBout returns not allowed', async () => {
    canRunBoutMock.mockResolvedValue({
      allowed: false,
      reason: 'limit reached',
    });

    const res = await POST(makeRequest({ boutId: 'b1', presetId: 'darwin-special' }));
    expect(res.status).toBe(402);
    expect(await res.json()).toEqual({ error: 'limit reached' });
  });

  // -------------------------------------------------------------------------
  // 2. Premium model access denied → 402
  // -------------------------------------------------------------------------
  it('returns 402 when user requests a premium model they cannot access', async () => {
    canAccessModelMock.mockReturnValue(false);

    const res = await POST(
      makeRequest({
        boutId: 'b2',
        presetId: 'darwin-special',
        model: 'claude-sonnet-4-5-20250929',
      }),
    );
    expect(res.status).toBe(402);
    const body2 = await res.json();
    expect(body2.error).toContain('does not include access');
  });

  // -------------------------------------------------------------------------
  // 3. Free bout pool exhausted → 429
  // -------------------------------------------------------------------------
  it('returns 429 when free bout pool is exhausted', async () => {
    getUserTierMock.mockResolvedValue('free');
    consumeFreeBoutMock.mockResolvedValue({ consumed: false, remaining: 0 });

    const res = await POST(makeRequest({ boutId: 'b3', presetId: 'darwin-special' }));
    expect(res.status).toBe(429);
    const body3 = await res.json();
    expect(body3.error).toContain('pool exhausted');
  });

  // -------------------------------------------------------------------------
  // 4. BYOK bouts bypass tier restrictions
  // -------------------------------------------------------------------------
  it('allows BYOK bouts regardless of tier', async () => {
    readAndClearByokKeyMock.mockReturnValue('sk-ant-test-key');
    canRunBoutMock.mockResolvedValue({ allowed: true });

    const res = await POST(
      makeRequest({ boutId: 'b4', presetId: 'darwin-special', model: 'byok' }),
    );
    // Should reach the streaming response (200), not be blocked
    expect(res.status).toBe(200);
    // canRunBout should have been called with isByok=true
    expect(canRunBoutMock).toHaveBeenCalledWith('user-1', true);
  });

  // -------------------------------------------------------------------------
  // 5. Free tier: consumeFreeBout + incrementFreeBoutsUsed called
  // -------------------------------------------------------------------------
  it('consumes from free pool and increments for free tier users', async () => {
    getUserTierMock.mockResolvedValue('free');
    consumeFreeBoutMock.mockResolvedValue({ consumed: true, remaining: 42 });

    const res = await POST(makeRequest({ boutId: 'b5', presetId: 'darwin-special' }));
    expect(res.status).toBe(200);
    expect(consumeFreeBoutMock).toHaveBeenCalled();
    expect(incrementFreeBoutsUsedMock).toHaveBeenCalledWith('user-1');
  });

  // -------------------------------------------------------------------------
  // 6. Pass tier user accessing sonnet: no pool consumption
  // -------------------------------------------------------------------------
  it('allows pass tier user to access sonnet without pool consumption', async () => {
    getUserTierMock.mockResolvedValue('pass');
    canAccessModelMock.mockReturnValue(true);

    const res = await POST(
      makeRequest({
        boutId: 'b6',
        presetId: 'darwin-special',
        model: 'claude-sonnet-4-5-20250929',
      }),
    );
    expect(res.status).toBe(200);
    // Pass tier should NOT consume from the free pool
    expect(consumeFreeBoutMock).not.toHaveBeenCalled();
    expect(incrementFreeBoutsUsedMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 7. Free tier user requesting sonnet → 402
  // -------------------------------------------------------------------------
  it('returns 402 when free tier user requests sonnet', async () => {
    getUserTierMock.mockResolvedValue('free');
    canAccessModelMock.mockReturnValue(false);

    const res = await POST(
      makeRequest({
        boutId: 'b7',
        presetId: 'darwin-special',
        model: 'claude-sonnet-4-5-20250929',
      }),
    );
    expect(res.status).toBe(402);
    const body7 = await res.json();
    expect(body7.error).toContain('does not include access');
  });

  // -------------------------------------------------------------------------
  // 8. Legacy path: SUBSCRIPTIONS_ENABLED=false with premium preset
  // -------------------------------------------------------------------------
  it('returns 402 on legacy path when premium preset and PREMIUM_ENABLED not set', async () => {
    // To test the legacy path we need SUBSCRIPTIONS_ENABLED=false.
    // Since it's a constant mock, we need to re-mock the module.
    vi.doMock('@/lib/tier', () => ({
      SUBSCRIPTIONS_ENABLED: false,
      getUserTier: getUserTierMock,
      canRunBout: canRunBoutMock,
      canAccessModel: canAccessModelMock,
      incrementFreeBoutsUsed: incrementFreeBoutsUsedMock,
    }));

    // Ensure PREMIUM_ENABLED is not set
    delete process.env.PREMIUM_ENABLED;

    // Use a premium preset
    getPresetByIdMock.mockReturnValue({
      ...MINIMAL_PRESET,
      tier: 'premium',
    });

    // Re-import the route to pick up the new mock
    vi.resetModules();

    // Re-apply all other mocks so the fresh import resolves them
    vi.doMock('@/db', () => ({ requireDb: () => mockDb }));
    vi.doMock('@/db/schema', () => ({
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
    vi.doMock('@clerk/nextjs/server', () => ({ auth: authMock }));
    vi.doMock('@/lib/free-bout-pool', () => ({
      consumeFreeBout: consumeFreeBoutMock,
    }));
    vi.doMock('@/lib/ai', () => ({
      FREE_MODEL_ID: 'claude-haiku-4-5-20251001',
      PREMIUM_MODEL_OPTIONS: [
        'claude-sonnet-4-5-20250929',
        'claude-opus-4-5-20251101',
      ],
      DEFAULT_PREMIUM_MODEL_ID: 'claude-sonnet-4-5-20250929',
      getModel: vi.fn(() => 'mock-model'),
    }));
    vi.doMock('@/lib/presets', () => ({
      getPresetById: getPresetByIdMock,
      ARENA_PRESET_ID: 'arena',
    }));
    vi.doMock('@/lib/rate-limit', () => ({
      checkRateLimit: vi.fn(() => ({
        success: true,
        remaining: 4,
        resetAt: Date.now() + 3600000,
      })),
      getClientIdentifier: vi.fn(() => '127.0.0.1'),
    }));
    vi.doMock('@/lib/credits', () => ({
      CREDITS_ENABLED: false,
      BYOK_ENABLED: true,
      applyCreditDelta: vi.fn(),
      computeCostGbp: vi.fn(() => 0),
      estimateBoutCostGbp: vi.fn(() => 0),
      estimateTokensFromText: vi.fn(() => 0),
      preauthorizeCredits: vi.fn(),
      settleCredits: vi.fn(),
      toMicroCredits: vi.fn(() => 0),
    }));
    vi.doMock('@/lib/response-lengths', () => ({
      resolveResponseLength: vi.fn(() => ({
        id: 'standard',
        label: 'Standard',
        hint: '3-5 sentences',
        maxOutputTokens: 200,
        outputTokensPerTurn: 120,
      })),
    }));
    vi.doMock('@/lib/response-formats', () => ({
      resolveResponseFormat: vi.fn(() => ({
        id: 'markdown',
        label: 'Markdown',
        hint: 'rich formatting',
        instruction: 'Respond in Markdown.',
      })),
    }));
    vi.doMock('@/app/api/byok-stash/route', () => ({
      readAndClearByokKey: readAndClearByokKeyMock,
    }));
    vi.doMock('next/headers', () => ({
      cookies: vi.fn(async () => ({
        get: vi.fn(() => null),
        set: vi.fn(),
        delete: vi.fn(),
      })),
    }));
    vi.doMock('ai', () => ({
      streamText: streamTextMock,
      createUIMessageStream: createUIMessageStreamMock,
      createUIMessageStreamResponse: createUIMessageStreamResponseMock,
    }));

    const { POST: LegacyPOST } = await import('@/app/api/run-bout/route');

    const res = await LegacyPOST(
      makeRequest({ boutId: 'b8', presetId: 'darwin-special' }),
    );
    expect(res.status).toBe(402);
    expect(await res.json()).toEqual({ error: 'Premium required.' });
  });
});
