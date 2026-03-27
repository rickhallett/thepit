# Change Propagation Analysis - Phase 1: Structural Inventory

**Date:** 2026-03-16
**Codebase:** The Pit (thepit-v2)
**Methodology:** `docs/internal/audits/change-propagation-methodology.md`

---

## 1.1 Module Boundary Map

### Top-Level Modules

| Module | Owns | Exposes | Consumes |
|--------|------|---------|----------|
| `app/` | UI representation, Next.js routing, server actions, API handlers | Server actions (`app/actions.ts`), HTTP API endpoints (`app/api/*`), React Server Components | `lib/`, `components/`, `db/` |
| `components/` | Reusable React components, client-side interactive state | React components | `lib/` (types, utilities) |
| `lib/` | Domain logic (bouts, agents, billing, evaluation, leaderboard) | Domain functions (e.g., `bout-engine.ts`), Shared Types | `db/`, External APIs (Stripe, Anthropic, Posthog) |
| `db/` | Database connection, ORM schema | Drizzle DB instance, schema types/tables | `@neondatabase/serverless`, `drizzle-orm` |
| `Go Tooling` (`pitctl`, `pitbench`, etc) | Infrastructure management, CLI tools | CLI commands | `shared/` (Go shared codebase) |
| `midgets/` | Container orchestration, CI/CD specs | Dockerfiles | N/A |

### Dependency Graph

```text
app/
 ├──> components/
 ├──> lib/
 └──> db/

components/
 └──> lib/ (types/utils)

lib/
 └──> db/

Go Tooling
 └──> shared/
```

### Boundary Coupling Classification

- **`app/` -> `db/`:** **Tight coupling.** `app/actions.ts` directly imports raw DB schemas (e.g., `import { agents, bouts, users } from '@/db/schema'`) and ORM utilities (`eq`) to execute queries and mutations directly, bypassing domain services for many operations.
- **`app/` -> `lib/`:** **Interface coupling.** Primarily imports defined domain functions (e.g., `resolveTurns`, `getAgentSnapshots`).
- **`lib/` -> `db/`:** **Tight coupling.** The domain layer natively interacts with the database, which is expected.

### Fan-in and Fan-out

- **Highest Fan-In (Most Depended Upon):** `db/schema.ts` (imported extensively across `app/` and `lib/`), and core types in `lib/`.
- **Highest Fan-Out (Depends On Most):** `app/actions.ts` (coordinates across `db/`, `lib/stripe.ts`, `lib/users.ts`, `lib/presets.ts`, etc.) and `lib/bout-engine.ts`.

---

## 1.2 State Inventory

### 1. Postgres Database (Neon via Drizzle)
- **Who writes:** Server actions (`app/actions.ts`), API route handlers (`app/api/*`), domain services (`lib/*`).
- **Who reads:** React Server Components (`app/`), Server actions, API handlers, domain services.
- **Source of truth:** Yes, canonical data store.
- **Sync mechanism:** N/A.

### 2. In-Memory Caches
- **Locations:** `lib/leaderboard.ts` (5min TTL), `lib/onboarding.ts` (1h TTL), `lib/copy.ts` (module init map).
- **Who writes:** Respective modules upon cache miss.
- **Who reads:** Dashboard UI, new user flow, UI text components.
- **Source of truth:** Derived copy.
- **Sync mechanism:** Time-to-Live (TTL). **FLAG:** In a serverless/edge environment (like Vercel), instances are scaled horizontally. Memory cache means different instances hold different derived states with no active sync mechanism, leading to stale reads.

### 3. Client-Side State
- **Locations:** React Component State (`useState`), React Context (`PostHogReadyContext`, `CopyContext`), LocalStorage (`pit:pending_consent_event`).
- **Who writes:** Client components.
- **Who reads:** Client components, `posthog-provider.tsx`.
- **Source of truth:** Canonical for UI interactions.
- **Sync mechanism:** N/A.

### 4. Configuration State
- **Locations:** `.env`, `.env.local`
- **Who writes:** Deployment environment.
- **Who reads:** `lib/env.ts` (Zod validation), Server code.
- **Source of truth:** Canonical.

### Flags
- **State duplication without sync:** In-memory caching in `lib/leaderboard.ts` and `lib/onboarding.ts` lacks cross-instance synchronization.

---

## 1.3 API Surface Catalogue

### Server Actions (`app/actions.ts`)
- `createBout(presetId, formData)`
- `createArenaBout(formData)`
- `createCreditCheckout(formData)`
- `grantTestCredits()`
- `archiveAgent(agentId)`
- `restoreAgent(agentId)`
- `createSubscriptionCheckout(formData)`
- `createBillingPortal()`

### HTTP API Endpoints (`app/api/`)
- `/api/admin`
- `/api/agents`
- `/api/ask-the-pit`
- `/api/byok-stash`
- `/api/contact`
- `/api/credits`
- `/api/feature-requests`
- `/api/health`
- `/api/newsletter`
- `/api/openapi`
- `/api/paper-submissions`
- `/api/pv`
- `/api/reactions`
- `/api/research`
- `/api/run-bout`
- `/api/short-links`
- `/api/v1`
- `/api/winner-vote`

### Boundary Leakage Assessment
- **High Leakage:** The `db/schema.ts` is effectively treated as a public API across the entire codebase. Next.js Route Handlers and Server Actions mutate the database directly rather than passing through a dedicated, encapsulated data access layer.
- **Domain Encapsulation:** Some complex boundaries are well encapsulated. For instance, `lib/bout-engine.ts` abstracts the underlying complexity of LLM interactions and Anthropic API handling, providing a clean interface (`resolveTurns`, etc.).
- **Cross-cutting patterns:** Extensive use of `lib/logger.ts` and `lib/rate-limit.ts` across API routes to ensure consistent rate limiting and telemetry.

(End of Phase 1)
