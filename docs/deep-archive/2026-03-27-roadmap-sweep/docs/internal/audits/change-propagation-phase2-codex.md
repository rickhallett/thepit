# Change Propagation Analysis - Phase 2 (codex)

Version: 1.0
Date: 2026-03-16
Scope: Phase 2 change propagation traces for The Pit

---

## Selection

Selected user-facing actions:

1. Start a preset bout from `/arena` and stream it live.
2. Create a custom agent from `/agents/new`.
3. Toggle a reaction (heart or fire) during a bout.
4. Cast a winner vote at the end of a bout.
5. Submit a feature request from `/feedback`.
6. Purchase a credit pack and receive the Stripe webhook grant.
7. First page view of a session and user session initialization.

---

## Trace 1 - Start a preset bout (server action + streaming run)

Entry: User submits a preset card on `/arena`.

HOP 1:
  From: `components/preset-card.tsx` `PresetCard` form submit
  To: `app/actions.ts` `createBout`
  Mechanism: Request-response (server action)
  Boundary crossed: yes, components to app
  Failure mode: surfaced (redirect to sign-in, throws on invalid preset or missing config)
  Ordering assumption: form submission completes before redirect

HOP 2:
  From: `app/actions.ts` `createBout`
  To: `db/schema.ts` `bouts` insert via `requireDb`
  Mechanism: Direct mutation (DB insert)
  Boundary crossed: yes, app to db
  Failure mode: surfaced (server action throws on DB failure)
  Ordering assumption: bout row must exist before redirect

HOP 3:
  From: `app/actions.ts` `createBout` redirect
  To: `app/bout/[id]/page.tsx` `BoutPage`
  Mechanism: Request-response (navigation)
  Boundary crossed: yes, app routing
  Failure mode: surfaced (404 when preset cannot be resolved)
  Ordering assumption: route params resolve before server render

HOP 4:
  From: `app/bout/[id]/page.tsx` `BoutPage`
  To: `lib/reactions.ts` `getReactionCounts`, `lib/winner-votes.ts` `getWinnerVoteCounts`
  Mechanism: Request-response (function call)
  Boundary crossed: yes, app to lib
  Failure mode: logged for DB load failures, otherwise surfaced via errors
  Ordering assumption: bout record resolves before dependent queries

HOP 5:
  From: `app/bout/[id]/page.tsx` `BoutPage`
  To: `components/arena.tsx` `Arena`
  Mechanism: Request-response (server render)
  Boundary crossed: yes, app to components
  Failure mode: surfaced (render errors propagate)
  Ordering assumption: initial transcript and metadata prepared before client hook runs

HOP 6:
  From: `components/arena.tsx` `useBout` hook
  To: `lib/use-bout.ts` `useBout` -> `fetch('/api/run-bout')`
  Mechanism: Request-response (HTTP fetch)
  Boundary crossed: yes, components to app/api
  Failure mode: surfaced (errorDetail set in UI on non-OK responses)
  Ordering assumption: boutId from server render matches server action insert

HOP 7:
  From: `app/api/run-bout/route.ts` `POST`
  To: `lib/bout-engine.ts` `validateBoutRequest`
  Mechanism: Request-response (function call)
  Boundary crossed: yes, app/api to lib
  Failure mode: surfaced (errorResponse with status)
  Ordering assumption: request JSON parse completes before validation

HOP 8:
  From: `lib/bout-engine.ts` `validateBoutRequest`
  To: `lib/credits.ts`, `lib/tier.ts`, `lib/intro-pool.ts`, `db/schema.ts`
  Mechanism: Request-response (function calls), Direct mutation (DB updates)
  Boundary crossed: yes, lib to db
  Failure mode: surfaced (rate limit, auth, insufficient credits), logged for internal failures
  Ordering assumption: rate limit and credit preauth complete before bout execution

HOP 9:
  From: `lib/bout-engine.ts` `executeBout`
  To: external model APIs via `lib/ai.ts` and `ai` SDK
  Mechanism: Request-response (HTTP to provider)
  Boundary crossed: yes, external service
  Failure mode: surfaced via SSE error text; logged with context
  Ordering assumption: turns stream sequentially; transcript ordering preserved

HOP 10:
  From: `lib/bout-engine.ts` `_executeBoutInner`
  To: `db/schema.ts` `bouts` update and `creditTransactions`
  Mechanism: Direct mutation (DB updates)
  Boundary crossed: yes, lib to db
  Failure mode: logged and surfaced; on error path refunds credits and updates status
  Ordering assumption: settle credits after transcript persisted

Trace summary:
- Total hops: 10
- Mechanisms: request-response, direct mutation, derived computation, event propagation (SSE)
- Boundaries crossed: components, app, app/api, lib, db, external provider
- Consistency: mixed mechanisms at UI boundary (server action plus fetch plus SSE). This appears intentional.

---

## Trace 2 - Create a custom agent

Entry: User submits the AgentBuilder form on `/agents/new`.

HOP 1:
  From: `components/agent-builder.tsx` `handleSubmit`
  To: `app/api/agents/route.ts` `POST`
  Mechanism: Request-response (HTTP fetch)
  Boundary crossed: yes, components to app/api
  Failure mode: surfaced (error message displayed in UI)
  Ordering assumption: client validation precedes API call

HOP 2:
  From: `app/api/agents/route.ts` `POST`
  To: `lib/agent-prompts.ts` `buildStructuredPrompt`
  Mechanism: Derived computation
  Boundary crossed: yes, app/api to lib
  Failure mode: surfaced (missing prompt or validation error)
  Ordering assumption: prompt built before hashing

HOP 3:
  From: `app/api/agents/route.ts` `POST`
  To: `lib/agent-dna.ts` `buildAgentManifest`, `hashAgentPrompt`, `hashAgentManifest`
  Mechanism: Derived computation
  Boundary crossed: yes, app/api to lib
  Failure mode: surfaced (hash mismatch error)
  Ordering assumption: manifest hashes computed before DB insert

HOP 4:
  From: `app/api/agents/route.ts` `POST`
  To: `db/schema.ts` `agents` insert
  Mechanism: Direct mutation (DB insert)
  Boundary crossed: yes, app/api to db
  Failure mode: surfaced (DB errors return 500)
  Ordering assumption: rate limit and tier checks complete before insert

HOP 5:
  From: `app/api/agents/route.ts` `POST`
  To: `lib/eas.ts` `attestAgent` (optional)
  Mechanism: Request-response (external chain RPC)
  Boundary crossed: yes, external service
  Failure mode: logged, not surfaced, response sets `attestationFailed: true`
  Ordering assumption: attestation happens after DB insert

HOP 6:
  From: `app/api/agents/route.ts` `POST`
  To: `lib/remix-events.ts` `recordRemixEvent` (fire and forget)
  Mechanism: Request-response
  Boundary crossed: yes, app/api to lib
  Failure mode: logged; does not fail request
  Ordering assumption: remix event only after insert and optional attestation

Trace summary:
- Total hops: 6
- Mechanisms: request-response, derived computation, direct mutation
- Boundaries crossed: components, app/api, lib, db, external chain
- Consistency: stable; only optional external attestation is best-effort

---

## Trace 3 - Toggle a reaction (heart or fire)

Entry: User clicks a reaction icon inside `Arena`.

HOP 1:
  From: `components/arena.tsx` `MessageCard` -> `useBoutReactions`
  To: `lib/use-bout-reactions.ts` `sendReaction`
  Mechanism: Request-response (function call)
  Boundary crossed: yes, components to lib
  Failure mode: silent for API errors (optimistic revert only)
  Ordering assumption: optimistic update before API response

HOP 2:
  From: `lib/use-bout-reactions.ts` `sendReaction`
  To: `app/api/reactions/route.ts` `POST`
  Mechanism: Request-response (HTTP fetch)
  Boundary crossed: yes, components to app/api
  Failure mode: surfaced indirectly via optimistic rollback only
  Ordering assumption: rate limit and validation precede DB writes

HOP 3:
  From: `app/api/reactions/route.ts` `POST`
  To: `db/schema.ts` `reactions` insert or delete
  Mechanism: Direct mutation (DB insert or delete)
  Boundary crossed: yes, app/api to db
  Failure mode: surfaced (error responses)
  Ordering assumption: bout exists and turn index valid before mutation

HOP 4:
  From: `app/api/reactions/route.ts` `POST`
  To: `db/schema.ts` aggregated counts
  Mechanism: Request-response (DB query)
  Boundary crossed: yes, app/api to db
  Failure mode: surfaced (non-OK response)
  Ordering assumption: counts read after mutation

Trace summary:
- Total hops: 4
- Mechanisms: request-response, direct mutation
- Boundaries crossed: components, app/api, db
- Consistency: toggle and count reconciliation are consistent; UI error handling is minimal

---

## Trace 4 - Cast a winner vote

Entry: User clicks a winner vote button in `Arena` after bout completion.

HOP 1:
  From: `components/arena.tsx` `WinnerVotePanel` -> `useBoutVoting`
  To: `lib/use-bout-voting.ts` `castWinnerVote`
  Mechanism: Request-response (function call)
  Boundary crossed: yes, components to lib
  Failure mode: surfaced (voteError shown)
  Ordering assumption: client prevents duplicate votes

HOP 2:
  From: `lib/use-bout-voting.ts` `castWinnerVote`
  To: `app/api/winner-vote/route.ts` `POST`
  Mechanism: Request-response (HTTP fetch)
  Boundary crossed: yes, components to app/api
  Failure mode: surfaced via error messages
  Ordering assumption: API returns before local state update

HOP 3:
  From: `app/api/winner-vote/route.ts` `POST`
  To: `db/schema.ts` `winnerVotes` insert
  Mechanism: Direct mutation (DB insert)
  Boundary crossed: yes, app/api to db
  Failure mode: surfaced (error responses)
  Ordering assumption: bout exists and agent participation validated first

Trace summary:
- Total hops: 3
- Mechanisms: request-response, direct mutation
- Boundaries crossed: components, app/api, db
- Consistency: consistent request-response pattern for votes

---

## Trace 5 - Submit a feature request

Entry: User submits the feature request form on `/feedback`.

HOP 1:
  From: `components/feature-request-form.tsx` `handleSubmit`
  To: `app/api/feature-requests/route.ts` `POST`
  Mechanism: Request-response (HTTP fetch)
  Boundary crossed: yes, components to app/api
  Failure mode: surfaced (error message shown)
  Ordering assumption: client validation precedes API call

HOP 2:
  From: `app/api/feature-requests/route.ts` `POST`
  To: `lib/users.ts` `ensureUserRecord`
  Mechanism: Request-response (function call)
  Boundary crossed: yes, app/api to lib
  Failure mode: logged for profile fetch issues, not surfaced
  Ordering assumption: user record exists before insert

HOP 3:
  From: `app/api/feature-requests/route.ts` `POST`
  To: `db/schema.ts` `feature_requests` insert
  Mechanism: Direct mutation (DB insert)
  Boundary crossed: yes, app/api to db
  Failure mode: surfaced (error responses)
  Ordering assumption: rate limit and validation precede mutation

Trace summary:
- Total hops: 3
- Mechanisms: request-response, direct mutation
- Boundaries crossed: components, app/api, lib, db
- Consistency: consistent for other form-backed mutations

---

## Trace 6 - Purchase credit pack and receive Stripe webhook

Entry: User clicks a credit pack purchase button on `/arena`.

HOP 1:
  From: `components/buy-credits-button.tsx` (form action)
  To: `app/actions.ts` `createCreditCheckout`
  Mechanism: Request-response (server action)
  Boundary crossed: yes, components to app
  Failure mode: surfaced (redirect or thrown error)
  Ordering assumption: form submit completes before redirect

HOP 2:
  From: `app/actions.ts` `createCreditCheckout`
  To: `lib/stripe.ts` `stripe.checkout.sessions.create`
  Mechanism: Request-response (external API call)
  Boundary crossed: yes, external service
  Failure mode: surfaced (throws on missing key or Stripe error)
  Ordering assumption: Stripe session created before redirect

HOP 3:
  From: Stripe webhook
  To: `app/api/credits/webhook/route.ts` `POST`
  Mechanism: Event propagation (webhook request)
  Boundary crossed: yes, external service to app/api
  Failure mode: surfaced to Stripe with status; logged for signature failures
  Ordering assumption: Stripe retries idempotently on failure

HOP 4:
  From: `app/api/credits/webhook/route.ts` `POST`
  To: `lib/credits.ts` `ensureCreditAccount`, `applyCreditDelta`
  Mechanism: Request-response (function call)
  Boundary crossed: yes, app/api to lib
  Failure mode: surfaced to webhook response on errors
  Ordering assumption: dedupe check before ledger insert

HOP 5:
  From: `lib/credits.ts` `applyCreditDelta`
  To: `db/schema.ts` `credit_transactions` insert and `credits` update
  Mechanism: Direct mutation (transaction)
  Boundary crossed: yes, lib to db
  Failure mode: surfaced via error return
  Ordering assumption: ledger insert and balance update are atomic

Trace summary:
- Total hops: 5
- Mechanisms: request-response, event propagation, direct mutation
- Boundaries crossed: components, app, app/api, lib, db, external Stripe
- Consistency: webhook idempotency via referenceId checks and unique index

---

## Trace 7 - First page view and user session initialization

Entry: Browser requests a page and user is signed in.

HOP 1:
  From: `middleware.ts` request handling
  To: `app/api/pv/route.ts` `POST` (fire and forget)
  Mechanism: Event propagation (internal HTTP request)
  Boundary crossed: yes, middleware to app/api
  Failure mode: logged, response ignored by caller
  Ordering assumption: analytics consent gate precedes PV call

HOP 2:
  From: `app/api/pv/route.ts` `POST`
  To: `db/schema.ts` `page_views` insert
  Mechanism: Direct mutation (DB insert)
  Boundary crossed: yes, app/api to db
  Failure mode: logged and surfaced as 500 to middleware fetch
  Ordering assumption: secret header validated before insert

HOP 3:
  From: `app/layout.tsx` `RootLayout`
  To: `lib/onboarding.ts` `initializeUserSession`
  Mechanism: Request-response (function call)
  Boundary crossed: yes, app to lib
  Failure mode: silent for analytics errors, uses try catch
  Ordering assumption: cookies parsed before onboarding

HOP 4:
  From: `lib/onboarding.ts` `initializeUserSession`
  To: `lib/users.ts` `ensureUserRecord`, `lib/referrals.ts` `ensureReferralCode`, `applyReferralBonus`
  Mechanism: Request-response (function calls)
  Boundary crossed: yes, lib to lib
  Failure mode: logged or silent; does not fail layout render
  Ordering assumption: user record exists before referral and credits

HOP 5:
  From: `lib/onboarding.ts` `applySignupBonus`
  To: `lib/intro-pool.ts` `claimIntroCredits` and `lib/credits.ts` `ensureCreditAccount`
  Mechanism: Request-response (function calls) and direct mutation (DB)
  Boundary crossed: yes, lib to db
  Failure mode: surfaced via returned status but not thrown
  Ordering assumption: intro pool row exists before claim

Trace summary:
- Total hops: 5
- Mechanisms: event propagation, request-response, direct mutation
- Boundaries crossed: middleware, app, app/api, lib, db
- Consistency: consent gating is centralized in middleware before PV calls

---

## Phase 2 Notes

- The UI boundary uses multiple mechanisms: server actions for form submissions, fetch for API routes, and SSE for streaming. This is a mixed model but appears deliberate per route needs.
- The bout engine is the deepest propagation path, combining rate limits, credits, model calls, and transcript persistence in a single execution chain.
- Error handling is strongest in the bout and payments paths and lighter in engagement interactions like reactions.
