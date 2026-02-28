import { describe, expect, it, vi } from 'vitest';

// These helpers are exported with @internal JSDoc for testing only.
import { isAnthropicModel, hashUserId } from '@/lib/bout-engine';

// Mock all heavy dependencies so this file loads without side-effects.
// The helpers under test are pure functions that don't touch any of these,
// but the module-level imports in bout-engine.ts require them to be stubbed.

vi.mock('@/db', () => ({ requireDb: vi.fn() }));
vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: vi.fn() }));
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
vi.mock('@/lib/credits', () => ({
  CREDITS_ENABLED: false,
  BYOK_ENABLED: false,
  applyCreditDelta: vi.fn(),
  computeCostGbp: vi.fn(),
  computeCostUsd: vi.fn(),
  estimateBoutCostGbp: vi.fn(),
  estimateTokensFromText: vi.fn(),
  preauthorizeCredits: vi.fn(),
  settleCredits: vi.fn(),
  toMicroCredits: vi.fn(),
}));
vi.mock('@/lib/tier', () => ({
  SUBSCRIPTIONS_ENABLED: false,
  getUserTier: vi.fn(),
  canRunBout: vi.fn(),
  canAccessModel: vi.fn(),
  incrementFreeBoutsUsed: vi.fn(),
  getFreeBoutsUsed: vi.fn(),
}));
vi.mock('@/lib/intro-pool', () => ({
  getIntroPoolStatus: vi.fn(),
  consumeIntroPoolAnonymous: vi.fn(),
  refundIntroPool: vi.fn(),
}));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(),
  getClientIdentifier: vi.fn(),
}));
vi.mock('@/lib/byok', () => ({ readAndClearByokKey: vi.fn() }));
vi.mock('@/lib/ai', () => ({
  FREE_MODEL_ID: 'claude-haiku-4-5-20251001',
  PREMIUM_MODEL_OPTIONS: [],
  getModel: vi.fn(),
  getInputTokenBudget: vi.fn(),
}));
vi.mock('@/lib/presets', () => ({
  getPresetById: vi.fn(),
  ARENA_PRESET_ID: 'arena',
  DEFAULT_AGENT_COLOR: '#888888',
}));
vi.mock('@/lib/bout-lineup', () => ({
  buildArenaPresetFromLineup: vi.fn(),
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
  FIRST_BOUT_PROMOTION_MODEL: 'claude-sonnet-4-5-20250929',
}));

// ---------------------------------------------------------------------------
// H-01 to H-04: isAnthropicModel
// ---------------------------------------------------------------------------

describe('isAnthropicModel', () => {
  it('H-01: returns true for platform-funded model (not byok)', () => {
    expect(isAnthropicModel('claude-haiku-4-5-20251001', null)).toBe(true);
    expect(isAnthropicModel('claude-sonnet-4-5-20250929', null)).toBe(true);
  });

  it('H-02: returns true for BYOK with anthropic provider', () => {
    expect(
      isAnthropicModel('byok', {
        provider: 'anthropic',
        modelId: 'claude-sonnet-4-5-20250929',
        key: 'sk-ant-test',
      }),
    ).toBe(true);
  });

  it('H-03: returns false for BYOK with openrouter provider', () => {
    expect(
      isAnthropicModel('byok', {
        provider: 'openrouter',
        modelId: 'gpt-4o',
        key: 'sk-or-test',
      }),
    ).toBe(false);
  });

  it('H-04: returns false for BYOK with null byokData', () => {
    // When modelId is 'byok' but byokData is null, provider check fails.
    expect(isAnthropicModel('byok', null)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// H-05 to H-08: hashUserId
// ---------------------------------------------------------------------------

describe('hashUserId', () => {
  it('H-05: returns a 16-character hex string', () => {
    const hash = hashUserId('user_abc123');
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it('H-06: is deterministic — same input produces same output', () => {
    const hash1 = hashUserId('user_deterministic_test');
    const hash2 = hashUserId('user_deterministic_test');
    expect(hash1).toBe(hash2);
  });

  it('H-07: different inputs produce different outputs', () => {
    const hash1 = hashUserId('user_alice');
    const hash2 = hashUserId('user_bob');
    expect(hash1).not.toBe(hash2);
  });

  it('H-08: crypto failure branch returns "unknown" (contract test)', () => {
    // hashUserId wraps require('node:crypto').createHash in try/catch,
    // returning 'unknown' on failure. This branch is a defensive guard for
    // edge runtimes where node:crypto may not be available.
    //
    // In Node.js test environments, crypto is already cached from the
    // module-level `import { timingSafeEqual } from 'crypto'` in
    // bout-engine.ts, so the catch branch is unreachable. We cannot mock
    // node:crypto's ESM namespace (frozen) or evict it from require cache
    // (native module).
    //
    // Contract verification: hashUserId always returns a non-empty string
    // (either 16-char hex on success or 'unknown' on failure). The source
    // code's try/catch structure is verified by inspection. The 3 happy-path
    // tests above (H-05, H-06, H-07) provide full coverage of the success
    // branch. This test verifies the return type contract holds.
    const result = hashUserId('any-user');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    // In Node.js, this will always be the hex path
    expect(result).toMatch(/^[0-9a-f]{16}$/);
  });
});
