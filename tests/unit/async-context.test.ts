import { describe, expect, it } from 'vitest';
import { requestStore, getContext, type RequestContext } from '@/lib/async-context';

describe('async-context', () => {
  it('returns undefined outside a run scope', () => {
    expect(getContext()).toBeUndefined();
  });

  it('returns context within a run scope', async () => {
    const ctx: RequestContext = { requestId: 'req-123', clientIp: '1.2.3.4' };

    await requestStore.run(ctx, async () => {
      const result = getContext();
      expect(result).toBeDefined();
      expect(result!.requestId).toBe('req-123');
      expect(result!.clientIp).toBe('1.2.3.4');
    });
  });

  it('includes optional userId when provided', async () => {
    const ctx: RequestContext = {
      requestId: 'req-456',
      clientIp: '5.6.7.8',
      userId: 'user-abc',
    };

    await requestStore.run(ctx, async () => {
      expect(getContext()!.userId).toBe('user-abc');
    });
  });

  it('includes enriched fields (country, userAgent, path)', async () => {
    const ctx: RequestContext = {
      requestId: 'req-789',
      clientIp: '10.0.0.1',
      country: 'GB',
      userAgent: 'Mozilla/5.0 TestBot',
      path: '/api/run-bout',
    };

    await requestStore.run(ctx, async () => {
      const result = getContext();
      expect(result!.country).toBe('GB');
      expect(result!.userAgent).toBe('Mozilla/5.0 TestBot');
      expect(result!.path).toBe('/api/run-bout');
    });
  });

  it('enriched fields are optional and default to undefined', async () => {
    const ctx: RequestContext = {
      requestId: 'req-minimal',
      clientIp: '127.0.0.1',
    };

    await requestStore.run(ctx, async () => {
      const result = getContext();
      expect(result!.country).toBeUndefined();
      expect(result!.userAgent).toBeUndefined();
      expect(result!.path).toBeUndefined();
    });
  });

  it('isolates concurrent contexts', async () => {
    const results: string[] = [];

    await Promise.all([
      requestStore.run({ requestId: 'a', clientIp: '1.1.1.1' }, async () => {
        await new Promise((r) => setTimeout(r, 10));
        results.push(getContext()!.requestId);
      }),
      requestStore.run({ requestId: 'b', clientIp: '2.2.2.2' }, async () => {
        await new Promise((r) => setTimeout(r, 5));
        results.push(getContext()!.requestId);
      }),
    ]);

    expect(results).toContain('a');
    expect(results).toContain('b');
  });

  it('context is undefined after run completes', async () => {
    await requestStore.run({ requestId: 'temp', clientIp: '0.0.0.0' }, async () => {
      expect(getContext()).toBeDefined();
    });

    expect(getContext()).toBeUndefined();
  });
});
