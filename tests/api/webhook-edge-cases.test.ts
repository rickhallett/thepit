import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const {
  mockDb,
  mockStripe,
  mockApplyCreditDelta,
  mockEnsureCreditAccount,
  mockResolveTierFromPriceId,
  mockHeaders,
} = vi.hoisted(() => {
  const db = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  };

  const stripe = {
    webhooks: {
      constructEvent: vi.fn(),
    },
  };

  const applyCreditDelta = vi.fn().mockResolvedValue(undefined);
  const ensureCreditAccount = vi.fn().mockResolvedValue(undefined);
  const resolveTierFromPriceId = vi.fn();

  const headerMap = new Map<string, string>();
  const headers = vi.fn().mockResolvedValue({
    get: (name: string) => headerMap.get(name) ?? null,
  });

  return {
    mockDb: db,
    mockStripe: stripe,
    mockApplyCreditDelta: applyCreditDelta,
    mockEnsureCreditAccount: ensureCreditAccount,
    mockResolveTierFromPriceId: resolveTierFromPriceId,
    mockHeaders: { fn: headers, map: headerMap },
  };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
vi.mock('@/db', () => ({
  requireDb: () => mockDb,
}));

vi.mock('@/db/schema', () => ({
  creditTransactions: {
    id: 'id',
    userId: 'user_id',
    deltaMicro: 'delta_micro',
    source: 'source',
    referenceId: 'reference_id',
    metadata: 'metadata',
    createdAt: 'created_at',
  },
  users: {
    id: 'id',
    email: 'email',
    subscriptionTier: 'subscription_tier',
    subscriptionStatus: 'subscription_status',
    subscriptionId: 'subscription_id',
    subscriptionCurrentPeriodEnd: 'subscription_current_period_end',
    stripeCustomerId: 'stripe_customer_id',
    updatedAt: 'updated_at',
  },
}));

vi.mock('@/lib/stripe', () => ({
  stripe: mockStripe,
}));

vi.mock('@/lib/credits', () => ({
  applyCreditDelta: mockApplyCreditDelta,
  ensureCreditAccount: mockEnsureCreditAccount,
  MICRO_PER_CREDIT: 100,
}));

vi.mock('@/lib/tier', () => ({
  resolveTierFromPriceId: mockResolveTierFromPriceId,
}));

vi.mock('next/headers', () => ({
  headers: mockHeaders.fn,
}));

// ---------------------------------------------------------------------------
// Import handler
// ---------------------------------------------------------------------------
import { POST } from '@/app/api/credits/webhook/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const makeRequest = (body = '{}') =>
  new Request('http://localhost/api/credits/webhook', {
    method: 'POST',
    body,
  });

const setupSelect = (rows: unknown[]) => {
  mockDb.select.mockImplementation(() => ({
    from: () => ({
      where: () => ({
        limit: async () => rows,
      }),
    }),
  }));
};

const setupUpdate = () => {
  mockDb.update.mockImplementation(() => ({
    set: vi.fn().mockImplementation(() => ({
      where: vi.fn().mockResolvedValue(undefined),
    })),
  }));
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('POST /api/credits/webhook edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHeaders.map.clear();
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
    mockHeaders.map.set('stripe-signature', 'sig_valid');
    setupSelect([]);
    setupUpdate();
  });

  // H1: Unrecognized event type → 200 { received: true }
  it('returns 200 { received: true } for unrecognized event type', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: 'some.unrecognized.event',
      data: { object: {} },
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ received: true });
    expect(mockDb.update).not.toHaveBeenCalled();
    expect(mockApplyCreditDelta).not.toHaveBeenCalled();
  });

  // U1: checkout.session.completed with 0 credits → no delta applied
  it('checkout.session.completed with 0 credits does not apply delta', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_zero',
          mode: 'payment',
          metadata: { userId: 'user_zero', credits: '0' },
        },
      },
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(mockApplyCreditDelta).not.toHaveBeenCalled();
    expect(mockEnsureCreditAccount).not.toHaveBeenCalled();
  });

  // U2: checkout.session.completed with missing userId → no delta
  it('checkout.session.completed with missing userId does not apply delta', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_noid',
          mode: 'payment',
          metadata: { credits: '50' },
        },
      },
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(mockApplyCreditDelta).not.toHaveBeenCalled();
  });

  // U3: invoice.payment_failed with no metadata and no DB match → no update
  it('invoice.payment_failed with no metadata and no DB match does nothing', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: 'invoice.payment_failed',
      data: {
        object: {
          id: 'inv_orphan',
          customer: 'cus_unknown',
          subscription: 'sub_orphan',
          subscription_details: { metadata: {} },
        },
      },
    });

    // DB lookup returns no user
    setupSelect([]);

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(mockDb.update).not.toHaveBeenCalled();
  });
});
