# 26-deploy

## Context
depends_on: []
produces: [vercel.json (if needed)]
domain: infrastructure
gate: smoke test against production URL

## References
Read these files before implementing:
- SPEC.md — "Environment Variables" section
- SPEC.md — "Stack" section (Vercel deployment)
- lib/common/env.ts — required env vars

## Task
Deploy the application to Vercel and verify it works in production.

### Step 1: Vercel project setup
- Link the repo to Vercel: `vercel link` or via Vercel dashboard
- Framework preset: Next.js (should auto-detect)
- Build command: `pnpm run build`
- Output directory: `.next`

### Step 2: Environment variables
Configure these in Vercel dashboard or via CLI:

Required:
- DATABASE_URL (Neon production connection string)
- ANTHROPIC_API_KEY
- CLERK_SECRET_KEY
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

Feature flags (set to enable features incrementally):
- CREDITS_ENABLED=true
- SUBSCRIPTIONS_ENABLED=true (if Stripe is configured)
- PREMIUM_ENABLED=true
- BYOK_ENABLED=false (keep disabled for MVP)

Conditional (if SUBSCRIPTIONS_ENABLED=true):
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET (create via Stripe dashboard → Webhooks → add endpoint)
- STRIPE_PASS_PRICE_ID
- STRIPE_LAB_PRICE_ID

NOTE: Use `printf` not `echo` when piping values to Vercel CLI.

### Step 3: Database migration
- Ensure Neon production database has the schema: `pnpm drizzle-kit push`
- Verify tables exist

### Step 4: Deploy
- `vercel --prod` or push to main (if Vercel git integration is configured)
- Wait for build to complete

### Step 5: Smoke test
Verify these URLs return 200:
- GET {PROD_URL}/
- GET {PROD_URL}/arena
- GET {PROD_URL}/agents
- GET {PROD_URL}/leaderboard
- GET {PROD_URL}/recent
- GET {PROD_URL}/api/health

Verify auth works:
- Navigate to /sign-in → Clerk modal loads
- Navigate to /sign-up → Clerk modal loads

### Step 6: Stripe webhook (if subscriptions enabled)
- Create webhook endpoint in Stripe dashboard: {PROD_URL}/api/credits/webhook
- Subscribe to events: checkout.session.completed, customer.subscription.created, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed, invoice.payment_succeeded
- Copy webhook secret to STRIPE_WEBHOOK_SECRET env var
- Redeploy if env var was added after initial deploy

## Do NOT
- Do NOT configure custom domain (use Vercel default .vercel.app)
- Do NOT set up Sentry, PostHog, or LangSmith
- Do NOT configure CI/CD GitHub Actions
- Do NOT set up CSP headers (unless Clerk breaks without them — if so, add minimal CSP)

## Verification
After deploying, verify:
- All 6 smoke test URLs return 200
- Sign-up flow works end to end
- A bout can be started and streamed to completion
- Credit balance updates after bout
- Tag commit: [H:steer] if any manual env var configuration was needed

## Notes
This task may require human intervention for:
- Neon database credentials
- Stripe product/price creation
- Clerk application configuration
- Vercel project linking
Tag all human interventions with [H:steer] in the commit message.
