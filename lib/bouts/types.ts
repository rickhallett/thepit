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

export const BoutCreateRequestSchema = z.object({
  boutId: z.string().min(10).max(21),
  presetId: z.string(),
  topic: z.string().max(500).optional(),
  model: z.string().optional(),
  length: z.enum(["short", "medium", "long"]).optional(),
  format: z.enum(["debate", "roundtable"]).optional(),
});
export type BoutCreateRequest = z.infer<typeof BoutCreateRequestSchema>;
