import { ALL_PRESETS } from '@/lib/presets';
import { requireDb } from '@/db';
import { agents } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { AgentSnapshot } from '@/lib/agent-registry';
import { parsePresetAgentId } from '@/lib/agent-registry';
import { DEFAULT_RESPONSE_LENGTH } from '@/lib/response-lengths';
import { DEFAULT_RESPONSE_FORMAT } from '@/lib/response-formats';

export type AgentLineageEntry = {
  id: string;
  name: string;
};

export type AgentDetail = AgentSnapshot & {
  lineage: AgentLineageEntry[];
};

const findPresetAgentById = (agentId: string) => {
  const parsed = parsePresetAgentId(agentId);
  if (!parsed) return null;
  const preset = ALL_PRESETS.find((item) => item.id === parsed.presetId);
  if (!preset) return null;
  const agent = preset.agents.find((item) => item.id === parsed.agentId);
  if (!agent) return null;
  return { preset, agent };
};

const snapshotFromPreset = (agentId: string): AgentSnapshot | null => {
  const presetMatch = findPresetAgentById(agentId);
  if (!presetMatch) return null;
  return {
    id: agentId,
    name: presetMatch.agent.name,
    presetId: presetMatch.preset.id,
    presetName: presetMatch.preset.name,
    tier: presetMatch.preset.tier,
    color: presetMatch.agent.color,
    avatar: presetMatch.agent.avatar,
    systemPrompt: presetMatch.agent.systemPrompt,
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
  };
};

export const getAgentDetail = async (
  agentId: string,
  maxDepth = 3,
): Promise<AgentDetail | null> => {
  const db = requireDb();
  const [row] = await db
    .select()
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1);

  let snapshot: AgentSnapshot | null = null;
  if (row) {
    const presetMatch = findPresetAgentById(row.id);
    snapshot = {
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
    };
  } else {
    snapshot = snapshotFromPreset(agentId);
  }

  if (!snapshot) return null;

  const lineage: AgentLineageEntry[] = [];
  let currentParent = snapshot.parentId;
  let depth = 0;

  while (currentParent && depth < maxDepth) {
    const [parentRow] = await db
      .select({ id: agents.id, name: agents.name, parentId: agents.parentId })
      .from(agents)
      .where(eq(agents.id, currentParent))
      .limit(1);

    if (!parentRow) break;
    lineage.push({ id: parentRow.id, name: parentRow.name });
    currentParent = parentRow.parentId ?? null;
    depth += 1;
  }

  return { ...snapshot, lineage };
};
