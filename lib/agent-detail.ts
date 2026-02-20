// Agent detail page data: fetches a single agent's full snapshot plus its
// clone lineage (up to maxDepth generations of parent agents). Falls back to
// preset definitions when the agent isn't yet in the database.

import { getPresetById } from '@/lib/presets';
import { requireDb } from '@/db';
import { agents } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { AgentSnapshot } from '@/lib/agent-registry';
import { parsePresetAgentId } from '@/lib/agent-registry';
import { rowToSnapshot } from '@/lib/agent-mapper';
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
  const preset = getPresetById(parsed.presetId);
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
    snapshot = rowToSnapshot(row, presetMatch);
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
