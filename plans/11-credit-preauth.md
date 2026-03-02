# 11-credit-preauth

## Context
depends_on: [10]
produces: [lib/credits/preauth.ts, lib/credits/settlement.ts, lib/credits/preauth.test.ts, lib/credits/settlement.test.ts]
domain: lib/credits/
gate: typecheck + lint + test:unit

## References
Read these files before implementing:
- SPEC.md (Credit Flow section — preauth → settle cycle)
- lib/credits/DOMAIN.md
- lib/credits/balance.ts (applyCreditDelta, getCreditBalanceMicro)
- lib/credits/types.ts (CreditSource, CreditTransaction)
- db/schema.ts (credits, credit_transactions tables)
- db/index.ts (db instance)

## Task

### 1. Preauthorization

Create `lib/credits/preauth.ts`:

```typescript
export interface PreauthResult {
  success: boolean;
  newBalance: number;
  preauthId: string; // reference_id for tracking
}

export async function preauthorizeCredits(
  userId: string,
  estimatedCostMicro: number,
  boutId: string
): Promise<PreauthResult>
```

Implementation:
- Generate preauthId: `preauth:${boutId}`
- Perform atomic UPDATE: `UPDATE credits SET balance_micro = balance_micro - estimatedCostMicro WHERE user_id = userId AND balance_micro >= estimatedCostMicro`
- Check rows affected: if 0, return `{ success: false, newBalance: current balance, preauthId }`
- If 1, log transaction with source='preauth', delta=-estimatedCostMicro, reference_id=preauthId
- Return `{ success: true, newBalance, preauthId }`

The WHERE clause `balance_micro >= estimatedCostMicro` is the atomic guard — it prevents two concurrent preauths from both succeeding if the balance only covers one.

### 2. Settlement

Create `lib/credits/settlement.ts`:

```typescript
export interface SettlementResult {
  finalBalance: number;
  adjustmentMicro: number; // positive = refund, negative = additional charge
}

export async function settleCredits(
  userId: string,
  boutId: string,
  actualCostMicro: number,
  estimatedCostMicro: number
): Promise<SettlementResult>
```

Implementation:
- Calculate delta: `estimatedCostMicro - actualCostMicro`
- If delta > 0: overestimated → refund the difference via applyCreditDelta with source='settlement', reference_id=`settle:${boutId}`
- If delta < 0: underestimated → charge additional, capped at available balance (use LEAST to avoid going negative)
- If delta === 0: no adjustment needed, still log a zero-delta transaction for audit trail
- Return final balance and adjustment amount

```typescript
export async function refundPreauth(
  userId: string,
  boutId: string,
  preauthAmountMicro: number
): Promise<number>
```

- Full refund of preauth amount on error paths
- Uses applyCreditDelta with source='refund', reference_id=`refund:${boutId}`
- Returns new balance

### 3. Unit tests

Create `lib/credits/preauth.test.ts`:

Mock `db` for all tests.

Tests:
- Test successful preauth: balance 10000, cost 5000 → success, balance 5000
- Test insufficient funds: balance 3000, cost 5000 → failure, balance unchanged
- Test preauth logs a transaction with source='preauth'
- Test concurrent preauth guard: simulate WHERE clause rejecting second preauth

Create `lib/credits/settlement.test.ts`:

Tests:
- Test overestimate: estimated 5000, actual 3000 → refund 2000
- Test underestimate: estimated 3000, actual 5000 → charge 2000 (capped at available)
- Test exact: estimated 5000, actual 5000 → zero adjustment
- Test refundPreauth: restores full preauth amount
- Test settlement logs a transaction with source='settlement'
- Test refund logs a transaction with source='refund'

### Do NOT
- Implement pricing/cost estimation — that's task 12 (catalog)
- Wire into the bout engine — that's task 13
- Create API endpoints for credits
- Use transactions wrapping multiple tables — each operation is atomic on the credits table via the WHERE clause

## Verification
After implementing, verify:
- `pnpm run typecheck` exits 0
- `pnpm run lint` exits 0
- `pnpm run test:unit` exits 0 — preauth and settlement tests pass
- `lib/credits/preauth.ts` exports preauthorizeCredits
- `lib/credits/settlement.ts` exports settleCredits and refundPreauth
- The atomic WHERE clause (`balance_micro >= amount`) is present in preauthorizeCredits
- All operations log to credit_transactions with unique reference_ids
