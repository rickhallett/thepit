/**
 * S-07: Run-bout topic validation
 * Ensures topics longer than 500 characters and unsafe patterns are rejected.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { authMock, mockSelectLimit, checkRateLimitMock, getClientIdentifierMock } = vi.hoisted(
  () => ({
    authMock: vi.fn(),
    mockSelectLimit: vi.fn(),
    checkRateLimitMock: vi.fn(),
    getClientIdentifierMock: vi.fn(),
  }),
);

vi.mock('@clerk/nextjs/server', () => ({ auth: authMock }));
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }));
vi.mock('@/db', () => ({
  requireDb: () => ({
    select: () => ({
      from: () => ({
        where: () => ({
          limit: mockSelectLimit,
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn(),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
  }),
}));
vi.mock('@/db/schema', () => ({
  bouts: {
    id: Symbol(),
    status: Symbol(),
    presetId: Symbol(),
    transcript: Symbol(),
    ownerId: Symbol(),
  },
}));
vi.mock('@/lib/ai', () => ({
  getModel: vi.fn(),
  FREE_MODEL_ID: 'haiku',
  DEFAULT_PREMIUM_MODEL_ID: 'sonnet',
  PREMIUM_MODEL_OPTIONS: [],
  getInputTokenBudget: vi.fn(() => 170_000),
}));
vi.mock('@/lib/presets', () => ({
  getPresetById: vi.fn(() => ({
    id: 'test',
    name: 'Test',
    agents: [
      { id: 'a', name: 'A', systemPrompt: 'prompt' },
      { id: 'b', name: 'B', systemPrompt: 'prompt' },
    ],
    maxTurns: 4,
    tier: 'free',
  })),
  ARENA_PRESET_ID: 'arena',
  DEFAULT_AGENT_COLOR: '#f8fafc',
  DEFAULT_ARENA_MAX_TURNS: 12,
}));
vi.mock('@/lib/response-lengths', () => ({
  resolveResponseLength: vi.fn(() => ({
    id: 'standard',
    label: 'Standard',
    hint: '',
    maxTokens: 200,
  })),
}));
vi.mock('@/lib/response-formats', () => ({
  resolveResponseFormat: vi.fn(() => ({ id: 'plain', label: 'Plain', hint: '' })),
}));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: checkRateLimitMock,
  getClientIdentifier: getClientIdentifierMock,
}));
vi.mock('@/lib/credits', () => ({
  CREDITS_ENABLED: false,
  BYOK_ENABLED: false,
  estimateBoutCostGbp: vi.fn(),
  getCreditBalanceMicro: vi.fn(),
  preauthorizeCredits: vi.fn(),
  toMicroCredits: vi.fn(),
}));
vi.mock('@/lib/agent-prompts', () => ({
  composeSystemPrompt: vi.fn(() => 'prompt'),
}));
vi.mock('@/lib/intro-pool', () => ({
  getIntroPoolStatus: vi.fn(),
  consumeIntroPoolAnonymous: vi.fn(),
}));

vi.mock('@/lib/tier', () => ({
  SUBSCRIPTIONS_ENABLED: false,
  canRunBout: vi.fn(() => ({ allowed: true })),
  canAccessModel: vi.fn(() => true),
  incrementFreeBoutsUsed: vi.fn(),
}));
vi.mock('@/app/api/byok-stash/route', () => ({
  readAndClearByokKey: vi.fn(() => null),
}));

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ userId: 'user_test' });
  mockSelectLimit.mockResolvedValue([
    { status: 'running', presetId: 'test', transcript: [], ownerId: 'user_test' },
  ]);
  checkRateLimitMock.mockReturnValue({
    success: true,
    remaining: 4,
    resetAt: Date.now() + 3600000,
  });
  getClientIdentifierMock.mockReturnValue('127.0.0.1');
});

describe('run-bout topic validation', () => {
  it('rejects topic longer than 500 characters', async () => {
    const { POST } = await import('@/app/api/run-bout/route');
    const req = new Request('http://localhost/api/run-bout', {
      method: 'POST',
      body: JSON.stringify({
        boutId: 'test-bout-12345678901',
        presetId: 'test',
        topic: 'A'.repeat(501),
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Topic must be 500 characters or fewer.' });
  });

  it('rejects topic containing a URL (UNSAFE_PATTERN)', async () => {
    const { POST } = await import('@/app/api/run-bout/route');
    const req = new Request('http://localhost/api/run-bout', {
      method: 'POST',
      body: JSON.stringify({
        boutId: 'test-bout-12345678901',
        presetId: 'test',
        topic: 'Check out https://evil.com for details',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Input contains disallowed content.' });
  });

  it('rejects topic containing a script tag (UNSAFE_PATTERN)', async () => {
    const { POST } = await import('@/app/api/run-bout/route');
    const req = new Request('http://localhost/api/run-bout', {
      method: 'POST',
      body: JSON.stringify({
        boutId: 'test-bout-12345678901',
        presetId: 'test',
        topic: 'Debate about <script>alert(1)</script>',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Input contains disallowed content.' });
  });
});
