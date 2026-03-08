// Bout request validation — schema parsing, preset resolution, content safety, idempotency.
// Used by the run-bout route handler before bout execution.

import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bouts } from "@/db/schema";
import { parseValidBody, errorResponse } from "@/lib/common/api-utils";
import { getPresetById, Preset } from "./presets";
import { BoutCreateRequest, BoutCreateRequestSchema, BoutStatus } from "./types";

export type ValidationResult =
  | { valid: true; data: BoutCreateRequest; preset: Preset }
  | { valid: false; response: Response };

/**
 * Validates a bout creation request.
 * Checks: schema validity, preset existence, content safety, idempotency.
 */
export async function validateBoutRequest(
  req: NextRequest,
): Promise<ValidationResult> {
  // 1. Parse body
  const parsed = await parseValidBody(req, BoutCreateRequestSchema);
  if (!parsed.success) {
    return { valid: false, response: parsed.response };
  }
  const data = parsed.data;

  // 2. Resolve preset
  const preset = getPresetById(data.presetId);
  if (!preset) {
    return {
      valid: false,
      response: errorResponse(400, "PRESET_NOT_FOUND", "Unknown preset ID"),
    };
  }

  // 3. Check topic for unsafe content
  if (containsUnsafeContent(data.topic)) {
    return {
      valid: false,
      response: errorResponse(
        400,
        "UNSAFE_CONTENT",
        "Topic contains prohibited content",
      ),
    };
  }

  // 4. Idempotency check
  const existing = await db.query.bouts.findFirst({
    where: eq(bouts.id, data.boutId),
  });

  if (existing) {
    // Allow retry if previous attempt errored
    if (existing.status === BoutStatus.RUNNING || existing.status === BoutStatus.COMPLETED) {
      return {
        valid: false,
        response: errorResponse(
          409,
          "BOUT_EXISTS",
          "Bout already exists with this ID",
        ),
      };
    }
    // status === "error" falls through — allow retry
  }

  return { valid: true, data, preset };
}

/**
 * Basic content safety filter.
 * Checks for hate speech keywords, prompt injection attempts, and exploit patterns.
 * NOT a comprehensive content moderation system — just a first-pass filter.
 */
export function containsUnsafeContent(text: string | undefined): boolean {
  if (!text) return false;

  const lower = text.toLowerCase();

  // Hate speech keywords (small curated list)
  const hateKeywords = [
    "kill all",
    "genocide",
    "ethnic cleansing",
    "death to",
    "exterminate",
  ];

  for (const keyword of hateKeywords) {
    if (lower.includes(keyword)) return true;
  }

  // Prompt injection attempts
  const injectionPatterns = [
    /ignore\s+(all\s+)?previous\s+instructions/i,
    /ignore\s+(all\s+)?prior\s+instructions/i,
    /disregard\s+(all\s+)?previous/i,
    /forget\s+(all\s+)?previous/i,
    /system\s*prompt/i,
    /\bact\s+as\b.*\brole\b/i,
    /you\s+are\s+now\s+a/i,
    /new\s+instructions:/i,
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(text)) return true;
  }

  // Excessive special characters suggesting exploit attempts
  // More than 50% special characters (excluding spaces and common punctuation)
  const specialChars = text.replace(/[\w\s.,!?'"()-]/g, "");
  if (specialChars.length > text.length * 0.5 && text.length > 10) {
    return true;
  }

  return false;
}
