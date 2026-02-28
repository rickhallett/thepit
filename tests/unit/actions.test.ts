import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const {
  authMock,
  mockDb,
  mockStripe,
  mockRedirect,
  mockRevalidatePath,
  mockIsAdmin,
  mockEnsureUserRecord,
  mockApplyCreditDelta,
  mockGetAgentSnapshots,
  mockGetFormString,
} = vi.hoisted(() => {
  const authFn = vi.fn();
  const db = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  };

  const stripe = {
    checkout: {
      sessions: { create: vi.fn() },
    },
    customers: {
      search: vi.fn(),
      create: vi.fn(),
    },
    billingPortal: {
      sessions: { create: vi.fn() },
    },
  };

  const redirectFn = vi.fn().mockImplementation((url: string) => {
    throw Object.assign(new Error('NEXT_REDIRECT'), {
      digest: `NEXT_REDIRECT;${url}`,
    });
  });

  const revalidatePathFn = vi.fn();
  const isAdminFn = vi.fn();
  const ensureUserRecordFn = vi.fn().mockResolvedValue(undefined);
  const applyCreditDeltaFn = vi.fn().mockResolvedValue(undefined);
  const getAgentSnapshotsFn = vi.fn().mockResolvedValue([]);
  const getFormStringFn = vi.fn().mockReturnValue('');

  return {
    authMock: authFn,
    mockDb: db,
    mockStripe: stripe,
    mockRedirect: redirectFn,
    mockRevalidatePath: revalidatePathFn,
    mockIsAdmin: isAdminFn,
    mockEnsureUserRecord: ensureUserRecordFn,
    mockApplyCreditDelta: applyCreditDeltaFn,
    mockGetAgentSnapshots: getAgentSnapshotsFn,
    mockGetFormString: getFormStringFn,
  };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
vi.mock('@clerk/nextjs/server', () => ({
  auth: authMock,
}));

vi.mock('@/db', () => ({
  requireDb: () => mockDb,
}));

vi.mock('@/db/schema', () => ({
  agents: {
    id: 'id',
    archived: 'archived',
  },
  bouts: {
    id: 'id',
    presetId: 'preset_id',
    status: 'status',
    transcript: 'transcript',
    ownerId: 'owner_id',
    topic: 'topic',
    responseLength: 'response_length',
    responseFormat: 'response_format',
    agentLineup: 'agent_lineup',
  },
  users: {
    id: 'id',
    email: 'email',
    stripeCustomerId: 'stripe_customer_id',
    updatedAt: 'updated_at',
  },
}));

vi.mock('@/lib/stripe', () => ({
  stripe: mockStripe,
}));

vi.mock('@/lib/credits', () => ({
  applyCreditDelta: mockApplyCreditDelta,
  ensureCreditAccount: vi.fn().mockResolvedValue(undefined),
  CREDITS_ENABLED: true,
  CREDITS_ADMIN_ENABLED: true,
  CREDITS_ADMIN_GRANT: 100,
  MICRO_PER_CREDIT: 100,
}));

vi.mock('@/lib/users', () => ({
  ensureUserRecord: mockEnsureUserRecord,
}));

vi.mock('@/lib/tier', () => ({
  SUBSCRIPTIONS_ENABLED: true,
}));

vi.mock('@/lib/presets', () => {
  const presets = [
    { id: 'darwin-special', name: 'Darwin', agents: [], maxTurns: 12, tier: 'free' },
    { id: 'arena', name: 'Arena', agents: [], maxTurns: 12, tier: 'free' },
  ];
  const presetMap = new Map(presets.map((p) => [p.id, p]));
  return {
    PRESETS: presets,
    ARENA_PRESET_ID: 'arena',
    getPresetById: (id: string) => presetMap.get(id),
  };
});

vi.mock('@/lib/credit-catalog', () => ({
  CREDIT_PACKAGES: [
    { id: 'starter', name: 'Starter', priceGbp: 3, bonusPercent: 0, credits: 300 },
  ],
}));

vi.mock('@/lib/admin', () => ({
  isAdmin: mockIsAdmin,
}));

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}));

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock('@/lib/agent-registry', () => ({
  getAgentSnapshots: mockGetAgentSnapshots,
}));

vi.mock('@/lib/response-lengths', () => ({
  DEFAULT_RESPONSE_LENGTH: 'short',
  resolveResponseLength: vi.fn().mockReturnValue({ id: 'short', label: 'Short', hint: '2-4 sentences', maxOutputTokens: 200, outputTokensPerTurn: 120 }),
}));

vi.mock('@/lib/response-formats', () => ({
  DEFAULT_RESPONSE_FORMAT: 'spaced',
  resolveResponseFormat: vi.fn().mockReturnValue({ id: 'spaced', label: 'Text + spacing', hint: '', instruction: '' }),
}));

vi.mock('@/lib/form-utils', () => ({
  getFormString: mockGetFormString,
}));

vi.mock('nanoid', () => ({
  nanoid: () => 'fixed-nanoid-1234567',
}));

vi.mock('@/lib/env', () => ({
  env: { DEMO_MODE_ENABLED: false },
}));

// ---------------------------------------------------------------------------
// Import the server actions under test (AFTER mocks)
// ---------------------------------------------------------------------------
import {
  createSubscriptionCheckout,
  createBillingPortal,
  createBout,
  archiveAgent,
  restoreAgent,
} from '@/app/actions';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Catch redirect errors and return the target URL. */
const catchRedirect = async (fn: () => Promise<unknown>): Promise<string> => {
  try {
    await fn();
    throw new Error('Expected redirect to throw');
  } catch (err: unknown) {
    const error = err as Error & { digest?: string };
    if (error.message === 'NEXT_REDIRECT' && error.digest) {
      return error.digest.replace('NEXT_REDIRECT;', '');
    }
    throw err;
  }
};

/** Build a FormData with a single key-value pair. */
const formWith = (key: string, value: string): FormData => {
  const fd = new FormData();
  fd.set(key, value);
  return fd;
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: 'user_test' });
    mockIsAdmin.mockReturnValue(false);

    // Default DB mocks
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [],
        }),
      }),
    }));

    const mockValues = vi.fn().mockResolvedValue(undefined);
    mockDb.insert.mockReturnValue({ values: mockValues });
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });

    // Stripe defaults
    mockStripe.customers.search.mockResolvedValue({ data: [] });
    mockStripe.customers.create.mockResolvedValue({ id: 'cus_new' });

    // Env vars for subscription checkout
    process.env.STRIPE_PASS_PRICE_ID = 'price_pass_test';
    process.env.STRIPE_LAB_PRICE_ID = 'price_lab_test';
    process.env.STRIPE_SECRET_KEY = 'sk_test_key';
  });

  // ================================================================
  // createSubscriptionCheckout
  // ================================================================
  describe('createSubscriptionCheckout', () => {
    it('throws when subscriptions disabled', async () => {
      // Re-mock tier to disable subscriptions for this test
      const tierModule = await import('@/lib/tier');
      Object.defineProperty(tierModule, 'SUBSCRIPTIONS_ENABLED', { value: false, writable: true });

      await expect(
        createSubscriptionCheckout(formWith('plan', 'pass')),
      ).rejects.toThrow('Subscriptions not enabled.');

      // Restore
      Object.defineProperty(tierModule, 'SUBSCRIPTIONS_ENABLED', { value: true, writable: true });
    });

    it('throws on invalid plan', async () => {
      await expect(
        createSubscriptionCheckout(formWith('plan', 'invalid')),
      ).rejects.toThrow('Invalid plan.');
    });

    it('throws when price env not set', async () => {
      delete process.env.STRIPE_PASS_PRICE_ID;
      await expect(
        createSubscriptionCheckout(formWith('plan', 'pass')),
      ).rejects.toThrow('Subscription plan not configured.');
    });

    it('redirects to sign-in when not authenticated', async () => {
      authMock.mockResolvedValue({ userId: null });
      const url = await catchRedirect(() =>
        createSubscriptionCheckout(formWith('plan', 'pass')),
      );
      expect(url).toMatch(/sign-in/);
    });

    it('redirects to Stripe checkout for valid pass plan', async () => {
      mockStripe.checkout.sessions.create.mockResolvedValue({
        url: 'https://checkout.stripe.com/session_pass',
      });

      // DB returns existing user with stripeCustomerId
      mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ stripeCustomerId: 'cus_existing', email: 'a@b.com' }],
          }),
        }),
      }));

      const url = await catchRedirect(() =>
        createSubscriptionCheckout(formWith('plan', 'pass')),
      );
      expect(url).toBe('https://checkout.stripe.com/session_pass');
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'subscription',
          line_items: [{ price: 'price_pass_test', quantity: 1 }],
        }),
      );
    });

    it('redirects to Stripe checkout for valid lab plan', async () => {
      mockStripe.checkout.sessions.create.mockResolvedValue({
        url: 'https://checkout.stripe.com/session_lab',
      });

      mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ stripeCustomerId: 'cus_lab', email: 'lab@b.com' }],
          }),
        }),
      }));

      const url = await catchRedirect(() =>
        createSubscriptionCheckout(formWith('plan', 'lab')),
      );
      expect(url).toBe('https://checkout.stripe.com/session_lab');
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [{ price: 'price_lab_test', quantity: 1 }],
        }),
      );
    });
  });

  // ================================================================
  // createBillingPortal
  // ================================================================
  describe('createBillingPortal', () => {
    it('throws when subscriptions disabled', async () => {
      const tierModule = await import('@/lib/tier');
      Object.defineProperty(tierModule, 'SUBSCRIPTIONS_ENABLED', { value: false, writable: true });

      await expect(createBillingPortal()).rejects.toThrow(
        'Subscriptions not enabled.',
      );

      Object.defineProperty(tierModule, 'SUBSCRIPTIONS_ENABLED', { value: true, writable: true });
    });

    it('redirects to sign-in when not authenticated', async () => {
      authMock.mockResolvedValue({ userId: null });
      const url = await catchRedirect(() => createBillingPortal());
      expect(url).toMatch(/sign-in/);
    });

    it('redirects to Stripe billing portal', async () => {
      mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ stripeCustomerId: 'cus_portal', email: 'x@y.com' }],
          }),
        }),
      }));

      mockStripe.billingPortal.sessions.create.mockResolvedValue({
        url: 'https://billing.stripe.com/portal',
      });

      const url = await catchRedirect(() => createBillingPortal());
      expect(url).toBe('https://billing.stripe.com/portal');
    });
  });

  // ================================================================
  // createBout
  // ================================================================
  describe('createBout', () => {
    it('redirects to /arena on invalid preset', async () => {
      const url = await catchRedirect(() => createBout('nonexistent-preset'));
      expect(url).toContain('/arena');
    });

    it('creates bout and redirects to bout page', async () => {
      const url = await catchRedirect(() => createBout('darwin-special'));
      expect(url).toContain('/bout/fixed-nanoid-1234567');
      expect(url).toContain('presetId=darwin-special');
      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'id', presetId: 'preset_id' }),
      );
    });
  });

  // ================================================================
  // createBout — demo mode
  // ================================================================
  describe('createBout — demo mode', () => {
    it('redirects unauthenticated user to sign-up when demo mode is off', async () => {
      authMock.mockResolvedValue({ userId: null });
      const url = await catchRedirect(() => createBout('darwin-special'));
      expect(url).toContain('/sign-up');
    });

    it('allows unauthenticated bout creation when demo mode is on', async () => {
      authMock.mockResolvedValue({ userId: null });
      const envModule = await import('@/lib/env');
      Object.defineProperty(envModule.env, 'DEMO_MODE_ENABLED', { value: true, writable: true });

      const url = await catchRedirect(() => createBout('darwin-special'));
      expect(url).toContain('/bout/fixed-nanoid-1234567');
      expect(mockDb.insert).toHaveBeenCalled();
      // Verify ownerId is null for anonymous demo bout
      const insertCall = mockDb.insert.mock.results[0];
      const valuesCall = insertCall?.value?.values;
      if (valuesCall) {
        expect(valuesCall).toHaveBeenCalledWith(
          expect.objectContaining({ ownerId: null }),
        );
      }
      // ensureUserRecord should NOT be called for anonymous users
      expect(mockEnsureUserRecord).not.toHaveBeenCalled();

      Object.defineProperty(envModule.env, 'DEMO_MODE_ENABLED', { value: false, writable: true });
    });

    it('still calls ensureUserRecord for authenticated users in demo mode', async () => {
      authMock.mockResolvedValue({ userId: 'user_test' });
      const envModule = await import('@/lib/env');
      Object.defineProperty(envModule.env, 'DEMO_MODE_ENABLED', { value: true, writable: true });

      const url = await catchRedirect(() => createBout('darwin-special'));
      expect(url).toContain('/bout/fixed-nanoid-1234567');
      expect(mockEnsureUserRecord).toHaveBeenCalledWith('user_test');

      Object.defineProperty(envModule.env, 'DEMO_MODE_ENABLED', { value: false, writable: true });
    });
  });

  // ================================================================
  // archiveAgent / restoreAgent
  // ================================================================
  describe('archiveAgent', () => {
    it('throws Unauthorized when not admin', async () => {
      mockIsAdmin.mockReturnValue(false);
      await expect(archiveAgent('agent_1')).rejects.toThrow('Unauthorized.');
    });
  });

  describe('restoreAgent', () => {
    it('throws Unauthorized when not admin', async () => {
      mockIsAdmin.mockReturnValue(false);
      await expect(restoreAgent('agent_1')).rejects.toThrow('Unauthorized.');
    });
  });
});
