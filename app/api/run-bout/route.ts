// POST /api/run-bout — SSE streaming bout execution with persistence and credits.
// Validates request, resolves model, inserts bout row, preauths credits, streams turn loop.

import { NextRequest } from "next/server";
import { anthropic } from "@ai-sdk/anthropic";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bouts } from "@/db/schema";
import { validateBoutRequest } from "@/lib/bouts/validation";
import { createBoutSSEStreamWithPersistence } from "@/lib/bouts/streaming";
import { errorResponse } from "@/lib/common/api-utils";
import { getEnv } from "@/lib/common/env";
import { getAuthUserId } from "@/lib/auth/middleware";
import { estimateBoutCostMicro, type ModelId } from "@/lib/credits/catalog";
import { preauthorizeCredits } from "@/lib/credits/preauth";

export async function POST(req: NextRequest): Promise<Response> {
  // 1. Validate request (schema, preset, content safety, idempotency)
  const validation = await validateBoutRequest(req);
  if (!validation.valid) {
    return validation.response;
  }

  const { data, preset } = validation;
  const env = getEnv();

  // 2. Resolve model — default to preset's model, map to actual Anthropic model ID.
  // Model field is validated as enum by BoutCreateRequestSchema, so only valid values arrive here.
  const modelId = (data.model || preset.defaultModel) as ModelId;
  const MODEL_MAP: Record<string, string> = {
    "claude-haiku": "claude-haiku-4-5",
    "claude-sonnet": "claude-sonnet-4-6",
  };
  const anthropicModelId = MODEL_MAP[modelId];
  if (!anthropicModelId) {
    return errorResponse(400, "INVALID_MODEL", `Unknown model: ${modelId}`);
  }
  const model = anthropic(anthropicModelId);

  // 3. Get optional user ID (auth is not required)
  const userId = await getAuthUserId();

  // 4. INSERT bout row with status='running'
  await db.insert(bouts).values({
    id: data.boutId,
    ownerId: userId,
    presetId: data.presetId,
    topic: data.topic || preset.description,
    agentLineup: preset.agents,
    status: "running",
    model: modelId,
    responseLength: data.length || null,
    responseFormat: data.format || null,
  });

  // 5. Preauthorize credits if user is authenticated and credits are enabled
  let estimatedCostMicro = 0;
  if (userId && env.CREDITS_ENABLED) {
    estimatedCostMicro = estimateBoutCostMicro({
      maxTurns: preset.maxTurns,
      model: modelId,
    });

    const preauthResult = await preauthorizeCredits(
      userId,
      estimatedCostMicro,
      data.boutId,
    );

    if (!preauthResult.success) {
      // Mark bout as error — best-effort, DB failure must not mask the 402
      try {
        await db
          .update(bouts)
          .set({ status: "error" })
          .where(eq(bouts.id, data.boutId));
      } catch (dbErr) {
        console.error(
          `[run-bout] Failed to mark bout ${data.boutId} as error:`,
          dbErr,
        );
      }

      return errorResponse(402, "INSUFFICIENT_CREDITS", "Not enough credits");
    }
  }

  // 6. Create SSE stream with persistence callbacks
  // Share line generation always uses Haiku (fast, cheap summarization)
  const shareLineModel = anthropic("claude-haiku-4-5");

  const stream = createBoutSSEStreamWithPersistence({
    turnLoopConfig: {
      preset,
      topic: data.topic || preset.description,
      model,
    },
    boutId: data.boutId,
    userId,
    estimatedCostMicro,
    shareLineModel,
    modelId,
  });

  // 7. Return SSE response with appropriate headers
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
