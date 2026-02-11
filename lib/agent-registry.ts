// Agent registry: identity resolution and persistence for AI personas.
//
// Agents exist in two forms:
//   - Preset agents: defined in JSON preset files, identified by composite IDs
//     like "preset:roast-battle:judge" (built via buildPresetAgentId).
//   - Custom agents: user-created via cloning, stored directly in the agents table.
//
// The registry provides a unified snapshot view across both sources, falling
// back to preset definitions when the database is empty or unavailable. This
// ensures leaderboards and agent detail pages work even before agents are
// explicitly registered in the DB.

import { and, eq } from 'drizzle-orm';

import { requireDb } from '@/db';
import { agents } from '@/db/schema';
import { DEFAULT_RESPONSE_FORMAT } from '@/lib/response-formats';
import { DEFAULT_RESPONSE_LENGTH } from '@/lib/response-lengths';
import { ALL_PRESETS } from '@/lib/presets';
import { buildAgentManifest, hashAgentManifest, hashAgentPrompt } from '@/lib/agent-dna';
import { rowToSnapshot } from '@/lib/agent-mapper';
import { toError } from '@/lib/errors';
import { log } from '@/lib/logger';

export type AgentSnapshot = {
  id: string;
  name: string;
  presetId: string | null;
  presetName: string | null;
  tier: 'free' | 'premium' | 'custom';
  color?: string;
  avatar?: string;
  systemPrompt: string;
  responseLength: string;
  responseFormat: string;
  archetype?: string | null;
  tone?: string | null;
  quirks?: string[] | null;
  speechPattern?: string | null;
  openingMove?: string | null;
  signatureMove?: string | null;
  weakness?: string | null;
  goal?: string | null;
  fears?: string | null;
  customInstructions?: string | null;
  createdAt?: string | null;
  ownerId?: string | null;
  parentId?: string | null;
  promptHash?: string | null;
  manifestHash?: string | null;
  attestationUid?: string | null;
  attestationTxHash?: string | null;
  archived?: boolean;
};

export const buildPresetAgentId = (presetId: string, agentId: string) =>
  `preset:${presetId}:${agentId}`;

export const parsePresetAgentId = (agentId: string) => {
  if (!agentId.startsWith('preset:')) return null;
  // Use indexOf instead of split to handle agent IDs containing colons.
  // Format: "preset:<presetId>:<agentId>" where agentId may contain colons.
  const firstColon = 6; // length of "preset"
  const secondColon = agentId.indexOf(':', firstColon + 1);
  if (secondColon === -1) return null;
  const presetId = agentId.slice(firstColon + 1, secondColon);
  const innerId = agentId.slice(secondColon + 1);
  if (!presetId || !innerId) return null;
  return { presetId, agentId: innerId };
};

const findPresetAgent = (presetId: string, agentId: string) => {
  const preset = ALL_PRESETS.find((item) => item.id === presetId);
  if (!preset) return null;
  const agent = preset.agents.find((item) => item.id === agentId);
  if (!agent) return null;
  return { preset, agent };
};

export const getAgentSnapshots = async (): Promise<AgentSnapshot[]> => {
  try {
    const db = requireDb();
    const rows = await db.select().from(agents).where(eq(agents.archived, false));
    if (rows.length) {
      return rows.map((row) => {
        const parsed = parsePresetAgentId(row.id);
        const presetMatch =
          parsed && row.presetId
            ? findPresetAgent(parsed.presetId, parsed.agentId)
            : null;
        return rowToSnapshot(row, presetMatch);
      });
    }
  } catch (error) {
    log.error('Failed to load agents from DB', toError(error));
  }

  const fallback = await Promise.all(
    ALL_PRESETS.flatMap((preset) =>
      preset.agents.map(async (agent) => ({
        id: buildPresetAgentId(preset.id, agent.id),
        name: agent.name,
        presetId: preset.id,
        presetName: preset.name,
        tier: preset.tier,
        color: agent.color,
        avatar: agent.avatar,
        systemPrompt: agent.systemPrompt,
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
        promptHash: await hashAgentPrompt(agent.systemPrompt),
        manifestHash: null,
        attestationUid: null,
        attestationTxHash: null,
        archived: false,
      })),
    ),
  );

  return fallback;
};

export const registerPresetAgent = async (params: {
  presetId: string;
  agentId: string;
  name: string;
  systemPrompt: string;
  tier: 'free' | 'premium' | 'custom';
  createdAt?: string;
}) => {
  const agentId = buildPresetAgentId(params.presetId, params.agentId);
  const manifest = buildAgentManifest({
    agentId,
    name: params.name,
    systemPrompt: params.systemPrompt,
    presetId: params.presetId,
    tier: params.tier,
    responseLength: DEFAULT_RESPONSE_LENGTH,
    responseFormat: DEFAULT_RESPONSE_FORMAT,
    createdAt: params.createdAt,
  });

  const [promptHash, manifestHash] = await Promise.all([
    hashAgentPrompt(params.systemPrompt),
    hashAgentManifest(manifest),
  ]);

  return { agentId, manifest, promptHash, manifestHash };
};

export const findAgentById = async (agentId: string) => {
  const db = requireDb();
  const [row] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.archived, false)))
    .limit(1);
  return row;
};
