import { describe, expect, it } from 'vitest';

import {
  buildAgentManifest,
  hashAgentManifest,
} from '@/lib/agent-dna';
import { MODEL_IDS } from '@/lib/models';

describe('agent-dna edge cases', () => {
  // H1: buildAgentManifest with all optional fields supplied
  it('builds manifest with all optional fields populated', () => {
    const manifest = buildAgentManifest({
      agentId: 'agent-full',
      name: 'Full Agent',
      systemPrompt: 'I have all fields.',
      presetId: 'my-preset',
      tier: 'premium',
      model: MODEL_IDS.SONNET,
      responseLength: 'long',
      responseFormat: 'spaced',
      createdAt: '2026-02-08T12:00:00.000Z',
      parentId: 'parent-agent-1',
      ownerId: 'user-owner-1',
    });

    expect(manifest.presetId).toBe('my-preset');
    expect(manifest.model).toBe(MODEL_IDS.SONNET);
    expect(manifest.parentId).toBe('parent-agent-1');
    expect(manifest.ownerId).toBe('user-owner-1');
    expect(manifest.createdAt).toBe('2026-02-08T12:00:00.000Z');
  });

  // H2: Different inputs → different hashes
  it('different inputs produce different hashes', async () => {
    const manifestA = buildAgentManifest({
      agentId: 'agent-a',
      name: 'Agent A',
      systemPrompt: 'Prompt A',
      tier: 'free',
      responseLength: 'standard',
      responseFormat: 'plain',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    const manifestB = buildAgentManifest({
      agentId: 'agent-b',
      name: 'Agent B',
      systemPrompt: 'Prompt B',
      tier: 'free',
      responseLength: 'standard',
      responseFormat: 'plain',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    const hashA = await hashAgentManifest(manifestA);
    const hashB = await hashAgentManifest(manifestB);

    expect(hashA).not.toBe(hashB);
    expect(hashA).toMatch(/^0x[a-f0-9]{64}$/);
    expect(hashB).toMatch(/^0x[a-f0-9]{64}$/);
  });
});
