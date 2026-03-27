# Code Review Report (codex-52)

Date: 2026-03-09
Reviewer: OpenCode (Weaver)
Base: main
Branches reviewed (git show main..branch):
- origin/phase2-ui
- origin/phase5-discovery
- origin/phase4-economy
- origin/phase6-ship

Verification:
- Local gate not run in this review.

## Cross-branch notes
- Duplicate change: `eslint.config.mjs` globals (`FormData`, `AbortController`, `globalThis`) appear in multiple branches. Expect merge conflicts; consolidate once.
- Several branches touch overlapping engagement/sharing code (`/b/[id]`, short links, reactions, votes). Ensure only one version lands to avoid route conflicts.

## origin/phase2-ui
Scope summary:
- Short links + share panel, votes + leaderboard, short-link redirect page, arena share UI, ESLint globals.

Findings:
- Major: `createShortLink` returns `result.slug!` after re-select; if insert was a no-op and the row is still missing, this will throw at runtime. Consider explicit null handling with 500 or retry. File: `lib/sharing/short-links.ts`.
- Minor: SharePanel relies on `navigator.clipboard` without fallback or error handling; secure-context failures will silently no-op. File: `components/engagement/share-panel.tsx`.
- Minor: Short-link API does not rate limit and accepts any bout that exists (including non-completed). Confirm this is intended. File: `app/api/short-links/route.ts`.

## origin/phase5-discovery
Scope summary:
- Reactions API + UI, votes API, leaderboard computation, arena preset card and bout autoStart wiring, engagement tests and QA docs.

Findings:
- Major: Reaction fingerprint and rate limiting rely on `x-forwarded-for` / `x-real-ip`. If the edge/proxy does not set these, all clients collapse to `127.0.0.1`, causing shared rate limit and reaction identity collisions. File: `app/api/reactions/route.ts`.
- Major: Winner vote flow uses `rowCount` from Drizzle insert to infer conflicts; confirm the configured driver returns `rowCount` (some drivers return undefined). File: `lib/engagement/votes.ts`.
- Minor: `WinnerVoteRequestSchema` does not enforce `min(1)` on `boutId` / `agentId` (empty strings pass). If invalid IDs should be rejected, tighten schema. File: `lib/engagement/votes.ts`.

## origin/phase4-economy
Scope summary:
- Stripe tiers, webhook pipeline, checkout helpers, arena subscription UI, credits balance/preauth/settlement/intro pool, bout settlement wiring.

Findings:
- Major: Webhook route hard-asserts `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. Missing envs will throw at runtime with a 500, bypassing a clean 4xx error. File: `app/api/credits/webhook/route.ts`.
- Major: `applyCreditDelta` logs a transaction even when no balance row is updated (e.g., missing user row). This can create ledger entries that do not correspond to any balance change. File: `lib/credits/balance.ts`.
- Major: Intro pool update assumes a singleton row (UPDATE without WHERE). If more than one row ever exists, this will update all rows. Enforce singleton with WHERE or a constraint. File: `lib/credits/intro-pool.ts`.

## origin/phase6-ship
Scope summary:
- Replay page on `/b/[id]`, bout hero, most-reacted logic, agent pages + builder UI, agent API + registry, additional Stripe + sharing integration, e2e stubs.

Findings:
- Major: Agent ID generation uses `crypto.randomUUID().slice(0, 21)` (hex + hyphens) rather than `nanoid(21)`. If other systems assume nanoid format/entropy or length semantics, this will diverge. File: `lib/agents/create.ts`.
- Minor: `/b/[id]` resolution uses length checks (8 vs 21). If future IDs change length, this route will mis-handle. Consider explicit prefixing or a format validator. File: `app/b/[id]/page.tsx`.
- Minor: `getMostReactedTurnIndex` uses `count(*)` ordering without tie-breaker. If deterministic tie handling is required (e.g., earliest turn), add secondary ordering. File: `lib/engagement/reactions.ts`.

## Gate/verification recommendations
- Run local gate before merge: `pnpm run typecheck && pnpm run lint && pnpm run test`.
- For branches touching Stripe/webhooks, run targeted tests for credits + webhook flows when DB is available.
