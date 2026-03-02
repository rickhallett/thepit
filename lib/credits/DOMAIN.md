# lib/credits

Credit economy: balances, preauthorisation, settlement, intro pool, credit catalog.
Co-located tests: `*.test.ts` beside the module they test.

## Files

- `balance.ts` — ensureCreditAccount, getCreditBalance, applyCreditDelta
- `preauth.ts` — preauthorizeCredits (atomic conditional deduction)
- `settlement.ts` — settleCredits (delta reconciliation, refund on error)
- `catalog.ts` — pricing per model, cost estimation, micro-credit conversion
- `intro-pool.ts` — shared anonymous pool with half-life decay
- `types.ts` — MicroCredits, CreditSource, TransactionMetadata

## Owns

- Credit-related DB operations (credits, credit_transactions, intro_pool tables)

## Depends on

- `db` (direct table access)
- `lib/common` (types)
