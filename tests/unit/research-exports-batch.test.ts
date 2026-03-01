import { describe, expect, it, vi } from 'vitest';

import { batchQuery, BATCH_SIZE } from '@/lib/research-exports';

describe('research-exports batchQuery', () => {
  it('handles large datasets without loading all rows at once', async () => {
    // Simulate a dataset larger than one batch: first call returns a full
    // batch (BATCH_SIZE rows), second call returns a partial batch (fewer
    // rows), signalling the end of results.
    const fullBatch = Array.from({ length: BATCH_SIZE }, (_, i) => ({
      id: i,
    }));
    const partialBatch = Array.from({ length: 42 }, (_, i) => ({
      id: BATCH_SIZE + i,
    }));

    const queryFn = vi.fn<(offset: number, limit: number) => Promise<{ id: number }[]>>();
    queryFn.mockResolvedValueOnce(fullBatch);
    queryFn.mockResolvedValueOnce(partialBatch);

    const results: { id: number }[] = [];
    for await (const row of batchQuery(queryFn)) {
      results.push(row);
    }

    // Verify the generator made exactly 2 calls (paginated, not unbounded)
    expect(queryFn).toHaveBeenCalledTimes(2);
    expect(queryFn).toHaveBeenNthCalledWith(1, 0, BATCH_SIZE);
    expect(queryFn).toHaveBeenNthCalledWith(2, BATCH_SIZE, BATCH_SIZE);

    // Verify all rows were yielded
    expect(results).toHaveLength(BATCH_SIZE + 42);
    expect(results[0]!.id).toBe(0);
    expect(results[BATCH_SIZE]!.id).toBe(BATCH_SIZE);
    expect(results[results.length - 1]!.id).toBe(BATCH_SIZE + 41);
  });

  it('returns empty when first batch is empty', async () => {
    const queryFn = vi.fn<(offset: number, limit: number) => Promise<never[]>>();
    queryFn.mockResolvedValueOnce([]);

    const results: unknown[] = [];
    for await (const row of batchQuery(queryFn)) {
      results.push(row);
    }

    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(results).toHaveLength(0);
  });

  it('stops after exactly one batch when rows < batchSize', async () => {
    const queryFn = vi.fn<(offset: number, limit: number) => Promise<{ id: number }[]>>();
    queryFn.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);

    const results: { id: number }[] = [];
    for await (const row of batchQuery(queryFn, 100)) {
      results.push(row);
    }

    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(queryFn).toHaveBeenCalledWith(0, 100);
    expect(results).toHaveLength(2);
  });
});
