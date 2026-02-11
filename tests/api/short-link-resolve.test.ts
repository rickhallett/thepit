import { describe, expect, it, vi, beforeEach } from 'vitest';

/* ------------------------------------------------------------------ */
/* Hoisted mocks                                                       */
/* ------------------------------------------------------------------ */

const { resolveShortLinkMock, recordClickMock } = vi.hoisted(() => ({
  resolveShortLinkMock: vi.fn(),
  recordClickMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/short-links', () => ({
  resolveShortLink: resolveShortLinkMock,
  recordClick: recordClickMock,
}));

vi.mock('@/lib/logger', () => ({
  log: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

/* ------------------------------------------------------------------ */

import { GET } from '@/app/s/[slug]/route';

describe('GET /s/:slug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveShortLinkMock.mockResolvedValue({
      id: 42,
      boutId: 'bout_xyz',
    });
  });

  function makeReq(slug: string, extra?: string) {
    return new Request(
      `http://localhost/s/${slug}${extra ?? ''}`,
      { method: 'GET' },
    );
  }

  it('H1: redirects to /b/:boutId for valid slug', async () => {
    const res = await GET(makeReq('aBcDeFgH'), {
      params: Promise.resolve({ slug: 'aBcDeFgH' }),
    });

    expect(res.status).toBe(302);
    expect(new URL(res.headers.get('location')!).pathname).toBe(
      '/b/bout_xyz',
    );
  });

  it('H2: records click analytics', async () => {
    await GET(makeReq('aBcDeFgH', '?utm_source=twitter&ref=abc'), {
      params: Promise.resolve({ slug: 'aBcDeFgH' }),
    });

    // recordClick should be called (fire-and-forget)
    expect(recordClickMock).toHaveBeenCalledWith(
      42,
      'bout_xyz',
      expect.any(Request),
    );
  });

  it('U1: unknown slug returns 404', async () => {
    resolveShortLinkMock.mockResolvedValue(null);

    const res = await GET(makeReq('unknown1'), {
      params: Promise.resolve({ slug: 'unknown1' }),
    });

    expect(res.status).toBe(404);
    expect(await res.text()).toBe('Not found.');
  });

  it('U2: overly long slug returns 404', async () => {
    const longSlug = 'x'.repeat(33);
    const res = await GET(makeReq(longSlug), {
      params: Promise.resolve({ slug: longSlug }),
    });

    expect(res.status).toBe(404);
    expect(resolveShortLinkMock).not.toHaveBeenCalled();
  });

  it('H3: click recording failure does not block redirect', async () => {
    recordClickMock.mockRejectedValueOnce(new Error('DB error'));

    const res = await GET(makeReq('aBcDeFgH'), {
      params: Promise.resolve({ slug: 'aBcDeFgH' }),
    });

    // Should still redirect successfully
    expect(res.status).toBe(302);
  });
});
