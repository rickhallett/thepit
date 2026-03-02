# 10-credit-balance

## Context
depends_on: [05]
produces: [lib/credits/types.ts, lib/credits/balance.ts, lib/credits/balance.test.ts]
domain: lib/credits/
gate: typecheck + lint + test:unit

## References
Read these files before implementing:
- SPEC.md (Credit Flow section, Data Model — credits table, credit_transactions table)
- lib/credits/DOMAIN.md
- db/schema.ts (credits, credit_transactions tables)
- db/index.ts (db instance)
- lib/common/types.ts (MicroCredits)
- lib/auth/onboarding.ts (has stub for ensureCreditAccount — update it)

## Task

### 1. Credit types

Create `lib/credits/types.ts`:

```typescript
import type { MicroCredits } from "@/lib/common/types";

export const CreditSource = {
  SIGNUP: "signup",
  PURCHASE: "purchase",
  PREAUTH: "preauth",
  SETTLEMENT: "settlement",
  REFUND: "refund",
  SUBSCRIPTION_GRANT: "subscription_grant",
  MONTHLY_GRANT: "monthly_grant",
} as const;
export type CreditSource = (typeof CreditSource)[keyof typeof CreditSource];

export interface CreditTransaction {
  userId: string;
  deltaMicro: number;
  source: CreditSource;
  referenceId: string;
  metadata?: Record<string, unknown>;
}
```

### 2. Balance operations

Create `lib/credits/balance.ts`:

```typescript
export async function ensureCreditAccount(userId: string): Promise<void>
// INSERT INTO credits (user_id, balance_micro) VALUES (userId, 10000)
// ON CONFLICT (user_id) DO NOTHING
// 10000 micro = 100 credits (the default starting balance per SPEC)
// Also log a credit_transaction with source='signup', delta=10000, reference_id=`signup:${userId}`
// The transaction insert should also be ON CONFLICT DO NOTHING on reference_id
// to make this fully idempotent

export async function getCreditBalanceMicro(userId: string): Promise<number>
// SELECT balance_micro FROM credits WHERE user_id = userId
// Return 0 if no record found

export async function applyCreditDelta(
  userId: string,
  delta: number,
  source: CreditSource,
  referenceId: string,
  metadata?: Record<string, unknown>
): Promise<number>
// UPDATE credits SET balance_micro = GREATEST(0, balance_micro + delta)
// WHERE user_id = userId
// RETURNING balance_micro
// Also INSERT into credit_transactions
// Return the new balance
// The GREATEST(0, ...) floor prevents negative balances
```

### 3. Update onboarding stub

Update `lib/auth/onboarding.ts`:
- Remove the stub `ensureCreditAccount` function
- Add import: `import { ensureCreditAccount } from "@/lib/credits/balance";`
- The `initializeUserSession` function should now call the real `ensureCreditAccount`

### 4. Unit tests

Create `lib/credits/balance.test.ts`:

Mock the `db` import to verify correct SQL operations.

Tests:
- Test ensureCreditAccount inserts with correct default balance (10000 micro)
- Test ensureCreditAccount is idempotent (ON CONFLICT DO NOTHING)
- Test getCreditBalanceMicro returns balance when account exists
- Test getCreditBalanceMicro returns 0 when no account
- Test applyCreditDelta with positive delta increases balance
- Test applyCreditDelta with negative delta decreases balance
- Test applyCreditDelta never goes below 0 (GREATEST floor)
- Test applyCreditDelta logs a transaction

### Do NOT
- Implement preauthorization — that's task 11
- Implement settlement — that's task 11
- Add Stripe-related credit operations — tasks 17-18
- Create API routes for credits — they're managed internally
- Use floating point for credits — all values are integers (micro-credits)

## Verification
After implementing, verify:
- `pnpm run typecheck` exits 0
- `pnpm run lint` exits 0
- `pnpm run test:unit` exits 0 — balance tests pass
- `lib/credits/balance.ts` exports ensureCreditAccount, getCreditBalanceMicro, applyCreditDelta
- `lib/auth/onboarding.ts` imports from `lib/credits/balance` (not a stub)
- Default balance is 10000 micro (100 credits)
- GREATEST(0, ...) floor logic is present in applyCreditDelta
