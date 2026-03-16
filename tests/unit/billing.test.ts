import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const {
  mockDb,
  mockApplyCreditDelta,
  mockEnsureCreditAccount,
  mockResolveTierFromPriceId,
  mockServerTrack,
  mockServerIdentify,
} = vi.hoisted(() => {
  const db = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  };

  return {
    mockDb: db,
    mockApplyCreditDelta: vi.fn().mockResolvedValue(undefined),
    mockEnsureCreditAccount: vi.fn().mockResolvedValue(undefined),
    mockResolveTierFromPriceId: vi.fn(),
    mockServerTrack: vi.fn().mockResolvedValue(undefined),
    mockServerIdentify: vi.fn().mockResolvedValue(undefined),
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

vi.mock('@/lib/posthog-server', () => ({
  serverTrack: mockServerTrack,
  serverIdentify: mockServerIdentify,
}));

// ---------------------------------------------------------------------------
// Import billing functions under test (AFTER mocks are registered)
// ---------------------------------------------------------------------------
import {
  handleCheckoutCompleted,
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaymentFailed,
  handleInvoicePaymentSucceeded,
} from '@/lib/billing';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Configure mockDb.select to return chainable query resolving to `rows`.
 *  When called with an array of arrays, each call returns the next set of rows. */
const setupSelect = (rows: unknown[] | unknown[][]) => {
  if (Array.isArray(rows[0])) {
    let callIndex = 0;
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: async () => (rows as unknown[][])[callIndex++] ?? [],
        }),
      }),
    }));
  } else {
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: async () => rows,
        }),
      }),
    }));
  }
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
describe('lib/billing', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockApplyCreditDelta.mockResolvedValue(undefined);
    mockEnsureCreditAccount.mockResolvedValue(undefined);
    mockServerTrack.mockResolvedValue(undefined);
    mockServerIdentify.mockResolvedValue(undefined);
    setupSelect([]);
    setupUpdate();
  });

  // ---- handleCheckoutCompleted ----
  describe('handleCheckoutCompleted', () => {
    it('credits user on one-time payment', async () => {
      setupSelect([]);
      await handleCheckoutCompleted({
        id: 'cs_1',
        mode: 'payment',
        metadata: { userId: 'u1', credits: '50' },
        amount_total: 500,
        currency: 'gbp',
      } as unknown as Parameters<typeof handleCheckoutCompleted>[0]);

      expect(mockEnsureCreditAccount).toHaveBeenCalledWith('u1');
      expect(mockApplyCreditDelta).toHaveBeenCalledWith(
        'u1',
        5000,
        'purchase',
        { referenceId: 'cs_1', credits: 50 },
      );
    });

    it('skips subscription-mode checkouts', async () => {
      await handleCheckoutCompleted({
        id: 'cs_2',
        mode: 'subscription',
        metadata: { userId: 'u2', credits: '50' },
      } as unknown as Parameters<typeof handleCheckoutCompleted>[0]);

      expect(mockApplyCreditDelta).not.toHaveBeenCalled();
    });

    it('skips duplicate sessions (idempotent)', async () => {
      setupSelect([{ id: 1 }]);
      await handleCheckoutCompleted({
        id: 'cs_dup',
        mode: 'payment',
        metadata: { userId: 'u_dup', credits: '10' },
      } as unknown as Parameters<typeof handleCheckoutCompleted>[0]);

      expect(mockApplyCreditDelta).not.toHaveBeenCalled();
    });
  });

  // ---- handleSubscriptionCreated ----
  describe('handleSubscriptionCreated', () => {
    it('updates tier and grants pass credits', async () => {
      mockResolveTierFromPriceId.mockReturnValue('pass');
      setupSelect([]);
      const setCalls = setupUpdate();

      await handleSubscriptionCreated({
        id: 'sub_1',
        status: 'active',
        customer: 'cus_1',
        metadata: { userId: 'u1' },
        items: { data: [{ price: { id: 'price_pass' } }] },
        current_period_end: 1700000000,
      });

      expect(setCalls[0]).toMatchObject({ subscriptionTier: 'pass' });
      expect(mockApplyCreditDelta).toHaveBeenCalledWith(
        'u1',
        30000,
        'subscription_grant',
        expect.objectContaining({
          referenceId: 'sub_1:subscription_grant',
          tier: 'pass',
          credits: 300,
        }),
      );
    });

    it('grants lab credits (600)', async () => {
      mockResolveTierFromPriceId.mockReturnValue('lab');
      setupSelect([]);
      setupUpdate();

      await handleSubscriptionCreated({
        id: 'sub_lab',
        status: 'active',
        customer: 'cus_lab',
        metadata: { userId: 'u_lab' },
        items: { data: [{ price: { id: 'price_lab' } }] },
      });

      expect(mockApplyCreditDelta).toHaveBeenCalledWith(
        'u_lab',
        60000,
        'subscription_grant',
        expect.objectContaining({ credits: 600 }),
      );
    });

    it('skips when userId is missing', async () => {
      await handleSubscriptionCreated({
        id: 'sub_noid',
        status: 'active',
        customer: 'cus_noid',
        metadata: {},
        items: { data: [{ price: { id: 'price_pass' } }] },
      });

      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('skips when price is unrecognized', async () => {
      mockResolveTierFromPriceId.mockReturnValue(null);
      await handleSubscriptionCreated({
        id: 'sub_unknown',
        status: 'active',
        customer: 'cus_unknown',
        metadata: { userId: 'u_unknown' },
        items: { data: [{ price: { id: 'price_x' } }] },
      });

      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('calls serverIdentify with current_tier', async () => {
      mockResolveTierFromPriceId.mockReturnValue('pass');
      setupSelect([]);
      setupUpdate();

      await handleSubscriptionCreated({
        id: 'sub_ph',
        status: 'active',
        customer: 'cus_ph',
        metadata: { userId: 'u_ph' },
        items: { data: [{ price: { id: 'price_pass' } }] },
      });

      expect(mockServerIdentify).toHaveBeenCalledWith('u_ph', { current_tier: 'pass' });
    });
  });

  // ---- handleSubscriptionUpdated ----
  describe('handleSubscriptionUpdated', () => {
    it('grants incremental credits on upgrade', async () => {
      mockResolveTierFromPriceId.mockReturnValue('lab');
      setupSelect([[{ tier: 'pass' }], []]);
      setupUpdate();

      await handleSubscriptionUpdated({
        id: 'sub_upg',
        status: 'active',
        customer: 'cus_upg',
        metadata: { userId: 'u_upg' },
        items: { data: [{ price: { id: 'price_lab' } }] },
      });

      expect(mockApplyCreditDelta).toHaveBeenCalledWith(
        'u_upg',
        30000, // lab(600) - pass(300) = 300 credits
        'subscription_upgrade_grant',
        expect.objectContaining({
          referenceId: 'sub_upg:upgrade_grant:pass:lab',
          from_tier: 'pass',
          to_tier: 'lab',
        }),
      );
    });

    it('does not grant credits on downgrade', async () => {
      mockResolveTierFromPriceId.mockReturnValue('pass');
      setupSelect([[{ tier: 'lab' }], []]);
      setupUpdate();

      await handleSubscriptionUpdated({
        id: 'sub_down',
        status: 'active',
        customer: 'cus_down',
        metadata: { userId: 'u_down' },
        items: { data: [{ price: { id: 'price_pass' } }] },
      });

      expect(mockApplyCreditDelta).not.toHaveBeenCalled();
      // But tier update still happens
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('tracks downgrade event in analytics', async () => {
      mockResolveTierFromPriceId.mockReturnValue('pass');
      setupSelect([[{ tier: 'lab' }], []]);
      setupUpdate();

      await handleSubscriptionUpdated({
        id: 'sub_down2',
        status: 'active',
        customer: 'cus_down2',
        metadata: { userId: 'u_down2' },
        items: { data: [{ price: { id: 'price_pass' } }] },
      });

      expect(mockServerTrack).toHaveBeenCalledWith(
        'u_down2',
        'subscription_downgraded',
        expect.objectContaining({
          from_tier: 'lab',
          to_tier: 'pass',
        }),
      );
    });
  });

  // ---- handleSubscriptionDeleted ----
  describe('handleSubscriptionDeleted', () => {
    it('downgrades to free', async () => {
      const setCalls = setupUpdate();
      await handleSubscriptionDeleted({
        id: 'sub_del',
        status: 'canceled',
        customer: 'cus_del',
        metadata: { userId: 'u_del' },
      });

      expect(setCalls[0]).toMatchObject({
        subscriptionTier: 'free',
        subscriptionStatus: 'canceled',
      });
    });

    it('skips when userId is missing', async () => {
      await handleSubscriptionDeleted({
        id: 'sub_del2',
        status: 'canceled',
        customer: 'cus_del2',
        metadata: {},
      });

      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('identifies user as free tier in PostHog', async () => {
      setupUpdate();
      await handleSubscriptionDeleted({
        id: 'sub_del_ph',
        status: 'canceled',
        customer: 'cus_del_ph',
        metadata: { userId: 'u_del_ph' },
      });

      expect(mockServerIdentify).toHaveBeenCalledWith('u_del_ph', { current_tier: 'free' });
    });
  });

  // ---- handleInvoicePaymentFailed ----
  describe('handleInvoicePaymentFailed', () => {
    it('downgrades to free on payment failure', async () => {
      const setCalls = setupUpdate();
      await handleInvoicePaymentFailed({
        id: 'inv_fail',
        customer: 'cus_fail',
        subscription: 'sub_fail',
        subscription_details: { metadata: { userId: 'u_fail' } },
      });

      expect(setCalls[0]).toMatchObject({
        subscriptionTier: 'free',
        subscriptionStatus: 'past_due',
      });
    });

    it('falls back to DB lookup by stripeCustomerId', async () => {
      setupSelect([{ id: 'u_found' }]);
      const setCalls = setupUpdate();

      await handleInvoicePaymentFailed({
        id: 'inv_fail2',
        customer: 'cus_lookup',
        subscription: 'sub_fail2',
        subscription_details: { metadata: {} },
      });

      expect(mockDb.select).toHaveBeenCalled();
      expect(setCalls[0]).toMatchObject({
        subscriptionTier: 'free',
        subscriptionStatus: 'past_due',
      });
    });

    it('skips when no userId and no DB match', async () => {
      setupSelect([]);
      await handleInvoicePaymentFailed({
        id: 'inv_fail3',
        customer: 'cus_ghost',
        subscription: 'sub_fail3',
        subscription_details: { metadata: {} },
      });

      expect(mockDb.update).not.toHaveBeenCalled();
    });
  });

  // ---- handleInvoicePaymentSucceeded ----
  describe('handleInvoicePaymentSucceeded', () => {
    it('restores tier on payment success', async () => {
      mockResolveTierFromPriceId.mockReturnValue('pass');
      const setCalls = setupUpdate();

      await handleInvoicePaymentSucceeded({
        id: 'inv_ok',
        customer: 'cus_ok',
        subscription: 'sub_ok',
        subscription_details: { metadata: { userId: 'u_ok' } },
        lines: { data: [{ price: { id: 'price_pass' } }] },
      });

      expect(setCalls[0]).toMatchObject({
        subscriptionTier: 'pass',
        subscriptionStatus: 'active',
      });
    });

    it('grants monthly credits on renewal', async () => {
      mockResolveTierFromPriceId.mockReturnValue('pass');
      setupSelect([]);
      setupUpdate();

      await handleInvoicePaymentSucceeded({
        id: 'inv_renew',
        customer: 'cus_renew',
        subscription: 'sub_renew',
        billing_reason: 'subscription_cycle',
        subscription_details: { metadata: { userId: 'u_renew' } },
        lines: { data: [{ price: { id: 'price_pass' } }] },
      });

      expect(mockEnsureCreditAccount).toHaveBeenCalledWith('u_renew');
      expect(mockApplyCreditDelta).toHaveBeenCalledWith(
        'u_renew',
        30000,
        'monthly_grant',
        expect.objectContaining({
          referenceId: 'inv_renew:monthly_grant',
          tier: 'pass',
          credits: 300,
        }),
      );
    });

    it('skips monthly grant on initial subscribe', async () => {
      mockResolveTierFromPriceId.mockReturnValue('pass');
      setupUpdate();

      await handleInvoicePaymentSucceeded({
        id: 'inv_init',
        customer: 'cus_init',
        subscription: 'sub_init',
        billing_reason: 'subscription_create',
        subscription_details: { metadata: { userId: 'u_init' } },
        lines: { data: [{ price: { id: 'price_pass' } }] },
      });

      expect(mockApplyCreditDelta).not.toHaveBeenCalled();
    });

    it('skips duplicate monthly grant', async () => {
      mockResolveTierFromPriceId.mockReturnValue('lab');
      setupSelect([{ id: 1 }]);
      setupUpdate();

      await handleInvoicePaymentSucceeded({
        id: 'inv_dup',
        customer: 'cus_dup',
        subscription: 'sub_dup',
        billing_reason: 'subscription_cycle',
        subscription_details: { metadata: { userId: 'u_dup' } },
        lines: { data: [{ price: { id: 'price_lab' } }] },
      });

      expect(mockApplyCreditDelta).not.toHaveBeenCalled();
    });
  });

  // ---- Analytics resilience (PostHog failures) ----
  describe('analytics resilience', () => {
    it('handleSubscriptionCreated succeeds when PostHog throws', async () => {
      mockResolveTierFromPriceId.mockReturnValue('pass');
      setupSelect([]);
      setupUpdate();
      mockServerTrack.mockRejectedValue(new Error('PostHog down'));
      mockServerIdentify.mockRejectedValue(new Error('PostHog down'));

      // Should not throw
      await handleSubscriptionCreated({
        id: 'sub_ph_fail',
        status: 'active',
        customer: 'cus_ph_fail',
        metadata: { userId: 'u_ph_fail' },
        items: { data: [{ price: { id: 'price_pass' } }] },
      });

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockApplyCreditDelta).toHaveBeenCalled();
    });

    it('handleSubscriptionDeleted succeeds when PostHog throws', async () => {
      setupUpdate();
      mockServerTrack.mockRejectedValue(new Error('PostHog down'));
      mockServerIdentify.mockRejectedValue(new Error('PostHog down'));

      await handleSubscriptionDeleted({
        id: 'sub_del_ph_fail',
        status: 'canceled',
        customer: 'cus_del_ph_fail',
        metadata: { userId: 'u_del_ph_fail' },
      });

      expect(mockDb.update).toHaveBeenCalled();
    });

    it('handleInvoicePaymentFailed succeeds when PostHog throws', async () => {
      setupUpdate();
      mockServerTrack.mockRejectedValue(new Error('PostHog down'));
      mockServerIdentify.mockRejectedValue(new Error('PostHog down'));

      await handleInvoicePaymentFailed({
        id: 'inv_fail_ph',
        customer: 'cus_fail_ph',
        subscription: 'sub_fail_ph',
        subscription_details: { metadata: { userId: 'u_fail_ph' } },
      });

      expect(mockDb.update).toHaveBeenCalled();
    });
  });
});
