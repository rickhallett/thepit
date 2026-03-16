import { describe, expect, it, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { mockDb, mockStripe } = vi.hoisted(() => {
  const db = {
    select: vi.fn(),
    update: vi.fn(),
  };

  const stripe = {
    customers: {
      search: vi.fn(),
      create: vi.fn(),
    },
  };

  return { mockDb: db, mockStripe: stripe };
});

vi.mock('@/db', () => ({
  requireDb: () => mockDb,
}));

vi.mock('@/db/schema', () => ({
  users: {
    id: 'id',
    email: 'email',
    stripeCustomerId: 'stripe_customer_id',
    updatedAt: 'updated_at',
  },
}));

import { getOrCreateStripeCustomer } from '@/lib/stripe-customers';

describe('getOrCreateStripeCustomer', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default DB chain
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [],
        }),
      }),
    }));

    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });

    mockStripe.customers.search.mockResolvedValue({ data: [] });
    mockStripe.customers.create.mockResolvedValue({ id: 'cus_new' });
  });

  it('returns existing stripeCustomerId from DB', async () => {
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [
            { stripeCustomerId: 'cus_existing', email: 'a@b.com' },
          ],
        }),
      }),
    }));

    const result = await getOrCreateStripeCustomer('user-1', mockStripe);
    expect(result).toBe('cus_existing');
    expect(mockStripe.customers.search).not.toHaveBeenCalled();
    expect(mockStripe.customers.create).not.toHaveBeenCalled();
  });

  it('finds customer via Stripe search and persists to DB', async () => {
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [
            { stripeCustomerId: null, email: 'b@c.com' },
          ],
        }),
      }),
    }));

    mockStripe.customers.search.mockResolvedValue({
      data: [{ id: 'cus_stripe_found' }],
    });

    const result = await getOrCreateStripeCustomer('user-1', mockStripe);
    expect(result).toBe('cus_stripe_found');
    expect(mockStripe.customers.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.stringContaining('user-1'),
      }),
    );
    expect(mockStripe.customers.create).not.toHaveBeenCalled();
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('creates new Stripe customer when nothing found', async () => {
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [
            { stripeCustomerId: null, email: 'new@user.com' },
          ],
        }),
      }),
    }));

    mockStripe.customers.search.mockResolvedValue({ data: [] });
    mockStripe.customers.create.mockResolvedValue({ id: 'cus_brand_new' });

    const result = await getOrCreateStripeCustomer('user-1', mockStripe);
    expect(result).toBe('cus_brand_new');
    expect(mockStripe.customers.search).toHaveBeenCalled();
    expect(mockStripe.customers.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { userId: 'user-1' },
        email: 'new@user.com',
      }),
    );
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('creates customer without email when user has no email', async () => {
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [
            { stripeCustomerId: null, email: null },
          ],
        }),
      }),
    }));

    mockStripe.customers.search.mockResolvedValue({ data: [] });
    mockStripe.customers.create.mockResolvedValue({ id: 'cus_no_email' });

    const result = await getOrCreateStripeCustomer('user-1', mockStripe);
    expect(result).toBe('cus_no_email');
    expect(mockStripe.customers.create).toHaveBeenCalledWith({
      metadata: { userId: 'user-1' },
    });
  });
});
