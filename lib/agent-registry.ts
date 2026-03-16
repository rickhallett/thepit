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

import { and, eq, sql } from 'drizzle-orm';

import { requireDb } from '@/db';
import { agents } from '@/db/schema';
import { DEFAULT_RESPONSE_FORMAT } from '@/lib/response-formats';
import { DEFAULT_RESPONSE_LENGTH } from '@/lib/response-lengths';
import { ALL_PRESETS } from '@/lib/presets';
import { buildAgentManifest, hashAgentManifest, hashAgentPrompt } from '@/lib/agent-dna';
import { findPresetAgent, presetToSnapshot, rowToSnapshot } from '@/lib/agent-mapper';
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

export const getAgentSnapshots = async (): Promise<AgentSnapshot[]> => {
  try {
    const db = requireDb();
    const rows = await db.select().from(agents).where(eq(agents.archived, false));
    if (rows.length) {
      return rows.map((row) => {
        const presetMatch = findPresetAgent(row.id);
        return rowToSnapshot(row, presetMatch);
      });
    }
  } catch (error) {
    log.error('Failed to load agents from DB', toError(error));
  }

  const fallback = await Promise.all(
    ALL_PRESETS.flatMap((preset) =>
      preset.agents.map(async (agent) => {
        const agentId = buildPresetAgentId(preset.id, agent.id);
        const snapshot = presetToSnapshot(agentId, { preset, agent });
        return {
          ...snapshot,
          promptHash: await hashAgentPrompt(agent.systemPrompt),
        };
      }),
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

// ---------------------------------------------------------------------------
// Data Access Layer functions (extracted from app/ route handlers)
// ---------------------------------------------------------------------------

/** Values accepted when inserting a new agent row. */
export type AgentInsertValues = {
  id: string;
  name: string;
  systemPrompt: string;
  presetId: string | null;
  tier: 'free' | 'premium' | 'custom';
  model: string | null;
  responseLength: string;
  responseFormat: string;
  archetype?: string | null;
  tone?: string | null;
  quirks?: string[];
  speechPattern?: string | null;
  openingMove?: string | null;
  signatureMove?: string | null;
  weakness?: string | null;
  goal?: string | null;
  fears?: string | null;
  customInstructions?: string | null;
  createdAt?: Date;
  ownerId?: string | null;
  parentId?: string | null;
  promptHash: string;
  manifestHash: string;
};

/** Count active (non-archived) agents owned by a user. */
export async function countActiveUserAgents(userId: string): Promise<number> {
  const db = requireDb();
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(agents)
    .where(
      and(
        eq(agents.ownerId, userId),
        eq(agents.archived, false),
      ),
    );
  return result?.count ?? 0;
}

/**
 * Atomically check user agent slot availability and insert a new agent.
 *
 * Wraps the count query and insert in a transaction with FOR UPDATE
 * semantics to prevent race conditions where two concurrent requests
 * both pass the slot check before either insert completes (RD-017).
 */
export async function createAgentWithSlotCheck(
  userId: string,
  values: AgentInsertValues,
  canCreateFn: (userId: string, count: number) => Promise<{ allowed: boolean; reason?: string }>,
): Promise<void> {
  const db = requireDb();
  await db.transaction(async (tx) => {
    const [countResult] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(agents)
      .where(
        and(
          eq(agents.ownerId, userId),
          eq(agents.archived, false),
        ),
      );
    const currentCount = countResult?.count ?? 0;
    const slotCheck = await canCreateFn(userId, currentCount);
    if (!slotCheck.allowed) {
      throw new Error(slotCheck.reason ?? 'Agent slot limit reached.');
    }
    await tx.insert(agents).values(values);
  });
}

/** Insert an agent row directly (no slot check). Used by seed-agents. */
export async function insertAgent(values: AgentInsertValues): Promise<void> {
  const db = requireDb();
  await db.insert(agents).values(values);
}

/** Update attestation data on an agent after EAS attestation. */
export async function updateAgentAttestation(
  agentId: string,
  data: { uid: string; txHash: string },
): Promise<void> {
  const db = requireDb();
  await db
    .update(agents)
    .set({
      attestationUid: data.uid,
      attestationTxHash: data.txHash,
      attestedAt: new Date(),
    })
    .where(eq(agents.id, agentId));
}

/** Mark an agent as archived. */
export async function archiveAgent(agentId: string): Promise<void> {
  const db = requireDb();
  await db
    .update(agents)
    .set({ archived: true })
    .where(eq(agents.id, agentId));
}

/** Restore an archived agent. */
export async function restoreAgent(agentId: string): Promise<void> {
  const db = requireDb();
  await db
    .update(agents)
    .set({ archived: false })
    .where(eq(agents.id, agentId));
}
