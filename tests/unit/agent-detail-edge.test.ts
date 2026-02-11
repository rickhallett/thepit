import { describe, expect, it, vi, beforeEach } from 'vitest';

// Hoist mock helpers before any imports
const { mockSelect, mockDbRows } = vi.hoisted(() => {
  const mockDbRows: Record<string, unknown>[] = [];

  const limitFn = vi.fn().mockImplementation(() => {
    const row = mockDbRows.shift();
    return row ? [row] : [];
  });
  const whereFn = vi.fn().mockReturnValue({ limit: limitFn });
  const fromFn = vi.fn().mockReturnValue({ where: whereFn });
  const mockSelect = vi.fn().mockReturnValue({ from: fromFn });

  return { mockSelect, mockDbRows, limitFn, whereFn, fromFn };
});

vi.mock('@/db', () => ({
  requireDb: () => ({ select: mockSelect }),
}));

vi.mock('@/db/schema', () => ({
  agents: { id: 'id', name: 'name', parentId: 'parent_id' },
}));

vi.mock('@/lib/agent-registry', () => ({
  parsePresetAgentId: (agentId: string) => {
    if (!agentId.startsWith('preset:')) return null;
    const [, presetId, innerId] = agentId.split(':');
    if (!presetId || !innerId) return null;
    return { presetId, agentId: innerId };
  },
}));

vi.mock('@/lib/response-lengths', () => ({
  DEFAULT_RESPONSE_LENGTH: 'standard',
}));

vi.mock('@/lib/response-formats', () => ({
  DEFAULT_RESPONSE_FORMAT: 'markdown',
}));

import { getAgentDetail } from '@/lib/agent-detail';

const makeAgentRow = (
  id: string,
  name: string,
  parentId: string | null,
): Record<string, unknown> => ({
  id,
  name,
  presetId: null,
  tier: 'custom',
  systemPrompt: `I am ${name}`,
  responseLength: 'standard',
  responseFormat: 'markdown',
  archetype: null,
  tone: null,
  quirks: null,
  speechPattern: null,
  openingMove: null,
  signatureMove: null,
  weakness: null,
  goal: null,
  fears: null,
  customInstructions: null,
  createdAt: new Date('2026-01-01'),
  ownerId: 'user-1',
  parentId,
  promptHash: '0xabc',
  manifestHash: '0xdef',
  attestationUid: null,
  attestationTxHash: null,
  archived: false,
});

describe('agent-detail edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbRows.length = 0;
  });

  // U1: Lineage chain longer than maxDepth → truncated
  it('lineage chain truncated at maxDepth', async () => {
    // Agent with deep lineage: child -> p1 -> p2 -> p3 -> p4
    mockDbRows.push(makeAgentRow('child', 'Child', 'p1'));
    mockDbRows.push({ id: 'p1', name: 'P1', parentId: 'p2' });
    mockDbRows.push({ id: 'p2', name: 'P2', parentId: 'p3' });
    // p3 would be depth 3, but maxDepth=2 should stop before

    const result = await getAgentDetail('child', 2);
    expect(result).toBeDefined();
    expect(result!.lineage).toHaveLength(2);
    expect(result!.lineage[0].id).toBe('p1');
    expect(result!.lineage[1].id).toBe('p2');
  });

  // U2: Circular parentId → stops at maxDepth
  it('circular parentId does not cause infinite loop', async () => {
    // Agent whose parent points back to itself
    mockDbRows.push(makeAgentRow('circular', 'Circular', 'circular'));
    // Each lineage lookup will find "circular" pointing to itself
    mockDbRows.push({ id: 'circular', name: 'Circular', parentId: 'circular' });
    mockDbRows.push({ id: 'circular', name: 'Circular', parentId: 'circular' });
    mockDbRows.push({ id: 'circular', name: 'Circular', parentId: 'circular' });

    const result = await getAgentDetail('circular', 3);
    expect(result).toBeDefined();
    // Lineage should be capped at maxDepth (3)
    expect(result!.lineage.length).toBeLessThanOrEqual(3);
  });
});
