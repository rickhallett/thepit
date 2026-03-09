// POST /api/reactions — toggle heart/fire reaction on a bout turn.
// Auth optional: anonymous uses hashed-IP fingerprint (sha256, never raw IP).
// Rate limit: per fingerprint (userId for auth, hashed IP for anon).
//
// Trust boundary: On Vercel, x-forwarded-for is set by the edge network
// and cannot be spoofed by clients. For other deployments, configure
// TRUSTED_PROXY_HEADER env var to use a platform-specific header.

import { NextRequest } from "next/server";
import {
  errorResponse,
  parseValidBody,
  rateLimitResponse,
  API_ERRORS,
} from "@/lib/common/api-utils";
import { createRateLimiter } from "@/lib/common/rate-limit";
import { getAuthUserId } from "@/lib/auth/middleware";
import {
  ReactionRequestSchema,
  toggleReaction,
  computeFingerprint,
} from "@/lib/engagement/reactions";

// Rate limits: configurable via env, with safe defaults.
// Note: In-memory rate limiter is reset on cold start in serverless.
// This is acceptable for MVP — upgrade to Redis/Upstash if abuse detected.
const REACTION_RATE_WINDOW_MS = Number(process.env.REACTION_RATE_WINDOW_MS) || 60000;
const REACTION_RATE_MAX = Number(process.env.REACTION_RATE_MAX) || 30;
const rateLimiter = createRateLimiter({ windowMs: REACTION_RATE_WINDOW_MS, maxRequests: REACTION_RATE_MAX });

/**
 * Extract client IP from trusted proxy headers.
 *
 * On Vercel: x-forwarded-for is set by edge and is trustworthy.
 * The LAST IP in x-forwarded-for is the one added by the trusted proxy.
 * Falls back to x-real-ip, then returns null if no IP can be determined.
 */
function getClientIp(req: NextRequest): string | null {
  // Allow override for non-Vercel deployments
  const trustedHeader = process.env.TRUSTED_PROXY_HEADER;
  if (trustedHeader) {
    const value = req.headers.get(trustedHeader);
    if (value) return value.split(",").pop()?.trim() || null;
  }

  // Vercel: use x-forwarded-for, take the LAST IP (added by trusted proxy)
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((s) => s.trim()).filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) return last;
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;

  return null;
}

export async function POST(req: NextRequest) {
  // 1. Parse and validate body
  const parsed = await parseValidBody(req, ReactionRequestSchema);
  if (!parsed.success) {
    return parsed.response;
  }
  const { boutId, turnIndex, reactionType } = parsed.data;

  // 2. Get userId (optional)
  const userId = await getAuthUserId();

  // 3. Get IP and compute fingerprint.
  // If no IP and no userId, reject — cannot identify the client.
  const ip = getClientIp(req);
  if (!userId && !ip) {
    return errorResponse(400, "NO_CLIENT_IDENTITY", "Cannot determine client identity");
  }
  const clientFingerprint = computeFingerprint(userId, ip ?? "unknown");

  // 4. Rate limit by fingerprint (not raw IP) for consistency
  const limit = rateLimiter.check(clientFingerprint);
  if (!limit.ok) {
    return rateLimitResponse(limit);
  }

  // 5. Toggle reaction
  try {
    const result = await toggleReaction({
      boutId,
      turnIndex,
      reactionType,
      userId,
      clientFingerprint,
    });

    return Response.json({
      ok: true,
      action: result.action,
      counts: result.counts,
    });
  } catch (err) {
    console.error("Reaction toggle failed:", err);
    return errorResponse(500, API_ERRORS.INTERNAL, "Failed to toggle reaction");
  }
}
