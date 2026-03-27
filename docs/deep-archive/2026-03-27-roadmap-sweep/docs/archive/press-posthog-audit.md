# PostHog Analytics Audit — The Pit

**Date:** 2026-02-22
**Scope:** Complete inventory of PostHog integration, funnel coverage, gaps, and recommendations.

---

## 1. Event Inventory

### Client-Side Events (via `trackEvent()` in `lib/analytics.ts`)

| Event | File:Line | Trigger | Properties | Product Flow |
|-------|-----------|---------|------------|-------------|
| `bout_started` | `lib/use-bout.ts:182` | User starts a bout (streaming begins) | `bout_id`, `preset_id`, `model` | Bout |
| `bout_completed` | `lib/use-bout.ts:303` | Bout streaming finishes successfully | `bout_id`, `preset_id`, `model`, `turn_count`, `duration_ms` | Bout |
| `bout_error` | `lib/use-bout.ts:317` | Bout streaming fails/short-circuits | `bout_id`, `preset_id`, `model` | Bout |
| `bout_shared` | `components/share-modal.tsx:64,75,89`, `components/share-panel.tsx:29,34`, `lib/use-bout-sharing.ts:156,163` | User copies/shares bout content | `bout_id`, `method` (modal_copy, modal_copy_link, modal_{platform}, copy_header, copy_message, copy_share_panel, {platform}), `preset_id` (sharing hooks only) | Viral |
| `bout_engagement_depth` | `lib/engagement.ts:122` (via `components/arena.tsx:499`) | Arena component unmounts (user leaves bout page) | `bout_id`, `turns_watched`, `reactions_given`, `votes_cast`, `preset_id`, `model` | Engagement |
| `bout_replayed` | `app/b/[id]/page.tsx:111` (via `TrackPageEvent`) | Replay page loads (only for completed bouts viewed as replay) | `bout_id`, `preset_id` | Discovery |
| `preset_selected` | `components/preset-card.tsx:104` | User submits a preset form to start a bout | `preset_id`, `model`, `agent_count` | Bout funnel |
| `byok_key_stashed` | `components/preset-card.tsx:144`, `components/arena-builder.tsx:135` | User provides their own API key | *(none)* | Bout funnel |
| `reaction_submitted` | `lib/use-bout-reactions.ts:105` | User adds/removes a reaction on a turn | `bout_id`, `reaction_type`, `turn`, `action` (added/removed) | Engagement |
| `winner_voted` | `lib/use-bout-voting.ts:48` | User votes for a bout winner | `bout_id`, `agent_id` | Engagement |
| `credit_purchase_initiated` | `components/buy-credits-button.tsx:15` | User clicks buy credits (form pending state transition) | *(none)* | Monetization |
| `paper_submitted` | `components/paper-submission-form.tsx:53` | User submits a research paper | `relevance_area` | Research |
| `feature_request_submitted` | `components/feature-request-form.tsx:41` | User submits a feature request | `category` | Engagement |
| `feature_request_voted` | `components/feature-request-list.tsx:90` | User upvotes a feature request | *(none)* | Engagement |
| `paywall_hit` | `components/rate-limit-upgrade-prompt.tsx:111` | Rate limit prompt displays | `current_tier`, `limit` | Monetization |
| `upgrade_cta_clicked` | `components/rate-limit-upgrade-prompt.tsx:182` | User clicks upgrade link in rate limit prompt | `target_tier` | Monetization |
| `page_scroll_depth` | `lib/engagement.ts:36` (via `components/arena.tsx:494`) | User scrolls past 25/50/75/100% milestones | `depth`, `path` | Engagement |
| `page_active_time` | `lib/engagement.ts:85` (via `components/arena.tsx:495`) | Page unload/visibility hidden (>1s active) | `active_seconds`, `path` | Engagement |
| `share_modal_shown` | `components/share-modal.tsx:54` | Share modal opens after bout completion | `bout_id` | Viral |
| `arena_viewed` | `app/arena/page.tsx:79` (via `TrackPageEvent`) | Arena page loads | *(none)* | Bout funnel |
| `leaderboard_viewed` | `app/leaderboard/page.tsx:13` (via `TrackPageEvent`) | Leaderboard page loads | *(none)* | Discovery |
| `agents_browsed` | `app/agents/page.tsx:19` (via `TrackPageEvent`) | Agents listing page loads | *(none)* | Discovery |
| `copy_variant_served` | `components/posthog-provider.tsx:119` | PostHog init when A/B variant cookie is present | `variant` | Experimentation |
| `consent_granted` | `components/posthog-provider.tsx:93` | PostHog init after user accepted cookies (deferred via localStorage) | *(none)* | Consent |

### Server-Side Events (via `serverTrack()` in `lib/posthog-server.ts`)

| Event | File:Line | Trigger | Properties | Product Flow |
|-------|-----------|---------|------------|-------------|
| `signup_completed` | `lib/onboarding.ts:125` | First-time user session init (new user detected) | `referral_code`, `utm_source`, `utm_medium`, `utm_campaign` | Acquisition |
| `user_activated` | `lib/bout-engine.ts:1049` | User completes their very first bout | `preset_id`, `model_id`, `duration_ms` | Activation |
| `session_started` | `app/api/pv/route.ts:87` | First page view of a new session | `visit_number`, `days_since_last_visit`, `landing_page`, `referrer`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `country` | Retention |
| `referred_session_started` | `app/api/pv/route.ts:105` | New session with pit_ref cookie present | `referral_code`, `landing_page`, `referrer` | Viral |
| `short_link_clicked` | `app/s/[slug]/route.ts:37` | Short link resolved (GET /s/:slug) | `slug`, `bout_id` | Viral |
| `bout_started` | `lib/bout-engine.ts:639` | Bout engine begins execution (server-side) | `bout_id`, `preset_id`, `model_id`, `user_tier`, `agent_count`, `max_turns`, `is_byok` | Bout |
| `bout_completed` | `lib/bout-engine.ts:1017` | Bout engine finishes successfully (server-side) | `bout_id`, `preset_id`, `model_id`, `user_tier`, `agent_count`, `turns`, `input_tokens`, `output_tokens`, `duration_ms`, `is_byok`, `has_share_line` | Bout |
| `bout_error` | `lib/bout-engine.ts:1150` | Bout engine fails (server-side) | `bout_id`, `preset_id`, `model_id`, `user_tier`, `agent_count`, `turns_completed`, `input_tokens`, `output_tokens`, `duration_ms`, `is_byok` | Technical |
| `subscription_started` | `app/api/credits/webhook/route.ts:150` | Stripe webhook: new subscription created | `tier`, `subscription_id`, `status` | Monetization |
| `subscription_upgraded` | `app/api/credits/webhook/route.ts:206` | Stripe webhook: subscription tier increased | `from_tier`, `to_tier`, `subscription_id` | Monetization |
| `subscription_downgraded` | `app/api/credits/webhook/route.ts:212` | Stripe webhook: subscription tier decreased | `from_tier`, `to_tier`, `subscription_id` | Monetization |
| `subscription_churned` | `app/api/credits/webhook/route.ts:253` | Stripe webhook: subscription deleted | `subscription_id`, `previous_tier` | Monetization |
| `payment_failed` | `app/api/credits/webhook/route.ts:302` | Stripe webhook: invoice payment fails | `subscription_id`, `invoice_id`, `previous_tier` | Monetization |
| `credit_purchase_completed` | `app/api/credits/webhook/route.ts:109` | Stripe webhook: one-time credit purchase completed | `credits`, `amount_total`, `currency` | Monetization |
| `$ai_generation` | `lib/bout-engine.ts:884,959` | Per-turn LLM call completes during bout streaming | `$ai_model`, `$ai_provider`, `$ai_input_tokens`, `$ai_output_tokens`, `$ai_input_cost_usd`, `$ai_output_cost_usd`, `$ai_total_cost_usd`, `$ai_latency`, `bout_id`, `preset_id`, `turn`, `is_byok`, `generation_type` | Cost/LLM |

### Auto-Captured Events (PostHog SDK)

| Event | Trigger | Notes |
|-------|---------|-------|
| `$pageview` | SPA route change (`PostHogPageView` component) | Manually captured with `$current_url`; `capture_pageview: false` in config |
| `$pageleave` | User navigates away | `capture_pageleave: true` |
| `$autocapture` | Clicks, form submits, etc. | `autocapture: true` — captures all interactive elements |
| Dead click detection | User clicks non-interactive element | `capture_dead_clicks: true` |
| Session recording | All session activity | `disable_session_recording: false` — session replay is ON |

### Person Properties (via `identify()` / `serverIdentify()`)

| Property | Set Where | Value |
|----------|-----------|-------|
| `is_internal` | `components/posthog-provider.tsx:147` (client) | `true` for `@oceanheart.ai` / `@thepit.cloud` emails |
| `signup_date` | `lib/onboarding.ts:132` (server) | ISO timestamp |
| `initial_tier` | `lib/onboarding.ts:133` (server) | Always `'free'` |
| `current_tier` | `lib/onboarding.ts:134`, `app/api/credits/webhook/route.ts:155,218,257,307` | Updated on subscription changes |
| `acquisition_channel` | `lib/onboarding.ts:135` (server) | `'referral'` / `'paid'` / `'organic'` |
| `referral_code` | `lib/onboarding.ts:136` (server) | User's referral code if applicable |
| `utm_source` | `lib/onboarding.ts:137` (server) | Initial UTM source |

### Super Properties (registered per session)

| Property | Set Where | Notes |
|----------|-----------|-------|
| `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` | `components/posthog-provider.tsx:76-80` | From `pit_utm` cookie |
| `copy_variant` | `components/posthog-provider.tsx:114` | A/B test variant (when experiment active) |

---

## 2. Funnel Coverage Map

### Bout Funnel: Landing → Arena → Preset → Streaming → Complete → Share

| Step | Tracked? | Event(s) | Notes |
|------|----------|----------|-------|
| Landing page view | **Yes** | `$pageview` (auto), `session_started` (server) | Landing page = `/` |
| Arena page view | **Yes** | `arena_viewed` | Via `TrackPageEvent` |
| Preset browsed | **NO** | `preset_browsed` defined but **never fired** | Gap: can't measure browse-to-select conversion |
| Preset selected | **Yes** | `preset_selected` | Has `preset_id`, `model`, `agent_count` |
| BYOK key stashed | **Yes** | `byok_key_stashed` | No properties (minimal) |
| Bout started | **Yes (x2)** | Client: `bout_started`, Server: `bout_started` | Dual tracking — server is source of truth |
| Streaming in progress | **NO** | — | No mid-stream engagement signal |
| Bout completed | **Yes (x2)** | Client: `bout_completed`, Server: `bout_completed` | Server has richer properties (tokens, cost) |
| Bout error | **Yes (x2)** | Client: `bout_error`, Server: `bout_error` | Server has error context |
| Share modal shown | **Yes** | `share_modal_shown` | Fired on modal open |
| Bout shared | **Yes** | `bout_shared` | Multiple methods tracked |
| Bout replayed | **Yes** | `bout_replayed` | Via `TrackPageEvent` on replay pages |

### Acquisition Funnel: Visit → Signup → Activate

| Step | Tracked? | Event(s) | Notes |
|------|----------|----------|-------|
| First visit | **Yes** | `session_started` | `visit_number=1` |
| Consent granted | **Yes** | `consent_granted` | Gap: consent_declined not tracked (by design, PECR compliance) |
| Sign-up page view | **Partial** | `$pageview` for `/sign-up` | No custom event for sign-up intent |
| Signup completed | **Yes** | `signup_completed` (server) | Has `referral_code`, UTM params |
| User activated (first bout) | **Yes** | `user_activated` (server) | Fires on first completed bout |

### Monetization Funnel: Paywall → Purchase → Subscription Lifecycle

| Step | Tracked? | Event(s) | Notes |
|------|----------|----------|-------|
| Rate limit hit (paywall) | **Yes** | `paywall_hit` | `current_tier`, `limit` |
| Upgrade CTA clicked | **Yes** | `upgrade_cta_clicked` | `target_tier` |
| Credit purchase initiated | **Yes** | `credit_purchase_initiated` | No properties (minimal) |
| Credit purchase completed | **Yes** | `credit_purchase_completed` (server) | `credits`, `amount_total`, `currency` |
| Subscription started | **Yes** | `subscription_started` (server) | `tier`, `subscription_id` |
| Subscription upgraded | **Yes** | `subscription_upgraded` (server) | `from_tier`, `to_tier` |
| Subscription downgraded | **Yes** | `subscription_downgraded` (server) | `from_tier`, `to_tier` |
| Subscription churned | **Yes** | `subscription_churned` (server) | `subscription_id`, `previous_tier` |
| Payment failed | **Yes** | `payment_failed` (server) | `subscription_id`, `invoice_id` |

### Engagement

| Signal | Tracked? | Event(s) | Notes |
|--------|----------|----------|-------|
| Reactions | **Yes** | `reaction_submitted` | `reaction_type`, `turn`, `action` |
| Winner votes | **Yes** | `winner_voted` | `agent_id` |
| Scroll depth | **Yes** | `page_scroll_depth` | Only on arena/bout pages |
| Active time | **Yes** | `page_active_time` | Only on arena/bout pages |
| Engagement depth | **Yes** | `bout_engagement_depth` | Summary on page leave: turns watched, reactions, votes |
| Feature requests | **Yes** | `feature_request_submitted`, `feature_request_voted` | |

### Viral / Referral

| Signal | Tracked? | Event(s) | Notes |
|--------|----------|----------|-------|
| Short link clicked | **Yes** | `short_link_clicked` (server) | `slug`, `bout_id` |
| Referred session | **Yes** | `referred_session_started` (server) | `referral_code`, `landing_page` |
| Share actions | **Yes** | `bout_shared` | Multiple methods tracked |
| Share modal shown | **Yes** | `share_modal_shown` | |

### Discovery

| Signal | Tracked? | Event(s) | Notes |
|--------|----------|----------|-------|
| Leaderboard viewed | **Yes** | `leaderboard_viewed` | |
| Agents browsed | **Yes** | `agents_browsed` | |
| Preset browsed | **NO** | Defined but never fired | |
| Bout replayed | **Yes** | `bout_replayed` | `bout_id`, `preset_id` |

### Research

| Signal | Tracked? | Event(s) | Notes |
|--------|----------|----------|-------|
| Paper submitted | **Yes** | `paper_submitted` | `relevance_area` |
| Research page view | **Partial** | `$pageview` only | No custom event |
| Research export | **NO** | — | Admin endpoint, not user-facing |

### Agent Building

| Signal | Tracked? | Event(s) | Notes |
|--------|----------|----------|-------|
| Agent created | **Yes** | `agent_created` | `agent_id` |
| Agent cloned | **Yes** | `agent_cloned` | `agent_id` |
| Agent DNA edited | **NO** | — | No event for editing existing agent DNA |
| Agent detail viewed | **NO** | — | No custom event for `/agents/:id` |

---

## 3. Configuration Summary

| Setting | Value | Notes |
|---------|-------|-------|
| **Instance** | US cluster (`us.i.posthog.com`) | Via reverse proxy at `/ingest` |
| **Reverse proxy** | `/ingest` → `us.i.posthog.com`, `/ingest/static` → `us-assets.i.posthog.com` | `next.config.ts:80-87` — avoids ad-blocker interference |
| **Env var** | `NEXT_PUBLIC_POSTHOG_KEY` | Required for analytics; graceful no-op when absent |
| **Persistence** | `localStorage` | Avoids third-party cookie warnings |
| **Autocapture** | `true` | Captures clicks, form submits, etc. |
| **Dead click detection** | `true` | Detects clicks on non-interactive elements |
| **Session recording** | `true` (`disable_session_recording: false`) | Full session replay enabled |
| **Page views** | Manual SPA capture | `capture_pageview: false`, custom `PostHogPageView` component |
| **Page leave** | `true` | `capture_pageleave: true` |
| **DNT respect** | `true` | ~12-15% of browsers; these users are invisible |
| **Consent gating** | `pit_consent` cookie | PostHog does NOT initialize until `accepted`; UK PECR compliant |
| **Internal filtering** | `is_internal` person property | Set for `@oceanheart.ai` / `@thepit.cloud` emails |
| **A/B testing** | `copy_variant` super property | Experiment config in `copy/experiment.json` |
| **UTM tracking** | Super properties from `pit_utm` cookie | All 5 standard UTM params |
| **Server-side SDK** | `posthog-node` | `captureImmediate()` for one-shot events; batched `capture()` for `$ai_generation` |
| **Serverless compat** | `shutdown()` via `flushServerAnalytics()` | Called at bout completion to drain batch queue |
| **CSP** | `us.i.posthog.com` and `us-assets.i.posthog.com` in connect-src, script-src | Safety net alongside reverse proxy |

### Client vs Server Event Duplication

`bout_started`, `bout_completed`, and `bout_error` are fired from **both** client and server. This is intentional:
- **Client events** fire immediately for responsive funnel tracking (user-perceived).
- **Server events** fire with richer properties (tokens, cost, tier, BYOK flag) and are the source of truth.
- Can be distinguished by the `source: 'server'` property on server events.

---

## 4. Coverage Gaps

### Critical Gaps (High ROI to fix)

1. **`preset_browsed` — defined but never fired.** The event type exists in `lib/analytics.ts:40` but no component calls `trackEvent('preset_browsed')`. This means we cannot measure the browse-to-select conversion rate on the arena page. We know how many people view the arena (`arena_viewed`) and how many select a preset (`preset_selected`), but not who browsed presets without selecting.

2. **Agent detail page view — not tracked.** `/agents/[id]/page.tsx` has no `TrackPageEvent`. We track agents browsed (list page) but not individual agent profile views.

3. **Custom arena — not tracked.** `/arena/custom/page.tsx` has no analytics events. Users building custom arenas are invisible to funnels.

4. **Landing page engagement — no custom event.** The homepage (`/`) relies on `$pageview` only. No scroll depth or CTA click tracking outside the arena.

5. **Sign-up intent — not tracked.** No event fires when a user navigates to `/sign-up` or `/sign-in` beyond the automatic `$pageview`.

6. **Newsletter subscription — not tracked.** The `/api/newsletter` endpoint has no analytics event.

7. **Contact form submission — not tracked.** The `/api/contact` endpoint has no analytics event.

### Moderate Gaps

8. **Agent DNA edit — not tracked.** Users editing an existing agent's DNA have no analytics visibility.

9. **Recent bouts page — not tracked.** `/recent/page.tsx` has no custom event for browsing recent bouts.

10. **Research page views — not tracked.** `/research/page.tsx` and `/research/citations/page.tsx` have no custom events.

11. **Feedback page — not tracked.** `/feedback/page.tsx` has no custom analytics event.

12. **Developers page — not tracked.** `/developers/page.tsx` has no custom event for API documentation interest.

13. **`credit_purchase_initiated` has no properties.** We know a purchase was initiated but not the amount, tier target, or context.

14. **`byok_key_stashed` has no properties.** We know a BYOK key was stashed but not which model or preset context.

### Low Priority / By Design

15. **`consent_declined` not tracked.** By design (PECR compliance). Decline rate can be inferred from `$pageview` - `consent_granted` gap.

16. **Streaming mid-progress.** No mid-stream signal. Could be useful for measuring drop-off during long bouts but would be noisy.

17. **DNT users invisible.** ~12-15% of traffic. By design (privacy-first). Documented in code comments.

---

## 5. Pain Points & Unknowns

### What We Don't Know

1. **PostHog project settings** — Data retention period, person profile mode (identified-only vs. all), billing tier, and rate limits are not visible from the codebase. These must be checked in the PostHog dashboard.

2. **Session recording sample rate** — `disable_session_recording: false` enables it, but the actual sample rate (100%? 10%?) is configured in the PostHog project settings, not in code. If at 100%, storage costs could be significant.

3. **Existing dashboards** — We don't know what dashboards or saved views already exist in PostHog. There may be duplicated or stale dashboards.

4. **Feature flags** — PostHog feature flags are not used. The A/B testing uses a custom cookie-based system (`pit_variant`). This is a missed opportunity for PostHog's built-in experimentation framework.

5. **Cohort definitions** — No cohorts appear to be defined in code. PostHog cohorts (if any) would be configured in the dashboard.

### Potential Noise

6. **`page_scroll_depth` fires at 4 milestones per page view** — On high-traffic bout pages, this could generate 4x the volume. Consider if the milestone granularity is worth the event volume.

7. **`bout_started`/`bout_completed`/`bout_error` dual-fired** — Client + server means 2x events for these. While distinguishable by `source`, it inflates event counts and could confuse dashboard builders who don't filter.

8. **`$autocapture` is ON** — This generates high-volume, low-signal events for every click and form interaction. Useful for session replay context but noisy for event-based analysis. Consider whether the event volume justifies the cost.

### PII Concerns

9. **No PII in custom events** — Custom events use `bout_id`, `preset_id`, `agent_id`, etc. No emails, names, or direct identifiers in event properties.

10. **Clerk userId as distinctId** — PostHog person profiles are keyed on Clerk's `userId` (opaque ID). Not PII itself, but linkable to PII via Clerk.

11. **`is_internal` derived from email domain** — The email itself is not sent to PostHog, only the boolean `is_internal` flag. Clean.

12. **IP hashing** — Page view records use `sha256Hex(clientIp)` for the DB but PostHog captures are not explicitly IP-scrubbed (PostHog's own settings govern this).

---

## 6. Dashboard Recommendations

### Dashboard 1: Bout Funnel (Top Priority)
**Purpose:** Measure conversion from arena view to completed bout.
**Events (in order):**
1. `arena_viewed` — Top of funnel
2. `preset_selected` — Intent to start
3. `bout_started` (server, `source='server'`) — Execution began
4. `bout_completed` (server) — Success
5. `bout_error` (server) — Failure branch

**Key metrics:** Conversion rate at each step, error rate, average duration, preset popularity.

### Dashboard 2: Revenue & Monetization
**Purpose:** Track the paywall-to-payment pipeline and subscription health.
**Events:**
- `paywall_hit` → `upgrade_cta_clicked` → `credit_purchase_initiated` → `credit_purchase_completed` / `subscription_started`
- `subscription_upgraded` / `subscription_downgraded` / `subscription_churned` / `payment_failed`

**Key metrics:** Paywall-to-purchase conversion, MRR by tier, churn rate, upgrade/downgrade flow.

### Dashboard 3: Viral Loop
**Purpose:** Measure sharing effectiveness and referral attribution.
**Events:**
- `share_modal_shown` → `bout_shared` (by method) → `short_link_clicked` → `referred_session_started` → `signup_completed` (with `referral_code`)

**Key metrics:** Share rate (completed bouts → shares), viral coefficient (shares → new signups), share method breakdown.

### Dashboard 4: Engagement Quality
**Purpose:** Understand how deeply users engage with bouts.
**Events:**
- `bout_engagement_depth` (turns watched, reactions, votes)
- `reaction_submitted` (by type, over time)
- `winner_voted`
- `page_active_time`

**Key metrics:** Average turns watched, reaction rate, vote rate, active time per bout, engagement by preset.

### Dashboard 5: LLM Cost & Performance
**Purpose:** Track AI generation costs, latency, and token usage.
**Events:**
- `$ai_generation` — PostHog's built-in LLM analytics schema

**Key metrics:** Cost per bout, cost per model, average latency, token efficiency, BYOK vs. platform usage ratio.

---

## 7. Quick Wins — Events to Add

### 1. Fire `preset_browsed` (already defined, just needs wiring)
**Effort:** ~5 lines of code
**Impact:** Completes the arena funnel. Add to each `<PresetCard>` when it enters the viewport or is clicked/expanded.
```tsx
// In PresetCard, on click or viewport entry:
trackEvent('preset_browsed', { preset_id: preset.id });
```

### 2. Add `TrackPageEvent` to `/agents/[id]/page.tsx`
**Effort:** ~3 lines
**Impact:** Enables agent discovery funnel: `agents_browsed` → `agent_detail_viewed` → `agent_cloned` / bout with agent.
```tsx
<TrackPageEvent event="agent_detail_viewed" properties={{ agent_id: agent.id }} />
```
*(Requires adding `'agent_detail_viewed'` to `AnalyticsEvent` union.)*

### 3. Add `TrackPageEvent` to `/arena/custom/page.tsx`
**Effort:** ~3 lines
**Impact:** Makes custom arena usage visible. Currently a blind spot.
```tsx
<TrackPageEvent event="arena_viewed" properties={{ arena_type: 'custom' }} />
```
*(Can reuse `arena_viewed` with a distinguishing property.)*

### 4. Track `newsletter_subscribed` in `/api/newsletter/route.ts`
**Effort:** ~5 lines (server-side `serverTrack`)
**Impact:** Measures content marketing funnel. Add `'newsletter_subscribed'` to `ServerAnalyticsEvent` and call `serverTrack()` on success.

### 5. Enrich `credit_purchase_initiated` with properties
**Effort:** ~5 lines
**Impact:** Understand purchase context: what tier/amount the user was considering when they clicked buy.
```tsx
trackEvent('credit_purchase_initiated', { current_tier: tier, target_pack: packId });
```

---

## 8. Summary Statistics

| Metric | Count |
|--------|-------|
| **Total distinct event types** | 35 (24 custom client + 14 custom server + some overlap + 4 auto) |
| **Client-side custom events** | 24 unique event names in `AnalyticsEvent` union |
| **Server-side custom events** | 14 unique event names in `ServerAnalyticsEvent` union |
| **Events actually fired** | 32 (23 client wired + 13 server wired — `preset_browsed` defined but unused) |
| **Person properties set** | 7 |
| **Super properties** | 7 (5 UTM + `copy_variant` + any PostHog defaults) |
| **Files with analytics calls** | 20 (across components/, lib/, app/) |
| **Funnel steps with coverage** | ~85% of critical flows |
| **Major gaps** | 3 (preset browsed, agent detail view, custom arena) |

---

## 9. E2E Test Coverage

The only E2E test verifying PostHog behavior is in `tests/e2e/qa-hydration-418.spec.ts`:

- **`OCE-344: Analytics consent gating`** (`tests/e2e/qa-hydration-418.spec.ts:192-234`) — Verifies that no PostHog network requests (event capture, decide, batch) fire before the user grants cookie consent. Clears cookies, loads the page, watches for `/ingest/` and `posthog.com` requests, and asserts zero tracking requests.

No other E2E tests verify specific PostHog events, event properties, or funnel completeness. The consent gating test is the only analytics-related E2E assertion.
