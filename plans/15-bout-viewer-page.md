# 15-bout-viewer-page

## Context
depends_on: [14]
produces: [app/bout/[id]/page.tsx, components/arena/arena.tsx, components/arena/message-card.tsx]
domain: components/arena/
gate: typecheck + lint + test:unit

## References
Read these files before implementing:
- SPEC.md (UI Pages — /bout/[id])
- components/DOMAIN.md
- lib/bouts/use-bout.ts (useBout hook, BoutMessage, UseBoutReturn)
- lib/bouts/types.ts (TranscriptEntry)
- db/schema.ts (bouts table)
- db/index.ts (db instance)

## Task

### 1. Server component — bout page

Create `app/bout/[id]/page.tsx`:

```typescript
import { db } from "@/db";
import { bouts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Arena } from "@/components/arena/arena";

export default async function BoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // Look up bout in DB
  const bout = await db.query.bouts.findFirst({
    where: eq(bouts.id, id),
  });

  // If bout exists and is completed, render static transcript
  // If bout doesn't exist, this is a new bout — render Arena in streaming mode
  // (The boutId is passed from the arena page via URL params)
  
  return <Arena boutId={id} initialBout={bout || null} />;
}
```

### 2. Arena client component

Create `components/arena/arena.tsx`:

```typescript
"use client";

import { useBout, type BoutMessage } from "@/lib/bouts/use-bout";
import { MessageCard } from "./message-card";
import { useEffect, useRef } from "react";

interface ArenaProps {
  boutId: string;
  initialBout: {
    transcript: any[] | null;
    status: string;
    shareLine: string | null;
    presetId: string;
    topic: string;
  } | null;
  autoStart?: {
    presetId: string;
    topic?: string;
    model?: string;
  };
}

export function Arena({ boutId, initialBout, autoStart }: ArenaProps)
```

Implementation:
- If `initialBout` has a completed transcript, render it as static messages (no streaming)
- If `autoStart` is provided, call `startBout` from useBout on mount
- During streaming: render messages from useBout, auto-scroll to bottom
- After completion: show share line if available
- Show status indicators: "Streaming..." spinner during streaming, "Debate complete" on done, error message on error

Auto-scroll: use a ref on the messages container, scroll to bottom on new messages using `useEffect` watching `messages.length`.

### 3. Message card component

Create `components/arena/message-card.tsx`:

```typescript
"use client";

interface MessageCardProps {
  agentName: string;
  agentColor: string;
  content: string;
  turnIndex: number;
  isStreaming?: boolean;
}

export function MessageCard({ agentName, agentColor, content, turnIndex, isStreaming }: MessageCardProps)
```

Implementation:
- Display agent name with a colored left border (using agentColor as inline style)
- Show turn number (1-indexed for display)
- Render content as text (no markdown rendering needed yet)
- If isStreaming, show a blinking cursor indicator after the content
- Use `data-testid="message-card"` for testing

Styling: brutalist aesthetic per SPEC.md — bold borders, monospace where appropriate, high contrast. Use Tailwind utilities. No external UI library.

### 4. E2e test stub

Create `tests/e2e/bout-flow.spec.ts` as a placeholder:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Bout viewer", () => {
  test.skip("navigate to /bout/{id} → see streaming messages → see completion", async ({ page }) => {
    // TODO: requires running dev server with test database
    // Will be filled in during integration testing
  });
});
```

This is a stub — full e2e testing requires the complete stack. Mark tests as `test.skip` so they don't break the gate.

### Do NOT
- Add reaction buttons — that's task 20
- Add voting UI — that's task 21
- Add share panel — that's task 22
- Install a markdown renderer — plain text is fine
- Create a loading skeleton — simple loading text is sufficient
- Add authentication checks — the page is public

## Verification
After implementing, verify:
- `pnpm run typecheck` exits 0
- `pnpm run lint` exits 0
- `pnpm run test:unit` exits 0
- `app/bout/[id]/page.tsx` is a server component (no "use client")
- `components/arena/arena.tsx` is a client component (has "use client")
- `components/arena/message-card.tsx` renders agent name and colored border
- Auto-scroll ref is present in arena component
- E2e test file exists (even if skipped)
