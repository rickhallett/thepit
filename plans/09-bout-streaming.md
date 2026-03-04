# 09-bout-streaming

## Context
depends_on: [08]
produces: [lib/bouts/streaming.ts, app/api/run-bout/route.ts, lib/bouts/streaming.test.ts]
domain: lib/bouts/
gate: typecheck + lint + test:unit

## References
Read these files before implementing:
- SPEC.md (API Contracts — POST /api/run-bout, SSE event types)
- lib/bouts/DOMAIN.md
- lib/bouts/engine.ts (executeTurnLoop, TurnCallback)
- lib/bouts/validation.ts (validateBoutRequest)
- lib/bouts/types.ts (SSEEventType)
- lib/common/api-utils.ts (errorResponse)

## Task

### 1. SSE streaming wrapper

Create `lib/bouts/streaming.ts`:

```typescript
export function createBoutSSEStream(
  config: TurnLoopConfig,
): ReadableStream<Uint8Array>
```

Implementation:
- Create a `ReadableStream` using the constructor with a `start(controller)` function
- Inside start, create a `TextEncoder`
- Define a helper `sendEvent(event: string, data: object)` that encodes `event: ${event}\ndata: ${JSON.stringify(data)}\n\n` and enqueues it
- Create `TurnCallback` handlers that call sendEvent:
  - `onTurnStart` → send `data-turn` event with `{ turnIndex, agentId, agentName, agentColor }`
  - `onTextDelta` → send `text-delta` event with `{ turnIndex, delta }`
  - After each `onTurnStart`, also send `text-start` with `{ turnIndex }`
  - `onTurnEnd` → send `text-end` with `{ turnIndex, tokenCount }`
- Call `executeTurnLoop(config, callbacks)` inside an async wrapper
- After the loop completes, send `done` event with `{}`
- On error, send `error` event with `{ code: "TURN_LOOP_ERROR", message: error.message }`, then close
- Always call `controller.close()` when done

### 2. API route handler

Create `app/api/run-bout/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { anthropic } from "@ai-sdk/anthropic";
import { validateBoutRequest } from "@/lib/bouts/validation";
import { createBoutSSEStream } from "@/lib/bouts/streaming";

export async function POST(req: NextRequest) {
  // 1. Validate request
  const validation = await validateBoutRequest(req);
  if (!validation.valid) return validation.response;

  const { data, preset } = validation;

  // 2. Resolve model
  const modelId = data.model || preset.defaultModel;
  const model = anthropic(modelId === "claude-haiku"
    ? "claude-3-5-haiku-latest"
    : "claude-3-5-sonnet-latest");

  // 3. Create SSE stream
  const stream = createBoutSSEStream({
    preset,
    topic: data.topic || preset.description,
    model,
  });

  // 4. Return SSE response
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
```

Note: This version does NOT handle credits or persistence — those are wired in task 13. This is the minimal streaming pipeline: validate → resolve → stream.

### 3. SSE error handling and client disconnect

The SSE stream must handle failure modes, not just the happy path:

**Client disconnect:** Use the `cancel()` callback on the `ReadableStream` constructor. When the client disconnects mid-stream:
- Stop calling the LLM (abort any in-flight request if possible)
- Clean up resources (no dangling promises)
- Do NOT throw — the stream is already closed from the client's perspective

**Partial stream / server error:** If the turn loop throws mid-execution:
- Send an `error` event with `{ code, message }` before closing (if the stream is still writable)
- The partial transcript up to the error point must be preserved in the callback state (task 13 will persist it)
- Always call `controller.close()` in a finally block

**Duplicate protection:** Include `turnIndex` in every event. The client uses `turnIndex` to deduplicate if it reconnects and replays. This task does not implement reconnection — it ensures the event format supports it.

**Test coverage for error paths:**
- Client disconnect mid-stream: verify the stream stops producing events and cleans up
- LLM error on turn 2 of 4: verify error event is emitted after successful turns 1
- Controller close is always called (no hanging streams)

### 4. Unit tests

Create `lib/bouts/streaming.test.ts`:

Mock `executeTurnLoop` to produce predictable transcript entries with controlled callbacks.

Tests:
- Test SSE stream produces events in correct order: data-turn → text-start → text-delta(s) → text-end for each turn, then done
- Test SSE format: each event has `event:` and `data:` lines separated by `\n\n`
- Test error handling: if turn loop throws mid-bout, stream emits error event after successful turns, then closes
- Test done event is always the last event on success
- Test client disconnect: cancel the reader mid-stream, verify cleanup runs without throwing
- Test controller.close() is always called (no hanging streams) — use a spy on the controller

To test the stream, read from the `ReadableStream` and parse the SSE events:
```typescript
async function readSSEStream(stream: ReadableStream<Uint8Array>): Promise<Array<{ event: string; data: any }>> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const events: Array<{ event: string; data: any }> = [];
  // ... read chunks, parse SSE format, collect events
}
```

### Do NOT
- Add rate limiting to the route — that comes later
- Add credit preauthorization — task 13
- Persist the bout to DB — task 13
- Generate the share line — task 13
- Add authentication checks — the route is public per SPEC.md
- Use EventSource on the server — this is a server-to-client SSE stream using ReadableStream

## Verification
After implementing, verify:
- `pnpm run typecheck` exits 0
- `pnpm run lint` exits 0
- `pnpm run test:unit` exits 0 — streaming tests pass
- `app/api/run-bout/route.ts` exports a POST handler
- SSE events follow the format: `event: {type}\ndata: {json}\n\n`
- The event sequence is: data-turn, text-start, text-delta(s), text-end (per turn), then done
