# RT L3 — Foreman Report
Date: 2026-02-24
Agent: Foreman
Statement presentation order: B, A, C

## Pre-Launch Recommendations

What follows is a fresh, unbiased assessment from the infrastructure/DB/DevOps perspective. No anchoring to L1 or L2 conclusions — just what I see when I look at the stack with both eyes open.

### 1. Database layer is launch-ready — no action required

The schema is clean: 20 tables, well-documented, with appropriate constraints and indexes. Financial operations use atomic SQL (conditional UPDATE with RETURNING) — no SELECT-then-UPDATE race conditions. Concurrent insert safety uses `onConflictDoNothing()` + re-read consistently. The single baseline migration file (`0000_baseline.sql`) means the schema was stabilised before iteration began, which is the correct approach for a sprint. Neon serverless with WebSocket Pool supports interactive transactions. `requireDb()` throws immediately on missing config rather than failing silently downstream. This is solid.

### 2. Migration posture is appropriate for launch, but needs a rollback plan post-launch

There is one migration file. For a first launch, this is correct — a single CREATE-everything baseline is simpler and safer than accumulated incremental migrations. **Post-launch recommendation:** establish a rollback procedure before the first schema change after launch. This means: every future migration should have a paired rollback script (even if it's just comments describing the manual reversal), and `drizzle-kit check` should be run against production after every deploy to detect drift.

### 3. Environment variable hygiene is good — verify production parity

The `.env` configuration covers 13 variables across 4 categories (core, payments, attestation, observability). The `drizzle.config.ts` correctly reads `DATABASE_URL` from env. `next.config.ts` does not hardcode any infrastructure URLs. **Pre-launch action (5 min):** run `pitctl env validate` against the production environment to confirm all required variables are set and non-empty. This is idempotent and risk-free.

### 4. Security headers are production-grade

CSP is comprehensive: restrictive `default-src 'self'`, explicit allowlists for Clerk, PostHog, Stripe, Sentry, and Cloudflare Turnstile. HSTS with `includeSubDomains; preload` and 2-year max-age. `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, restrictive `Permissions-Policy`. PostHog reverse proxy (`/ingest/*` rewrites) avoids ad-blocker interference. `frame-ancestors 'none'` reinforces clickjacking protection. This is above the bar for a Show HN launch.

### 5. Deployment exclusions are correct

`.vercelignore` excludes all 7 Go CLI tools and the `shared/` directory. This prevents unnecessary build time and ensures the Vercel deployment only contains the Next.js application. No action required.

### 6. Dependency versions are deliberate and stable

- Next.js 16.1.6, React 19.2.3 — current major versions
- Drizzle ORM 0.45.1 with Drizzle Kit 0.31.8 — current and stable
- `@neondatabase/serverless` 1.0.2 — post-1.0 stability
- Stripe v14.25.0 — deliberately pinned, not stale. v14 is the LTS line.
- Node >= 24 engine requirement — aligns with native WebSocket support needed by Neon driver
- pnpm 10.28.2 — current

No dependency-related launch blockers.

### 7. pitctl provides independent operational verification

The Go CLI (`pitctl`) covers: database connectivity (`db ping`, `db stats`), HTTP smoke tests (`smoke`), user/agent/bout/credit inspection and mutation, JSONL export, and environment validation. This gives the operator independent verification tooling that doesn't depend on the web application being functional. **Pre-launch action (2 min):** run `pitctl db ping` and `pitctl smoke` against production to confirm connectivity and HTTP health from outside the Vercel runtime.

### 8. Observability stack is wired, not bolted on

Sentry integration via `@sentry/nextjs` with source map uploads, PostHog with reverse proxy, Vercel Analytics, and a custom anomaly detector. The `withSentryConfig` wrapping in `next.config.ts` is correctly done. Source maps upload silently outside CI (`silent: !process.env.CI`). Telemetry is explicitly disabled. This means if something breaks post-launch, the operator will know about it. No action required.

### 9. No database backup procedure is documented

Neon provides point-in-time recovery and branching natively, so catastrophic data loss risk is low. However, there is no documented procedure for "how to recover if a bad migration runs against production." **Post-launch recommendation (not a launch blocker):** document a recovery runbook. Neon branching makes this straightforward — `neonctl branches create --parent` before any migration gives you an instant rollback point.

### 10. The `db:reset-ci` script references specific Neon project/org IDs

`package.json` line 23 contains hardcoded Neon project and org IDs for CI branch reset. This is fine for the current setup but is a maintenance hazard if the Neon project is ever recreated. **Not a launch blocker.** Note for future: parameterise these via env vars.

### 11. No connection pooling concerns

Neon serverless driver with WebSocket Pool handles connection management on Neon's edge. Vercel serverless functions create ephemeral connections per invocation — this is the intended architecture. No PgBouncer or external pooler needed. No action required.

### Summary assessment

**Status: GREEN.** The infrastructure layer is launch-ready. The schema is clean, migrations are idempotent, security headers are comprehensive, deployment configuration is correct, and operational tooling exists for independent verification. Two pre-launch actions are recommended (both under 10 minutes total, both idempotent): validate production env vars and run smoke tests against production. Everything else is post-launch hygiene.

## Strategic Framing — Rank Order

1st: B — "Ship over polish." From an infrastructure perspective, the foundation is sound. The DB layer, deployment pipeline, security headers, and operational tooling are all production-grade. There is nothing in the infrastructure stack that requires polishing before launch. The system is built to run. Run it. Polishing infrastructure that nobody is using yet is waste. Ship, observe real traffic patterns, then optimise based on actual data.

2nd: C — "Applied engineering; primary value was in the practice." The infrastructure decisions in this project — atomic financial SQL, idempotent migrations, cross-language CLI tooling, CSP with explicit allowlists, Neon serverless architecture — are transferable patterns. The practice of building this stack has produced genuine engineering capital. But this framing undervalues the artifact itself. The infrastructure isn't just practice — it's a working system that can serve real users today.

3rd: A — "Portfolio piece; polish for recruiters." The infrastructure layer of this project speaks for itself to anyone who can read it. Atomic credit operations, proper CSP, idempotent migrations, independent verification CLI in a second language — these are not cosmetic. They are structural. No recruiter worth hiring for will evaluate this by surface polish. The engineering decisions are visible in the schema, the migration patterns, and the security headers. Additional polish aimed at recruiter perception would add no infrastructure value.
