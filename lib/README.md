[← Root](../README.md)

# lib/

66 shared utility modules organized in a flat directory. Types are co-located with their modules rather than in a separate types file. The modules cluster into 11 functional domains.

## Module Inventory

### AI & Model Configuration

| File | Purpose |
|------|---------|
| `ai.ts` | Anthropic provider setup. Exports `FREE_MODEL_ID`, `PREMIUM_MODEL_OPTIONS`, `getModel()`. Three tiers: free (Haiku), premium (Sonnet/Opus), BYOK (user key). |
| `xml-prompt.ts` | XML prompt builder for all LLM-facing prompts. Safety boundaries (`<safety>`), system/user/share message builders, `xmlEscape()`, legacy `wrapPersona()` for backwards compatibility. ~300 lines. |
| `presets.ts` | Loads 11 free + 11 premium presets from JSON, normalizes snake_case to camelCase. Exports `ALL_PRESETS`, `PRESET_BY_ID` (O(1) Map), `getPresetById()`. Core `Preset` and `Agent` types. |
| `response-lengths.ts` | Three length options (short/standard/long) with `maxOutputTokens` caps. |
| `response-formats.ts` | Four format options (plain/spaced/markdown/json) with system prompt instructions. |

### Bout Execution

| File | Purpose |
|------|---------|
| `bout-engine.ts` | Core bout execution engine (~640 lines). Two phases: `validateBoutRequest()` (parse, auth, tier, credits, idempotency) and `executeBout()` (turn loop, transcript, share line, DB persist, credit settlement). Emits `TurnEvent` union for SSE. |
| `bout-lineup.ts` | Arena lineup reconstruction from bout JSONB data. `buildArenaPresetFromLineup()` for replay pages and bout engine. |
| `recent-bouts.ts` | Paginated listing of recently completed bouts for the `/recent` public feed. LEFT JOIN aggregation for reaction counts. |
| `refusal-detection.ts` | Lightweight refusal detection for agent bout responses. Normalizes Unicode quotes and matches against scoped marker phrases. Logs refusal events for data collection. |
| `seed-agents.ts` | 12 high-DNA standalone agent definitions for arena selection. Exports `SEED_AGENTS` array and `buildSeedAgentPrompt()`. |

### Agent System

| File | Purpose |
|------|---------|
| `agent-registry.ts` | Unified identity resolution. Maps preset agents (composite IDs like `preset:roast-battle:judge`) and custom (DB) agents. DB-first, preset-fallback via `getAgentSnapshots()`. |
| `agent-prompts.ts` | Structured prompt composition from typed fields (archetype, tone, quirks, etc.) via `buildStructuredPrompt()`. |
| `agent-dna.ts` | Deterministic identity: SHA-256 hashing of RFC 8785 canonicalized manifests and prompts. `hashAgentPrompt()`, `hashAgentManifest()`, `buildAgentManifest()`. |
| `agent-detail.ts` | Agent detail fetching with lineage resolution (up to 4 generations). |
| `agent-lineage.ts` | Shared lineage resolution: walks parent chains using pre-built lookup maps, produces `{ id, name }` entries for UI display. |
| `agent-mapper.ts` | Agent row-to-snapshot mapping: single source of truth for converting Drizzle agent rows to `AgentSnapshot` objects. |
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
| `admin.ts` | Admin authorization via `ADMIN_USER_IDS` env var. Checks user identity for server actions. |
| `admin-auth.ts` | Admin API route auth via timing-safe token comparison against `ADMIN_SEED_TOKEN` env var. Used by `/api/admin/*` endpoints. |
| `onboarding.ts` | New-user session init: user record, referral, credit account, bonuses. In-memory cache (1h TTL). |
| `referrals.ts` | Referral system: 8-char nanoid codes, bonus credits from intro pool. |

### Engagement & Social

| File | Purpose |
|------|---------|
| `reactions.ts` | Per-turn reaction counts with SQL GROUP BY aggregation. |
| `winner-votes.ts` | Winner voting: one vote per user per bout, vote tallies. |
| `leaderboard.ts` | Full aggregation across 3 time ranges (all/week/day) for agents and players. In-memory cache (5min TTL). |
| `short-links.ts` | Short link CRUD for shareable bout URLs: 8-char nanoid slugs, idempotent creation, resolution, click analytics. |
| `remix-events.ts` | Remix event recording and querying: tracks agent clones/remixes with lineage, outcomes, and optional credit reward payouts. |

### Research

| File | Purpose |
|------|---------|
| `research-anonymize.ts` | Anonymization utilities for research exports: replaces PII (user IDs) with salted SHA-256 hashes. |
| `research-exports.ts` | Research dataset export generation: aggregates completed bouts, reactions, votes, agents into anonymized JSON payloads. |
| `arxiv.ts` | arXiv URL parsing and metadata extraction: parses paper IDs from various URL formats, fetches title/authors/abstract from the arXiv Atom API. |

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
| `anomaly.ts` | Lightweight server-side anomaly detection: burst traffic, credential probing, error rate spikes. In-memory sliding windows, log-only. |
| `async-context.ts` | Request-scoped context via `AsyncLocalStorage`. Provides implicit access to request metadata (requestId, clientIp, userId) without manual parameter threading. |
| `env.ts` | Centralized environment variable validation using Zod. Fail-fast on missing required vars, sensible defaults for optional. Server-side only. |
| `ip.ts` | Canonical client IP resolution. Single source of truth using `x-vercel-forwarded-for` (Vercel) or rightmost `x-forwarded-for` (proxies). |
| `api-utils.ts` | Shared API route utilities: standardized JSON error responses (`errorResponse()`), `parseJsonBody()`, `API_ERRORS` constants. |
| `errors.ts` | Shared error utilities: `toErrorMessage()` for safe extraction from unknown catch values, `toError()` for wrapping. |
| `validation.ts` | Shared input validation: `UNSAFE_PATTERN` regex for URLs, script tags, event handlers, data URIs. |
| `openapi.ts` | OpenAPI 3.1 specification for The Pit's public API. Served from `/api/openapi` for Lab-tier subscribers. |
| `cn.ts` | `clsx` + `tailwind-merge` class composition. |
| `form-utils.ts` | `getFormString()` for safe FormData extraction. |

### Client-Side

| File | Purpose |
|------|---------|
| `use-bout.ts` | SSE streaming hook. Connects to `/api/run-bout`, parses JSON event stream, implements "pending message" state machine (2-4s random thinking delay). Returns `{ messages, status, activeAgentId, shareLine }`. |
| `use-bout-reactions.ts` | Client-side reaction hook. Optimistic toggle with server reconciliation. Reverts on non-OK responses (rate limits, errors). |
| `use-bout-sharing.ts` | Client-side sharing hook. Generates formatted share payloads per-message with cumulative transcripts, short links, and social platform URLs. |
| `use-bout-voting.ts` | Client-side winner voting hook. Manages optimistic vote state and submission. |
| `analytics.ts` | Typed `trackEvent()` for PostHog. Silent no-op when unconfigured. |
| `engagement.ts` | Client-side engagement tracking: scroll depth milestones, active time measurement, bout engagement depth. Fires events to PostHog via `trackEvent()`. |

### Feature Config

| File | Purpose |
|------|---------|
| `ask-the-pit-config.ts` | "Ask the Pit" AI assistant config: feature flag, doc sources, model, max tokens. |
| `brand.ts` | Brand constants: name, handle, hashtag, URL, and social channel links (X, Reddit, Discord, GitHub, LinkedIn) with feature flags. |
| `agent-display-name.ts` | Extracts human-readable display names from compound agent IDs (e.g. `darwin-charles` → `Charles Darwin`). |

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

## Custom Hooks

Four custom React hooks manage bout interactivity. `useBout` handles SSE streaming; the other three (`useBoutReactions`, `useBoutSharing`, `useBoutVoting`) were extracted from the `Arena` component to separate concerns.

### `useBout`

Manages the SSE streaming lifecycle:

1. Client calls `POST /api/run-bout` via `fetch`
2. Response is parsed via `parseJsonEventStream`
3. "Pending message" state machine buffers tokens for 2-4s (randomized) before making visible — creates a natural "thinking..." UX
4. Handles three event types: `data-turn`, `text-delta`, `data-share-line`
5. Returns `{ messages, status, activeAgentId, activeMessageId, thinkingAgentId, shareLine }`

Used exclusively by the `Arena` component.

### `useBoutReactions`

Manages heart/fire reactions with optimistic UI. Toggles via `POST /api/reactions`, reconciles server state, and reverts on non-OK responses (rate limits, errors).

### `useBoutSharing`

Generates formatted share payloads with cumulative transcripts, short link creation, and social platform URLs (`buildShareLinks`). Per-message share supports X/Twitter single-turn sharing.

### `useBoutVoting`

Manages winner vote state and submission. Optimistic updates with error rollback. One vote per user per bout.

## Design Decisions & Trade-offs

- **In-memory rate limiting** — `rate-limit.ts` uses process-scoped sliding windows. This is a deliberate simplicity choice: Vercel typically runs a single instance, and the rate limiter is "best effort" rather than strict. For multi-instance deployments, this would need to be replaced with Redis/Upstash. The automatic cleanup prevents memory leaks.
- **In-memory caching (leaderboard, onboarding)** — Both modules use module-scoped caches with TTLs (5min for leaderboard, 1h for onboarding). Same single-instance assumption. Cache invalidation is time-based only — no event-driven invalidation.
- **Type co-location** — Types are exported from their owning module (`Preset` from `presets.ts`, `BoutMessage` from `use-bout.ts`, etc.) rather than centralized in a `types/` directory. This keeps types close to their implementation and avoids circular imports. The tradeoff is that consuming modules must know which module exports which type.
- **Flat directory** — 66 files in one folder. The naming convention creates implicit groupings (`agent-*`, `credit-*`, `response-*`, `research-*`). At the current scale this is approaching the threshold where a subdirectory split by domain would improve discoverability.

---

[← Root](../README.md) · [App](../app/README.md) · [Components](../components/README.md) · [DB](../db/README.md)
