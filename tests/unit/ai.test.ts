import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: vi.fn(() => vi.fn((modelId: string) => ({ modelId }))),
}));

describe('lib/ai', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.ANTHROPIC_FREE_MODEL;
    delete process.env.ANTHROPIC_MODEL;
    delete process.env.ANTHROPIC_PREMIUM_MODELS;
    delete process.env.ANTHROPIC_PREMIUM_MODEL;
    delete process.env.ANTHROPIC_BYOK_MODEL;
  });

  it('FREE_MODEL_ID defaults to haiku model', async () => {
    const { FREE_MODEL_ID } = await import('@/lib/ai');
    expect(FREE_MODEL_ID).toBe('claude-haiku-4-5-20251001');
  });

  it('PREMIUM_MODEL_OPTIONS is an array of model IDs', async () => {
    const { PREMIUM_MODEL_OPTIONS } = await import('@/lib/ai');
    expect(Array.isArray(PREMIUM_MODEL_OPTIONS)).toBe(true);
    expect(PREMIUM_MODEL_OPTIONS.length).toBeGreaterThan(0);
    PREMIUM_MODEL_OPTIONS.forEach((id) => {
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });
  });

  it('DEFAULT_PREMIUM_MODEL_ID is the first premium option', async () => {
    const { DEFAULT_PREMIUM_MODEL_ID, PREMIUM_MODEL_OPTIONS } =
      await import('@/lib/ai');
    expect(DEFAULT_PREMIUM_MODEL_ID).toBe(PREMIUM_MODEL_OPTIONS[0]);
  });

  it('getModel returns provider for default model', async () => {
    const { getModel, FREE_MODEL_ID } = await import('@/lib/ai');
    const model = getModel();
    expect(model).toEqual({ modelId: FREE_MODEL_ID });
  });

  it('getModel with BYOK uses BYOK_MODEL_ID', async () => {
    const { getModel, BYOK_MODEL_ID } = await import('@/lib/ai');
    const model = getModel('byok');
    expect(model).toEqual({ modelId: BYOK_MODEL_ID });
  });

  it('getModel with custom apiKey creates new provider', async () => {
    const { createAnthropic } = await import('@ai-sdk/anthropic');
    const { getModel, FREE_MODEL_ID } = await import('@/lib/ai');

    const model = getModel(undefined, 'sk-custom-key');

    // createAnthropic called twice: once at module init, once for custom key
    expect(createAnthropic).toHaveBeenCalledWith({ apiKey: 'sk-custom-key' });
    expect(model).toEqual({ modelId: FREE_MODEL_ID });
  });
});
