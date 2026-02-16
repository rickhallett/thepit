import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// Mock async-context
const mockGetContext = vi.fn();
vi.mock('@/lib/async-context', () => ({
  getContext: () => mockGetContext(),
}));

describe('logger', () => {
  let log: typeof import('@/lib/logger').log;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.resetModules();
    mockGetContext.mockReturnValue(undefined);

    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('LOG_LEVEL', 'debug');

    const mod = await import('@/lib/logger');
    log = mod.log;

    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe('semantic log methods', () => {
    it('log.audit() emits info level with signal=audit', () => {
      log.audit('credit_settlement', { userId: 'u1', delta: 100 });
      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain('credit_settlement');
      expect(output).toContain('signal="audit"');
    });

    it('log.metric() emits info level with signal=metric', () => {
      log.metric('turn_latency', { boutId: 'b1', durationMs: 500 });
      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain('turn_latency');
      expect(output).toContain('signal="metric"');
    });

    it('log.security() emits warn level with signal=security', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      log.security('rate_limit_exceeded', { clientIp: '1.2.3.4' });
      expect(warnSpy).toHaveBeenCalled();
      const output = warnSpy.mock.calls[0][0] as string;
      expect(output).toContain('rate_limit_exceeded');
      expect(output).toContain('signal="security"');
    });

    it('semantic methods preserve additional context fields', () => {
      log.audit('tier_change', { userId: 'u1', from: 'free', to: 'pro' });
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain('userId="u1"');
      expect(output).toContain('from="free"');
      expect(output).toContain('to="pro"');
    });
  });

  describe('context auto-injection', () => {
    it('injects requestId from AsyncLocalStorage', () => {
      mockGetContext.mockReturnValue({ requestId: 'req-auto', clientIp: '10.0.0.1' });
      log.info('test message');
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain('requestId="req-auto"');
    });

    it('injects enriched fields (country, path) from AsyncLocalStorage', () => {
      mockGetContext.mockReturnValue({
        requestId: 'req-enriched',
        clientIp: '10.0.0.2',
        country: 'US',
        path: '/api/test',
      });
      log.info('enriched test');
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain('country="US"');
      expect(output).toContain('path="/api/test"');
    });

    it('does not overwrite explicitly provided context', () => {
      mockGetContext.mockReturnValue({
        requestId: 'auto-id',
        clientIp: '10.0.0.3',
        country: 'GB',
      });
      log.info('explicit wins', { requestId: 'explicit-id', country: 'FR' });
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain('requestId="explicit-id"');
      expect(output).toContain('country="FR"');
    });
  });

  describe('API key redaction', () => {
    it('redacts Anthropic API keys (sk-ant-*) in context', () => {
      log.info('auth attempt', { apiKey: 'sk-ant-api03-abc123xyz' });
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain('[REDACTED]');
      expect(output).not.toContain('sk-ant-api03-abc123xyz');
    });

    it('redacts OpenRouter API keys (sk-or-v1-*) in context', () => {
      log.info('auth attempt', { apiKey: 'sk-or-v1-abc123xyz-def456' });
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain('[REDACTED]');
      expect(output).not.toContain('sk-or-v1-abc123xyz-def456');
    });

    it('redacts Stripe keys (sk_live_* / sk_test_*) in context', () => {
      log.info('payment', { stripeKey: 'sk_live_abc123' });
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain('[REDACTED]');
      expect(output).not.toContain('sk_live_abc123');
    });

    it('redacts keys in nested context objects', () => {
      log.info('nested', { config: { apiKey: 'sk-or-v1-secret-key-789' } });
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain('[REDACTED]');
      expect(output).not.toContain('sk-or-v1-secret-key-789');
    });
  });

  describe('Sentry trace linking', () => {
    it('getSentryTraceId is exported and callable', async () => {
      const { getSentryTraceId } = await import('@/lib/logger');
      // In test env, Sentry may or may not be initialized.
      // The function should not throw either way.
      const result = getSentryTraceId();
      expect(result === undefined || typeof result === 'string').toBe(true);
    });

    it('does not overwrite explicitly provided traceId', () => {
      log.info('manual trace', { traceId: 'manual-trace' });
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain('traceId="manual-trace"');
    });
  });
});
