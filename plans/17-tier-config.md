# 17-tier-config

## Context
depends_on: [12]
produces: [lib/stripe/tier.ts, lib/stripe/tier.test.ts, lib/common/rate-limit.ts (modified)]
domain: lib/stripe/
gate: typecheck + lint + test:unit

## References
Read these files before implementing:
- SPEC.md (Tier Configuration table — rate limits, model access, grants)
- lib/stripe/DOMAIN.md
- lib/common/rate-limit.ts (existing rate limiter)
- lib/common/env.ts (STRIPE_PASS_PRICE_ID, STRIPE_LAB_PRICE_ID)
- db/schema.ts (users table — subscription_tier field)
- db/index.ts (db instance)

## Task

### 1. Tier configuration

Create `lib/stripe/tier.ts`:

```typescript
export const UserTier = {
  FREE: "free",
  PASS: "pass",
  LAB: "lab",
} as const;
export type UserTier = (typeof UserTier)[keyof typeof UserTier];

export interface TierConfig {
  rateLimit: { windowMs: number; maxRequests: number };
  models: string[];
  maxAgents: number;        // 0 = cannot create
  byok: boolean;
  apiAccess: boolean;
  grantMicro: number;       // subscription one-time + monthly grant in micro-credits
}

export const TIER_CONFIG: Record<UserTier, TierConfig> = {
  free: {
    rateLimit: { windowMs: 3600000, maxRequests: 5 },
    models: ["claude-haiku", "claude-sonnet"],
    maxAgents: 1,
    byok: false,
    apiAccess: false,
    grantMicro: 0,
  },
  pass: {
    rateLimit: { windowMs: 3600000, maxRequests: 15 },
    models: ["claude-haiku", "claude-sonnet"],
    maxAgents: 5,
    byok: true,
    apiAccess: false,
    grantMicro: 30000, // 300 credits = 30000 micro
  },
  lab: {
    rateLimit: { windowMs: 3600000, maxRequests: Infinity },
    models: ["claude-haiku", "claude-sonnet"],
    maxAgents: Infinity,
    byok: true,
    apiAccess: true,
    grantMicro: 60000, // 600 credits = 60000 micro
  },
};

// Also define anonymous rate limit (not a tier — used when no userId)
export const ANONYMOUS_RATE_LIMIT = { windowMs: 3600000, maxRequests: 2 };
```

Implement:
```typescript
export function resolveTierFromPriceId(priceId: string): UserTier
// Match against env.STRIPE_PASS_PRICE_ID → 'pass'
// Match against env.STRIPE_LAB_PRICE_ID → 'lab'
// Unknown → throw Error

export async function getUserTier(userId: string): Promise<UserTier>
// SELECT subscription_tier FROM users WHERE id = userId
// Return 'free' if no user found
// Admin override: if env has ADMIN_TIER_OVERRIDE and userId matches, return that tier
```

### 2. Update rate limiter

Modify `lib/common/rate-limit.ts` to support tier-aware configuration:

The existing `createRateLimiter` works fine — it already accepts `RateLimitConfig`. No structural changes needed. But add a convenience function:

```typescript
export function getRateLimitConfigForTier(tier: UserTier | "anonymous"): RateLimitConfig {
  if (tier === "anonymous") return ANONYMOUS_RATE_LIMIT;
  return TIER_CONFIG[tier].rateLimit;
}
```

This can live in `lib/stripe/tier.ts` rather than modifying rate-limit.ts, to avoid a circular dependency. Place it where it makes sense — the key point is that rate limiting config comes from tier config.

### 3. Unit tests

Create `lib/stripe/tier.test.ts`:

Tests:
- Test TIER_CONFIG has entries for free, pass, lab
- Test free tier: 5/hr, maxAgents=1, no BYOK, no API
- Test pass tier: 15/hr, maxAgents=5, BYOK=true, grant=30000
- Test lab tier: unlimited rate, unlimited agents, API access, grant=60000
- Test resolveTierFromPriceId maps correctly (mock env values)
- Test resolveTierFromPriceId throws for unknown price ID
- Test getUserTier returns 'free' for unknown user
- Test getUserTier returns correct tier from DB (mock db)
- Test anonymous rate limit is 2/hr

### Do NOT
- Install Stripe SDK — that's task 18
- Implement webhook handling — that's task 18
- Create checkout sessions — that's task 19
- Add admin override logic beyond a simple env check
- Create a migration for subscription fields — they should already exist from task 02

## Verification
After implementing, verify:
- `pnpm run typecheck` exits 0
- `pnpm run lint` exits 0
- `pnpm run test:unit` exits 0 — tier tests pass
- `lib/stripe/tier.ts` exports UserTier, TIER_CONFIG, resolveTierFromPriceId, getUserTier
- Rate limits match SPEC.md: anon=2/hr, free=5/hr, pass=15/hr, lab=unlimited
- Grant amounts match SPEC.md: pass=300 credits (30000 micro), lab=600 credits (60000 micro)
