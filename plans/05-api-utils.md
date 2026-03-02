# 05-api-utils

## Context
depends_on: [03]
produces: [lib/common/api-utils.ts, lib/common/rate-limit.ts, lib/common/types.ts, lib/common/api-utils.test.ts, lib/common/rate-limit.test.ts]
domain: lib/common/
gate: typecheck + lint + test:unit

## References
Read these files before implementing:
- SPEC.md (API Contracts section — error codes, rate limits)
- lib/common/DOMAIN.md
- lib/common/env.ts (verify it exists from task 01)

## Task

### 1. Branded nominal types

Create `lib/common/types.ts`:

```typescript
declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { [__brand]: B };

export type BoutId = Brand<string, "BoutId">;
export type AgentId = Brand<string, "AgentId">;
export type UserId = Brand<string, "UserId">;
export type MicroCredits = Brand<number, "MicroCredits">;
```

Export helper functions:
```typescript
export function boutId(id: string): BoutId { return id as BoutId; }
export function agentId(id: string): AgentId { return id as AgentId; }
export function userId(id: string): UserId { return id as UserId; }
export function microCredits(n: number): MicroCredits { return n as MicroCredits; }
```

### 2. API utilities

Create `lib/common/api-utils.ts`:

```typescript
import { z } from "zod";
import { NextRequest } from "next/server";

export function errorResponse(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status });
}

export async function parseValidBody<T extends z.ZodType>(
  req: NextRequest,
  schema: T
): Promise<{ success: true; data: z.infer<T> } | { success: false; response: Response }> {
  // Try to parse JSON body
  // If JSON parse fails, return 400 with code "INVALID_JSON"
  // If Zod validation fails, return 400 with code "VALIDATION_ERROR" and Zod error details
  // If success, return parsed data
}

export function rateLimitResponse(info: { remaining: number; resetAt: Date }): Response {
  return errorResponse(429, "RATE_LIMITED", "Too many requests");
  // Set Retry-After header based on resetAt
}
```

### 3. Rate limiter

Create `lib/common/rate-limit.ts`:

```typescript
export interface RateLimitConfig {
  windowMs: number;    // e.g., 3600000 for 1 hour
  maxRequests: number; // e.g., 5
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: Date;
}

export function createRateLimiter(config: RateLimitConfig) {
  // Return an object with:
  //   check(key: string): RateLimitResult
  //   reset(key: string): void
}
```

Implementation: in-memory Map of `key → timestamp[]`. Sliding window — on `check`, filter out timestamps older than `windowMs`, count remaining, push new timestamp if under limit.

Include cleanup: periodically (or on check) remove keys with all-expired timestamps to prevent memory leaks.

### 4. Unit tests

Create `lib/common/api-utils.test.ts`:
- Test errorResponse returns correct status and JSON shape
- Test parseValidBody with valid input → returns data
- Test parseValidBody with invalid JSON → returns 400
- Test parseValidBody with Zod validation failure → returns 400 with details

Create `lib/common/rate-limit.test.ts`:
- Test basic allow/deny at limit boundary
- Test sliding window: requests expire after windowMs (use vi.useFakeTimers)
- Test different keys are independent
- Test remaining count is accurate

### 5. Verify env.ts

Confirm `lib/common/env.ts` exists from task 01 and is importable. If it's missing or broken, fix it. Do not rewrite it from scratch — just ensure it exports a usable env validation function.

### Do NOT
- Use Redis or any external store for rate limiting — in-memory only
- Add IP extraction logic — that's the caller's responsibility
- Create any API routes — this is library code only
- Add rate limit tiers — tier-aware rate limiting comes in task 17

## Verification
After implementing, verify:
- `pnpm run typecheck` exits 0
- `pnpm run lint` exits 0
- `pnpm run test:unit` exits 0 — all api-utils and rate-limit tests pass
- `lib/common/types.ts` exports BoutId, AgentId, UserId, MicroCredits
- `lib/common/env.ts` exists and exports env validation
- Rate limit tests use fake timers to verify sliding window behavior
