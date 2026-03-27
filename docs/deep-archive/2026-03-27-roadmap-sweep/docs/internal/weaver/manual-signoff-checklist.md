# Manual Signoff Checklist — T-001 through T-005

> Operator verification after next walkthrough attestation.
> Created: 2026-03-04, after T-005 landed (2622c65).

## 1. Build & Dev Server

- [ ] `pnpm run build` exits 0
- [ ] `pnpm run dev` starts without errors
- [ ] http://localhost:3000 loads the landing page ("The Pit" heading, description text)
- [ ] No console errors in browser devtools on page load

## 2. Auth (T-003 — Clerk Middleware)

- [ ] http://localhost:3000/sign-in renders Clerk sign-in component
- [ ] http://localhost:3000/sign-up renders Clerk sign-up component
- [ ] Sign in with test account succeeds, redirects to home
- [ ] Sign out works (if Clerk UI present; otherwise skip)
- [ ] Navigate to a non-existent route — 404 handled cleanly, not a crash

## 3. Health Endpoint

- [ ] `curl http://localhost:3000/api/health` returns 200 with JSON body
- [ ] Response includes expected fields (status, timestamp, or similar)

## 4. Database (T-002 — Schema, T-004 — User Mirroring)

- [ ] `set -a && source .env && set +a && pnpm run test` — all DB tests pass (not skipped)
- [ ] Verify real test output: users.test.ts shows 4 passed (not 3 skipped)
- [ ] Verify real test output: referrals.test.ts shows 5 passed (not 4 skipped)
- [ ] Verify real test output: schema.test.ts shows 3 passed (not 2 skipped)
- [ ] Spot-check: connect to Neon `noopit-dev` branch, verify tables exist (`\dt` in psql or Neon console)

## 5. API Utils (T-005)

- [ ] Read `lib/common/api-utils.ts` — does the error envelope shape match SPEC.md?
- [ ] Read `lib/common/rate-limit.ts` — does the sliding window comment accurately describe the implementation?
- [ ] Run tests without DB: `pnpm run test` — api-utils (10 pass), rate-limit (13 pass), env (5 pass)
- [ ] Verify branded types compile: `pnpm run typecheck` — no errors from `lib/common/types.ts`

## 6. Gauntlet Infrastructure

- [ ] `python3 scripts/pitcommit.py status` shows current tier and step verdicts
- [ ] `python3 scripts/pitcommit.py tier` shows the active tier
- [ ] `make darkcat-all` runs both Claude and OpenAI darkcats without errors
- [ ] `.gauntlet/` directory is gitignored (check `git status` doesn't show it)

## 7. Test Quality — The No-Mock Order

- [ ] Grep for `vi.mock` across the codebase: only `nanoid` should appear (in referrals.test.ts)
- [ ] No test file creates mock DB connections, mock Clerk instances, or mock Stripe clients
- [ ] DB tests use `describe.skipIf(!hasDb)` pattern — verify by reading one test file
- [ ] `vi.useFakeTimers()` only used for time control (rate-limit.test.ts, api-utils.test.ts), not infrastructure mocking

## 8. Code Conventions

- [ ] All source files in `lib/` have a header comment explaining purpose
- [ ] Test files are co-located (`*.test.ts` beside the module they test)
- [ ] `DOMAIN.md` exists in `lib/auth/`, `lib/bouts/`, `lib/common/`
- [ ] 2 spaces indentation throughout (no tabs, no 4-space)

## 9. Commit History

- [ ] `git log --oneline` — T-002 through T-005 commits present, conventional commit format
- [ ] No "fixup" or "wip" commits in the chain
- [ ] Each commit is atomic (one concern per commit)

## 10. SPEC Alignment (Smell Check)

- [ ] Read SPEC.md Bout Flow section — does the current codebase have the foundation for it?
- [ ] Read SPEC.md Error Handling section — does `API_ERRORS` in api-utils.ts cover the required codes?
- [ ] Are there any SPEC requirements that the current code contradicts?

---

## Signoff

```
Operator: _______________
Date: _______________
Findings: _______________
```
