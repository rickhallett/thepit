import { describe, expect, it, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const {
  mockDb, mockReturning, mockSelectWhere, mockUpdateSet, mockGenerateText,
} = vi.hoisted(() => {
  const mockReturning = vi.fn().mockResolvedValue([]);
  const mockSelectWhere = vi.fn();
  const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
  const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });

  const mockDb = {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: mockReturning,
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: mockSelectWhere,
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: mockUpdateSet,
    }),
  };

  const mockGenerateText = vi.fn().mockResolvedValue({
    text: 'Generated response',
    finishReason: 'stop',
    usage: { promptTokens: 100, completionTokens: 50 },
  });

  return { mockDb, mockReturning, mockSelectWhere, mockUpdateSet, mockGenerateText };
});

vi.mock('@/db/schema', () => ({
  runs: { id: 'id', taskId: 'task_id', status: 'status', startedAt: 'started_at' },
  tasks: { id: 'id' },
  contestants: { runId: 'run_id' },
  traces: {},
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ _eq: val })),
  and: vi.fn((...args: unknown[]) => ({ _and: args })),
  lt: vi.fn((_col: unknown, val: unknown) => ({ _lt: val })),
}));

vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'trace-nanoid-0000000'),
}));

vi.mock('ai', () => ({
  generateText: mockGenerateText,
}));

vi.mock('@/lib/ai', () => ({
  getModel: vi.fn(() => 'mocked-model-instance'),
}));

import { executeRun, sweepStaleRuns, buildMessages } from '@/lib/run/engine';
import type { DbOrTx } from '@/db';
import type { RunId } from '@/lib/domain-ids';
import type { Task, Contestant } from '@/lib/run/types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const fakeRunId = 'run-abc-000000000000' as RunId;

const fakeRun = {
  id: fakeRunId,
  taskId: 'task-abc-00000000000',
  status: 'pending' as const,
  ownerId: null,
  startedAt: null,
  completedAt: null,
  error: null,
  metadata: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const fakeTask: Task = {
  id: 'task-abc-00000000000',
  name: 'Test task',
  description: null,
  prompt: 'Score this answer.',
  constraints: ['Be concise'],
  expectedOutputShape: 'text',
  acceptanceCriteria: ['Correct score'],
  domain: 'evaluation',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const fakeContestant1: Contestant = {
  id: 'cont-1-00000000000',
  runId: fakeRunId,
  label: 'GPT-4o',
  model: 'gpt-4o',
  provider: 'openai',
  systemPrompt: 'You are an expert.',
  temperature: 0.5,
  maxTokens: 1000,
  toolAccess: null,
  contextBundle: null,
  createdAt: new Date(),
};

const fakeContestant2: Contestant = {
  id: 'cont-2-00000000000',
  runId: fakeRunId,
  label: 'Claude Sonnet',
  model: 'claude-sonnet-4-20250514',
  provider: 'anthropic',
  systemPrompt: null,
  temperature: null,
  maxTokens: null,
  toolAccess: null,
  contextBundle: {
    documents: [{ label: 'CV', content: 'Senior engineer...' }],
  },
  createdAt: new Date(),
};

const fakeTrace = {
  id: 'trace-nanoid-0000000',
  runId: fakeRunId,
  contestantId: 'cont-1-00000000000',
  requestMessages: [{ role: 'user', content: 'Score this answer.' }],
  requestModel: 'gpt-4o',
  requestTemperature: 0.5,
  responseContent: 'Generated response',
  responseFinishReason: 'stop',
  inputTokens: 100,
  outputTokens: 50,
  totalTokens: 150,
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

let selectCallCount = 0;

function resetMocks() {
  selectCallCount = 0;

  // insert chain
  mockDb.insert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: mockReturning,
    }),
  });

  // update chain
  const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
  mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
  mockDb.update.mockReturnValue({ set: mockUpdateSet });

  // select chain -- sequential: run, task, contestants
  mockSelectWhere.mockImplementation(() => {
    selectCallCount++;
    if (selectCallCount === 1) {
      // getRun -- returns .limit()
      return { limit: vi.fn().mockResolvedValue([fakeRun]) };
    }
    if (selectCallCount === 2) {
      // getTask -- returns .limit()
      return { limit: vi.fn().mockResolvedValue([fakeTask]) };
    }
    // getContestants -- returns array directly
    return Promise.resolve([fakeContestant1, fakeContestant2]);
  });

  // generateText mock
  mockGenerateText.mockResolvedValue({
    text: 'Generated response',
    finishReason: 'stop',
    usage: { promptTokens: 100, completionTokens: 50 },
  });

  // trace insert
  mockReturning.mockResolvedValue([fakeTrace]);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('lib/run/engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMocks();
  });

  // ── buildMessages ──────────────────────────────────────────────────────

  describe('buildMessages', () => {
    it('includes system prompt when present', () => {
      const msgs = buildMessages(fakeTask, fakeContestant1);
      expect(msgs[0]).toEqual({ role: 'system', content: 'You are an expert.' });
    });

    it('omits system prompt when absent', () => {
      const noPrompt = { ...fakeContestant1, systemPrompt: null };
      const msgs = buildMessages(fakeTask, noPrompt);
      expect(msgs[0]!.role).toBe('user');
    });

    it('includes context bundle documents', () => {
      const msgs = buildMessages(fakeTask, fakeContestant2);
      const contextMsg = msgs.find((m) => m.content.includes('--- CV ---'));
      expect(contextMsg).toBeDefined();
      expect(contextMsg!.content).toContain('Senior engineer...');
    });

    it('includes constraints and acceptance criteria', () => {
      const msgs = buildMessages(fakeTask, fakeContestant1);
      const taskMsg = msgs.find((m) => m.content.includes('Constraints:'));
      expect(taskMsg).toBeDefined();
      expect(taskMsg!.content).toContain('Be concise');
      expect(taskMsg!.content).toContain('Correct score');
    });

    it('handles task with no constraints or criteria', () => {
      const simpleTask = { ...fakeTask, constraints: null, acceptanceCriteria: null };
      const msgs = buildMessages(simpleTask, { ...fakeContestant1, systemPrompt: null });
      expect(msgs).toHaveLength(1);
      expect(msgs[0]!.content).toBe('Score this answer.');
    });
  });

  // ── executeRun ─────────────────────────────────────────────────────────

  describe('executeRun', () => {
    it('calls generateText for each contestant', async () => {
      await executeRun(mockDb as unknown as DbOrTx, fakeRunId);
      expect(mockGenerateText).toHaveBeenCalledTimes(2);
    });

    it('returns run with traces', async () => {
      const result = await executeRun(mockDb as unknown as DbOrTx, fakeRunId);
      expect(result.task).toBeDefined();
      expect(result.contestants).toHaveLength(2);
      expect(result.contestants[0]!.trace).toBeDefined();
    });

    it('updates run status to running then completed', async () => {
      await executeRun(mockDb as unknown as DbOrTx, fakeRunId);
      // update called at least twice: running + completed
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('rejects non-pending runs', async () => {
      selectCallCount = 0;
      mockSelectWhere.mockImplementation(() => {
        selectCallCount++;
        return { limit: vi.fn().mockResolvedValue([{ ...fakeRun, status: 'completed' }]) };
      });

      await expect(
        executeRun(mockDb as unknown as DbOrTx, fakeRunId),
      ).rejects.toThrow('expected pending');
    });

    it('rejects missing run', async () => {
      selectCallCount = 0;
      mockSelectWhere.mockImplementation(() => {
        selectCallCount++;
        return { limit: vi.fn().mockResolvedValue([]) };
      });

      await expect(
        executeRun(mockDb as unknown as DbOrTx, fakeRunId),
      ).rejects.toThrow('Run not found');
    });

    it('handles single contestant failure gracefully', async () => {
      let genCallCount = 0;
      mockGenerateText.mockImplementation(() => {
        genCallCount++;
        if (genCallCount === 1) throw new Error('Model unavailable');
        return {
          text: 'OK',
          finishReason: 'stop',
          usage: { promptTokens: 50, completionTokens: 20 },
        };
      });

      const result = await executeRun(mockDb as unknown as DbOrTx, fakeRunId);
      // Should complete (not fail) because one contestant succeeded
      expect(result.status).toBe('completed');
    });

    it('marks run as failed when all contestants error', async () => {
      mockGenerateText.mockRejectedValue(new Error('All broken'));

      const result = await executeRun(mockDb as unknown as DbOrTx, fakeRunId);
      expect(result.status).toBe('failed');
    });
  });

  // ── sweepStaleRuns ─────────────────────────────────────────────────────

  describe('sweepStaleRuns', () => {
    it('returns 0 when no stale runs exist', async () => {
      selectCallCount = 0;
      mockSelectWhere.mockResolvedValue([]);

      const count = await sweepStaleRuns(mockDb as unknown as DbOrTx);
      expect(count).toBe(0);
    });

    it('marks stale runs as failed', async () => {
      const staleRun = {
        ...fakeRun,
        status: 'running',
        startedAt: new Date(Date.now() - 10 * 60 * 1000),
      };
      selectCallCount = 0;
      mockSelectWhere.mockResolvedValue([staleRun]);

      const count = await sweepStaleRuns(mockDb as unknown as DbOrTx);
      expect(count).toBe(1);
      expect(mockDb.update).toHaveBeenCalled();
    });
  });
});
