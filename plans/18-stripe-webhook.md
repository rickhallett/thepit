# 18-stripe-webhook

## Context
depends_on: [17]
produces: [lib/stripe/webhook.ts, app/api/credits/webhook/route.ts, lib/stripe/webhook.test.ts]
domain: lib/stripe/
gate: typecheck + lint + test:unit

## References
Read these files before implementing:
- SPEC.md (Webhook events section — 6 events, Subscription Flow)
- lib/stripe/DOMAIN.md
- lib/stripe/tier.ts (resolveTierFromPriceId, TIER_CONFIG, UserTier)
- lib/credits/balance.ts (applyCreditDelta)
- lib/credits/types.ts (CreditSource)
- db/schema.ts (users table — subscription fields)
- db/index.ts (db instance)

## Task

### 1. Install Stripe

```
pnpm add stripe
```

### 2. Webhook handler

Create `lib/stripe/webhook.ts`:

```typescript
import Stripe from "stripe";

export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      return handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
    case "customer.subscription.created":
      return handleSubscriptionCreated(event.data.object as Stripe.Subscription);
    case "customer.subscription.updated":
      return handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
    case "customer.subscription.deleted":
      return handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
    case "invoice.payment_failed":
      return handlePaymentFailed(event.data.object as Stripe.Invoice);
    case "invoice.payment_succeeded":
      return handlePaymentSucceeded(event.data.object as Stripe.Invoice);
    default:
      // Ignore unknown events
  }
}
```

Implement each handler:

**checkout.session.completed** — Credit pack purchase:
- Extract userId from `session.metadata.userId`
- Extract credits from `session.metadata.creditsMicro`
- Call `applyCreditDelta(userId, credits, 'purchase', \`purchase:${session.id}\`)`
- Idempotent via reference_id

**customer.subscription.created** — New subscription:
- Extract userId from `subscription.metadata.userId`
- Resolve tier from `subscription.items.data[0].price.id`
- UPDATE users SET subscription_tier, subscription_id, subscription_status, stripe_customer_id
- Apply one-time grant: `applyCreditDelta(userId, TIER_CONFIG[tier].grantMicro, 'subscription_grant', \`sub_grant:${subscription.id}\`)`
- Idempotent via reference_id

**customer.subscription.updated** — Upgrade/downgrade:
- Resolve new tier from price ID
- Get current tier from DB
- UPDATE users SET subscription_tier, subscription_status
- If upgrade: apply incremental grant = `newTier.grantMicro - oldTier.grantMicro` (only if positive)
- Reference: `upgrade_grant:${subscription.id}:${newTier}`
- Idempotent via reference_id

**customer.subscription.deleted** — Cancellation:
- UPDATE users SET subscription_tier='free', subscription_status='canceled', subscription_id=null
- No credit clawback

**invoice.payment_failed** — Immediate downgrade:
- Find user by stripe_customer_id from invoice.customer
- UPDATE users SET subscription_tier='free', subscription_status='past_due'

**invoice.payment_succeeded** — Monthly grant:
- Find user by stripe_customer_id
- Skip if `billing_reason === 'subscription_create'` (first invoice — grant already applied by subscription.created)
- Resolve tier, apply monthly grant: `applyCreditDelta(userId, grantMicro, 'monthly_grant', \`monthly:${invoice.id}\`)`
- Restore tier if was downgraded: UPDATE subscription_status='active'

### 3. Route handler

Create `app/api/credits/webhook/route.ts`:

```typescript
import Stripe from "stripe";
import { handleWebhookEvent } from "@/lib/stripe/webhook";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-12-18.acacia" });

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  await handleWebhookEvent(event);
  return new Response("ok", { status: 200 });
}
```

### 4. Unit tests

Create `lib/stripe/webhook.test.ts`:

Mock `db` and `applyCreditDelta` for all tests. Create mock Stripe event payloads.

Tests:
- Test checkout.session.completed: credits are applied with correct reference_id
- Test subscription.created: tier is updated + grant applied
- Test subscription.updated upgrade: incremental grant calculated correctly
- Test subscription.updated downgrade: no grant, tier lowered
- Test subscription.deleted: tier set to free, no clawback
- Test invoice.payment_failed: tier downgraded to free
- Test invoice.payment_succeeded: monthly grant applied, first invoice skipped
- Test idempotency: same event twice → second call is no-op (reference_id prevents double-grant)
- Test unknown event type: no error thrown

### Do NOT
- Create checkout session logic — that's task 19
- Build Stripe billing portal — that's task 19
- Add UI for subscriptions — that's task 19
- Handle more than the 6 documented event types
- Store raw webhook payloads in DB

## Verification
After implementing, verify:
- `pnpm run typecheck` exits 0
- `pnpm run lint` exits 0
- `pnpm run test:unit` exits 0 — webhook tests pass
- `app/api/credits/webhook/route.ts` verifies Stripe signature
- All 6 event types have dedicated handlers
- Every credit grant uses a unique reference_id for idempotency
- First invoice is skipped in payment_succeeded (no double-grant)
- `stripe` is in package.json dependencies
