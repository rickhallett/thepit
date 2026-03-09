// Agent domain types — Zod schemas for validation, type exports for consumers.
// AgentId branded type lives in lib/common/types.ts.

import { z } from "zod";

/**
 * Zod schema for agent creation input.
 * All fields optional except name. Length constraints match DB column sizes.
 */
export const AgentCreateInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(80, "Name must be 80 characters or fewer"),
  systemPrompt: z.string().max(10000, "System prompt must be 10000 characters or fewer").optional(),
  archetype: z.string().max(200).optional(),
  tone: z.string().max(200).optional(),
  quirks: z.array(z.string().trim().min(1).max(200)).max(20).optional(),
  speechPattern: z.string().max(200).optional(),
  openingMove: z.string().max(500).optional(),
  signatureMove: z.string().max(500).optional(),
  weakness: z.string().max(500).optional(),
  goal: z.string().max(500).optional(),
});

export type AgentCreateInput = z.infer<typeof AgentCreateInputSchema>;

/** Agent snapshot — lightweight projection for lists and catalogs. */
export interface AgentSnapshot {
  id: string;
  name: string;
  archetype: string | null;
  tone: string | null;
  presetId: string | null;
  tier: "free" | "premium" | "custom" | null;
  promptHash: string | null;
}

/** Full agent record — all fields for detail view. */
export interface AgentDetail {
  id: string;
  ownerId: string | null;
  name: string | null;
  systemPrompt: string | null;
  presetId: string | null;
  archetype: string | null;
  tone: string | null;
  quirks: string[] | null;
  speechPattern: string | null;
  openingMove: string | null;
  signatureMove: string | null;
  weakness: string | null;
  goal: string | null;
  promptHash: string | null;
  tier: "free" | "premium" | "custom" | null;
  archived: boolean | null;
  createdAt: Date | null;
}
