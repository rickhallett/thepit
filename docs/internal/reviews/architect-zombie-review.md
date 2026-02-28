# Architect Review — Zombie Code Audit

**Date:** 2026-02-28
**Reviewer:** Architect
**HEAD:** 89f6a07
**Codebase:** ~102k LOC (62k TypeScript, 36k Go, 4k Python)

## Executive Summary

The codebase is architecturally sound — the core bout lifecycle, credit economy, and tier system are clean and well-structured. However, the rapid iteration phase has left behind **~1,400 LOC of confirmed dead code** in the TypeScript layer plus **~240 LOC** of dead components and an **~189 LOC** dead archive file. The largest single finding is `lib/free-bout-pool.ts` (189 LOC) — a complete module with its own DB schema table that was superseded by the intro pool system but never removed. The bout engine even has a comment confirming its removal: `// free-bout-pool removed`. There are also ~30 dead exports across `lib/` modules and two dead components (`free-bout-counter.tsx`, `darwin-countdown.tsx`). Estimated safe reduction: **~1,900 LOC** with no functional regression.

## Findings by Risk Level

### SAFE — Remove with high confidence (no regression risk)

#### S-1: `lib/free-bout-pool.ts` — Dead module (189 LOC)

**Evidence:** The bout engine (`lib/bout-engine.ts:72`) explicitly comments `// free-bout-pool removed — intro pool half-life is the sole anonymous cost gate.` Zero imports outside the file itself and test mocks. The intro pool system (`lib/intro-pool.ts`) has fully replaced this module.

**Note:** The `freeBoutPool` DB schema table in `db/schema.ts` (lines 274-288, ~15 LOC) should also be removed, but requires a migration (defer to Foreman). The `tests/unit/free-bout-pool.test.ts` test file should also be removed.

**LOC reduction:** 189 (module) + ~130 (test file) = ~319

---

#### S-2: `archive/share-modal.tsx` — Dead archive file (189 LOC)

**Evidence:** Zero imports from `@/archive/` anywhere in the codebase. The current sharing UI uses `components/share-panel.tsx`. This file imports from `@/lib/cn` and `@/lib/analytics` but is never rendered.

**LOC reduction:** 189

---

#### S-3: `components/free-bout-counter.tsx` — Dead component (52 LOC)

**Evidence:** Zero imports of `FreeBoutCounter` anywhere in the codebase. This displayed the daily free bout pool status bar, which was removed when the system migrated to the intro pool. Corresponds to the dead `lib/free-bout-pool.ts` module.

**LOC reduction:** 52

---

#### S-4: `components/darwin-countdown.tsx` — Dead component (103 LOC)

**Evidence:** Zero imports of `DarwinCountdown` anywhere in the codebase. This was a pre-launch countdown timer targeting `2026-02-13T11:55:00Z` — the launch date has passed (2+ weeks ago). The component is no longer referenced by any page.

**LOC reduction:** 103

---

#### S-5: `lib/presets.ts` — `PRESETS` alias is dead export

**Evidence:** Line 210: `export const PRESETS: Preset[] = ALL_PRESETS;` — this alias is never imported anywhere. All consumers use `ALL_PRESETS` directly. The `PRESETS` export is a vestigial alias from before `ALL_PRESETS` was introduced.

**LOC reduction:** 1

---

#### S-6: `lib/presets.ts` — `FREE_PRESETS` export is dead

**Evidence:** `export const FREE_PRESETS` (line 193) is never imported by any file. Consumers use `ALL_PRESETS` which includes both free and premium presets.

**LOC reduction:** 0 (keep the variable for `ALL_PRESETS` construction, just remove `export` keyword)

---

#### S-7: `lib/presets.ts` — `PREMIUM_PRESETS` export is dead

**Evidence:** `export const PREMIUM_PRESETS` (line 195) is never imported by any file. Same situation as `FREE_PRESETS`.

**LOC reduction:** 0 (remove `export` keyword only)

---

#### S-8: `lib/presets.ts` — `RESEARCH_PRESETS` export is dead

**Evidence:** `export const RESEARCH_PRESETS` (line 205) is never imported by any file. It's used internally in `PRESET_BY_ID` construction, but the export itself is unnecessary.

**LOC reduction:** 0 (remove `export` keyword only)

---

#### S-9: `lib/presets.ts` — `DEFAULT_ARENA_MAX_TURNS` deprecated constant

**Evidence:** Line 37-38: explicitly marked `@deprecated Use DEFAULT_ARENA_TURNS from '@/lib/turns' instead.` Only referenced by test mocks (`run-bout-arena.test.ts`, `security-topic-length.test.ts`) that mock the presets module. The app code uses `lib/turns.ts`.

**LOC reduction:** 3 (constant + deprecated JSDoc) after updating test mocks

---

#### S-10: `lib/presets.ts` — `AlternatePreset` and `AlternatePresetAgent` types are dead exports

**Evidence:** These types are exported but only used internally within `lib/presets.ts` for the `normalizePackPreset` function. No external consumer imports them.

**LOC reduction:** 0 (remove `export` keywords only)

---

#### S-11: `lib/presets.ts` — `PRESET_BY_ID` export is dead

**Evidence:** The Map export is never imported. All consumers use `getPresetById()` which wraps it.

**LOC reduction:** 0 (remove `export` keyword only)

---

#### S-12: `lib/agent-display-name.ts` — `getAgentNameParts()` is dead export (7 LOC)

**Evidence:** `getAgentNameParts` (lines 34-39) is never imported by any file. Only `getAgentDisplayName` is used (by `components/leaderboard-table.tsx`).

**LOC reduction:** 7

---

#### S-13: `lib/domain-ids.ts` — 6 dead exports (type guards and brand constructors)

**Evidence:** The following exports are never used outside `lib/domain-ids.ts` itself:
- `asUserId()` — never imported
- `asMicroCredits()` — never imported
- `isBoutId()` — never imported
- `isUserId()` — never imported
- `isAgentId()` — never imported
- `isMicroCredits()` — never imported

Only `asBoutId`, `asAgentId`, `BoutId`, and `AgentId` are used (by `lib/api-schemas.ts`).

**LOC reduction:** ~24 (6 functions × ~4 lines each)

---

#### S-14: `lib/credits.ts` — Dead exports (functions used only internally)

The following are exported but never imported by any other file:

- `estimateBoutTokens()` — used only within `lib/credits.ts` by `estimateBoutCostGbp()`
- `getModelPricing()` — used only within `lib/credits.ts` by cost functions
- `GBP_TO_USD` — used only within `lib/credits.ts` by `computeCostUsd()`
- `TOKEN_CHARS_PER` — never imported externally
- `INPUT_FACTOR` — never imported externally
- `OUTPUT_TOKENS_PER_TURN` — never imported externally
- `BYOK_FEE_GBP_PER_1K_TOKENS` — never imported externally (only `BYOK_ENABLED` is imported)
- `BYOK_MIN_GBP` — never imported externally
- `microToCredits()` — only used within `credit-catalog.ts` (internal consumption, not external)

**Action:** Remove `export` keywords only. These are all used internally.

**LOC reduction:** 0 (keyword-only changes)

---

#### S-15: `lib/tier.ts` — `getDailyBoutsUsed()` is dead code (16 LOC)

**Evidence:** Only defined and used within `lib/tier.ts` — but actually it's not even called there. The `canRunBout()` function comments out daily cap enforcement: `// No per-user daily caps for any tier`. The function exists but does nothing useful anymore.

**LOC reduction:** 16

---

#### S-16: `lib/tier.ts` — `getAvailableModels()` export is alive but barely

**Evidence:** Used by `app/arena/page.tsx`. Keep.

---

#### S-17: `lib/agent-dna.ts` — `canonicalizePrompt` and `canonicalizeAgentManifest` are dead exports

**Evidence:** Both are used internally but never imported by external files. `hashAgentPrompt` and `hashAgentManifest` (which call them) are the public interface.

**LOC reduction:** 0 (remove `export` keywords only)

---

#### S-18: `lib/eval/index.ts` — Dead barrel file (17 LOC)

**Evidence:** This barrel re-export file is never imported by any app code. Tests import directly from sub-modules (e.g., `@/lib/eval/debate-quality-judge`).

**LOC reduction:** 17

---

#### S-19: `lib/eval/belief-stance.ts` — Only imported by dead barrel (197 LOC)

**Evidence:** `belief-stance.ts` is only imported by `lib/eval/index.ts`, which is itself dead (S-18). No test file imports `belief-stance.ts` directly, and no app code uses it. This is unreachable code.

**LOC reduction:** 197

---

#### S-20: `db/schema.ts` — `agentFlags` table is dead schema (17 LOC)

**Evidence:** The `agentFlags` table definition (lines 290-307) is only referenced by the Drizzle migration schema (`drizzle/schema.ts`). No application code imports or uses this table. No API route or server action references agent flags.

**Note:** Requires a DB migration to drop the table. Defer to Foreman.

**LOC reduction:** 17 (from schema, after migration)

---

### LOW RISK — Remove with basic verification (run tests after)

#### L-1: `lib/agent-prompts.ts` — Thin pass-through wrapper (37 LOC)

**Evidence:** This entire file is a thin wrapper around `buildXmlAgentPrompt()` from `lib/xml-prompt.ts`. The wrapper re-exports it as `buildStructuredPrompt()` with an identical `AgentPromptFields` type (which is identical to `XmlAgentPromptFields`). Three consumers import from it: `app/api/agents/route.ts`, `lib/seed-agents.ts`, and `scripts/enhance-presets.ts`.

**Action:** Update those 3 consumers to import `buildXmlAgentPrompt` directly from `@/lib/xml-prompt`, then delete `lib/agent-prompts.ts`. The type `AgentPromptFields` is identical to `XmlAgentPromptFields` — consumers can use the canonical type.

**LOC reduction:** 37

---

#### L-2: `lib/agent-links.ts` — Only test-imported (16 LOC)

**Evidence:** The three functions (`encodeAgentId`, `decodeAgentId`, `buildAgentDetailHref`) are only imported by `tests/unit/agent-links.test.ts`. No app code, no component, no API route uses them. The app uses `encodeURIComponent` directly where needed.

**LOC reduction:** 16 (module) + ~30 (test file) = ~46

---

#### L-3: `lib/agent-lineage.ts` — Only test-imported (35 LOC)

**Evidence:** `buildLineage()` is only imported by `tests/unit/agent-lineage.test.ts`. The app uses `lib/agent-detail.ts` which has its own inline lineage traversal logic (walking the DB). This shared utility was likely extracted for reuse that never materialized.

**LOC reduction:** 35 (module) + ~50 (test file) = ~85

---

#### L-4: `lib/credits.ts` — `getCreditTransactions()` appears unused by API

**Evidence:** This function is defined in `lib/credits.ts` and used by `app/arena/page.tsx` to display transaction history. It IS used — confirmed. **Keep.**

---

#### L-5: Test mock cleanup for free-bout-pool

**Evidence:** Five test files mock `@/lib/free-bout-pool`:
- `tests/api/run-bout-tier.test.ts`
- `tests/api/run-bout-credits.test.ts`
- `tests/api/run-bout-params.test.ts`
- `tests/api/run-bout-errors.test.ts`
- `tests/api/run-bout-arena.test.ts`

These mocks should be removed when `lib/free-bout-pool.ts` is deleted (S-1).

**LOC reduction:** ~25 (mock declarations across 5 files)

---

### MEDIUM RISK — Remove with careful verification (may need test updates)

#### M-1: `lib/eval/` directory — Tests-only infrastructure (807 LOC total)

**Evidence:** The entire `lib/eval/` directory is only consumed by test files under `tests/unit/eval/`. No app code, API route, or server action imports from this module tree. The evaluators were built for the LangSmith evaluation pipeline and are functional but disconnected from the app.

**Assessment:** The evaluators are legitimate research infrastructure. They should stay but be moved to a `tests/eval/` or `scripts/eval/` location to make the architecture clearer. This is not dead code — it's misplaced code.

**Action:** Consider relocating to `tests/eval/` or `scripts/eval/` (no LOC reduction, better organization).

---

#### M-2: `lib/free-bout-pool.ts` + `db/schema.ts:freeBoutPool` — Table migration needed

**Evidence:** The `freeBoutPool` table in `db/schema.ts` (lines 274-288) backs the dead `lib/free-bout-pool.ts` module. Removing the schema definition requires a Drizzle migration to drop the table.

**Action:** Defer to Foreman for migration. Remove schema definition + module simultaneously.

---

#### M-3: Duplicate research export routes

**Evidence:** Two routes serve similar research export functionality:
- `app/api/admin/research-export/route.ts` (25 LOC) — Admin-only POST to generate exports
- `app/api/research/export/route.ts` (54 LOC) — Public GET to download exports

**Assessment:** These serve different purposes (admin generation vs public download). **Not actually redundant.** Keep both.

---

### HIGH RISK — Investigate before removing (may affect runtime behavior)

#### H-1: `lib/models.ts` — `assertNotDeprecated()` runs at import time

**Evidence:** This function is exported (unnecessary — only used internally by `validateModelEnvVars()`) but the `validateModelEnvVars()` call at module load (lines 230-232) is critical for fail-fast behavior in production. The function itself is used only within the module's import-time self-check.

**Action:** Remove the `export` keyword from `assertNotDeprecated`. Do NOT remove the function or the import-time validation.

---

#### H-2: `lib/credits.ts` — Several exported constants used only internally

These constants (`TOKEN_CHARS_PER`, `OUTPUT_TOKENS_PER_TURN`, `INPUT_FACTOR`, `BYOK_FEE_GBP_PER_1K_TOKENS`, `BYOK_MIN_GBP`) are exported but only consumed within `lib/credits.ts`. However, they are backed by env vars and could be imported by future consumers or Go CLI tools that read them.

**Assessment:** Safe to remove `export` keywords, but low value. These are API surface for the credit economy — someone building a pricing calculator would need them.

**Action:** Leave exported for now. Low priority.

---

## Dependency Analysis

### npm packages — All Used

Every dependency in `package.json` is imported somewhere:

| Package | Used By |
|---------|---------|
| `@ai-sdk/anthropic` | `lib/ai.ts` |
| `@clerk/nextjs` | Auth throughout app |
| `@clerk/themes` | Sign-in/sign-up pages |
| `@ethereum-attestation-service/eas-sdk` | `lib/eas.ts` |
| `@fontsource/ibm-plex-mono` | Font imports |
| `@fontsource/space-grotesk` | Font imports |
| `@neondatabase/serverless` | `db/index.ts` |
| `@openrouter/ai-sdk-provider` | `lib/ai.ts` |
| `@scalar/nextjs-api-reference` | `app/docs/api/route.ts` |
| `@sentry/nextjs` | Error tracking throughout |
| `@vercel/analytics` | Layout wrapper |
| `ai` | Core AI SDK |
| `canonicalize` | `lib/agent-dna.ts` |
| `clsx` | Component styling |
| `drizzle-orm` | DB queries throughout |
| `ethers` | `lib/eas.ts` |
| `langsmith` | `lib/langsmith.ts` |
| `lucide-react` | Icons |
| `nanoid` | ID generation |
| `next` | Framework |
| `posthog-js` | Client analytics |
| `posthog-node` | Server analytics |
| `react`, `react-dom` | Framework |
| `stripe` | Payment processing |
| `tailwind-merge` | `lib/cn.ts` |
| `zod` | Input validation |

**Note:** `ethers` (heavy dependency) is only used by `lib/eas.ts` for EAS attestation. If EAS is disabled in production (env flag), this adds ~1.2MB to the bundle for nothing. Not dead code per se, but a conditional dependency that could be lazy-loaded.

### Go modules — Clean

All Go CLIs pass `go vet ./...` with zero issues. The `go.work` file references all 8 CLI tools + shared library, all of which are active.

### `piteval/` — Python, not in go.work

`piteval/` is a Python CLI (not Go), not listed in `go.work`, and includes its own `.venv/`. It's a separate tool for evaluation analysis. Has `__pycache__` directories committed. The `__pycache__` dirs should be gitignored (not code, but cleanup).

## Estimated Total LOC Reduction

| Category | Items | LOC |
|----------|-------|-----|
| **SAFE — Dead modules** | S-1, S-2, S-3, S-4, S-19 | 730 |
| **SAFE — Dead exports/code** | S-5 through S-18 | 65 |
| **SAFE — Associated test files** | S-1 tests, L-5 mocks | 475 |
| **LOW — Thin wrappers** | L-1, L-2, L-3 | 168 |
| **MEDIUM — Relocated** | M-1 eval barrel | 17 |
| **Total estimated** | | **~1,455** |

### Summary by confidence level

- **High confidence (SAFE):** ~1,270 LOC — remove immediately, run `pnpm run test:ci`
- **Low risk:** ~168 LOC — requires 3-6 import path updates
- **Medium risk:** ~17 LOC — requires test verification
- **Total actionable:** **~1,455 LOC** (~1.4% of codebase)

### Not counted but notable

- ~30 `export` keywords that should be removed to reduce public API surface (zero LOC reduction, better encapsulation)
- `lib/eval/` should be relocated to `tests/` or `scripts/` (807 LOC moved, not deleted)
- `archive/` directory should be removed entirely (convention should be `git log`, not a directory)
- `piteval/__pycache__/` should be gitignored
- `db/schema.ts:freeBoutPool` (15 LOC) requires a Drizzle migration before removal
- `db/schema.ts:agentFlags` (17 LOC) requires a Drizzle migration before removal
