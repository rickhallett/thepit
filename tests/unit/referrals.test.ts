import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDb, usersTable, referralsTable, mockClaimIntroCredits, mockNanoid } = vi.hoisted(() => {
  const users = {
    id: 'id',
    referralCode: 'referral_code',
    email: 'email',
    updatedAt: 'updated_at',
  };
  const referrals = {
    id: 'id',
    referrerId: 'referrer_id',
    referredId: 'referred_id',
    code: 'code',
    credited: 'credited',
    createdAt: 'created_at',
  };
  const db = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  };
  const claimIntroCredits = vi.fn();
  const nanoid = vi.fn();
  return { mockDb: db, usersTable: users, referralsTable: referrals, mockClaimIntroCredits: claimIntroCredits, mockNanoid: nanoid };
});

vi.mock('@/db', () => ({
  requireDb: () => mockDb,
}));

vi.mock('@/db/schema', () => ({
  users: usersTable,
  referrals: referralsTable,
}));

vi.mock('@/lib/intro-pool', () => ({
  claimIntroCredits: mockClaimIntroCredits,
  INTRO_REFERRAL_CREDITS: 50,
}));

vi.mock('nanoid', () => ({
  nanoid: mockNanoid,
}));

vi.mock('@/lib/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const loadReferrals = async () => import('@/lib/referrals');

describe('referrals', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
    mockClaimIntroCredits.mockReset();
    mockNanoid.mockReset();
    mockNanoid.mockReturnValue('abcd1234');
  });

  describe('ensureReferralCode', () => {
    it('H1: generates code for user without one', async () => {
      // Select returns user with no referral code
      mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: vi.fn().mockResolvedValue([{ referralCode: null }]),
          }),
        }),
      }));

      // Update succeeds (no collision)
      mockDb.update.mockImplementation(() => ({
        set: () => ({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }));

      const { ensureReferralCode } = await loadReferrals();
      const code = await ensureReferralCode('user-1');

      expect(code).toBe('abcd1234');
      expect(mockNanoid).toHaveBeenCalledWith(8);
      expect(mockDb.update).toHaveBeenCalledWith(usersTable);
    });

    it('H2: returns existing code', async () => {
      mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: vi.fn().mockResolvedValue([{ referralCode: 'existcode' }]),
          }),
        }),
      }));

      const { ensureReferralCode } = await loadReferrals();
      const code = await ensureReferralCode('user-2');

      expect(code).toBe('existcode');
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('U5: code collision retry — regenerates on DB error', async () => {
      mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: vi.fn().mockResolvedValue([{ referralCode: null }]),
          }),
        }),
      }));

      // First attempt throws (unique constraint violation), second succeeds
      let attempt = 0;
      mockDb.update.mockImplementation(() => ({
        set: () => ({
          where: vi.fn().mockImplementation(() => {
            attempt += 1;
            if (attempt === 1) {
              throw new Error('unique_violation');
            }
            return Promise.resolve(undefined);
          }),
        }),
      }));

      mockNanoid.mockReturnValueOnce('collided').mockReturnValueOnce('unique99');

      const { ensureReferralCode } = await loadReferrals();
      const code = await ensureReferralCode('user-3');

      // nanoid called twice: initial 'collided' + retry 'unique99' after catch
      expect(mockNanoid).toHaveBeenCalledTimes(2);
      expect(code).toBe('unique99');
    });

    it('B5: throws if user does not exist in database', async () => {
      // Select returns empty array (user not found)
      mockDb.select.mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }));

      const { ensureReferralCode } = await loadReferrals();
      await expect(ensureReferralCode('nonexistent-user')).rejects.toThrow(
        'User not found',
      );
      expect(mockDb.update).not.toHaveBeenCalled();
    });
  });

  describe('applyReferralBonus', () => {
    const setupSelectChain = (results: Record<string, unknown[]>) => {
      let callCount = 0;
      mockDb.select.mockImplementation(() => ({
        from: (table: unknown) => {
          callCount += 1;
          const key = table === referralsTable ? 'referrals' :
            table === usersTable ? 'users' : `unknown-${callCount}`;
          return {
            where: () => ({
              limit: vi.fn().mockResolvedValue(results[key] ?? []),
            }),
          };
        },
      }));
    };

    it('H3: valid code → credits both parties', async () => {
      setupSelectChain({
        referrals: [], // no existing referral
        users: [{ id: 'referrer-1' }], // referrer found
      });

      mockDb.insert.mockImplementation(() => ({
        values: vi.fn().mockResolvedValue(undefined),
      }));

      mockClaimIntroCredits.mockResolvedValue({
        claimedMicro: 5_000,
        remainingMicro: 900_000,
        exhausted: false,
      });

      mockDb.update.mockImplementation(() => ({
        set: () => ({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }));

      const { applyReferralBonus } = await loadReferrals();
      const result = await applyReferralBonus({
        referredId: 'referred-1',
        code: 'validcode',
      });

      expect(result.status).toBe('credited');
      expect(result.referrerId).toBe('referrer-1');
      expect(mockClaimIntroCredits).toHaveBeenCalledWith({
        userId: 'referrer-1',
        credits: 50,
        source: 'referral',
        referenceId: 'referred-1',
        metadata: { referredId: 'referred-1' },
      });
      // Should mark referral as credited
      expect(mockDb.update).toHaveBeenCalledWith(referralsTable);
    });

    it('U1: self-referral → status invalid', async () => {
      setupSelectChain({
        referrals: [], // no existing referral
        users: [{ id: 'self-user' }], // referrer IS the referred user
      });

      const { applyReferralBonus } = await loadReferrals();
      const result = await applyReferralBonus({
        referredId: 'self-user',
        code: 'selfcode',
      });

      expect(result.status).toBe('invalid');
      expect(mockClaimIntroCredits).not.toHaveBeenCalled();
    });

    it('U2: duplicate referral → status already', async () => {
      setupSelectChain({
        referrals: [{ referrerId: 'referrer-prev', referredId: 'referred-dup' }],
        users: [],
      });

      const { applyReferralBonus } = await loadReferrals();
      const result = await applyReferralBonus({
        referredId: 'referred-dup',
        code: 'anycode',
      });

      expect(result.status).toBe('already');
      expect(result.referrerId).toBe('referrer-prev');
      expect(mockClaimIntroCredits).not.toHaveBeenCalled();
    });

    it('U3: unknown code → status invalid', async () => {
      setupSelectChain({
        referrals: [], // no existing referral
        users: [], // no user with this referral code
      });

      const { applyReferralBonus } = await loadReferrals();
      const result = await applyReferralBonus({
        referredId: 'referred-2',
        code: 'badcode',
      });

      expect(result.status).toBe('invalid');
      expect(mockClaimIntroCredits).not.toHaveBeenCalled();
    });

    it('U4: pool exhausted during referral → status empty', async () => {
      setupSelectChain({
        referrals: [],
        users: [{ id: 'referrer-2' }],
      });

      mockDb.insert.mockImplementation(() => ({
        values: vi.fn().mockResolvedValue(undefined),
      }));

      // Pool claim returns 0 (exhausted)
      mockClaimIntroCredits.mockResolvedValue({
        claimedMicro: 0,
        remainingMicro: 0,
        exhausted: true,
      });

      const { applyReferralBonus } = await loadReferrals();
      const result = await applyReferralBonus({
        referredId: 'referred-3',
        code: 'validcode',
      });

      expect(result.status).toBe('empty');
      expect(result.referrerId).toBe('referrer-2');
      // Should NOT mark referral as credited since pool was empty
      expect(mockDb.update).not.toHaveBeenCalled();
    });
  });
});
