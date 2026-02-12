import { beforeEach, describe, expect, it, vi } from 'vitest';

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
    ownerId: 'owner_id',
    archived: 'archived',
  },
  bouts: {
    ownerId: 'owner_id',
    createdAt: 'created_at',
  },
}));

const mockLog = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({ log: mockLog }));

vi.mock('@/lib/admin', () => ({
  isAdmin: (id: string) => id === 'admin-user',
}));

const setupSelect = (result: unknown[]) => {
  mockDb.select.mockImplementation(() => ({
    from: () => ({
      where: () => ({
        limit: async () => result,
      }),
    }),
  }));
};

const setupUpdate = (returning: unknown[] = [{ id: 'test-user' }]) => {
  mockDb.update.mockImplementation(() => ({
    set: () => ({
      where: () => ({
        returning: async () => returning,
      }),
    }),
  }));
};

const loadTier = async () => import('@/lib/tier');

describe('tier module', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.select.mockReset();
    mockDb.update.mockReset();
    process.env.SUBSCRIPTIONS_ENABLED = 'true';
  });

  describe('getUserTier', () => {
    it('returns lab for admin users', async () => {
      const { getUserTier } = await loadTier();
      const tier = await getUserTier('admin-user');
      expect(tier).toBe('lab');
    });

    it('returns lab when subscriptions are disabled', async () => {
      process.env.SUBSCRIPTIONS_ENABLED = 'false';
      const { getUserTier } = await loadTier();
      setupSelect([{ subscriptionTier: 'free' }]);
      const tier = await getUserTier('regular-user');
      expect(tier).toBe('lab');
    });

    it('returns free for users with no subscription', async () => {
      setupSelect([{ subscriptionTier: 'free' }]);
      const { getUserTier } = await loadTier();
      const tier = await getUserTier('regular-user');
      expect(tier).toBe('free');
    });

    it('returns pass for pass subscribers', async () => {
      setupSelect([{ subscriptionTier: 'pass' }]);
      const { getUserTier } = await loadTier();
      const tier = await getUserTier('pass-user');
      expect(tier).toBe('pass');
    });

    it('returns lab for lab subscribers', async () => {
      setupSelect([{ subscriptionTier: 'lab' }]);
      const { getUserTier } = await loadTier();
      const tier = await getUserTier('lab-user');
      expect(tier).toBe('lab');
    });

    it('defaults to free when user record not found', async () => {
      setupSelect([]);
      const { getUserTier } = await loadTier();
      const tier = await getUserTier('unknown-user');
      expect(tier).toBe('free');
    });
  });

  describe('canRunBout', () => {
    // Helper: mock a count query result for getDailyBoutsUsed
    const mockSelectCount = (total: number) => {
      mockDb.select.mockImplementationOnce(() => ({
        from: () => ({
          where: async () => [{ total }],
        }),
      }));
    };

    it('always allows BYOK bouts regardless of tier', async () => {
      setupSelect([{ subscriptionTier: 'free', freeBoutsUsed: 999 }]);
      const { canRunBout } = await loadTier();
      const result = await canRunBout('regular-user', true);
      expect(result.allowed).toBe(true);
    });

    it('blocks free users who exceeded lifetime cap', async () => {
      // First call: getUserTier
      mockDb.select.mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ subscriptionTier: 'free' }],
          }),
        }),
      }));
      // Second call: getFreeBoutsUsed
      mockDb.select.mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ freeBoutsUsed: 15 }],
          }),
        }),
      }));
      // getDailyBoutsUsed won't be reached (lifetime check fails first)

      const { canRunBout } = await loadTier();
      const result = await canRunBout('regular-user', false);
      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.reason).toContain('15 lifetime bouts');
      }
    });

    it('allows free users under lifetime cap and daily limit', async () => {
      // getUserTier
      mockDb.select.mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ subscriptionTier: 'free' }],
          }),
        }),
      }));
      // getFreeBoutsUsed
      mockDb.select.mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ freeBoutsUsed: 5 }],
          }),
        }),
      }));
      // getDailyBoutsUsed
      mockSelectCount(1);

      const { canRunBout } = await loadTier();
      const result = await canRunBout('regular-user', false);
      expect(result.allowed).toBe(true);
    });

    it('blocks free users who hit daily limit', async () => {
      // getUserTier
      mockDb.select.mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ subscriptionTier: 'free' }],
          }),
        }),
      }));
      // getFreeBoutsUsed (under lifetime cap)
      mockDb.select.mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ freeBoutsUsed: 2 }],
          }),
        }),
      }));
      // getDailyBoutsUsed: at daily limit (3 for free tier)
      mockSelectCount(3);

      const { canRunBout } = await loadTier();
      const result = await canRunBout('regular-user', false);
      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.reason).toContain('Daily limit');
        expect(result.reason).toContain('3 bouts/day');
      }
    });

    it('allows pass tier users under daily limit', async () => {
      // getUserTier
      mockDb.select.mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ subscriptionTier: 'pass' }],
          }),
        }),
      }));
      // getDailyBoutsUsed (pass: 15/day)
      mockSelectCount(10);

      const { canRunBout } = await loadTier();
      const result = await canRunBout('pass-user', false);
      expect(result.allowed).toBe(true);
    });

    it('blocks pass tier users at daily limit', async () => {
      // getUserTier
      mockDb.select.mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ subscriptionTier: 'pass' }],
          }),
        }),
      }));
      // getDailyBoutsUsed
      mockSelectCount(15);

      const { canRunBout } = await loadTier();
      const result = await canRunBout('pass-user', false);
      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.reason).toContain('Daily limit');
        expect(result.reason).toContain('15 bouts/day');
      }
    });

    it('allows lab tier users under daily limit', async () => {
      // getUserTier
      mockDb.select.mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ subscriptionTier: 'lab' }],
          }),
        }),
      }));
      // getDailyBoutsUsed
      mockSelectCount(50);

      const { canRunBout } = await loadTier();
      const result = await canRunBout('lab-user', false);
      expect(result.allowed).toBe(true);
    });
  });

  describe('canCreateAgent', () => {
    it('blocks free users at agent limit', async () => {
      setupSelect([{ subscriptionTier: 'free' }]);
      const { canCreateAgent } = await loadTier();
      const result = await canCreateAgent('free-user', 1);
      expect(result.allowed).toBe(false);
    });

    it('allows free users below agent limit', async () => {
      setupSelect([{ subscriptionTier: 'free' }]);
      const { canCreateAgent } = await loadTier();
      const result = await canCreateAgent('free-user', 0);
      expect(result.allowed).toBe(true);
    });

    it('blocks pass users at 5 agents', async () => {
      setupSelect([{ subscriptionTier: 'pass' }]);
      const { canCreateAgent } = await loadTier();
      const result = await canCreateAgent('pass-user', 5);
      expect(result.allowed).toBe(false);
    });

    it('allows pass users below 5 agents', async () => {
      setupSelect([{ subscriptionTier: 'pass' }]);
      const { canCreateAgent } = await loadTier();
      const result = await canCreateAgent('pass-user', 4);
      expect(result.allowed).toBe(true);
    });

    it('always allows lab users', async () => {
      setupSelect([{ subscriptionTier: 'lab' }]);
      const { canCreateAgent } = await loadTier();
      const result = await canCreateAgent('lab-user', 1000);
      expect(result.allowed).toBe(true);
    });
  });

  describe('canAccessModel', () => {
    it('always allows BYOK', async () => {
      const { canAccessModel } = await loadTier();
      expect(canAccessModel('free', 'byok')).toBe(true);
    });

    it('allows free tier to use haiku', async () => {
      const { canAccessModel } = await loadTier();
      expect(canAccessModel('free', 'claude-haiku-4-5-20251001')).toBe(true);
    });

    it('blocks free tier from sonnet', async () => {
      const { canAccessModel } = await loadTier();
      expect(canAccessModel('free', 'claude-sonnet-4-5-20250929')).toBe(false);
    });

    it('blocks free tier from opus', async () => {
      const { canAccessModel } = await loadTier();
      expect(canAccessModel('free', 'claude-opus-4-5-20251101')).toBe(false);
    });

    it('allows pass tier to use sonnet', async () => {
      const { canAccessModel } = await loadTier();
      expect(canAccessModel('pass', 'claude-sonnet-4-5-20250929')).toBe(true);
    });

    it('blocks pass tier from opus', async () => {
      const { canAccessModel } = await loadTier();
      expect(canAccessModel('pass', 'claude-opus-4-5-20251101')).toBe(false);
    });

    it('allows lab tier to use all models', async () => {
      const { canAccessModel } = await loadTier();
      expect(canAccessModel('lab', 'claude-haiku-4-5-20251001')).toBe(true);
      expect(canAccessModel('lab', 'claude-sonnet-4-5-20250929')).toBe(true);
      expect(canAccessModel('lab', 'claude-opus-4-5-20251101')).toBe(true);
      expect(canAccessModel('lab', 'claude-opus-4-6')).toBe(true);
    });

    it('denies unknown models by default (fail-closed)', async () => {
      const { canAccessModel } = await loadTier();
      expect(canAccessModel('free', 'some-future-model')).toBe(false);
    });
  });

  describe('getAvailableModels', () => {
    it('returns only haiku for free tier', async () => {
      const { getAvailableModels } = await loadTier();
      const models = getAvailableModels('free');
      expect(models).toEqual(['claude-haiku-4-5-20251001']);
    });

    it('returns haiku and sonnet for pass tier', async () => {
      const { getAvailableModels } = await loadTier();
      const models = getAvailableModels('pass');
      expect(models).toContain('claude-haiku-4-5-20251001');
      expect(models).toContain('claude-sonnet-4-5-20250929');
      expect(models).not.toContain('claude-opus-4-5-20251101');
    });

    it('returns all models for lab tier', async () => {
      const { getAvailableModels } = await loadTier();
      const models = getAvailableModels('lab');
      expect(models.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('incrementFreeBoutsUsed', () => {
    it('calls update and returns row count', async () => {
      setupUpdate([{ id: 'test-user' }]);
      const { incrementFreeBoutsUsed } = await loadTier();
      const count = await incrementFreeBoutsUsed('test-user');
      expect(mockDb.update).toHaveBeenCalled();
      expect(count).toBe(1);
    });

    it('returns 0 and warns when user not found', async () => {
      setupUpdate([]);
      const { incrementFreeBoutsUsed } = await loadTier();
      const count = await incrementFreeBoutsUsed('missing-user');
      expect(count).toBe(0);
      expect(mockLog.warn).toHaveBeenCalledWith(
        expect.stringContaining('no user found'),
        expect.objectContaining({ userId: 'missing-user' }),
      );
    });
  });

  describe('TIER_CONFIG', () => {
    it('has correct limits for free tier', async () => {
      const { TIER_CONFIG } = await loadTier();
      expect(TIER_CONFIG.free.boutsPerDay).toBe(3);
      expect(TIER_CONFIG.free.lifetimeBoutCap).toBe(15);
      expect(TIER_CONFIG.free.maxAgents).toBe(1);
    });

    it('has correct limits for pass tier', async () => {
      const { TIER_CONFIG } = await loadTier();
      expect(TIER_CONFIG.pass.boutsPerDay).toBe(15);
      expect(TIER_CONFIG.pass.lifetimeBoutCap).toBeNull();
      expect(TIER_CONFIG.pass.maxAgents).toBe(5);
    });

    it('has correct limits for lab tier', async () => {
      const { TIER_CONFIG } = await loadTier();
      expect(TIER_CONFIG.lab.boutsPerDay).toBe(100);
      expect(TIER_CONFIG.lab.lifetimeBoutCap).toBeNull();
      expect(TIER_CONFIG.lab.maxAgents).toBe(Infinity);
    });
  });
});
