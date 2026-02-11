[← Root](../README.md)

# lib/

34 shared utility modules organized in a flat directory. Types are co-located with their modules rather than in a separate types file. The modules cluster into 8 functional domains.

## Module Inventory

### AI & Model Configuration

| File | Purpose |
|------|---------|
| `ai.ts` | Anthropic provider setup. Exports `FREE_MODEL_ID`, `PREMIUM_MODEL_OPTIONS`, `getModel()`. Three tiers: free (Haiku), premium (Sonnet/Opus), BYOK (user key). |
| `presets.ts` | Loads 11 free + 11 premium presets from JSON, normalizes snake_case to camelCase. Exports `ALL_PRESETS`, `PRESET_BY_ID` (O(1) Map), `getPresetById()`. Core `Preset` and `Agent` types. |
| `response-lengths.ts` | Three length options (short/standard/long) with `maxOutputTokens` caps. |
| `response-formats.ts` | Four format options (plain/spaced/markdown/json) with system prompt instructions. |

### Agent System

| File | Purpose |
|------|---------|
| `agent-registry.ts` | Unified identity resolution. Maps preset agents (composite IDs like `preset:roast-battle:judge`) and custom (DB) agents. DB-first, preset-fallback via `getAgentSnapshots()`. |
| `agent-prompts.ts` | Structured prompt composition from typed fields (archetype, tone, quirks, etc.) via `buildStructuredPrompt()`. |
| `agent-dna.ts` | Deterministic identity: SHA-256 hashing of RFC 8785 canonicalized manifests and prompts. `hashAgentPrompt()`, `hashAgentManifest()`, `buildAgentManifest()`. |
| `agent-detail.ts` | Agent detail fetching with lineage resolution (up to 4 generations). |
| `agent-links.ts` | URL encoding for agent IDs containing colons: `encodeAgentId()`, `decodeAgentId()`. |

### Credit Economy

| File | Purpose |
|------|---------|
| `credits.ts` | Full economy: token-to-GBP-to-microcredit conversion, per-model pricing, cost estimation, atomic preauthorization (`WHERE balance >= amount`), settlement with capped deductions. |
| `credit-catalog.ts` | Stripe credit pack definitions: Starter (3 GBP), Plus (8 GBP) with volume bonuses. |
| `intro-pool.ts` | Community intro credit pool: shared draining pool for signup/referral bonuses. Atomic SQL claims. |
| `free-bout-pool.ts` | Global daily free bout pool: hard-caps platform API spend on free users. |

### User Management

| File | Purpose |
|------|---------|
| `users.ts` | Clerk-to-DB bridge: syncs profiles (lazy 24h refresh), `getAuthUserId()`, `requireUserId()`, `ensureUserRecord()`, `maskEmail()`. |
| `tier.ts` | Subscription tiers (free/pass/lab): bout limits, model access, agent slots. `canRunBout()`, `canAccessModel()`, `getAvailableModels()`. |
| `admin.ts` | Admin authorization via `ADMIN_USER_IDS` env var. |
| `onboarding.ts` | New-user session init: user record, referral, credit account, bonuses. In-memory cache (1h TTL). |
| `referrals.ts` | Referral system: 8-char nanoid codes, bonus credits from intro pool. |

### Engagement & Social

| File | Purpose |
|------|---------|
| `reactions.ts` | Per-turn reaction counts with SQL GROUP BY aggregation. |
| `winner-votes.ts` | Winner voting: one vote per user per bout, vote tallies. |
| `leaderboard.ts` | Full aggregation across 3 time ranges (all/week/day) for agents and players. In-memory cache (5min TTL). |

### Blockchain & Attestation

| File | Purpose |
|------|---------|
| `eas.ts` | Ethereum Attestation Service on Base L2: submits tamper-proof agent identity attestations. |
| `attestation-links.ts` | Builds easscan.org URLs from attestation UIDs. |

### Infrastructure & Observability

| File | Purpose |
|------|---------|
| `stripe.ts` | Stripe client initialization (GBP). |
| `rate-limit.ts` | In-memory sliding-window rate limiter with automatic cleanup. |
| `hash.ts` | Universal SHA-256 (SubtleCrypto for browser, Node `crypto` for server), `0x`-prefixed hex. |
| `logger.ts` | Structured logging: JSON in production, human-readable in dev. Sanitizes API key patterns. |
| `api-logging.ts` | API route wrapper: automatic request/response logging with timing. |
| `request-context.ts` | Extracts `x-request-id` from headers for log correlation. |
| `cn.ts` | `clsx` + `tailwind-merge` class composition. |
| `form-utils.ts` | `getFormString()` for safe FormData extraction. |

### Client-Side

| File | Purpose |
|------|---------|
| `use-bout.ts` | SSE streaming hook. Connects to `/api/run-bout`, parses JSON event stream, implements "pending message" state machine (2-4s random thinking delay). Returns `{ messages, status, activeAgentId, shareLine }`. |
| `analytics.ts` | Typed `trackEvent()` for PostHog. Silent no-op when unconfigured. |

### Feature Config

| File | Purpose |
|------|---------|
| `ask-the-pit-config.ts` | "Ask the Pit" AI assistant config: feature flag, doc sources, model, max tokens. |

## Internal Dependency Graph

Key dependency chains (→ = imports from):

```
leaderboard.ts
  → presets.ts
  → agent-registry.ts
      → presets.ts
      → agent-dna.ts → hash.ts
      → response-lengths.ts
      → response-formats.ts
  → users.ts

onboarding.ts
  → credits.ts
  → intro-pool.ts → credits.ts
  → referrals.ts → intro-pool.ts → credits.ts
  → users.ts

tier.ts → admin.ts
credits.ts → db (Drizzle)
eas.ts → agent-dna.ts → hash.ts
api-logging.ts → logger.ts, request-context.ts
```

**All DB-touching modules** import from `@/db` and `@/db/schema` rather than constructing queries directly. The `requireDb()` guard ensures no operations run without a database connection.

## Custom Hook: `useBout`

The only custom React hook in the codebase. It manages the SSE streaming lifecycle:

1. Client calls `POST /api/run-bout` via `fetch`
2. Response is parsed via `parseJsonEventStream`
3. "Pending message" state machine buffers tokens for 2-4s (randomized) before making visible — creates a natural "thinking..." UX
4. Handles three event types: `data-turn`, `text-delta`, `data-share-line`
5. Returns `{ messages, status, activeAgentId, activeMessageId, thinkingAgentId, shareLine }`

Used exclusively by the `Arena` component.

## Design Decisions & Trade-offs

- **In-memory rate limiting** — `rate-limit.ts` uses process-scoped sliding windows. This is a deliberate simplicity choice: Vercel typically runs a single instance, and the rate limiter is "best effort" rather than strict. For multi-instance deployments, this would need to be replaced with Redis/Upstash. The automatic cleanup prevents memory leaks.
- **In-memory caching (leaderboard, onboarding)** — Both modules use module-scoped caches with TTLs (5min for leaderboard, 1h for onboarding). Same single-instance assumption. Cache invalidation is time-based only — no event-driven invalidation.
- **Type co-location** — Types are exported from their owning module (`Preset` from `presets.ts`, `BoutMessage` from `use-bout.ts`, etc.) rather than centralized in a `types/` directory. This keeps types close to their implementation and avoids circular imports. The tradeoff is that consuming modules must know which module exports which type.
- **Flat directory** — 34 files in one folder. The naming convention creates implicit groupings (`agent-*`, `credit-*`, `response-*`). At the current scale this is navigable, but a subdirectory split by domain would improve discoverability if the module count grows past ~45.

---

[← Root](../README.md) · [App](../app/README.md) · [Components](../components/README.md) · [DB](../db/README.md)
