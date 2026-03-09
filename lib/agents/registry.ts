// Agent registry — read operations for agent catalog and detail views.
// No mutations here; use create.ts for writes.

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { agents } from "@/db/schema";
import { AgentId } from "@/lib/common/types";
import { AgentSnapshot, AgentDetail } from "./types";

/**
 * Returns all non-archived agents as lightweight snapshots.
 * Used for agent catalog and selection UIs.
 */
export async function getAgentSnapshots(): Promise<AgentSnapshot[]> {
  const rows = await db
    .select({
      id: agents.id,
      name: agents.name,
      archetype: agents.archetype,
      tone: agents.tone,
      presetId: agents.presetId,
      tier: agents.tier,
      promptHash: agents.promptHash,
    })
    .from(agents)
    .where(eq(agents.archived, false));

  return rows.map((row) => ({
    id: row.id,
    name: row.name ?? "",
    archetype: row.archetype,
    tone: row.tone,
    presetId: row.presetId,
    tier: row.tier,
    promptHash: row.promptHash,
  }));
}

/**
 * Returns full agent record by ID, or null if not found.
 * Used for agent detail view.
 */
export async function getAgentDetail(
  agentId: AgentId,
): Promise<AgentDetail | null> {
  const rows = await db
    .select()
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1);

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  return {
    id: row.id,
    ownerId: row.ownerId,
    name: row.name,
    systemPrompt: row.systemPrompt,
    presetId: row.presetId,
    archetype: row.archetype,
    tone: row.tone,
    quirks: row.quirks,
    speechPattern: row.speechPattern,
    openingMove: row.openingMove,
    signatureMove: row.signatureMove,
    weakness: row.weakness,
    goal: row.goal,
    promptHash: row.promptHash,
    tier: row.tier,
    archived: row.archived,
    createdAt: row.createdAt,
  };
}
