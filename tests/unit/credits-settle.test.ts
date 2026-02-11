import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDb, creditsTable, creditTransactionsTable } = vi.hoisted(() => {
  const credits = {
    userId: 'user_id',
    balanceMicro: 'balance_micro',
    updatedAt: 'updated_at',
  };
  const creditTransactions = {
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
  return { mockDb: db, creditsTable: credits, creditTransactionsTable: creditTransactions };
});

vi.mock('@/db', () => ({
  requireDb: () => mockDb,
}));

vi.mock('@/db/schema', () => ({
  credits: creditsTable,
  creditTransactions: creditTransactionsTable,
}));

const loadCredits = async () => import('@/lib/credits');

describe('settleCredits', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
    process.env.CREDIT_VALUE_GBP = '0.01';
    process.env.CREDIT_PLATFORM_MARGIN = '0.10';
    process.env.CREDITS_ENABLED = 'true';
  });

  it('H1: refund (actual cost < preauthorized) calls applyCreditDelta with negative delta', async () => {
    // deltaMicro < 0 means refund: the actual cost was less than preauthorized.
    // settleCredits delegates to applyCreditDelta for refunds.
    const transactionValues: unknown[] = [];

    mockDb.insert.mockImplementation((table: unknown) => {
      if (table === creditTransactionsTable) {
        return {
          values: vi.fn().mockImplementation((v) => {
            transactionValues.push(v);
            return Promise.resolve(undefined);
          }),
        };
      }
      return {
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      };
    });

    mockDb.update.mockImplementation(() => ({
      set: () => ({
        where: () => ({
          returning: vi.fn().mockResolvedValue([{ balanceMicro: 800 }]),
        }),
      }),
    }));

    const { settleCredits } = await loadCredits();
    await settleCredits('user-1', -200, 'settle-refund', { boutId: 'bout-1' });

    // Refund path goes through applyCreditDelta, which inserts a transaction
    // and updates the balance.
    expect(mockDb.insert).toHaveBeenCalledWith(creditTransactionsTable);
    expect(mockDb.update).toHaveBeenCalledWith(creditsTable);
    expect(transactionValues).toHaveLength(1);
    expect(transactionValues[0]).toMatchObject({
      userId: 'user-1',
      deltaMicro: -200,
      source: 'settle-refund',
    });
  });

  it('H2: zero delta (exact match) does nothing', async () => {
    // deltaMicro === 0 falls into the else branch (deltaMicro <= 0).
    // applyCreditDelta is called with 0 delta — no balance change.
    const transactionValues: unknown[] = [];

    mockDb.insert.mockImplementation((table: unknown) => {
      if (table === creditTransactionsTable) {
        return {
          values: vi.fn().mockImplementation((v) => {
            transactionValues.push(v);
            return Promise.resolve(undefined);
          }),
        };
      }
      return {
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      };
    });

    mockDb.update.mockImplementation(() => ({
      set: () => ({
        where: () => ({
          returning: vi.fn().mockResolvedValue([{ balanceMicro: 500 }]),
        }),
      }),
    }));

    const { settleCredits } = await loadCredits();
    await settleCredits('user-2', 0, 'settle-exact', { boutId: 'bout-2' });

    // Zero delta goes through applyCreditDelta path (delta <= 0)
    expect(transactionValues).toHaveLength(1);
    expect(transactionValues[0]).toMatchObject({
      userId: 'user-2',
      deltaMicro: 0,
      source: 'settle-exact',
    });
  });

  it('H3: additional charge with sufficient balance — atomic UPDATE succeeds', async () => {
    // deltaMicro > 0: additional charge path. Uses atomic SQL with LEAST/GREATEST.
    const transactionValues: unknown[] = [];

    mockDb.update.mockImplementation(() => ({
      set: () => ({
        where: () => ({
          returning: vi.fn().mockResolvedValue([{ balanceMicro: 300 }]),
        }),
      }),
    }));

    mockDb.insert.mockImplementation((table: unknown) => {
      if (table === creditTransactionsTable) {
        return {
          values: vi.fn().mockImplementation((v) => {
            transactionValues.push(v);
            return Promise.resolve(undefined);
          }),
        };
      }
      return {
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      };
    });

    const { settleCredits } = await loadCredits();
    await settleCredits('user-3', 200, 'settle-additional', {
      boutId: 'bout-3',
      referenceId: 'bout-3',
    });

    // Atomic charge path: update then insert transaction
    expect(mockDb.update).toHaveBeenCalledWith(creditsTable);
    expect(mockDb.insert).toHaveBeenCalledWith(creditTransactionsTable);
    expect(transactionValues).toHaveLength(1);
    expect(transactionValues[0]).toMatchObject({
      userId: 'user-3',
      deltaMicro: -200,
      source: 'settle-additional',
      referenceId: 'bout-3',
    });
    // Should include atomicSettlement flag in metadata
    expect((transactionValues[0] as Record<string, unknown>).metadata).toMatchObject({
      boutId: 'bout-3',
      atomicSettlement: true,
    });
  });

  it('U1: additional charge with zero balance — charge capped at 0', async () => {
    // User has 0 balance. The LEAST/GREATEST SQL caps deduction at 0.
    // UPDATE still returns a row (user exists), so transaction is recorded.
    const transactionValues: unknown[] = [];

    mockDb.update.mockImplementation(() => ({
      set: () => ({
        where: () => ({
          returning: vi.fn().mockResolvedValue([{ balanceMicro: 0 }]),
        }),
      }),
    }));

    mockDb.insert.mockImplementation((table: unknown) => {
      if (table === creditTransactionsTable) {
        return {
          values: vi.fn().mockImplementation((v) => {
            transactionValues.push(v);
            return Promise.resolve(undefined);
          }),
        };
      }
      return {
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      };
    });

    const { settleCredits } = await loadCredits();
    await settleCredits('user-broke', 500, 'settle-overcharge', {
      boutId: 'bout-4',
    });

    // Even with zero balance, the UPDATE returns a result because the user row
    // exists — the SQL caps the deduction at GREATEST(0, balance).
    expect(mockDb.update).toHaveBeenCalledWith(creditsTable);
    expect(transactionValues).toHaveLength(1);
    expect(transactionValues[0]).toMatchObject({
      userId: 'user-broke',
      deltaMicro: -500,
      source: 'settle-overcharge',
    });
  });

  it('additional charge when user row missing — no transaction recorded', async () => {
    // Edge case: update returns empty array (no row matched)
    mockDb.update.mockImplementation(() => ({
      set: () => ({
        where: () => ({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    }));

    mockDb.insert.mockImplementation(() => ({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }));

    const { settleCredits } = await loadCredits();
    await settleCredits('ghost-user', 100, 'settle-missing', {
      boutId: 'bout-5',
    });

    // No result from update → no transaction insert
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it('refund stores null referenceId when metadata has non-string referenceId', async () => {
    const transactionValues: Array<{ referenceId: unknown }> = [];

    mockDb.insert.mockImplementation((table: unknown) => {
      if (table === creditTransactionsTable) {
        return {
          values: vi.fn().mockImplementation((v) => {
            transactionValues.push(v);
            return Promise.resolve(undefined);
          }),
        };
      }
      return {
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      };
    });

    mockDb.update.mockImplementation(() => ({
      set: () => ({
        where: () => ({
          returning: vi.fn().mockResolvedValue([{ balanceMicro: 600 }]),
        }),
      }),
    }));

    const { settleCredits } = await loadCredits();
    await settleCredits('user-6', -100, 'settle-refund', {
      referenceId: 42,
    });

    expect(transactionValues[0]?.referenceId).toBeNull();
  });
});
