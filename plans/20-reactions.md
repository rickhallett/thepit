# 20-reactions

## Context
depends_on: [05, 02]
produces: [lib/engagement/reactions.ts, app/api/reactions/route.ts, lib/engagement/reactions.test.ts, components/arena/message-card.tsx (modified)]
domain: lib/engagement/
gate: typecheck + lint + test:unit

## References
Read these files before implementing:
- SPEC.md (API Contracts — POST /api/reactions, Social Flow)
- lib/engagement/DOMAIN.md
- db/schema.ts (reactions table — unique constraint)
- db/index.ts (db instance)
- lib/common/api-utils.ts (errorResponse, parseValidBody)
- lib/common/rate-limit.ts (createRateLimiter)
- lib/auth/middleware.ts (getAuthUserId)
- components/arena/message-card.tsx (add reaction buttons)

## Task

### 1. Reactions library

Create `lib/engagement/reactions.ts`:

```typescript
import { z } from "zod";

export const ReactionRequestSchema = z.object({
  boutId: z.string(),
  turnIndex: z.number().int().min(0),
  reactionType: z.enum(["heart", "fire"]),
});

export async function toggleReaction(params: {
  boutId: string;
  turnIndex: number;
  reactionType: "heart" | "fire";
  userId: string | null;
  clientFingerprint: string;
}): Promise<{ action: "added" | "removed"; counts: { heart: number; fire: number } }>
```

Implementation:
- Query for existing reaction matching (boutId, turnIndex, reactionType, clientFingerprint)
- If exists: DELETE it → action = "removed"
- If not: INSERT → action = "added"
- After toggle: query aggregate counts for this (boutId, turnIndex) grouped by reaction_type
- Return action and counts

```typescript
export async function getReactionCounts(boutId: string): Promise<Map<number, { heart: number; fire: number }>>
// SELECT turn_index, reaction_type, COUNT(*) FROM reactions WHERE bout_id = boutId GROUP BY turn_index, reaction_type
// Return a Map keyed by turnIndex

export async function getUserReactions(boutId: string, clientFingerprint: string): Promise<Set<string>>
// SELECT turn_index, reaction_type FROM reactions WHERE bout_id = boutId AND client_fingerprint = fingerprint
// Return a Set of `${turnIndex}:${reactionType}` strings for efficient lookup
```

### 2. Client fingerprint

For anonymous users, compute fingerprint as `anon:${sha256(ip)}`:
```typescript
import { createHash } from "crypto";

export function computeFingerprint(userId: string | null, ip: string): string {
  if (userId) return userId;
  return `anon:${createHash("sha256").update(ip).digest("hex").slice(0, 16)}`;
}
```

### 3. API route

Create `app/api/reactions/route.ts`:

```typescript
export async function POST(req: NextRequest) {
  // 1. Parse and validate body with ReactionRequestSchema
  // 2. Get userId (optional — auth not required)
  // 3. Get IP from request headers (x-forwarded-for or x-real-ip)
  // 4. Compute fingerprint
  // 5. Rate limit check: 30/min per IP
  // 6. Call toggleReaction
  // 7. Return { ok: true, action, counts }
}
```

Rate limit: create a rate limiter with `{ windowMs: 60000, maxRequests: 30 }` at module scope.

### 4. Update message card

Modify `components/arena/message-card.tsx` to add reaction buttons:

Add props:
```typescript
interface MessageCardProps {
  // ... existing props ...
  reactionCounts?: { heart: number; fire: number };
  userReactions?: Set<string>; // "turnIndex:type"
  onReact?: (turnIndex: number, type: "heart" | "fire") => void;
}
```

- Show heart and fire buttons below message content
- Display counts next to each button
- Highlight button if user has reacted (check userReactions set)
- On click: call onReact (optimistic update in parent component)
- Use `data-testid="reaction-heart"` and `data-testid="reaction-fire"` for testing

### 5. Unit tests

Create `lib/engagement/reactions.test.ts`:

Mock `db` for all tests.

Tests:
- Test toggleReaction add: no existing reaction → INSERT → action='added'
- Test toggleReaction remove: existing reaction → DELETE → action='removed'
- Test counts are returned correctly after toggle
- Test getReactionCounts returns Map with correct structure
- Test getUserReactions returns Set of "turnIndex:type" strings
- Test computeFingerprint: authenticated user → returns userId
- Test computeFingerprint: anonymous → returns "anon:{hash}"

### Do NOT
- Add WebSocket support — reactions use REST API with optimistic UI
- Build a real-time reaction feed
- Store raw IP addresses — only hashed fingerprints
- Implement reaction animations — plain count display is sufficient

## Verification
After implementing, verify:
- `pnpm run typecheck` exits 0
- `pnpm run lint` exits 0
- `pnpm run test:unit` exits 0 — reactions tests pass
- `app/api/reactions/route.ts` exports POST handler
- Toggle logic: same request twice = add then remove
- Anonymous fingerprint uses SHA-256 of IP, not raw IP
- Rate limit is 30/min per IP
- Reaction buttons appear on message cards with data-testid attributes
