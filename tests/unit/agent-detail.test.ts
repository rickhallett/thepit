import { describe, expect, it, vi, beforeEach } from 'vitest';

// Hoist mock helpers before any imports that trigger module loading
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
  DEFAULT_RESPONSE_LENGTH: 'short',
}));

vi.mock('@/lib/response-formats', () => ({
  DEFAULT_RESPONSE_FORMAT: 'spaced',
}));

import { getAgentDetail } from '@/lib/agent-detail';

describe('agent-detail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbRows.length = 0;
  });

  it('returns agent detail from DB when found', async () => {
    mockDbRows.push({
      id: 'agent-1',
      name: 'DB Agent',
      presetId: null,
      tier: 'custom',
      systemPrompt: 'Be helpful.',
      responseLength: 'standard',
      responseFormat: 'spaced',
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
      parentId: null,
      promptHash: '0xabc',
      manifestHash: '0xdef',
      attestationUid: null,
      attestationTxHash: null,
      archived: false,
    });

    const result = await getAgentDetail('agent-1');
    expect(result).toBeDefined();
    expect(result!.id).toBe('agent-1');
    expect(result!.name).toBe('DB Agent');
    expect(result!.lineage).toEqual([]);
  });

  it('falls back to preset definition for preset: IDs when not in DB', async () => {
    // No DB rows pushed - will return empty
    const result = await getAgentDetail('preset:darwin-special:darwin');
    expect(result).toBeDefined();
    expect(result!.name).toBe('Charles Darwin');
    expect(result!.lineage).toEqual([]);
  });

  it('returns null when agent not found anywhere', async () => {
    const result = await getAgentDetail('nonexistent-agent-id');
    expect(result).toBeNull();
  });

  it('walks lineage chain up to maxDepth', async () => {
    // First call: the agent itself
    mockDbRows.push({
      id: 'child',
      name: 'Child Agent',
      presetId: null,
      tier: 'custom',
      systemPrompt: 'I am the child.',
      responseLength: 'standard',
      responseFormat: 'spaced',
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
      parentId: 'parent-1',
      promptHash: '0x111',
      manifestHash: '0x222',
      attestationUid: null,
      attestationTxHash: null,
      archived: false,
    });
    // Second call: lineage parent-1
    mockDbRows.push({ id: 'parent-1', name: 'Parent Agent', parentId: 'grandparent-1' });
    // Third call: lineage grandparent-1
    mockDbRows.push({ id: 'grandparent-1', name: 'Grandparent Agent', parentId: null });

    const result = await getAgentDetail('child', 3);
    expect(result).toBeDefined();
    expect(result!.lineage).toHaveLength(2);
    expect(result!.lineage[0]).toEqual({ id: 'parent-1', name: 'Parent Agent' });
    expect(result!.lineage[1]).toEqual({ id: 'grandparent-1', name: 'Grandparent Agent' });
  });

  it('stops lineage when parent not found in DB or presets', async () => {
    mockDbRows.push({
      id: 'orphan',
      name: 'Orphan Agent',
      presetId: null,
      tier: 'custom',
      systemPrompt: 'I have a missing parent.',
      responseLength: 'standard',
      responseFormat: 'spaced',
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
      parentId: 'missing-parent',
      promptHash: '0xaaa',
      manifestHash: '0xbbb',
      attestationUid: null,
      attestationTxHash: null,
      archived: false,
    });
    // No parent row pushed — parent ID is not a preset either

    const result = await getAgentDetail('orphan');
    expect(result).toBeDefined();
    expect(result!.lineage).toEqual([]);
  });

  it('resolves lineage to preset agent when parent not in DB but is a preset', async () => {
    mockDbRows.push({
      id: 'clone-1',
      name: 'Darwin Clone',
      presetId: null,
      tier: 'custom',
      systemPrompt: 'I am a clone of Darwin.',
      responseLength: 'standard',
      responseFormat: 'spaced',
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
      parentId: 'preset:darwin-special:darwin',
      promptHash: '0xccc',
      manifestHash: '0xddd',
      attestationUid: null,
      attestationTxHash: null,
      archived: false,
    });
    // No parent DB row — but parent ID matches a preset agent

    const result = await getAgentDetail('clone-1');
    expect(result).toBeDefined();
    expect(result!.lineage).toHaveLength(1);
    expect(result!.lineage[0]).toEqual({
      id: 'preset:darwin-special:darwin',
      name: 'Charles Darwin',
    });
  });
});
