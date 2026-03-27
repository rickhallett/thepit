# QA Signoff — T-001 through T-006

> Operator verification of product foundation before bouts development.
> Created: 2026-03-04, after T-005 landed (2622c65).
> Updated: 2026-03-08, T-006 added, signoff completed.

## 1. Build & Dev Server

- [x] `pnpm run build` exits 0
- [x] `pnpm run dev` starts without errors
- [x] http://localhost:3000 loads the landing page ("The Pit" heading, description text)
- [x] No console errors in browser devtools on page load

## 2. Auth (T-003 — Clerk Middleware)

- [x] http://localhost:3000/sign-in renders Clerk sign-in component
- [x] http://localhost:3000/sign-up renders Clerk sign-up component
- [x] Sign in with test account succeeds, redirects to home
- [x] Sign out works (if Clerk UI present; otherwise skip)
- [x] Navigate to a non-existent route — 404 handled cleanly, not a crash

## 3. Health Endpoint

- [x] `curl http://localhost:3000/api/health` returns 200 with JSON body
- [x] Response includes expected fields (status, timestamp, or similar)

## 4. Database (T-002 — Schema, T-004 — User Mirroring)

- [x] `set -a && source .env.local && set +a && pnpm run test` — all DB tests pass (not skipped)
- [x] Verify real test output: users.test.ts shows 4 passed (not 3 skipped)
- [x] Verify real test output: referrals.test.ts shows 5 passed (not 4 skipped)
- [x] Verify real test output: schema.test.ts shows 3 passed (not 2 skipped)
- [x] Spot-check: connect to Neon `noopit-dev` branch, verify tables exist

## 5. API Utils (T-005)

- [x] Read `lib/common/api-utils.ts` — error envelope shape matches SPEC.md
- [x] Read `lib/common/rate-limit.ts` — sliding window comment accurately describes implementation
- [x] Run tests without DB: api-utils (10 pass), rate-limit (13 pass), env (5 pass)
- [x] Verify branded types compile: `pnpm run typecheck` — no errors from `lib/common/types.ts`

## 6. Presets (T-006)

- [x] Presets test: 9 passed
- [x] Zod-validated loader, server-only guard, frozen cache

## 7. Gauntlet Infrastructure

- [x] `python3 scripts/pitcommit.py status` shows current tier and step verdicts
- [x] `.gauntlet/` directory is gitignored

## 8. Test Quality — The No-Mock Order

- [x] `vi.mock` only in referrals.test.ts (nanoid) — 1 occurrence, correct file
- [x] No mock DB connections, mock Clerk instances, or mock Stripe clients
- [x] DB tests use `describe.skipIf(!hasDb)` pattern
- [x] `vi.useFakeTimers()` only for time control, not infrastructure mocking

## 9. Code Conventions

- [x] All source files in `lib/` have header comments
- [x] Test files co-located (`*.test.ts` beside module)
- [x] `DOMAIN.md` in all 9 domains (auth, bouts, common, agents, credits, engagement, sharing, stripe, db)
- [x] 2 spaces indentation throughout

## 10. Commit History

- [x] T-001 through T-006 commits present, conventional format
- [x] No "fixup" or "wip" commits in chain
- [x] Each commit atomic (one concern per commit)

## 11. SPEC Alignment

- [x] Foundation supports Bout Flow (presets, API utils, rate limiter, auth, schema all in place)
- [x] `API_ERRORS` covers required error codes
- [x] No SPEC contradictions found

---

## Signoff

```
Operator: Richard Hallett
Date: 2026-03-08
Findings: None. Foundation verified. Clerk dev keys configured (.env.local).
           Ready for bouts development.
Test run: 49/49 passed (0 skipped), typecheck clean, build clean.
```
