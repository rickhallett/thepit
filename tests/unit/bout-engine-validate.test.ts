import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks — run before any import resolves.
// ---------------------------------------------------------------------------

const {
  mockDb,
  authMock,
  getUserTierMock,
  canRunBoutMock,
  canAccessModelMock,
  incrementFreeBoutsUsedMock,
  getFreeBoutsUsedMock,
  getPresetByIdMock,
  buildArenaPresetFromLineupMock,
  readAndClearByokKeyMock,
  checkRateLimitMock,
  getClientIdentifierMock,
  preauthorizeCreditsMock,
  estimateBoutCostGbpMock,
  toMicroCreditsMock,
  getIntroPoolStatusMock,
  consumeIntroPoolAnonymousMock,
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
    FIRST_BOUT: 'claude-sonnet-4-6',
  } as const;
  return {
    mockDb: db,
    authMock: vi.fn(),
    getUserTierMock: vi.fn(),
    canRunBoutMock: vi.fn(),
    canAccessModelMock: vi.fn(),
    incrementFreeBoutsUsedMock: vi.fn(),
    getFreeBoutsUsedMock: vi.fn(),
    getPresetByIdMock: vi.fn(),
    buildArenaPresetFromLineupMock: vi.fn(),
    readAndClearByokKeyMock: vi.fn(),
    checkRateLimitMock: vi.fn(),
    getClientIdentifierMock: vi.fn(),
    preauthorizeCreditsMock: vi.fn(),
    estimateBoutCostGbpMock: vi.fn(),
    toMicroCreditsMock: vi.fn(),
    getIntroPoolStatusMock: vi.fn(),
    consumeIntroPoolAnonymousMock: vi.fn(),
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
    maxTurns: 'max_turns',
  },
}));

vi.mock('@clerk/nextjs/server', () => ({ auth: authMock }));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(() => null),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

vi.mock('@/lib/tier', () => ({
  SUBSCRIPTIONS_ENABLED: true,
  getUserTier: getUserTierMock,
  canRunBout: canRunBoutMock,
  canAccessModel: canAccessModelMock,
  incrementFreeBoutsUsed: incrementFreeBoutsUsedMock,
  getFreeBoutsUsed: getFreeBoutsUsedMock,
}));

vi.mock('@/lib/ai', () => ({
  FREE_MODEL_ID: MODELS.HAIKU,
  PREMIUM_MODEL_OPTIONS: [MODELS.SONNET_46, MODELS.SONNET_45],
  DEFAULT_PREMIUM_MODEL_ID: MODELS.SONNET_46,
  getModel: vi.fn(() => 'mock-model'),
  getInputTokenBudget: vi.fn(() => 170_000),
}));

vi.mock('@/lib/presets', () => ({
  getPresetById: getPresetByIdMock,
  ARENA_PRESET_ID: 'arena',
  DEFAULT_AGENT_COLOR: '#888888',
}));

vi.mock('@/lib/bout-lineup', () => ({
  buildArenaPresetFromLineup: buildArenaPresetFromLineupMock,
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: checkRateLimitMock,
  getClientIdentifier: getClientIdentifierMock,
}));

vi.mock('@/lib/credits', () => ({
  CREDITS_ENABLED: true,
  BYOK_ENABLED: true,
  applyCreditDelta: vi.fn(),
  computeCostGbp: vi.fn(),
  computeCostUsd: vi.fn(() => ({ inputCostUsd: 0, outputCostUsd: 0, totalCostUsd: 0 })),
  estimateBoutCostGbp: estimateBoutCostGbpMock,
  estimateTokensFromText: vi.fn(() => 0),
  preauthorizeCredits: preauthorizeCreditsMock,
  settleCredits: vi.fn(),
  toMicroCredits: toMicroCreditsMock,
}));

vi.mock('@/lib/intro-pool', () => ({
  getIntroPoolStatus: getIntroPoolStatusMock,
  consumeIntroPoolAnonymous: consumeIntroPoolAnonymousMock,
  refundIntroPool: vi.fn(),
}));

vi.mock('@/lib/byok', () => ({
  readAndClearByokKey: readAndClearByokKeyMock,
}));

vi.mock('@/lib/response-lengths', () => ({
  resolveResponseLength: vi.fn((key: string) => ({
    id: key || 'standard',
    label: 'Standard',
    hint: '3-5 sentences',
    maxOutputTokens: 200,
    outputTokensPerTurn: 120,
  })),
}));

vi.mock('@/lib/response-formats', () => ({
  resolveResponseFormat: vi.fn((key: string) => ({
    id: key || 'spaced',
    label: 'Text + spacing',
    hint: 'rich formatting',
    instruction: 'Respond in Markdown.',
  })),
}));

vi.mock('@/lib/langsmith', () => ({
  tracedStreamText: vi.fn(),
  untracedStreamText: vi.fn(),
  withTracing: vi.fn((fn: unknown) => fn),
}));

vi.mock('@/lib/posthog-server', () => ({
  serverTrack: vi.fn(),
  serverCaptureAIGeneration: vi.fn(),
  flushServerAnalytics: vi.fn(),
}));

vi.mock('@sentry/nextjs', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/refusal-detection', () => ({
  detectRefusal: vi.fn(),
  logRefusal: vi.fn(),
}));

vi.mock('@/lib/experiment', () => ({
  appendExperimentInjection: vi.fn(),
}));

vi.mock('@/lib/async-context', () => ({
  getContext: vi.fn(() => ({})),
}));

vi.mock('@/lib/request-context', () => ({
  getRequestId: vi.fn(() => 'req-test'),
}));

vi.mock('@/lib/models', () => ({
  FIRST_BOUT_PROMOTION_MODEL: MODELS.FIRST_BOUT,
}));

// ---------------------------------------------------------------------------
// SUT
// ---------------------------------------------------------------------------

import { validateBoutRequest } from '@/lib/bout-engine';

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

const PREMIUM_PRESET = {
  ...MINIMAL_PRESET,
  id: 'premium-test',
  tier: 'premium' as const,
};

const ARENA_PRESET = {
  ...MINIMAL_PRESET,
  id: 'arena',
  tier: 'premium' as const,
};

const makeRequest = (body: Record<string, unknown>, headers?: Record<string, string>) =>
  new Request('http://localhost/api/run-bout', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', ...headers },
  });

const makeInvalidRequest = (body: string) =>
  new Request('http://localhost/api/run-bout', {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/json' },
  });

/** Setup: no existing bout in DB (returns empty array from SELECT). */
const setupDbNoBout = () => {
  mockDb.select.mockImplementation(() => ({
    from: () => ({
      where: () => ({
        limit: async () => [],
      }),
    }),
  }));
};

/** Setup: existing bout with given properties. */
const setupDbExistingBout = (bout: Record<string, unknown>) => {
  mockDb.select.mockImplementation(() => ({
    from: () => ({
      where: () => ({
        limit: async () => [bout],
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

/**
 * Default happy-path setup: anonymous user, known preset, no existing bout,
 * rate limit passes, credits disabled (for simplicity — credit tests override).
 */
const setupHappyPath = () => {
  authMock.mockResolvedValue({ userId: null });
  getPresetByIdMock.mockReturnValue(MINIMAL_PRESET);
  setupDbNoBout();
  setupDbInsert();
  checkRateLimitMock.mockReturnValue({ success: true, remaining: 4, resetAt: Date.now() + 3600000 });
  getClientIdentifierMock.mockReturnValue('test-ip');
  estimateBoutCostGbpMock.mockReturnValue(0.005);
  toMicroCreditsMock.mockReturnValue(5000);
  getIntroPoolStatusMock.mockResolvedValue({ exhausted: false, remainingMicro: 100000 });
  consumeIntroPoolAnonymousMock.mockResolvedValue({ consumed: true });
};

/** Default authenticated happy-path. */
const setupAuthHappyPath = () => {
  setupHappyPath();
  authMock.mockResolvedValue({ userId: 'user-1' });
  getUserTierMock.mockResolvedValue('free');
  canRunBoutMock.mockResolvedValue({ allowed: true });
  canAccessModelMock.mockReturnValue(true);
  incrementFreeBoutsUsedMock.mockResolvedValue(undefined);
  getFreeBoutsUsedMock.mockResolvedValue(1);
  preauthorizeCreditsMock.mockResolvedValue({ success: true });
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('validateBoutRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupHappyPath();
    // Reset process.env values that tests may change
    delete process.env.RESEARCH_API_KEY;
  });

  // =========================================================================
  // 1. Input Parsing (V-01 to V-09)
  // =========================================================================

  describe('input parsing', () => {
    it('V-01: returns 400 INVALID_JSON for invalid JSON body', async () => {
      const req = makeInvalidRequest('{bad');
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.status).toBe(400);
        const body = await result.error.json();
        expect(body.error).toContain('Invalid JSON');
      }
    });

    it('V-02: returns 400 INVALID_JSON for null body after parse', async () => {
      const req = makeInvalidRequest('null');
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.status).toBe(400);
      }
    });

    it('V-03a: returns 400 INVALID_JSON for string body', async () => {
      const req = makeInvalidRequest('"just a string"');
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.status).toBe(400);
      }
    });

    it('V-03b: returns 400 INVALID_JSON for number body', async () => {
      const req = makeInvalidRequest('42');
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.status).toBe(400);
      }
    });

    // V-03c: typeof [] === 'object' in JS, so arrays pass the INVALID_JSON
    // guard (line 188) and are caught downstream by the "Missing boutId" check
    // (line 203). We assert the actual rejection reason, not just the status.
    it('V-03c: returns 400 Missing boutId for array body (passes object check)', async () => {
      const req = makeInvalidRequest('[1, 2, 3]');
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.status).toBe(400);
        const body = await result.error.json();
        expect(body.error).toBe('Missing boutId.');
      }
    });

    it('V-04: returns 400 for missing boutId', async () => {
      const req = makeRequest({ presetId: 'darwin-special' });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.status).toBe(400);
        const body = await result.error.json();
        expect(body.error).toContain('Missing boutId');
      }
    });

    it('V-05: returns 400 for topic > 500 chars', async () => {
      const req = makeRequest({
        boutId: 'b1',
        presetId: 'darwin-special',
        topic: 'x'.repeat(501),
      });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.status).toBe(400);
        const body = await result.error.json();
        expect(body.error).toContain('500');
      }
    });

    it('V-06: returns 400 UNSAFE_CONTENT for script tag', async () => {
      const req = makeRequest({
        boutId: 'b1',
        presetId: 'darwin-special',
        topic: '<script>alert("xss")</script>',
      });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.status).toBe(400);
        const body = await result.error.json();
        expect(body.error).toContain('disallowed content');
      }
    });

    it('V-07: returns 400 UNSAFE_CONTENT for javascript: URL', async () => {
      const req = makeRequest({
        boutId: 'b1',
        presetId: 'darwin-special',
        topic: 'click javascript:alert(1)',
      });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.status).toBe(400);
        const body = await result.error.json();
        expect(body.error).toContain('disallowed content');
      }
    });

    it('V-08: topic is trimmed of whitespace', async () => {
      const req = makeRequest({
        boutId: 'b1',
        presetId: 'darwin-special',
        topic: '  climate change  ',
      });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.context.topic).toBe('climate change');
      }
    });

    it('V-09: empty topic is preserved as empty string', async () => {
      const req = makeRequest({
        boutId: 'b1',
        presetId: 'darwin-special',
        topic: '',
      });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.context.topic).toBe('');
      }
    });
  });

  // =========================================================================
  // 2. Database Availability (V-10)
  // =========================================================================

  describe('database availability', () => {
    it('V-10: returns 503 SERVICE_UNAVAILABLE when requireDb throws', async () => {
      // Re-mock @/db so requireDb throws. vi.mock with factory override.
      const dbModule = await import('@/db');
      const originalRequireDb = dbModule.requireDb;

      // Temporarily replace the module export
      Object.defineProperty(dbModule, 'requireDb', {
        value: () => { throw new Error('DB unavailable'); },
        writable: true,
        configurable: true,
      });

      const req = makeRequest({ boutId: 'b1', presetId: 'darwin-special' });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.status).toBe(503);
      }

      // Restore
      Object.defineProperty(dbModule, 'requireDb', {
        value: originalRequireDb,
        writable: true,
        configurable: true,
      });
    });
  });

  // =========================================================================
  // 3. Idempotency (V-11 to V-15)
  // =========================================================================

  describe('idempotency', () => {
    it('V-11: returns 409 for running bout with transcript', async () => {
      setupDbExistingBout({
        status: 'running',
        presetId: 'darwin-special',
        transcript: [{ agentId: 'a1', text: 'hello', turn: 0 }],
        ownerId: null,
      });

      const req = makeRequest({ boutId: 'b1', presetId: 'darwin-special' });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.status).toBe(409);
        const body = await result.error.json();
        expect(body.error).toContain('already running');
      }
    });

    it('V-12: passes through for running bout with empty transcript (retry)', async () => {
      setupDbExistingBout({
        status: 'running',
        presetId: 'darwin-special',
        transcript: [],
        ownerId: null,
      });
      setupDbInsert();

      const req = makeRequest({ boutId: 'b1', presetId: 'darwin-special' });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(true);
    });

    it('V-13: returns 409 for completed bout', async () => {
      setupDbExistingBout({
        status: 'completed',
        presetId: 'darwin-special',
        transcript: [{ agentId: 'a1', text: 'done', turn: 0 }],
        ownerId: null,
      });

      const req = makeRequest({ boutId: 'b1', presetId: 'darwin-special' });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.status).toBe(409);
        const body = await result.error.json();
        expect(body.error).toContain('already completed');
      }
    });

    it('V-14: passes through for non-existent bout (new bout)', async () => {
      setupDbNoBout();
      setupDbInsert();

      const req = makeRequest({ boutId: 'b1', presetId: 'darwin-special' });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(true);
    });

    it('V-15: passes through for bout in error state (retry)', async () => {
      setupDbExistingBout({
        status: 'error',
        presetId: 'darwin-special',
        transcript: [],
        ownerId: null,
      });
      setupDbInsert();

      const req = makeRequest({ boutId: 'b1', presetId: 'darwin-special' });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(true);
    });
  });

  // =========================================================================
  // 4. Preset Resolution (V-16 to V-23)
  // =========================================================================

  describe('preset resolution', () => {
    it('V-16: uses presetId from payload directly', async () => {
      const req = makeRequest({ boutId: 'b1', presetId: 'darwin-special' });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.context.presetId).toBe('darwin-special');
      }
    });

    it('V-17: falls back to presetId from existing bout', async () => {
      setupDbExistingBout({
        status: 'error',
        presetId: 'darwin-special',
        transcript: [],
        ownerId: null,
      });
      setupDbInsert();

      const req = makeRequest({ boutId: 'b1' }); // No presetId in payload
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.context.presetId).toBe('darwin-special');
      }
    });

    it('V-18: returns 400 when presetId missing everywhere', async () => {
      setupDbNoBout();

      const req = makeRequest({ boutId: 'b1' }); // No presetId, no existing bout
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.status).toBe(400);
        const body = await result.error.json();
        expect(body.error).toContain('Missing presetId');
      }
    });

    it('V-19: known preset ID resolves from registry', async () => {
      getPresetByIdMock.mockReturnValue(MINIMAL_PRESET);

      const req = makeRequest({ boutId: 'b1', presetId: 'darwin-special' });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.context.preset).toEqual(MINIMAL_PRESET);
      }
    });

    it('V-20: returns 404 for unknown non-arena preset', async () => {
      getPresetByIdMock.mockReturnValue(undefined);

      const req = makeRequest({ boutId: 'b1', presetId: 'nonexistent' });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.status).toBe(404);
        const body = await result.error.json();
        expect(body.error).toContain('Unknown preset');
      }
    });

    it('V-21: arena preset with agentLineup calls buildArenaPresetFromLineup', async () => {
      getPresetByIdMock.mockReturnValue(undefined); // Not in static registry
      buildArenaPresetFromLineupMock.mockReturnValue(ARENA_PRESET);

      // First select returns no existing bout; second select (arena lookup) returns lineup
      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: async () => {
              selectCallCount++;
              if (selectCallCount === 1) {
                // Idempotency check — no existing bout
                return [];
              }
              // Arena lineup lookup
              return [{
                agentLineup: [{ id: 'a1', name: 'A1', systemPrompt: 'test' }],
                topic: 'AI topic',
                responseLength: 'standard',
                responseFormat: 'spaced',
                maxTurns: 4,
              }];
            },
          }),
        }),
      }));
      setupDbInsert();

      const req = makeRequest({ boutId: 'b1', presetId: 'arena' });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(true);
      expect(buildArenaPresetFromLineupMock).toHaveBeenCalled();
    });

    it('V-22: arena preset with no agentLineup returns 404', async () => {
      getPresetByIdMock.mockReturnValue(undefined);

      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: async () => {
              selectCallCount++;
              if (selectCallCount === 1) return [];
              return [{ agentLineup: null, topic: null, responseLength: null, responseFormat: null, maxTurns: null }];
            },
          }),
        }),
      }));

      const req = makeRequest({ boutId: 'b1', presetId: 'arena' });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.status).toBe(404);
      }
    });

    it('V-23: arena fallback populates topic/length/format from DB row', async () => {
      getPresetByIdMock.mockReturnValue(undefined);
      buildArenaPresetFromLineupMock.mockReturnValue(ARENA_PRESET);

      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: async () => {
              selectCallCount++;
              if (selectCallCount === 1) return [];
              return [{
                agentLineup: [{ id: 'a1', name: 'A1', systemPrompt: 'test' }],
                topic: 'DB topic',
                responseLength: 'concise',
                responseFormat: 'plain',
                maxTurns: 6,
              }];
            },
          }),
        }),
      }));
      setupDbInsert();

      // No topic/length/format in payload — should use DB values
      const req = makeRequest({ boutId: 'b1', presetId: 'arena' });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.context.topic).toBe('DB topic');
        expect(result.context.lengthConfig.id).toBe('concise');
        expect(result.context.formatConfig.id).toBe('plain');
      }
    });
  });

  // =========================================================================
  // 5. Authentication & Ownership (V-24 to V-30)
  // =========================================================================

  describe('authentication & ownership', () => {
    it('V-24: authenticated user gets userId in context', async () => {
      setupAuthHappyPath();

      const req = makeRequest({ boutId: 'b1', presetId: 'darwin-special' });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.context.userId).toBe('user-1');
      }
    });

    it('V-25: anonymous user gets userId null', async () => {
      const req = makeRequest({ boutId: 'b1', presetId: 'darwin-special' });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.context.userId).toBeNull();
      }
    });

    it('V-26: BYOK + authenticated reads and clears key', async () => {
      setupAuthHappyPath();
      readAndClearByokKeyMock.mockReturnValue({
        provider: 'anthropic',
        modelId: 'claude-sonnet-4-5-20250929',
        key: 'sk-ant-test',
      });
      canRunBoutMock.mockResolvedValue({ allowed: true });

      const req = makeRequest({
        boutId: 'b1',
        presetId: 'darwin-special',
        model: 'byok',
      });
      const result = await validateBoutRequest(req);
      expect(readAndClearByokKeyMock).toHaveBeenCalled();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.context.byokData?.provider).toBe('anthropic');
      }
    });

    it('V-27: BYOK + anonymous does not read key (byokData null)', async () => {
      authMock.mockResolvedValue({ userId: null });

      const req = makeRequest({
        boutId: 'b1',
        presetId: 'darwin-special',
        model: 'byok',
      });
      const result = await validateBoutRequest(req);
      expect(readAndClearByokKeyMock).not.toHaveBeenCalled();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.context.byokData).toBeNull();
      }
    });

    it('V-28: ownership mismatch returns 403', async () => {
      setupAuthHappyPath();
      authMock.mockResolvedValue({ userId: 'user-2' });
      getUserTierMock.mockResolvedValue('free');
      setupDbExistingBout({
        status: 'running',
        presetId: 'darwin-special',
        transcript: [],
        ownerId: 'user-1', // Different from user-2
      });

      const req = makeRequest({ boutId: 'b1', presetId: 'darwin-special' });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.status).toBe(403);
      }
    });

    it('V-29: ownership match passes through', async () => {
      setupAuthHappyPath();
      setupDbExistingBout({
        status: 'running',
        presetId: 'darwin-special',
        transcript: [],
        ownerId: 'user-1', // Same as authenticated user
      });
      setupDbInsert();

      const req = makeRequest({ boutId: 'b1', presetId: 'darwin-special' });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(true);
    });

    it('V-30: no ownerId on bout passes through', async () => {
      setupAuthHappyPath();
      setupDbExistingBout({
        status: 'running',
        presetId: 'darwin-special',
        transcript: [],
        ownerId: null,
      });
      setupDbInsert();

      const req = makeRequest({ boutId: 'b1', presetId: 'darwin-special' });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(true);
    });
  });

  // =========================================================================
  // 6. Research API Key Bypass (V-31 to V-35)
  // =========================================================================

  describe('research API key bypass', () => {
    it('V-31: valid x-research-key sets tier=lab, bypass=true', async () => {
      process.env.RESEARCH_API_KEY = 'secret-research-key-123';
      authMock.mockResolvedValue({ userId: null });

      const req = makeRequest(
        { boutId: 'b1', presetId: 'darwin-special' },
        { 'x-research-key': 'secret-research-key-123' },
      );
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.context.tier).toBe('lab');
      }
    });

    it('V-32: invalid key does not bypass', async () => {
      process.env.RESEARCH_API_KEY = 'secret-research-key-123';
      authMock.mockResolvedValue({ userId: null });

      const req = makeRequest(
        { boutId: 'b1', presetId: 'darwin-special' },
        { 'x-research-key': 'wrong-key' },
      );
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.context.tier).toBe('anonymous');
      }
    });

    it('V-33: missing header does not bypass', async () => {
      process.env.RESEARCH_API_KEY = 'secret-research-key-123';
      authMock.mockResolvedValue({ userId: null });

      const req = makeRequest({ boutId: 'b1', presetId: 'darwin-special' });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.context.tier).toBe('anonymous');
      }
    });

    it('V-34: header present but no env var does not bypass', async () => {
      delete process.env.RESEARCH_API_KEY;
      authMock.mockResolvedValue({ userId: null });

      const req = makeRequest(
        { boutId: 'b1', presetId: 'darwin-special' },
        { 'x-research-key': 'some-key' },
      );
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.context.tier).toBe('anonymous');
      }
    });

    it('V-35: different-length keys do not crash, bypass=false', async () => {
      process.env.RESEARCH_API_KEY = 'short';
      authMock.mockResolvedValue({ userId: null });

      const req = makeRequest(
        { boutId: 'b1', presetId: 'darwin-special' },
        { 'x-research-key': 'much-longer-key-than-expected' },
      );
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.context.tier).toBe('anonymous');
      }
    });
  });

  // =========================================================================
  // 7. Rate Limiting (V-36 to V-41)
  // =========================================================================

  describe('rate limiting', () => {
    it('V-36: anonymous limit exceeded returns 429 with upgrade tiers', async () => {
      checkRateLimitMock.mockReturnValue({
        success: false,
        remaining: 0,
        resetAt: Date.now() + 3600000,
      });

      const req = makeRequest({ boutId: 'b1', presetId: 'darwin-special' });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.status).toBe(429);
        const body = await result.error.json();
        expect(body.upgradeTiers).toBeDefined();
        expect(body.upgradeTiers.length).toBeGreaterThan(0);
      }
    });

    it('V-37: free tier exceeded returns 429 with pass+lab tiers', async () => {
      setupAuthHappyPath();
      getUserTierMock.mockResolvedValue('free');
      checkRateLimitMock.mockReturnValue({
        success: false,
        remaining: 0,
        resetAt: Date.now() + 3600000,
      });

      const req = makeRequest({ boutId: 'b1', presetId: 'darwin-special' });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.status).toBe(429);
        const body = await result.error.json();
        expect(body.upgradeTiers).toBeDefined();
        // Should include both pass and lab tiers
        const tierNames = body.upgradeTiers.map((t: { tier: string }) => t.tier);
        expect(tierNames).toContain('pass');
        expect(tierNames).toContain('lab');
      }
    });

    it('V-38: pass tier exceeded returns 429 with lab-only tier', async () => {
      setupAuthHappyPath();
      getUserTierMock.mockResolvedValue('pass');
      checkRateLimitMock.mockReturnValue({
        success: false,
        remaining: 0,
        resetAt: Date.now() + 3600000,
      });

      const req = makeRequest({ boutId: 'b1', presetId: 'darwin-special' });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.status).toBe(429);
        const body = await result.error.json();
        const tierNames = body.upgradeTiers.map((t: { tier: string }) => t.tier);
        expect(tierNames).not.toContain('pass');
        expect(tierNames).toContain('lab');
      }
    });

    it('V-39: lab tier skips rate limiting entirely', async () => {
      setupAuthHappyPath();
      getUserTierMock.mockResolvedValue('lab');

      const req = makeRequest({ boutId: 'b1', presetId: 'darwin-special' });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(true);
      // checkRateLimit should NOT be called for lab tier
      expect(checkRateLimitMock).not.toHaveBeenCalled();
    });

    it('V-40: research bypass skips rate limiting (tier=lab)', async () => {
      process.env.RESEARCH_API_KEY = 'research-key';
      authMock.mockResolvedValue({ userId: null });

      const req = makeRequest(
        { boutId: 'b1', presetId: 'darwin-special' },
        { 'x-research-key': 'research-key' },
      );
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(true);
      expect(checkRateLimitMock).not.toHaveBeenCalled();
    });

    it('V-41: rate limit response includes currentTier, limit, message', async () => {
      checkRateLimitMock.mockReturnValue({
        success: false,
        remaining: 0,
        resetAt: Date.now() + 3600000,
      });

      const req = makeRequest({ boutId: 'b1', presetId: 'darwin-special' });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const body = await result.error.json();
        expect(body.currentTier).toBe('anonymous');
        expect(body.limit).toBe(2);
        expect(body.error).toBeDefined();
      }
    });
  });

  // =========================================================================
  // 8. Tier-Based Model Selection (V-42 to V-53)
  // =========================================================================

  describe('tier-based model selection', () => {
    it('V-42: SUBSCRIPTIONS_ENABLED=false uses FREE_MODEL_ID', async () => {
      // Override SUBSCRIPTIONS_ENABLED. The mock at module level sets it to true.
      // We need to dynamically toggle it. Re-mock the tier module.
      const tier = await import('@/lib/tier');
      Object.defineProperty(tier, 'SUBSCRIPTIONS_ENABLED', { value: false, writable: true });

      // Explicit mock setup — V-42 must not rely on leaked state from prior tests
      setupAuthHappyPath();
      authMock.mockResolvedValue({ userId: 'user-1' });

      const req = makeRequest({ boutId: 'b1', presetId: 'darwin-special' });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.context.modelId).toBe(MODELS.HAIKU);
      }

      // Restore
      Object.defineProperty(tier, 'SUBSCRIPTIONS_ENABLED', { value: true, writable: true });
    });

    it('V-43: canRunBout not allowed returns 402', async () => {
      setupAuthHappyPath();
      canRunBoutMock.mockResolvedValue({ allowed: false, reason: 'Account suspended' });

      const req = makeRequest({ boutId: 'b1', presetId: 'darwin-special' });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.status).toBe(402);
      }
    });

    it('V-44: BYOK + key present sets modelId=byok', async () => {
      setupAuthHappyPath();
      readAndClearByokKeyMock.mockReturnValue({
        provider: 'anthropic',
        modelId: 'claude-sonnet-4-5-20250929',
        key: 'sk-ant-test',
      });

      const req = makeRequest({
        boutId: 'b1',
        presetId: 'darwin-special',
        model: 'byok',
      });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.context.modelId).toBe('byok');
      }
    });

    it('V-45: BYOK + no key returns 400', async () => {
      setupAuthHappyPath();
      readAndClearByokKeyMock.mockReturnValue(null);

      const req = makeRequest({
        boutId: 'b1',
        presetId: 'darwin-special',
        model: 'byok',
      });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.status).toBe(400);
        const body = await result.error.json();
        expect(body.error).toContain('BYOK key required');
      }
    });

    it('V-46: premium model + access sets modelId', async () => {
      setupAuthHappyPath();
      getUserTierMock.mockResolvedValue('pass');
      canAccessModelMock.mockReturnValue(true);

      const req = makeRequest({
        boutId: 'b1',
        presetId: 'darwin-special',
        model: MODELS.SONNET_46,
      });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.context.modelId).toBe(MODELS.SONNET_46);
      }
    });

    it('V-47: premium model + no access returns 402', async () => {
      setupAuthHappyPath();
      getUserTierMock.mockResolvedValue('free');
      canAccessModelMock.mockReturnValue(false);

      const req = makeRequest({
        boutId: 'b1',
        presetId: 'darwin-special',
        model: MODELS.SONNET_46,
      });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.status).toBe(402);
      }
    });

    it('V-48: premium preset with no explicit model auto-upgrades', async () => {
      setupAuthHappyPath();
      getUserTierMock.mockResolvedValue('pass');
      canAccessModelMock.mockReturnValue(true);
      getPresetByIdMock.mockReturnValue(PREMIUM_PRESET);

      const req = makeRequest({ boutId: 'b1', presetId: 'premium-test' });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(true);
      if (result.ok) {
        // Should auto-upgrade to first allowed premium model
        expect(result.context.modelId).toBe(MODELS.SONNET_46);
      }
    });

    it('V-49: arena preset treated as premium', async () => {
      setupAuthHappyPath();
      getUserTierMock.mockResolvedValue('pass');
      canAccessModelMock.mockReturnValue(true);
      getPresetByIdMock.mockReturnValue(ARENA_PRESET);

      const req = makeRequest({ boutId: 'b1', presetId: 'arena' });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.context.modelId).toBe(MODELS.SONNET_46);
      }
    });

    it('V-50: free tier + first bout gets FIRST_BOUT_PROMOTION_MODEL', async () => {
      setupAuthHappyPath();
      getUserTierMock.mockResolvedValue('free');
      getFreeBoutsUsedMock.mockResolvedValue(0);

      const req = makeRequest({ boutId: 'b1', presetId: 'darwin-special' });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.context.modelId).toBe(MODELS.FIRST_BOUT);
      }
    });

    it('V-51: free tier + not first bout gets FREE_MODEL_ID', async () => {
      setupAuthHappyPath();
      getUserTierMock.mockResolvedValue('free');
      getFreeBoutsUsedMock.mockResolvedValue(5);

      const req = makeRequest({ boutId: 'b1', presetId: 'darwin-special' });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.context.modelId).toBe(MODELS.HAIKU);
      }
    });

    it('V-52: free tier calls incrementFreeBoutsUsed', async () => {
      setupAuthHappyPath();
      getUserTierMock.mockResolvedValue('free');

      const req = makeRequest({ boutId: 'b1', presetId: 'darwin-special' });
      await validateBoutRequest(req);
      expect(incrementFreeBoutsUsedMock).toHaveBeenCalledWith('user-1');
    });

    it('V-53: pass/lab tier does NOT call incrementFreeBoutsUsed', async () => {
      setupAuthHappyPath();
      getUserTierMock.mockResolvedValue('pass');

      const req = makeRequest({ boutId: 'b1', presetId: 'darwin-special' });
      await validateBoutRequest(req);
      expect(incrementFreeBoutsUsedMock).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 9. Credit Pre-authorization (V-54 to V-61)
  // =========================================================================

  describe('credit pre-authorization', () => {
    it('V-54: CREDITS_ENABLED=false skips all credit checks', async () => {
      const credits = await import('@/lib/credits');
      Object.defineProperty(credits, 'CREDITS_ENABLED', { value: false, writable: true });

      const req = makeRequest({ boutId: 'b1', presetId: 'darwin-special' });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.context.preauthMicro).toBe(0);
        expect(result.context.introPoolConsumedMicro).toBe(0);
      }
      expect(getIntroPoolStatusMock).not.toHaveBeenCalled();
      expect(preauthorizeCreditsMock).not.toHaveBeenCalled();

      // Restore
      Object.defineProperty(credits, 'CREDITS_ENABLED', { value: true, writable: true });
    });

    it('V-55: research bypass skips all credit/pool gates', async () => {
      process.env.RESEARCH_API_KEY = 'research-key';
      authMock.mockResolvedValue({ userId: null });

      const req = makeRequest(
        { boutId: 'b1', presetId: 'darwin-special' },
        { 'x-research-key': 'research-key' },
      );
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(true);
      expect(getIntroPoolStatusMock).not.toHaveBeenCalled();
      expect(preauthorizeCreditsMock).not.toHaveBeenCalled();
    });

    it('V-56: anonymous + pool has credits → consumed', async () => {
      getIntroPoolStatusMock.mockResolvedValue({ exhausted: false, remainingMicro: 100000 });
      consumeIntroPoolAnonymousMock.mockResolvedValue({ consumed: true });

      const req = makeRequest({ boutId: 'b1', presetId: 'darwin-special' });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.context.introPoolConsumedMicro).toBeGreaterThan(0);
        // preauthMicro should be 0 for anonymous (pool covers it)
        expect(result.context.preauthMicro).toBe(0);
      }
    });

    it('V-57: anonymous + pool exhausted returns 401', async () => {
      getIntroPoolStatusMock.mockResolvedValue({ exhausted: true, remainingMicro: 0 });

      const req = makeRequest({ boutId: 'b1', presetId: 'darwin-special' });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.status).toBe(401);
      }
    });

    it('V-58: anonymous + pool insufficient returns 401', async () => {
      getIntroPoolStatusMock.mockResolvedValue({ exhausted: false, remainingMicro: 1 }); // Less than preauthMicro
      toMicroCreditsMock.mockReturnValue(5000); // Larger than remainingMicro

      const req = makeRequest({ boutId: 'b1', presetId: 'darwin-special' });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.status).toBe(401);
      }
    });

    it('V-59: anonymous + consumption race returns 402', async () => {
      getIntroPoolStatusMock.mockResolvedValue({ exhausted: false, remainingMicro: 100000 });
      consumeIntroPoolAnonymousMock.mockResolvedValue({ consumed: false }); // Race condition

      const req = makeRequest({ boutId: 'b1', presetId: 'darwin-special' });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.status).toBe(402);
      }
    });

    it('V-60: authenticated + preauth succeeds sets preauthMicro', async () => {
      setupAuthHappyPath();
      toMicroCreditsMock.mockReturnValue(5000);

      const req = makeRequest({ boutId: 'b1', presetId: 'darwin-special' });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.context.preauthMicro).toBe(5000);
      }
    });

    it('V-61: authenticated + insufficient credits returns 402', async () => {
      setupAuthHappyPath();
      preauthorizeCreditsMock.mockResolvedValue({ success: false });

      const req = makeRequest({ boutId: 'b1', presetId: 'darwin-special' });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.status).toBe(402);
      }
    });
  });

  // =========================================================================
  // 10. Bout Row Creation (V-62 to V-64)
  // =========================================================================

  describe('bout row creation', () => {
    it('V-62: INSERT succeeds returns ok: true with full BoutContext', async () => {
      const req = makeRequest({
        boutId: 'b1',
        presetId: 'darwin-special',
        topic: 'test topic',
      });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.context.boutId).toBe('b1');
      }
    });

    it('V-63: INSERT fails returns 503', async () => {
      mockDb.insert.mockImplementation(() => ({
        values: () => ({
          onConflictDoNothing: async () => {
            throw new Error('insert failed');
          },
        }),
      }));

      const req = makeRequest({ boutId: 'b1', presetId: 'darwin-special' });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.status).toBe(503);
      }
    });

    it('V-64: context contains all 14 required fields', async () => {
      setupAuthHappyPath();
      toMicroCreditsMock.mockReturnValue(5000);

      const req = makeRequest({
        boutId: 'b1',
        presetId: 'darwin-special',
        topic: 'test',
      });
      const result = await validateBoutRequest(req);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const ctx = result.context;
        expect(ctx).toHaveProperty('boutId');
        expect(ctx).toHaveProperty('presetId');
        expect(ctx).toHaveProperty('preset');
        expect(ctx).toHaveProperty('topic');
        expect(ctx).toHaveProperty('lengthConfig');
        expect(ctx).toHaveProperty('formatConfig');
        expect(ctx).toHaveProperty('modelId');
        expect(ctx).toHaveProperty('byokData');
        expect(ctx).toHaveProperty('userId');
        expect(ctx).toHaveProperty('preauthMicro');
        expect(ctx).toHaveProperty('introPoolConsumedMicro');
        expect(ctx).toHaveProperty('tier');
        expect(ctx).toHaveProperty('requestId');
        expect(ctx).toHaveProperty('db');
      }
    });
  });
});
