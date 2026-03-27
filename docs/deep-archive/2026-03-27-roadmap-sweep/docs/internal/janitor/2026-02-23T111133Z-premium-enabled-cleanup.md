# PREMIUM_ENABLED Residual Cleanup

**Filed:** 2026-02-23T11:11:33Z
**Origin:** PR #356 review triage (Captain directive + Weaver C1 fix)
**Context:** Anonymous premium model path removed from bout engine in `86aef46`. The `PREMIUM_ENABLED` env flag and its UI-layer references are now dead code — the engine no longer consults them for anonymous users, and subscriptions handle authenticated access.

## Items

Before actioning, verify each still exists — the codebase may have moved on.

| # | File | Line | What | QA Ref |
|---|------|------|------|--------|
| J1 | `app/arena/page.tsx` | 73 | `const premiumEnabled = !subsEnabled && process.env.PREMIUM_ENABLED === 'true'` — dead branch, subscriptions are enabled in production | — |
| J2 | `app/bout/[id]/page.tsx` | 185-194 | Premium model resolution for bout detail page uses `PREMIUM_ENABLED` flag — should follow same logic as engine (Haiku for anon, tier-gated for auth) | — |
| J3 | `app/arena/custom/page.tsx` | 29 | `const premiumEnabled = process.env.PREMIUM_ENABLED === 'true'` — passed to ArenaBuilder, likely unused downstream | — |
| J4 | `lib/env.ts` | 58 | `PREMIUM_ENABLED: boolFlag` — env schema entry for a flag that no longer gates anything in the engine | — |
| J5 | `qa/config.ts` | 78 | `premiumEnabled: process.env.PREMIUM_ENABLED === 'true'` — QA fixture config | — |
| J6 | `ARCHITECTURE.md` | 73 | Documents `PREMIUM_ENABLED` as "Legacy premium preset gating" — update or remove row | — |
| J7 | `.env.example` | — | Check if `PREMIUM_ENABLED` is listed; remove if present | — |

## Verification

After cleanup, confirm:
- `pnpm run typecheck` clean
- `pnpm run lint` 0 errors
- `pnpm run test:unit` all passing
- `grep -r PREMIUM_ENABLED --include='*.ts' --include='*.tsx' --include='*.md'` returns nothing outside git history
