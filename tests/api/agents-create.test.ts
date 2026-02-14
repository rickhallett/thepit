import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const {
  mockDb,
  authMock,
  canCreateAgentMock,
  attestAgentMock,
  checkRateLimitMock,
  buildStructuredPromptMock,
  hashAgentManifestMock,
  hashAgentPromptMock,
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
    attestAgentMock: vi.fn(),
    checkRateLimitMock: vi.fn(),
    buildStructuredPromptMock: vi.fn(),
    hashAgentManifestMock: vi.fn(),
    hashAgentPromptMock: vi.fn(),
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
  },
}));

vi.mock('@clerk/nextjs/server', () => ({ auth: authMock }));

vi.mock('@/lib/tier', () => ({
  SUBSCRIPTIONS_ENABLED: true,
  canCreateAgent: canCreateAgentMock,
}));

vi.mock('@/lib/eas', () => ({
  EAS_ENABLED: false,
  attestAgent: attestAgentMock,
}));

vi.mock('@/lib/users', () => ({
  ensureUserRecord: vi.fn(async () => {}),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: checkRateLimitMock,
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
  hashAgentManifest: hashAgentManifestMock,
  hashAgentPrompt: hashAgentPromptMock,
}));

vi.mock('@/lib/agent-prompts', () => ({
  buildStructuredPrompt: buildStructuredPromptMock,
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

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ userId: 'user-1' });
  canCreateAgentMock.mockResolvedValue({ allowed: true });

  checkRateLimitMock.mockReturnValue({
    success: true,
    remaining: 9,
    resetAt: Date.now() + 3600000,
  });

  buildStructuredPromptMock.mockReturnValue('structured-prompt-output');
  hashAgentPromptMock.mockResolvedValue('prompt-hash-abc');
  hashAgentManifestMock.mockResolvedValue('manifest-hash-abc');

  // DB select: agent count query returns 0
  mockDb.select.mockImplementation(() => ({
    from: () => ({
      where: async () => [{ count: 0 }],
    }),
  }));

  // DB insert: success
  mockDb.insert.mockImplementation(() => ({
    values: async () => ({}),
  }));

  // DB update (for EAS attestation)
  mockDb.update.mockImplementation(() => ({
    set: () => ({
      where: async () => ({}),
    }),
  }));
});

// ---------------------------------------------------------------------------
// Happy paths
// ---------------------------------------------------------------------------

describe('POST /api/agents — happy paths', () => {
  it('creates agent with full structured fields', async () => {
    const res = await POST(
      makeRequest({
        name: 'StructuredBot',
        archetype: 'The Contrarian',
        tone: 'Sarcastic and dry',
        quirks: ['quotes philosophers', 'uses parentheticals'],
        speechPattern: 'Short, punchy sentences',
        openingMove: 'Starts with a provocative question',
        signatureMove: 'Drops a historical analogy',
        weakness: 'Loses focus on tangents',
        goal: 'Win through logic',
        fears: 'Being proven irrelevant',
        customInstructions: 'Always cite sources',
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('agentId');
    expect(body).toHaveProperty('promptHash', 'prompt-hash-abc');
    expect(body).toHaveProperty('manifestHash', 'manifest-hash-abc');
    expect(body.attestationFailed).toBe(false);
    expect(buildStructuredPromptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'StructuredBot',
        archetype: 'The Contrarian',
        tone: 'Sarcastic and dry',
        quirks: ['quotes philosophers', 'uses parentheticals'],
      }),
    );
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('creates agent with systemPrompt only (no structured fields)', async () => {
    const res = await POST(
      makeRequest({
        name: 'SimpleBot',
        systemPrompt: 'You are a helpful assistant.',
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('agentId');
    expect(body.promptHash).toBe('prompt-hash-abc');
    // buildStructuredPrompt should NOT be called since no structured fields
    expect(buildStructuredPromptMock).not.toHaveBeenCalled();
  });

  it('creates agent with parentId (clone flow)', async () => {
    const res = await POST(
      makeRequest({
        name: 'CloneBot',
        systemPrompt: 'Cloned personality.',
        parentId: 'parent-agent-123',
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('agentId');
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('succeeds when clientManifestHash matches server hash', async () => {
    const res = await POST(
      makeRequest({
        name: 'HashMatchBot',
        systemPrompt: 'Test prompt.',
        clientManifestHash: 'manifest-hash-abc',
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.manifestHash).toBe('manifest-hash-abc');
  });

  it('creates agent with EAS attestation enabled', async () => {
    // Re-import with EAS enabled
    vi.doMock('@/lib/eas', () => ({
      EAS_ENABLED: true,
      attestAgent: attestAgentMock,
    }));
    vi.resetModules();

    // Re-mock all dependencies for fresh import
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
      },
    }));
    vi.doMock('@clerk/nextjs/server', () => ({ auth: authMock }));
    vi.doMock('@/lib/tier', () => ({
      SUBSCRIPTIONS_ENABLED: true,
      canCreateAgent: canCreateAgentMock,
    }));
    vi.doMock('@/lib/users', () => ({
      ensureUserRecord: vi.fn(async () => {}),
    }));
    vi.doMock('@/lib/rate-limit', () => ({
      checkRateLimit: checkRateLimitMock,
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
      hashAgentManifest: hashAgentManifestMock,
      hashAgentPrompt: hashAgentPromptMock,
    }));
    vi.doMock('@/lib/agent-prompts', () => ({
      buildStructuredPrompt: buildStructuredPromptMock,
    }));

    attestAgentMock.mockResolvedValue({
      uid: 'eas-uid-123',
      txHash: '0xdeadbeef',
    });

    const { POST: EasPOST } = await import('@/app/api/agents/route');

    const res = await EasPOST(
      makeRequest({
        name: 'EasBot',
        systemPrompt: 'I am attested.',
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.attestationFailed).toBe(false);
    expect(attestAgentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        promptHash: 'prompt-hash-abc',
        manifestHash: 'manifest-hash-abc',
      }),
    );
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('returns attestationFailed when EAS attestation throws', async () => {
    vi.doMock('@/lib/eas', () => ({
      EAS_ENABLED: true,
      attestAgent: attestAgentMock,
    }));
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
      },
    }));
    vi.doMock('@clerk/nextjs/server', () => ({ auth: authMock }));
    vi.doMock('@/lib/tier', () => ({
      SUBSCRIPTIONS_ENABLED: true,
      canCreateAgent: canCreateAgentMock,
    }));
    vi.doMock('@/lib/users', () => ({
      ensureUserRecord: vi.fn(async () => {}),
    }));
    vi.doMock('@/lib/rate-limit', () => ({
      checkRateLimit: checkRateLimitMock,
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
      hashAgentManifest: hashAgentManifestMock,
      hashAgentPrompt: hashAgentPromptMock,
    }));
    vi.doMock('@/lib/agent-prompts', () => ({
      buildStructuredPrompt: buildStructuredPromptMock,
    }));

    attestAgentMock.mockRejectedValue(new Error('EAS network timeout'));

    const { POST: EasFailPOST } = await import('@/app/api/agents/route');

    const res = await EasFailPOST(
      makeRequest({
        name: 'EasFailBot',
        systemPrompt: 'Test prompt.',
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.attestationFailed).toBe(true);
    expect(body).toHaveProperty('agentId');
  });
});

// ---------------------------------------------------------------------------
// Input validation (unhappy paths)
// ---------------------------------------------------------------------------

describe('POST /api/agents — input validation', () => {
  it('returns 400 when name contains a URL', async () => {
    const res = await POST(
      makeRequest({ name: 'Bot https://evil.com', systemPrompt: 'ok' }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Name must not contain URLs.' });
  });

  it('returns 400 when name contains www.', async () => {
    const res = await POST(
      makeRequest({ name: 'Bot www.evil.com', systemPrompt: 'ok' }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Name must not contain URLs.' });
  });

  it('returns 400 when name exceeds 80 characters', async () => {
    const longName = 'A'.repeat(81);
    const res = await POST(
      makeRequest({ name: longName, systemPrompt: 'ok' }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Name must be 80 characters or fewer.' });
  });

  it('returns 400 when archetype exceeds max length', async () => {
    const res = await POST(
      makeRequest({
        name: 'ValidBot',
        archetype: 'x'.repeat(201),
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'Archetype must be 200 characters or fewer.',
    });
  });

  it('returns 400 when tone exceeds max length', async () => {
    const res = await POST(
      makeRequest({
        name: 'ValidBot',
        tone: 'x'.repeat(201),
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Tone must be 200 characters or fewer.' });
  });

  it('returns 400 when customInstructions exceeds 5000 chars', async () => {
    const res = await POST(
      makeRequest({
        name: 'ValidBot',
        customInstructions: 'x'.repeat(5001),
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'Custom instructions must be 5000 characters or fewer.',
    });
  });

  it('returns 400 when structured field contains <script>', async () => {
    const res = await POST(
      makeRequest({
        name: 'ValidBot',
        archetype: 'The <script>alert(1)</script> type',
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'Archetype must not contain URLs or scripts.',
    });
  });

  it('returns 400 when structured field contains javascript:', async () => {
    const res = await POST(
      makeRequest({
        name: 'ValidBot',
        tone: 'javascript:alert(1)',
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Tone must not contain URLs or scripts.' });
  });

  it('returns 400 when structured field contains a URL', async () => {
    const res = await POST(
      makeRequest({
        name: 'ValidBot',
        goal: 'Visit https://evil.com for details',
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Goal must not contain URLs or scripts.' });
  });

  it('returns 400 when more than 10 quirks are provided', async () => {
    const res = await POST(
      makeRequest({
        name: 'ValidBot',
        systemPrompt: 'ok',
        quirks: Array.from({ length: 11 }, (_, i) => `quirk-${i}`),
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Maximum 10 quirks allowed.' });
  });

  it('returns 400 when a quirk exceeds 100 characters', async () => {
    const res = await POST(
      makeRequest({
        name: 'ValidBot',
        systemPrompt: 'ok',
        quirks: ['x'.repeat(101)],
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'Each quirk must be 100 characters or fewer.',
    });
  });

  it('returns 400 when a quirk contains a URL', async () => {
    const res = await POST(
      makeRequest({
        name: 'ValidBot',
        systemPrompt: 'ok',
        quirks: ['visit https://evil.com'],
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'Quirks must not contain URLs or scripts.',
    });
  });

  it('returns 400 when clientManifestHash does not match', async () => {
    const res = await POST(
      makeRequest({
        name: 'ValidBot',
        systemPrompt: 'ok',
        clientManifestHash: 'wrong-hash-999',
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Manifest hash mismatch.' });
  });

  it('returns 400 when name is missing', async () => {
    const res = await POST(makeRequest({ systemPrompt: 'ok' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Missing name.' });
  });

  it('returns 400 when prompt is missing and no structured fields', async () => {
    const res = await POST(makeRequest({ name: 'NoPromptBot' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Missing prompt.' });
  });
});

// ---------------------------------------------------------------------------
// Auth & rate limiting
// ---------------------------------------------------------------------------

describe('POST /api/agents — auth & rate limiting', () => {
  it('returns 401 when not authenticated', async () => {
    authMock.mockResolvedValue({ userId: null });
    const res = await POST(
      makeRequest({ name: 'Bot', systemPrompt: 'ok' }),
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Authentication required.' });
  });

  it('returns 429 when rate limited', async () => {
    checkRateLimitMock.mockReturnValue({
      success: false,
      remaining: 0,
      resetAt: Date.now() + 3600000,
    });

    const res = await POST(
      makeRequest({ name: 'Bot', systemPrompt: 'ok' }),
    );
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({
      error: 'Rate limit exceeded. Max 10 agents per hour.',
    });
  });
});
