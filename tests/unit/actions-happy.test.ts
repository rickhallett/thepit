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
  applyCreditDelta: vi.fn().mockResolvedValue(undefined),
  ensureCreditAccount: vi.fn().mockResolvedValue(undefined),
  CREDITS_ENABLED: false,
  CREDITS_ADMIN_ENABLED: false,
  CREDITS_ADMIN_GRANT: 100,
  MICRO_PER_CREDIT: 100,
}));

vi.mock('@/lib/users', () => ({
  ensureUserRecord: mockEnsureUserRecord,
}));

vi.mock('@/lib/tier', () => ({
  SUBSCRIPTIONS_ENABLED: false,
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
  resolveResponseLength: vi.fn().mockReturnValue({
    id: 'short',
    label: 'Short',
    hint: '2-4 sentences',
    maxOutputTokens: 200,
    outputTokensPerTurn: 120,
  }),
}));

vi.mock('@/lib/response-formats', () => ({
  DEFAULT_RESPONSE_FORMAT: 'spaced',
  resolveResponseFormat: vi.fn().mockReturnValue({
    id: 'spaced',
    label: 'Text + spacing',
    hint: '',
    instruction: '',
  }),
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
  createBout,
  createArenaBout,
  createCreditCheckout,
  archiveAgent,
  restoreAgent,
} from '@/app/actions';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Catch redirect errors and assert the target URL matches a pattern. */
const expectRedirect = async (
  fn: () => Promise<unknown>,
  urlPattern: string | RegExp,
) => {
  try {
    await fn();
    throw new Error('Expected redirect');
  } catch (err: unknown) {
    const error = err as Error & { digest?: string };
    if (error.message === 'NEXT_REDIRECT' && error.digest) {
      expect(error.digest).toMatch(urlPattern);
      return error.digest.replace('NEXT_REDIRECT;', '');
    }
    throw err;
  }
};

/** Build a FormData with multiple key-value pairs. */
const buildFormData = (entries: Record<string, string | string[]>): FormData => {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    if (Array.isArray(value)) {
      for (const v of value) fd.append(key, v);
    } else {
      fd.set(key, value);
    }
  }
  return fd;
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
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
  mockStripe.checkout.sessions.create.mockResolvedValue({ url: null });

  // Env vars
  process.env.STRIPE_SECRET_KEY = 'sk_test_key';
});

// ---------------------------------------------------------------------------
// archiveAgent / restoreAgent — happy paths
// ---------------------------------------------------------------------------
describe('archiveAgent', () => {
  it('archives agent as admin and revalidates path', async () => {
    mockIsAdmin.mockReturnValue(true);
    await archiveAgent('agent-abc');

    expect(mockDb.update).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith('/agents/agent-abc');
  });
});

describe('restoreAgent', () => {
  it('restores agent as admin and revalidates path', async () => {
    mockIsAdmin.mockReturnValue(true);
    await restoreAgent('agent-xyz');

    expect(mockDb.update).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith('/agents/agent-xyz');
  });
});

// ---------------------------------------------------------------------------
// createCreditCheckout
// ---------------------------------------------------------------------------
describe('createCreditCheckout', () => {
  it('redirects to Stripe URL with valid packId', async () => {
    mockStripe.checkout.sessions.create.mockResolvedValue({
      url: 'https://checkout.stripe.com/session_starter',
    });

    // mockGetFormString returns 'starter' when key is 'packId'
    mockGetFormString.mockImplementation(
      (_fd: FormData | undefined | null, key: string) =>
        key === 'packId' ? 'starter' : '',
    );

    await expectRedirect(
      () => createCreditCheckout(buildFormData({ packId: 'starter' })),
      /checkout\.stripe\.com/,
    );

    expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'payment',
        payment_method_types: ['card'],
      }),
    );
  });

  it('throws on invalid packId', async () => {
    mockGetFormString.mockImplementation(
      (_fd: FormData | undefined | null, key: string) =>
        key === 'packId' ? 'nonexistent' : '',
    );

    await expect(
      createCreditCheckout(buildFormData({ packId: 'nonexistent' })),
    ).rejects.toThrow('Invalid credit pack.');
  });

  it('throws when STRIPE_SECRET_KEY is missing', async () => {
    delete process.env.STRIPE_SECRET_KEY;

    mockGetFormString.mockImplementation(
      (_fd: FormData | undefined | null, key: string) =>
        key === 'packId' ? 'starter' : '',
    );

    await expect(
      createCreditCheckout(buildFormData({ packId: 'starter' })),
    ).rejects.toThrow('Payment service unavailable.');
  });

  it('throws when Stripe returns no URL', async () => {
    mockStripe.checkout.sessions.create.mockResolvedValue({ url: null });

    mockGetFormString.mockImplementation(
      (_fd: FormData | undefined | null, key: string) =>
        key === 'packId' ? 'starter' : '',
    );

    await expect(
      createCreditCheckout(buildFormData({ packId: 'starter' })),
    ).rejects.toThrow('Failed to create checkout session.');
  });
});

// ---------------------------------------------------------------------------
// createBout
// ---------------------------------------------------------------------------
describe('createBout', () => {
  it('creates bout with custom topic, model, length, format and redirects', async () => {
    mockGetFormString.mockImplementation(
      (_fd: FormData | undefined | null, key: string) => {
        const values: Record<string, string> = {
          topic: 'AI ethics',
          model: 'gpt-4',
          length: 'long',
          format: 'spaced',
        };
        return values[key] ?? '';
      },
    );

    const fd = buildFormData({
      topic: 'AI ethics',
      model: 'gpt-4',
      length: 'long',
      format: 'spaced',
    });

    const url = await expectRedirect(
      () => createBout('darwin-special', fd),
      /\/bout\/fixed-nanoid-1234567/,
    );

    expect(url).toContain('presetId=darwin-special');
    expect(url).toContain('topic=AI+ethics');
    expect(url).toContain('model=gpt-4');
    expect(url).toContain('length=long');
    expect(url).toContain('format=spaced');
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('redirects unauthenticated user to sign-up', async () => {
    authMock.mockResolvedValue({ userId: null });

    mockGetFormString.mockReturnValue('');

    await expectRedirect(
      () => createBout('darwin-special'),
      /\/sign-up/,
    );

    // No bout should be created for unauthenticated users
    expect(mockDb.insert).not.toHaveBeenCalled();
    expect(mockEnsureUserRecord).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// createArenaBout
// ---------------------------------------------------------------------------
describe('createArenaBout', () => {
  const makeSnapshots = (ids: string[]) =>
    ids.map((id) => ({
      id,
      name: `Agent ${id}`,
      systemPrompt: `Prompt for ${id}`,
      color: '#fff',
      avatar: null,
    }));

  it('creates arena bout with 3 valid agents and redirects', async () => {
    const agentIds = ['agent-1', 'agent-2', 'agent-3'];
    mockGetAgentSnapshots.mockResolvedValue(makeSnapshots(agentIds));

    mockGetFormString.mockImplementation(
      (_fd: FormData | undefined | null, key: string) => {
        const values: Record<string, string> = {
          topic: 'Debate night',
          length: 'standard',
          format: 'spaced',
          model: '',
        };
        return values[key] ?? '';
      },
    );

    const fd = buildFormData({
      agentIds,
      topic: 'Debate night',
      length: 'standard',
      format: 'spaced',
    });

    await expectRedirect(
      () => createArenaBout(fd),
      /\/bout\/fixed-nanoid-1234567/,
    );

    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockGetAgentSnapshots).toHaveBeenCalled();
  });

  it('throws when only 1 agent is selected', async () => {
    mockGetFormString.mockReturnValue('');

    const fd = buildFormData({ agentIds: ['agent-1'] });

    await expect(createArenaBout(fd)).rejects.toThrow(
      'Select between 2 and 6 agents.',
    );
  });

  it('throws when 7 agents are selected', async () => {
    mockGetFormString.mockReturnValue('');

    const ids = Array.from({ length: 7 }, (_, i) => `agent-${i}`);
    const fd = buildFormData({ agentIds: ids });

    await expect(createArenaBout(fd)).rejects.toThrow(
      'Select between 2 and 6 agents.',
    );
  });

  it('throws when agent IDs are not found in snapshots', async () => {
    // Return snapshots that don't include the requested IDs
    mockGetAgentSnapshots.mockResolvedValue(
      makeSnapshots(['other-1', 'other-2']),
    );

    mockGetFormString.mockReturnValue('');

    const fd = buildFormData({
      agentIds: ['missing-1', 'missing-2'],
    });

    await expect(createArenaBout(fd)).rejects.toThrow(
      'One or more agents could not be found.',
    );
  });
});

// ---------------------------------------------------------------------------
// getOrCreateStripeCustomer (tested via createSubscriptionCheckout)
// ---------------------------------------------------------------------------
describe('getOrCreateStripeCustomer (via createSubscriptionCheckout)', () => {
  // We need subscriptions enabled and valid plan for these tests
  // Re-import with SUBSCRIPTIONS_ENABLED=true
  beforeEach(() => {
    process.env.STRIPE_PASS_PRICE_ID = 'price_pass_test';
    process.env.STRIPE_LAB_PRICE_ID = 'price_lab_test';
  });

  it('returns existing stripeCustomerId from DB lookup', async () => {
    // Re-mock tier to enable subscriptions
    const tierModule = await import('@/lib/tier');
    Object.defineProperty(tierModule, 'SUBSCRIPTIONS_ENABLED', {
      value: true,
      writable: true,
    });

    // DB returns user with existing stripeCustomerId
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [
            { stripeCustomerId: 'cus_db_existing', email: 'a@b.com' },
          ],
        }),
      }),
    }));

    mockStripe.checkout.sessions.create.mockResolvedValue({
      url: 'https://checkout.stripe.com/session',
    });

    const { createSubscriptionCheckout } = await import('@/app/actions');

    const fd = buildFormData({ plan: 'pass' });

    await expectRedirect(
      () => createSubscriptionCheckout(fd),
      /checkout\.stripe\.com/,
    );

    // Stripe customer search should NOT be called because DB had the ID
    expect(mockStripe.customers.search).not.toHaveBeenCalled();
    expect(mockStripe.customers.create).not.toHaveBeenCalled();

    // Restore
    Object.defineProperty(tierModule, 'SUBSCRIPTIONS_ENABLED', {
      value: false,
      writable: true,
    });
  });

  it('finds customer via Stripe search and persists to DB', async () => {
    const tierModule = await import('@/lib/tier');
    Object.defineProperty(tierModule, 'SUBSCRIPTIONS_ENABLED', {
      value: true,
      writable: true,
    });

    // DB returns user without stripeCustomerId
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [
            { stripeCustomerId: null, email: 'b@c.com' },
          ],
        }),
      }),
    }));

    // Stripe search finds existing customer
    mockStripe.customers.search.mockResolvedValue({
      data: [{ id: 'cus_stripe_found' }],
    });

    mockStripe.checkout.sessions.create.mockResolvedValue({
      url: 'https://checkout.stripe.com/session_found',
    });

    const { createSubscriptionCheckout } = await import('@/app/actions');

    const fd = buildFormData({ plan: 'pass' });

    await expectRedirect(
      () => createSubscriptionCheckout(fd),
      /checkout\.stripe\.com/,
    );

    expect(mockStripe.customers.search).toHaveBeenCalled();
    expect(mockStripe.customers.create).not.toHaveBeenCalled();
    // Should persist to DB
    expect(mockDb.update).toHaveBeenCalled();

    Object.defineProperty(tierModule, 'SUBSCRIPTIONS_ENABLED', {
      value: false,
      writable: true,
    });
  });

  it('creates new Stripe customer when nothing found', async () => {
    const tierModule = await import('@/lib/tier');
    Object.defineProperty(tierModule, 'SUBSCRIPTIONS_ENABLED', {
      value: true,
      writable: true,
    });

    // DB returns user without stripeCustomerId
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [
            { stripeCustomerId: null, email: 'new@user.com' },
          ],
        }),
      }),
    }));

    // Stripe search returns empty
    mockStripe.customers.search.mockResolvedValue({ data: [] });

    // Stripe creates new customer
    mockStripe.customers.create.mockResolvedValue({ id: 'cus_brand_new' });

    mockStripe.checkout.sessions.create.mockResolvedValue({
      url: 'https://checkout.stripe.com/session_new',
    });

    const { createSubscriptionCheckout } = await import('@/app/actions');

    const fd = buildFormData({ plan: 'pass' });

    await expectRedirect(
      () => createSubscriptionCheckout(fd),
      /checkout\.stripe\.com/,
    );

    expect(mockStripe.customers.search).toHaveBeenCalled();
    expect(mockStripe.customers.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { userId: 'user_test' },
        email: 'new@user.com',
      }),
    );
    // Should persist to DB
    expect(mockDb.update).toHaveBeenCalled();

    Object.defineProperty(tierModule, 'SUBSCRIPTIONS_ENABLED', {
      value: false,
      writable: true,
    });
  });
});
