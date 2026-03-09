// POST /api/agents — create a new agent.
// Auth required: agent creation is authenticated-only.
// Rate limit: 10/hr per user.

import { NextRequest } from "next/server";
import {
  errorResponse,
  parseValidBody,
  rateLimitResponse,
  API_ERRORS,
} from "@/lib/common/api-utils";
import { createRateLimiter } from "@/lib/common/rate-limit";
import { requireAuth, AuthenticationError } from "@/lib/auth/middleware";
import { userId } from "@/lib/common/types";
import { AgentCreateInputSchema } from "@/lib/agents/types";
import { createAgent } from "@/lib/agents/create";

// 10 requests per hour per user
const rateLimiter = createRateLimiter({ windowMs: 3600000, maxRequests: 10 });

export async function POST(req: NextRequest) {
  // 1. Require auth
  let authUserId: string;
  try {
    authUserId = await requireAuth();
  } catch (err) {
    if (err instanceof AuthenticationError) {
      return errorResponse(
        401,
        API_ERRORS.UNAUTHORIZED,
        "Sign in to create agents",
      );
    }
    throw err;
  }

  // 2. Rate limit check (per user)
  const limit = rateLimiter.check(authUserId);
  if (!limit.ok) {
    return rateLimitResponse(limit);
  }

  // 3. Parse and validate body
  const parsed = await parseValidBody(req, AgentCreateInputSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  // 4. Create agent
  try {
    const result = await createAgent(userId(authUserId), parsed.data);

    return Response.json(
      {
        agentId: result.agentId,
        promptHash: result.promptHash,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("Agent creation failed:", err);
    return errorResponse(500, API_ERRORS.INTERNAL, "Failed to create agent");
  }
}
