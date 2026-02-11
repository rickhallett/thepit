// Shared agent row-to-snapshot mapping, used by agent-registry and agent-detail.

import type { AgentSnapshot } from '@/lib/agent-registry';
import type { agents } from '@/db/schema';

type AgentRow = typeof agents.$inferSelect;

type PresetMatch = {
  preset: { name: string };
  agent: { color?: string; avatar?: string };
} | null;

/**
 * Map a Drizzle agent row + optional preset match to an AgentSnapshot.
 * Single source of truth for the row-to-snapshot transformation.
 */
export function rowToSnapshot(
  row: AgentRow,
  presetMatch: PresetMatch,
): AgentSnapshot {
  return {
    id: row.id,
    name: row.name,
    presetId: row.presetId ?? null,
    presetName: presetMatch?.preset.name ?? null,
    tier: row.tier,
    color: presetMatch?.agent.color,
    avatar: presetMatch?.agent.avatar,
    systemPrompt: row.systemPrompt,
    responseLength: row.responseLength,
    responseFormat: row.responseFormat,
    archetype: row.archetype ?? null,
    tone: row.tone ?? null,
    quirks: row.quirks ?? null,
    speechPattern: row.speechPattern ?? null,
    openingMove: row.openingMove ?? null,
    signatureMove: row.signatureMove ?? null,
    weakness: row.weakness ?? null,
    goal: row.goal ?? null,
    fears: row.fears ?? null,
    customInstructions: row.customInstructions ?? null,
    createdAt: row.createdAt?.toISOString() ?? null,
    ownerId: row.ownerId ?? null,
    parentId: row.parentId ?? null,
    promptHash: row.promptHash ?? null,
    manifestHash: row.manifestHash ?? null,
    attestationUid: row.attestationUid ?? null,
    attestationTxHash: row.attestationTxHash ?? null,
    archived: row.archived ?? false,
  } satisfies AgentSnapshot;
}
