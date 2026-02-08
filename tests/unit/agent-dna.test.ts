import { describe, expect, it, vi } from 'vitest';

import {
  buildAgentManifest,
  canonicalizeAgentManifest,
  canonicalizePrompt,
  hashAgentManifest,
  hashAgentPrompt,
} from '@/lib/agent-dna';

describe('agent dna helpers', () => {
  it('builds manifests with defaulted optional fields', () => {
    const manifest = buildAgentManifest({
      agentId: 'agent-1',
      name: 'Test Agent',
      systemPrompt: 'Be helpful.',
      tier: 'free',
      responseLength: 'standard',
      responseFormat: 'plain',
      createdAt: '2026-02-08T00:00:00.000Z',
    });

    expect(manifest).toEqual({
      agentId: 'agent-1',
      name: 'Test Agent',
      systemPrompt: 'Be helpful.',
      presetId: null,
      tier: 'free',
      model: null,
      responseLength: 'standard',
      responseFormat: 'plain',
      createdAt: '2026-02-08T00:00:00.000Z',
      parentId: null,
      ownerId: null,
    });
  });

  it('canonicalizes manifests and prompts into JSON strings', () => {
    const manifest = buildAgentManifest({
      agentId: 'agent-2',
      name: 'Darwin',
      systemPrompt: 'Observe.',
      tier: 'premium',
      responseLength: 'long',
      responseFormat: 'markdown',
      createdAt: '2026-02-08T00:00:00.000Z',
      presetId: 'darwin-special',
    });

    const canonicalManifest = canonicalizeAgentManifest(manifest);
    expect(JSON.parse(canonicalManifest)).toEqual(manifest);

    const canonicalPrompt = canonicalizePrompt('Focus on evidence.');
    expect(JSON.parse(canonicalPrompt)).toEqual({
      systemPrompt: 'Focus on evidence.',
    });
  });

  it('hashes manifests and prompts deterministically', async () => {
    const manifest = buildAgentManifest({
      agentId: 'agent-3',
      name: 'Hashy',
      systemPrompt: 'Deterministic output.',
      tier: 'custom',
      responseLength: 'short',
      responseFormat: 'json',
      createdAt: '2026-02-08T00:00:00.000Z',
    });

    const hashA = await hashAgentManifest(manifest);
    const hashB = await hashAgentManifest(manifest);
    expect(hashA).toBe(hashB);
    expect(hashA).toMatch(/^0x[a-f0-9]{64}$/);

    const promptHash = await hashAgentPrompt('Deterministic output.');
    expect(promptHash).toMatch(/^0x[a-f0-9]{64}$/);
  });

  it('generates timestamps when createdAt is missing', () => {
    const manifest = buildAgentManifest({
      agentId: 'agent-4',
      name: 'Timestamped',
      systemPrompt: 'Generated timestamp.',
      tier: 'free',
      responseLength: 'standard',
      responseFormat: 'plain',
    });

    expect(manifest.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('throws when canonicalization fails', async () => {
    vi.resetModules();
    vi.doMock('canonicalize', () => ({
      default: () => null,
    }));
    const { canonicalizeAgentManifest, canonicalizePrompt } = await import(
      '@/lib/agent-dna'
    );
    expect(() =>
      canonicalizeAgentManifest({
        agentId: 'agent-4',
        name: 'Fail',
        systemPrompt: 'Fail',
        presetId: null,
        tier: 'free',
        model: null,
        responseLength: 'short',
        responseFormat: 'plain',
        createdAt: '2026-02-08T00:00:00.000Z',
        parentId: null,
        ownerId: null,
      }),
    ).toThrow('Failed to canonicalize agent manifest.');

    expect(() => canonicalizePrompt('Fail')).toThrow(
      'Failed to canonicalize agent prompt.',
    );
  });
});
