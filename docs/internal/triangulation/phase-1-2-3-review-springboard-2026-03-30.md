# Adversarial Review: Phase 1 + 2 + 3

Date: 2026-03-30
Reviewer: Codex
Scope: commits `ae5f854..a4e5a3e`
Method: code inspection against current repo state, migration-path inspection against installed Drizzle packages, and test-surface inspection
Verdict: not ready for production use in its current form

## Executive Summary

The review surfaced five material defects and one important correction to the original springboard.

The two highest-risk problems are:

1. The newly added migrations are not registered in `drizzle/meta/_journal.json`, so Drizzle's migrator will not apply them at all.
2. The run surfaces have no ownership enforcement. Any logged-in user can execute, evaluate, or tag another user's run, and several read paths expose run contents publicly.

There are also correctness defects in report and economics assembly once a run has been evaluated more than once or against more than one rubric. The current implementation quietly picks arbitrary or mismatched evaluation records.

## Findings

### 1. `S1-critical DATA` New run-model migrations will be skipped by Drizzle's migrator

**Why this matters**

The review scope added migrations `0004` through `0010`, but the migration journal still contains only `0000_baseline` and `0001_wild_dreadnoughts`. Drizzle ORM's migrator reads executable migrations strictly from `meta/_journal.json`, not by scanning the directory. In this repo state, the new SQL files exist but are invisible to the migrator.

**Evidence**

- `drizzle/meta/_journal.json` contains only two entries: `0000_baseline`, `0001_wild_dreadnoughts`
- `drizzle/0004_m1.1-tasks.sql` through `drizzle/0010_m3.1-cost-ledger.sql` exist on disk but have no journal entries
- `node_modules/drizzle-orm/migrator.js` reads `journal.entries` and loads `${journalEntry.tag}.sql` only

**Impact**

- Fresh or partially migrated environments using Drizzle migrate will not create `tasks`, `runs`, `contestants`, `traces`, `rubrics`, `evaluations`, `failure_tags`, or `cost_ledger`
- Runtime code will then fail against missing tables and enums even though the migration files are present in git

**References**

- `drizzle/meta/_journal.json`
- `drizzle/0004_m1.1-tasks.sql`
- `drizzle/0010_m3.1-cost-ledger.sql`
- `node_modules/drizzle-orm/migrator.js`

### 2. `S1-critical SECURITY` Any authenticated user can mutate another user's run

**Why this matters**

Run creation records an `ownerId`, but the mutation routes never verify that the caller owns the target run. Authentication is present, authorization is missing.

**Evidence**

- Run owner is stored at creation in `app/api/runs/route.ts:43`
- `POST /api/runs/[id]/execute` checks only `auth()` then calls `executeRun` directly in `app/api/runs/[id]/execute/route.ts:21-31`
- `POST /api/runs/[id]/evaluate` checks only `auth()` then calls `evaluateRun` directly in `app/api/runs/[id]/evaluate/route.ts:21-39`
- `POST /api/runs/[id]/failures` checks only `auth()` then inserts a manual tag directly in `app/api/runs/[id]/failures/route.ts:36-58`
- None of the domain functions (`lib/run/engine.ts`, `lib/eval/judge.ts`, `lib/eval/failure-tags.ts`) enforce owner checks either

**Impact**

- User B can execute User A's pending run
- User B can spend judge-model cost on User A's completed run
- User B can attach manual failure tags to User A's results

This is a straight insecure direct object reference over guessed or leaked run IDs.

**References**

- `app/api/runs/route.ts:43`
- `app/api/runs/[id]/execute/route.ts:21`
- `app/api/runs/[id]/evaluate/route.ts:21`
- `app/api/runs/[id]/failures/route.ts:36`

### 3. `S1-critical SECURITY` Run contents are exposed publicly across API and UI surfaces

**Why this matters**

The system stores task prompts, constraints, acceptance criteria, full request messages, model responses, scores, costs, and failure tags. Several routes and pages expose this data without auth or owner checks.

**Evidence**

- `GET /api/runs/[id]` has no auth and returns `getRunWithTraces(...)` in `app/api/runs/[id]/route.ts:13-27`
- `GET /api/runs/[id]/failures` has no auth in `app/api/runs/[id]/failures/route.ts:16-25`
- `GET /api/runs/[id]/report` has no auth in `app/api/runs/[id]/report/route.ts:20-37`
- `GET /api/runs` scopes by `ownerId: userId ?? undefined`, which means unauthenticated callers fall through to all runs in `app/api/runs/route.ts:58-76` and `lib/run/runs.ts:61-79`
- The run list page bypasses auth entirely and calls `listRuns(db, { status, limit, offset })` in `app/(eval)/runs/page.tsx:36-37`
- The run report page directly loads and renders the run, traces, economics, and failure tags with no auth gate in `app/(eval)/runs/[id]/page.tsx:27-45` and `app/(eval)/runs/[id]/page.tsx:156-189`

**Impact**

- Unauthenticated users can enumerate runs
- Anyone who can reach a run page or guessed API path can read prompts, trace payloads, and evaluation artifacts belonging to other users

If public runs are intended, that needs an explicit visibility model. The current implementation behaves as public-by-accident.

**References**

- `app/api/runs/[id]/route.ts:13`
- `app/api/runs/[id]/failures/route.ts:16`
- `app/api/runs/[id]/report/route.ts:20`
- `app/api/runs/route.ts:58`
- `lib/run/runs.ts:61`
- `app/(eval)/runs/page.tsx:36`
- `app/(eval)/runs/[id]/page.tsx:31`

### 4. `S2-major LOGIC` Economics can display the wrong score once a run has multiple evaluations

**Why this matters**

`getRunEconomics()` claims to join the latest score per contestant, but it loads all evaluations for the run without ordering or rubric filtering, then overwrites a map entry per row. That means the score used for `overallScore`, `scorePerDollar`, and `bestValueContestant` is effectively arbitrary when there are multiple evaluations.

**Evidence**

- `lib/run/economics.ts:81-96` loads `evaluations` by `runId` only
- No `orderBy` is applied
- No `rubricId` is applied
- The comment in `lib/run/economics.ts:90-92` explicitly admits the rows are unordered and the code just overwrites

**Impact**

- A rerun of evaluation can silently change the economics view even when execution cost did not change
- Evaluating the same run against a second rubric can make economics show a score from the wrong rubric
- `bestValueContestant` can be wrong for the report viewer

**References**

- `lib/run/economics.ts:81-96`
- `lib/run/economics.ts:121-168`

### 5. `S2-major LOGIC` The report page can assemble against the wrong rubric and show partial scorecards

**Why this matters**

The run report page chooses the rubric by taking `allEvaluations[0].rubricId`. `getEvaluationsForRun()` orders by evaluation `createdAt`, not by evaluation batch or run-level canonical rubric. If the latest inserted evaluation belongs to only one contestant or to a second rubric, the page assembles the entire report around that rubric.

**Evidence**

- `getEvaluationsForRun()` sorts all rows by `createdAt desc` in `lib/eval/evaluations.ts:60-69`
- The page picks `allEvaluations[0]!.rubricId` in `app/(eval)/runs/[id]/page.tsx:43-45`
- `assembleRunReport()` then filters evaluations to that one rubric in `lib/eval/report.ts:43-56`

**Impact**

- Multi-rubric runs can render a report for an arbitrary rubric with no user choice
- If an evaluation batch is partial or interrupted, the page can show scorecards for only some contestants while still presenting the run as "the" report
- The summary is not a generated report summary; it is the rationale from the first retained evaluation in `lib/eval/report.ts:92-94`

**References**

- `lib/eval/evaluations.ts:60`
- `app/(eval)/runs/[id]/page.tsx:43`
- `lib/eval/report.ts:43-56`
- `lib/eval/report.ts:92-94`

## Corrections To The Original Springboard

These springboard prompts did not survive inspection as written:

### `scorePerDollar` / `scorePerSecond` zero-division risk

This is not a live defect in the current code. Both calculations are guarded:

- `lib/run/economics.ts:126-130`

The real issue in economics is evaluation selection, not division by zero.

### Duplicate `0010` prefix as the primary migration problem

This is not the operative failure mode. The stronger and immediate defect is that the journal does not register any of the new migrations. Even if the `0010` naming is sloppy, the current deploy blocker is the absent journal entries.

### `generateObject` deprecation as a current breakage

The installed dependency is `ai@^6.0.73` in `package.json`, and the current code typechecks against it. This may still be future tech debt, but it is not a verified present-tense production bug from this review alone.

## Test Surface Gaps

- The run-model tests mostly mock Drizzle chains rather than exercising real SQL, so migration and query-ordering defects are not caught.
- No test in the scanned surface asserts run ownership on execute/evaluate/failure-tag routes.
- No test in the scanned surface asserts multi-rubric report selection or economics behavior.

## Ready/Not Ready

Not ready.

Minimum bar before calling this delivery production-safe:

1. Regenerate or otherwise correctly register the new Drizzle migrations.
2. Add owner authorization checks to every run read/write surface or introduce an explicit public visibility model.
3. Make economics and report assembly choose evaluations deterministically, with explicit rubric semantics.
4. Add integration tests for migration application and multi-evaluation behavior.
