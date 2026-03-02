# 12-credit-catalog

## Context
depends_on: [11]
produces: [lib/credits/catalog.ts, lib/credits/intro-pool.ts, lib/credits/catalog.test.ts, lib/credits/intro-pool.test.ts]
domain: lib/credits/
gate: typecheck + lint + test:unit

## References
Read these files before implementing:
- SPEC.md (Tier Configuration section — pricing, Data Model — intro_pool table)
- lib/credits/DOMAIN.md
- lib/credits/types.ts (MicroCredits, CreditSource)
- lib/credits/balance.ts (applyCreditDelta)
- db/schema.ts (intro_pool table)

## Task

### 1. Model pricing catalog

Create `lib/credits/catalog.ts`:

```typescript
// Per-million-token rates in GBP
const MODEL_PRICING = {
  "claude-haiku": { inputPerMillion: 0.25, outputPerMillion: 1.25 },
  "claude-sonnet": { inputPerMillion: 3.00, outputPerMillion: 15.00 },
} as const;

export const CREDIT_PLATFORM_MARGIN = 0.10; // 10%
export const MICRO_PER_CREDIT = 100; // 100 micro = 1 credit
export const GBP_PER_CREDIT = 0.01; // 1p per credit

export function toMicroCredits(credits: number): number
// credits * MICRO_PER_CREDIT

export function fromMicroCredits(micro: number): number
// micro / MICRO_PER_CREDIT

export function estimateBoutCostGbp(params: {
  maxTurns: number;
  model: "claude-haiku" | "claude-sonnet";
  estimatedInputTokensPerTurn?: number;  // default 500
  estimatedOutputTokensPerTurn?: number; // default 300
}): number
// For each turn: (inputTokens * inputRate + outputTokens * outputRate) / 1_000_000
// Sum all turns, add margin, return GBP

export function estimateBoutCostMicro(params: {
  maxTurns: number;
  model: "claude-haiku" | "claude-sonnet";
  estimatedInputTokensPerTurn?: number;
  estimatedOutputTokensPerTurn?: number;
}): number
// Convert GBP cost to micro-credits: gbp / GBP_PER_CREDIT * MICRO_PER_CREDIT
// Round up to nearest integer (Math.ceil)
```

### 2. Intro pool

Create `lib/credits/intro-pool.ts`:

The intro pool is a shared pool of credits for anonymous users. It decays via half-life to create urgency.

```typescript
export async function ensureIntroPool(): Promise<void>
// INSERT INTO intro_pool (initial_micro, claimed_micro, half_life_days)
// VALUES (1000000, 0, 3)
// ON CONFLICT DO NOTHING (singleton row)

export async function claimFromIntroPool(
  userId: string,
  requestedMicro: number
): Promise<{ claimed: number; poolRemaining: number }>
// 1. Read the pool row
// 2. Compute effective remaining: initial_micro * (0.5 ^ (days_since_created / half_life_days)) - claimed_micro
//    Use: initial_micro * power(0.5, EXTRACT(EPOCH FROM (now() - created_at)) / (half_life_days * 86400)) - claimed_micro
// 3. Clamp claim to min(requestedMicro, effectiveRemaining, 0)
// 4. Atomic UPDATE: claimed_micro = claimed_micro + actualClaim WHERE the computed remaining >= actualClaim
// 5. Credit the user via applyCreditDelta with source='signup', reference_id=`intro:${userId}`
// 6. Return { claimed: actualClaim, poolRemaining: effectiveRemaining - actualClaim }

export async function refundIntroPool(amountMicro: number): Promise<void>
// UPDATE intro_pool SET claimed_micro = GREATEST(0, claimed_micro - amountMicro)

export async function getIntroPoolStatus(): Promise<{
  initialMicro: number;
  claimedMicro: number;
  effectiveRemainingMicro: number;
  halfLifeDays: number;
  createdAt: Date;
}>
```

### 3. Unit tests

Create `lib/credits/catalog.test.ts`:
- Test toMicroCredits: 100 credits → 10000 micro
- Test fromMicroCredits: 10000 micro → 100 credits
- Test estimateBoutCostGbp for haiku 6-turn bout (verify magnitude is reasonable)
- Test estimateBoutCostGbp for sonnet is more expensive than haiku
- Test estimateBoutCostMicro rounds up (Math.ceil)
- Test platform margin is applied (10%)

Create `lib/credits/intro-pool.test.ts`:
- Test ensureIntroPool is idempotent
- Test claimFromIntroPool reduces pool and credits user
- Test claimFromIntroPool clamps to available amount
- Test half-life decay calculation: at t=half_life_days, effective is ~50% of initial
- Test refundIntroPool increases available pool
- Test getIntroPoolStatus returns correct computed values

Mock `db` for all tests. For decay calculations, use `vi.useFakeTimers()`.

### Do NOT
- Wire into the bout engine — that happens in task 13
- Create any API routes for credits
- Implement actual Stripe integration — that's tasks 17-19
- Use floating point comparison with exact equality — use approximate matching (toBeCloseTo) for GBP amounts

## Verification
After implementing, verify:
- `pnpm run typecheck` exits 0
- `pnpm run lint` exits 0
- `pnpm run test:unit` exits 0 — catalog and intro-pool tests pass
- `lib/credits/catalog.ts` exports estimateBoutCostMicro, toMicroCredits, fromMicroCredits
- `lib/credits/intro-pool.ts` exports ensureIntroPool, claimFromIntroPool, getIntroPoolStatus
- CREDIT_PLATFORM_MARGIN is 0.10 (10%)
- Haiku pricing is cheaper than Sonnet
