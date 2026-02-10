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

const setupSelect = (result: unknown[]) => {
  mockDb.select.mockImplementation(() => ({
    from: () => ({
      where: () => ({
        limit: async () => result,
        orderBy: () => ({
          limit: async () => result,
        }),
      }),
    }),
  }));
};

const setupInsert = (created: unknown) => {
  mockDb.insert.mockImplementation((table: unknown) => {
    if (table === creditTransactionsTable) {
      return {
        values: vi.fn().mockResolvedValue(undefined),
      };
    }
    return {
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([created]),
      }),
    };
  });
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

const loadCredits = async () => import('@/lib/credits');

describe('credits helpers', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
    process.env.CREDIT_VALUE_GBP = '0.01';
    process.env.CREDIT_PLATFORM_MARGIN = '0.10';
    process.env.CREDIT_TOKEN_CHARS_PER = '4';
    process.env.CREDIT_OUTPUT_TOKENS_PER_TURN = '120';
    process.env.CREDIT_INPUT_FACTOR = '5.5';
    process.env.BYOK_FEE_GBP_PER_1K_TOKENS = '0.001';
    process.env.BYOK_MIN_GBP = '0.01';
    process.env.MODEL_PRICES_GBP_JSON = '';
    process.env.CREDITS_ENABLED = 'true';
  });

  it('estimates token counts consistently', async () => {
    const { estimateBoutTokens, INPUT_FACTOR } = await loadCredits();
    const { inputTokens, outputTokens } = estimateBoutTokens(10, 100);
    expect(outputTokens).toBe(1000);
    expect(inputTokens).toBe(Math.ceil(outputTokens * INPUT_FACTOR));
  });

  it('computes byok cost with minimum floor', async () => {
    const { estimateBoutCostGbp, BYOK_MIN_GBP } = await loadCredits();
    const cost = estimateBoutCostGbp(1, 'byok', 1);
    expect(cost).toBeGreaterThanOrEqual(BYOK_MIN_GBP);
  });

  it('formats credits using micro units', async () => {
    const { formatCredits, MICRO_PER_CREDIT, toMicroCredits } =
      await loadCredits();
    expect(formatCredits(MICRO_PER_CREDIT)).toBe('1.00');
    expect(toMicroCredits(0.01)).toBeGreaterThan(0);
  });

  it('returns positive costs for known models', async () => {
    const { estimateBoutCostGbp } = await loadCredits();
    const cost = estimateBoutCostGbp(12, 'claude-haiku-4-5-20251001', 120);
    expect(cost).toBeGreaterThan(0);
  });

  it('returns zero costs for unknown models', async () => {
    const { estimateBoutCostGbp, computeCostGbp } = await loadCredits();
    expect(estimateBoutCostGbp(4, 'unknown-model', 120)).toBe(0);
    expect(computeCostGbp(10, 20, 'unknown-model')).toBe(0);
  });

  it('uses defaults when env is missing', async () => {
    delete process.env.CREDIT_VALUE_GBP;
    delete process.env.CREDIT_PLATFORM_MARGIN;
    delete process.env.CREDIT_TOKEN_CHARS_PER;
    delete process.env.CREDIT_OUTPUT_TOKENS_PER_TURN;
    delete process.env.CREDIT_INPUT_FACTOR;
    delete process.env.BYOK_FEE_GBP_PER_1K_TOKENS;
    delete process.env.BYOK_MIN_GBP;
    delete process.env.CREDITS_ADMIN_GRANT;
    delete process.env.CREDITS_ADMIN_ENABLED;
    delete process.env.BYOK_ENABLED;

    const creditsModule = await loadCredits();
    expect(creditsModule.CREDIT_VALUE_GBP).toBe(0.01);
    expect(creditsModule.CREDIT_PLATFORM_MARGIN).toBe(0.10);
    expect(creditsModule.TOKEN_CHARS_PER).toBe(4);
    expect(creditsModule.OUTPUT_TOKENS_PER_TURN).toBe(120);
    expect(creditsModule.INPUT_FACTOR).toBe(5.5);
    expect(creditsModule.BYOK_FEE_GBP_PER_1K_TOKENS).toBe(0.0002);
    expect(creditsModule.BYOK_MIN_GBP).toBe(0.001);
    expect(creditsModule.CREDITS_ADMIN_GRANT).toBe(100);
    expect(creditsModule.CREDITS_ADMIN_ENABLED).toBe(false);
    expect(creditsModule.BYOK_ENABLED).toBe(false);
  });

  it('parses model pricing overrides from env', async () => {
    process.env.MODEL_PRICES_GBP_JSON = JSON.stringify({
      'custom-model': { in: 2, out: 4 },
    });
    const { getModelPricing } = await loadCredits();
    expect(getModelPricing('custom-model')).toEqual({ in: 2, out: 4 });
  });

  it('handles missing pricing env gracefully', async () => {
    delete process.env.MODEL_PRICES_GBP_JSON;
    const { getModelPricing } = await loadCredits();
    expect(getModelPricing('claude-haiku-4-5-20251001')).toEqual({ in: 0.732, out: 3.66 });
  });

  it('falls back to defaults when pricing env is invalid', async () => {
    process.env.MODEL_PRICES_GBP_JSON = '{bad-json';
    const { getModelPricing } = await loadCredits();
    expect(getModelPricing('claude-haiku-4-5-20251001')).toEqual({
      in: 0.732,
      out: 3.66,
    });
  });

  it('estimates tokens from text length with minimums', async () => {
    const { estimateTokensFromText } = await loadCredits();
    expect(estimateTokensFromText('abcd', 10)).toBe(10);
    expect(estimateTokensFromText('abcd', 0)).toBeGreaterThanOrEqual(1);
  });

  it('computes costs from token counts', async () => {
    const { computeCostGbp } = await loadCredits();
    const cost = computeCostGbp(1000, 2000, 'claude-haiku-4-5-20251001');
    expect(cost).toBeGreaterThan(0);
  });

  it('computes byok costs with minimums', async () => {
    const { computeCostGbp, BYOK_MIN_GBP } = await loadCredits();
    const cost = computeCostGbp(1, 1, 'byok');
    expect(cost).toBeGreaterThanOrEqual(BYOK_MIN_GBP);
  });

  it('reads admin and byok flags from env', async () => {
    process.env.CREDITS_ADMIN_ENABLED = 'true';
    process.env.CREDITS_ADMIN_GRANT = '250';
    process.env.BYOK_ENABLED = 'true';

    const creditsModule = await loadCredits();
    expect(creditsModule.CREDITS_ADMIN_ENABLED).toBe(true);
    expect(creditsModule.CREDITS_ADMIN_GRANT).toBe(250);
    expect(creditsModule.BYOK_ENABLED).toBe(true);
  });

  it('returns null balance when credits disabled', async () => {
    process.env.CREDITS_ENABLED = 'false';
    const { getCreditBalanceMicro } = await loadCredits();
    const balance = await getCreditBalanceMicro('user-1');
    expect(balance).toBeNull();
  });

  it('returns balance when credits enabled', async () => {
    setupSelect([{ userId: 'user-1', balanceMicro: 444 }]);
    const { getCreditBalanceMicro } = await loadCredits();
    const balance = await getCreditBalanceMicro('user-1');
    expect(balance).toBe(444);
  });

  it('creates a credit account when missing', async () => {
    setupSelect([]);
    setupInsert({ userId: 'user-1', balanceMicro: 50000 });
    const { ensureCreditAccount } = await loadCredits();
    const account = await ensureCreditAccount('user-1');
    expect(account).toEqual({ userId: 'user-1', balanceMicro: 50000 });
  });

  it('returns existing credit account when found', async () => {
    setupSelect([{ userId: 'user-2', balanceMicro: 123 }]);
    const { ensureCreditAccount } = await loadCredits();
    const account = await ensureCreditAccount('user-2');
    expect(account).toEqual({ userId: 'user-2', balanceMicro: 123 });
  });

  it('applies credit deltas and records transactions', async () => {
    setupInsert({ userId: 'user-3', balanceMicro: 250 });
    setupUpdate({ userId: 'user-3', balanceMicro: 250 });

    const { applyCreditDelta } = await loadCredits();
    const updated = await applyCreditDelta('user-3', 50, 'test', {
      referenceId: 'ref-1',
    });

    expect(updated).toEqual({ userId: 'user-3', balanceMicro: 250 });
    expect(mockDb.insert).toHaveBeenCalledWith(creditTransactionsTable);
    expect(mockDb.update).toHaveBeenCalledWith(creditsTable);
  });

  it('stores null reference ids when metadata is not a string', async () => {
    const transactionValues: Array<{ referenceId: unknown }> = [];
    mockDb.insert.mockImplementation((table: unknown) => {
      if (table === creditTransactionsTable) {
        return {
          values: vi.fn().mockImplementation((values) => {
            transactionValues.push(values);
            return Promise.resolve(undefined);
          }),
        };
      }
      return {
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ userId: 'user-5', balanceMicro: 0 }]),
        }),
      };
    });
    setupUpdate({ userId: 'user-5', balanceMicro: 0 });

    const { applyCreditDelta } = await loadCredits();
    await applyCreditDelta('user-5', -10, 'adjustment', {
      referenceId: 123,
    });

    expect(transactionValues[0]?.referenceId).toBeNull();
  });

  it('loads recent credit transactions', async () => {
    const rows = [
      {
        deltaMicro: 100,
        source: 'signup',
        referenceId: null,
        metadata: {},
        createdAt: new Date(),
      },
    ];
    setupSelect(rows);
    const { getCreditTransactions } = await loadCredits();
    const result = await getCreditTransactions('user-4', 5);
    expect(result).toEqual(rows);
  });

  describe('preauthorizeCredits', () => {
    it('succeeds when balance is sufficient', async () => {
      // Setup: account exists with 1000 micro
      setupSelect([{ userId: 'user-preauth', balanceMicro: 1000 }]);

      // Mock successful update (returns the new balance)
      mockDb.update.mockImplementation(() => ({
        set: () => ({
          where: () => ({
            returning: vi.fn().mockResolvedValue([{ balanceMicro: 500 }]),
          }),
        }),
      }));

      // Mock transaction insert
      mockDb.insert.mockImplementation((table: unknown) => {
        if (table === creditTransactionsTable) {
          return { values: vi.fn().mockResolvedValue(undefined) };
        }
        return {
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ userId: 'user-preauth', balanceMicro: 1000 }]),
          }),
        };
      });

      const { preauthorizeCredits } = await loadCredits();
      const result = await preauthorizeCredits('user-preauth', 500, 'preauth', {
        boutId: 'bout-1',
      });

      expect(result.success).toBe(true);
      expect(result.balanceMicro).toBe(500);
    });

    it('fails when balance is insufficient', async () => {
      // Setup: account exists with 100 micro
      setupSelect([{ userId: 'user-broke', balanceMicro: 100 }]);

      // Mock update returns empty (WHERE condition not met)
      mockDb.update.mockImplementation(() => ({
        set: () => ({
          where: () => ({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      }));

      // Mock ensureCreditAccount (account exists)
      mockDb.insert.mockImplementation(() => ({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ userId: 'user-broke', balanceMicro: 100 }]),
        }),
      }));

      const { preauthorizeCredits } = await loadCredits();
      const result = await preauthorizeCredits('user-broke', 500, 'preauth', {
        boutId: 'bout-2',
      });

      expect(result.success).toBe(false);
      expect(result.balanceMicro).toBe(100);
    });

    it('records transaction only on successful preauth', async () => {
      const transactionCalls: unknown[] = [];

      setupSelect([{ userId: 'user-track', balanceMicro: 1000 }]);

      mockDb.update.mockImplementation(() => ({
        set: () => ({
          where: () => ({
            returning: vi.fn().mockResolvedValue([{ balanceMicro: 700 }]),
          }),
        }),
      }));

      mockDb.insert.mockImplementation((table: unknown) => {
        if (table === creditTransactionsTable) {
          return {
            values: vi.fn().mockImplementation((v) => {
              transactionCalls.push(v);
              return Promise.resolve(undefined);
            }),
          };
        }
        return {
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ userId: 'user-track', balanceMicro: 1000 }]),
          }),
        };
      });

      const { preauthorizeCredits } = await loadCredits();
      await preauthorizeCredits('user-track', 300, 'preauth', {
        boutId: 'bout-3',
        referenceId: 'bout-3',
      });

      expect(transactionCalls).toHaveLength(1);
      expect(transactionCalls[0]).toMatchObject({
        userId: 'user-track',
        deltaMicro: -300,
        source: 'preauth',
        referenceId: 'bout-3',
      });
    });
  });
});
