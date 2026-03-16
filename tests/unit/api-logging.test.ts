import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before importing the module under test.
const mockLogError = vi.fn();
const mockLogWarn = vi.fn();
const mockLogInfo = vi.fn();

vi.mock('@/lib/logger', () => ({
  log: {
    info: (...args: unknown[]) => mockLogInfo(...args),
    warn: (...args: unknown[]) => mockLogWarn(...args),
    error: (...args: unknown[]) => mockLogError(...args),
  },
}));

vi.mock('@/lib/request-context', () => ({
  getRequestId: () => 'req-test-123',
  getClientIp: () => '127.0.0.1',
  getUserAgent: () => 'test-agent',
  getReferer: () => '',
}));

vi.mock('@/lib/anomaly', () => ({
  checkAnomaly: vi.fn(),
}));

vi.mock('@/lib/async-context', () => ({
  requestStore: {
    run: (_ctx: unknown, fn: () => unknown) => fn(),
  },
}));

describe('withLogging', () => {
  let withLogging: typeof import('@/lib/api-logging').withLogging;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.resetModules();
    mockLogError.mockReset();
    mockLogWarn.mockReset();
    mockLogInfo.mockReset();

    // Re-import with fresh mocks
    const mod = await import('@/lib/api-logging');
    withLogging = mod.withLogging;

    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function makeRequest(path = '/api/test'): Request {
    return new Request(`http://localhost${path}`, {
      method: 'GET',
      headers: {
        'x-request-id': 'req-test-123',
        'x-client-ip': '127.0.0.1',
        'user-agent': 'test-agent',
      },
    });
  }

  it('logs and re-throws when handler throws', async () => {
    const originalError = new Error('handler exploded');
    const handler = vi.fn().mockRejectedValue(originalError);
    const wrapped = withLogging(handler, 'test-route');

    await expect(wrapped(makeRequest())).rejects.toThrow('handler exploded');
    expect(mockLogError).toHaveBeenCalledOnce();
  });

  describe('double-fault resilience', () => {
    it('falls back to console.error when logger throws during error handling', async () => {
      const originalError = new Error('handler exploded');
      const loggerError = new Error('serialization failed');

      // Handler throws the original error
      const handler = vi.fn().mockRejectedValue(originalError);

      // Logger itself throws when trying to log the error
      mockLogError.mockImplementation(() => {
        throw loggerError;
      });

      const wrapped = withLogging(handler, 'test-route');

      // The original error should still be re-thrown
      await expect(wrapped(makeRequest())).rejects.toThrow('handler exploded');

      // console.error should have been called with DOUBLE-FAULT messages
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[DOUBLE-FAULT] Logger failed while handling error. Original error:',
        originalError,
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[DOUBLE-FAULT] Logger error:',
        loggerError,
      );
    });

    it('preserves the original error even when logger fails', async () => {
      const originalError = new Error('the real problem');

      const handler = vi.fn().mockRejectedValue(originalError);
      mockLogError.mockImplementation(() => {
        throw new Error('logger broke');
      });

      const wrapped = withLogging(handler, 'test-route');

      // The thrown error must be the original, not the logger error
      let caught: unknown;
      try {
        await wrapped(makeRequest());
      } catch (e) {
        caught = e;
      }

      expect(caught).toBe(originalError);
    });
  });
});
