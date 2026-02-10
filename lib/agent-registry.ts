import { eq } from 'drizzle-orm';

import { requireDb } from '@/db';
import { agents } from '@/db/schema';
import { DEFAULT_RESPONSE_FORMAT } from '@/lib/response-formats';
import { DEFAULT_RESPONSE_LENGTH } from '@/lib/response-lengths';
import { ALL_PRESETS } from '@/lib/presets';
import { buildAgentManifest, hashAgentManifest, hashAgentPrompt } from '@/lib/agent-dna';

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
};

export const buildPresetAgentId = (presetId: string, agentId: string) =>
  `preset:${presetId}:${agentId}`;

export const parsePresetAgentId = (agentId: string) => {
  if (!agentId.startsWith('preset:')) return null;
  const [, presetId, innerId] = agentId.split(':');
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
    const rows = await db.select().from(agents);
    if (rows.length) {
      return rows.map((row) => {
        const parsed = parsePresetAgentId(row.id);
        const presetMatch =
          parsed && row.presetId
            ? findPresetAgent(parsed.presetId, parsed.agentId)
            : null;
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
        } satisfies AgentSnapshot;
      });
    }
  } catch (error) {
    console.error('Failed to load agents from DB', error);
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
    .where(eq(agents.id, agentId))
    .limit(1);
  return row;
};
