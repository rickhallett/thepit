# Zombie Code Audit

**Date:** 2026-03-13
**Auditor:** furiosa (polecat)
**HEAD:** polecat/furiosa/PIT-zoz
**Scope:** app/, lib/, components/, tests/, scripts/, db/

## Executive Summary

This audit follows the 2026-02-28 architect review, which identified ~1,900 LOC of dead code. Most of that has been removed. This follow-up audit found **~350 LOC** of remaining zombie code, primarily unused type exports and one orphaned API route.

**Estimated LOC reduction:** ~350 LOC (145 in types, 57 in API route, 27 in test helper, 120 in tests)

## Findings by Category

### 1. Unused Exports (DEFINITE - 29 exports)

Type definitions exported but never imported anywhere in the codebase.

#### lib/api-schemas.ts (13 types)

All Zod schema body types are exported but never imported. They're inferrable from the schemas, but the explicit type exports aren't used.

| Line | Export | Confidence | Action |
|------|--------|------------|--------|
| 46 | `ContactBody` | DEFINITE | Remove export |
| 56 | `NewsletterBody` | DEFINITE | Remove export |
| 64 | `AskThePitBody` | DEFINITE | Remove export |
| 76 | `ReactionBody` | DEFINITE | Remove export |
| 85 | `ShortLinkBody` | DEFINITE | Remove export |
| 96 | `WinnerVoteBody` | DEFINITE | Remove export |
| 103 | `FeatureRequestVoteBody` | DEFINITE | Remove export |
| 112 | `ByokStashBody` | DEFINITE | Remove export |
| 121 | `FeatureRequestBody` | DEFINITE | Remove export |
| 133 | `PaperSubmissionBody` | DEFINITE | Remove export |
| 141 | `ResearchExportBody` | DEFINITE | Remove export |
| 159 | `PageViewBody` | DEFINITE | Remove export |
| 186 | `AgentCreateBody` | DEFINITE | Remove export |

**Recommendation:** Keep types but remove `export` keyword (~13 lines, no LOC reduction).

#### lib/xml-prompt.ts (4 types)

| Line | Export | Confidence | Action |
|------|--------|------------|--------|
| 46 | `SystemMessageParts` | DEFINITE | Remove export |
| 75 | `UserMessageParts` | DEFINITE | Remove export |
| 173 | `AskThePitParts` | DEFINITE | Remove export |
| 312 | `XmlAgentPromptFields` | DEFINITE | Remove export |

#### lib/models.ts (2 types)

| Line | Export | Confidence | Action |
|------|--------|------------|--------|
| 59 | `ModelId` | DEFINITE | Remove export |
| 135 | `ModelFamily` | DEFINITE | Remove export |

#### Other Single Unused Exports

| File | Line | Export | Confidence |
|------|------|--------|------------|
| lib/agent-prompts.ts | 15 | `AgentPromptFields` | DEFINITE |
| lib/anomaly.ts | 124 | `AnomalyInput` | DEFINITE |
| lib/copy.ts | 196 | `getActiveVariant` | DEFINITE |
| lib/engagement.ts | 107 | `BoutEngagement` | DEFINITE |
| lib/eval/debate-quality-judge.ts | 16 | `DebateQualityInput` | DEFINITE |
| lib/eval/types.ts | 57 | `BeliefStanceEvalInput` | DEFINITE |
| lib/logger.ts | 24 | `LogSignal` | DEFINITE |
| lib/request-context.ts | 28 | `getClientCountry` | DEFINITE |
| lib/tier.ts | 40 | `TierConfig` | DEFINITE |
| lib/turns.ts | 4 | `TurnOption` | DEFINITE |

---

### 2. Orphaned API Route (DEFINITE - 57 LOC)

**File:** `app/api/agents/[id]/archive/route.ts`

**Evidence:**
- Never called from any client-side code
- Not documented in API README or OpenAPI spec
- Functionality duplicated by server actions (`archiveAgent`, `restoreAgent` in `app/actions.ts`)
- Only referenced in its own test file

**Associated test file to remove:** `tests/api/agents-archive.test.ts` (~120 LOC)

**LOC reduction:** 57 (route) + 120 (test) = 177

---

### 3. Orphaned Test Helper (DEFINITE - 27 LOC)

**File:** `tests/unit/leaderboard.test.ts`
**Lines:** 107-133

**Function:** `_setupSelectForRange()`

**Evidence:** Defined but never called. Replaced by `setupDbMock()` at line 136. The underscore prefix indicates it was deprecated.

**LOC reduction:** 27

---

### 4. Unused Database Columns (NEEDS VERIFICATION)

#### 4a. introPool.drainRateMicroPerMinute - LEGACY

**File:** `db/schema.ts:165-167`

**Evidence:** The comment at `lib/intro-pool.ts:74` says: "Legacy column - decay is now computed via half-life, not linear drain." The column is written (set to 0) but never read.

**Action:** Defer migration to remove. Mark as legacy in schema JSDoc.

#### 4b. shortLinkClicks analytics columns - WRITE-ONLY

**Columns:** refCode, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referer, userAgent, ipHash

**Evidence:** Written at `lib/short-links.ts:116-129` but never queried. This is intentional audit-trail logging - no read paths exist yet.

**Action:** KEEP - these support future analytics queries.

#### 4c. freeBoutPool table - ENTIRE TABLE UNUSED

**File:** `db/schema.ts:297-311`

**Evidence:** Already documented in prior audit. Requires Drizzle migration to remove.

**Action:** Defer migration to separate PR.

---

### 5. Env Vars (NO ISSUES FOR PRODUCTION)

All production env vars in `.env.example` are actively used in code. Testing/QA variables (QA_*, TEST_*, CI, PORT, BASE_URL) are intentionally undocumented - they're runtime-injected by CI/CD.

---

### 6. Commented-Out Code (NONE FOUND)

No significant commented-out code blocks were found. All comments serve documentation purposes.

---

### 7. Prior Audit Status (CONFIRMED REMOVED)

The following items from the 2026-02-28 audit have been removed:

- [x] `lib/free-bout-pool.ts` (189 LOC) - REMOVED
- [x] `archive/share-modal.tsx` (189 LOC) - REMOVED
- [x] `components/free-bout-counter.tsx` (52 LOC) - REMOVED
- [x] `components/darwin-countdown.tsx` (103 LOC) - REMOVED
- [x] Dead exports in `lib/presets.ts` - CLEANED UP

---

## Summary

| Category | LOC | Confidence | Action |
|----------|-----|------------|--------|
| Unused type exports | ~0 | DEFINITE | Remove `export` keywords (no LOC change) |
| Orphaned API route | 57 | DEFINITE | DELETE `app/api/agents/[id]/archive/` |
| Orphaned test file | 120 | DEFINITE | DELETE `tests/api/agents-archive.test.ts` |
| Orphaned test helper | 27 | DEFINITE | DELETE `_setupSelectForRange` function |
| Legacy DB column | ~3 | NEEDS MIGRATION | Defer to separate PR |
| Dead DB table | ~15 | NEEDS MIGRATION | Defer to separate PR |
| **TOTAL DELETABLE NOW** | **~204** | | |

---

## Recommendations

### Immediate (this PR)

1. Delete `app/api/agents/[id]/archive/route.ts` (57 LOC)
2. Delete `tests/api/agents-archive.test.ts` (120 LOC)
3. Delete `_setupSelectForRange` function in `tests/unit/leaderboard.test.ts` (27 LOC)

### Follow-up (separate PRs)

4. Remove `export` keyword from 29 unused type exports (no LOC change, cleaner API surface)
5. Create Drizzle migration to drop `free_bout_pool` table
6. Create Drizzle migration to drop `intro_pool.drain_rate_micro_per_minute` column

---

## Verification

To verify these findings:

```bash
# Check for imports of deleted files
grep -r "agents/\[id\]/archive" app/ lib/ components/
grep -r "_setupSelectForRange" tests/

# Check export usage
grep -r "ContactBody" app/ lib/ components/ tests/
grep -r "SystemMessageParts" app/ lib/ components/ tests/
```
