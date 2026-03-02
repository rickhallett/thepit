# 07-bout-validation

## Context
depends_on: [06]
produces: [lib/bouts/types.ts, lib/bouts/validation.ts, lib/bouts/validation.test.ts]
domain: lib/bouts/
gate: typecheck + lint + test:unit

## References
Read these files before implementing:
- SPEC.md (API Contracts — POST /api/run-bout, Bout Flow, Data Model — bouts table)
- lib/bouts/DOMAIN.md
- lib/bouts/presets.ts (getPresetById)
- db/schema.ts (bouts table)
- lib/common/types.ts (BoutId)

## Task

### 1. Bout types

Create `lib/bouts/types.ts`:

```typescript
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
  | "data-turn"      // { turnIndex, agentId, agentName, agentColor }
  | "text-start"     // { turnIndex }
  | "text-delta"     // { turnIndex, delta: string }
  | "text-end"       // { turnIndex, tokenCount }
  | "data-share-line" // { shareLine: string }
  | "error"          // { code, message }
  | "done";          // {}
```

Create the Zod request schema:
```typescript
import { z } from "zod";

export const BoutCreateRequestSchema = z.object({
  boutId: z.string().min(10).max(30),
  presetId: z.string(),
  topic: z.string().max(500).optional(),
  model: z.string().optional(),
  length: z.enum(["short", "medium", "long"]).optional(),
  format: z.enum(["debate", "roundtable"]).optional(),
});
export type BoutCreateRequest = z.infer<typeof BoutCreateRequestSchema>;
```

### 2. Validation logic

Create `lib/bouts/validation.ts`:

```typescript
export interface ValidationResult {
  valid: true;
  data: BoutCreateRequest;
  preset: Preset;
} | {
  valid: false;
  response: Response;
}

export async function validateBoutRequest(req: NextRequest): Promise<ValidationResult>
```

The function should:
1. Parse body with `parseValidBody(req, BoutCreateRequestSchema)` — return 400 on failure
2. Resolve preset via `getPresetById(data.presetId)` — return 400 if not found with code `PRESET_NOT_FOUND`
3. Check topic for unsafe content via `containsUnsafeContent(topic)` — return 400 with code `UNSAFE_CONTENT`
4. Check idempotency: query DB for existing bout with same boutId
   - If found with status `running` or `completed`, return 409 with code `BOUT_EXISTS`
   - If found with status `error`, allow retry (proceed as valid)

```typescript
export function containsUnsafeContent(text: string | undefined): boolean
```

Check for patterns:
- Explicit hate speech keywords (small curated list)
- Prompt injection attempts (e.g., "ignore previous instructions", "system prompt")
- Excessive special characters suggesting exploit attempts

This is a basic regex filter, NOT a comprehensive content moderation system.

### 3. Unit tests

Create `lib/bouts/validation.test.ts`:
- Test valid request with known preset ID passes validation
- Test missing boutId returns 400
- Test unknown presetId returns 400 with PRESET_NOT_FOUND
- Test topic exceeding 500 chars returns 400
- Test unsafe content detection: "ignore previous instructions" → true
- Test safe content passes: "Should we colonize Mars?" → false
- Test idempotency: mock DB returning existing running bout → returns 409

Mock `db` and `getPresetById` as needed. Do NOT require a live database.

### Do NOT
- Implement the actual bout execution — that's task 08
- Add rate limiting to validation — the route handler does that
- Build a comprehensive content moderation system — basic regex is sufficient
- Check credits or auth in validation — those are separate concerns handled by the route

## Verification
After implementing, verify:
- `pnpm run typecheck` exits 0
- `pnpm run lint` exits 0
- `pnpm run test:unit` exits 0 — validation tests pass
- `lib/bouts/types.ts` exports BoutStatus, TranscriptEntry, SSEEventType, BoutCreateRequestSchema
- `lib/bouts/validation.ts` exports validateBoutRequest and containsUnsafeContent
- Unsafe content patterns are tested with at least 3 positive and 3 negative cases
