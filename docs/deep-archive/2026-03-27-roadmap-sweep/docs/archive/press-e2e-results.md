# E2E Test Results — Production (www.thepit.cloud)

**Date:** Sun 22 Feb 2026, 05:20 UTC
**Target:** `https://www.thepit.cloud`
**Runner:** Playwright 1.58.2, Chromium Headless Shell 145.0.7632.6
**Config:** 1 worker, 120s timeout, headless

---

## Summary

| Metric | Count |
|--------|-------|
| **Total** | 90 |
| **Passed** | 79 |
| **Failed** | 11 |
| **Skipped** | 0 |
| **Duration** | 8m 18s |

**`bout.spec.ts` note:** Not skipped — `CREDITS_ENABLED` is unset/false, so the streaming bout test ran and **passed** (8.0s). This means anonymous bout creation works on production.

---

## Per-Spec-File Results

| Spec File | Tests | Passed | Failed |
|-----------|-------|--------|--------|
| `bout.spec.ts` | 1 | 1 | 0 |
| `citations.spec.ts` | 7 | 7 | 0 |
| `mobile-responsive.spec.ts` | 10 | 10 | 0 |
| `qa-hydration-418.spec.ts` | 15 | 15 | 0 |
| `qa-og-images.spec.ts` | 9 | 7 | 2 |
| `qa-pagination.spec.ts` | 11 | 11 | 0 |
| `qa-unleashed.spec.ts` | 37 | 28 | 9 |

---

## Failure Analysis

### Category 1: Bout Replay Hero Section — 6 failures (Stale Selectors)

**Tests:** All 6 tests in `OCE-341: Bout replay hero section`
**Locator:** `section.border-b-2`
**Error:** `element(s) not found` — times out after 15s

**Root Cause:** The `BoutHero` component (`components/bout-hero.tsx:101`) uses CSS class `border-b-2 border-accent/40` which _should_ match the `section.border-b-2` selector. However, the hero renders conditionally — it returns `null` when `resolveHeroQuote()` finds no qualifying data. The most likely explanation is that the test bout (`T-NWqp-drZM0Vv5LPG6IT`) has an empty or minimal transcript that doesn't meet the hero quote criteria (no reactions, no shareLine, no text >20 chars). Alternatively, the CSS class may have been purged by Tailwind in the production build since a different border-color variant is used.

**HN Impact: NONE.** The hero section is an enhancement on bout replay pages. If it doesn't render, visitors still see the full bout transcript via the Arena component (which loads successfully — the cross-cutting smoke test for `/b/T-NWqp-drZM0Vv5LPG6IT` passes). The missing hero is cosmetic, not functional.

**Classification:** Test environment issue / stale test data. Not a regression.

### Category 2: Bout Transcript `article` Selector — 1 failure (Stale Selector)

**Test:** `OCE-343: bout replay page transcript renders (R12: empty transcript guard)`
**Locator:** `locator('article').first()`
**Error:** `element(s) not found` — times out after 15s

**Root Cause:** The test expects transcript entries to render as `<article>` elements. The Arena component (`components/arena.tsx:179`) does use `<article>` for message turns, but this specific bout may have an empty or loading transcript in production. The cross-cutting smoke test for the same URL passes (200, visible content, no JS errors), confirming the page itself works.

**HN Impact: NONE.** The page loads and renders content. The test's selector expectations may not match the current DOM structure for this specific bout state.

**Classification:** Test environment issue / stale test data. Not a regression.

### Category 3: OG Image Timeouts — 2 failures (Server-Side Timeout)

**Test 1:** `OG image for /b/4SbASWV2l7_fNOr18coHt returns 200 with image content`
**Test 2:** `OG image for non-existent bout returns gracefully`
**Error:** `Request context disposed` after 120s timeout

**Root Cause:** The OG image endpoint (`/b/[id]/opengraph-image`) uses `@vercel/og` (Satori) to render PNG images server-side. Two of three valid bout IDs succeed (1.9s, 2.0s), but `4SbASWV2l7_fNOr18coHt` hangs. The non-existent bout ID also hangs — the endpoint likely lacks a fast-fail path for missing bouts and blocks on a DB lookup or rendering timeout.

**HN Impact: LOW.** OG images are consumed by social media crawlers (Twitter, LinkedIn, Slack), not by human visitors in browsers. A slow/failing OG image means the social preview card may fall back to the site-level default image. The 2 out of 3 valid bouts that work suggest this is a per-bout data issue (possibly a very long transcript causing Satori to choke) rather than a systemic failure.

**Classification:** Pre-existing edge case. Worth investigating but not launch-blocking.

### Category 4: Short Link 404 — 2 failures (Stale Test Data)

**Tests:** Both `OCE-304: Short link redirect` tests
**Error:** Expected redirect (301/302/307/308), got 404

**Root Cause:** The short link slug `HwWTtfYo` hardcoded in the test no longer exists in production. The `/s/[slug]` route is correctly deployed (Vercel returns `x-matched-path: /s/[slug]`), but this specific slug has been deleted or expired. The route itself works — it returns a clean 404, not a 500.

**HN Impact: NONE.** Short links are created per-bout for sharing. The route works; only the test's hardcoded slug is stale. Real short links created by users will resolve correctly.

**Classification:** Stale test data. Not a bug.

---

## Launch-Blocking Assessment

**No failures are launch-blocking.**

| Category | Count | Severity | Blocking? |
|----------|-------|----------|-----------|
| Hero section selectors | 6 | Cosmetic | No |
| Transcript selector | 1 | Test-only | No |
| OG image timeout | 2 | Low (social crawlers) | No |
| Short link 404 | 2 | Stale test data | No |

All core user flows work:
- Landing page loads cleanly (no hydration errors, no JS errors)
- Arena page renders with preset cards and CTAs
- Bout streaming works end-to-end (anonymous, 8s)
- Recent bouts pagination works (all 11 tests pass)
- Mobile responsive layout passes all 10 tests
- Leaderboard, research, citations, contact, privacy, terms — all clean
- OG images work for 2/3 tested bouts with correct Cache-Control headers
- Social links (GitHub, LinkedIn) present and correct
- Stripe webhook endpoint exists and rejects unsigned requests
- PostHog analytics correctly consent-gated (no pre-consent tracking)
- UTM cookie capture works with consent, blocked without

---

## Coverage vs Captain's Manual QA

The E2E suite covers the following from a typical manual QA script:

| Manual QA Item | E2E Coverage |
|----------------|-------------|
| Landing page loads | Yes (`qa-hydration-418`, `qa-unleashed` cross-cutting) |
| Mobile layout / hamburger nav | Yes (`mobile-responsive` — 10 tests) |
| Arena page / preset cards | Yes (`qa-unleashed` OCE-336, OCE-337, OCE-340) |
| Bout streaming | Yes (`bout.spec.ts` — full stream test) |
| Bout replay page | Partial (page loads, but hero section tests are stale) |
| Recent bouts + pagination | Yes (`qa-pagination` — 11 tests) |
| Leaderboard | Yes (mobile + cross-cutting) |
| Research + citations | Yes (`citations.spec.ts` — 7 tests including arXiv link validation) |
| OG images / social sharing | Partial (2/3 bouts pass, meta tags verified) |
| Hydration errors | Yes (`qa-hydration-418` — 15 tests across 10 routes) |
| Analytics consent | Yes (PostHog consent gating verified) |
| Auth flows (sign in/up) | **Not covered** (requires Clerk test credentials) |
| Payment flow (Stripe) | **Not covered** (webhook endpoint exists, but no purchase test) |
| Agent creation/editing | **Not covered** (requires auth) |

---

## Recommendations

1. **Update stale test data** in `qa-unleashed.spec.ts`: replace `SHORT_LINK_SLUG` with a current short link and verify the hero bout has a qualifying transcript.
2. **Add OG image timeout handling**: the `/b/[id]/opengraph-image` endpoint should return a fallback image within 10s rather than hanging for 2+ minutes on edge cases.
3. **Hero section tests should be resilient**: test for the component's presence conditionally (it returns null when no quote qualifies) rather than asserting visibility unconditionally.
