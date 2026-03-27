# Change Propagation Analysis - Phase 3 (codex)

Version: 1.0
Date: 2026-03-16
Scope: Phase 3 pattern analysis for The Pit

---

## 3.1 Mechanism Consistency

### Boundary mechanism inventory

| Boundary | Mechanisms observed | Consistency assessment |
|---|---|---|
| Components to app (server actions) | Server actions with form `action` in `components/preset-card.tsx` and `components/arena-builder.tsx` | Intentional, aligns with Next.js server action pattern for form submissions |
| Components to app/api | HTTP fetch in `lib/use-bout.ts`, `lib/use-bout-reactions.ts`, `lib/use-bout-voting.ts`, `components/feature-request-form.tsx`, `components/feature-request-list.tsx`, `components/agent-builder.tsx` | Consistent request-response for client mutations |
| Components to app/api (streaming) | SSE stream via `/api/run-bout` in `lib/use-bout.ts` | Intentional variation for streaming |
| App or app/api to lib | Direct function calls | Consistent and ubiquitous |
| App or lib to db | Direct schema access with `requireDb()` | Consistent but tightly coupled |
| External integrations | Stripe webhooks to `app/api/credits/webhook/route.ts`, model provider calls in `lib/bout-engine.ts`, EAS attestations in `lib/eas.ts` | Consistent with expected integration patterns |

Dominant propagation pattern: primarily request-response with direct DB mutation, plus explicit event propagation for SSE and webhooks. Mixed with clear separation.

---

## 3.2 Smell Catalogue

| Smell | Finding | Severity | References | Judgment |
|---|---|---|---|---|
| Cross-boundary direct mutation | App routes and API handlers write DB tables directly without an intermediate repository layer | Medium | `app/actions.ts`, `app/api/agents/route.ts`, `app/api/reactions/route.ts` | Likely intentional, revisit if DB schema churn increases |
| Inconsistent mechanism at same boundary | UI uses server actions, fetch, and SSE for similar user flows | Medium | `components/preset-card.tsx`, `components/arena-builder.tsx`, `lib/use-bout.ts` | Intentional variation for streaming and form patterns |
| Missing failure handling on change hops | Reaction toggles and feature request votes revert optimistically without user-visible error messaging | Medium | `lib/use-bout-reactions.ts`, `components/feature-request-list.tsx` | Not intentional, affects user feedback |
| Implicit ordering dependencies | BYOK key must be stashed before form submit, enforced by local ref and re-submit | Medium | `components/preset-card.tsx`, `components/arena-builder.tsx`, `app/api/byok-stash/route.ts` | Intentional but fragile under concurrent submits |
| God module | Bout engine centralizes validation, billing, streaming, analytics, and DB mutation | Medium-High | `lib/bout-engine.ts` | Intentional consolidation but creates high fan-out and change risk |
| Dead state | `free_bout_pool` table exists but has no runtime usage | Low | `db/schema.ts`, `drizzle/schema.ts` | Likely legacy, confirm before removal |

---

## 3.3 Change Impact Projection

### Requirement A: Replace in-memory rate limiting with Redis

1. Modules affected: `lib/rate-limit.ts`, all `app/api/*` routes that call `checkRateLimit`, `lib/bout-engine.ts`.
2. Boundaries and mechanisms: app/api to lib unchanged, lib to external Redis added.
3. Difficulty: Awkward. Requires new infrastructure, env configuration, and fallback behavior.
4. Obstructions: current in-memory design assumes single instance. New shared store impacts latency and error handling across all endpoints.

### Requirement B: Multi-user live spectating with broadcast updates

1. Modules affected: `lib/bout-engine.ts`, `app/api/run-bout/route.ts`, `lib/use-bout.ts`, new realtime layer.
2. Boundaries and mechanisms: add event fan-out beyond request scoped SSE, likely new pubsub or websocket service.
3. Difficulty: Structurally Difficult. Current design is per-request SSE only.
4. Obstructions: no shared event bus, no persistence of partial turns outside the request.

### Requirement C: Make user activation tracking atomic

1. Modules affected: `db/schema.ts` add `users.activatedAt`, migration in `drizzle/`, `lib/bout-engine.ts`.
2. Boundaries and mechanisms: app/api to db remains direct, adds transactional update path.
3. Difficulty: Easy. Single schema change and replace count query with atomic update.
4. Obstructions: requires DB migration and backfill for existing users.
