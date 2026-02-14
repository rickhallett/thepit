# Agentic QA Sweep — Session State & Execution Plan

```yaml
---
created: "2026-02-14"
target: "https://thepit.cloud" # (redirects to https://www.thepit.cloud)
tool: "Kernel MCP (v0.14.9) + curl"
auth_strategy: "Login via Clerk UI in Kernel browser"
test_account: "qa-standard@thepit.cloud / QaTest123!"
status: "in_progress — restart needed to load Kernel MCP tools"
---
```

## Purpose

Run the full `docs/qa-report.md` checklist agentically using Kernel MCP (Playwright browser automation) and compare results with manual human QA.

---

## Pre-Collected Evidence (from curl, before restart)

### PRE-004: HTTPS & Headers
- HTTPS valid, `strict-transport-security: max-age=63072000; includeSubDomains; preload`
- `thepit.cloud` 307 redirects to `www.thepit.cloud`

### PRE-005: Health Endpoint
```json
{
  "status": "ok",
  "startedAt": "2026-02-14T01:28:30.808Z",
  "timestamp": "2026-02-14T01:28:30.980Z",
  "database": { "status": "ok", "latencyMs": 149 },
  "features": {
    "subscriptions": false,
    "credits": true,
    "byok": true,
    "eas": true,
    "askThePit": false
  }
}
```
**Result: PASS** — 200 OK, DB latency 149ms.

### SEC-001: Admin Endpoint Protection
- `GET /api/admin/seed-agents` returns **405** (Method Not Allowed — it's POST-only).
- **Result: PASS** — not leaking data. (Note: 405 not 401; the route only accepts POST, and POST requires `x-admin-token` header.)

### SEC-004: Security Response Headers
```
x-frame-options: DENY                     ✓
x-content-type-options: nosniff           ✓
content-security-policy: [detailed CSP]   ✓
permissions-policy: camera=(), microphone=(), geolocation=()  ✓
referrer-policy: strict-origin-when-cross-origin              ✓
strict-transport-security: max-age=63072000; includeSubDomains; preload  ✓
```
**Result: PASS** — all expected headers present.

### Feature Flags (from /api/health)
- `subscriptions: false` — PAY-010 (subscription checkout) is N/A
- `credits: true` — credit system active
- `byok: true` — BYOK tests applicable
- `eas: true` — EAS/onchain tests applicable

---

## Sweep Execution Plan

### Phase 1: Unauthenticated (Kernel browser, no login)

| Sweep | Tests | Method | Est. Time |
|-------|-------|--------|-----------|
| **S01: Pre-Flight** | PRE-001, PRE-002, PRE-004, PRE-005 | Kernel: navigate, check console, curl | 2 min |
| **S02: Nav Desktop** | NAV-001 to NAV-004 | Kernel: click each nav link, verify URL + active state | 3 min |
| **S03: Nav Mobile** | NAV-005 to NAV-008 | Kernel: set 375px viewport, hamburger menu | 3 min |
| **S04: Nav Footer** | NAV-009 to NAV-015 | Kernel: scroll to footer, click each link | 3 min |
| **S05: Home Page** | HOME-001 to HOME-022 | Kernel: scroll through sections, check elements, links | 5 min |
| **S06: Developers** | DEV-001 to DEV-011 | Kernel: navigate /developers, verify content | 4 min |
| **S07: API Docs** | DOCS-001 to DOCS-003, DOCS-005 | Kernel: navigate /docs/api, verify loads | 2 min |
| **S08: Research/Roadmap** | RES-001 to RES-005 | Kernel: navigate pages, verify content | 2 min |
| **S09: Leaderboard** | LEAD-001 to LEAD-006 | Kernel: navigate, toggle views, search | 2 min |
| **S10: Contact** | CONT-001 (form renders) | Kernel: navigate /contact, verify form | 1 min |
| **S11: Feedback** | CONT-004 (form renders) | Kernel: navigate /feedback, verify form | 1 min |
| **S12: Security** | SEC-001 to SEC-004 | curl + Kernel: XSS payloads, header checks | 3 min |
| **S13: GDPR/Cookies** | GDPR-001 to GDPR-003, GDPR-005 | Kernel: fresh context, check banner, click accept/decline | 3 min |
| **S14: Performance** | PERF-001, PERF-002 | Kernel: check console errors, network failures | 2 min |
| **S15: Data Seeding** | SEED-001 to SEED-004 | Kernel: navigate pages, verify data present | 2 min |
| **S16: Error Pages** | EDGE-010, EDGE-011 | Kernel: navigate to /gibberish, /bout/nonexistent-id | 1 min |
| **S17: Agents (unauth)** | AGENT-001 to AGENT-003 | Kernel: navigate /agents, search, click detail | 2 min |

**Phase 1 total: ~41 min, ~70 test items**

### Phase 2: Authenticated (login via Clerk UI in Kernel)

| Sweep | Tests | Method | Est. Time |
|-------|-------|--------|-----------|
| **S18: Auth Flow** | AUTH-001, AUTH-002, AUTH-005 to AUTH-009 | Kernel: click Sign In, fill form, verify session | 5 min |
| **S19: Bout Start** | BOUT-001 to BOUT-005 | Kernel: go to /arena, click preset, verify status | 3 min |
| **S20: Bout Stream** | BOUT-006 to BOUT-013 | Kernel: watch bout stream, verify text flow | 5 min |
| **S21: Post-Bout** | BOUT-014 to BOUT-017 | Kernel: verify share line, vote, refresh | 3 min |
| **S22: Reactions** | SOC-001 to SOC-004 | Kernel: click reactions, check counters | 3 min |
| **S23: Custom Arena** | BUILD-001 to BUILD-007 | Kernel: /arena/custom, search agents, launch | 5 min |
| **S24: Contact Submit** | CONT-002 | Kernel: fill and submit contact form | 2 min |
| **S25: Feedback Submit** | CONT-005, CONT-006 | Kernel: submit feature request, vote | 2 min |
| **S26: Rage Clicks** | EDGE-001 to EDGE-003 | Kernel: rapid navigation, rapid clicks, double-vote | 3 min |

**Phase 2 total: ~31 min, ~30 test items**

### Phase 3: Human-Only (you do these, I cannot)

| Tests | Reason |
|-------|--------|
| PRE-003 | Physical phone |
| AUTH-003, AUTH-004 | New account signup + email verification |
| BOUT-018 to BOUT-020 | Physical phone streaming |
| HOME-012, HOME-013 | Physical phone overflow "wiggle test" |
| HOME-017 | Verify prices against Stripe dashboard |
| HOME-021, HOME-022 | Newsletter submit + check Resend dashboard |
| DEV-011 | Physical phone code block overflow |
| DOCS-004 | Scalar interactive "Send Request" widget |
| PAY-001 to PAY-010 | Real Stripe payments |
| BYOK-001 to BYOK-008 | Real Anthropic API key + authenticated session |
| AGENT-004 to AGENT-008 | EAS verification, clone flow (auth-gated) |
| SOC-005 to SOC-011 | Clipboard, Slack/Discord unfurl, OG cards, Twitter validator |
| EDGE-004 to EDGE-009 | Tab close/reopen, stale tab, dual-tab |
| CONT-003 | Check Resend dashboard |
| GDPR-004 | PostHog cookie verification timing |
| SEC-002, SEC-003 | XSS in authenticated context (bout topic, agent name) |
| SEC-005 | Cookie consent + analytics cookie verification |
| PERF-003 to PERF-005 | Lighthouse, physical phone scroll |

---

## Results Template

Each test will be recorded as:

```
| ID | Agent Result | Evidence | Notes |
```

Results will be written to `docs/agentic-qa-results.md` after execution.

---

## Auth Details

- **Clerk mode:** Development (`pk_test_` / `sk_test_`)
- **Test accounts** (from `qa/scripts/setup-accounts.ts`):
  - `qa-standard@thepit.cloud` — Free tier, 500 credits, password: `QaTest123!`
  - `qa-premium@thepit.cloud` — Pit Pass, 1000 credits, password: `QaTest123!`
  - `qa-exhausted@thepit.cloud` — Free tier, 0 credits, password: `QaTest123!`
- **Auth mechanism:** Cookie-based (`__session` JWT cookie)
- **Login strategy:** Navigate to `/sign-in`, fill email/password via Kernel Playwright, submit
- **Admin endpoints:** Use `x-admin-token` header (separate from Clerk)

## Key URLs

| Page | URL |
|------|-----|
| Home | `https://www.thepit.cloud/` |
| Arena | `https://www.thepit.cloud/arena` |
| Agents | `https://www.thepit.cloud/agents` |
| Leaderboard | `https://www.thepit.cloud/leaderboard` |
| Research | `https://www.thepit.cloud/research` |
| Citations | `https://www.thepit.cloud/research/citations` |
| Developers | `https://www.thepit.cloud/developers` |
| Roadmap | `https://www.thepit.cloud/roadmap` |
| Contact | `https://www.thepit.cloud/contact` |
| Feedback | `https://www.thepit.cloud/feedback` |
| API Docs | `https://www.thepit.cloud/docs/api` |
| Privacy | `https://www.thepit.cloud/privacy` |
| Terms | `https://www.thepit.cloud/terms` |
| Security | `https://www.thepit.cloud/security` |
| Disclaimer | `https://www.thepit.cloud/disclaimer` |
| Sign In | `https://www.thepit.cloud/sign-in` |
| Sign Up | `https://www.thepit.cloud/sign-up` |
| Health API | `https://www.thepit.cloud/api/health` |
| Custom Arena | `https://www.thepit.cloud/arena/custom` |

## Coverage Summary

| Category | Agent Can Test | Human Only | Total |
|----------|---------------|------------|-------|
| Pre-Flight (0) | 3 | 2 | 5 |
| Navigation (1) | 15 | 0 | 15 |
| Home Page (2) | 17 | 5 | 22 |
| Developers (3) | 10 | 1 | 11 |
| API Docs (4) | 3 | 2 | 5 |
| Auth (5) | 5 | 4 | 9 |
| Core Loop (6) | 17 | 3 | 20 |
| Engagement (7) | 4 | 7 | 11 |
| Custom Arena (8) | 7 | 0 | 7 |
| Credits (9) | 0 | 10 | 10 |
| BYOK (10) | 0 | 8 | 8 |
| Agents (11) | 3 | 5 | 8 |
| Leaderboard (12) | 6 | 0 | 6 |
| Research (13) | 5 | 0 | 5 |
| Contact (14) | 4 | 2 | 6 |
| Edge Cases (15) | 5 | 6 | 11 |
| Security (16) | 2 | 3 | 5 |
| GDPR (17) | 3 | 2 | 5 |
| Performance (18) | 2 | 3 | 5 |
| Data Seeding (19) | 4 | 0 | 4 |
| **TOTAL** | **~100** | **~30** | **~130** |

**Agent coverage: ~77%**

---

## Next Steps (after restart)

1. Restart Claude Code session (so Kernel MCP tools load)
2. Reference this file: `docs/agentic-qa-sweep.md`
3. Say "continue the QA sweep" and I'll pick up from Phase 1, Sweep S01
4. Results written to `docs/agentic-qa-results.md` as we go
