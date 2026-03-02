# lib/stripe

Stripe integration: webhooks, checkout sessions, tier management.
Co-located tests: `*.test.ts` beside the module they test.

## Files

- `webhook.ts` — webhook event handler (6 events, idempotent grants)
- `checkout.ts` — createCheckoutSession (subscription + credit pack)
- `tier.ts` — resolveTierFromPriceId, tier config, rate limit config
- `types.ts` — UserTier, SubscriptionStatus

## Owns

- `app/api/credits/webhook/route.ts` (thin handler)
- Subscription fields on users table

## Depends on

- `lib/credits` (applyCreditDelta, grant logic)
- `db` (user subscription updates)
- Stripe SDK
