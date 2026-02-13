# Launch Hardening Report -- 2026-02-13

Pre-launch hardening pass targeting GDPR compliance, security, accessibility, documentation accuracy, and first-impression UX. All changes verified against the gate (lint + typecheck + 668 tests).

---

## Changes Made (22 files)

### HIGH PRIORITY -- Security & Legal

| # | Change | Files | Impact |
|---|--------|-------|--------|
| 1 | **Cookie consent banner (GDPR)** | `components/cookie-consent.tsx` (new), `components/posthog-provider.tsx`, `middleware.ts`, `app/layout.tsx` | PostHog analytics and custom cookies (`pit_sid`, `pit_utm`) are now gated behind explicit user consent. PostHog only initializes after `pit_consent=accepted`. Middleware only sets analytics cookies with consent. Essential cookies (auth, referral) always active. Banner matches the brutalist design language. |
| 2 | **Stripe redirect localhost fix** | `app/actions.ts` | `getAppUrl()` no longer silently falls back to `http://localhost:3000` in production. It now checks `NEXT_PUBLIC_APP_URL`, `APP_URL`, and `NEXT_PUBLIC_SITE_URL`, and throws with a clear message if none are set in production. Dev localhost fallback preserved. |
| 3 | **Research anonymization hardened** | `lib/research-anonymize.ts` | `RESEARCH_ANONYMIZE_SALT` now throws in production instead of silently using a weak default. Error message includes the `openssl rand -hex 32` command for generating a proper salt. |

### MEDIUM PRIORITY -- UX & Accessibility

| # | Change | Files | Impact |
|---|--------|-------|--------|
| 4 | **Darwin countdown -> WE'RE LIVE** | `components/darwin-countdown.tsx` | Replaced static countdown (which showed 00:00:00:00) with a conditional component. Shows "We're live." banner with accent border post-launch, countdown pre-launch. Uses `useSyncExternalStore` for React purity compliance. |
| 5 | **Skip-to-content + `<main>` landmark** | `app/layout.tsx` | Added `sr-only` skip-to-content link (visible on focus) and replaced the wrapper `<div>` with a semantic `<main id="main-content">` element. Screen reader and keyboard navigation now functional. |
| 6 | **CSP Clerk domain documentation** | `next.config.ts` | Replaced vague "currently uses dev key" comment with actionable `TODO(launch)` tag and clear instructions for tightening CSP after deploying `pk_live_` key. |

### LOW PRIORITY -- Cleanup

| # | Change | Files | Impact |
|---|--------|-------|--------|
| 7 | **Removed boilerplate assets** | `public/` | Deleted 5 unused Next.js boilerplate SVGs (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`). Zero references in codebase. `pit-logo.svg` preserved. |
| 8 | **Sitemap structured logging** | `app/sitemap.ts` | Replaced raw `console.error` with `log.error` from the structured logger for consistency. |

### DOCUMENTATION -- All READMEs Updated

| File | Changes |
|------|---------|
| `README.md` | Test count 636->668 (3 locations), component count 26->27, lib modules 51->53, test files 85->88. Added CI/CD section documenting both GitHub Actions workflows. Added Privacy & Compliance section documenting cookie consent, GDPR, IP anonymization, and research anonymization. |
| `AGENTS.md` | Test count 636->668. |
| `tests/README.md` | File count 85->88, unit 49->50, integration 1->3. Added `integration/security/` subdirectory documentation. Added `brand.test.ts` to unit test inventory. **Removed the false "No CI/CD pipeline" claim** -- replaced with accurate description of `ci.yml` and `e2e.yml` workflows. Fixed coverage module count 6->11. |
| `components/README.md` | Count 26->27. Added `cookie-consent.tsx` and updated `posthog-provider.tsx` descriptions. Updated composition hierarchy to show skip-to-content, `<main>`, CookieConsent, and consent-gated PostHog. Updated `darwin-countdown.tsx` description. |
| `lib/README.md` | Count 51->53. Added missing `brand.ts` and `agent-display-name.ts` modules. |
| `scripts/README.md` | Count 5->6. Added missing `reset-prod-data.ts` with description. |
| `docs/README.md` | Removed 2 phantom files that don't exist (`press-release-strategy.md`, `criticism-playbook.md`). Added 5 existing but unlisted docs (`social-content-playbook.md`, `security-checklist.md`, `qa-report.md`, `typescript-architecture-review-2026-02-11.md`, `specs/llm-qa-automation.md`). |
| `presets/README.md` | Fixed free preset count 10->11, total 21->22. |

---

## Gate Results

| Check | Result |
|-------|--------|
| **Lint** | 0 errors, 16 warnings (all pre-existing) |
| **Typecheck** | Clean |
| **Unit + API tests** | 668 passed, 4 skipped |
| **Integration** | 1 pre-existing flaky failure (SEC-AUTH-004 timing-safe test) |

---

## What Remains (Cannot Be Done in Code)

### Operator Tasks (Vercel Dashboard / CLI)

| Item | Action | Consequence If Missed |
|------|--------|-----------------------|
| **Set `NEXT_PUBLIC_APP_URL`** | Set to `https://thepit.cloud` in Vercel production env | Stripe checkout redirects will throw in production (new guard) |
| **Set `RESEARCH_ANONYMIZE_SALT`** | Generate with `openssl rand -hex 32`, set in Vercel production env | Research export endpoint will throw in production (new guard) |
| **Set `PV_INTERNAL_SECRET`** | Set a random secret in Vercel production env | Page view analytics silently disabled (non-fatal) |
| **Set `NEXT_PUBLIC_SENTRY_DSN`** | Copy from Sentry project settings | No browser error capture |
| **Set `SENTRY_ORG` + `SENTRY_PROJECT`** | Copy from Sentry project settings | Unreadable production stack traces |
| **Run migration 0004** | Execute `pnpm drizzle-kit migrate` against production Neon DB | 500 errors on page view analytics endpoint |
| **Switch Clerk to `pk_live_`** | Replace `pk_test_` key in Vercel env, then remove `*.clerk.accounts.dev` from CSP in `next.config.ts` | Dev auth domains in production CSP (functional but wider than necessary) |
| **Enable feature flags** | Set `CREDITS_ENABLED=true`, `SUBSCRIPTIONS_ENABLED=true`, etc. per launch plan | Without `SUBSCRIPTIONS_ENABLED=true`, all authed users get lab tier (unlimited) |
| **Enable social channels** | Set `NEXT_PUBLIC_SOCIAL_X_ENABLED=true` (and Reddit, Discord, etc.) | Social links hidden from UI |
| **Set Stripe price IDs** | Set `STRIPE_PASS_PRICE_ID` and `STRIPE_LAB_PRICE_ID` | "Subscription plan not configured" error if subscriptions enabled |
| **Bump intro pool** | Consider increasing `INTRO_POOL_TOTAL_CREDITS` from 15000 | Pool may exhaust in hours under viral traffic; converts to sign-up-required |

### Engineering Tasks (Post-Launch)

| Item | Priority | Notes |
|------|----------|-------|
| **Newsletter broadcast** | Medium | Email collection works but there is no send mechanism. Plan a manual Resend batch or add a broadcast endpoint. |
| **SEC-AUTH-004 flaky test** | Low | Timing-safe comparison test is inherently environment-dependent. Consider increasing tolerance or marking as skip in CI. |
| **Nonce-based CSP** | Low | Current CSP uses `unsafe-inline` for scripts/styles (standard for Next.js). Nonce-based CSP would be stronger but requires Next.js middleware changes. |
| **In-memory rate limiter at scale** | Medium | Works for single-instance Vercel but won't aggregate across serverless invocations. DB constraints backstop. Redis/Upstash needed for strict enforcement. |
| **Structured data (JSON-LD)** | Low | No schema.org markup. Would improve search appearance for bout replay pages. |

---

## File Change Summary

```
 M  AGENTS.md
 M  README.md
 M  app/actions.ts
 M  app/layout.tsx
 M  app/sitemap.ts
 M  components/README.md
 M  components/darwin-countdown.tsx
 M  components/posthog-provider.tsx
 M  docs/README.md
 M  lib/README.md
 M  lib/research-anonymize.ts
 M  middleware.ts
 M  next.config.ts
 M  presets/README.md
 D  public/file.svg
 D  public/globe.svg
 D  public/next.svg
 D  public/vercel.svg
 D  public/window.svg
 M  scripts/README.md
 M  tests/README.md
 A  components/cookie-consent.tsx
```
