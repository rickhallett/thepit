import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { mockSweepStuckBouts } = vi.hoisted(() => ({
  mockSweepStuckBouts: vi.fn(),
}));

vi.mock('@/lib/bout-sweep', () => ({
  sweepStuckBouts: mockSweepStuckBouts,
}));

vi.mock('@/lib/admin-auth', async () => {
  const { timingSafeEqual } = await import('crypto');
  return {
    requireAdmin: (req: Request) => {
      const token = req.headers.get('x-admin-token');
      const expected = process.env.ADMIN_SEED_TOKEN;
      if (!expected || !token) throw new Error('Unauthorized');
      const a = Buffer.from(token);
      const b = Buffer.from(expected);
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        throw new Error('Unauthorized');
      }
    },
  };
});

import { POST } from '@/app/api/admin/sweep-bouts/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const makeRequest = (token?: string) =>
  new Request('http://localhost/api/admin/sweep-bouts', {
    method: 'POST',
    headers: token ? { 'x-admin-token': token } : {},
  });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('POST /api/admin/sweep-bouts', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.ADMIN_SEED_TOKEN = 'test-admin-secret';
    mockSweepStuckBouts.mockResolvedValue({
      swept: 0,
      refunded: 0,
      failed: 0,
      details: [],
    });
  });

  it('returns 401 when admin token is missing', async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Authentication required.');
  });

  it('returns 401 when admin token is invalid', async () => {
    const res = await POST(makeRequest('wrong-token-value'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Authentication required.');
  });

  it('returns sweep results with valid admin token', async () => {
    const sweepDate = new Date('2026-01-01T00:00:00Z');
    mockSweepStuckBouts.mockResolvedValue({
      swept: 2,
      refunded: 1,
      failed: 0,
      details: [
        { boutId: 'bout-1', ownerId: 'user-1', createdAt: sweepDate, refundedMicro: 300 },
        { boutId: 'bout-2', ownerId: null, createdAt: sweepDate, refundedMicro: 0 },
      ],
    });

    const res = await POST(makeRequest('test-admin-secret'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.swept).toBe(2);
    expect(body.refunded).toBe(1);
    expect(body.failed).toBe(0);
    expect(body.details).toHaveLength(2);
    expect(body.details[0].boutId).toBe('bout-1');
    expect(body.details[0].refundedMicro).toBe(300);
    expect(body.details[1].ownerId).toBeNull();
  });
});
