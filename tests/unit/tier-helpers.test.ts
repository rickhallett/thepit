import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const { mockDb } = vi.hoisted(() => {
  const db = {
    select: vi.fn(),
    update: vi.fn(),
  };
  return { mockDb: db };
});

vi.mock('@/db', () => ({
  requireDb: () => mockDb,
}));

vi.mock('@/db/schema', () => ({
  users: {
    id: 'id',
    subscriptionTier: 'subscription_tier',
    freeBoutsUsed: 'free_bouts_used',
    updatedAt: 'updated_at',
  },
}));

vi.mock('@/lib/admin', () => ({
  isAdmin: (id: string) => id === 'admin-user',
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const setupSelect = (result: unknown[]) => {
  mockDb.select.mockImplementation(() => ({
    from: () => ({
      where: () => ({
        limit: async () => result,
      }),
    }),
  }));
};

// ---------------------------------------------------------------------------
// Tests: resolveTierFromPriceId
// ---------------------------------------------------------------------------

describe('resolveTierFromPriceId', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.select.mockReset();
    mockDb.update.mockReset();
  });

  it('returns pass for STRIPE_PASS_PRICE_ID', async () => {
    process.env.STRIPE_PASS_PRICE_ID = 'price_pass_123';
    process.env.STRIPE_LAB_PRICE_ID = 'price_lab_456';
    process.env.SUBSCRIPTIONS_ENABLED = 'true';

    const { resolveTierFromPriceId } = await import('@/lib/tier');
    expect(resolveTierFromPriceId('price_pass_123')).toBe('pass');
  });

  it('returns lab for STRIPE_LAB_PRICE_ID', async () => {
    process.env.STRIPE_PASS_PRICE_ID = 'price_pass_123';
    process.env.STRIPE_LAB_PRICE_ID = 'price_lab_456';
    process.env.SUBSCRIPTIONS_ENABLED = 'true';

    const { resolveTierFromPriceId } = await import('@/lib/tier');
    expect(resolveTierFromPriceId('price_lab_456')).toBe('lab');
  });

  it('returns null for unknown price ID', async () => {
    process.env.STRIPE_PASS_PRICE_ID = 'price_pass_123';
    process.env.STRIPE_LAB_PRICE_ID = 'price_lab_456';
    process.env.SUBSCRIPTIONS_ENABLED = 'true';

    const { resolveTierFromPriceId } = await import('@/lib/tier');
    expect(resolveTierFromPriceId('price_unknown_789')).toBeNull();
  });

  it('returns null when env vars are not set', async () => {
    delete process.env.STRIPE_PASS_PRICE_ID;
    delete process.env.STRIPE_LAB_PRICE_ID;
    process.env.SUBSCRIPTIONS_ENABLED = 'true';

    const { resolveTierFromPriceId } = await import('@/lib/tier');
    expect(resolveTierFromPriceId('price_anything')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests: getFreeBoutsUsed
// ---------------------------------------------------------------------------

describe('getFreeBoutsUsed', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.select.mockReset();
    mockDb.update.mockReset();
    process.env.SUBSCRIPTIONS_ENABLED = 'true';
  });

  it('returns count for existing user', async () => {
    setupSelect([{ freeBoutsUsed: 7 }]);

    const { getFreeBoutsUsed } = await import('@/lib/tier');
    const count = await getFreeBoutsUsed('user-1');
    expect(count).toBe(7);
  });

  it('returns 0 for missing user', async () => {
    setupSelect([]);

    const { getFreeBoutsUsed } = await import('@/lib/tier');
    const count = await getFreeBoutsUsed('nonexistent-user');
    expect(count).toBe(0);
  });
});
