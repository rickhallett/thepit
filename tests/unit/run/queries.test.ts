import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { RunId } from '@/lib/domain-ids';

// ---------------------------------------------------------------------------
// Hoisted mocks -- Drizzle query chain
// ---------------------------------------------------------------------------

const { mockDb, mockSelectLimit, mockSelectAll } = vi.hoisted(() => {
  const mockSelectLimit = vi.fn().mockResolvedValue([]);
  const mockSelectAll = vi.fn().mockResolvedValue([]);

  const mockDb = {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: mockSelectLimit,
        }),
      }),
    }),
  };
  return { mockDb, mockSelectLimit, mockSelectAll };
});

vi.mock('@/db/schema', () => ({
  runs: { id: 'id', taskId: 'task_id' },
  tasks: { id: 'id' },
  contestants: { runId: 'run_id', id: 'id' },
  traces: { runId: 'run_id', contestantId: 'contestant_id' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ _eq: val })),
}));

import { getRunWithTraces } from '@/lib/run/queries';
import type { DbOrTx } from '@/db';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const fakeRun = {
  id: 'run-000000000000000000',
  taskId: 'task-00000000000000000',
  status: 'completed' as const,
  ownerId: 'user-1',
  startedAt: new Date(),
  completedAt: new Date(),
  error: null,
  metadata: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const fakeTask = {
  id: 'task-00000000000000000',
  name: 'Test task',
  description: null,
  prompt: 'Do something.',
  constraints: null,
  expectedOutputShape: null,
  acceptanceCriteria: null,
  domain: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const fakeContestant = {
  id: 'cont-00000000000000000',
  runId: 'run-000000000000000000',
  label: 'GPT-4o',
  model: 'gpt-4o',
  provider: 'openai',
  systemPrompt: null,
  temperature: null,
  maxTokens: null,
  toolAccess: null,
  contextBundle: null,
  createdAt: new Date(),
};

const fakeTrace = {
  id: 'trace-0000000000000000',
  runId: 'run-000000000000000000',
  contestantId: 'cont-00000000000000000',
  requestMessages: [{ role: 'user', content: 'Do something.' }],
  requestModel: 'gpt-4o',
  requestTemperature: null,
  responseContent: 'Done.',
  responseFinishReason: 'stop',
  inputTokens: 10,
  outputTokens: 5,
  totalTokens: 15,
  latencyMs: 500,
  status: 'success',
  error: null,
  startedAt: new Date(),
  completedAt: new Date(),
  createdAt: new Date(),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Set up mock chain to return specific values for each sequential select call.
 * Handles both `.where().limit()` (run/task) and `.where()` as thenable (contestants/traces).
 */
function setupSelectSequence(responses: unknown[][]) {
  let callIndex = 0;

  const mockWhere = vi.fn().mockImplementation(() => {
    const idx = callIndex++;
    const data = responses[idx] ?? [];
    // Return object that works as both thenable (for queries without .limit())
    // and as chain with .limit() (for queries with .limit())
    const result = Promise.resolve(data);
    return Object.assign(result, {
      limit: vi.fn().mockResolvedValue(data),
    });
  });

  const mockFrom = vi.fn().mockReturnValue({
    where: mockWhere,
  });

  mockDb.select.mockReturnValue({ from: mockFrom });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('lib/run/queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getRunWithTraces', () => {
    it('returns null when run does not exist', async () => {
      setupSelectSequence([[]]);
      const result = await getRunWithTraces(
        mockDb as unknown as DbOrTx,
        'nonexistent' as unknown as RunId,
      );
      expect(result).toBeNull();
    });

    it('returns null when task does not exist', async () => {
      setupSelectSequence([[fakeRun], []]);
      const result = await getRunWithTraces(
        mockDb as unknown as DbOrTx,
        fakeRun.id as unknown as RunId,
      );
      expect(result).toBeNull();
    });

    it('returns run with task, contestants, and traces', async () => {
      setupSelectSequence([
        [fakeRun],           // run lookup
        [fakeTask],          // task lookup
        [fakeContestant],    // contestants lookup
        [fakeTrace],         // traces lookup
      ]);

      const result = await getRunWithTraces(
        mockDb as unknown as DbOrTx,
        fakeRun.id as unknown as RunId,
      );

      expect(result).not.toBeNull();
      expect(result!.id).toBe(fakeRun.id);
      expect(result!.task).toEqual(fakeTask);
      expect(result!.contestants).toHaveLength(1);
      expect(result!.contestants[0]!.trace).toEqual(fakeTrace);
    });

    it('returns null trace for contestant without trace', async () => {
      setupSelectSequence([
        [fakeRun],
        [fakeTask],
        [fakeContestant],
        [],  // no traces
      ]);

      const result = await getRunWithTraces(
        mockDb as unknown as DbOrTx,
        fakeRun.id as unknown as RunId,
      );

      expect(result).not.toBeNull();
      expect(result!.contestants[0]!.trace).toBeNull();
    });

    it('pairs traces to correct contestants', async () => {
      const contestant2 = { ...fakeContestant, id: 'cont-11111111111111111' };
      const trace2 = { ...fakeTrace, id: 'trace-1111111111111111', contestantId: 'cont-11111111111111111' };

      setupSelectSequence([
        [fakeRun],
        [fakeTask],
        [fakeContestant, contestant2],
        [fakeTrace, trace2],
      ]);

      const result = await getRunWithTraces(
        mockDb as unknown as DbOrTx,
        fakeRun.id as unknown as RunId,
      );

      expect(result!.contestants).toHaveLength(2);
      expect(result!.contestants[0]!.trace!.id).toBe(fakeTrace.id);
      expect(result!.contestants[1]!.trace!.id).toBe(trace2.id);
    });
  });
});
