# 14-use-bout-hook

## Context
depends_on: [13]
produces: [lib/bouts/use-bout.ts, lib/bouts/use-bout.test.ts]
domain: lib/bouts/
gate: typecheck + lint + test:unit

## References
Read these files before implementing:
- SPEC.md (UI Pages — /bout/[id], Bout Flow)
- lib/bouts/DOMAIN.md
- lib/bouts/types.ts (TranscriptEntry, SSEEventType)
- app/api/run-bout/route.ts (SSE event shapes)
- lib/bouts/streaming.ts (event format reference)

## Task

### 1. React hook

Create `lib/bouts/use-bout.ts`:

```typescript
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { TranscriptEntry } from "./types";

export type BoutStatus = "idle" | "streaming" | "done" | "error";

export interface BoutMessage {
  turnIndex: number;
  agentId: string;
  agentName: string;
  agentColor: string;
  content: string;
  isStreaming: boolean;
}

export interface UseBoutReturn {
  messages: BoutMessage[];
  status: BoutStatus;
  shareLine: string | null;
  error: string | null;
  startBout: (params: {
    boutId: string;
    presetId: string;
    topic?: string;
    model?: string;
  }) => void;
}

export function useBout(): UseBoutReturn
```

Implementation:
- `startBout` initiates a `fetch` POST to `/api/run-bout` with the params as JSON body
- Read the response as a stream using `response.body.getReader()`
- Parse SSE events from the stream (split on `\n\n`, parse `event:` and `data:` lines)
- Handle each event type:
  - `data-turn`: add new BoutMessage to messages array with `isStreaming: true`
  - `text-start`: no-op (turn already added on data-turn)
  - `text-delta`: append `delta` to the current message's content
  - `text-end`: mark current message as `isStreaming: false`
  - `data-share-line`: set shareLine state
  - `error`: set error state, set status to "error"
  - `done`: set status to "done"
- Set status to "streaming" when fetch starts
- Handle fetch errors (network, non-200 status codes)
- Clean up on unmount using `useRef` for abort controller

SSE parsing helper (inline in the hook file):
```typescript
function parseSSEChunk(chunk: string): Array<{ event: string; data: string }> {
  // Split by \n\n, for each block parse event: and data: lines
  // Return array of parsed events
}
```

### 2. Unit tests

Create `lib/bouts/use-bout.test.ts`:

Use `@testing-library/react` and `renderHook` for testing.

Mock `global.fetch` to return a ReadableStream that emits SSE events.

Helper to create a mock SSE stream:
```typescript
function createMockSSEResponse(events: Array<{ event: string; data: object }>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const e of events) {
        controller.enqueue(encoder.encode(`event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`));
      }
      controller.close();
    },
  });
  return new Response(stream);
}
```

Tests:
- Test initial state: status='idle', messages=[], shareLine=null
- Test startBout sets status to 'streaming'
- Test data-turn event adds a message
- Test text-delta events append to current message content
- Test text-end marks message as not streaming
- Test data-share-line sets shareLine
- Test done event sets status to 'done'
- Test error event sets status to 'error' and error message
- Test full sequence: 2 turns with deltas → done → correct final state
- Test fetch failure (network error) sets error state

### Do NOT
- Use EventSource — it doesn't support POST requests. Use fetch + ReadableStream reader
- Add persistence or caching logic in the hook — it's purely a consumer of SSE events
- Handle reconnection — if the stream drops, set error state and let the user retry
- Import server-side modules — this is a client-side "use client" hook

## Verification
After implementing, verify:
- `pnpm run typecheck` exits 0
- `pnpm run lint` exits 0
- `pnpm run test:unit` exits 0 — hook tests pass
- `lib/bouts/use-bout.ts` has `"use client"` directive at top
- The hook uses `fetch` (not EventSource) for POST requests
- All SSE event types from SPEC.md are handled
- AbortController cleanup is present for unmount safety
