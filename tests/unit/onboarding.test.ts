import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDb, creditTransactionsTable } = vi.hoisted(() => {
  const table = {
    id: 'id',
    userId: 'user_id',
    deltaMicro: 'delta_micro',
    source: 'source',
    referenceId: 'reference_id',
    metadata: 'metadata',
    createdAt: 'created_at',
  };
  const db = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  };
  return { mockDb: db, creditTransactionsTable: table };
});

const mockEnsureUserRecord = vi.fn().mockResolvedValue({ id: 'user_1' });
const mockEnsureReferralCode = vi.fn().mockResolvedValue('ABC12345');
const mockEnsureCreditAccount = vi.fn().mockResolvedValue({ userId: 'user_1', balanceMicro: 0 });
const mockClaimIntroCredits = vi.fn();
const mockApplyReferralBonus = vi.fn().mockResolvedValue({ status: 'credited' });

let mockCreditsEnabled = true;
const mockIntroSignupCredits = 100;

vi.mock('@/db', () => ({
  requireDb: () => mockDb,
}));

vi.mock('@/db/schema', () => ({
  creditTransactions: creditTransactionsTable,
}));

vi.mock('@/lib/credits', () => ({
  get CREDITS_ENABLED() {
    return mockCreditsEnabled;
  },
  ensureCreditAccount: mockEnsureCreditAccount,
}));

vi.mock('@/lib/intro-pool', () => ({
  claimIntroCredits: mockClaimIntroCredits,
  INTRO_SIGNUP_CREDITS: mockIntroSignupCredits,
}));

vi.mock('@/lib/referrals', () => ({
  ensureReferralCode: mockEnsureReferralCode,
  applyReferralBonus: mockApplyReferralBonus,
}));

vi.mock('@/lib/users', () => ({
  ensureUserRecord: mockEnsureUserRecord,
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

const loadOnboarding = async () => import('@/lib/onboarding');

describe('onboarding', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
    mockCreditsEnabled = true;
    mockEnsureUserRecord.mockClear();
    mockEnsureReferralCode.mockClear();
    mockEnsureCreditAccount.mockClear();
    mockClaimIntroCredits.mockClear();
    mockApplyReferralBonus.mockClear();
  });

  describe('applySignupBonus', () => {
    it('returns disabled when CREDITS_ENABLED=false', async () => {
      mockCreditsEnabled = false;
      const { applySignupBonus } = await loadOnboarding();
      const result = await applySignupBonus('user_1');
      expect(result).toEqual({ status: 'disabled' });
    });

    it('returns already when signup transaction exists', async () => {
      setupSelect([{ id: 42 }]);
      const { applySignupBonus } = await loadOnboarding();
      const result = await applySignupBonus('user_1');
      expect(result).toEqual({ status: 'already' });
    });

    it('returns claimed when intro pool has credits', async () => {
      setupSelect([]);
      mockClaimIntroCredits.mockResolvedValue({ claimedMicro: 10000 });
      const { applySignupBonus } = await loadOnboarding();
      const result = await applySignupBonus('user_1');
      expect(result).toEqual({ status: 'claimed', claimedMicro: 10000 });
      expect(mockClaimIntroCredits).toHaveBeenCalledWith({
        userId: 'user_1',
        credits: 100,
        source: 'signup',
        referenceId: 'user_1',
      });
    });

    it('returns empty when intro pool exhausted', async () => {
      setupSelect([]);
      mockClaimIntroCredits.mockResolvedValue({ claimedMicro: 0 });
      const { applySignupBonus } = await loadOnboarding();
      const result = await applySignupBonus('user_1');
      expect(result).toEqual({ status: 'empty', claimedMicro: 0 });
    });
  });

  describe('initializeUserSession', () => {
    it('calls ensureUserRecord and ensureReferralCode', async () => {
      mockCreditsEnabled = false;
      const { initializeUserSession } = await loadOnboarding();
      await initializeUserSession({ userId: 'user_init' });
      expect(mockEnsureUserRecord).toHaveBeenCalledWith('user_init');
      expect(mockEnsureReferralCode).toHaveBeenCalledWith('user_init');
    });

    it('skips credits when CREDITS_ENABLED=false', async () => {
      mockCreditsEnabled = false;
      const { initializeUserSession } = await loadOnboarding();
      await initializeUserSession({ userId: 'user_nocredits' });
      expect(mockEnsureCreditAccount).not.toHaveBeenCalled();
    });

    it('applies referral bonus when code provided', async () => {
      // Need to set up DB select for applySignupBonus's existing transaction check
      setupSelect([{ id: 1 }]); // pretend signup already done
      const { initializeUserSession } = await loadOnboarding();
      await initializeUserSession({ userId: 'user_ref', referralCode: 'REF123' });
      expect(mockApplyReferralBonus).toHaveBeenCalledWith({
        referredId: 'user_ref',
        code: 'REF123',
      });
    });

    it('caches and skips on repeated calls within TTL', async () => {
      mockCreditsEnabled = false;
      const { initializeUserSession } = await loadOnboarding();

      await initializeUserSession({ userId: 'user_cached' });
      await initializeUserSession({ userId: 'user_cached' });

      // ensureUserRecord should only be called once due to caching
      expect(mockEnsureUserRecord).toHaveBeenCalledTimes(1);
    });
  });
});
