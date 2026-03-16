import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { mockDb, boutsTable, creditTransactionsTable, mockApplyCreditDelta } = vi.hoisted(() => {
  const boutsT = {
    id: 'id',
    presetId: 'preset_id',
    status: 'status',
    transcript: 'transcript',
    ownerId: 'owner_id',
    topic: 'topic',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  };
  const creditTxnT = {
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
    transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(db)),
  };
  return {
    mockDb: db,
    boutsTable: boutsT,
    creditTransactionsTable: creditTxnT,
    mockApplyCreditDelta: vi.fn().mockResolvedValue({ userId: 'u1', balanceMicro: 500 }),
  };
});

vi.mock('@/db', () => ({
  requireDb: () => mockDb,
}));

vi.mock('@/db/schema', () => ({
  bouts: boutsTable,
  creditTransactions: creditTransactionsTable,
}));

vi.mock('@/lib/credits', () => ({
  applyCreditDelta: mockApplyCreditDelta,
}));

vi.mock('@/lib/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    audit: vi.fn(),
    debug: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const oldDate = new Date('2026-01-01T00:00:00Z');
// DB handles time filtering - no recentDate needed in mock layer

const makeBout = (overrides: Record<string, unknown> = {}) => ({
  id: 'bout-stuck-1',
  presetId: 'debate',
  status: 'running',
  transcript: [],
  ownerId: 'user-1',
  topic: 'test',
  createdAt: oldDate,
  updatedAt: oldDate,
  ...overrides,
});

/** Configure select to return different results for bouts vs credit_transactions */
const setupSelectChain = (
  boutRows: unknown[],
  txnRows: unknown[] = [],
) => {
  mockDb.select.mockImplementation(() => ({
    from: (table: unknown) => {
      if (table === boutsTable) {
        return {
          where: () => boutRows,
        };
      }
      // creditTransactions
      return {
        where: () => ({
          limit: () => txnRows,
        }),
      };
    },
  }));
};

const setupUpdate = () => {
  mockDb.update.mockImplementation(() => ({
    set: () => ({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  }));
};

const loadSweep = async () => import('@/lib/bout-sweep');

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('sweepStuckBouts', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
    mockApplyCreditDelta.mockReset();
    mockApplyCreditDelta.mockResolvedValue({ userId: 'u1', balanceMicro: 500 });
  });

  it('sweeps bouts in running status older than threshold', async () => {
    const stuckBout = makeBout();
    setupSelectChain([stuckBout], [{ deltaMicro: -300, source: 'preauth', referenceId: 'bout-stuck-1' }]);
    setupUpdate();

    const { sweepStuckBouts } = await loadSweep();
    const result = await sweepStuckBouts();

    expect(result.swept).toBe(1);
    expect(result.details[0]!.boutId).toBe('bout-stuck-1');
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('does not sweep bouts newer than threshold', async () => {
    // No bouts returned by query (DB handles the time filter)
    setupSelectChain([]);
    setupUpdate();

    const { sweepStuckBouts } = await loadSweep();
    const result = await sweepStuckBouts();

    expect(result.swept).toBe(0);
    expect(result.details).toHaveLength(0);
  });

  it('does not sweep bouts in completed or error status', async () => {
    // Query only selects status=running, so completed/error bouts are never returned
    setupSelectChain([]);
    setupUpdate();

    const { sweepStuckBouts } = await loadSweep();
    const result = await sweepStuckBouts();

    expect(result.swept).toBe(0);
  });

  it('calls applyCreditDelta with correct preauth amount for refund', async () => {
    const stuckBout = makeBout({ ownerId: 'user-refund' });
    const preauthTxn = { deltaMicro: -500, source: 'preauth', referenceId: 'bout-stuck-1' };
    setupSelectChain([stuckBout], [preauthTxn]);
    setupUpdate();

    const { sweepStuckBouts } = await loadSweep();
    await sweepStuckBouts();

    expect(mockApplyCreditDelta).toHaveBeenCalledWith(
      'user-refund',
      500,
      'sweep-refund',
      {
        referenceId: 'bout-stuck-1',
        boutId: 'bout-stuck-1',
        reason: 'stuck-bout-sweep',
      },
    );
  });

  it('sweeps anonymous bouts (no ownerId) without attempting credit refund', async () => {
    const anonBout = makeBout({ ownerId: null });
    setupSelectChain([anonBout]);
    setupUpdate();

    const { sweepStuckBouts } = await loadSweep();
    const result = await sweepStuckBouts();

    expect(result.swept).toBe(1);
    expect(result.refunded).toBe(0);
    expect(result.details[0]!.refundedMicro).toBe(0);
    expect(mockApplyCreditDelta).not.toHaveBeenCalled();
  });

  it('is idempotent - running twice does not double-refund', async () => {
    const stuckBout = makeBout();
    const preauthTxn = { deltaMicro: -300, source: 'preauth', referenceId: 'bout-stuck-1' };

    // First run: bout is returned
    setupSelectChain([stuckBout], [preauthTxn]);
    setupUpdate();

    const { sweepStuckBouts } = await loadSweep();
    const first = await sweepStuckBouts();
    expect(first.swept).toBe(1);

    // Second run: bout already set to 'error', so query returns empty
    // (the WHERE status='running' filter excludes it)
    setupSelectChain([]);
    const second = await sweepStuckBouts();
    expect(second.swept).toBe(0);
    // applyCreditDelta called only once (from first run)
    expect(mockApplyCreditDelta).toHaveBeenCalledTimes(1);
  });

  it('returns correct summary with multiple stuck bouts', async () => {
    const bout1 = makeBout({ id: 'bout-a', ownerId: 'user-1' });
    const bout2 = makeBout({ id: 'bout-b', ownerId: 'user-2' });
    const bout3 = makeBout({ id: 'bout-c', ownerId: null });

    // Need to handle per-bout credit transaction lookups
    let boutSelectDone = false;
    mockDb.select.mockImplementation(() => ({
      from: (table: unknown) => {
        if (table === boutsTable && !boutSelectDone) {
          boutSelectDone = true;
          return {
            where: () => [bout1, bout2, bout3],
          };
        }
        // creditTransactions - return preauth for user bouts
        return {
          where: () => ({
            limit: () => [{ deltaMicro: -200, source: 'preauth' }],
          }),
        };
      },
    }));
    setupUpdate();

    const { sweepStuckBouts } = await loadSweep();
    const result = await sweepStuckBouts();

    expect(result.swept).toBe(3);
    expect(result.refunded).toBe(2); // bout-a and bout-b have owners
    expect(result.details).toHaveLength(3);
    expect(result.details[2]!.refundedMicro).toBe(0); // anonymous bout
  });
});
