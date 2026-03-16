# Change Propagation Analysis - Phase 1: Structural Inventory

Date: 2026-03-16
Author: Weaver (change propagation review)
Status: Complete

---

## 1.1 Module Boundary Map

### Top-Level Modules

The system has 7 primary modules at the filesystem level:

| Module | Owns | Classification |
|--------|------|----------------|
| `app/` | Route handlers, server pages, server actions, middleware | Next.js App Router (entry points) |
| `lib/` | Business logic, data access, API utilities, client hooks | Shared library (76 files, the centre of gravity) |
| `db/` | Schema definition, database connection | Data layer (3 files) |
| `components/` | UI rendering, client interaction | Presentation (37 files) |
| `shared/` | Go CLI tool shared utilities | Cross-tool Go module (separate runtime) |
| `middleware.ts` | Request preprocessing, cookies, analytics, A/B testing | Edge middleware |
| `presets/` | Arena format JSON definitions | Static configuration data |

### Dependency Direction

```
middleware.ts --> lib/ip, lib/copy-edge
     |
     v
app/ (pages, API routes, actions.ts)
     |
     +--> lib/ (76 files - business logic, data access, hooks)
     |      |
     |      +--> db/ (schema, connection)
     |      |
     |      +--> External services (Anthropic, Stripe, EAS, LangSmith, PostHog, Resend)
     |
     +--> components/ (37 files - UI)
            |
            +--> lib/ (hooks, utilities, types)
```

The Go `shared/` module is architecturally isolated. It connects to the same Postgres database via `lib/pq` but shares no TypeScript code. The only shared artefact is the database schema and the `.keel-state` file.

### Coupling Classification

| Boundary | Coupling Type | Evidence |
|----------|--------------|---------|
| `app/` -> `lib/` | **Tight coupling** | Direct imports of 40+ lib files. No abstraction layer. Pages import specific functions by name. |
| `app/` -> `db/` | **Tight coupling** | 6 page files import `requireDb` and `db/schema` directly, bypassing lib/. |
| `app/` -> `components/` | **Interface coupling** | Components receive data as props. Clean boundary. |
| `lib/` -> `db/` | **Tight coupling** | 17 lib files import `requireDb` and raw schema tables. No repository pattern. |
| `components/` -> `lib/` | **Tight coupling** | 30+ components import specific lib functions. Hooks import types from data-access files. |
| `middleware.ts` -> `lib/` | **Interface coupling** | Imports only 2 files (ip.ts, copy-edge.ts). Clean, narrow dependency. |
| `shared/` (Go) -> DB | **Decoupled** | Separate runtime, separate connection pool. Schema knowledge duplicated implicitly. |

### Circular Dependencies

**None detected** in the lib/ dependency graph. The graph is a DAG. The closest risk is `agent-mapper.ts` <-> `agent-registry.ts`, but the mapper only imports a type (erased at compile time).

### Key Structural Observations

**Central node:** `bout-engine.ts` has the highest fan-out in the system (22 internal lib/ imports, 1274 lines). It is the orchestration hub for the core product action.

**High fan-in nodes** (most depended-upon):
1. `logger.ts` - 13 dependents
2. `presets.ts` - 9 dependents
3. `models.ts` - 7 dependents
4. `errors.ts` - 5 dependents
5. `credits.ts` - 5 dependents

**Leaf nodes** (no internal dependencies, pure utilities): 28 files including `hash.ts`, `ip.ts`, `validation.ts`, `xml-prompt.ts`, `domain-ids.ts`, all eval/ files.

---

## 1.2 State Inventory

### Primary State: PostgreSQL (Neon Serverless)

**Connection:** `@neondatabase/serverless` Pool (WebSocket-based). Single connection string via `DATABASE_URL`. Drizzle ORM for type-safe queries.

**20 tables, 4 enums.** The database is the single source of truth for all server-side domains.

#### Core Domain Tables

| Table | Purpose | Writers | Readers |
|-------|---------|---------|---------|
| `bouts` | AI debate records (transcript, status, lineup) | `bout-engine.ts`, `app/actions.ts` | `bout/[id]/page.tsx`, `b/[id]/page.tsx`, `recent-bouts.ts`, `leaderboard.ts`, `reactions.ts`, `winner-votes.ts`, `og-bout-image.tsx`, `sitemap.ts`, `research-exports.ts` |
| `agents` | Agent definitions (prompt, DNA hash, attestation) | `app/api/agents/route.ts`, `agent-registry.ts`, `app/api/admin/seed-agents/route.ts`, `app/actions.ts` (archive) | `agent-detail.ts`, `agent-registry.ts`, `leaderboard.ts`, `remix-events.ts` |
| `users` | User identity (Clerk sync, tier, Stripe ID) | `users.ts` (ensureUserRecord), `tier.ts`, `credits/webhook/route.ts`, `onboarding.ts` | `leaderboard.ts`, `feature-requests/route.ts`, `users.ts`, `tier.ts` |
| `credits` | Per-user credit balance (micro-credits) | `credits.ts` (ensureCreditAccount, applyCreditDelta, preauthorize, settle) | `credits.ts` (getCreditBalanceMicro) |
| `credit_transactions` | Immutable ledger of all credit movements | `credits.ts`, `credits/webhook/route.ts`, `intro-pool.ts`, `remix-events.ts` | `credits.ts` (getCreditTransactions), `onboarding.ts` (dedup check), `research-exports.ts` |

#### Supporting Domain Tables

| Table | Purpose | Writers | Readers |
|-------|---------|---------|---------|
| `reactions` | Per-turn reactions (heart/fire) | `api/reactions/route.ts` | `reactions.ts`, `og-bout-image.tsx` |
| `winner_votes` | One vote per user per bout | `api/winner-vote/route.ts` | `winner-votes.ts` |
| `short_links` | Shareable URL slugs | `short-links.ts` | `short-links.ts`, `s/[slug]/route.ts` |
| `short_link_clicks` | Click analytics | `short-links.ts` | (none in app - analytics only) |
| `page_views` | Server-side analytics | `api/pv/route.ts` | (none in app - analytics only) |
| `intro_pool` | Global intro credit pool (half-life decay) | `intro-pool.ts` | `intro-pool.ts` |
| `referrals` | Referral tracking | `referrals.ts` | `referrals.ts` |
| `remix_events` | Agent clone lineage and reward payouts | `remix-events.ts` | `remix-events.ts` |
| `newsletter_signups` | Email list | `api/newsletter/route.ts` | (none) |
| `contact_submissions` | Contact form entries | `api/contact/route.ts` | (none) |
| `feature_requests` | User feature requests | `api/feature-requests/route.ts` | `api/feature-requests/route.ts` |
| `feature_request_votes` | Feature request votes | `api/feature-requests/vote/route.ts` | `api/feature-requests/route.ts` |
| `paper_submissions` | ArXiv paper submissions | `api/paper-submissions/route.ts` | (none) |
| `research_exports` | Snapshot payloads for download | `research-exports.ts` | `research-exports.ts` |
| `free_bout_pool` | Daily rate limit pool (legacy) | (unused - replaced by intro pool) | (unused) |
| `agent_flags` | User flagging of agents | (no writer found in current code) | (no reader found in current code) |

**State duplication finding:** `free_bout_pool` and `agent_flags` tables exist in schema but have no active readers or writers in the codebase. Dead tables.

### In-Memory Caches (Server-Side, Per-Instance)

No Redis, no distributed cache. All server caches are per-serverless-instance. DB constraints are the authoritative enforcement layer.

| Cache | Location | TTL | Eviction |
|-------|----------|-----|----------|
| Leaderboard data | `lib/leaderboard.ts` | 5 min | Time-based |
| Onboarding init guard | `lib/onboarding.ts` | 1 hr | Size > 1000 triggers cleanup |
| Rate limit windows | `lib/rate-limit.ts` | Configurable per limiter | Cleanup every 5 min |
| Preset lookup map | `lib/presets.ts` | Infinite (module load) | Never |
| Copy variant cache | `lib/copy.ts` | Infinite (module load) | Never |

### Client-Side State

| Mechanism | Count | Pattern |
|-----------|-------|---------|
| `useState` hooks | 30+ components | Local, ephemeral, resets on navigation |
| React Context | 2 (CopyContext, PostHogReadyContext) | Read-only after server hydration |
| `useSyncExternalStore` | 2 (cookie consent, Vercel analytics) | Cookie-backed persistence |
| Optimistic updates | 3 (reactions, voting, feature request votes) | Client-side, reconciled with server response |

### Cookies

| Cookie | Type | Set By | Read By | Consent-Gated |
|--------|------|--------|---------|---------------|
| `pit_consent` | First-party | Client (cookie-consent.tsx) | Middleware, posthog-provider, vercel-analytics | No (essential) |
| `pit_ref` | First-party | Middleware | Root layout (onboarding) | No (essential) |
| `pit_utm` | Analytics | Middleware | Root layout (onboarding) | Yes |
| `pit_sid` | Analytics | Middleware | api/pv/route.ts | Yes |
| `pit_visits` | Analytics | Middleware | Middleware | Yes |
| `pit_last_visit` | Analytics | Middleware | Middleware | Yes |
| `pit_variant` | A/B test | Middleware | copy.ts, middleware | No (functional) |
| `pit_byok` | HTTP-only | api/byok-stash/route.ts | bout-engine.ts | No (functional) |
| Clerk cookies | Auth | Clerk SDK | Clerk SDK | No (essential) |

### Environment Variables

**67+ environment variables** control configuration. Validated at startup by `lib/env.ts` (Zod schema). Categories:

- Required (4): DATABASE_URL, ANTHROPIC_API_KEY, Clerk keys
- Model config (5): Model IDs for free/premium/BYOK tiers
- Feature flags (7): PREMIUM_ENABLED, CREDITS_ENABLED, BYOK_ENABLED, SUBSCRIPTIONS_ENABLED, EAS_ENABLED, ASK_THE_PIT_ENABLED, DEMO_MODE_ENABLED
- Credit economy (10+): Pricing, margins, grants, pool config
- External service keys (15+): Stripe, EAS, Resend, PostHog, Sentry, LangSmith
- URLs (3): APP_URL, SITE_URL, EAS_SCAN_BASE

**Finding:** 24 lib/ files read `process.env` directly at module scope. `env.ts` centralizes validation for most, but many files also read directly for feature flags and config. The env var surface is wide but there is a validation backstop.

### Cross-Runtime State

| Artefact | Format | Producers | Consumers |
|----------|--------|-----------|-----------|
| `.keel-state` | YAML | pitkeel, scripts/gate.sh | scripts/hud.py, prepare-commit-msg, pitkeel |
| PostgreSQL | Relational | TypeScript app (Drizzle) | TypeScript app (Drizzle), Go CLIs (lib/pq) |

The Go CLI tools and the TypeScript app share the database but not the ORM or schema types. Schema changes in `db/schema.ts` must be manually propagated to Go code.

---

## 1.3 API Surface Catalogue

### API Endpoints (20 routes)

| Endpoint | Method | Auth | Rate Limit | DB Access | External Calls |
|----------|--------|------|------------|-----------|----------------|
| `/api/health` | GET | No | No | SELECT 1 (ping) | None |
| `/api/run-bout` | POST | Optional | Yes (bout-engine) | Heavy (create, update, credit ops) | Anthropic API (LLM), LangSmith, PostHog |
| `/api/v1/bout` | POST | Required (Lab) | Yes | Heavy (same as run-bout) | Anthropic API, LangSmith, PostHog |
| `/api/agents` | POST | Required | 10/hr | INSERT agents | EAS attestation (blockchain) |
| `/api/ask-the-pit` | POST | No | 5/min | None | Anthropic API (LLM) |
| `/api/byok-stash` | POST | Required (subscriber) | Yes | None | None (sets cookie) |
| `/api/contact` | POST | No | 5/hr | INSERT contact_submissions | Resend (email) |
| `/api/credits/webhook` | POST | Stripe signature | No | Heavy (6 event types, credit ops, tier updates) | None (inbound webhook) |
| `/api/feature-requests` | GET/POST | Required (POST) | 10/hr (POST) | SELECT/INSERT feature_requests | None |
| `/api/feature-requests/vote` | POST | Required | 30/min | SELECT/INSERT/DELETE votes | None |
| `/api/newsletter` | POST | No | 5/hr | INSERT newsletter_signups | None |
| `/api/openapi` | GET | No | 10/min | None | None |
| `/api/paper-submissions` | POST | Required | 5/hr | INSERT paper_submissions | arXiv API |
| `/api/pv` | POST | Internal secret | No | INSERT page_views | PostHog |
| `/api/reactions` | POST | No (fingerprint) | 30/min | SELECT/INSERT/DELETE reactions | None |
| `/api/research/export` | GET | No | 5/hr | SELECT research_exports | None |
| `/api/short-links` | POST | No | 30/min | SELECT/INSERT short_links | None |
| `/api/winner-vote` | POST | Required | 30/min | SELECT/INSERT winner_votes | None |
| `/api/admin/seed-agents` | POST | Admin token | No | Transaction (SELECT/INSERT agents) | EAS attestation |
| `/api/admin/research-export` | POST | Admin | No | Heavy (batch aggregation) | None |

### Server Actions (8 functions in app/actions.ts)

| Action | Auth | DB Access | External Calls | Side Effect |
|--------|------|-----------|----------------|-------------|
| `createBout` | Optional | INSERT bouts | None | redirect to /bout/[id] |
| `createArenaBout` | Optional | INSERT bouts (with lineup JSONB) | None | redirect to /bout/[id] |
| `createCreditCheckout` | Required | None | Stripe (create checkout session) | redirect to Stripe |
| `createSubscriptionCheckout` | Required | SELECT/UPDATE users | Stripe (create checkout session) | redirect to Stripe |
| `createBillingPortal` | Required | SELECT/UPDATE users | Stripe (create portal session) | redirect to Stripe |
| `grantTestCredits` | Admin | applyCreditDelta (delegated) | None | None |
| `archiveAgent` | Admin | UPDATE agents | None | None |
| `restoreAgent` | Admin | UPDATE agents | None | None |

### Boundary Leakage Assessment

**Leaky boundaries (internal details visible across modules):**

1. **db/schema types exported everywhere.** `TranscriptEntry`, `ArenaAgent`, `boutStatus` enum values, and raw table references (`bouts`, `agents`, `credits`, etc.) are imported directly by 17 lib files and 6 page files. The schema IS the interface. Any schema change propagates to every consumer.

2. **`lib/bout-engine.ts` exports internal types.** `ByokKeyData`, `BoutContext`, `TurnEvent` are implementation details consumed only by the 2 API routes that call it. Exposure is narrow but the types encode internal state machine details.

3. **`lib/credits.ts` exports 20+ symbols.** Constants, conversion functions, DB operations, and feature flags are all in one file. There is no separation between "credit accounting" (DB writes) and "credit display" (formatting for UI). Components import `estimateBoutCostGbp` alongside `CREDITS_ENABLED`, mixing concerns.

4. **`lib/presets.ts` is a de facto shared type registry.** The `Preset` and `Agent` types defined here are used by 9 other lib files, most components, and multiple page files. This is the closest thing to a shared domain type - but it's defined in a file that also contains JSON preset data.

**Modules with no encapsulation boundary (effectively "everything is public"):**

- `lib/` as a whole. Every file exports everything. There is no `index.ts` barrel file controlling what is exposed. Any file can import any other file directly. The module boundary is the filesystem, not an interface.

**Well-encapsulated boundaries:**

- `middleware.ts` - imports only 2 lib files, has a clear single responsibility
- `db/` - clean 3-file module. Connection + schema + config. Nothing leaks except the schema types (which are the intended interface)
- `shared/` (Go) - fully isolated runtime, shares only the database
- `components/ui/` - 2 pure presentational components with no external dependencies beyond `cn`
- `lib/eval/` - self-contained evaluation pipeline with clean internal dependency (only imports `refusal-detection.ts` and `xml-prompt.ts`)

---

## Summary of Phase 1 Findings

### Architecture Shape

This is a **Next.js monolith** with a flat library structure. The `lib/` directory is the centre of gravity - it contains business logic, data access, API utilities, client hooks, configuration, and external service integrations in a single flat namespace. There is no layered architecture (no repository pattern, no service layer, no domain model separation).

### Dominant Pattern

**Request-response with direct database access.** Every user action follows the same path: UI component -> (server action or API route) -> lib function -> Drizzle query -> Postgres. There is no event system, no message queue, no pub/sub. The only asynchronous propagation mechanism is the Stripe webhook (inbound).

### Key Structural Risks

1. **Schema changes propagate everywhere.** 17 lib files + 6 page files import raw schema types. A column rename touches dozens of files.

2. **`bout-engine.ts` is a god module.** 22 internal imports, 1274 lines, orchestrates auth, tier, credits, presets, lineup, AI calls, transcript, share lines, analytics, and experiment hooks. Any change to the bout flow risks touching this file.

3. **No data access abstraction.** Drizzle queries are inlined in lib functions. The same table is queried by multiple files with no shared query abstraction. If a query needs optimization, each call site must be found and updated independently.

4. **In-memory caches are per-instance with no invalidation signal.** Leaderboard cache (5 min) and onboarding cache (1 hr) will serve stale data after a deploy creates new instances. Acceptable at current scale; becomes a correctness problem at higher scale or with multiple regions.

5. **2 dead tables** (`free_bout_pool`, `agent_flags`) exist in schema with no active code paths. Schema carries historical weight.
