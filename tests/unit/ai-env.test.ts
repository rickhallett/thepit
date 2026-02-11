import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: vi.fn(() => vi.fn((modelId: string) => ({ modelId }))),
}));

describe('lib/ai env overrides', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.ANTHROPIC_FREE_MODEL;
    delete process.env.ANTHROPIC_MODEL;
    delete process.env.ANTHROPIC_PREMIUM_MODELS;
    delete process.env.ANTHROPIC_PREMIUM_MODEL;
    delete process.env.ANTHROPIC_BYOK_MODEL;
  });

  // H1: ANTHROPIC_FREE_MODEL override
  it('FREE_MODEL_ID uses ANTHROPIC_FREE_MODEL when set', async () => {
    process.env.ANTHROPIC_FREE_MODEL = 'claude-test-free';
    const { FREE_MODEL_ID } = await import('@/lib/ai');
    expect(FREE_MODEL_ID).toBe('claude-test-free');
  });

  // H2: ANTHROPIC_MODEL fallback
  it('FREE_MODEL_ID falls back to ANTHROPIC_MODEL', async () => {
    process.env.ANTHROPIC_MODEL = 'claude-fallback';
    const { FREE_MODEL_ID } = await import('@/lib/ai');
    expect(FREE_MODEL_ID).toBe('claude-fallback');
  });

  // H3: ANTHROPIC_PREMIUM_MODELS comma parsing
  it('PREMIUM_MODEL_OPTIONS parses comma-separated models', async () => {
    process.env.ANTHROPIC_PREMIUM_MODELS = 'model-a, model-b , model-c';
    const { PREMIUM_MODEL_OPTIONS } = await import('@/lib/ai');
    expect(PREMIUM_MODEL_OPTIONS).toEqual(['model-a', 'model-b', 'model-c']);
  });

  // H4: ANTHROPIC_BYOK_MODEL override
  it('BYOK_MODEL_ID uses ANTHROPIC_BYOK_MODEL when set', async () => {
    process.env.ANTHROPIC_BYOK_MODEL = 'claude-byok-custom';
    const { BYOK_MODEL_ID } = await import('@/lib/ai');
    expect(BYOK_MODEL_ID).toBe('claude-byok-custom');
  });
});
