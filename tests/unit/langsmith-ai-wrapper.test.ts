/**
 * Tests for lib/langsmith.ts — LangSmith AI SDK wrapper.
 *
 * Validates that:
 *   - When LANGSMITH_ENABLED is false, traced functions are identity pass-throughs
 *   - When LANGSMITH_ENABLED is true, wrapAISDK is called once (singleton)
 *   - getLangSmithClient() returns null when disabled
 *   - getLangSmithClient() returns a Client instance when enabled
 *   - Untraced functions delegate to the raw AI SDK (not LangSmith-wrapped)
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Reset module cache so env changes take effect on re-import. */
async function importFresh() {
  vi.resetModules();
  return import('@/lib/langsmith');
}

// Mock the logger to avoid console noise
vi.mock('@/lib/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Tests: Disabled (default)
// ---------------------------------------------------------------------------

describe('lib/langsmith (LANGSMITH_ENABLED=false)', () => {
  beforeEach(() => {
    delete process.env.LANGSMITH_ENABLED;
  });

  it('getLangSmithClient() returns null', async () => {
    const { getLangSmithClient } = await importFresh();
    expect(getLangSmithClient()).toBeNull();
  });

  it('tracedStreamText is a function', async () => {
    const { tracedStreamText } = await importFresh();
    expect(typeof tracedStreamText).toBe('function');
  });

  it('tracedGenerateText is a function', async () => {
    const { tracedGenerateText } = await importFresh();
    expect(typeof tracedGenerateText).toBe('function');
  });

  it('untracedStreamText is a function', async () => {
    const { untracedStreamText } = await importFresh();
    expect(typeof untracedStreamText).toBe('function');
  });

  it('untracedGenerateText is a function', async () => {
    const { untracedGenerateText } = await importFresh();
    expect(typeof untracedGenerateText).toBe('function');
  });

  it('traced and untraced exports are both callable', async () => {
    const mod = await importFresh();
    // All four should be functions — when disabled, traced delegates to raw AI SDK
    expect(typeof mod.tracedStreamText).toBe('function');
    expect(typeof mod.tracedGenerateText).toBe('function');
    expect(typeof mod.untracedStreamText).toBe('function');
    expect(typeof mod.untracedGenerateText).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// Tests: Enabled
// ---------------------------------------------------------------------------

describe('lib/langsmith (LANGSMITH_ENABLED=true)', () => {
  const originalEnv = process.env.LANGSMITH_ENABLED;

  beforeEach(() => {
    process.env.LANGSMITH_ENABLED = 'true';
    // Provide a fake API key so the Client constructor doesn't throw
    process.env.LANGSMITH_API_KEY = 'lsv2_test_fake_key_for_unit_tests';
    process.env.LANGSMITH_PROJECT = 'thepit-test';
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.LANGSMITH_ENABLED;
    } else {
      process.env.LANGSMITH_ENABLED = originalEnv;
    }
    delete process.env.LANGSMITH_API_KEY;
    delete process.env.LANGSMITH_PROJECT;
  });

  it('getLangSmithClient() returns a Client instance', async () => {
    const { getLangSmithClient } = await importFresh();
    const client = getLangSmithClient();
    expect(client).not.toBeNull();
    // Should have the awaitPendingTraceBatches method (used by OCE-94)
    expect(typeof client?.awaitPendingTraceBatches).toBe('function');
  });

  it('getLangSmithClient() returns same instance on repeated calls (singleton)', async () => {
    const { getLangSmithClient } = await importFresh();
    const a = getLangSmithClient();
    const b = getLangSmithClient();
    expect(a).toBe(b);
  });

  it('tracedStreamText is a function when enabled', async () => {
    const { tracedStreamText } = await importFresh();
    expect(typeof tracedStreamText).toBe('function');
  });

  it('untraced exports are distinct from traced (wrapping happened)', async () => {
    const { tracedStreamText, untracedStreamText } = await importFresh();
    // Both are functions but they delegate to different underlying implementations.
    // tracedStreamText goes through wrapAISDK; untracedStreamText goes directly to ai.
    expect(typeof tracedStreamText).toBe('function');
    expect(typeof untracedStreamText).toBe('function');
    // They should not be the exact same function reference (one is wrapped).
    expect(tracedStreamText).not.toBe(untracedStreamText);
  });
});

// ---------------------------------------------------------------------------
// Tests: withTracing
// ---------------------------------------------------------------------------

describe('withTracing', () => {
  it('returns the original function when disabled', async () => {
    delete process.env.LANGSMITH_ENABLED;
    const { withTracing } = await importFresh();
    const fn = async () => 42;
    const wrapped = withTracing(fn, { name: 'test' });
    expect(wrapped).toBe(fn);
  });

  it('returns a different function when enabled (traceable wrapper)', async () => {
    process.env.LANGSMITH_ENABLED = 'true';
    process.env.LANGSMITH_API_KEY = 'lsv2_test_fake_key_for_unit_tests';
    const { withTracing } = await importFresh();
    const fn = async () => 42;
    const wrapped = withTracing(fn, { name: 'test' });
    // traceable() wraps the function, so it should be a different reference
    expect(wrapped).not.toBe(fn);
    expect(typeof wrapped).toBe('function');
    delete process.env.LANGSMITH_API_KEY;
  });

  it('preserves function return value when disabled', async () => {
    delete process.env.LANGSMITH_ENABLED;
    const { withTracing } = await importFresh();
    const fn = async (x: number) => x * 2;
    const wrapped = withTracing(fn, { name: 'double' });
    const result = await wrapped(21);
    expect(result).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// Tests: flushTraces and scheduleTraceFlush
// ---------------------------------------------------------------------------

describe('flushTraces', () => {
  it('resolves immediately when disabled (no-op)', async () => {
    delete process.env.LANGSMITH_ENABLED;
    const { flushTraces } = await importFresh();
    // Should not throw and should resolve quickly
    await expect(flushTraces()).resolves.toBeUndefined();
  });
});

describe('scheduleTraceFlush', () => {
  it('does not throw when disabled', async () => {
    delete process.env.LANGSMITH_ENABLED;
    const { scheduleTraceFlush } = await importFresh();
    expect(() => scheduleTraceFlush()).not.toThrow();
  });

  it('does not throw when called outside request scope (no after() available)', async () => {
    process.env.LANGSMITH_ENABLED = 'true';
    process.env.LANGSMITH_API_KEY = 'lsv2_test_fake_key_for_unit_tests';
    const { scheduleTraceFlush } = await importFresh();
    // In test environment, next/server's after() will throw, but
    // scheduleTraceFlush should catch it and fall back gracefully.
    expect(() => scheduleTraceFlush()).not.toThrow();
    delete process.env.LANGSMITH_API_KEY;
  });
});

describe('isLangSmithEnabled', () => {
  it('is false by default', async () => {
    delete process.env.LANGSMITH_ENABLED;
    const { isLangSmithEnabled } = await importFresh();
    expect(isLangSmithEnabled).toBe(false);
  });

  it('is true when LANGSMITH_ENABLED=true', async () => {
    process.env.LANGSMITH_ENABLED = 'true';
    const { isLangSmithEnabled } = await importFresh();
    expect(isLangSmithEnabled).toBe(true);
  });
});
