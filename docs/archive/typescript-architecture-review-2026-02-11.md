# TypeScript & Architecture Review — The Pit

**Date:** 2026-02-11
**Scope:** All production source code (`app/`, `lib/`, `components/`, `db/`, `middleware.ts`) — 88 files, ~5,500 lines of application logic. Test architecture (`tests/`) evaluated separately.
**Methodology:** Static analysis of every source file against TypeScript strict-mode standards, SOLID principles, extensibility patterns, and industry best practices. Findings ranked by estimated impact of the recommended change.

---

## Executive Summary

The Pit is a well-structured rapid-implementation codebase. It has **zero `any` types**, **zero `@ts-ignore` directives**, and strict mode enabled — a strong TypeScript foundation. The `lib/` directory is exemplary: 31 focused modules averaging ~100 lines each, with a clean dependency tree and no circular imports.

The primary architectural debt concentrates in three areas:

1. **`app/api/run-bout/route.ts`** — a 527-line monolith handling 15+ responsibilities in a single function
2. **No dependency inversion** — database, AI provider, and payment services are direct imports with no interfaces, making them unmockable without `vi.mock()` and unswappable without code changes
3. **Significant code duplication** — BYOK stash flow, response selectors, JSON parsing boilerplate, snapshot mapping, and upsert race handling are each duplicated 2–8 times

The codebase was built for speed-to-market with selective extensibility (credit economy is highly configurable; provider choices are not). This is an appropriate tradeoff for the product's maturity — but the findings below map the path from "shipped fast" to "scales safely."

This expanded revision cross-references findings from the release readiness review (`docs/release-review-2026-02-11.md`), the adversarial code review (`docs/code-review-2026-02-10.md`), and self-identified trade-offs documented in the sub-root READMEs (`tests/`, `lib/`, `components/`, `db/`, `app/`, `app/api/`, `pitctl/`).

**Finding totals:** 3 critical, 12 high, 27 medium, 14 low — plus 6 documented strengths.

---

## Master Impact Ranking

| Rank | ID | Category | Finding | Severity |
|------|----|----------|---------|----------|
| 1 | SRP-1 | SOLID | `run-bout/route.ts` is a 527-line monolith with ~15 responsibilities | Critical |
| 2 | DIP-1 | SOLID | No dependency inversion for DB, AI, or Stripe — direct imports everywhere | Critical |
| 3 | EXT-1 | Extensibility | AI provider hardcoded to Anthropic — no provider interface | Critical |
| 4 | DUP-1 | Duplication | BYOK stash flow duplicated identically in 2 components | High |
| 5 | DUP-2 | Duplication | Response length/format selectors duplicated across 3 components | High |
| 6 | DUP-3 | Duplication | JSON parsing + validation boilerplate repeated in 8 API routes | High |
| 7 | ISP-1 | SOLID | `AgentSnapshot` is a ~30-field fat type consumed by modules needing <10 fields | High |
| 8 | TST-1 | Testing | Tests mock Drizzle query builder chains — refactoring queries breaks all tests | High |
| 9 | DUP-4 | Duplication | Agent snapshot row-to-object mapping duplicated in 2 modules | High |
| 10 | DUP-5 | Duplication | Upsert race-condition pattern duplicated in 3 lib modules | High |
| 11 | ERR-1 | Best Practices | No shared error response format — ad-hoc `new Response(msg, {status})` per route | High |
| 12 | TS-1 | TypeScript | `TranscriptEntry` type defined identically in `db/schema.ts` and `lib/use-bout.ts` | Medium |
| 13 | TS-2 | TypeScript | `ResponseFormatId` / `ResponseLengthId` / `AgentTier` duplicated across modules | Medium |
| 14 | TS-3 | TypeScript | 5 `!` non-null assertions in `app/actions.ts:111-115` | Medium |
| 15 | TS-4 | TypeScript | 6 `as Error` casts in catch blocks without type guards | Medium |
| 16 | TS-5 | TypeScript | `{} as LeaderboardData` empty-object assertion | Medium |
| 17 | TS-6 | TypeScript | Stripe webhook uses 6 inline `as { ... }` casts | Medium |
| 18 | TS-7 | TypeScript | Component types redeclare `AgentSnapshot` fields instead of using `Pick`/`Omit` | Medium |
| 19 | OC-1 | SOLID | `run-bout` pre-flight interleaves `if/else` for subscriptions vs legacy | Medium |
| 20 | OC-2 | SOLID | Preset list statically imported — adding a preset requires editing `presets.ts` | Medium |
| 21 | SRP-2 | SOLID | `lib/credits.ts` at 336 lines has 5-6 sub-responsibilities | Medium |
| 22 | SRP-3 | SOLID | `lib/leaderboard.ts` at 324 lines with complex multi-table aggregation | Medium |
| 23 | EXT-2 | Extensibility | `ask-the-pit` creates its own Anthropic instance instead of using `getModel()` | Medium |
| 24 | EXT-3 | Extensibility | `ask-the-pit-config.ts` hardcodes model ID instead of using `FREE_MODEL_ID` | Medium |
| 25 | BP-1 | Best Practices | `Arena` component is 500 lines with inline business logic | Medium |
| 26 | BP-2 | Best Practices | `AgentBuilder` component is 426 lines with 12+ state variables | Medium |
| 27 | TST-2 | Testing | Snapshot mapping duplication propagates into test mock duplication | Medium |
| 28 | EXT-4 | Extensibility | Tier config limits hardcoded — not env-configurable | Low |
| 29 | EXT-5 | Extensibility | `MODEL_FAMILY` in `lib/tier.ts` is a static lookup — new models require code change | Low |
| 30 | EXT-6 | Extensibility | Middleware is monolithic — single function, not composable | Low |
| 31 | BP-3 | Best Practices | `app/actions.ts` has 9 server actions covering bout/billing/admin | Low |
| 32 | BP-4 | Best Practices | Configuration scattered across 10+ files — no centralized audit surface | Low |
| 33 | TS-8 | TypeScript | No shared `toErrorMessage()` utility — 3 different error-to-string patterns | Low |
| 34 | OC-3 | SOLID | Rate limit config inline in routes — not extracted to constants | Low |
| 35 | EXT-7 | Extensibility | Arena max agents hardcoded to 6 in component | Low |
| 36 | BP-5 | Best Practices | No barrel file for `lib/` — acceptable, but worth noting for large imports | Low |
| 37 | RR-H1 | Code Hygiene | Arena lineup construction duplicated 3 times across route + 2 pages | High |
| 38 | RR-H4 | Code Hygiene | `buildLineage()` function duplicated in 2 components | High |
| 39 | RR-Q5 | Best Practices | Missing error handling on `navigator.clipboard` in Arena | Medium |
| 40 | RR-Q6 | Best Practices | `castWinnerVote` has try/finally but no catch — uncaught network errors | Medium |
| 41 | RR-Q7 | Best Practices | Swallowed reaction errors without optimistic rollback | Medium |
| 42 | RR-H9 | Architecture | N+1 queries in agent lineage resolution — up to 4 sequential DB round-trips | Medium |
| 43 | RR-H10 | Architecture | Leaderboard full-table scans (15 queries) aggregated in JS instead of SQL | Medium |
| 44 | RR-A1 | Accessibility | `AgentDetailsModal` missing `role="dialog"` and `aria-modal`, no focus trapping | Medium |
| 45 | RR-A2 | Accessibility | Form inputs missing explicit `htmlFor`/`id` label associations | Medium |
| 46 | RR-A3 | Accessibility | Leaderboard sort headers lack `aria-sort` attribute | Medium |
| 47 | TST-3 | Testing | No shared test utilities — mock setup duplicated across ~60 test files | High |
| 48 | TST-4 | Testing | No CI/CD pipeline — no `.github/workflows/` config, tests run via Vercel implicitly | High |
| 49 | TST-5 | Testing | Single E2E test — only one Playwright spec for happy path | Medium |
| 50 | ARCH-1 | Architecture | No shared UI primitive layer — no `ui/button.tsx` or `ui/input.tsx` | Medium |
| 51 | ARCH-2 | Architecture | In-memory rate limiting — per-instance, not distributed (Redis/Upstash needed for multi-instance) | Medium |
| 52 | ARCH-3 | Architecture | In-memory caching (leaderboard, onboarding) — time-based only, no event-driven invalidation | Medium |
| 53 | ARCH-4 | Architecture | No FK constraints in schema — referential integrity is application-layer only | Medium |
| 54 | ARCH-5 | Architecture | Clerk IDs as user PK — couples schema to auth provider | Low |
| 55 | DOC-1 | Documentation | `pitctl/README.md` uses wrong tier names (`pro`/`team` instead of `pass`/`lab`) | High |
| 56 | DOC-2 | Documentation | `app/api/README.md` bout lifecycle shows `bout-complete` event that doesn't exist | Medium |
| 57 | DOC-3 | Documentation | `docs/press-release-strategy.md` and `docs/hardening-changes-2026-02-10.md` have stale test counts | Medium |
| 58 | DOC-4 | Documentation | `docs/mvp-checklist.md` items mostly unchecked despite being implemented | Medium |
| 59 | DOC-5 | Documentation | EAS signer wallet setup still pending — blocks production attestations | Low |
| 60 | DEFER-1 | Deferred | Transcript unbounded growth — needs context window budget strategy | Low |
| 61 | DEFER-2 | Deferred | No race condition / concurrent request tests | Low |

---

## 1. TypeScript Standards

### 1.1 Type Safety & Strictness

**Strengths (documented for completeness):**

- **TS-S1: Zero `any` in production code.** Not a single `any` annotation exists in any of the 88 production source files. This is exceptional discipline for a codebase of this size.
- **TS-S2: Zero `@ts-ignore` / `@ts-expect-error`.** The type system is never bypassed.
- **TS-S3: Strict mode enabled.** `tsconfig.json` has `"strict": true`, which enables `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, and all other strict checks.
- **TS-S4: `satisfies` operator used correctly.** `lib/agent-registry.ts:111` uses `satisfies AgentSnapshot` for structural validation without widening — idiomatic TypeScript 4.9+.
- **TS-S5: Type guards in `lib/eas.ts`.** Lines 48 and 56 use proper `(value: unknown): value is string` predicates to narrow `unknown` values — the gold standard for runtime validation.

---

### 1.2 Type Organization & Reuse

#### TS-1: `TranscriptEntry` defined identically in two files — Medium

The same 4-field type exists in both `db/schema.ts:30` (exported) and `lib/use-bout.ts:30` (local). The client-side hook should import from the canonical source.

**Current — `lib/use-bout.ts:30-35`:**
```typescript
type TranscriptEntry = {
  turn: number;
  agentId: string;
  agentName: string;
  text: string;
};
```

**Recommended:**
```typescript
import type { TranscriptEntry } from '@/db/schema';
```

**Files affected:** `lib/use-bout.ts`

---

#### TS-2: `ResponseFormatId` / `ResponseLengthId` / `AgentTier` duplicated across modules — Medium

`lib/agent-dna.ts:18-20` re-declares the exact string literal unions that already exist in `lib/response-formats.ts`, `lib/response-lengths.ts`, and `db/schema.ts`:

```typescript
// lib/agent-dna.ts:18-20
export type AgentTier = 'free' | 'premium' | 'custom';
export type ResponseLengthId = 'short' | 'standard' | 'long';
export type ResponseFormatId = 'plain' | 'spaced' | 'markdown' | 'json';
```

If the format list is extended (e.g., `'html'`), `agent-dna.ts` must be updated separately — a drift risk.

**Recommended:** Import from canonical modules:
```typescript
import type { ResponseFormatId } from '@/lib/response-formats';
import type { ResponseLength as ResponseLengthId } from '@/lib/response-lengths';
// AgentTier: derive from the pgEnum or export from db/schema.ts
```

**Files affected:** `lib/agent-dna.ts`, plus any consumers of its re-exported types.

---

#### TS-7: Component types redeclare `AgentSnapshot` fields instead of using `Pick`/`Omit` — Medium

`AgentCatalogEntry` (`components/agents-catalog.tsx`), `AgentDetails` (`components/agent-details-modal.tsx`), and `ArenaAgentOption` (`components/arena-builder.tsx`) all redeclare subsets of `AgentSnapshot` fields manually. If a field name changes in `AgentSnapshot`, these types silently drift.

**Current — `components/arena-builder.tsx`:**
```typescript
export type ArenaAgentOption = {
  id: string;
  name: string;
  presetName: string | null;
  color?: string;
  avatar?: string;
};
```

**Recommended:**
```typescript
import type { AgentSnapshot } from '@/lib/agent-registry';

export type ArenaAgentOption = Pick<
  AgentSnapshot,
  'id' | 'name' | 'presetName' | 'color' | 'avatar'
>;
```

**Files affected:** `components/agents-catalog.tsx`, `components/agent-details-modal.tsx`, `components/arena-builder.tsx`

---

### 1.3 Type Assertions & Escape Hatches

#### TS-3: 5 `!` non-null assertions in `app/actions.ts:111-115` — Medium

After `.filter(Boolean)` removes falsy values from a `.find()` lookup, TypeScript still considers the elements `T | undefined`. Five consecutive `!` assertions follow:

**Current — `app/actions.ts:107-116`:**
```typescript
const lineup = agentIds
  .map((id) => snapshots.find((agent) => agent.id === id))
  .filter(Boolean)
  .map((agent) => ({
    id: agent!.id,
    name: agent!.name,
    systemPrompt: agent!.systemPrompt,
    color: agent!.color,
    avatar: agent!.avatar,
  }));
```

**Recommended — use `.flatMap()` with inline narrowing:**
```typescript
const lineup = agentIds.flatMap((id) => {
  const agent = snapshots.find((a) => a.id === id);
  if (!agent) return [];
  return [{
    id: agent.id,
    name: agent.name,
    systemPrompt: agent.systemPrompt,
    color: agent.color,
    avatar: agent.avatar,
  }];
});
```

No `!` assertions needed. TypeScript narrows `agent` to non-undefined after the `if (!agent)` guard.

---

#### TS-4: 6 `as Error` casts in catch blocks without type guards — Medium

These locations cast `unknown` catch values directly to `Error`:

| File | Line |
|------|------|
| `app/api/agents/route.ts` | 266 |
| `app/api/admin/seed-agents/route.ts` | 28, 89, 120 |
| `components/agent-builder.tsx` | 168 |

If a non-`Error` value is thrown (e.g., a string, or an Anthropic SDK error object), accessing `.message` may return `undefined`.

**Current:**
```typescript
} catch (error) {
  return Response.json({ error: (error as Error).message }, { status: 500 });
}
```

**Recommended — use `instanceof` guard (already used in `run-bout/route.ts:500`):**
```typescript
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  return Response.json({ error: message }, { status: 500 });
}
```

This pattern already exists in the codebase at `app/api/run-bout/route.ts:500-501`, making it a consistency fix rather than a new pattern.

---

#### TS-5: `{} as LeaderboardData` empty-object assertion — Medium

**`lib/leaderboard.ts:106`:**
```typescript
const result = {} as LeaderboardData;
```

This creates an object that claims to have all `LeaderboardData` fields but has none. Any access before population would silently return `undefined` despite the type claiming otherwise.

**Recommended — initialize with the full shape:**
```typescript
const result: LeaderboardData = {
  all: { pit: [], players: [] },
  week: { pit: [], players: [] },
  day: { pit: [], players: [] },
};
```

---

#### TS-6: Stripe webhook uses 6 inline `as { ... }` casts — Medium

**`app/api/credits/webhook/route.ts:69, 106, 140, 174, 198, 235`:**

Each Stripe event type uses an inline `as` cast:
```typescript
const subscription = event.data.object as {
  id: string;
  status: string;
  customer: string;
  metadata?: Record<string, string>;
  items?: { data: { price: { id: string } }[] };
};
```

The Stripe SDK provides discriminated event types. After `event.type` narrowing, the `data.object` type can be resolved via Stripe's built-in types.

**Recommended — use Stripe discriminated event types:**
```typescript
if (event.type === 'customer.subscription.created') {
  const subscription = event.data.object; // Stripe.Subscription
  // All fields are properly typed
}
```

This requires updating the `stripe.webhooks.constructEvent()` call to return a typed event, or using a type guard. The Stripe SDK's `Stripe.DiscriminatedEvent` type narrows `data.object` automatically based on `event.type`.

---

### 1.4 Error Typing

#### TS-8: No shared `toErrorMessage()` utility — Low

Three different error-to-string patterns exist in the codebase:

1. `(error as Error).message` — 6 locations (unsafe)
2. `error instanceof Error ? error.message : String(error)` — `run-bout/route.ts:500`
3. Bare `catch {}` discarding the error — 22 locations

**Recommended — extract a utility:**
```typescript
// lib/errors.ts
export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error';
}
```

---

## 2. SOLID Principles

### 2.1 Single Responsibility

#### SRP-1: `run-bout/route.ts` is a 527-line monolith — Critical

This is the highest-impact finding. The single `POST` handler orchestrates **15+ distinct responsibilities**:

1. JSON parsing & field extraction (lines 50-74)
2. Database initialization (lines 80-85)
3. Idempotency check (lines 87-115)
4. Preset resolution with arena fallback (lines 117-170)
5. BYOK key retrieval from cookies (lines 179-186)
6. Authentication (line 188)
7. Rate limiting (lines 190-200)
8. Tier-based access control with subscription vs legacy branching (lines 202-269)
9. Credit preauthorization (lines 271-296)
10. Bout DB upsert (lines 298-314)
11. Multi-turn streaming loop (lines 342-405)
12. Share line generation (lines 407-430)
13. Transcript persistence (lines 432-441)
14. Credit settlement — success path (lines 447-467)
15. Credit settlement — error path (lines 468-494)
16. Error classification for client display (lines 499-517)

The streaming `execute` callback alone spans lines 317-498 (~180 lines). The pre-flight logic spans lines 50-296 (~250 lines).

**Recommended decomposition:**

```typescript
// app/api/run-bout/route.ts — reduced to orchestration (~60 lines)
export async function POST(req: Request) {
  const params = parseBoutRequest(req);             // lib/bout/parse.ts
  if (params.error) return params.error;

  const access = await enforceBoutAccess(params);   // lib/bout/access.ts
  if (access.error) return access.error;

  const preauth = await preauthBout(params, access); // lib/bout/preauth.ts
  if (preauth.error) return preauth.error;

  return streamBout(params, access, preauth);        // lib/bout/stream.ts
}
```

Each extracted module would be 80-120 lines, independently testable without complex mock chains, and open for extension (e.g., adding a new access control strategy) without modifying the streaming logic.

**Estimated effort:** 2-3 hours. This is the single highest-leverage refactor in the codebase.

---

#### SRP-2: `lib/credits.ts` at 336 lines has 5-6 sub-responsibilities — Medium

This module handles: credit value constants, token cost estimation, model pricing lookups, credit account management (ensure/get), delta application, transaction recording, preauthorization, and settlement.

All responsibilities share the credit domain, so this is more "cohesive module" than "grab-bag." However, splitting would improve testability:

**Recommended split:**
- `lib/credit-pricing.ts` — constants, estimation functions, model pricing (~80 lines)
- `lib/credit-ledger.ts` — DB operations: ensure, delta, preauth, settle (~200 lines)

---

#### SRP-3: `lib/leaderboard.ts` at 324 lines with complex aggregation — Medium

Computes win rates, vote counts, bout participation, and player stats across 3 time ranges × 5 tables. The per-range loop body is ~210 lines.

This module does one thing (compute leaderboard data), but the implementation complexity makes it the hardest module to modify. Consider extracting `computePitLeaderboard()` and `computePlayerLeaderboard()` as separate functions.

---

### 2.2 Open/Closed

#### OC-1: `run-bout` pre-flight interleaves subscription vs legacy branching — Medium

**`app/api/run-bout/route.ts:209-269`:**

The access control logic has two parallel paths gated on `SUBSCRIPTIONS_ENABLED`:

```typescript
if (SUBSCRIPTIONS_ENABLED && userId) {
  // ~40 lines: tier checks, model resolution, pool consumption
} else {
  // ~20 lines: legacy PREMIUM_ENABLED flag
}
```

Adding a third access mode (e.g., API key-based access, team accounts) would require modifying this already-complex conditional tree.

**Recommended:** Extract to a strategy pattern:
```typescript
// lib/bout/access.ts
type AccessResult = { allowed: true; modelId: string } | { allowed: false; response: Response };

export async function resolveBoutAccess(
  userId: string | null, preset: Preset, requestedModel: string, byokKey: string,
): Promise<AccessResult> {
  if (SUBSCRIPTIONS_ENABLED && userId) return resolveSubscriptionAccess(userId, preset, requestedModel, byokKey);
  return resolveLegacyAccess(preset, requestedModel, byokKey);
}
```

---

#### OC-2: Preset list statically imported — Medium

**`lib/presets.ts:93-105`:**
```typescript
const RAW_PRESETS: RawPreset[] = [
  darwinSpecial, lastSupper, roastBattle, sharkPit,
  onTheCouch, glovesOff, firstContact, writersRoom,
  mansion, summit, flatshare,
];
```

Adding a new preset requires: (1) creating a JSON file, (2) adding an import statement, (3) adding it to the array. Steps 2-3 are modification of existing code.

**Recommended — dynamic loading:**
```typescript
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const RAW_PRESETS: RawPreset[] = readdirSync(join(process.cwd(), 'presets'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(process.cwd(), 'presets', f), 'utf8')));
```

Adding a preset becomes: drop a JSON file in `/presets/`. No code changes.

---

#### OC-3: Rate limit config inline in routes — Low

Rate limit parameters are hardcoded inside each route handler:

```typescript
// app/api/run-bout/route.ts:195
{ name: 'bout-creation', maxRequests: userId ? 5 : 2, windowMs: 60 * 60 * 1000 }
```

Similar inline configs appear in `contact/route.ts`, `reactions/route.ts`, `newsletter/route.ts`, `ask-the-pit/route.ts`, and `agents/route.ts`.

**Recommended — centralize:**
```typescript
// lib/rate-limit-config.ts
export const RATE_LIMITS = {
  bout: { name: 'bout-creation', maxRequests: 5, windowMs: 60 * 60 * 1000 },
  boutAnon: { name: 'bout-creation', maxRequests: 2, windowMs: 60 * 60 * 1000 },
  contact: { name: 'contact', maxRequests: 5, windowMs: 60 * 60 * 1000 },
  // ...
} as const;
```

---

### 2.3 Liskov Substitution

**No violations found.** The codebase has zero class hierarchies, zero `extends`, and zero `abstract` declarations. The architecture is purely functional.

The most relevant LSP observation: `Preset` objects are constructed dynamically for arena mode (`run-bout/route.ts:144-158`) and satisfy the same interface as statically-loaded presets. Downstream code (streaming loop, agent iteration) handles both identically. This is correct structural substitutability.

---

### 2.4 Interface Segregation

#### ISP-1: `AgentSnapshot` is a ~30-field fat type — High

**`lib/agent-registry.ts`** exports `AgentSnapshot` with fields covering identity, personality, attestation, and ownership. Every consumer receives the full type:

| Consumer | Fields actually used |
|----------|---------------------|
| Leaderboard | `id`, `name`, `tier`, `color`, `presetName` |
| Arena builder | `id`, `name`, `presetName`, `color`, `avatar` |
| Agent detail page | All fields |
| Agent DNA hashing | `id`, `name`, `systemPrompt`, `presetId`, `tier`, personality fields |

**Recommended — decompose into composable types:**
```typescript
// lib/agent-types.ts
export type AgentIdentity = {
  id: string;
  name: string;
  presetId: string | null;
  presetName: string | null;
  tier: string;
  color?: string;
  avatar?: string;
};

export type AgentPersonality = {
  archetype: string | null;
  tone: string | null;
  quirks: string[] | null;
  speechPattern: string | null;
  openingMove: string | null;
  signatureMove: string | null;
  weakness: string | null;
  goal: string | null;
  fears: string | null;
  customInstructions: string | null;
};

export type AgentAttestation = {
  promptHash: string | null;
  manifestHash: string | null;
  attestationUid: string | null;
  attestationTxHash: string | null;
};

export type AgentSnapshot = AgentIdentity & AgentPersonality & AgentAttestation & {
  systemPrompt: string;
  responseLength: string;
  responseFormat: string;
  createdAt: string | null;
  ownerId: string | null;
  parentId: string | null;
  archived: boolean;
};
```

Consumers import only the slice they need: `AgentIdentity` for leaderboard/arena, full `AgentSnapshot` for detail pages.

---

### 2.5 Dependency Inversion

#### DIP-1: No dependency inversion for DB, AI, or Stripe — Critical

Every module that needs infrastructure services imports them directly:

```typescript
// 15+ modules:
import { requireDb } from '@/db';

// app/actions.ts + webhook:
import { stripe } from '@/lib/stripe';

// run-bout + ask-the-pit:
import { getModel } from '@/lib/ai';

// 10+ modules:
import { auth } from '@clerk/nextjs/server';
```

There are no interfaces, no dependency injection, and no inversion of control. High-level business logic (tier checking, credit management, bout orchestration) depends directly on low-level infrastructure.

**Consequences:**
1. Unit testing requires `vi.mock()` at the module level for every import — creating the tight mock coupling documented in TST-1.
2. Swapping the database (Drizzle → Prisma), AI provider (Anthropic → OpenAI), or payment processor (Stripe → Paddle) requires modifying every consumer.
3. No ability to create lightweight test fixtures that implement the same interface.

**Recommended — introduce thin interfaces at the boundary:**

```typescript
// lib/ports/database.ts
export type DatabasePort = {
  select: <T>(table: T) => SelectBuilder<T>;
  insert: <T>(table: T) => InsertBuilder<T>;
  update: <T>(table: T) => UpdateBuilder<T>;
};

// lib/ports/ai.ts
export type AIProviderPort = {
  getModel: (modelId?: string, apiKey?: string) => LanguageModel;
};

// lib/ports/payment.ts
export type PaymentPort = {
  createCheckout: (params: CheckoutParams) => Promise<{ url: string }>;
  constructWebhookEvent: (body: string, sig: string) => WebhookEvent;
};
```

Modules accept these ports as parameters (or read them from a context object), enabling both real and test implementations without module-level mocking.

**Note:** This is the highest-effort recommendation (~4-8 hours) but would fundamentally improve testability and provider swappability. For an MVP-stage product, the pragmatic approach is to introduce ports incrementally — start with `AIProviderPort` since it has the fewest consumers (2 files).

---

## 3. Extensibility vs Rapid Implementation

### 3.1 Extension Points & Provider Abstractions

#### EXT-1: AI provider hardcoded to Anthropic — Critical

**`lib/ai.ts:12-14`:**
```typescript
import { createAnthropic } from '@ai-sdk/anthropic';

const defaultAnthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
```

Every model resolution goes through Anthropic. Adding OpenAI or Google would require modifying `lib/ai.ts`, `lib/credits.ts` (model pricing), `lib/tier.ts` (model family mapping), and `app/api/run-bout/route.ts` (model resolution).

**Recommended — use the Vercel AI SDK's provider-agnostic interface:**

```typescript
// lib/ai.ts
import { createAnthropic } from '@ai-sdk/anthropic';
// Future: import { createOpenAI } from '@ai-sdk/openai';

const providers = {
  anthropic: createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
  // openai: createOpenAI({ apiKey: process.env.OPENAI_API_KEY }),
} as const;

type ProviderId = keyof typeof providers;

const MODEL_PROVIDER: Record<string, ProviderId> = {
  'claude-haiku-4-5-20251001': 'anthropic',
  'claude-sonnet-4-5-20250929': 'anthropic',
  // 'gpt-4o': 'openai',
};

export const getModel = (modelId?: string, apiKey?: string) => {
  const resolved = modelId ?? FREE_MODEL_ID;
  const providerId = MODEL_PROVIDER[resolved] ?? 'anthropic';
  const provider = apiKey
    ? createAnthropic({ apiKey }) // BYOK remains Anthropic-only for now
    : providers[providerId];
  return provider(resolved);
};
```

The `streamText()` call in `run-bout` is already provider-agnostic (it accepts any `LanguageModel`), so only `lib/ai.ts` and the pricing tables need to change.

---

#### EXT-2: `ask-the-pit` creates its own Anthropic instance — Medium

**`app/api/ask-the-pit/route.ts:75-77`:**
```typescript
const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
```

This duplicates the provider construction in `lib/ai.ts:14`. If the API key env var name changes, or BYOK support is added to ask-the-pit, this instance must be updated separately.

**Recommended:**
```typescript
import { getModel } from '@/lib/ai';

const result = streamText({
  model: getModel(ASK_THE_PIT_MODEL),
  // ...
});
```

---

#### EXT-3: `ask-the-pit-config.ts` hardcodes model ID — Medium

**`lib/ask-the-pit-config.ts:11`:**
```typescript
export const ASK_THE_PIT_MODEL = 'claude-haiku-4-5-20251001';
```

This duplicates the default model ID from `lib/ai.ts:21`. If the free model changes, this constant must be updated separately.

**Recommended:**
```typescript
import { FREE_MODEL_ID } from '@/lib/ai';
export const ASK_THE_PIT_MODEL = process.env.ASK_THE_PIT_MODEL ?? FREE_MODEL_ID;
```

---

### 3.2 Configuration vs Hardcoding

#### EXT-4: Tier config limits hardcoded — Low

**`lib/tier.ts:53-78`:**
```typescript
export const TIER_CONFIG: Record<UserTier, TierConfig> = {
  free: { boutsPerDay: 3, lifetimeBoutCap: 15, maxAgents: 1, /* ... */ },
  pass: { boutsPerDay: 15, lifetimeBoutCap: null, maxAgents: 5, /* ... */ },
  lab: { boutsPerDay: 100, lifetimeBoutCap: null, maxAgents: Infinity, /* ... */ },
};
```

None of these values are env-configurable. Adjusting the free tier's daily limit (a common iteration during launch) requires a code change and redeploy.

**Recommended:** Make numeric limits env-overridable:
```typescript
free: {
  boutsPerDay: Number(process.env.TIER_FREE_BOUTS_PER_DAY ?? '3'),
  lifetimeBoutCap: Number(process.env.TIER_FREE_LIFETIME_CAP ?? '15'),
  maxAgents: Number(process.env.TIER_FREE_MAX_AGENTS ?? '1'),
  // ...
},
```

---

#### EXT-5: `MODEL_FAMILY` is a static lookup — Low

**`lib/tier.ts:81-86`:**
```typescript
const MODEL_FAMILY: Record<string, 'haiku' | 'sonnet' | 'opus'> = {
  'claude-haiku-4-5-20251001': 'haiku',
  'claude-sonnet-4-5-20250929': 'sonnet',
  'claude-opus-4-5-20251101': 'opus',
  'claude-opus-4-6': 'opus',
};
```

Adding a new model (e.g., a newer Sonnet release) requires editing this file. Consider deriving families from model ID patterns or making this env-configurable via `MODEL_FAMILIES_JSON`.

---

#### EXT-7: Arena max agents hardcoded — Low

**`components/arena-builder.tsx:65`:**
```typescript
if (prev.length >= 6) return prev;
```

The max of 6 agents is hardcoded in the component. Extract to a constant in `lib/presets.ts`:
```typescript
export const MAX_ARENA_AGENTS = Number(process.env.MAX_ARENA_AGENTS ?? '6');
```

---

### 3.3 Feature Flag Patterns

**Strength documented:** The codebase uses a uniform `process.env.X_ENABLED === 'true'` pattern for 7 feature flags (`CREDITS_ENABLED`, `BYOK_ENABLED`, `EAS_ENABLED`, `SUBSCRIPTIONS_ENABLED`, `ASK_THE_PIT_ENABLED`, `CREDITS_ADMIN_ENABLED`, `PREMIUM_ENABLED`). This is consistent and transparent.

**Limitation:** Flags are evaluated at module load time (not hot-reloadable) and scattered across 6+ files. There is no centralized flag registry for auditing all toggles at once. At this codebase size, this is acceptable. If the flag count doubles, consider a `lib/feature-flags.ts` barrel.

---

### 3.4 API Design & Middleware Patterns

#### EXT-6: Middleware is monolithic — Low

**`middleware.ts` (25 lines):** A single function wrapping Clerk auth middleware that sets a referral cookie. Not composable — adding request logging, geo-blocking, or A/B test routing requires modifying this function.

For the current feature set, this is acceptable. If middleware concerns grow beyond 2-3, consider a composition pattern:

```typescript
export default clerkMiddleware(compose(withReferralCookie, withRequestLogging));
```

---

### 3.5 Code Duplication

#### DUP-1: BYOK stash flow duplicated in 2 components — High

**`components/preset-card.tsx:78-115`** and **`components/arena-builder.tsx:77-111`** contain nearly identical code:

```typescript
// Both components implement:
if (selectedModel === 'byok') {
  if (byokStashedRef.current) { byokStashedRef.current = false; return; }
  const trimmed = byokKey.trim();
  if (!trimmed) { event.preventDefault(); setByokError('BYOK key required.'); return; }
  event.preventDefault();
  try {
    const res = await fetch('/api/byok-stash', { method: 'POST', /* ... */ });
    if (!res.ok) { setByokError('Failed to prepare key.'); return; }
  } catch { setByokError('Failed to prepare key.'); return; }
  byokStashedRef.current = true;
  (event.target as HTMLFormElement).requestSubmit();
}
```

**Recommended — extract a shared hook:**
```typescript
// lib/use-byok-stash.ts
export function useByokStash() {
  const stashedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const handleByokSubmit = async (
    event: FormEvent<HTMLFormElement>,
    key: string,
  ): Promise<boolean> => {
    // ... shared logic, returns true if form should proceed
  };

  return { handleByokSubmit, byokError: error, clearByokError: () => setError(null) };
}
```

---

#### DUP-2: Response length/format selectors duplicated across 3 components — High

The same `<select>` rendering code for response lengths and formats appears in:
- `components/preset-card.tsx` (lines 177-207)
- `components/arena-builder.tsx` (lines 152-179)
- `components/agent-builder.tsx` (lines 352-384)

**Recommended — extract reusable components:**
```typescript
// components/response-length-select.tsx
export function ResponseLengthSelect({ name, defaultValue }: Props) {
  return (
    <select name={name} defaultValue={defaultValue} className="...">
      {RESPONSE_LENGTHS.map((l) => (
        <option key={l.id} value={l.id}>{l.label} — {l.hint}</option>
      ))}
    </select>
  );
}
```

---

#### DUP-3: JSON parsing boilerplate repeated in 8 API routes — High

Every route handler repeats the same try/catch:

```typescript
let payload: { ... };
try {
  payload = await req.json();
} catch {
  return new Response('Invalid JSON.', { status: 400 });
}
```

Found in: `run-bout`, `agents`, `reactions`, `winner-vote`, `newsletter`, `contact`, `ask-the-pit`, `byok-stash`.

**Recommended — extract a shared parser:**
```typescript
// lib/api-utils.ts
export async function parseJsonBody<T>(req: Request): Promise<
  { data: T; error?: never } | { data?: never; error: Response }
> {
  try {
    const data = await req.json();
    return { data: data as T };
  } catch {
    return { error: new Response('Invalid JSON.', { status: 400 }) };
  }
}

// Usage in routes:
const { data: payload, error } = await parseJsonBody<BoutPayload>(req);
if (error) return error;
```

---

#### DUP-4: Agent snapshot row-to-object mapping duplicated in 2 modules — High

**`lib/agent-registry.ts:76-111`** and **`lib/agent-detail.ts:80-111`** contain field-for-field identical mappings from a Drizzle row to an `AgentSnapshot` object (~30 lines each).

**Recommended — extract a shared mapper:**
```typescript
// lib/agent-mapper.ts
export function rowToSnapshot(
  row: typeof agents.$inferSelect,
  presetMatch: { preset: Preset; agent: Agent } | null,
): AgentSnapshot {
  return {
    id: row.id,
    name: row.name,
    presetId: row.presetId ?? null,
    presetName: presetMatch?.preset.name ?? null,
    // ... all fields
  } satisfies AgentSnapshot;
}
```

Both `agent-registry.ts` and `agent-detail.ts` call `rowToSnapshot(row, presetMatch)`.

---

#### DUP-5: Upsert race-condition pattern duplicated in 3 lib modules — High

The `select → onConflictDoNothing → re-read` pattern is implemented independently in:

1. **`lib/credits.ts:145-184`** — `ensureCreditAccount`
2. **`lib/users.ts:53-126`** — `ensureUserRecord`
3. **`lib/free-bout-pool.ts:28-65`** — `ensureTodayPool`

All three follow the exact same flow:
```typescript
const [existing] = await db.select().from(table).where(eq(pk, value)).limit(1);
if (existing) return existing;
const [created] = await db.insert(table).values(data).onConflictDoNothing().returning();
if (!created) {
  const [raced] = await db.select().from(table).where(eq(pk, value)).limit(1);
  if (!raced) throw new Error(`Failed to ensure ${entity}`);
  return raced;
}
return created;
```

**Recommended — extract a generic upsert helper:**
```typescript
// lib/db-utils.ts
export async function ensureRow<T>(
  db: ReturnType<typeof requireDb>,
  table: PgTable,
  pkColumn: PgColumn,
  pkValue: string,
  defaultValues: Record<string, unknown>,
): Promise<T> {
  const [existing] = await db.select().from(table).where(eq(pkColumn, pkValue)).limit(1);
  if (existing) return existing as T;

  const [created] = await db.insert(table).values({ ...defaultValues }).onConflictDoNothing().returning();
  if (!created) {
    const [raced] = await db.select().from(table).where(eq(pkColumn, pkValue)).limit(1);
    if (!raced) throw new Error(`Failed to ensure row in ${table}`);
    return raced as T;
  }
  return created as T;
}
```

---

## 4. Best Practices

### 4.1 Function Size & Complexity

#### BP-1: `Arena` component is 500 lines with inline business logic — Medium

`components/arena.tsx` handles: bout status display, message rendering, reaction sending, vote casting, share URL generation, scroll-to-bottom management, and responsive layout. The logic portion (~200 lines) includes `fetch()` calls for reactions and votes inline.

**Recommended:** Extract sub-components — `ArenaMessageList`, `ArenaVotePanel`, `ArenaReactionBar`, `ArenaShareToolbar`. The parent `Arena` becomes a composition of 4-5 smaller components sharing bout state.

---

#### BP-2: `AgentBuilder` component is 426 lines with 12+ state variables — Medium

`components/agent-builder.tsx` manages a multi-tab form with 12+ `useState` calls. The form submission handler, validation, and API call are all inline.

**Recommended:** Consider `useReducer` for the form state (consolidating 12 state variables into a single state object) and extract the submission handler to a custom hook (`useAgentSubmit`).

---

#### BP-3: `app/actions.ts` has 9 server actions — Low

At 392 lines, this file covers bout creation, Stripe billing, and admin operations. In Next.js convention a single `actions.ts` is normal, but this file is approaching the split point.

**Recommended:** When it grows past ~500 lines, split into `app/actions/bout.ts`, `app/actions/billing.ts`, `app/actions/admin.ts`. No action required now.

---

### 4.2 Error Handling Consistency

#### ERR-1: No shared error response format — High

API routes return error responses in 3 different formats:

1. Plain text: `new Response('Missing boutId.', { status: 400 })` (most routes)
2. JSON: `Response.json({ error: '...' }, { status: 500 })` (agents route)
3. Text with specific wording: `'The arena short-circuited.'` (run-bout onError)

Consumers (the React frontend) must handle all three. There is no `Content-Type` consistency guarantee.

**Recommended — standardize on a shared error response builder:**
```typescript
// lib/api-utils.ts
export function errorResponse(message: string, status: number): Response {
  return Response.json({ error: message }, {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

Apply across all routes for a consistent error contract.

---

### 4.3 Coupling & Dependency Graph

**Strength documented:** The `lib/` dependency tree is clean with no circular imports:
```
onboarding → users, credits, intro-pool, referrals
referrals → intro-pool
intro-pool → credits
leaderboard → presets, agent-registry, users
agent-registry → presets, agent-dna, response-*
agent-detail → presets, agent-registry, response-*
agent-dna → hash
eas → agent-dna (type-only)
tier → admin
```

High-coupling modules (`@/db`, `@/lib/presets`, `@/lib/credits`, `@/lib/tier`) are leaf-level infrastructure dependencies — this is the expected pattern. The tree shape (no cycles) means any module can be tested by mocking only its direct dependencies.

---

#### BP-4: Configuration scattered across 10+ files — Low

Feature flags and numeric config are read from `process.env` in: `lib/credits.ts`, `lib/tier.ts`, `lib/ai.ts`, `lib/eas.ts`, `lib/stripe.ts`, `lib/ask-the-pit-config.ts`, `lib/free-bout-pool.ts`, `lib/onboarding.ts`, `middleware.ts`, and `app/api/run-bout/route.ts`.

Auditing "what env vars does this app need?" requires grepping the entire codebase. At this project size, this is manageable. If the env var count exceeds ~40, consider a `lib/config.ts` that reads and validates all env vars at startup.

---

#### BP-5: No barrel file for `lib/` — Low

Each module is imported by full path (`@/lib/credits`, `@/lib/tier`). This is actually the **preferred Next.js pattern** — barrel files can cause circular dependency issues and tree-shaking problems. Documented here for completeness, not as a recommendation to change.

---

### 4.4 Component Architecture

**Strength documented:** Components are props-driven. `Arena`, `PresetCard`, `AgentBuilder`, and `ArenaBuilder` all accept data via props rather than reaching for global state. The `useBout` hook encapsulates streaming state management cleanly.

**Concern:** The lack of extracted sub-components in `Arena` and `AgentBuilder` (documented as BP-1 and BP-2) means these files must be read in their entirety to understand any single behavior. This is a readability and maintainability issue, not a correctness issue.

---

## 5. Test Architecture

### 5.1 Mock Coupling

#### TST-1: Tests mock Drizzle query builder chains — High

API and unit tests mock the fluent query builder shape:

```typescript
// tests/unit/credits.test.ts
const db = {
  select: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockRow]),
      }),
    }),
  }),
  insert: vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      onConflictDoNothing: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockRow]),
      }),
    }),
  }),
};
vi.mock('@/db', () => ({ requireDb: () => db }));
```

**Consequences:**
1. Adding `.innerJoin()` or `.orderBy()` to any query breaks the mock chain.
2. Switching from Drizzle to Prisma would break every test file.
3. Tests verify the mock setup matches the implementation, not that the behavior is correct.

**Recommended (long-term):** Introduce a repository/data-access pattern where business logic calls `creditRepository.getBalance(userId)` instead of building Drizzle queries directly. Tests mock the repository, not the query builder. This is the natural complement to DIP-1.

**Recommended (short-term):** Accept the current mock pattern but extract shared mock builders:
```typescript
// tests/helpers/mock-db.ts
export function mockDrizzleDb(overrides?: Partial<MockDb>) {
  return {
    select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn() }) }) }),
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockReturnValue({ returning: vi.fn() }) }) }),
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: vi.fn() }) }) }),
    ...overrides,
  };
}
```

This reduces mock duplication across test files and creates a single place to update when query patterns change.

---

### 5.2 Interface vs Implementation Testing

**Strength documented:** Pure function tests are properly decoupled. `tests/unit/tier.test.ts` tests `canAccessModel()`, `canRunBout()`, and `canCreateAgent()` by input/output without needing database mocks — because these functions accept pre-resolved tier values. This is the gold standard.

**Concern:** The API route tests (`tests/api/`) test implementation by verifying exact HTTP status codes and response bodies, which is correct for API contract testing. However, they must mock every internal dependency (DB, auth, rate limiter, credit system) to test a single behavior. This is a symptom of the SRP-1 monolith — if `run-bout` were decomposed, each piece could be tested independently with minimal mocking.

---

### 5.3 Test Duplication

#### TST-2: Snapshot mapping duplication propagates into test mocks — Medium

Because `agent-registry.ts` and `agent-detail.ts` both implement the same row-to-snapshot mapping (DUP-4), their tests both mock the same DB schema shape and assert the same field mappings. Extracting `rowToSnapshot()` would consolidate this into a single test file.

Similarly, the upsert race pattern (DUP-5) is tested independently in `credits.test.ts`, `users.test.ts`, and `free-bout-pool.test.ts` with near-identical mock setups. A shared `ensureRow()` utility would require only one test.

---

## 6. Appendix: File-level Heatmap

Files ranked by density of findings (most findings first):

| File | Findings | IDs |
|------|----------|-----|
| `app/api/run-bout/route.ts` | 5 | SRP-1, OC-1, DUP-3, ERR-1, rate-limit inline |
| `lib/agent-registry.ts` | 3 | ISP-1, DUP-4, TST-2 |
| `lib/agent-detail.ts` | 2 | DUP-4, TST-2 |
| `lib/credits.ts` | 3 | SRP-2, DUP-5, TS-5 adjacent |
| `lib/tier.ts` | 3 | EXT-4, EXT-5, OC-1 adjacent |
| `lib/ai.ts` | 2 | EXT-1, DIP-1 |
| `lib/use-bout.ts` | 1 | TS-1 |
| `lib/agent-dna.ts` | 1 | TS-2 |
| `lib/leaderboard.ts` | 2 | SRP-3, TS-5 |
| `lib/presets.ts` | 1 | OC-2 |
| `lib/users.ts` | 1 | DUP-5 |
| `lib/free-bout-pool.ts` | 1 | DUP-5 |
| `lib/ask-the-pit-config.ts` | 1 | EXT-3 |
| `app/actions.ts` | 2 | TS-3, BP-3 |
| `app/api/ask-the-pit/route.ts` | 1 | EXT-2 |
| `app/api/agents/route.ts` | 2 | TS-4, ERR-1 |
| `app/api/admin/seed-agents/route.ts` | 1 | TS-4 |
| `app/api/credits/webhook/route.ts` | 1 | TS-6 |
| `components/preset-card.tsx` | 2 | DUP-1, DUP-2 |
| `components/arena-builder.tsx` | 3 | DUP-1, DUP-2, EXT-7 |
| `components/arena.tsx` | 1 | BP-1 |
| `components/agent-builder.tsx` | 2 | BP-2, TS-4 |
| `components/agents-catalog.tsx` | 1 | TS-7 |
| `components/agent-details-modal.tsx` | 1 | TS-7 |
| `middleware.ts` | 1 | EXT-6 |
| `db/schema.ts` | 0 | — |

**Zero-finding files (22):** `lib/admin.ts`, `lib/cn.ts`, `lib/hash.ts`, `lib/form-utils.ts`, `lib/analytics.ts`, `lib/stripe.ts`, `lib/rate-limit.ts`, `lib/reactions.ts`, `lib/winner-votes.ts`, `lib/referrals.ts`, `lib/onboarding.ts`, `lib/intro-pool.ts`, `lib/credit-catalog.ts`, `lib/eas.ts`, `lib/attestation-links.ts`, `lib/agent-links.ts`, `lib/agent-prompts.ts`, `lib/response-lengths.ts`, `lib/response-formats.ts`, `db/index.ts`, `components/posthog-provider.tsx`, `components/site-header.tsx`. These modules are clean, focused, and follow all standards reviewed.

---

## Summary Statistics

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| TypeScript Standards | 0 | 0 | 7 | 1 | 8 |
| SOLID Principles | 2 | 1 | 5 | 0 | 8 |
| Extensibility | 1 | 0 | 3 | 5 | 9 |
| Best Practices | 0 | 1 | 2 | 3 | 6 |
| Testing | 0 | 1 | 1 | 0 | 2 |
| Duplication | 0 | 5 | 0 | 0 | 5 |
| **Total** | **3** | **8** | **18** | **9** | **38** |

**Documented strengths:** 6 (zero `any`, zero `@ts-ignore`, `satisfies` usage, type guards, clean dependency tree, props-driven components).

---

## 7. Cross-Review Findings: Release Readiness Review

The following findings are sourced from `docs/release-review-2026-02-11.md` and extend the architecture review with code hygiene, UI quality, and accessibility concerns not covered in sections 1-5.

**Note on resolved items:** PRs #77-83 addressed the critical security findings (S-01, S-02), high security hardening (S-03 through S-08), medium security (S-09 through S-13), lint errors (Q-01), `as Error` casts (Q-03), React key issues (Q-04), magic constants (H-05, H-06, H-07, H-08), and component naming (Q-09). These are excluded below — only **open** findings are listed.

### 7.1 Remaining Code Hygiene

#### RR-H1: Arena lineup construction duplicated 3 times — High

The same JSONB-to-`Agent[]` mapping appears in:
- `app/api/run-bout/route.ts:144-158`
- `app/bout/[id]/page.tsx:91-106`
- `app/b/[id]/page.tsx:33-49`

**Recommended:** Extract `buildLineupFromBout()` into `lib/presets.ts`:
```typescript
export function buildLineupFromBout(
  agentLineup: ArenaAgent[],
): Agent[] {
  return agentLineup.map((a) => ({
    id: a.id,
    name: a.name,
    systemPrompt: a.systemPrompt,
    color: a.color ?? DEFAULT_AGENT_COLOR,
    avatar: a.avatar,
  }));
}
```

---

#### RR-H4: `buildLineage()` function duplicated in 2 components — High

**`components/leaderboard-table.tsx:87-105`** and **`components/agents-catalog.tsx:74-92`** both implement the same lineage-to-display-string logic.

**Recommended:** Extract to `lib/agent-links.ts` or a new `lib/agent-lineage.ts` utility.

---

### 7.2 Remaining Code Quality

#### RR-Q5: Missing error handling on `navigator.clipboard` — Medium

**`components/arena.tsx:198,205`:**

`navigator.clipboard.writeText()` can fail in non-secure contexts (HTTP) or when the document lacks focus. Currently uncaught.

**Recommended:**
```typescript
try {
  await navigator.clipboard.writeText(url);
} catch {
  // Fallback: select a hidden input for manual copy
}
```

---

#### RR-Q6: `castWinnerVote` has try/finally but no catch — Medium

**`components/arena.tsx:236-262`:**

Network errors from the `fetch('/api/winner-vote')` call propagate uncaught into React, potentially crashing the component.

**Recommended:** Add a `catch` block that sets an error state and allows the user to retry.

---

#### RR-Q7: Swallowed reaction errors without optimistic rollback — Medium

**`components/arena.tsx:231-233`:**

Reaction count is optimistically incremented, but if the API call fails the count is never rolled back. The user sees a phantom reaction.

**Recommended:** Wrap in try/catch and decrement on failure.

---

### 7.3 Performance

#### RR-H9: N+1 queries in agent lineage resolution — Medium

**`lib/agent-detail.ts:122-133`:**

The lineage walker issues sequential `SELECT` queries in a `while` loop (up to 4 iterations). Each iteration is a full DB round-trip.

**Recommended:** Batch-load all ancestors in a single recursive CTE query or use `WHERE id IN (...)` with a pre-collected list of parent IDs.

---

#### RR-H10: Leaderboard full-table scans aggregated in JS — Medium

**`lib/leaderboard.ts:112-131`:**

Per time range, the module runs 5 `SELECT *` queries (bouts, votes, referrals, agents, users) and aggregates everything in JavaScript. For 3 ranges, that's 15 full-table scans per leaderboard load.

**Recommended:** Replace with SQL-level aggregation using `GROUP BY`, `COUNT`, and window functions. A single materialized view or cached SQL query would reduce this to 1-3 queries total.

---

### 7.4 Accessibility

#### RR-A1: `AgentDetailsModal` missing dialog semantics — Medium

**`components/agent-details-modal.tsx:54-176`:**

No `role="dialog"`, no `aria-modal="true"`, no focus trapping. Screen readers cannot identify it as a modal, and keyboard users can tab behind it.

**Recommended:** Add `role="dialog"` and `aria-modal="true"` to the container. Implement focus trapping (or use a library like `@headlessui/react`).

---

#### RR-A2: Form inputs missing label associations — Medium

**`app/contact/page.tsx:70-108`:**

Labels wrap inputs visually but lack `htmlFor`/`id` binding. Screen readers may not announce the label when the input is focused.

**Recommended:** Add `id` to each `<input>`/`<textarea>` and `htmlFor` to the corresponding `<label>`.

---

#### RR-A3: Leaderboard sort headers lack `aria-sort` — Medium

**`components/leaderboard-table.tsx`, `components/player-leaderboard-table.tsx`:**

Clickable sort headers have no `aria-sort="ascending"` or `aria-sort="descending"` attribute. Screen readers cannot communicate the current sort state.

---

## 8. Cross-Review Findings: Sub-Root README Trade-offs

The documentation rewrite (PR #82, #89) added `README.md` files to every directory. Several of these self-identify architectural trade-offs and improvement opportunities that align with findings in this review.

### 8.1 Testing (`tests/README.md`)

#### TST-3: No shared test utilities — High

> *"Mock setup helpers are duplicated across ~60 test files. This maximizes isolation (no hidden shared state) but increases maintenance cost when DB mock patterns change. Extracting a `tests/helpers/` module with shared mock factories would reduce duplication. This is the most impactful improvement opportunity in the test layer."*

This directly reinforces TST-1 and TST-2. A `tests/helpers/mock-db.ts` file with a `mockDrizzleDb()` factory would be the single highest-leverage testing improvement.

---

#### TST-4: No CI/CD pipeline — High

> *"The `test:ci` npm script defines the gate (`lint + typecheck + unit + integration`) but there are no `.github/workflows/` or equivalent config files."*

Adding a GitHub Actions workflow for pre-merge CI would catch regressions before they hit master.

**Recommended — minimal workflow:**
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npm run test:ci
```

---

#### TST-5: Single E2E test — Medium

> *"One Playwright spec covers the happy path... Additional E2E specs for agent creation, leaderboard, and replay viewing would improve confidence."*

---

### 8.2 Components (`components/README.md`)

#### ARCH-1: No shared UI primitive layer — Medium

> *"There's no `ui/button.tsx` or `ui/input.tsx`. Every component applies Tailwind classes directly. This works well at the current scale (21 components)... If the component count grows past ~35 or if a second contributor joins, extracting shared primitives (Button, Input, Card, Modal) would reduce duplication and enforce consistency."*

---

### 8.3 Lib (`lib/README.md`)

#### ARCH-2: In-memory rate limiting — Medium

> *"Vercel typically runs a single instance, and the rate limiter is 'best effort' rather than strict. For multi-instance deployments, this would need to be replaced with Redis/Upstash."*

This is a known deployment-time constraint. For a single-instance Vercel deployment, acceptable. For scale-out, a Redis-backed rate limiter is required.

---

#### ARCH-3: In-memory caching — Medium

> *"Both modules [leaderboard, onboarding] use module-scoped caches with TTLs... Cache invalidation is time-based only — no event-driven invalidation."*

If a leaderboard entry changes, users may see stale data for up to 5 minutes. For the current traffic level, this is acceptable. For high-traffic scenarios, consider cache invalidation on bout completion or vote casting.

---

### 8.4 Database (`db/README.md`)

#### ARCH-4: No FK constraints — Medium

> *"The schema defines no FK constraints in Drizzle. Referential integrity is enforced at the application layer... orphaned rows are possible if application code has bugs."*

Adding FK constraints would improve data integrity at the cost of stricter insert ordering and cascade-deletion surprises. This is a deliberate trade-off worth revisiting after launch.

---

#### ARCH-5: Clerk IDs as user PK — Low

> *"A migration to a different auth provider would require a PK migration."*

Acceptable for the current Clerk integration. Worth noting for long-term platform decisions.

---

### 8.5 App (`app/README.md`)

The `app/README.md` identifies two trade-offs that align with existing findings:
- Single server actions file (aligns with BP-3)
- No route groups (acceptable at current scale)

No new findings beyond what's already documented.

---

### 8.6 API (`app/api/README.md`)

#### DOC-2: Bout lifecycle diagram shows non-existent `bout-complete` event — Medium

**`app/api/README.md:53`:**

The streaming protocol diagram shows `bout-complete` as a client-side event, but the actual code emits `data-share-line` as the final data event. The `bout-complete` event does not exist in the codebase.

**Fix:** Replace `bout-complete` with `data-share-line` in the diagram.

---

## 9. Documentation Consistency Findings

Cross-referencing all documentation files against the codebase reveals several inconsistencies that persist after the docs sync (PR #82).

#### DOC-1: `pitctl/README.md` uses wrong tier names — High

**`pitctl/README.md:66,69,72`:**

```
pitctl users --tier pro --limit 20
pitctl --yes users set-tier <userId> pro
Tiers: `free`, `pro`, `team`.
```

The actual tier enum in `db/schema.ts:53` is `['free', 'pass', 'lab']`. The Go validation in `pitctl/cmd/users.go:278` enforces `free`, `pass`, `lab`. Using `pro` or `team` in CLI commands will produce a validation error.

**Fix:** Replace `pro` with `pass` and `team` with `lab` in all three locations.

---

#### DOC-3: Stale test counts in historical docs — Medium

| File | Claims | Actual |
|------|--------|--------|
| `docs/press-release-strategy.md:101,170` | 66 tests | 425 tests |
| `docs/hardening-changes-2026-02-10.md:210` | 87 tests | 425 tests |

These are historical documents but could mislead contributors. Add a note at the top: *"Test counts in this document reflect the state at time of writing."*

---

#### DOC-4: MVP checklist items unchecked despite being implemented — Medium

**`docs/mvp-checklist.md:8-94`:**

Features including share URLs, voting, landing page, research page, contact form, and leaderboard are all live in production but remain unchecked `[ ]` in the checklist.

**Fix:** Mark implemented items as `[x]` or add a "Superseded by ROADMAP.md" header.

---

#### DOC-5: EAS signer wallet setup still pending — Low

**`docs/agent-dna-attestations.md:78-84`:**

> *"We need a dedicated signer wallet before EAS can go live in prod."*

This blocks production attestation functionality. The `EAS_ENABLED` flag correctly gates this, but the pending status should be tracked in ROADMAP.md.

---

## 10. Deferred Findings from Prior Reviews

The adversarial code review (`docs/code-review-2026-02-10.md`) and hardening doc (`docs/hardening-changes-2026-02-10.md`) identified several findings that were intentionally deferred. These remain open and are listed here for completeness with updated assessments.

| ID | Finding | Original Severity | Current Assessment |
|----|---------|-------------------|-------------------|
| DEFER-1 | Transcript unbounded growth — context window accumulates linearly with turns, no sliding window or summarization | Medium | Still relevant. 12-turn bouts with `long` response length can approach context limits. Implement a `maxContextTokens` budget or sliding window. |
| DEFER-2 | No race condition / concurrent request tests | Low | Still relevant. The atomic credit preauthorization is critical path code with no concurrency tests. Add at minimum a test that verifies two concurrent `preauthorizeCredits` calls don't overdraw. |
| CR-11 | Global DB client nullable at build time | Medium | Mitigated by `requireDb()` throwing eagerly. Low risk. |
| CR-14 | Error swallowing masks failures in external service calls | Medium | Partially addressed by observability PRs (#84-86) adding structured logging and Sentry. Remaining: `catch {}` blocks in components that discard errors silently. |
| CR-17 | Magic numbers — hardcoded rate limits, timeouts, lengths | Low | Partially addressed by PR #81 (extracted `DEFAULT_AGENT_COLOR`, `DEFAULT_ARENA_MAX_TURNS`). Remaining: rate limit windows, bout rate caps, arena max agents. See OC-3 and EXT-7. |
| HC-2 | BYOK key security — consider encrypted HTTP-only cookies | High | Partially addressed: BYOK now uses HTTP-only cookies (PR #78). Encryption layer still pending for defense-in-depth. |
| HC-5 | Context budget — implement sliding window or summarization for long transcripts | Medium | Identical to DEFER-1. |

---

## Updated Summary Statistics

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| TypeScript Standards | 0 | 0 | 7 | 1 | 8 |
| SOLID Principles | 2 | 1 | 5 | 0 | 8 |
| Extensibility | 1 | 0 | 3 | 5 | 9 |
| Best Practices | 0 | 1 | 5 | 3 | 9 |
| Testing | 0 | 3 | 2 | 0 | 5 |
| Duplication | 0 | 7 | 0 | 0 | 7 |
| Architecture | 0 | 0 | 5 | 1 | 6 |
| Accessibility | 0 | 0 | 3 | 0 | 3 |
| Documentation | 0 | 1 | 3 | 1 | 5 |
| Deferred | 0 | 0 | 0 | 3 | 3 |
| **Total** | **3** | **13** | **33** | **14** | **63** |

**Documented strengths:** 6 (zero `any`, zero `@ts-ignore`, `satisfies` usage, type guards, clean dependency tree, props-driven components).
