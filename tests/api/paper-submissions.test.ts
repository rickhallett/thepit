import { describe, expect, it, vi, beforeEach } from 'vitest';

/* ------------------------------------------------------------------ */
/* Hoisted mocks                                                       */
/* ------------------------------------------------------------------ */

const {
  authMock,
  checkRateLimitMock,
  parseArxivIdMock,
  fetchArxivMetadataMock,
  ensureUserRecordMock,
  mockOnConflictDoNothing,
  mockValues,
  mockInsert,
} = vi.hoisted(() => {
  const mockOnConflictDoNothing = vi.fn().mockResolvedValue(undefined);
  const mockValues = vi
    .fn()
    .mockReturnValue({ onConflictDoNothing: mockOnConflictDoNothing });
  const mockInsert = vi.fn().mockReturnValue({ values: mockValues });
  return {
    authMock: vi.fn(),
    checkRateLimitMock: vi.fn(),
    parseArxivIdMock: vi.fn(),
    fetchArxivMetadataMock: vi.fn(),
    ensureUserRecordMock: vi.fn(),
    mockOnConflictDoNothing,
    mockValues,
    mockInsert,
  };
});

vi.mock('@clerk/nextjs/server', () => ({
  auth: authMock,
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: checkRateLimitMock,
  getClientIdentifier: vi.fn().mockReturnValue('127.0.0.1'),
}));

vi.mock('@/lib/arxiv', () => ({
  parseArxivId: parseArxivIdMock,
  fetchArxivMetadata: fetchArxivMetadataMock,
}));

vi.mock('@/lib/users', () => ({
  ensureUserRecord: ensureUserRecordMock,
}));

vi.mock('@/db', () => ({
  requireDb: () => ({ insert: mockInsert }),
}));

vi.mock('@/db/schema', () => ({
  paperSubmissions: Symbol('paperSubmissions'),
}));

/* ------------------------------------------------------------------ */

import { POST } from '@/app/api/paper-submissions/route';

const VALID_JUSTIFICATION =
  'This paper demonstrates that multi-agent debate significantly improves factuality in LLM outputs, which is directly relevant to how The Pit structures agent interactions.';

describe('paper-submissions api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: 'user_123' });
    checkRateLimitMock.mockReturnValue({
      success: true,
      remaining: 4,
      resetAt: Date.now() + 3_600_000,
    });
    parseArxivIdMock.mockReturnValue('2305.14325');
    fetchArxivMetadataMock.mockResolvedValue({
      title: 'Improving Factuality and Reasoning',
      authors: 'Du, Li, Torralba',
      abstract: 'We propose a simple approach...',
    });
    ensureUserRecordMock.mockResolvedValue(undefined);
  });

  function makeReq(body: unknown) {
    return new Request('http://localhost/api/paper-submissions', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  function makeRawReq(body: string) {
    return new Request('http://localhost/api/paper-submissions', {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  it('H1: valid submission returns 200 with paper title and authors', async () => {
    const res = await POST(
      makeReq({
        arxivUrl: 'https://arxiv.org/abs/2305.14325',
        justification: VALID_JUSTIFICATION,
        relevanceArea: 'agent-interaction',
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.title).toBe('Improving Factuality and Reasoning');
    expect(json.authors).toBe('Du, Li, Torralba');
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_123',
        arxivId: '2305.14325',
        relevanceArea: 'agent-interaction',
      }),
    );
    expect(mockOnConflictDoNothing).toHaveBeenCalled();
  });

  it('H2: duplicate submission resolves via onConflictDoNothing', async () => {
    const res = await POST(
      makeReq({
        arxivUrl: 'https://arxiv.org/abs/2305.14325',
        justification: VALID_JUSTIFICATION,
        relevanceArea: 'evaluation',
      }),
    );

    expect(res.status).toBe(200);
    expect(mockOnConflictDoNothing).toHaveBeenCalled();
  });

  it('U1: invalid JSON returns 400', async () => {
    const res = await POST(makeRawReq('{bad'));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid JSON.' });
  });

  it('U2: missing arxivUrl returns 400', async () => {
    const res = await POST(
      makeReq({ justification: VALID_JUSTIFICATION, relevanceArea: 'other' }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'arXiv URL required.' });
  });

  it('U3: invalid arXiv URL returns 400', async () => {
    parseArxivIdMock.mockReturnValue(null);

    const res = await POST(
      makeReq({
        arxivUrl: 'https://example.com/not-arxiv',
        justification: VALID_JUSTIFICATION,
        relevanceArea: 'other',
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid arXiv URL.' });
  });

  it('U4: justification too short returns 400', async () => {
    const res = await POST(
      makeReq({
        arxivUrl: 'https://arxiv.org/abs/2305.14325',
        justification: 'Too short.',
        relevanceArea: 'other',
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Justification must be at least 50 characters.' });
  });

  it('U5: justification too long returns 400', async () => {
    const res = await POST(
      makeReq({
        arxivUrl: 'https://arxiv.org/abs/2305.14325',
        justification: 'x'.repeat(2001),
        relevanceArea: 'other',
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Justification must be 2000 characters or fewer.' });
  });

  it('U6: invalid relevanceArea returns 400', async () => {
    const res = await POST(
      makeReq({
        arxivUrl: 'https://arxiv.org/abs/2305.14325',
        justification: VALID_JUSTIFICATION,
        relevanceArea: 'invalid-area',
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid relevance area.' });
  });

  it('U7: unauthenticated request returns 401', async () => {
    authMock.mockResolvedValue({ userId: null });

    const res = await POST(
      makeReq({
        arxivUrl: 'https://arxiv.org/abs/2305.14325',
        justification: VALID_JUSTIFICATION,
        relevanceArea: 'other',
      }),
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });

  it('U8: rate limited returns 429', async () => {
    checkRateLimitMock.mockReturnValue({
      success: false,
      remaining: 0,
      resetAt: Date.now() + 3_600_000,
    });

    const res = await POST(
      makeReq({
        arxivUrl: 'https://arxiv.org/abs/2305.14325',
        justification: VALID_JUSTIFICATION,
        relevanceArea: 'other',
      }),
    );
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: 'Rate limit exceeded.' });
  });

  it('U9: paper not found on arXiv returns 400', async () => {
    fetchArxivMetadataMock.mockResolvedValue(null);

    const res = await POST(
      makeReq({
        arxivUrl: 'https://arxiv.org/abs/0000.00000',
        justification: VALID_JUSTIFICATION,
        relevanceArea: 'other',
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Paper not found on arXiv.' });
  });

  it('U10: UNSAFE_PATTERN in justification returns 400', async () => {
    const res = await POST(
      makeReq({
        arxivUrl: 'https://arxiv.org/abs/2305.14325',
        justification:
          'This is relevant because https://evil.com has more info and also because it matches multi-agent patterns.',
        relevanceArea: 'other',
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Justification must not contain URLs or scripts.' });
  });

  it('U11: each valid relevanceArea is accepted', async () => {
    const areas = [
      'agent-interaction',
      'evaluation',
      'persona',
      'context-windows',
      'prompt-engineering',
      'other',
    ];

    for (const area of areas) {
      vi.clearAllMocks();
      authMock.mockResolvedValue({ userId: 'user_123' });
      checkRateLimitMock.mockReturnValue({
        success: true,
        remaining: 4,
        resetAt: Date.now() + 3_600_000,
      });
      parseArxivIdMock.mockReturnValue('2305.14325');
      fetchArxivMetadataMock.mockResolvedValue({
        title: 'Test',
        authors: 'Author',
        abstract: '',
      });
      ensureUserRecordMock.mockResolvedValue(undefined);

      const res = await POST(
        makeReq({
          arxivUrl: 'https://arxiv.org/abs/2305.14325',
          justification: VALID_JUSTIFICATION,
          relevanceArea: area,
        }),
      );
      expect(res.status).toBe(200);
    }
  });
});
