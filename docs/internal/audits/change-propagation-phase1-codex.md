# Change Propagation Analysis - Phase 1 (codex)

Version: 1.0
Date: 2026-03-16
Scope: Phase 1 structural inventory for The Pit

---

## 1.1 Module Boundary Map

### Module list and ownership

| Module | Owns | Exposes | Consumes | Coupling notes |
|---|---|---|---|---|
| `app/` | Next.js routes, layouts, server actions, API handlers | Route tree and API handlers | `lib/`, `components/`, `db/` | Interface coupling to `components/` and `lib/`. Tight coupling to `db/` via direct schema imports in routes and pages. |
| `components/` | Client UI components and UI primitives | React components for app routes | `lib/`, `db/` types, `components/ui/` | Interface coupling to `lib/`. Tight coupling where components import `@/db/schema` types. |
| `lib/` | Domain logic, APIs, hooks, analytics, config | Functions, hooks, schemas, utilities | `db/`, `presets/`, `copy/` | Tight coupling to `db/` via `requireDb()` and schema imports. Direct data dependency on `presets/` and `copy/`. |
| `db/` | Database client and schema | `db`, `requireDb`, schema exports | `drizzle-orm`, `@neondatabase/serverless` | Shared schema surface imported across app and lib. |
| `drizzle/` | Migrations and Drizzle metadata | SQL migrations, relations, schema re-export | `db/schema.ts` | Used by CLI tooling and migration flow, not by runtime code. |
| `presets/` | Preset JSON source of truth | JSON definitions for bout presets | Consumed by `lib/presets.ts` | Data-only module, imported directly by `lib/`. |
| `copy/` | A/B experiment config and variant copy | JSON config and copy variants | Consumed by `lib/copy.ts` and `lib/copy-edge.ts` | Data-only module, consumed by middleware and server components. |
| `middleware.ts` | Edge middleware for analytics and copy variant assignment | Request header mutation and cookie writes | `lib/copy-edge.ts`, `lib/ip.ts` | Tight coupling to copy experiment configuration. |
| `shared/` | Go shared library for CLIs | `config`, `db`, `format`, `license`, `theme`, `keelstate` packages | Standard library + Go deps | Library module used by all Go CLIs. |
| `pitctl/` | Go CLI for site administration | CLI commands and output | `shared/` and DB | Interface coupling to `shared/`. Direct DB access via `shared/db`. |
| `pitforge/` | Go CLI for agent tooling | CLI commands and output | `shared/`, `presets/`, Anthropic API | Interface coupling to `shared/`. Reads `presets/`. |
| `pitlab/` | Go CLI for research analysis | CLI commands and output | `shared/`, research export JSON | Interface coupling to `shared/`. |
| `pitnet/` | Go CLI for EAS provenance | CLI commands and output | `shared/`, EAS JSON RPC | Interface coupling to `shared/`. |
| `pitstorm/` | Go CLI for traffic simulation | CLI commands and output | `shared/`, Clerk APIs, HTTP target | Interface coupling to `shared/`. |
| `pitbench/` | Go CLI for cost and pricing | CLI commands and output | `shared/` | Interface coupling to `shared/`. |
| `pitkeel/` | Go CLI for operational signals | CLI commands and output | `shared/` | Interface coupling to `shared/`. |
| `pitlinear/` | Go CLI (no README) | CLI binary | `shared/` | Interface coupling to `shared/`. |
| `scripts/` | Automation scripts and hooks | CLI scripts, hooks, pipelines | Repo config and filesystem | Operational tooling, not runtime. |
| `bin/` | CLI utilities | Executable scripts | Repo config and filesystem | Operational tooling, not runtime. |
| `qa/` | QA runner and fixtures | QA execution framework | Tests, config, scripts | Operational tooling, not runtime. |
| `tests/` | Test suites | Unit, integration, API, e2e tests | App, lib, db | Verification only. |

### Dependency graph (module level)

Text graph derived from import usage:

```
app/ -> components/ -> lib/ -> db/
app/ -> lib/ -> db/
app/ -> db/
components/ -> db/ (type-only imports)
lib/ -> presets/
lib/ -> copy/
middleware.ts -> lib/copy-edge.ts -> copy/

Go CLIs (pitctl, pitforge, pitlab, pitnet, pitstorm, pitbench, pitkeel, pitlinear)
  -> shared/
```

Evidence:
- App and API routes import `@/lib/*` and `@/components/*` and `@/db` or `@/db/schema`.
- Components import `@/lib/*` and `@/db/schema` types.
- `lib/presets.ts` imports JSON from `presets/`.
- `lib/copy.ts` and `lib/copy-edge.ts` import JSON from `copy/`.
- Go module `go.work` and each `pit*/go.mod` include `shared` with a local replace.

### Coupling classification (boundary level)

| Boundary | Coupling | Evidence |
|---|---|---|
| `app/` -> `components/` | Interface coupling | `app/layout.tsx`, route pages import UI components.
| `app/` -> `lib/` | Interface coupling | Route handlers and server actions import lib utilities.
| `app/` -> `db/` | Tight coupling | Routes and pages import `@/db` and `@/db/schema` directly.
| `components/` -> `lib/` | Interface coupling | Components import hooks and copy utilities.
| `components/` -> `db/` | Tight coupling | `components/arena.tsx` imports `TranscriptEntry` from `@/db/schema`.
| `lib/` -> `db/` | Tight coupling | `lib/*` modules import `requireDb` and schema tables.
| `lib/` -> `presets/` | Data dependency | `lib/presets.ts` imports JSON.
| `lib/` -> `copy/` | Data dependency | `lib/copy.ts` and `lib/copy-edge.ts` import JSON.
| Go CLIs -> `shared/` | Interface coupling | Go modules import `github.com/rickhallett/thepit/shared`.

### Fan-in and fan-out notes

- Highest fan-in: `lib/` and `db/` are imported by app routes, API handlers, components, and tests.
- Highest fan-in in Go tooling: `shared/` is imported by all CLI modules.
- Highest fan-out: `app/` (routes call into `lib/`, `components/`, and `db/`), and `lib/` (domain modules call into `db/`, presets, copy, external APIs).

---

## 1.2 State Inventory

### Database state (Postgres via Drizzle)

Source: `db/schema.ts` and `db/index.ts`.

- Primary persistent store: Neon Postgres accessed via Drizzle.
- Tables include `bouts`, `users`, `credits`, `credit_transactions`, `intro_pool`, `referrals`, `reactions`, `winner_votes`, `newsletter_signups`, `contact_submissions`, `agents`, `free_bout_pool`, `agent_flags`, `paper_submissions`, `feature_requests`, `feature_request_votes`, `page_views`, `short_links`, `short_link_clicks`, `remix_events`, `research_exports`.
- Enums: `bout_status`, `agent_tier`, `user_tier`, `reaction_type`.
- JSONB fields: `bouts.transcript`, `bouts.agentLineup`, `credits.metadata`, `remix_events.metadata`, `research_exports.payload`.
- Source of truth: `db/` is the canonical schema and client; `drizzle/` holds migrations and snapshots.

### In-memory state (server)

- `lib/leaderboard.ts` caches leaderboard data in process memory with a 5 minute TTL.
- `lib/onboarding.ts` uses an in-memory `Map` to cache recent user session initialization for 1 hour.
- `lib/rate-limit.ts` keeps in-memory sliding window maps per rate limit name.

### Client-side state

- Component local state via React hooks in `components/` (no global store).
- `localStorage` used for cookie consent and pending analytics event flag in `components/cookie-consent.tsx` and `components/posthog-provider.tsx`.
- `sessionStorage` used to dismiss rate limit prompts per session in `components/rate-limit-upgrade-prompt.tsx`.

### Cookies and request-scoped state

- Consent cookie `pit_consent` set by `components/cookie-consent.tsx` and read by middleware and PostHog provider.
- Analytics cookies set in `middleware.ts`: `pit_sid`, `pit_visits`, `pit_last_visit`, `pit_utm` when consented.
- Referral cookie `pit_ref` set in `middleware.ts`.
- Copy variant cookie `pit_variant` set in `middleware.ts`.
- BYOK cookie `pit_byok` set in `app/api/byok-stash/route.ts` and consumed by `lib/bout-engine.ts`.

### Configuration and feature flags

- Server env validated in `lib/env.ts` using Zod. This defines feature flags and runtime config.
- Copy experiment config in `copy/experiment.json` and copy variants in `copy/variants/*.json`.
- Preset configuration in `presets/*.json` and preset packs in `presets/presets-*.json`.

### File-based operational state

- `pitstorm` reads and writes `accounts.json` for test account credentials.
- `shared/license` expects a license token at `~/.pit/license.jwt` or `$PITLAB_LICENSE`.

---

## 1.3 API Surface Catalogue

### HTTP API endpoints (Next.js app/api)

Source: `app/api/README.md` and route files.

| Method | Path | Auth | Rate limit | DB access | External calls |
|---|---|---|---|---|---|
| POST | `/api/run-bout` | Optional, required for credits | 5 per hour auth, 2 per hour anon | Yes | Anthropic or OpenRouter model APIs, PostHog |
| POST | `/api/v1/bout` | Required + Lab tier | 5 per hour shared | Yes | Model APIs |
| POST | `/api/agents` | Required | 10 per hour | Yes | EAS optional, model hashing |
| POST | `/api/reactions` | Optional | 30 per minute | Yes | None |
| POST | `/api/winner-vote` | Required | 30 per minute | Yes | None |
| POST | `/api/ask-the-pit` | Optional | 5 per minute | Yes | Model APIs |
| POST | `/api/byok-stash` | Required | 10 per minute | No | None |
| POST | `/api/newsletter` | Optional | 5 per hour | Yes | Email API (Resend) |
| POST | `/api/contact` | Optional | 5 per hour | Yes | Email API (Resend) |
| POST | `/api/short-links` | Optional | 30 per minute | Yes | None |
| GET | `/api/openapi` | Required + Lab tier | 10 per minute | No | None |
| GET, POST | `/api/feature-requests` | Optional for GET, required for POST | 10 per hour for POST | Yes | None |
| POST | `/api/feature-requests/vote` | Required | 30 per minute | Yes | None |
| POST | `/api/paper-submissions` | Required | 5 per hour | Yes | arXiv API via `lib/arxiv.ts` |
| GET | `/api/research/export` | Optional | 5 per hour | Yes | None |
| POST | `/api/credits/webhook` | Stripe signature | None | Yes | Stripe API |
| POST | `/api/pv` | `x-pv-secret` header | None | Yes | None |
| POST | `/api/admin/seed-agents` | `x-admin-token` header | None | Yes | Optional EAS |
| POST | `/api/admin/research-export` | `x-admin-token` header | None | Yes | None |
| GET | `/api/health` | None | None | No | None |

### Exposed server actions

Source: `app/actions.ts` and `app/README.md`.

- `createBout`, `createArenaBout`, `createCreditCheckout`, `createSubscriptionCheckout`, `createBillingPortal`, `grantTestCredits`, `archiveAgent`, `restoreAgent`.
- Actions import `@/db` and `@/db/schema` directly.

### Cross-cutting API patterns

- Logging: `lib/api-logging.ts` wraps route handlers for structured logging.
- Errors: `lib/api-utils.ts` standardizes JSON error responses and validation handling.
- Rate limiting: `lib/rate-limit.ts` for process-local sliding windows.
- Auth: Clerk auth in routes and actions, no global middleware auth.

### Leakage assessment

- Schema types imported directly into UI components and pages (tight coupling across UI and data layers).
- API routes import `@/db/schema` directly rather than going through a repository or data access layer.
- Public surface of `lib/` is wide and flat, many modules are directly imported by app and components.

---

## Phase 1 Output Notes

- Primary runtime boundaries are in the Next.js app and the Go CLI toolchain, with `db/` and `shared/` as their respective shared cores.
- Tight coupling exists where UI and API layers import `@/db/schema` directly, making schema changes propagate into UI and API code without a translation layer.
- Copy and preset JSON are direct data dependencies of `lib/`, so changes in those files propagate into runtime behavior without code changes.
