# RT L3 — Lighthouse Report
Date: 2026-02-24
Agent: Lighthouse
Statement presentation order: C, B, A

## Pre-Launch Recommendations

### What exists (grounding the assessment)

The observability stack is architecturally integrated, not bolted on. Five layers compose through AsyncLocalStorage context propagation:

1. **Middleware** — Request ID generation (`nanoid(12)`), injected into request and response headers
2. **API logging wrapper** — `withLogging()` HOF that captures method, path, status, duration, client IP, user agent, referer, and feeds the anomaly detector
3. **Structured logger** — JSON in production, human-readable in dev; auto-injects requestId/clientIp/country/path from AsyncLocalStorage; sanitizes API keys (Anthropic, OpenAI, Stripe patterns); links to Sentry trace IDs
4. **Anomaly detector** — In-memory sliding window detection for burst traffic, credential probing, error rate spikes, and suspicious user agents; webhook notification support
5. **Error boundaries** — Client-side (`app/error.tsx`) and global (`app/global-error.tsx`) React error boundaries, both wired to Sentry

External instrumentation: Sentry (server, client, edge configs), with 100% error capture, 10% trace sampling, Session Replay with explicit PII masking, and client-side noise filtering.

Health endpoint (`/api/health`) reports DB latency, feature flag status, and uptime start time, wrapped in `withLogging()`.

Semantic log channels (`audit`, `metric`, `security`, `experiment`) add structured `signal` fields for downstream filtering.

**This is a production-grade observability foundation.** Most projects at this stage have `console.log`. This has five coordinated layers with context propagation, key sanitization, anomaly detection, and external error tracking.

### Recommendations

**1. Configure Sentry alert rule for error rate spike (15 min, pre-launch)**

The L2 report already identified this. One alert rule: error rate > 5% sustained over 5 minutes, notification to the operator's preferred channel (email/Slack/Discord). Without this, Sentry captures errors but nobody gets woken up. The anomaly detector logs warnings to structured logs, but those logs need a reader. Sentry alert rules close the loop.

**Priority: HIGH. Effort: 15 minutes. Risk: zero.**

**2. Verify SENTRY_DSN is set in the production environment**

The Sentry configs are conditional (`if (process.env.SENTRY_DSN)`). If the DSN is not set in the deployment environment, the entire Sentry pipeline is silently inert. This is correct defensive coding, but it means a missing env var degrades observability to structured logs only — no error tracking, no session replay, no alerting.

**Action:** Confirm `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` are set in the production Vercel environment. This is a verification step, not a code change.

**Priority: HIGH. Effort: 2 minutes. Risk: zero.**

**3. Verify ANOMALY_WEBHOOK_URL is set if webhook alerting is desired**

The anomaly detector has a `fireWebhook()` path that silently no-ops when `ANOMALY_WEBHOOK_URL` is unset. If the operator wants real-time anomaly notifications (burst traffic, credential probing) outside of log aggregation, this URL needs to be configured to point at a Discord/Slack webhook or similar.

**Priority: MEDIUM. Effort: 5 minutes. Risk: zero.**

**4. Accept the 10% trace sample rate as correct for launch**

The trace sample rate is 0.1 (10%) on both server and client. At launch traffic volumes, this is appropriate — full trace capture would create noise and cost. The comment in the client config ("adjust upward once traffic patterns are understood") is exactly right. No change needed. This is a note to the operator: do not pre-optimize tracing. Wait for real traffic data.

**Priority: NONE (no action). This is a "leave it alone" recommendation.**

**5. Accept the in-memory anomaly detector limitation as appropriate**

The anomaly detector runs in-memory per serverless instance. This means each Vercel function invocation has independent state; distributed attacks across multiple instances won't be correlated. This is explicitly documented in the code ("detection is best-effort — each serverless instance has independent state"). For a Show HN launch, this is the right trade-off: it catches the most common patterns (single-IP burst, credential probing) without requiring Redis or external state. Upgrading to shared state is a post-launch scaling decision, not a launch blocker.

**Priority: NONE (no action). Post-launch if traffic warrants it.**

**6. Confirm PostHog client-side analytics are configured**

PostHog was referenced in the L2 synthesis as providing "real-time product intelligence." From an observability perspective, PostHog fills a different layer than Sentry: product analytics (funnel completion, feature adoption, session analysis) vs. error tracking. If PostHog is configured, the operator will have real-time visibility into how HN traffic behaves — which pages they visit, whether they complete bouts, and where they drop off. This is launch-day intelligence.

**Action:** Verify PostHog project key is set in production environment variables. No code change.

**Priority: MEDIUM. Effort: 2 minutes. Risk: zero.**

**7. No observability gaps block launch**

I have reviewed every file in my ownership scope. The structured logging pipeline is complete. API key sanitization covers Anthropic, OpenAI, and Stripe patterns. Request ID propagation flows through AsyncLocalStorage. Error boundaries catch client-side render errors and root layout errors. The health endpoint reports database status and feature flags. The anomaly detector monitors four threat patterns. Sentry captures 100% of errors with session replay on error sessions.

There are no observability gaps that block launch. There are optimization opportunities (shared anomaly state, trace sample rate tuning, log aggregation pipeline), but those are earned by production traffic, not pre-empted by speculation.

### Summary

- **2 verification steps** (Sentry DSN, PostHog key) — confirm env vars are set
- **1 configuration task** (Sentry alert rule) — 15 minutes
- **1 optional configuration** (anomaly webhook URL) — 5 minutes
- **0 code changes required**
- **0 launch blockers**

The observability stack is production-ready. The operator will have structured logs, error tracking with session replay, anomaly detection, and product analytics from the first request. This is not console.log territory. This is an instrumented product.

## Strategic Framing — Rank Order

1st: B — "Ship over polishing." From an observability perspective, the instrumentation is already wired. The data I need to make informed post-launch decisions (error rates, traffic patterns, anomaly signals, product analytics) only arrives when real users hit the system. Polishing observability without production traffic is optimizing in the dark. Every day without real telemetry is a day without signal. Ship, observe, iterate.

2nd: A — "Portfolio piece, polish for recruiters." The observability architecture — five layers with AsyncLocalStorage context propagation, custom anomaly detection, semantic log channels, Sentry integration with PII masking — is already a strong portfolio signal. A recruiter evaluating agentic engineering competence would see production-grade instrumentation, not a toy. However, the portfolio value is maximized when the product is live and demonstrably handling real traffic, not when it is sitting in a repo with perfect code and no telemetry data.

3rd: C — "Applied engineering practice, use the process for the next vision." The observability patterns here (structured logging, request context propagation, anomaly detection, layered error boundaries) are transferable. But the specific implementation — the anomaly detector tuned to this product's threat model, the health endpoint reporting this product's feature flags, the semantic log channels for this product's audit events — is tightly coupled to THE PIT. The process is valuable, but the product is more valuable when shipped. Moving on to "the next vision" before this one has production data would mean all five observability layers never get validated against real traffic.
