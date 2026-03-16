// Shared agent snapshot resolution, used by agent-registry, agent-detail,
// and leaderboard. Two entry points:
//
//   rowToSnapshot    - DB row + optional preset enrichment -> AgentSnapshot
//   presetToSnapshot - pure preset definition -> AgentSnapshot (no DB)
//
// Both produce the same AgentSnapshot shape. Consumers should not build
// snapshots inline.

import type { AgentSnapshot } from '@/lib/agent-registry';
import { parsePresetAgentId } from '@/lib/agent-registry';
import type { agents } from '@/db/schema';
import { getPresetById } from '@/lib/presets';
import { DEFAULT_RESPONSE_FORMAT } from '@/lib/response-formats';
import { DEFAULT_RESPONSE_LENGTH } from '@/lib/response-lengths';

type AgentRow = typeof agents.$inferSelect;

export type PresetMatch = {
  preset: { name: string; id: string; tier: 'free' | 'premium' };
  agent: { id: string; name: string; systemPrompt: string; color?: string; avatar?: string };
} | null;

/**
 * Resolve a preset agent by its composite ID (e.g. "preset:roast-battle:judge").
 * Returns the matched preset and agent, or null if not found.
 */
export function findPresetAgent(agentId: string): PresetMatch {
  const parsed = parsePresetAgentId(agentId);
  if (!parsed) return null;
  const preset = getPresetById(parsed.presetId);
  if (!preset) return null;
  const agent = preset.agents.find((item) => item.id === parsed.agentId);
  if (!agent) return null;
  return { preset, agent };
}

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

/**
 * Build an AgentSnapshot from a preset definition (no DB row).
 * Used as fallback when the agent is not yet persisted.
 */
export function presetToSnapshot(
  agentId: string,
  match: NonNullable<PresetMatch>,
): AgentSnapshot {
  return {
    id: agentId,
    name: match.agent.name,
    presetId: match.preset.id,
    presetName: match.preset.name,
    tier: match.preset.tier,
    color: match.agent.color,
    avatar: match.agent.avatar,
    systemPrompt: match.agent.systemPrompt,
    responseLength: DEFAULT_RESPONSE_LENGTH,
    responseFormat: DEFAULT_RESPONSE_FORMAT,
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
    createdAt: null,
    ownerId: null,
    parentId: null,
    promptHash: null,
    manifestHash: null,
    attestationUid: null,
    attestationTxHash: null,
    archived: false,
  } satisfies AgentSnapshot;
}
