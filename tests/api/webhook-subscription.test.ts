import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks – these are available inside vi.mock() factory functions.
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
  SUBSCRIPTION_GRANT_PASS: 300,
  SUBSCRIPTION_GRANT_LAB: 600,
  MONTHLY_CREDITS_PASS: 300,
  MONTHLY_CREDITS_LAB: 600,
}));

vi.mock('@/lib/tier', () => ({
  resolveTierFromPriceId: mockResolveTierFromPriceId,
}));

vi.mock('next/headers', () => ({
  headers: mockHeaders.fn,
}));

// ---------------------------------------------------------------------------
// Import the handler under test (AFTER mocks are registered)
// ---------------------------------------------------------------------------
import { POST } from '@/app/api/credits/webhook/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal Request with a text body. */
const makeRequest = (body = '{}') =>
  new Request('http://localhost/api/credits/webhook', {
    method: 'POST',
    body,
  });

/** Shorthand to configure the stripe-signature header. */
const setSignatureHeader = (sig: string | null) => {
  if (sig === null) {
    mockHeaders.map.delete('stripe-signature');
  } else {
    mockHeaders.map.set('stripe-signature', sig);
  }
};

/** Set the webhook secret env var. */
const setWebhookSecret = (val: string | undefined) => {
  if (val === undefined) {
    delete process.env.STRIPE_WEBHOOK_SECRET;
  } else {
    process.env.STRIPE_WEBHOOK_SECRET = val;
  }
};

/** Configure mockDb.select to return a chainable query that resolves to `rows`. */
const setupSelect = (rows: unknown[]) => {
  mockDb.select.mockImplementation(() => ({
    from: () => ({
      where: () => ({
        limit: async () => rows,
      }),
    }),
  }));
};

/** Configure mockDb.update to record calls and resolve. */
const setupUpdate = () => {
  const setCalls: unknown[] = [];
  mockDb.update.mockImplementation(() => ({
    set: vi.fn().mockImplementation((values: unknown) => {
      setCalls.push(values);
      return {
        where: vi.fn().mockResolvedValue(undefined),
      };
    }),
  }));
  return setCalls;
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('POST /api/credits/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHeaders.map.clear();
    setWebhookSecret('whsec_test_secret');
    setSignatureHeader('sig_valid');
    setupSelect([]);
    setupUpdate();
  });

  // ------------------------------------------------------------------
  // 1. Missing STRIPE_WEBHOOK_SECRET
  // ------------------------------------------------------------------
  it('returns 500 when STRIPE_WEBHOOK_SECRET is not set', async () => {
    setWebhookSecret(undefined);
    const res = await POST(makeRequest());
    expect(res.status).toBe(500);
    expect(await res.text()).toMatch(/unavailable/i);
  });

  // ------------------------------------------------------------------
  // 2. Missing stripe-signature header
  // ------------------------------------------------------------------
  it('returns 400 when stripe-signature header is missing', async () => {
    setSignatureHeader(null);
    const res = await POST(makeRequest());
    expect(res.status).toBe(400);
    expect(await res.text()).toMatch(/missing signature/i);
  });

  // ------------------------------------------------------------------
  // 3. Signature verification fails
  // ------------------------------------------------------------------
  it('returns 400 when stripe signature verification fails', async () => {
    setSignatureHeader('sig_bad');
    mockStripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('Signature verification failed');
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(400);
    expect(await res.text()).toMatch(/invalid signature/i);
  });

  // ------------------------------------------------------------------
  // 4. checkout.session.completed (mode=payment) credits user
  // ------------------------------------------------------------------
  it('checkout.session.completed (payment): credits the user account', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_123',
          mode: 'payment',
          metadata: { userId: 'user_pay', credits: '50' },
        },
      },
    });

    // No existing transaction (idempotency check passes)
    setupSelect([]);

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });

    expect(mockEnsureCreditAccount).toHaveBeenCalledWith('user_pay');
    expect(mockApplyCreditDelta).toHaveBeenCalledWith(
      'user_pay',
      50 * 100, // credits * MICRO_PER_CREDIT
      'purchase',
      { referenceId: 'cs_123', credits: 50 },
    );
  });

  // ------------------------------------------------------------------
  // 5. checkout.session.completed (payment): skips duplicate sessions
  // ------------------------------------------------------------------
  it('checkout.session.completed (payment): skips duplicate sessions', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_dup',
          mode: 'payment',
          metadata: { userId: 'user_dup', credits: '10' },
        },
      },
    });

    // Existing transaction found – duplicate
    setupSelect([{ id: 1 }]);

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    expect(mockApplyCreditDelta).not.toHaveBeenCalled();
    expect(mockEnsureCreditAccount).not.toHaveBeenCalled();
  });

  // ------------------------------------------------------------------
  // 6. checkout.session.completed (subscription): does NOT credit
  // ------------------------------------------------------------------
  it('checkout.session.completed (subscription): does not credit account', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_sub',
          mode: 'subscription',
          metadata: { userId: 'user_sub', credits: '50' },
        },
      },
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    expect(mockApplyCreditDelta).not.toHaveBeenCalled();
    expect(mockEnsureCreditAccount).not.toHaveBeenCalled();
  });

  // ------------------------------------------------------------------
  // 7. customer.subscription.created: resolves tier and updates user
  // ------------------------------------------------------------------
  it('customer.subscription.created: resolves tier and updates user', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_new',
          status: 'active',
          customer: 'cus_1',
          metadata: { userId: 'user_tier' },
          items: { data: [{ price: { id: 'price_pass' } }] },
          current_period_end: 1700000000,
        },
      },
    });

    mockResolveTierFromPriceId.mockReturnValue('pass');
    const setCalls = setupUpdate();

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    expect(mockResolveTierFromPriceId).toHaveBeenCalledWith('price_pass');
    expect(mockDb.update).toHaveBeenCalled();
    expect(setCalls.length).toBeGreaterThanOrEqual(1);
    expect(setCalls[0]).toMatchObject({
      subscriptionTier: 'pass',
      subscriptionId: 'sub_new',
      subscriptionStatus: 'active',
    });
  });

  // ------------------------------------------------------------------
  // 8. customer.subscription.created: skips when userId missing
  // ------------------------------------------------------------------
  it('customer.subscription.created: skips when userId missing', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_noid',
          status: 'active',
          customer: 'cus_2',
          metadata: {},
          items: { data: [{ price: { id: 'price_pass' } }] },
        },
      },
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    expect(mockDb.update).not.toHaveBeenCalled();
  });

  // ------------------------------------------------------------------
  // 9. customer.subscription.created: skips when priceId doesn't resolve
  // ------------------------------------------------------------------
  it('customer.subscription.created: skips when priceId unrecognized', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_unknown',
          status: 'active',
          customer: 'cus_3',
          metadata: { userId: 'user_unknown_price' },
          items: { data: [{ price: { id: 'price_unknown' } }] },
        },
      },
    });

    mockResolveTierFromPriceId.mockReturnValue(null);

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    expect(mockDb.update).not.toHaveBeenCalled();
  });

  // ------------------------------------------------------------------
  // 10. customer.subscription.updated: updates tier and status
  // ------------------------------------------------------------------
  it('customer.subscription.updated: updates tier and status', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_upd',
          status: 'active',
          customer: 'cus_4',
          metadata: { userId: 'user_upd' },
          items: { data: [{ price: { id: 'price_lab' } }] },
          current_period_end: 1800000000,
        },
      },
    });

    mockResolveTierFromPriceId.mockReturnValue('lab');
    const setCalls = setupUpdate();

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    expect(setCalls[0]).toMatchObject({
      subscriptionTier: 'lab',
      subscriptionId: 'sub_upd',
      subscriptionStatus: 'active',
    });
  });

  // ------------------------------------------------------------------
  // 11. customer.subscription.deleted: downgrades to free
  // ------------------------------------------------------------------
  it('customer.subscription.deleted: downgrades user to free tier', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_del',
          status: 'canceled',
          customer: 'cus_5',
          metadata: { userId: 'user_del' },
        },
      },
    });

    const setCalls = setupUpdate();

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    expect(setCalls[0]).toMatchObject({
      subscriptionTier: 'free',
      subscriptionStatus: 'canceled',
    });
  });

  // ------------------------------------------------------------------
  // 12. customer.subscription.deleted: skips when userId missing
  // ------------------------------------------------------------------
  it('customer.subscription.deleted: skips when userId missing', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_del2',
          status: 'canceled',
          customer: 'cus_6',
          metadata: {},
        },
      },
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    expect(mockDb.update).not.toHaveBeenCalled();
  });

  // ------------------------------------------------------------------
  // 13. invoice.payment_failed: downgrades to free
  // ------------------------------------------------------------------
  it('invoice.payment_failed: downgrades to free tier', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: 'invoice.payment_failed',
      data: {
        object: {
          id: 'inv_fail',
          customer: 'cus_7',
          subscription: 'sub_fail',
          subscription_details: { metadata: { userId: 'user_fail' } },
        },
      },
    });

    const setCalls = setupUpdate();

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    expect(setCalls[0]).toMatchObject({
      subscriptionTier: 'free',
      subscriptionStatus: 'past_due',
    });
  });

  // ------------------------------------------------------------------
  // 14. invoice.payment_failed: falls back to DB lookup
  // ------------------------------------------------------------------
  it('invoice.payment_failed: falls back to DB lookup by stripeCustomerId', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: 'invoice.payment_failed',
      data: {
        object: {
          id: 'inv_fail2',
          customer: 'cus_8',
          subscription: 'sub_fail2',
          subscription_details: { metadata: {} },
        },
      },
    });

    // DB lookup returns the user
    setupSelect([{ id: 'user_found' }]);
    const setCalls = setupUpdate();

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    expect(mockDb.select).toHaveBeenCalled();
    expect(setCalls[0]).toMatchObject({
      subscriptionTier: 'free',
      subscriptionStatus: 'past_due',
    });
  });

  // ------------------------------------------------------------------
  // 15. invoice.payment_succeeded: restores tier from priceId
  // ------------------------------------------------------------------
  it('invoice.payment_succeeded: restores tier from priceId', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: 'invoice.payment_succeeded',
      data: {
        object: {
          id: 'inv_ok',
          customer: 'cus_9',
          subscription: 'sub_ok',
          subscription_details: { metadata: { userId: 'user_ok' } },
          lines: { data: [{ price: { id: 'price_pass' } }] },
        },
      },
    });

    mockResolveTierFromPriceId.mockReturnValue('pass');
    const setCalls = setupUpdate();

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    expect(setCalls[0]).toMatchObject({
      subscriptionTier: 'pass',
      subscriptionStatus: 'active',
    });
  });

  // ------------------------------------------------------------------
  // 16. invoice.payment_succeeded: falls back to DB lookup
  // ------------------------------------------------------------------
  it('invoice.payment_succeeded: falls back to DB lookup by stripeCustomerId', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: 'invoice.payment_succeeded',
      data: {
        object: {
          id: 'inv_ok2',
          customer: 'cus_10',
          subscription: 'sub_ok2',
          subscription_details: { metadata: {} },
          lines: { data: [{ price: { id: 'price_lab' } }] },
        },
      },
    });

    setupSelect([{ id: 'user_looked_up' }]);
    mockResolveTierFromPriceId.mockReturnValue('lab');
    const setCalls = setupUpdate();

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    expect(mockDb.select).toHaveBeenCalled();
    expect(setCalls[0]).toMatchObject({
      subscriptionTier: 'lab',
      subscriptionStatus: 'active',
    });
  });

  // ------------------------------------------------------------------
  // 17. subscription.created: grants one-time credits (pass = 300)
  // ------------------------------------------------------------------
  it('customer.subscription.created: grants 300 credits for pass tier', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_grant_pass',
          status: 'active',
          customer: 'cus_grant',
          metadata: { userId: 'user_grant_pass' },
          items: { data: [{ price: { id: 'price_pass' } }] },
          current_period_end: 1700000000,
        },
      },
    });

    mockResolveTierFromPriceId.mockReturnValue('pass');
    setupUpdate();

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    expect(mockEnsureCreditAccount).toHaveBeenCalledWith('user_grant_pass');
    expect(mockApplyCreditDelta).toHaveBeenCalledWith(
      'user_grant_pass',
      300 * 100, // 300 credits * MICRO_PER_CREDIT
      'subscription_grant',
      expect.objectContaining({ tier: 'pass', credits: 300 }),
    );
  });

  // ------------------------------------------------------------------
  // 18. subscription.created: grants one-time credits (lab = 600)
  // ------------------------------------------------------------------
  it('customer.subscription.created: grants 600 credits for lab tier', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_grant_lab',
          status: 'active',
          customer: 'cus_grant2',
          metadata: { userId: 'user_grant_lab' },
          items: { data: [{ price: { id: 'price_lab' } }] },
          current_period_end: 1700000000,
        },
      },
    });

    mockResolveTierFromPriceId.mockReturnValue('lab');
    setupUpdate();

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    expect(mockApplyCreditDelta).toHaveBeenCalledWith(
      'user_grant_lab',
      600 * 100,
      'subscription_grant',
      expect.objectContaining({ tier: 'lab', credits: 600 }),
    );
  });

  // ------------------------------------------------------------------
  // 19. subscription.updated (upgrade): grants incremental credits
  // ------------------------------------------------------------------
  it('customer.subscription.updated: grants incremental 300 credits on pass-to-lab upgrade', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_upgrade',
          status: 'active',
          customer: 'cus_upgrade',
          metadata: { userId: 'user_upgrade' },
          items: { data: [{ price: { id: 'price_lab' } }] },
          current_period_end: 1800000000,
        },
      },
    });

    mockResolveTierFromPriceId.mockReturnValue('lab');
    // Return current tier as 'pass' — simulates pass->lab upgrade
    setupSelect([{ tier: 'pass' }]);
    setupUpdate();

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    // Incremental grant: lab(600) - pass(300) = 300
    expect(mockApplyCreditDelta).toHaveBeenCalledWith(
      'user_upgrade',
      300 * 100,
      'subscription_upgrade_grant',
      expect.objectContaining({ from_tier: 'pass', to_tier: 'lab', credits: 300 }),
    );
  });

  // ------------------------------------------------------------------
  // 20. invoice.payment_succeeded: grants monthly credits
  // ------------------------------------------------------------------
  it('invoice.payment_succeeded: grants monthly 300 credits for pass tier', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: 'invoice.payment_succeeded',
      data: {
        object: {
          id: 'inv_monthly',
          customer: 'cus_monthly',
          subscription: 'sub_monthly',
          subscription_details: { metadata: { userId: 'user_monthly' } },
          lines: { data: [{ price: { id: 'price_pass' } }] },
        },
      },
    });

    mockResolveTierFromPriceId.mockReturnValue('pass');
    setupUpdate();

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    expect(mockEnsureCreditAccount).toHaveBeenCalledWith('user_monthly');
    expect(mockApplyCreditDelta).toHaveBeenCalledWith(
      'user_monthly',
      300 * 100,
      'monthly_grant',
      expect.objectContaining({ tier: 'pass', credits: 300 }),
    );
  });

  // ------------------------------------------------------------------
  // 21. Always returns { received: true } for recognized events
  // ------------------------------------------------------------------
  it('returns { received: true } for recognized events', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_any',
          mode: 'subscription', // subscription mode – no credit processing
          metadata: {},
        },
      },
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
  });
});
