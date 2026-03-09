// Agent creation — insert agent record, compute prompt hash.
// No lineage tracking, no EAS attestations (out of scope).

import crypto from "node:crypto";
import { db } from "@/db";
import { agents } from "@/db/schema";
import { AgentId, UserId, agentId } from "@/lib/common/types";
import { AgentCreateInput } from "./types";

export interface CreateAgentResult {
  agentId: AgentId;
  promptHash: string;
}

/**
 * Computes SHA-256 hash of agent identity content.
 * Uses systemPrompt if present, otherwise canonical JSON of structured fields.
 * Returns 0x-prefixed 64-char hex string.
 */
export function computePromptHash(input: AgentCreateInput): string {
  let content: string;

  if (input.systemPrompt) {
    content = input.systemPrompt;
  } else {
    // Structured fields serialized with explicit key ordering for determinism.
    // Keys are alphabetically sorted in the object literal — DO NOT reorder without
    // understanding that this changes all existing prompt hashes.
    // JSON.stringify preserves insertion order in V8/Node but this is an implementation
    // detail. If cross-engine determinism is ever needed, use a stable stringify library.
    const structured = {
      archetype: input.archetype ?? null,
      goal: input.goal ?? null,
      name: input.name,
      openingMove: input.openingMove ?? null,
      quirks: input.quirks ?? null,
      signatureMove: input.signatureMove ?? null,
      speechPattern: input.speechPattern ?? null,
      tone: input.tone ?? null,
      weakness: input.weakness ?? null,
    };
    content = JSON.stringify(structured);
  }

  const hash = crypto.createHash("sha256").update(content).digest("hex");
  return `0x${hash}`;
}

/**
 * Creates an agent record in the database.
 * Generates nanoid-style ID (21 chars) and SHA-256 prompt hash.
 */
export async function createAgent(
  userId: UserId,
  input: AgentCreateInput,
): Promise<CreateAgentResult> {
  // Generate ID using crypto.randomUUID (available in Node.js)
  // Truncate to 21 chars for nanoid-like length
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 21);
  const promptHash = computePromptHash(input);

  await db.insert(agents).values({
    id,
    ownerId: userId,
    name: input.name,
    systemPrompt: input.systemPrompt ?? null,
    archetype: input.archetype ?? null,
    tone: input.tone ?? null,
    quirks: input.quirks ?? null,
    speechPattern: input.speechPattern ?? null,
    openingMove: input.openingMove ?? null,
    signatureMove: input.signatureMove ?? null,
    weakness: input.weakness ?? null,
    goal: input.goal ?? null,
    promptHash,
    tier: "custom",
  });

  return {
    agentId: agentId(id),
    promptHash,
  };
}
