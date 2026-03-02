# 04-user-mirroring

## Context
depends_on: [03]
produces: [lib/auth/users.ts, lib/auth/referrals.ts, lib/auth/onboarding.ts, lib/auth/users.test.ts, lib/auth/referrals.test.ts]
domain: lib/auth/
gate: typecheck + lint + test:unit

## References
Read these files before implementing:
- SPEC.md (Auth Flow section, Data Model — users table, referrals table)
- lib/auth/DOMAIN.md
- db/schema.ts (users, referrals tables)
- db/index.ts (db instance)
- lib/auth/middleware.ts (getAuthUserId)

## Task

### 1. Install nanoid

```
pnpm add nanoid
```

### 2. User mirroring

Create `lib/auth/users.ts`:

```typescript
export async function ensureUserRecord(clerkUserId: string, profile: {
  email: string;
  displayName: string | null;
  imageUrl: string | null;
}): Promise<void>
```

- INSERT into users table with Clerk user ID as PK
- ON CONFLICT (id) DO NOTHING — do NOT update existing records on conflict (first write wins)
- Set created_at and updated_at
- This function is idempotent — calling it multiple times with the same ID is safe

### 3. Referral codes

Create `lib/auth/referrals.ts`:

```typescript
export async function ensureReferralCode(userId: string): Promise<string>
```

- Check if user already has a referral_code in the users table
- If yes, return it
- If no, generate one with `nanoid(8)`, UPDATE users SET referral_code = code WHERE id = userId AND referral_code IS NULL
- Retry up to 4 times on unique constraint violation (collision)
- Throw after 4 failed attempts

### 4. Onboarding orchestrator

Create `lib/auth/onboarding.ts`:

```typescript
export async function initializeUserSession(clerkUserId: string, profile: {
  email: string;
  displayName: string | null;
  imageUrl: string | null;
}): Promise<void>
```

- Calls `ensureUserRecord(clerkUserId, profile)`
- Calls `ensureReferralCode(clerkUserId)`
- Calls `ensureCreditAccount(clerkUserId)` — **THIS IS A STUB for now**

Create the stub:
```typescript
// TODO: Replaced by real implementation in task 10
async function ensureCreditAccount(_userId: string): Promise<void> {
  // Stub — credit account creation implemented in task 10
}
```

The stub will be replaced in task 10 with an import from `lib/credits/balance.ts`.

### 5. Unit tests

Create `lib/auth/users.test.ts`:
- Test that ensureUserRecord constructs the correct INSERT query (mock db)
- Test idempotency — calling twice with same ID should not throw

Create `lib/auth/referrals.test.ts`:
- Test that ensureReferralCode returns existing code if present
- Test that it generates a new code if none exists
- Test retry logic on collision (mock the unique constraint error)

For all tests, mock the `db` import. Do NOT require a real database connection.

### Do NOT
- Create a Clerk webhook endpoint — mirroring is triggered by `initializeUserSession` on first page load, not by webhooks
- Implement referral bonus logic (just code generation)
- Implement credit account creation (stub only — task 10)
- Update user profiles on subsequent logins (first write wins pattern)

## Verification
After implementing, verify:
- `pnpm run typecheck` exits 0
- `pnpm run lint` exits 0
- `pnpm run test:unit` exits 0 — user and referral tests pass
- `lib/auth/onboarding.ts` exports `initializeUserSession`
- The stub `ensureCreditAccount` exists with a TODO comment referencing task 10
- `nanoid` is in `package.json` dependencies
