# 19-stripe-checkout

## Context
depends_on: [18]
produces: [lib/stripe/checkout.ts, app/arena/page.tsx (modified)]
domain: lib/stripe/
gate: typecheck + lint + test:unit

## References
Read these files before implementing:
- SPEC.md (Tier Configuration, Subscription Flow)
- lib/stripe/DOMAIN.md
- lib/stripe/tier.ts (UserTier, TIER_CONFIG)
- lib/stripe/webhook.ts (expects metadata.userId, metadata.creditsMicro)
- lib/common/env.ts (STRIPE_* env vars, SUBSCRIPTIONS_ENABLED flag)
- app/arena/page.tsx (current arena page)
- lib/auth/middleware.ts (getAuthUserId, requireAuth)

## Task

### 1. Checkout session functions

Create `lib/stripe/checkout.ts`:

```typescript
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-12-18.acacia" });

export async function createSubscriptionCheckout(params: {
  userId: string;
  priceId: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<string>
// Create Stripe checkout session with:
//   mode: 'subscription'
//   metadata: { userId }
//   customer_email: params.customerEmail
//   line_items: [{ price: priceId, quantity: 1 }]
//   success_url, cancel_url
// Return session.url

export async function createCreditPackCheckout(params: {
  userId: string;
  creditsMicro: number;
  priceInPence: number;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<string>
// Create Stripe checkout session with:
//   mode: 'payment'
//   metadata: { userId, creditsMicro: String(creditsMicro) }
//   line_items: [{ price_data: { currency: 'gbp', unit_amount: priceInPence, product_data: { name: 'Credit Pack' } }, quantity: 1 }]
// Return session.url

export async function createBillingPortal(params: {
  customerId: string;
  returnUrl: string;
}): Promise<string>
// Create Stripe billing portal session
// Return session.url
```

### 2. Server actions for arena page

Add server actions in a file `app/arena/actions.ts`:

```typescript
"use server";

import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/middleware";
import { createSubscriptionCheckout, createCreditPackCheckout } from "@/lib/stripe/checkout";
import { getEnv } from "@/lib/common/env";

export async function subscribeAction(formData: FormData) {
  const userId = await requireAuth();
  const tier = formData.get("tier") as string;
  const env = getEnv();

  const priceId = tier === "pass" ? env.STRIPE_PASS_PRICE_ID : env.STRIPE_LAB_PRICE_ID;
  // Get user email from DB for pre-fill
  const url = await createSubscriptionCheckout({
    userId,
    priceId: priceId!,
    customerEmail: "", // fetch from DB
    successUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/arena?subscribed=true`,
    cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/arena`,
  });
  redirect(url);
}

export async function buyCreditPackAction(formData: FormData) {
  const userId = await requireAuth();
  const pack = formData.get("pack") as string;
  // Define credit packs: e.g., 500 credits = £5, 1200 credits = £10
  // ... create checkout and redirect
}
```

### 3. Update arena page

Modify `app/arena/page.tsx` to add:
- A section below the preset grid showing subscription tiers (only if SUBSCRIPTIONS_ENABLED)
- Pass tier card (£3/mo) and Lab tier card (£10/mo) with subscribe buttons
- Credit pack purchase section (100 credits £1, 500 credits £5)
- Each button is a form that calls the server action
- Only show subscription/credit sections to authenticated users
- Guard all Stripe-related UI behind `getEnv().SUBSCRIPTIONS_ENABLED` check

### Do NOT
- Build a full pricing page — embed the upgrade section in the arena page
- Create a separate /pricing route
- Handle Stripe webhook events — that's already done in task 18
- Implement the billing portal UI yet — just export the function
- Show Stripe UI to unauthenticated users

## Verification
After implementing, verify:
- `pnpm run typecheck` exits 0
- `pnpm run lint` exits 0
- `pnpm run test:unit` exits 0
- `lib/stripe/checkout.ts` exports createSubscriptionCheckout, createCreditPackCheckout, createBillingPortal
- Server actions are in a separate `"use server"` file
- Subscription UI is guarded by SUBSCRIPTIONS_ENABLED flag
- Checkout metadata includes userId (matches webhook handler expectations)
