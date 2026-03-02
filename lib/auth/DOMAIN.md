# lib/auth

Authentication, user mirroring, referrals, session initialisation.
Co-located tests: `*.test.ts` beside the module they test.

## Files

- `users.ts` — ensureUserRecord (Clerk → DB mirror), profile refresh
- `referrals.ts` — ensureReferralCode, applyReferralBonus
- `onboarding.ts` — initializeUserSession (first-load sequence)
- `middleware.ts` — auth helpers for route handlers

## Owns

- `middleware.ts` (root — Clerk middleware wrapper)
- User-related DB operations (users, referrals tables)

## Depends on

- `lib/credits` (ensureCreditAccount, applySignupBonus)
- `db` (direct table access)
- Clerk SDK (@clerk/nextjs)
