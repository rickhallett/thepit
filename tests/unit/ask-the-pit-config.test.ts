import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('lib/ask-the-pit-config', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.ASK_THE_PIT_ENABLED;
  });

  // H1: ASK_THE_PIT_ENABLED reads from env
  it('ASK_THE_PIT_ENABLED is true when env is "true"', async () => {
    process.env.ASK_THE_PIT_ENABLED = 'true';
    const config = await import('@/lib/ask-the-pit-config');
    expect(config.ASK_THE_PIT_ENABLED).toBe(true);
  });

  it('ASK_THE_PIT_ENABLED is false when env is not "true"', async () => {
    process.env.ASK_THE_PIT_ENABLED = 'false';
    const config = await import('@/lib/ask-the-pit-config');
    expect(config.ASK_THE_PIT_ENABLED).toBe(false);
  });

  // H2: Defaults are correct
  it('has correct default values', async () => {
    const config = await import('@/lib/ask-the-pit-config');
    expect(config.ASK_THE_PIT_ENABLED).toBe(false);
    expect(config.ASK_THE_PIT_DOCS).toEqual(['README.md', 'AGENTS.md']);
    expect(config.ASK_THE_PIT_MODEL).toBe('claude-haiku-4-5-20251001');
    expect(config.ASK_THE_PIT_MAX_TOKENS).toBe(2_000);
  });
});
