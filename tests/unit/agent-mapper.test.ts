import { describe, expect, it } from 'vitest';
import { rowToSnapshot } from '@/lib/agent-mapper';

describe('rowToSnapshot', () => {
  const mockRow = {
    id: 'preset:test:agent-1',
    name: 'Test Agent',
    presetId: 'test',
    tier: 'free' as const,
    systemPrompt: 'You are a test agent.',
    responseLength: 'standard',
    responseFormat: 'spaced',
    archetype: 'tester',
    tone: 'serious',
    quirks: ['tests everything'],
    speechPattern: 'formal',
    openingMove: 'Let us begin',
    signatureMove: 'QED',
    weakness: 'brevity',
    goal: 'coverage',
    fears: 'regressions',
    customInstructions: 'Be thorough',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ownerId: 'user-123',
    parentId: 'parent-456',
    promptHash: 'abc123',
    manifestHash: 'def456',
    attestationUid: 'att-789',
    attestationTxHash: 'tx-012',
    archived: false,
    model: null,
    attestedAt: null,
    updatedAt: new Date(),
  };

  it('maps all row fields to snapshot', () => {
    const snapshot = rowToSnapshot(mockRow, null);

    expect(snapshot.id).toBe('preset:test:agent-1');
    expect(snapshot.name).toBe('Test Agent');
    expect(snapshot.presetId).toBe('test');
    expect(snapshot.presetName).toBeNull();
    expect(snapshot.tier).toBe('free');
    expect(snapshot.systemPrompt).toBe('You are a test agent.');
    expect(snapshot.archetype).toBe('tester');
    expect(snapshot.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(snapshot.ownerId).toBe('user-123');
    expect(snapshot.parentId).toBe('parent-456');
    expect(snapshot.archived).toBe(false);
  });

  it('uses preset match for name, color, and avatar', () => {
    const presetMatch = {
      preset: { name: 'Test Preset' },
      agent: { color: '#ff0000', avatar: 'star' },
    };

    const snapshot = rowToSnapshot(mockRow, presetMatch);

    expect(snapshot.presetName).toBe('Test Preset');
    expect(snapshot.color).toBe('#ff0000');
    expect(snapshot.avatar).toBe('star');
  });

  it('returns null for null fields', () => {
    const nullRow = {
      ...mockRow,
      presetId: null,
      archetype: null,
      tone: null,
      quirks: null,
      createdAt: null as unknown as Date,
      ownerId: null,
      parentId: null,
    };

    const snapshot = rowToSnapshot(nullRow, null);

    expect(snapshot.presetId).toBeNull();
    expect(snapshot.archetype).toBeNull();
    expect(snapshot.createdAt).toBeNull();
    expect(snapshot.ownerId).toBeNull();
  });
});
