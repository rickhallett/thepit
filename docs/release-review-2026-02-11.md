# Release Readiness Review — THE PIT

**Date:** 2026-02-11
**Reviewer:** Claude Code (claude-opus-4-6)
**Scope:** Security, code quality, documentation, code hygiene
**Baseline:** 423 tests passing, TypeScript clean, 3 lint errors (test files)

---

## Executive Summary

THE PIT is well-engineered for a pre-release product. Core financial operations (atomic credit preauth), auth integration (Clerk), and streaming architecture are solid. This review identifies **2 critical**, **6 high**, **9 medium**, and **8 low** findings across security, code quality, and documentation. All are addressable before public release.

**Critical blockers:**
1. `grantTestCredits` server action has no admin authorization check — any authenticated user can mint credits
2. Admin seed token comparison is not timing-safe

---

## 1. Security Findings

### CRITICAL

#### S-01: Missing admin check on `grantTestCredits` — any user can mint credits
- **File:** `app/actions.ts:203-221`
- **Risk:** When `CREDITS_ADMIN_ENABLED=true`, any authenticated user can call the `grantTestCredits` server action repeatedly to mint unlimited credits. The only gate is the feature flag — no `isAdmin(userId)` check exists.
- **Fix:** Add `if (!isAdmin(userId)) throw new Error('Unauthorized.');` after the feature flag check.

#### S-02: Timing-unsafe admin token comparison
- **File:** `app/api/admin/seed-agents/route.ts:19`
- **Risk:** `token !== process.env.ADMIN_SEED_TOKEN` uses JavaScript string equality which is not constant-time. Enables timing side-channel attacks to brute-force the admin token character by character.
- **Fix:** Use `crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected))` with length pre-check.

### HIGH

#### S-03: No security headers in Next.js config
- **File:** `next.config.ts:1-8`
- **Risk:** No `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `Content-Security-Policy`, `Referrer-Policy`, or `Permissions-Policy` headers. Leaves the app vulnerable to clickjacking, MIME sniffing, and other browser-level attacks.
- **Fix:** Add `headers()` config to `next.config.ts`.

#### S-04: BYOK stash endpoint has no authentication
- **File:** `app/api/byok-stash/route.ts:13-36`
- **Risk:** Any unauthenticated request can store an API key in the session cookie. Enables cookie jar pollution and key overwrite attacks.
- **Fix:** Add `auth()` check and basic key format validation (`sk-ant-` prefix).

#### S-05: Reactions endpoint allows unauthenticated spam
- **File:** `app/api/reactions/route.ts:20-78`
- **Risk:** No auth required, IP-based rate limiting only (30/min), and the in-memory rate limiter is per-serverless-instance. No database unique constraint on (boutId, turnIndex, IP) for anonymous users.
- **Fix:** Add database-level deduplication or require authentication.

#### S-06: Contact form email validation missing
- **File:** `app/api/contact/route.ts:58`
- **Risk:** `email` field from user input is never validated as a valid email. `name` field in subject only has newline stripping. No length limits on input fields.
- **Fix:** Add email regex validation and length limits (name: 200, email: 256, message: 5000).

#### S-07: No input length limit on run-bout topic
- **File:** `app/api/run-bout/route.ts:67`
- **Risk:** The `topic` field is sent to the AI model with no length constraint. Enables cost amplification via multi-megabyte payloads.
- **Fix:** Add `if (topic.length > 500) return 400`.

#### S-08: Referral cookie not validated or secured
- **File:** `middleware.ts:5-16`
- **Risk:** No length limit, no format validation, no `secure` flag, not `httpOnly`. Any `?ref=` param overwrites existing referral attribution.
- **Fix:** Validate with `/^[A-Za-z0-9_-]{1,32}$/`, add `secure: process.env.NODE_ENV === 'production'`, only set if no existing cookie.

### MEDIUM

#### S-09: Run-bout doesn't verify bout ownership
- **File:** `app/api/run-bout/route.ts:94-115`
- **Risk:** Any user who knows a `boutId` can trigger streaming on another user's bout. While nanoid provides ~126 bits of entropy, defense-in-depth requires ownership check.
- **Fix:** Verify `existingBout.ownerId === userId` before proceeding.

#### S-10: Winner-vote lacks bout/agent existence validation
- **File:** `app/api/winner-vote/route.ts:31-35`
- **Risk:** Votes can be cast for non-existent bouts or agents not in the bout, polluting the leaderboard.
- **Fix:** Verify bout exists before inserting vote.

#### S-11: `applyCreditDelta` can push balance negative
- **File:** `lib/credits.ts:192-218`
- **Risk:** Unconditionally adds delta without floor check. Error settlement paths could theoretically drive balance negative.
- **Fix:** Use `GREATEST(0, balance + delta)` guard.

#### S-12: Stripe client initialized with empty key
- **File:** `lib/stripe.ts:5-9`
- **Risk:** If `STRIPE_SECRET_KEY` is unset, client initializes with empty string. Errors may leak config state.
- **Fix:** Throw eagerly if key is missing.

#### S-13: Ask-the-pit doc path lacks traversal guard
- **File:** `app/api/ask-the-pit/route.ts:33`
- **Risk:** `path.join(process.cwd(), docPath)` doesn't prevent `../` traversal if config becomes user-controllable.
- **Fix:** Validate `fullPath.startsWith(process.cwd())`.

### LOW

#### S-14: Rate limit `getClientIdentifier` falls back to shared key `'unknown'`
- **File:** `lib/rate-limit.ts:122-123`
- All users behind a misconfigured proxy share one rate limit bucket.

#### S-15: Newsletter email regex is weak
- **File:** `app/api/newsletter/route.ts:7`
- Accepts `a@b.c` and other malformed addresses.

#### S-16: Agent creation doesn't validate `tier` enum at runtime
- **File:** `app/api/agents/route.ts:63,204`
- Client can submit any string for `tier`.

#### S-17: Unvalidated `boutId` format in API routes
- **File:** Multiple routes
- No nanoid format check before DB queries.

---

## 2. Code Quality Findings

### HIGH

#### Q-01: Lint errors in test files
- **File:** `tests/api/run-bout-errors.test.ts:245,315,366` — `let` should be `const`
- **File:** `tests/api/byok-stash.test.ts:10` — unused `_opts` param
- **File:** `tests/unit/leaderboard.test.ts:107` — unused `setupSelectForRange`
- **File:** `tests/unit/users.test.ts:45,99` — unused vars
- **Fix:** Run `eslint --fix` for const issues; prefix unused vars with `_` or remove.

#### Q-02: `.filter(Boolean)` doesn't narrow types — non-null assertions used
- **File:** `app/actions.ts:111`
- **Fix:** Use type-guard: `.filter((a): a is NonNullable<typeof a> => Boolean(a))`.

#### Q-03: `as Error` casts in catch blocks
- **Files:** `app/api/agents/route.ts:266`, `app/api/admin/seed-agents/route.ts:89,120`
- **Fix:** Use `error instanceof Error ? error.message : String(error)`.

#### Q-04: Array index used as React key
- **File:** `components/ask-the-pit.tsx:131`
- Messages can be added/removed; index keys cause incorrect reconciliation.
- **Fix:** Generate unique IDs per message.

### MEDIUM

#### Q-05: Missing error handling on `navigator.clipboard`
- **File:** `components/arena.tsx:198,205`
- Can fail on non-secure contexts.

#### Q-06: `castWinnerVote` has try/finally but no catch
- **File:** `components/arena.tsx:236-262`
- Network errors propagate uncaught into React.

#### Q-07: Swallowed reaction errors without optimistic rollback
- **File:** `components/arena.tsx:231-233`
- Optimistic UI count is never rolled back on API failure.

#### Q-08: Production `console.log` statements in webhook handler
- **File:** `app/api/credits/webhook/route.ts` (multiple lines)
- Should use structured logging or be removed.

#### Q-09: Arena page component named `Home`
- **File:** `app/arena/page.tsx:46`
- Confusing since `app/page.tsx` is the actual home.

### LOW

#### Q-10: `PRESETS` and `ALL_PRESETS` are identical aliases
- **File:** `lib/presets.ts:188-190`
- Used inconsistently across codebase.

#### Q-11: Mixed `Response.json()` and `new Response()` patterns in API routes
- Inconsistent error response formats across endpoints.

---

## 3. Code Hygiene Findings

### HIGH

#### H-01: BYOK key stashing logic duplicated verbatim (~35 lines)
- **Files:** `components/preset-card.tsx:78-115` and `components/arena-builder.tsx:77-111`
- **Fix:** Extract `useByokStash()` hook.

#### H-02: Arena lineup construction duplicated 3 times
- **Files:** `app/api/run-bout/route.ts:144-158`, `app/bout/[id]/page.tsx:91-106`, `app/b/[id]/page.tsx:33-49`
- **Fix:** Extract `buildLineupFromBout()` into `lib/presets.ts`.

#### H-03: Agent snapshot mapping from DB row duplicated
- **Files:** `lib/agent-registry.ts:76-112` and `lib/agent-detail.ts:82-111`
- **Fix:** Extract `rowToSnapshot()` helper.

#### H-04: `buildLineage()` function duplicated in two components
- **Files:** `components/leaderboard-table.tsx:87-105` and `components/agents-catalog.tsx:74-92`
- **Fix:** Extract to shared utility.

### MEDIUM

#### H-05: Magic color `'#f8fafc'` hardcoded in 6 locations
- **Fix:** Export `DEFAULT_AGENT_COLOR` from `lib/presets.ts`.

#### H-06: Magic number `12` for arena max turns in 3 locations
- **Fix:** Export `DEFAULT_ARENA_MAX_TURNS` from `lib/presets.ts`.

#### H-07: `appUrl` fallback chain repeated 3 times in `actions.ts`
- **Fix:** Extract `getAppUrl()` utility.

#### H-08: `PRESETS.some()` used for validation instead of O(1) `getPresetById()`
- **File:** `app/actions.ts:37`

#### H-09: N+1 queries in agent lineage resolution
- **File:** `lib/agent-detail.ts:122-133`
- Sequential DB queries in a while loop (up to 4 round-trips).

#### H-10: Leaderboard full-table scans aggregated in JS
- **File:** `lib/leaderboard.ts:112-131`
- 5 `SELECT *` queries per time range (15 total), aggregated in JavaScript.

### LOW

#### H-11: Hardcoded preset count `22` on landing page
- **File:** `app/page.tsx:166` — should use `ALL_PRESETS.length`.

#### H-12: Unused `DEFAULT_SCHEMA_REGISTRY` in `lib/eas.ts:23`

#### H-13: `CREDITS_ACCOUNT_ID` in `.env.example` not referenced in code

---

## 4. Documentation Findings

### P0 — Incorrect (misleading to users/contributors)

#### D-01: README seed-agents auth header is wrong
- **Location:** `README.md:158-159`
- **Shows:** `Authorization: Bearer $ADMIN_SEED_TOKEN`
- **Actual:** Code reads `x-admin-token` header
- **Fix:** Change to `-H "x-admin-token: $ADMIN_SEED_TOKEN"`

#### D-02: Test count stale everywhere
- **Locations:** `README.md:19,171,326`
- **Shows:** 66 tests
- **Actual:** 423 tests
- **Fix:** Update all occurrences

#### D-03: Table count wrong
- **Locations:** `README.md:65,243,257`
- **Shows:** 9 tables
- **Actual:** 12 tables (missing: `newsletter_signups`, `free_bout_pool`, `agent_flags`)

#### D-04: Run-bout runtime wrong in CLAUDE.md
- **Location:** `CLAUDE.md:29`
- **Shows:** "edge runtime"
- **Actual:** `runtime = 'nodejs'`, `maxDuration = 120`

#### D-05: Commands section incomplete
- **Location:** `README.md:166-173`
- **Missing:** `npm run typecheck`, `npm run test:unit`, `npm run test:ci`

### P1 — Materially incomplete

#### D-06: README project structure missing many entries
- Missing pages: security, terms, privacy, disclaimer, sign-in, sign-up, arena/custom, agents/new, agents/clone, agents/[id]
- Missing API routes: ask-the-pit, byok-stash
- Missing components: 14 of 20 unlisted
- Missing lib modules: 22 of 30 unlisted

#### D-07: No subscription system documentation
- Code has full `pass`/`lab` tier system with Stripe integration — not documented in README or ARCHITECTURE.md

#### D-08: `.env.example` missing ~20 environment variables
- Missing: all EAS vars (6), contact/email vars (3), subscription vars (3), intro pool vars (4), `ADMIN_SEED_TOKEN`, `FREE_BOUT_POOL_MAX`

#### D-09: ROADMAP.md doesn't reflect completed items
- "Credits + intro pool" — implemented
- "Shareable replays" — implemented
- "Voting + leaderboard" — implemented
- "Arena presets" — implemented
- "Structured agent builder" — implemented
- "Prompt lineage tracking" — implemented

#### D-10: ARCHITECTURE.md data model listing incomplete
- Missing: `newsletter_signups`, `free_bout_pool`, `agent_flags`
- No mention of subscription/tier system

#### D-11: README bout lifecycle shows `bout-complete` event
- **Location:** `README.md:83`
- **Actual:** Code emits `data-share-line`, not `bout-complete`

### P2 — Minor

#### D-12: CLAUDE.md missing `ANTHROPIC_PREMIUM_MODELS` (plural) env var
#### D-13: Tier naming mismatch: landing copy says "Arena" but code uses "lab"
#### D-14: `docs/hardening-changes-2026-02-10.md` test count stale (87 → 423)
#### D-15: `docs/mvp-checklist.md` preset count stale (11 → 22)
#### D-16: `docs/code-review-2026-02-10.md` issue #3 (BYOK) marked DEFERRED but partially addressed

---

## 5. Accessibility Findings

#### A-01: `AgentDetailsModal` missing `role="dialog"` and `aria-modal`
- **File:** `components/agent-details-modal.tsx:54-176`
- No focus trapping implemented.

#### A-02: Form inputs missing explicit label associations
- **File:** `app/contact/page.tsx:70-108`
- Labels wrap inputs but lack `htmlFor`/`id` binding.

#### A-03: Leaderboard sort headers lack `aria-sort`
- **Files:** `components/leaderboard-table.tsx`, `components/player-leaderboard-table.tsx`

#### A-04: Color-only status indicators in free bout counter
- **File:** `components/free-bout-counter.tsx:44`

---

## 6. Positive Observations (preserve these)

1. **Parameterized SQL throughout** — Drizzle ORM prevents SQL injection
2. **Atomic credit preauthorization** — conditional `UPDATE WHERE balance >= amount` prevents races
3. **Stripe webhook signature verification** — properly implemented
4. **BYOK cookie design** — HTTP-only, `sameSite: 'strict'`, 60s TTL, delete-after-read
5. **API key redaction** — `sk-ant-*` stripped from error logs
6. **XSS prevention in agent fields** — `UNSAFE_PATTERN` blocks script injection
7. **HTML escaping in contact email** — proper `escapeHtml()` implementation
8. **Idempotent credit processing** — duplicate webhook deduplication
9. **96.8% coverage** on core financial modules
10. **Conventional Commits** — clean, atomic commit history

---

## Remediation Plan

| PR | Scope | Priority | Findings Addressed |
|----|-------|----------|--------------------|
| 1 | Critical security fixes | P0 | S-01, S-02 |
| 2 | High security hardening | P0 | S-03, S-04, S-05, S-06, S-07, S-08 |
| 3 | Medium security fixes | P1 | S-09, S-10, S-11, S-12, S-13 |
| 4 | Code quality fixes | P1 | Q-01 through Q-09 |
| 5 | Code hygiene extraction | P1 | H-01 through H-10 |
| 6 | Documentation sync | P1 | D-01 through D-16 |
| 7 | Test coverage for fixes | P1 | Tests for all security/quality changes |

---

*Review complete. All findings have corresponding remediation items in the PR plan above.*
