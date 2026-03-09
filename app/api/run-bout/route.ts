// POST /api/run-bout — SSE streaming bout execution.
// Validates request, resolves model, streams turn loop as SSE events.
// Does NOT handle credits or persistence — wired in task 13.

import { NextRequest } from "next/server";
import { anthropic } from "@ai-sdk/anthropic";
import { validateBoutRequest } from "@/lib/bouts/validation";
import { createBoutSSEStream } from "@/lib/bouts/streaming";

export async function POST(req: NextRequest): Promise<Response> {
  // 1. Validate request (schema, preset, content safety, idempotency)
  const validation = await validateBoutRequest(req);
  if (!validation.valid) {
    return validation.response;
  }

  const { data, preset } = validation;

  // 2. Resolve model — default to preset's model, map to actual Anthropic model ID.
  // model field is validated as enum by BoutCreateRequestSchema, so only valid values arrive here.
  const modelId = data.model || preset.defaultModel;
  // Map internal model aliases to current Anthropic API IDs.
  // Updated 2026-03-09: claude-3-5-* series deprecated; current gen is 4.x.
  // See: https://docs.anthropic.com/en/docs/about-claude/models
  const MODEL_MAP: Record<string, string> = {
    "claude-haiku": "claude-haiku-4-5",
    "claude-sonnet": "claude-sonnet-4-6",
  };
  const anthropicModelId = MODEL_MAP[modelId];
  if (!anthropicModelId) {
    return new Response(
      JSON.stringify({ code: "INVALID_MODEL", message: `Unknown model: ${modelId}` }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }
  const model = anthropic(anthropicModelId);

  // 3. Create SSE stream from turn loop
  const stream = createBoutSSEStream({
    preset,
    topic: data.topic || preset.description,
    model,
  });

  // 4. Return SSE response with appropriate headers
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
