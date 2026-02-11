import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDb, agentsTable } = vi.hoisted(() => {
  const table = {
    id: 'id',
    name: 'name',
    systemPrompt: 'system_prompt',
    presetId: 'preset_id',
    tier: 'tier',
    model: 'model',
    responseLength: 'response_length',
    responseFormat: 'response_format',
    archetype: 'archetype',
    tone: 'tone',
    quirks: 'quirks',
    speechPattern: 'speech_pattern',
    openingMove: 'opening_move',
    signatureMove: 'signature_move',
    weakness: 'weakness',
    goal: 'goal',
    fears: 'fears',
    customInstructions: 'custom_instructions',
    createdAt: 'created_at',
    ownerId: 'owner_id',
    parentId: 'parent_id',
    promptHash: 'prompt_hash',
    manifestHash: 'manifest_hash',
    attestationUid: 'attestation_uid',
    attestationTxHash: 'attestation_tx_hash',
    attestedAt: 'attested_at',
    archived: 'archived',
  };
  const db = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  };
  return { mockDb: db, agentsTable: table };
});

const fixturePresets = [
  {
    id: 'roast-battle',
    name: 'Roast Battle',
    agents: [
      {
        id: 'judge',
        name: 'The Judge',
        systemPrompt: 'You are a roast battle judge.',
        color: '#FF0000',
        avatar: 'judge.png',
      },
      {
        id: 'hype',
        name: 'Hype Man',
        systemPrompt: 'You hype up the crowd.',
        color: '#00FF00',
      },
    ],
    maxTurns: 10,
    tier: 'free' as const,
  },
];

const mockBuildAgentManifest = vi.fn().mockReturnValue({
  agentId: 'preset:roast-battle:judge',
  name: 'The Judge',
  systemPrompt: 'You are a roast battle judge.',
  presetId: 'roast-battle',
  tier: 'free',
  model: null,
  responseLength: 'standard',
  responseFormat: 'markdown',
  createdAt: '2026-01-01T00:00:00.000Z',
  parentId: null,
  ownerId: null,
});

const mockHashAgentManifest = vi.fn().mockResolvedValue('0xmanifesthash');
const mockHashAgentPrompt = vi.fn().mockResolvedValue('0xprompthash');

vi.mock('@/db', () => ({
  requireDb: () => mockDb,
}));

vi.mock('@/db/schema', () => ({
  agents: agentsTable,
}));

vi.mock('@/lib/presets', () => ({
  ALL_PRESETS: fixturePresets,
}));

vi.mock('@/lib/response-formats', () => ({
  DEFAULT_RESPONSE_FORMAT: 'markdown',
}));

vi.mock('@/lib/response-lengths', () => ({
  DEFAULT_RESPONSE_LENGTH: 'standard',
}));

vi.mock('@/lib/agent-dna', () => ({
  buildAgentManifest: mockBuildAgentManifest,
  hashAgentManifest: mockHashAgentManifest,
  hashAgentPrompt: mockHashAgentPrompt,
}));

const setupSelect = (result: unknown[]) => {
  mockDb.select.mockImplementation(() => ({
    from: () => ({
      where: () => result,
    }),
  }));
};

const setupSelectWithLimit = (result: unknown[]) => {
  mockDb.select.mockImplementation(() => ({
    from: () => ({
      where: () => ({
        limit: async () => result,
      }),
    }),
  }));
};

const loadRegistry = async () => import('@/lib/agent-registry');

describe('agent-registry', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
    mockBuildAgentManifest.mockClear();
    mockHashAgentManifest.mockClear();
    mockHashAgentPrompt.mockClear();
  });

  describe('buildPresetAgentId', () => {
    it('returns composite ID', async () => {
      const { buildPresetAgentId } = await loadRegistry();
      expect(buildPresetAgentId('roast-battle', 'judge')).toBe('preset:roast-battle:judge');
    });
  });

  describe('parsePresetAgentId', () => {
    it('parses a valid preset agent ID', async () => {
      const { parsePresetAgentId } = await loadRegistry();
      const result = parsePresetAgentId('preset:roast-battle:judge');
      expect(result).toEqual({ presetId: 'roast-battle', agentId: 'judge' });
    });

    it('returns null for non-preset ID', async () => {
      const { parsePresetAgentId } = await loadRegistry();
      expect(parsePresetAgentId('custom-abc')).toBeNull();
    });

    it('returns null for malformed preset ID', async () => {
      const { parsePresetAgentId } = await loadRegistry();
      expect(parsePresetAgentId('preset:only-one-part')).toBeNull();
    });
  });

  describe('getAgentSnapshots', () => {
    it('returns DB rows when available', async () => {
      const dbRows = [
        {
          id: 'preset:roast-battle:judge',
          name: 'The Judge',
          presetId: 'roast-battle',
          tier: 'free',
          systemPrompt: 'You are a roast battle judge.',
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
          ownerId: null,
          parentId: null,
          promptHash: '0xabc',
          manifestHash: '0xdef',
          attestationUid: null,
          attestationTxHash: null,
          archived: false,
        },
      ];
      setupSelect(dbRows);

      const { getAgentSnapshots } = await loadRegistry();
      const result = await getAgentSnapshots();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('preset:roast-battle:judge');
      expect(result[0].presetName).toBe('Roast Battle');
      expect(result[0].color).toBe('#FF0000');
    });

    it('falls back to preset definitions when DB is empty', async () => {
      setupSelect([]);

      const { getAgentSnapshots } = await loadRegistry();
      const result = await getAgentSnapshots();
      // fixturePresets has 1 preset with 2 agents
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('preset:roast-battle:judge');
      expect(result[0].name).toBe('The Judge');
      expect(result[0].presetName).toBe('Roast Battle');
      expect(result[1].id).toBe('preset:roast-battle:hype');
    });

    it('falls back gracefully when DB throws', async () => {
      mockDb.select.mockImplementation(() => {
        throw new Error('DB connection failed');
      });

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { getAgentSnapshots } = await loadRegistry();
      const result = await getAgentSnapshots();
      expect(result).toHaveLength(2); // falls back to presets
      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to load agents from DB',
        expect.any(Error),
      );
      errorSpy.mockRestore();
    });
  });

  describe('registerPresetAgent', () => {
    it('builds manifest and returns hashes', async () => {
      const { registerPresetAgent } = await loadRegistry();
      const result = await registerPresetAgent({
        presetId: 'roast-battle',
        agentId: 'judge',
        name: 'The Judge',
        systemPrompt: 'You are a roast battle judge.',
        tier: 'free',
        createdAt: '2026-01-01T00:00:00.000Z',
      });

      expect(result.agentId).toBe('preset:roast-battle:judge');
      expect(result.promptHash).toBe('0xprompthash');
      expect(result.manifestHash).toBe('0xmanifesthash');
      expect(mockBuildAgentManifest).toHaveBeenCalledWith({
        agentId: 'preset:roast-battle:judge',
        name: 'The Judge',
        systemPrompt: 'You are a roast battle judge.',
        presetId: 'roast-battle',
        tier: 'free',
        responseLength: 'standard',
        responseFormat: 'markdown',
        createdAt: '2026-01-01T00:00:00.000Z',
      });
    });
  });

  describe('findAgentById', () => {
    it('returns agent when found (non-archived)', async () => {
      const agentRow = {
        id: 'preset:roast-battle:judge',
        name: 'The Judge',
        archived: false,
      };
      setupSelectWithLimit([agentRow]);

      const { findAgentById } = await loadRegistry();
      const result = await findAgentById('preset:roast-battle:judge');
      expect(result).toEqual(agentRow);
    });

    it('returns undefined when not found', async () => {
      setupSelectWithLimit([]);

      const { findAgentById } = await loadRegistry();
      const result = await findAgentById('nonexistent');
      expect(result).toBeUndefined();
    });
  });
});
