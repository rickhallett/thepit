# Captain's Review Checklist

> Gate checks syntax. Captain checks substance.
> Walk through after each task. Tick what you verify. Note what you find.
> This is the provenance trail — evidence that a human looked, not just a machine passed.

---

## Phase 0: Foundation

### 01 — Scaffold ✅ DONE

- [ ] `pnpm dev` starts without errors
- [ ] `/api/health` returns JSON with status
- [ ] `lib/common/env.ts` validates required vars (DATABASE_URL, ANTHROPIC_API_KEY, Clerk keys)
- [ ] Vitest config excludes Playwright tests
- [ ] Tailwind configured with brutalist intent (not default)
- [ ] Gate passes: typecheck + lint + test

### 02 — Database ✅ DONE

- [ ] `db/schema.ts` has 11 tables matching SPEC.md data model
- [ ] 4 enums: bout_status, agent_tier, user_tier, reaction_type
- [ ] Foreign keys reference correct parent tables
- [ ] `bigint` mode is `"number"` for credit fields (values stay within Number.MAX_SAFE_INTEGER; avoids BigInt ergonomic pain)
- [ ] `$onUpdate` on `updatedAt` fields
- [ ] Unique constraints: reactions composite, winner_votes composite, shortLinks.slug, referralCode
- [ ] `db/index.ts` uses Neon serverless Pool, not pg
- [ ] No migrations run, no seed data — schema only

### 03 — Clerk Middleware ✅ DONE

- [ ] Root `middleware.ts` exists with public/protected route matching
- [ ] Sign-in and sign-up pages render Clerk components
- [ ] `ClerkProvider` wraps app in layout.tsx
- [ ] `lib/auth/middleware.ts` exports auth helper (getAuthUserId or equivalent)
- [ ] No analytics or consent tracking

---

### Keel Signal Check — End of Phase 0

- [ ] Run `cd pitkeel && uv run python pitkeel.py` — review session, scope, velocity
- [ ] If fatigue ≥ moderate: stop, checkpoint, resume fresh
- [ ] If scope drift to unexpected domains: investigate before proceeding
- [ ] Run `cd pitkeel && uv run python pitkeel.py state-update --officer <name>` — update .keel-state

---

## Phase 1: Infrastructure

### 04 — User Mirroring

- [ ] `ensureUserRecord` uses INSERT ... ON CONFLICT DO NOTHING (first-write-wins, NOT upsert)
- [ ] `ensureReferralCode` generates nanoid(8), retries up to 4x on unique collision
- [ ] `initializeUserSession` calls ensureUserRecord → ensureReferralCode → ensureCreditAccount (stub)
- [ ] Credit account stub exists with TODO referencing task 10
- [ ] Tests mock `db` — no real database connection required
- [ ] Tests verify idempotency (calling twice doesn't throw)
- [ ] Tests verify referral collision retry
- [ ] Gate passes

### 05 — API Utils

- [ ] Branded types (BoutId, AgentId, UserId, MicroCredits) compile but add zero runtime cost
- [ ] `errorResponse` returns `{ error: { code, message } }` shape — matches SPEC error codes
- [ ] `parseValidBody` distinguishes JSON parse failure (INVALID_JSON) from Zod failure (VALIDATION_ERROR)
- [ ] Rate limiter uses sliding window (not fixed window) — verify by reading the timestamp filtering logic
- [ ] Rate limiter cleans up expired keys (no memory leak)
- [ ] Tests use `vi.useFakeTimers()` for sliding window verification
- [ ] No external dependencies for rate limiting (in-memory only)
- [ ] Gate passes

---

### Keel Signal Check — End of Phase 1

- [ ] Run `cd pitkeel && uv run python pitkeel.py` — review all signals
- [ ] If velocity accelerating: are gates running between each commit?
- [ ] If rapid-fire warnings: slow down, verify each change independently
- [ ] Update .keel-state: `cd pitkeel && uv run python pitkeel.py state-update --officer <name>`

---

## Phase 2a: Bout Pipeline

### 06 — Presets

- [ ] At least 4 preset JSON files exist in `presets/`
- [ ] Each preset has: id, name, description, agents array, maxTurns, defaultModel
- [ ] Each agent in preset has: id, name, systemPrompt, color
- [ ] Zod schema validates preset structure
- [ ] Loader caches parsed presets (not re-reading from disk every call)
- [ ] `getPreset(id)` returns undefined for unknown IDs (not throws)
- [ ] Gate passes

### 07 — Bout Validation

- [ ] `BoutRequest` Zod schema requires boutId, presetId; optional topic, model, length, format
- [ ] Validation checks preset exists (returns 400 if not)
- [ ] Basic unsafe content filter exists (regex, not AI — proportionate)
- [ ] Idempotency: boutId checked against existing bouts (returns 409 if duplicate)
- [ ] Types file defines TranscriptEntry, BoutStatus, SSE event shapes
- [ ] Tests cover: valid request, unknown preset, duplicate boutId, unsafe content
- [ ] Gate passes

### 08 — Bout Turn Loop

- [ ] `executeTurnLoop` takes config + callbacks, iterates agents round-robin
- [ ] Each turn: select agent → build prompt (system + history) → streamText → invoke callbacks
- [ ] Safety preamble injected into system prompt
- [ ] Callbacks: onTurnStart, onTextDelta, onTurnEnd with turnIndex
- [ ] Uses `streamText` from AI SDK (NOT `generateText`)
- [ ] No DB persistence, no credits, no SSE — pure engine
- [ ] Tests mock AI SDK, verify callback sequence and transcript shape
- [ ] Gate passes

### 09 — Bout Streaming

- [ ] SSE format is exactly: `event: {type}\ndata: {json}\n\n` (verify with raw output inspection)
- [ ] Event sequence: data-turn → text-start → text-delta(s) → text-end per turn, then done
- [ ] `turnIndex` present in every event (enables client dedup on reconnect)
- [ ] Client disconnect: stream cancel() callback stops LLM calls, no dangling promises
- [ ] Server error mid-bout: error event emitted after successful turns, then close
- [ ] controller.close() called in ALL code paths (finally block)
- [ ] Route handler at `app/api/run-bout/route.ts` — thin, delegates to streaming module
- [ ] Response headers: Content-Type text/event-stream, no-cache, keep-alive
- [ ] Tests cover: happy path sequence, mid-stream error, client disconnect cleanup
- [ ] Gate passes

---

## Phase 2b: Credit Pipeline

### 10 — Credit Balance

- [ ] `ensureCreditAccount` creates row with 10000 micro (= 100 credits) — idempotent
- [ ] `getBalance` returns MicroCredits branded type
- [ ] `applyDelta` uses atomic SQL: UPDATE ... SET balance_micro = GREATEST(0, balance_micro + delta)
- [ ] All arithmetic in integers (micro-credits), never floating point
- [ ] The stub in task 04's onboarding is replaced with a real import
- [ ] Tests verify: account creation, idempotent re-creation, positive/negative delta, floor at zero
- [ ] Gate passes

### 11 — Credit Preauth

- [ ] `preauthorizeCredits` is atomic: UPDATE ... WHERE balance_micro >= amount (single statement, not read-then-write)
- [ ] Returns success/failure + transaction record
- [ ] `settleCredits` computes delta between estimated and actual, applies correction
- [ ] `refundPreauth` returns full preauth amount on error
- [ ] All operations write to `credit_transactions` with source + reference_id for audit
- [ ] Idempotent: same reference_id doesn't double-charge
- [ ] Tests verify: sufficient balance succeeds, insufficient fails atomically, settle refunds overestimate, settle charges underestimate
- [ ] Gate passes

### 12 — Credit Catalog

- [ ] Model pricing defined: Haiku rate, Sonnet rate (micro per token or equivalent)
- [ ] `estimateBoutCostMicro` adds ~10% margin over base estimate
- [ ] Intro pool: shared balance with half-life decay
- [ ] Micro-credit conversion helpers exist (micro ↔ display credits)
- [ ] Tests use `toBeCloseTo` for decay math (not exact equality)
- [ ] Gate passes

---

### Keel Signal Check — End of Phase 2a/2b (Pre-Convergence)

- [ ] Run `cd pitkeel && uv run python pitkeel.py` — full signal check before convergence
- [ ] Session fatigue: if ≥ moderate, take a break before task 13
- [ ] Scope drift: both bout and credit domains should be present — that's expected
- [ ] Velocity: should be steady, not accelerating (convergence requires care)
- [ ] Update .keel-state: `cd pitkeel && uv run python pitkeel.py state-update --officer <name>`

---

## 🚧 CONVERGENCE POINT — Task 13

> This is where bout pipeline and credit pipeline merge.
> HODL: Captain reviews this task closely. Cross-domain integration.

### 13 — Bout Persistence + Credits

- [ ] Route handler INSERTs bout row with status='running' BEFORE streaming starts
- [ ] Credit preauth happens after bout insert, before streaming
- [ ] Insufficient credits → 402 response + bout status set to 'error'
- [ ] On completion: bout row updated with status='completed', transcript, share_line
- [ ] Share line generated via separate Haiku call (80 token max, no hashtags, no emoji)
- [ ] Credits settled: actual cost computed from transcript token counts, delta applied
- [ ] On error: partial transcript persisted, bout status='error', credits refunded
- [ ] Feature flag off (CREDITS_ENABLED=false): bout works normally, credit logic skipped entirely
- [ ] Tests mock both db AND credit functions, verify the full lifecycle
- [ ] Gate passes

---

## Phase 3: UI

### 14 — useBout Hook

- [ ] Client-side hook uses `fetch` + `ReadableStream` reader (NOT EventSource)
- [ ] Parses SSE events correctly (splitting on `\n\n`, extracting event + data)
- [ ] State: messages array, status (idle/streaming/complete/error), shareLine
- [ ] AbortController cleanup on unmount (no leaked connections)
- [ ] No server-side imports (verify: no `db`, no `drizzle`, no node-only modules)
- [ ] Tests verify: state transitions, event parsing, cleanup on abort
- [ ] Gate passes

### 15 — Bout Viewer Page

- [ ] Server component at `app/bout/[id]/page.tsx` fetches bout from DB
- [ ] If bout is completed: renders static transcript (no SSE)
- [ ] If bout is running or new: renders Arena with useBout hook
- [ ] Message cards show agent name, color border, content
- [ ] Auto-scroll works during streaming
- [ ] No reaction buttons, no voting UI, no share panel (those are later tasks)
- [ ] Gate passes

### 16 — Arena Page

- [ ] Preset grid renders all available presets
- [ ] Each preset card has model selector, optional topic input, "Start" button
- [ ] Bout ID generated client-side with nanoid(21)
- [ ] Clicking Start navigates to `/bout/[id]` with query params
- [ ] Credit balance displayed if user is authenticated
- [ ] No subscription/checkout UI (task 19)
- [ ] Gate passes

### Keel Signal Check — End of Phase 3 (Pre-Smoke Test)

- [ ] Run `cd pitkeel && uv run python pitkeel.py` — full signal check
- [ ] If any fatigue warning: take a break before smoke testing (fresh eyes catch more)
- [ ] Update .keel-state: `cd pitkeel && uv run python pitkeel.py state-update --officer <name>`

### 🏁 MID-BUILD SMOKE TEST

> After task 16: the core loop should work end-to-end without credits.
> Captain manually tests: arena page → pick preset → watch bout stream → see completed transcript.
> If this doesn't work, stop and fix before proceeding.

- [ ] Arena page loads, presets visible
- [ ] Clicking a preset starts a bout (SSE stream begins)
- [ ] Turns render in real time with agent names and colors
- [ ] Bout completes, transcript is readable
- [ ] Refreshing the page shows the completed bout (DB persistence works)
- [ ] No console errors in browser dev tools

---

## Phase 4: Stripe + Engagement

### 17 — Tier Config

- [ ] Three tiers defined: free, pass (£3/mo), lab (£10/mo) — matching SPEC table exactly
- [ ] Each tier has: rate limit, model access, max agents, BYOK flag, API flag, grant amounts
- [ ] `resolveTier` maps Stripe price ID → tier
- [ ] Rate limiter updated to accept tier-based config
- [ ] Tests verify tier resolution and rate limit config for each tier
- [ ] Gate passes

### 18 — Stripe Webhook

- [ ] Stripe SDK installed
- [ ] Webhook handler at `app/api/credits/webhook/route.ts`
- [ ] Signature verification using raw body (NOT parsed JSON)
- [ ] 6 event types handled: checkout.completed, subscription.created/updated/deleted, invoice.succeeded/failed
- [ ] Credit grants are idempotent (reference_id prevents double-grant)
- [ ] subscription.deleted → immediate downgrade to free (no credit clawback)
- [ ] invoice.payment_failed → immediate downgrade to free
- [ ] invoice.payment_succeeded skips first invoice (prevents double-grant with subscription.created)
- [ ] Tests replay sample webhook payloads, verify DB state after each
- [ ] Gate passes

### 19 — Stripe Checkout

- [ ] Server action creates Stripe checkout session (subscription or credit pack)
- [ ] Billing portal link available for existing subscribers
- [ ] UI guarded by SUBSCRIPTIONS_ENABLED feature flag
- [ ] When flag is off: no Stripe UI renders, no errors
- [ ] Tests verify checkout session creation parameters
- [ ] Gate passes

### 20 — Reactions

- [ ] Heart/fire toggle: same request adds or removes
- [ ] Anonymous reactions use SHA-256 of IP (never raw IP stored)
- [ ] Unique constraint prevents duplicate reactions (same user/fingerprint + bout + turn + type)
- [ ] API returns absolute counts per type, not just the toggle result
- [ ] Rate limit: 30/min
- [ ] Reaction buttons visible on message cards
- [ ] Tests verify: add, remove (toggle), anonymous fingerprint, count aggregation
- [ ] Gate passes

### 21 — Votes + Leaderboard

- [ ] One vote per user per bout (DB unique constraint enforced)
- [ ] Vote is permanent (no change/undo)
- [ ] Leaderboard aggregates: agents ranked by wins/votes
- [ ] Time-range filtering: all time, this week, this month
- [ ] Leaderboard page renders server-side (no API route)
- [ ] Leaderboard computation is a live query (not materialized — verify this is fast enough with small data)
- [ ] Gate passes

### 22 — Short Links + Sharing

- [ ] `nanoid(8)` slug, idempotent (same bout always gets same slug)
- [ ] Share panel shows after bout completion
- [ ] 6 social platforms + copy link button
- [ ] `/b/[slug]` route resolves slug → bout
- [ ] Tests verify: idempotent creation, slug lookup, 404 on unknown slug
- [ ] Gate passes

### 23 — Agent API

- [ ] POST /api/agents requires Clerk authentication
- [ ] Rate limit: 10/hr
- [ ] SHA-256 prompt hash computed from systemPrompt
- [ ] Zod validation on input fields
- [ ] Response includes agentId and promptHash
- [ ] No agent cloning, no lineage, no EAS
- [ ] Gate passes

### 24 — Agent Pages

- [ ] Catalog page: grid with search/filter
- [ ] Detail page: shows agent config, prompt hash, collapsible system prompt
- [ ] Builder page: tabbed form, live prompt preview
- [ ] Auth required for builder only
- [ ] Gate passes

---

## Phase 5: Polish + Deploy

### 25 — Replay Page

- [ ] `/b/[slug]` renders full replay (not just redirect)
- [ ] Bout hero: most-reacted turn quote
- [ ] Static transcript via Arena component in readOnly mode
- [ ] OG metadata for social sharing
- [ ] CTA banner for signed-out users
- [ ] Arena component reused (not duplicated)
- [ ] Gate passes

### 26 — Deploy

- [ ] Vercel deployment succeeds
- [ ] All required env vars set in Vercel dashboard
- [ ] Drizzle schema push to Neon production
- [ ] Stripe webhook endpoint configured with production URL
- [ ] Smoke test (6 URLs): /, /arena, /agents, /leaderboard, /recent, /api/health
- [ ] All smoke test URLs return 200
- [ ] Gate passes on deployed code

---

### Keel Signal Check — End of Phase 5 (Post-Deploy)

- [ ] Run `cd pitkeel && uv run python pitkeel.py` — final signal check
- [ ] Review commit trailers in git log: are keel signals attached?
- [ ] Spot-check: any commits with fatigue or rapid-fire warnings that deserve a second look?
- [ ] Update .keel-state with final state: `cd pitkeel && uv run python pitkeel.py state-update --officer <name>`

---

## EVAL.md Crosscheck (post-deploy)

- [ ] Core loop works: sign up → preset → watch → react → vote → share → leaderboard
- [ ] Economy works: credits on signup → preauth → settle → balance updated
- [ ] Stripe works: subscribe → webhook → tier change → credit grant
- [ ] Gate has passed on every commit (check git log for any [H:correct] or [H:reset] tags)
- [ ] Slopodar-v2: any new anti-patterns recorded?
- [ ] Deployed to Vercel with live URL
