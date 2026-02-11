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
  const clerkGetUser = vi.fn();
  const clerkClientFn = vi.fn().mockResolvedValue({
    users: { getUser: clerkGetUser },
  });
  return { mockDb: db, usersTable: table, mockClerkClient: clerkClientFn, clerkGetUser };
});

const mockLog = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({ log: mockLog }));

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

const setupSelect = (result: unknown[]) => {
  mockDb.select.mockImplementation((_fields?: unknown) => ({
    from: () => ({
      where: () => ({
        limit: async () => result,
      }),
    }),
  }));
};

const setupSelectSequence = (results: unknown[][]) => {
  let callIndex = 0;
  mockDb.select.mockImplementation(() => ({
    from: () => ({
      where: () => ({
        limit: async () => {
          const r = results[callIndex] ?? [];
          callIndex++;
          return r;
        },
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

const setupUpdate = (updated: unknown) => {
  mockDb.update.mockImplementation(() => ({
    set: () => ({
      where: () => ({
        returning: vi.fn().mockResolvedValue([updated]),
      }),
    }),
  }));
};

const loadUsers = async () => import('@/lib/users');

describe('users', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
    mockClerkClient.mockClear();
    // Reset clerkGetUser for each test — hoisted mock reset
  });

  describe('maskEmail', () => {
    it('masks a standard email', async () => {
      const { maskEmail } = await loadUsers();
      expect(maskEmail('kai@oceanheart.ai')).toBe('k***@oceanheart.ai');
    });

    it('masks a short local part', async () => {
      const { maskEmail } = await loadUsers();
      expect(maskEmail('a@b.com')).toBe('a***@b.com');
    });

    it('returns as-is when no @ symbol', async () => {
      const { maskEmail } = await loadUsers();
      expect(maskEmail('noemail')).toBe('noemail');
    });
  });

  describe('ensureUserRecord', () => {
    it('creates a new user when not found', async () => {
      const clerkProfile = {
        emailAddresses: [{ emailAddress: 'kai@oceanheart.ai' }],
        username: 'kai',
        firstName: null,
        lastName: null,
        imageUrl: 'https://img.clerk.com/kai.png',
      };
      mockClerkClient.mockResolvedValue({
        users: { getUser: vi.fn().mockResolvedValue(clerkProfile) },
      });

      setupSelect([]);
      const createdRow = {
        id: 'user_abc',
        email: 'kai@oceanheart.ai',
        displayName: 'kai',
        imageUrl: 'https://img.clerk.com/kai.png',
      };
      setupInsert(createdRow);

      const { ensureUserRecord } = await loadUsers();
      const result = await ensureUserRecord('user_abc');
      expect(result).toEqual(createdRow);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('returns existing user when found and not stale', async () => {
      const existingRow = {
        id: 'user_fresh',
        email: 'fresh@example.com',
        displayName: 'Fresh',
        imageUrl: null,
        updatedAt: new Date(), // just now, not stale
      };
      setupSelect([existingRow]);

      const { ensureUserRecord } = await loadUsers();
      const result = await ensureUserRecord('user_fresh');
      expect(result).toEqual(existingRow);
      // Should NOT call Clerk API or insert
      expect(mockDb.insert).not.toHaveBeenCalled();
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('refreshes profile when stale (>24h old updatedAt)', async () => {
      const staleDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      const staleRow = {
        id: 'user_stale',
        email: 'old@example.com',
        displayName: 'OldName',
        imageUrl: null,
        updatedAt: staleDate,
      };
      setupSelect([staleRow]);

      const updatedRow = {
        id: 'user_stale',
        email: 'new@example.com',
        displayName: 'NewName',
        imageUrl: 'https://img.clerk.com/new.png',
        updatedAt: new Date(),
      };
      setupUpdate(updatedRow);

      mockClerkClient.mockResolvedValue({
        users: {
          getUser: vi.fn().mockResolvedValue({
            emailAddresses: [{ emailAddress: 'new@example.com' }],
            username: 'NewName',
            firstName: null,
            lastName: null,
            imageUrl: 'https://img.clerk.com/new.png',
          }),
        },
      });

      const { ensureUserRecord } = await loadUsers();
      const result = await ensureUserRecord('user_stale');
      expect(result).toEqual(updatedRow);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('handles Clerk API failure gracefully (warns but continues)', async () => {
      // New user, Clerk throws
      setupSelect([]);
      mockClerkClient.mockResolvedValue({
        users: { getUser: vi.fn().mockRejectedValue(new Error('Clerk down')) },
      });

      const createdRow = {
        id: 'user_noclerk',
        email: null,
        displayName: null,
        imageUrl: null,
      };
      setupInsert(createdRow);

      const { ensureUserRecord } = await loadUsers();
      const result = await ensureUserRecord('user_noclerk');
      expect(result).toEqual(createdRow);
      expect(mockLog.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch Clerk profile'),
        expect.any(Error),
        expect.any(Object),
      );
    });

    it('handles concurrent insert race (onConflictDoNothing returns empty, re-reads)', async () => {
      // First select: not found, then insert returns empty (race), then re-read finds row
      const racedRow = {
        id: 'user_raced',
        email: 'raced@example.com',
        displayName: 'Raced',
        imageUrl: null,
      };

      mockClerkClient.mockResolvedValue({
        users: {
          getUser: vi.fn().mockResolvedValue({
            emailAddresses: [{ emailAddress: 'raced@example.com' }],
            username: 'Raced',
            firstName: null,
            lastName: null,
            imageUrl: null,
          }),
        },
      });

      // First select() returns empty (user not found), second returns raced row
      setupSelectSequence([[], [racedRow]]);
      // Insert returns empty (conflict)
      setupInsert(null);

      const { ensureUserRecord } = await loadUsers();
      const result = await ensureUserRecord('user_raced');
      expect(result).toEqual(racedRow);
    });
  });

  describe('getUserDisplayName', () => {
    it('returns displayName when present', async () => {
      setupSelect([{ displayName: 'Kai', email: 'kai@example.com' }]);
      const { getUserDisplayName } = await loadUsers();
      const name = await getUserDisplayName('user_1');
      expect(name).toBe('Kai');
    });

    it('returns masked email when no displayName', async () => {
      setupSelect([{ displayName: null, email: 'kai@oceanheart.ai' }]);
      const { getUserDisplayName } = await loadUsers();
      const name = await getUserDisplayName('user_2');
      expect(name).toBe('k***@oceanheart.ai');
    });

    it('returns truncated ID when no displayName or email', async () => {
      setupSelect([]);
      const { getUserDisplayName } = await loadUsers();
      const name = await getUserDisplayName('user_abcdef1234');
      expect(name).toBe('user_abc...');
    });
  });
});
