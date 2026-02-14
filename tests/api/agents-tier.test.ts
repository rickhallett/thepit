import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const {
  mockDb,
  authMock,
  canCreateAgentMock,
} = vi.hoisted(() => {
  const db = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  };
  return {
    mockDb: db,
    authMock: vi.fn(),
    canCreateAgentMock: vi.fn(),
  };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@/db', () => ({ requireDb: () => mockDb }));

vi.mock('@/db/schema', () => ({
  agents: {
    id: 'id',
    name: 'name',
    systemPrompt: 'system_prompt',
    presetId: 'preset_id',
    tier: 'tier',
    model: 'model',
    responseLength: 'response_length',
    responseFormat: 'response_format',
    ownerId: 'owner_id',
    parentId: 'parent_id',
    promptHash: 'prompt_hash',
    manifestHash: 'manifest_hash',
    archived: 'archived',
    createdAt: 'created_at',
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
    attestationUid: 'attestation_uid',
    attestationTxHash: 'attestation_tx_hash',
    attestedAt: 'attested_at',
  },
}));

vi.mock('@clerk/nextjs/server', () => ({ auth: authMock }));

vi.mock('@/lib/tier', () => ({
  SUBSCRIPTIONS_ENABLED: true,
  canCreateAgent: canCreateAgentMock,
}));

vi.mock('@/lib/eas', () => ({
  EAS_ENABLED: false,
  attestAgent: vi.fn(),
}));

vi.mock('@/lib/users', () => ({
  ensureUserRecord: vi.fn(async () => {}),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({
    success: true,
    remaining: 9,
    resetAt: Date.now() + 3600000,
  })),
}));

vi.mock('@/lib/response-lengths', () => ({
  resolveResponseLength: vi.fn(() => ({
    id: 'standard',
    label: 'Standard',
    hint: '3-5 sentences',
    maxOutputTokens: 200,
    outputTokensPerTurn: 120,
  })),
}));

vi.mock('@/lib/response-formats', () => ({
  resolveResponseFormat: vi.fn(() => ({
    id: 'spaced',
    label: 'Text + spacing',
    hint: 'rich formatting',
    instruction: 'Respond in Markdown.',
  })),
}));

vi.mock('@/lib/agent-dna', () => ({
  buildAgentManifest: vi.fn((input: Record<string, unknown>) => ({
    agentId: input.agentId,
    name: input.name,
    systemPrompt: input.systemPrompt,
    presetId: input.presetId,
    tier: input.tier,
    model: input.model,
    responseLength: input.responseLength,
    responseFormat: input.responseFormat,
    parentId: input.parentId,
    ownerId: input.ownerId,
    createdAt: new Date().toISOString(),
  })),
  hashAgentManifest: vi.fn(async () => 'manifest-hash-abc'),
  hashAgentPrompt: vi.fn(async () => 'prompt-hash-abc'),
}));

vi.mock('@/lib/agent-prompts', () => ({
  buildStructuredPrompt: vi.fn(() => 'structured-prompt'),
}));

// ---------------------------------------------------------------------------
// SUT
// ---------------------------------------------------------------------------

import { POST } from '@/app/api/agents/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeRequest = (body: Record<string, unknown>) =>
  new Request('http://localhost/api/agents', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });

const VALID_PAYLOAD = { name: 'TestAgent', systemPrompt: 'Be helpful.' };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('agents tier-based slot limits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: 'user-1' });

    // DB select: agent count query returns 0 by default
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: async () => [{ count: 0 }],
      }),
    }));

    // DB insert: success
    mockDb.insert.mockImplementation(() => ({
      values: async () => ({}),
    }));

    // DB update (for EAS attestation — disabled, but mock just in case)
    mockDb.update.mockImplementation(() => ({
      set: () => ({
        where: async () => ({}),
      }),
    }));

    canCreateAgentMock.mockResolvedValue({ allowed: true });
  });

  // -------------------------------------------------------------------------
  // 1. Free user at agent limit → 402
  // -------------------------------------------------------------------------
  it('returns 402 when free user is at agent limit', async () => {
    // Agent count = 1 (at free-tier limit)
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: async () => [{ count: 1 }],
      }),
    }));

    canCreateAgentMock.mockResolvedValue({
      allowed: false,
      reason: 'Free tier allows 1 custom agent. Upgrade to create more.',
    });

    const res = await POST(makeRequest(VALID_PAYLOAD));
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.error).toContain('Free tier allows 1 custom agent');
  });

  // -------------------------------------------------------------------------
  // 2. Allows creation when canCreateAgent is allowed
  // -------------------------------------------------------------------------
  it('allows creation when canCreateAgent returns allowed', async () => {
    canCreateAgentMock.mockResolvedValue({ allowed: true });

    const res = await POST(makeRequest(VALID_PAYLOAD));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('agentId');
    expect(body).toHaveProperty('promptHash');
    expect(body).toHaveProperty('manifestHash');
  });

  // -------------------------------------------------------------------------
  // 3. Skips slot check when SUBSCRIPTIONS_ENABLED=false
  // -------------------------------------------------------------------------
  it('skips slot check when subscriptions are disabled', async () => {
    vi.doMock('@/lib/tier', () => ({
      SUBSCRIPTIONS_ENABLED: false,
      canCreateAgent: canCreateAgentMock,
    }));

    // Re-mock all dependencies for fresh import
    vi.resetModules();

    vi.doMock('@/db', () => ({ requireDb: () => mockDb }));
    vi.doMock('@/db/schema', () => ({
      agents: {
        id: 'id',
        name: 'name',
        systemPrompt: 'system_prompt',
        presetId: 'preset_id',
        tier: 'tier',
        model: 'model',
        responseLength: 'response_length',
        responseFormat: 'response_format',
        ownerId: 'owner_id',
        parentId: 'parent_id',
        promptHash: 'prompt_hash',
        manifestHash: 'manifest_hash',
        archived: 'archived',
        createdAt: 'created_at',
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
        attestationUid: 'attestation_uid',
        attestationTxHash: 'attestation_tx_hash',
        attestedAt: 'attested_at',
      },
    }));
    vi.doMock('@clerk/nextjs/server', () => ({ auth: authMock }));
    vi.doMock('@/lib/eas', () => ({
      EAS_ENABLED: false,
      attestAgent: vi.fn(),
    }));
    vi.doMock('@/lib/users', () => ({
      ensureUserRecord: vi.fn(async () => {}),
    }));
    vi.doMock('@/lib/rate-limit', () => ({
      checkRateLimit: vi.fn(() => ({
        success: true,
        remaining: 9,
        resetAt: Date.now() + 3600000,
      })),
    }));
    vi.doMock('@/lib/response-lengths', () => ({
      resolveResponseLength: vi.fn(() => ({
        id: 'standard',
        label: 'Standard',
        hint: '3-5 sentences',
        maxOutputTokens: 200,
        outputTokensPerTurn: 120,
      })),
    }));
    vi.doMock('@/lib/response-formats', () => ({
      resolveResponseFormat: vi.fn(() => ({
        id: 'spaced',
        label: 'Text + spacing',
        hint: 'rich formatting',
        instruction: 'Respond in Markdown.',
      })),
    }));
    vi.doMock('@/lib/agent-dna', () => ({
      buildAgentManifest: vi.fn((input: Record<string, unknown>) => ({
        agentId: input.agentId,
        name: input.name,
        systemPrompt: input.systemPrompt,
        presetId: input.presetId,
        tier: input.tier,
        model: input.model,
        responseLength: input.responseLength,
        responseFormat: input.responseFormat,
        parentId: input.parentId,
        ownerId: input.ownerId,
        createdAt: new Date().toISOString(),
      })),
      hashAgentManifest: vi.fn(async () => 'manifest-hash-abc'),
      hashAgentPrompt: vi.fn(async () => 'prompt-hash-abc'),
    }));
    vi.doMock('@/lib/agent-prompts', () => ({
      buildStructuredPrompt: vi.fn(() => 'structured-prompt'),
    }));

    const { POST: DisabledPOST } = await import('@/app/api/agents/route');

    const res = await DisabledPOST(makeRequest(VALID_PAYLOAD));
    // Should succeed — canCreateAgent should NOT be called
    expect(res.status).toBe(200);
    expect(canCreateAgentMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 4. Returns 401 when not authenticated (before slot check)
  // -------------------------------------------------------------------------
  it('returns 401 when not authenticated (before slot check)', async () => {
    authMock.mockResolvedValue({ userId: null });

    const res = await POST(makeRequest(VALID_PAYLOAD));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
    // canCreateAgent should never be reached
    expect(canCreateAgentMock).not.toHaveBeenCalled();
  });
});
