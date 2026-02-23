import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDb, introPoolTable, mockCredits } = vi.hoisted(() => {
  const pool = {
    id: 'id',
    initialMicro: 'initial_micro',
    claimedMicro: 'claimed_micro',
    drainRateMicroPerMinute: 'drain_rate_micro_per_minute',
    startedAt: 'started_at',
    updatedAt: 'updated_at',
  };
  const db = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  };
  const credits = {
    ensureCreditAccount: vi.fn(),
    applyCreditDelta: vi.fn(),
    MICRO_PER_CREDIT: 100,
    CREDITS_ENABLED: true,
  };
  return { mockDb: db, introPoolTable: pool, mockCredits: credits };
});

vi.mock('@/db', () => ({
  requireDb: () => mockDb,
}));

vi.mock('@/db/schema', () => ({
  introPool: introPoolTable,
}));

vi.mock('@/lib/credits', () => ({
  ensureCreditAccount: mockCredits.ensureCreditAccount,
  applyCreditDelta: mockCredits.applyCreditDelta,
  MICRO_PER_CREDIT: mockCredits.MICRO_PER_CREDIT,
  CREDITS_ENABLED: mockCredits.CREDITS_ENABLED,
}));

const loadIntroPool = async () => import('@/lib/intro-pool');

const makePoolRow = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  initialMicro: 1_500_000, // 15000 credits * 100 micro
  claimedMicro: 0,
  drainRateMicroPerMinute: 100, // 1 credit/min * 100 micro
  startedAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('intro-pool', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
    mockCredits.ensureCreditAccount.mockReset();
    mockCredits.applyCreditDelta.mockReset();
    process.env.INTRO_POOL_TOTAL_CREDITS = '15000';
    process.env.INTRO_POOL_DRAIN_PER_MIN = '1';
    process.env.INTRO_SIGNUP_CREDITS = '100';
    process.env.INTRO_REFERRAL_CREDITS = '50';
  });

  describe('ensureIntroPool', () => {
    it('H1: creates pool row on first call', async () => {
      const createdPool = makePoolRow();

      // First select returns empty (no existing pool)
      mockDb.select.mockImplementation(() => ({
        from: () => ({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }));

      mockDb.insert.mockImplementation(() => ({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createdPool]),
        }),
      }));

      const { ensureIntroPool } = await loadIntroPool();
      const pool = await ensureIntroPool();

      expect(pool).toEqual(createdPool);
      expect(mockDb.insert).toHaveBeenCalledWith(introPoolTable);
    });

    it('returns existing pool row when one exists', async () => {
      const existingPool = makePoolRow({ claimedMicro: 5000 });

      mockDb.select.mockImplementation(() => ({
        from: () => ({
          limit: vi.fn().mockResolvedValue([existingPool]),
        }),
      }));

      const { ensureIntroPool } = await loadIntroPool();
      const pool = await ensureIntroPool();

      expect(pool).toEqual(existingPool);
      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

  describe('getIntroPoolStatus', () => {
    it('H2: calculates remaining after half-life decay', async () => {
      const startedAt = new Date(Date.now() - 10 * 60_000); // 10 minutes ago
      const poolRow = makePoolRow({
        initialMicro: 100_000,
        claimedMicro: 5_000,
        drainRateMicroPerMinute: 0, // legacy column, ignored by half-life calc
        startedAt,
      });

      mockDb.select.mockImplementation(() => ({
        from: () => ({
          limit: vi.fn().mockResolvedValue([poolRow]),
        }),
      }));

      const { getIntroPoolStatus } = await loadIntroPool();
      const status = await getIntroPoolStatus();

      // Exponential decay: remaining = floor(100_000 * 0.5^(10/4320)) - 5_000
      // 0.5^(10/4320) ≈ 0.998397, so decayed ≈ 99839, remaining ≈ 94839
      expect(status.remainingMicro).toBeGreaterThan(94_800);
      expect(status.remainingMicro).toBeLessThan(95_000);
      expect(status.remainingCredits).toBe(Math.floor(status.remainingMicro / 100));
      expect(status.exhausted).toBe(false);
    });

    it('U1: pool fully decayed by time → exhausted=true', async () => {
      // Pool started 100_000 minutes ago (~69 days). With 3-day half-life,
      // 0.5^(69/3) ≈ 0. Pool is effectively zero from exponential decay.
      const startedAt = new Date(Date.now() - 100_000 * 60_000);
      const poolRow = makePoolRow({
        initialMicro: 100_000,
        claimedMicro: 0,
        drainRateMicroPerMinute: 100,
        startedAt,
      });

      mockDb.select.mockImplementation(() => ({
        from: () => ({
          limit: vi.fn().mockResolvedValue([poolRow]),
        }),
      }));

      const { getIntroPoolStatus } = await loadIntroPool();
      const status = await getIntroPoolStatus();

      expect(status.remainingMicro).toBe(0);
      expect(status.exhausted).toBe(true);
    });

    it('U2: pool fully claimed → exhausted=true', async () => {
      const poolRow = makePoolRow({
        initialMicro: 100_000,
        claimedMicro: 100_000,
        drainRateMicroPerMinute: 0,
        startedAt: new Date(),
      });

      mockDb.select.mockImplementation(() => ({
        from: () => ({
          limit: vi.fn().mockResolvedValue([poolRow]),
        }),
      }));

      const { getIntroPoolStatus } = await loadIntroPool();
      const status = await getIntroPoolStatus();

      expect(status.remainingMicro).toBe(0);
      expect(status.exhausted).toBe(true);
    });
  });

  describe('claimIntroCredits', () => {
    it('H3: successfully claims and credits user', async () => {
      const poolRow = makePoolRow({
        initialMicro: 1_000_000,
        claimedMicro: 0,
        startedAt: new Date(), // just started
        drainRateMicroPerMinute: 100,
      });

      // ensureIntroPool select
      mockDb.select.mockImplementation(() => ({
        from: () => ({
          limit: vi.fn().mockResolvedValue([poolRow]),
        }),
      }));

      // Atomic update returning updated pool state
      const updatedClaimedMicro = 10_000; // 100 credits * 100 micro
      mockDb.update.mockImplementation(() => ({
        set: () => ({
          where: () => ({
            returning: vi.fn().mockResolvedValue([{
              claimedMicro: updatedClaimedMicro,
              initialMicro: poolRow.initialMicro,
              startedAt: poolRow.startedAt,
              drainRateMicroPerMinute: poolRow.drainRateMicroPerMinute,
            }]),
          }),
        }),
      }));

      mockCredits.ensureCreditAccount.mockResolvedValue({
        userId: 'user-1',
        balanceMicro: 0,
      });
      mockCredits.applyCreditDelta.mockResolvedValue({
        userId: 'user-1',
        balanceMicro: 10_000,
      });

      const { claimIntroCredits } = await loadIntroPool();
      const result = await claimIntroCredits({
        userId: 'user-1',
        credits: 100,
        source: 'signup',
        referenceId: 'ref-1',
      });

      expect(result.claimedMicro).toBe(10_000);
      expect(result.exhausted).toBe(false);
      expect(mockCredits.ensureCreditAccount).toHaveBeenCalledWith('user-1');
      expect(mockCredits.applyCreditDelta).toHaveBeenCalledWith(
        'user-1',
        10_000,
        'signup',
        expect.objectContaining({
          referenceId: 'ref-1',
          introPoolClaimedMicro: 10_000,
        }),
      );
    });

    it('U3: claim amount exceeds remaining → partial claim', async () => {
      // Pool has only 5000 micro remaining, but user requests 10_000
      const poolRow = makePoolRow({
        initialMicro: 10_000,
        claimedMicro: 5_000,
        startedAt: new Date(),
        drainRateMicroPerMinute: 0,
      });

      mockDb.select.mockImplementation(() => ({
        from: () => ({
          limit: vi.fn().mockResolvedValue([poolRow]),
        }),
      }));

      // SQL LEAST caps the claim: actual claimed = old + LEAST(requested, available)
      // Simulating: only 3000 actually claimed (partial)
      mockDb.update.mockImplementation(() => ({
        set: () => ({
          where: () => ({
            returning: vi.fn().mockResolvedValue([{
              claimedMicro: 8_000, // was 5000, only 3000 claimed
              initialMicro: 10_000,
              startedAt: poolRow.startedAt,
              drainRateMicroPerMinute: 0,
            }]),
          }),
        }),
      }));

      mockCredits.ensureCreditAccount.mockResolvedValue({
        userId: 'user-2',
        balanceMicro: 0,
      });
      mockCredits.applyCreditDelta.mockResolvedValue({
        userId: 'user-2',
        balanceMicro: 3_000,
      });

      const { claimIntroCredits } = await loadIntroPool();
      const result = await claimIntroCredits({
        userId: 'user-2',
        credits: 100, // requests 10_000 micro
        source: 'signup',
      });

      // actualClaimed = 8000 - 5000 = 3000
      expect(result.claimedMicro).toBe(3_000);
      expect(mockCredits.applyCreditDelta).toHaveBeenCalledWith(
        'user-2',
        3_000,
        'signup',
        expect.objectContaining({ introPoolClaimedMicro: 3_000 }),
      );
    });

    it('pool exhausted pre-check returns early', async () => {
      // Pool is already exhausted (claimed == initial, started long ago)
      const startedAt = new Date(Date.now() - 1_000_000 * 60_000);
      const poolRow = makePoolRow({
        initialMicro: 100_000,
        claimedMicro: 100_000,
        startedAt,
        drainRateMicroPerMinute: 100,
      });

      mockDb.select.mockImplementation(() => ({
        from: () => ({
          limit: vi.fn().mockResolvedValue([poolRow]),
        }),
      }));

      const { claimIntroCredits } = await loadIntroPool();
      const result = await claimIntroCredits({
        userId: 'user-3',
        credits: 100,
        source: 'signup',
      });

      expect(result.claimedMicro).toBe(0);
      expect(result.exhausted).toBe(true);
      // No update attempted since pre-check fails
      expect(mockDb.update).not.toHaveBeenCalled();
      expect(mockCredits.ensureCreditAccount).not.toHaveBeenCalled();
    });

    it('atomic update returns nothing → returns exhausted', async () => {
      const poolRow = makePoolRow({
        initialMicro: 100_000,
        claimedMicro: 50_000,
        startedAt: new Date(),
        drainRateMicroPerMinute: 0,
      });

      mockDb.select.mockImplementation(() => ({
        from: () => ({
          limit: vi.fn().mockResolvedValue([poolRow]),
        }),
      }));

      // Update returns empty (pool row not found)
      mockDb.update.mockImplementation(() => ({
        set: () => ({
          where: () => ({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      }));

      const { claimIntroCredits } = await loadIntroPool();
      const result = await claimIntroCredits({
        userId: 'user-4',
        credits: 100,
        source: 'signup',
      });

      expect(result.claimedMicro).toBe(0);
      expect(result.exhausted).toBe(true);
    });

    it('zero actual claimed → no credit applied', async () => {
      const poolRow = makePoolRow({
        initialMicro: 100_000,
        claimedMicro: 50_000,
        startedAt: new Date(),
        drainRateMicroPerMinute: 0,
      });

      mockDb.select.mockImplementation(() => ({
        from: () => ({
          limit: vi.fn().mockResolvedValue([poolRow]),
        }),
      }));

      // Update returns but claimed didn't change (actualClaimed = 0)
      mockDb.update.mockImplementation(() => ({
        set: () => ({
          where: () => ({
            returning: vi.fn().mockResolvedValue([{
              claimedMicro: 50_000, // same as before
              initialMicro: 100_000,
              startedAt: poolRow.startedAt,
              drainRateMicroPerMinute: 0,
            }]),
          }),
        }),
      }));

      const { claimIntroCredits } = await loadIntroPool();
      const result = await claimIntroCredits({
        userId: 'user-5',
        credits: 100,
        source: 'signup',
      });

      expect(result.claimedMicro).toBe(0);
      expect(mockCredits.ensureCreditAccount).not.toHaveBeenCalled();
      expect(mockCredits.applyCreditDelta).not.toHaveBeenCalled();
    });
  });
});
