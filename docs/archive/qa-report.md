# The Pit - Launch QA Report

```yaml
---
version: "2.0.0"
generated: "2026-02-14"
application: "The Pit - AI Battle Arena"
url: "https://thepit.cloud"
estimated_time: "2-3 hours"
legend:
  "[ ]": "Not tested"
  "[x]": "Pass"
  "[FAIL]": "Failed — note the issue, keep going, triage at end"
priority:
  P0: "Blocker — fix before launch (payments, crashes, security)"
  P1: "Critical — fix before launch (broken layout, mobile unusable)"
  P2: "Polish — can launch with (typos, animation jitter)"
  P3: "Nice-to-have — post-launch (empty states, minor copy)"
---
```

**Instructions:**
1. Execute every line. Do not skip.
2. If a line fails, mark `[FAIL]`, write a note, keep going. Do not fix inline.
3. Finish the full list. Then triage: fix P0s and P1s. Ignore P2s and P3s.
4. When every P0 and P1 is resolved, launch.

---

## 0. Pre-Flight (5 mins)

- [ ] **PRE-001:** Open `https://thepit.cloud` in Chrome Incognito (desktop).
- [ ] **PRE-002:** Open DevTools Console. Note any red errors on initial load.
  - _Ignore: generic hydration warnings. Watch for: 404s, failed fetches, Clerk errors._
- [ ] **PRE-003:** Open `https://thepit.cloud` on your physical phone (Safari/Chrome).
- [ ] **PRE-004:** Verify HTTPS padlock is present (no mixed content warnings).
- [ ] **PRE-005:** Check `https://thepit.cloud/api/health` returns 200 with DB latency.

---

## 1. Navigation & Layout (10 mins)

### Desktop
- [ ] **NAV-001:** Site Header logo "The Pit" links to `/`.
- [ ] **NAV-002:** All 9 desktop nav links work: Home, Arena, All agents, Leaderboard, Research, Developers, Roadmap, Contact, Feedback.
- [ ] **NAV-003:** Current page link is highlighted with accent color.
- [ ] **NAV-004:** "Developers" link is visible in the header nav (newly added).

### Mobile
- [ ] **NAV-005:** Hamburger menu button appears on mobile viewport.
- [ ] **NAV-006:** Hamburger opens/closes smoothly (no layout jump).
- [ ] **NAV-007:** Clicking a menu link closes the menu AND navigates.
- [ ] **NAV-008:** "Developers" link appears in the mobile menu.

### Footer
- [ ] **NAV-009:** Footer renders with copyright.
- [ ] **NAV-010:** "Developers" link appears in footer (newly added).
- [ ] **NAV-011:** "Privacy" link loads `/privacy` with content.
- [ ] **NAV-012:** "Terms" link loads `/terms` with content.
- [ ] **NAV-013:** "Security" link loads `/security` with content.
- [ ] **NAV-014:** "Disclaimer" link loads `/disclaimer` with content.
- [ ] **NAV-015:** Social links render only if enabled (env-gated). If shown, they open in new tabs.

---

## 2. Home Page — The "5-Second Test" (10 mins)

_Goal: A stranger can understand what this product does in 5 seconds._

### Hero
- [ ] **HOME-001:** Hero text loads instantly without layout shift.
- [ ] **HOME-002:** "Enter the Arena" CTA is visible above the fold.
- [ ] **HOME-003:** CTA links to `/arena` (or `/sign-up?redirect_url=/arena` for guests).

### How It Works
- [ ] **HOME-004:** 3-step section renders (Pick, Watch, Vote or similar).

### Featured Presets
- [ ] **HOME-005:** Preset cards render with names and descriptions.

### Research Layer
- [ ] **HOME-006:** Research section renders with headline and body copy.

### Builder Showcase (NEW)
- [ ] **HOME-007:** Terminal-styled showcase renders between Research and Pricing.
- [ ] **HOME-008:** Left column: headline, body copy, 2 CTAs visible.
- [ ] **HOME-009:** "API Reference" CTA links to `/docs/api`.
- [ ] **HOME-010:** "CLI Toolchain" CTA links to `/developers`.
- [ ] **HOME-011:** Right column: fake terminal renders `pitforge` commands.
- [ ] **HOME-012:** **MOBILE:** Terminal does NOT overflow horizontally. Code is readable.
- [ ] **HOME-013:** **MOBILE:** The entire showcase section is usable without horizontal scroll.

### Pricing
- [ ] **HOME-014:** 3 pricing cards render: Free / Pit Pass / Pit Lab.
- [ ] **HOME-015:** Free tier shows correct features.
- [ ] **HOME-016:** Pit Lab shows "Headless API access" and "CLI toolchain (pitforge)" (newly added).
- [ ] **HOME-017:** Prices are correct (verify against Stripe dashboard).

### Intro Pool Counter
- [ ] **HOME-018:** Counter is visible and ticking down.
- [ ] **HOME-019:** Counter decrements roughly every second.
- [ ] **HOME-020:** If pool is exhausted, shows "Pool drained" message with sign-up link.

### Newsletter
- [ ] **HOME-021:** Newsletter signup form renders.
- [ ] **HOME-022:** Submit a test email. Confirm no error. (Check Resend dashboard for delivery.)

---

## 3. The Developers Page (NEW) (10 mins)

_Goal: An AI engineer visiting from HN finds this page credible and useful._

- [ ] **DEV-001:** Navigate to `/developers`.
- [ ] **DEV-002:** Hero section: "The Arena is an API." headline renders.
- [ ] **DEV-003:** Toolchain grid: 4 cards (pitforge, pitbench, pitnet, pitlab).
- [ ] **DEV-004:** Heading says "Four CLIs. One mission." (not "Five").
- [ ] **DEV-005:** Each card has a code snippet that is legible.
- [ ] **DEV-006:** Each "View source" link opens GitHub in a new tab.
- [ ] **DEV-007:** Verify all 4 GitHub links resolve (not 404):
  - [ ] `github.com/rickhallett/thepit/tree/master/pitforge`
  - [ ] `github.com/rickhallett/thepit/tree/master/pitbench`
  - [ ] `github.com/rickhallett/thepit/tree/master/pitnet`
  - [ ] `github.com/rickhallett/thepit/tree/master/pitlab`
- [ ] **DEV-008:** Workflow section: 3 numbered steps with CLI commands.
- [ ] **DEV-009:** "Get Lab Access" CTA links to `/arena#upgrade`.
- [ ] **DEV-010:** "API Reference" CTA links to `/docs/api`.
- [ ] **DEV-011:** **MOBILE:** Page is readable. Code blocks do not overflow.

---

## 4. API Documentation (10 mins)

- [ ] **DOCS-001:** Navigate to `/docs/api`.
- [ ] **DOCS-002:** Scalar API reference page loads (not blank, not error).
- [ ] **DOCS-003:** Endpoint definitions are visible and readable.
- [ ] **DOCS-004:** Try "Send Request" on a public endpoint (e.g., GET /api/health). Does it work?
- [ ] **DOCS-005:** This page works **without** being logged in (spec is now public).

---

## 5. Authentication (Clerk) (10 mins)

_Use a fresh Incognito window for this section._

- [ ] **AUTH-001:** Click "Sign In" in header. Redirects to Clerk sign-in page.
- [ ] **AUTH-002:** Clerk page loads without errors (no CSP blocks, no blank page).
- [ ] **AUTH-003:** Sign up with a new test email (e.g., `test+launch@yourdomain.com`).
- [ ] **AUTH-004:** Email verification (if enabled) works — check inbox.
- [ ] **AUTH-005:** After sign-up, redirects back to the app (not stuck on Clerk).
- [ ] **AUTH-006:** User avatar/name appears in header after login.
- [ ] **AUTH-007:** Intro bonus credits appear (check header balance — should be ~500-600).
- [ ] **AUTH-008:** Sign out. Session clears. Header reverts to "Sign In" button.
- [ ] **AUTH-009:** Sign back in. Session restores correctly.

---

## 6. The Core Loop — Free Tier Bout (20 mins)

_This is the main value proposition. Test on both desktop AND mobile._

### Bout Start
- [ ] **BOUT-001:** Go to `/arena`. Preset cards render in a grid.
- [ ] **BOUT-002:** Click a Free preset (e.g., "Roast Battle").
- [ ] **BOUT-003:** Redirects to `/bout/[id]`.
- [ ] **BOUT-004:** Status shows "Warming Up" initially.
- [ ] **BOUT-005:** Status transitions to "Live" when streaming starts.

### The Stream
- [ ] **BOUT-006:** Text streams visibly (not dumped all at once).
- [ ] **BOUT-007:** "Thinking..." indicator appears between turns (2-4s delay).
- [ ] **BOUT-008:** Auto-scroll keeps the latest text in view as it streams.
- [ ] **BOUT-009:** Scroll UP manually. Auto-scroll pauses.
- [ ] **BOUT-010:** "Jump to Latest" button appears when scrolled up.
- [ ] **BOUT-011:** Click "Jump to Latest". Scrolls back to bottom, auto-scroll resumes.
- [ ] **BOUT-012:** Watch the entire bout to completion.
- [ ] **BOUT-013:** Status changes to "Complete".

### Post-Bout
- [ ] **BOUT-014:** "Share Line" (AI summary) appears at the bottom.
- [ ] **BOUT-015:** Vote panel appears. Cast a vote for a winner.
- [ ] **BOUT-016:** UI updates to "Vote Locked" (cannot change vote).
- [ ] **BOUT-017:** Refresh the page. Full transcript loads instantly (replay mode, not re-streamed).

### Mobile Streaming (repeat on phone)
- [ ] **BOUT-018:** **PHONE:** Start a bout. Does it load?
- [ ] **BOUT-019:** **PHONE:** Does auto-scroll work? Text stays pinned to bottom?
- [ ] **BOUT-020:** **PHONE:** Does the page wiggle horizontally? (Overflow test)

---

## 7. Engagement & Sharing (10 mins)

- [ ] **SOC-001:** Click "Heart" reaction on a message. Counter increments by 1.
- [ ] **SOC-002:** Click "Heart" again. Does it toggle off, or stay? (Document behavior.)
- [ ] **SOC-003:** Click "Fire" reaction. Counter increments.
- [ ] **SOC-004:** Rapid-click a reaction 20 times. Does the UI crash? Does rate limiting trigger gracefully?
- [ ] **SOC-005:** Click "Share" button. Link is copied to clipboard (toast or "Copied" text).
- [ ] **SOC-006:** Paste the shared link in a new Incognito window. Replay page (`/b/[id]`) loads.
- [ ] **SOC-007:** Replay shows full transcript without streaming.
- [ ] **SOC-008:** Replay page shows OG metadata (check page title in browser tab).

### OG Card / Social Unfurl
- [ ] **SOC-009:** Paste a bout URL into Slack/Discord. Does an OG card render with title and image?
- [ ] **SOC-010:** Paste `https://thepit.cloud` into Slack/Discord. Does the homepage OG card render?
- [ ] **SOC-011:** (Optional) Use https://cards-dev.twitter.com/validator or similar to verify Twitter card.

---

## 8. Custom Arena — Builder Flow (10 mins)

- [ ] **BUILD-001:** Navigate to `/arena/custom`.
- [ ] **BUILD-002:** Search for an agent (e.g., "Socrates").
- [ ] **BUILD-003:** Select 2 agents. "Launch" button becomes active.
- [ ] **BUILD-004:** Select a 7th agent. UI prevents selection (max 6 cap).
- [ ] **BUILD-005:** Enter a custom topic.
- [ ] **BUILD-006:** Launch the bout. Custom bout runs with selected agents and topic.
- [ ] **BUILD-007:** Bout completes successfully.

---

## 9. Credits & Payments — Real Money (15 mins)

_**WARNING:** This uses real Stripe in live mode. Use a real card._

- [ ] **PAY-001:** Check current credit balance in header.
- [ ] **PAY-002:** Click "Buy Credits" / upgrade CTA.
- [ ] **PAY-003:** Stripe Checkout page loads (correct amount, correct currency).
- [ ] **PAY-004:** Complete payment with real card.
- [ ] **PAY-005:** Redirects back to `/arena` (not stuck on Stripe, not a blank page).
- [ ] **PAY-006:** Credit balance in header updates (confirms webhook hit the DB).
- [ ] **PAY-007:** Run a premium bout. Verify credits deduct by expected amount.
- [ ] **PAY-008:** Check credit history section in `/arena`. Transaction appears.

### Stripe Edge Cases
- [ ] **PAY-009:** Start checkout. Hit browser "Back" button before completing. Return to site. No crash, no phantom credits.
- [ ] **PAY-010:** (If subscriptions enabled) Verify Pit Pass / Pit Lab pricing and checkout flow.

---

## 10. BYOK — Bring Your Own Key (10 mins)

_Requires a valid Anthropic API key (`sk-ant-...`)._

- [ ] **BYOK-001:** Log in. Go to Arena. Select a preset with BYOK option.
- [ ] **BYOK-002:** Select "BYOK" from model dropdown.
- [ ] **BYOK-003:** BYOK key input field appears.
- [ ] **BYOK-004:** Enter a valid `sk-ant-...` key.
- [ ] **BYOK-005:** Click "Verify" link. Opens `github.com/.../byok-stash/route.ts` in new tab.
- [ ] **BYOK-006:** Start the bout. It runs using your key.
- [ ] **BYOK-007:** Credits are NOT deducted (BYOK uses your own key/billing).
- [ ] **BYOK-008:** Enter an invalid key (e.g., `sk-ant-bad`). Start bout. Expect clear error message.

---

## 11. Agents & Lineage (10 mins)

- [ ] **AGENT-001:** Go to `/agents`. Agent catalog renders.
- [ ] **AGENT-002:** Search for an agent. Results filter correctly.
- [ ] **AGENT-003:** Click an agent. Detail modal/page opens with stats.
- [ ] **AGENT-004:** "View Onchain" link (if EAS enabled) opens block explorer.
- [ ] **AGENT-005:** Click "Clone" on an agent. Redirects to builder with pre-filled data.
- [ ] **AGENT-006:** Modify one field. Save the cloned agent.
- [ ] **AGENT-007:** New agent appears in catalog.
- [ ] **AGENT-008:** Run a bout with the cloned agent. It works.

---

## 12. Leaderboard (5 mins)

- [ ] **LEAD-001:** Go to `/leaderboard`. Page loads.
- [ ] **LEAD-002:** If data exists: table renders with sortable columns.
- [ ] **LEAD-003:** If no data: "No votes yet" empty state message shows (not a crash).
- [ ] **LEAD-004:** Toggle between "Agents" and "Players" views.
- [ ] **LEAD-005:** Toggle between time ranges (All / Week / Day).
- [ ] **LEAD-006:** Search works.

---

## 13. Research & Roadmap (5 mins)

- [ ] **RES-001:** Go to `/research`. Page loads with static content sections.
- [ ] **RES-002:** If no export exists: "No exports available yet. Check back soon." (not a crash).
- [ ] **RES-003:** Go to `/research/citations`. Page loads.
- [ ] **RES-004:** Go to `/roadmap`. All 3 lanes render (Done / Active / Planned).
- [ ] **RES-005:** Roadmap items are accurate (no stale "planned" items that are actually shipped).

---

## 14. Contact & Feedback (5 mins)

- [ ] **CONT-001:** Go to `/contact`. Form renders.
- [ ] **CONT-002:** Submit the form with valid data. Success message appears.
- [ ] **CONT-003:** Check Resend dashboard — email was delivered.
- [ ] **CONT-004:** Go to `/feedback`. Feature request form renders.
- [ ] **CONT-005:** (Logged in) Submit a feature request. It appears in the list.
- [ ] **CONT-006:** Vote on a feature request. Counter increments.

---

## 15. Resilience & Edge Cases (15 mins)

### The "Rage Click" Test
- [ ] **EDGE-001:** Go to Arena. Click "Enter" on a preset. Immediately hit "Back." Click "Enter" again. No crash.
- [ ] **EDGE-002:** Rapid-click reaction buttons 20 times. UI recovers. Rate limiter triggers gracefully (no 500, no crash).
- [ ] **EDGE-003:** Double-click the "Vote" button. Only one vote registers.

### The "Mid-Stream Death" Test
- [ ] **EDGE-004:** Start a bout. Wait for Turn 2. Close the tab.
- [ ] **EDGE-005:** Wait 60 seconds.
- [ ] **EDGE-006:** Go back to `/arena`. Check credit history. Credits settled correctly (not double-charged).
- [ ] **EDGE-007:** Navigate to the bout page (`/bout/[id]` or "Recent Bouts"). Transcript shows partial content or "Faulted" status — NOT corrupted.

### The "Stale Tab" Test
- [ ] **EDGE-008:** Open a bout in one tab. Open the same bout in another tab. No conflict.
- [ ] **EDGE-009:** Leave a tab open for 10+ minutes. Come back. Page still works (Clerk session not expired).

### Error Pages
- [ ] **EDGE-010:** Go to `thepit.cloud/gibberish`. Shows styled 404 page (not generic Vercel error).
- [ ] **EDGE-011:** Go to `thepit.cloud/bout/nonexistent-id`. Shows appropriate error (not crash).

---

## 16. Security Spot Checks (5 mins)

- [ ] **SEC-001:** Try `thepit.cloud/api/admin/seed-agents` in browser. Returns 401 (not data).
- [ ] **SEC-002:** Enter `<script>alert(1)</script>` as a bout topic. Text is escaped in UI (no XSS).
- [ ] **SEC-003:** Enter `<img src=x onerror=alert(1)>` as agent name. Text is escaped.
- [ ] **SEC-004:** Check response headers: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` present.
- [ ] **SEC-005:** Cookie consent banner appears on first visit (Incognito). Analytics cookies NOT set until accepted.

---

## 17. Cookie Consent / GDPR (5 mins)

- [ ] **GDPR-001:** Open site in Incognito. Cookie banner appears at bottom.
- [ ] **GDPR-002:** Click "Decline." Banner dismisses. No PostHog/analytics cookies set.
- [ ] **GDPR-003:** Open site in new Incognito. Click "Accept." Banner dismisses.
- [ ] **GDPR-004:** Check cookies: `pit_consent=accepted` present. PostHog cookies appear after reload.
- [ ] **GDPR-005:** "Privacy" link in banner leads to `/privacy`.

---

## 18. Performance & Console (5 mins)

- [ ] **PERF-001:** Open DevTools > Network. Reload homepage. No failed requests (red entries).
- [ ] **PERF-002:** Open DevTools > Console. No critical errors (red). Note any warnings.
- [ ] **PERF-003:** Lighthouse quick check: Performance score > 60 on desktop. (Don't obsess — just no catastrophic issues.)
- [ ] **PERF-004:** **MOBILE:** Full page scroll. No horizontal overflow ("wiggle test").
- [ ] **PERF-005:** **MOBILE:** Tap the address bar to scroll to top. Page responds normally.

---

## 19. Data Seeding Check (5 mins)

_Empty pages look broken to first-time visitors. Verify these have content or acceptable empty states._

- [ ] **SEED-001:** Leaderboard has at least some data (run a bout and vote if empty).
- [ ] **SEED-002:** Agent catalog has preset agents (run `POST /api/admin/seed-agents` if empty).
- [ ] **SEED-003:** Feature requests page — at least 1-2 seed requests exist.
- [ ] **SEED-004:** Research page — either generate an export or verify empty state message is acceptable.

---

## 20. Go CLI Toolchain Verification (PR #181)

_Automated test results from `make gate` across all 5 Go tools._

### Test Coverage Summary (199 tests, all passing)

| Tool | Tests | Coverage Highlights |
|------|-------|-------------------|
| pitforge | 79 | prompt: 100%, agent: 96%, anthropic: 87.8%, canon: 84.1%, dna: 77.8%, cmd: 19.8% |
| pitbench | 31 | pricing: 100%, cmd: 94.3% |
| pitctl | 34 | alert: 97.7%, cmd: 6.4% |
| pitlab | 28 | analysis: 100%, dataset: 100%, cmd: 94.1% |
| pitnet | 27 | abi: 91.3%, chain: 81.2%, cmd: 23.4% |

### Cross-Implementation Parity (Go vs TypeScript)
- [x] **CLI-001:** DNA prompt hashing (SHA-256 + RFC 8785) — 3 golden values byte-identical with `lib/agent-dna.ts`
- [x] **CLI-002:** DNA manifest hashing — 2 golden values byte-identical with `lib/agent-dna.ts`
- [x] **CLI-003:** RFC 8785 canonicalization — 11 cases byte-identical with npm `canonicalize`
- [x] **CLI-004:** Credit cost calculations — 6 models verified against `lib/credits.ts`
- [x] **CLI-005:** Bout estimation — 3 scenarios verified against `lib/credits.ts`
- [x] **CLI-006:** BYOK fee calculation — 3 scenarios including min charge, verified against `lib/credits.ts`
- [x] **CLI-007:** ABI encode/decode round-trip with real DNA hashes
- [x] **CLI-008:** Model pricing tables (4 models) match `lib/credits.ts`

### Bug Fixes Verified
- [x] **CLI-009:** pitforge `DefaultModel` updated from deprecated `claude-3-5-haiku-latest`
- [x] **CLI-010:** pitbench estimate/cost default model updated from deprecated ID
- [x] **CLI-011:** pitnet `lib/pq` dependency added to go.mod
- [x] **CLI-012:** pitctl smoke `--strict` flag wired through main.go dispatch
- [x] **CLI-013:** pitctl 37 silent `QueryVal` error drops replaced with `queryWarn()` stderr warnings

---

## Triage Summary

_Fill this out AFTER completing all sections._

### P0 — Blockers (must fix before launch)
| ID | Description | Status |
|----|-------------|--------|
|    |             |        |

### P1 — Critical (must fix before launch)
| ID | Description | Status |
|----|-------------|--------|
|    |             |        |

### P2 — Polish (can launch with)
| ID | Description | Status |
|----|-------------|--------|
|    |             |        |

### P3 — Nice-to-have (post-launch)
| ID | Description | Status |
|----|-------------|--------|
|    |             |        |

---

## Sign-Off

- [ ] All P0 items resolved.
- [ ] All P1 items resolved.
- [ ] PR #136 merged.
- [ ] Production deployment verified.
- [ ] **LAUNCH.**
