// Bout types — status enum, transcript entries, SSE events, request schema.
// Source of truth for bout-related type definitions.

import { z } from "zod";

export const BoutStatus = {
  RUNNING: "running",
  COMPLETED: "completed",
  ERROR: "error",
} as const;
export type BoutStatus = (typeof BoutStatus)[keyof typeof BoutStatus];

export interface TranscriptEntry {
  turnIndex: number;
  agentId: string;
  agentName: string;
  agentColor: string;
  content: string;
  tokenCount?: number;
  timestamp: string; // ISO 8601
}

// SSE event types matching SPEC.md
export type SSEEventType =
  | "data-turn" // { turnIndex, agentId, agentName, agentColor }
  | "text-start" // { turnIndex }
  | "text-delta" // { turnIndex, delta: string }
  | "text-end" // { turnIndex, tokenCount }
  | "data-share-line" // { shareLine: string }
  | "error" // { code, message }
  | "done"; // {}

/** Valid model aliases for bout requests. Maps to actual Anthropic model IDs in the route. */
export const VALID_BOUT_MODELS = ["claude-haiku", "claude-sonnet"] as const;
export type BoutModel = (typeof VALID_BOUT_MODELS)[number];

export const BoutCreateRequestSchema = z.object({
  boutId: z.string().min(10).max(21),
  presetId: z.string(),
  topic: z.string().max(500).optional(),
  model: z.enum(VALID_BOUT_MODELS).optional(),
  length: z.enum(["short", "medium", "long"]).optional(),
  format: z.enum(["debate", "roundtable"]).optional(),
});
export type BoutCreateRequest = z.infer<typeof BoutCreateRequestSchema>;
