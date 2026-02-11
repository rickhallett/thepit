import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDb, usersTable, mockClerkClient } = vi.hoisted(() => {
  const table = {
    id: 'id',
    email: 'email',
    displayName: 'display_name',
    imageUrl: 'image_url',
    referralCode: 'referral_code',
    subscriptionTier: 'subscription_tier',
    subscriptionStatus: 'subscription_status',
    subscriptionId: 'subscription_id',
    subscriptionCurrentPeriodEnd: 'subscription_current_period_end',
    stripeCustomerId: 'stripe_customer_id',
    freeBoutsUsed: 'free_bouts_used',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  };
  const db = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  };
  const clerkClientFn = vi.fn().mockResolvedValue({
    users: { getUser: vi.fn() },
  });
  return { mockDb: db, usersTable: table, mockClerkClient: clerkClientFn };
});

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn().mockResolvedValue({ userId: null }),
  clerkClient: mockClerkClient,
}));

vi.mock('@/db', () => ({
  requireDb: () => mockDb,
}));

vi.mock('@/db/schema', () => ({
  users: usersTable,
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

const setupInsert = (created: unknown) => {
  mockDb.insert.mockImplementation(() => ({
    values: vi.fn().mockReturnValue({
      onConflictDoNothing: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(created ? [created] : []),
      }),
    }),
  }));
};

const loadUsers = async () => import('@/lib/users');

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('users edge cases', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
    mockClerkClient.mockClear();
  });

  // U1: maskEmail with empty string
  it('maskEmail with empty string returns empty string', async () => {
    const { maskEmail } = await loadUsers();
    expect(maskEmail('')).toBe('');
  });

  // U2: maskEmail with 1 char before @
  it('maskEmail with 1 char before @ masks correctly', async () => {
    const { maskEmail } = await loadUsers();
    expect(maskEmail('x@y.com')).toBe('x***@y.com');
  });

  // H1: ensureUserRecord constructs displayName from firstName+lastName
  it('ensureUserRecord constructs displayName from firstName+lastName', async () => {
    const clerkProfile = {
      emailAddresses: [{ emailAddress: 'john@example.com' }],
      username: null,
      firstName: 'John',
      lastName: 'Doe',
      imageUrl: null,
    };
    mockClerkClient.mockResolvedValue({
      users: { getUser: vi.fn().mockResolvedValue(clerkProfile) },
    });

    setupSelect([]);
    const createdRow = {
      id: 'user_jd',
      email: 'john@example.com',
      displayName: 'John Doe',
      imageUrl: null,
    };
    setupInsert(createdRow);

    const { ensureUserRecord } = await loadUsers();
    const result = await ensureUserRecord('user_jd');
    expect(result).toEqual(createdRow);
    expect(mockDb.insert).toHaveBeenCalled();
  });

  // U3: getUserDisplayName for non-existent user → truncated ID
  it('getUserDisplayName returns truncated ID for non-existent user', async () => {
    setupSelect([]);
    const { getUserDisplayName } = await loadUsers();
    const name = await getUserDisplayName('user_nonexistent_long_id');
    expect(name).toBe('user_non...');
  });
});
