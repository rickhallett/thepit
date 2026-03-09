// POST /api/winner-vote — cast winner vote for a bout.
// Auth required: voting is authenticated-only.
// Rate limit: 60/hr per user.

import { NextRequest } from "next/server";
import {
  errorResponse,
  parseValidBody,
  rateLimitResponse,
  API_ERRORS,
} from "@/lib/common/api-utils";
import { createRateLimiter } from "@/lib/common/rate-limit";
import { requireAuth, AuthenticationError } from "@/lib/auth/middleware";
import { WinnerVoteRequestSchema, castWinnerVote, VoteValidationError } from "@/lib/engagement/votes";

// Rate limits: configurable via env, with safe defaults
const VOTE_RATE_WINDOW_MS = Number(process.env.VOTE_RATE_WINDOW_MS) || 3600000; // 1 hour
const VOTE_RATE_MAX = Number(process.env.VOTE_RATE_MAX) || 60;
const rateLimiter = createRateLimiter({ windowMs: VOTE_RATE_WINDOW_MS, maxRequests: VOTE_RATE_MAX });

export async function POST(req: NextRequest) {
  // 1. Require auth
  let userId: string;
  try {
    userId = await requireAuth();
  } catch (err) {
    if (err instanceof AuthenticationError) {
      return errorResponse(401, API_ERRORS.UNAUTHORIZED, "Sign in to vote");
    }
    throw err;
  }

  // 2. Parse and validate body
  const parsed = await parseValidBody(req, WinnerVoteRequestSchema);
  if (!parsed.success) {
    return parsed.response;
  }
  const { boutId, agentId } = parsed.data;

  // 3. Rate limit check (per user)
  const limit = rateLimiter.check(userId);
  if (!limit.ok) {
    return rateLimitResponse(limit);
  }

  // 4. Cast vote
  try {
    const result = await castWinnerVote({ boutId, userId, agentId });

    // 5. If already voted, return 409
    if (result.alreadyVoted) {
      return errorResponse(
        409,
        "ALREADY_VOTED",
        "You have already voted on this bout",
      );
    }

    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof VoteValidationError) {
      const statusMap = {
        BOUT_NOT_FOUND: 404,
        BOUT_NOT_COMPLETED: 400,
        AGENT_NOT_IN_BOUT: 400,
      } as const;
      return errorResponse(
        statusMap[err.code],
        err.code,
        err.message,
      );
    }
    console.error("Winner vote failed:", err);
    return errorResponse(500, API_ERRORS.INTERNAL, "Failed to cast vote");
  }
}
