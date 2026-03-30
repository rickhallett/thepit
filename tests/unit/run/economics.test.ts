import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { RunId } from '@/lib/domain-ids';
import type { DbOrTx } from '@/db';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

vi.mock('@/db/schema', () => ({
  costLedger: {
    runId: 'runId',
    contestantId: 'contestantId',
    totalCostMicro: 'totalCostMicro',
    inputTokens: 'inputTokens',
    outputTokens: 'outputTokens',
    latencyMs: 'latencyMs',
  },
  contestants: {
    id: 'id',
    runId: 'runId',
    label: 'label',
    model: 'model',
  },
  evaluations: {
    runId: 'runId',
    contestantId: 'contestantId',
    overallScore: 'overallScore',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, _val: unknown) => ({ _eq: [_col, _val] })),
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    as: (_alias: string) => `sql_${_alias}`,
    _sql: true,
    strings,
    values,
  }),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CONTESTANT_A = 'cont-AAAAAAAAAAAAAAAAAAA';
const CONTESTANT_B = 'cont-BBBBBBBBBBBBBBBBBBB';
const RUN_ID = 'run-000000000000000000';

const costRowsFixture = [
  {
    contestantId: CONTESTANT_A,
    costMicro: 5000,
    inputTokens: 1000,
    outputTokens: 500,
    latencyMs: 1200,
  },
  {
    contestantId: CONTESTANT_B,
    costMicro: 3000,
    inputTokens: 800,
    outputTokens: 400,
    latencyMs: 800,
  },
];

const contestantRowsFixture = [
  { id: CONTESTANT_A, label: 'GPT-4o', model: 'gpt-4o' },
  { id: CONTESTANT_B, label: 'Gemini Flash', model: 'gemini-2.0-flash' },
];

const evalRowsFixture = [
  { contestantId: CONTESTANT_A, overallScore: 0.85 },
  { contestantId: CONTESTANT_B, overallScore: 0.72 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a mock db that returns specific data for sequential select calls.
 * Query 0 (cost_ledger) uses .groupBy(), queries 1-2 terminate at .where().
 */
function buildMockDb(
  costRows: unknown[],
  contestantRows: unknown[],
  evalRows: unknown[],
): DbOrTx {
  const callIndex = { value: 0 };

  return {
    select: vi.fn().mockImplementation(() => {
      const idx = callIndex.value++;
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            if (idx === 0) {
              return { groupBy: vi.fn().mockReturnValue(costRows) };
            }
            if (idx === 1) return contestantRows;
            return evalRows;
          }),
        }),
      };
    }),
  } as unknown as DbOrTx;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('lib/run/economics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('computes total cost across contestants', async () => {
    const db = buildMockDb(costRowsFixture, contestantRowsFixture, evalRowsFixture);

    const { getRunEconomics } = await import('@/lib/run/economics');
    const result = await getRunEconomics(db, RUN_ID as unknown as RunId);

    expect(result).not.toBeNull();
    expect(result!.totalCostMicro).toBe(5000 + 3000);
    expect(result!.totalTokens).toBe(1000 + 500 + 800 + 400);
    expect(result!.totalLatencyMs).toBe(1200 + 800);
  });

  it('computes scorePerDollar correctly', async () => {
    const db = buildMockDb(costRowsFixture, contestantRowsFixture, evalRowsFixture);

    const { getRunEconomics } = await import('@/lib/run/economics');
    const result = await getRunEconomics(db, RUN_ID as unknown as RunId);

    expect(result).not.toBeNull();
    const contA = result!.contestants.find((c) => c.contestantId === CONTESTANT_A)!;
    const contB = result!.contestants.find((c) => c.contestantId === CONTESTANT_B)!;

    // scorePerDollar = overallScore / (costMicro / 1_000_000)
    // A: 0.85 / (5000 / 1_000_000) = 0.85 / 0.005 = 170
    expect(contA.scorePerDollar).toBeCloseTo(170, 1);
    // B: 0.72 / (3000 / 1_000_000) = 0.72 / 0.003 = 240
    expect(contB.scorePerDollar).toBeCloseTo(240, 1);
  });

  it('computes scorePerSecond correctly', async () => {
    const db = buildMockDb(costRowsFixture, contestantRowsFixture, evalRowsFixture);

    const { getRunEconomics } = await import('@/lib/run/economics');
    const result = await getRunEconomics(db, RUN_ID as unknown as RunId);

    expect(result).not.toBeNull();
    const contA = result!.contestants.find((c) => c.contestantId === CONTESTANT_A)!;
    const contB = result!.contestants.find((c) => c.contestantId === CONTESTANT_B)!;

    // scorePerSecond = overallScore / (latencyMs / 1000)
    // A: 0.85 / (1200 / 1000) = 0.85 / 1.2 = 0.7083...
    expect(contA.scorePerSecond).toBeCloseTo(0.7083, 3);
    // B: 0.72 / (800 / 1000) = 0.72 / 0.8 = 0.9
    expect(contB.scorePerSecond).toBeCloseTo(0.9, 3);
  });

  it('handles missing evaluations (scores null)', async () => {
    const db = buildMockDb(costRowsFixture, contestantRowsFixture, []);

    const { getRunEconomics } = await import('@/lib/run/economics');
    const result = await getRunEconomics(db, RUN_ID as unknown as RunId);

    expect(result).not.toBeNull();
    for (const c of result!.contestants) {
      expect(c.overallScore).toBeNull();
      expect(c.scorePerDollar).toBeNull();
      expect(c.scorePerSecond).toBeNull();
    }
    expect(result!.bestValueContestant).toBeNull();
  });

  it('identifies cheapest and fastest contestants', async () => {
    const db = buildMockDb(costRowsFixture, contestantRowsFixture, evalRowsFixture);

    const { getRunEconomics } = await import('@/lib/run/economics');
    const result = await getRunEconomics(db, RUN_ID as unknown as RunId);

    expect(result).not.toBeNull();
    // B has lower cost (3000 < 5000) and lower latency (800 < 1200)
    expect(result!.cheapestContestant).toBe(CONTESTANT_B);
    expect(result!.fastestContestant).toBe(CONTESTANT_B);
    // B has higher scorePerDollar (240 > 170)
    expect(result!.bestValueContestant).toBe(CONTESTANT_B);
  });

  it('returns null for missing run', async () => {
    const db = buildMockDb([], [], []);

    const { getRunEconomics } = await import('@/lib/run/economics');
    const result = await getRunEconomics(db, RUN_ID as unknown as RunId);

    expect(result).toBeNull();
  });
});
