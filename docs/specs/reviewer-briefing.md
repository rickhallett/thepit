---
title: "Reviewer Briefing - Phase 1/2/3 Adversarial Review Preparation"
category: review
status: draft
created: 2026-03-27
audience: independent code reviewer (no prior context)
---

# Reviewer Briefing

You are reviewing changes to a Next.js 16 / TypeScript / Drizzle ORM
application. The codebase is an existing product (AI debate arena)
being extended with a structured evaluation platform. You have not
written any of this code. Your job is to find what is wrong.

This document tells you what each phase is trying to do, what the
existing codebase looks like, where the architectural risks are, and
what to focus your attention on.

Detailed specs live in `docs/specs/phase-{1,2,3}-*.md`. You do not
need to read them to review, but they define the intended behaviour
if you need to check whether the code does what was specified.

---

## The codebase you are reviewing into

**Stack:** Next.js 16, TypeScript (strict), React 19, Drizzle ORM,
Neon Postgres, Clerk auth, Stripe payments, Vercel AI SDK.

**Existing schema:** 18 tables centered on `bouts` (debates), `users`,
`agents`, `credits`, `creditTransactions`. Uses nanoid (varchar 21)
primary keys, JSONB for structured data, branded/nominal types via
a phantom `Brand<T, B>` pattern in `lib/domain-ids.ts`.

**Module pattern:** Named exports only (no classes, no default exports).
Barrel re-exports for decomposed modules. Zod validation (v4) for all
API inputs. `withLogging()` wrapper on all routes. `parseValidBody()`
for request parsing. `errorResponse()` for error responses.
`requireDb()` returns Drizzle instance. `DbOrTx` type for functions
that accept db or transaction.

**Test pattern:** Vitest, 1,289 tests, 96% coverage. `vi.hoisted()` +
`vi.mock()` for all mocks. `vi.resetAllMocks()` in `beforeEach`.
Direct route handler testing (no supertest). Self-contained test files
with no shared fixtures.

**Credit system:** Microdollar integers (`balanceMicro`, `deltaMicro`)
to avoid floating-point. This pattern is load-bearing - the new cost
ledger must use the same convention.

---

## Phase 1 - Run Model and Execution

### What it does

Adds the ability to define a task, configure two or more agent
contestants, execute them against the task, and capture full traces
(request messages, response, token counts, latency). This is the
foundational data model for everything that follows.

### New tables

- `tasks` - task definitions (prompt, constraints, acceptance criteria)
- `runs` - run records with status lifecycle (pending -> running -> completed | failed)
- `contestants` - per-run agent configurations (model, system prompt, temperature, context)
- `traces` - per-contestant execution traces (messages, response, tokens, timing)

### New modules

- `lib/run/` - new domain module directory with barrel export
  - `tasks.ts`, `contestants.ts`, `engine.ts`, `traces.ts`, `queries.ts`
- `lib/domain-ids.ts` - 4 new branded types (TaskId, RunId, ContestantId, TraceId)
- `app/api/runs/` - 2 new route files

### Coexistence rule

The new run model sits alongside the existing bout model. There are
no foreign keys between runs and bouts. They are separate concerns.
If you see any coupling between them, flag it.

### Where to focus adversarial attention

**1. Run status lifecycle**

The run status must only move forward: pending -> running -> completed | failed.
No backwards transitions. No updates to completed runs. The one
exception: a sweep function can move stale `running` runs to `failed`
(zombie recovery, not retry). Check:
- Is there a race condition between setting `running` and starting execution?
- Does the sweep correctly identify stale runs (running for > 5 min)?
- Does the sweep preserve any traces written before the failure?
- Is status updated in a transaction with trace writes?
- Is create separated from execute (two requests, not one)?

**2. Execution engine atomicity**

The engine executes contestants sequentially and writes traces. Check:
- Are traces written inside a transaction with the run status update?
- If contestant 2 fails after contestant 1 succeeds, is the run
  status `completed` (partial success) or `failed`? The spec says
  `completed` if at least one succeeds.
- If the process dies between writing trace and updating status,
  what state is the run in?

**3. AI SDK integration**

The engine calls `getModel()` from `lib/ai.ts` and `generateText()`
from the Vercel AI SDK. Check:
- Is `result.usage` (token counts) correctly extracted? Different
  providers may return different shapes.
- Is latency measured correctly (wall clock around the model call,
  not including DB writes)?
- Is the error from a failed model call captured in the trace's
  error field, or swallowed?

**4. Message building**

The engine constructs messages from task + contestant config. Check:
- If the contestant has no system prompt, is the system message
  omitted (not sent as empty string)?
- If the context bundle has zero documents, is the context user
  message omitted?
- Are constraints and acceptance criteria appended to the task
  prompt correctly, or could they be truncated/malformed?

**5. JSONB columns**

`constraints`, `acceptanceCriteria`, `contextBundle`, `requestMessages`
are JSONB. Check:
- Is the Zod schema enforcing the same shape as the TypeScript type?
- Are null and empty-array cases handled consistently?
- Is there any risk of storing `undefined` (which Postgres JSONB
  will reject)?

**6. Index coverage**

Check that queries have supporting indexes. The spec defines indexes
on: `runs.taskId`, `runs.ownerId`, `runs.status+createdAt`,
`contestants.runId`, `traces.runId`, `traces.contestantId`. If any
query does a scan on an unindexed column, flag it.

---

## Phase 2 - Evaluation and Scoring

### What it does

Adds rubric-driven evaluation. A judge model reads a contestant's
trace, scores it against a rubric's criteria, and produces per-criterion
scores with rationale. Failure tags classify what went wrong. A run
report assembles everything into a comparative analysis.

### New tables

- `rubrics` - reusable rubric definitions (criteria with weights and scales)
- `evaluations` - per-contestant evaluation results (scores, rationale, judge metadata)
- `failure_tags` - per-contestant failure classifications (taxonomy enum, manual or judge-assigned)

### New/extended modules

- `lib/eval/rubrics.ts`, `lib/eval/judge.ts`, `lib/eval/evaluations.ts`,
  `lib/eval/failure-tags.ts`, `lib/eval/scoring.ts`, `lib/eval/report.ts`
- `app/api/runs/[id]/scores/`, `app/api/runs/[id]/evaluate/`,
  `app/api/runs/[id]/failures/`, `app/api/rubrics/`, `app/api/comparisons/`

### Where to focus adversarial attention

**1. Judge output parsing and reconciliation**

The judge model returns structured JSON (scores + rationale). This is
the highest-risk point in the entire evaluation pipeline. The spec
defines strict reconciliation rules: missing criteria score as scale
minimum, extra criteria are discarded, out-of-range scores are clamped,
misspelled names are treated as missing (no fuzzy match). Check:
- What happens when the judge model returns malformed JSON?
- Does a missing criterion correctly score as scale.min with a
  reconciliation flag in metadata?
- Are extra criteria from the judge discarded (not persisted as scores)?
- Are out-of-range scores clamped to [min, max] before normalizing?
- Is name matching case-insensitive with trim?
- Is the raw judge response persisted even when parsing fails?
  (It should be, for debugging.)
- Does the evaluation metadata.reconciliation array correctly log
  all mismatch events?

**2. Weight validation**

Rubric criterion weights must sum to 1. Check:
- Is this enforced at creation time (Zod refine)?
- Is it re-validated at evaluation time (in case the rubric was
  created before the constraint existed)?
- What is the floating-point tolerance? The spec says `Math.abs(sum - 1) < 0.01`.
  Is that tight enough? Too tight?

**3. Score computation**

Weighted scores are computed in `lib/eval/scoring.ts`. This module
is supposed to be pure computation with no DB calls. Check:
- Is it actually pure? No imports from db, no side effects?
- Is normalization correct? (score - min) / (max - min) * weight?
- What happens with a scale of min=1, max=1 (division by zero)?
- Are weights applied before or after normalization?

**4. Evaluation immutability and failed-run access**

Evaluations are append-only. Re-evaluation creates a new record.
Failed runs (all contestants errored) are evaluable - contestants
with successful traces get scored, error traces get failure-tagged.
The report endpoint (GET /report) is pure assembly - no model calls,
no writes. Evaluation is triggered only by POST /evaluate. Check:
- Is there an UPDATE path anywhere in the evaluation persistence?
- If evaluateRun is called twice on the same run+rubric, does it
  create duplicate evaluations? Is that the intended behaviour?
- Does the comparison endpoint handle multiple evaluations for the
  same contestant+rubric? (It should use the latest.)
- Can a failed run be passed to evaluateRun? (It should be accepted.)
- Does GET /report ever trigger evaluation or write anything?
  (It must not.)

**5. Evaluation concurrency and latest resolution**

POST /evaluate is not idempotent. Multiple evaluations can exist for
the same run+rubric+contestant. Reports use the latest by createdAt.
Check:
- Does the report/comparison query correctly select the most recent
  evaluation per (contestantId, rubricId)?
- If two evaluations have identical createdAt, does the tiebreaker
  (higher nanoid) work correctly?
- Does the UI disable the "Evaluate" button after click to prevent
  accidental double-submission?
- Are all evaluation records preserved (never deleted or overwritten)?

**6. Failure tag orthogonality**

Failure tags are independent of scores. Check:
- Can a contestant have failure tags but no evaluation? (Yes - manual tags.)
- Can a contestant have an evaluation but no failure tags? (Yes - clean run.)
- Does the judge's failure tag output get persisted with `source: 'judge'`
  and linked to the evaluation ID?
- Is the failure category enum enforced at the DB level (pgEnum)?

**7. Report summary generation**

The report includes an LLM-generated summary. Check:
- Is the summary model call's cost captured in the cost ledger?
  (It should be - this is a real model call with real tokens.)
- What happens if summary generation fails? Does the report return
  without a summary, or does it fail entirely?
- Is the summary prompt leaking internal data structures (raw JSON)
  that make the output ugly or confusing?

**8. Evaluator as attack surface**

The judge model is itself an LLM. It can hallucinate, be sycophantic,
or produce scores that look reasonable but are not grounded in the
rubric. This is not a code bug - it is a system design question. Check:
- Is the judge prompt specific enough to prevent score inflation?
- Does the judge see the contestant's model name? (It shouldn't -
  this could bias scoring.)
- Is there any mechanism to detect when a judge gives the same score
  to every criterion? (Score theater detection.)

---

## Phase 3 - Cost Visibility and MVP Surface

### What it does

Adds a cost ledger (token accounting per trace), economics computation
(score-per-dollar, score-per-second), and three UI pages (create run,
view report, list runs). At the end of this phase, the MVP is complete.

### New tables

- `cost_ledger` - per-trace cost breakdown (tokens, microdollar costs, latency)

### New/extended modules

- `lib/run/pricing.ts` - model pricing table (pure data)
- `lib/run/economics.ts` - cost aggregation and tradeoff computation
- `app/(eval)/runs/` - 3 new pages
- `components/eval/` - 6+ new components

### Where to focus adversarial attention

**1. Microdollar arithmetic**

Costs are stored as integer microdollars (1 microdollar = $0.000001).
This matches the existing credit system. Check:
- Is the conversion from dollars-per-1k-tokens to microdollars correct?
  Formula: `(tokens / 1000) * pricePerK * 1_000_000`, rounded to integer.
- Is `Math.round()` used (not `Math.floor()` or `Math.ceil()`)?
- Are there any floating-point intermediate values that could accumulate
  error across many traces?
- Is `totalCostMicro` always equal to `inputCostMicro + outputCostMicro`?
  (It must be, not independently computed.)

**2. Pricing table staleness**

Model pricing is a TypeScript constant, not a database table. Check:
- What happens when a model is used that is not in the pricing table?
  (The spec says `computeCostMicro` returns null. Does the engine
  handle null gracefully - write trace without cost, not crash?)
- Is there a log or warning when cost cannot be computed?
- Is the pricing table tested against the models actually used in
  `lib/ai.ts`? (It should be - a model that exists in the AI config
  but not in the pricing table is a silent data gap.)

**3. Cost ledger completeness**

Every trace should have a cost ledger entry. Every evaluation judge
call should also have a cost ledger entry. The cost ledger uses a
`sourceType` + `sourceId` polymorphic key (trace, evaluation, or
summary). Check:
- Is the cost ledger write in the same transaction as the trace write?
- If the cost computation returns null (unknown model), is a ledger
  entry still written with zero costs? Or is it omitted entirely?
  (Omission means the trace is invisible to economics queries.)
- Are judge evaluation costs written with `sourceType: 'evaluation'`?
- Are summary generation costs written with `sourceType: 'summary'`?
- Is `contestantId` correctly null for summary-level costs?
- Does the economics query aggregate across all three source types?

**4. Score-per-dollar division**

`scorePerDollar = score / (costMicro / 1_000_000)`. Check:
- What happens when costMicro is 0? (Division by zero.)
- What happens when score is null (not yet evaluated)? (Should be null, not NaN.)
- Is the denominator converted to dollars before division? (A score-per-microdollar
  number would be meaningless.)

**5. UI data fetching**

Pages are server components that call `lib/run/` functions directly.
Check:
- Are there any client components that should be server components?
  (Data fetching in client components would bypass server-side auth.)
- Does the run report page handle the case where the run exists
  but has not been evaluated? (It should show traces and cost but
  not scores, with an "Evaluate" button.)
- Does the create-run form validate minimum 2 contestants client-side
  before submission? (Don't waste a model call on a malformed request.)

**6. E2E test coverage**

The spec calls for one E2E test covering the full flow: create -> report -> list.
Check:
- Does the E2E test actually call real models, or is it mocked?
  (If mocked, it tests the UI flow but not the integration.)
- Does the E2E test verify that cost data appears on the report page?
- Does the E2E test verify that failure tags can be assigned?

---

## Cross-phase concerns

These apply to all three phases. Check each PR against all of them.

### 1. Cascade deletes

Contestants cascade on run delete. Traces cascade on run delete.
Cost ledger cascades on trace delete. Evaluations cascade on run delete.
Failure tags cascade on run delete.

**Risk:** Deleting a run removes all downstream data. Is this correct?
Is there ever a reason to preserve traces from a deleted run? If the
product later adds "archive" semantics, cascades will destroy data.

### 2. Auth on every route

Every API route must check auth via `const { userId } = await auth()`.
Check that no route is missing this. The run list and report should
be scoped to the requesting user's runs (or admin-only for all runs).

### 3. No coupling to bouts

The new run model is intentionally separate from the existing bout
model. If you see `bouts`, `boutId`, `freeBoutsUsed`, or any bout
table referenced from run-related code, flag it.

### 4. Type safety at JSONB boundaries

Every JSONB column has a `.$type<T>()` annotation. The TypeScript
compiler trusts this annotation blindly. Check:
- Is the runtime Zod schema consistent with the type annotation?
- Is there any path where unvalidated data is inserted into a JSONB
  column?
- Are JSONB columns read with type assertions or with runtime
  validation? (The existing codebase uses type assertions. This is
  a known risk, not a bug to fix now, but flag if new code makes
  it worse.)

### 5. Transaction boundaries

Multi-table writes should be wrapped in `db.transaction()`. The
critical paths are:
- Creating a run + adding contestants (Phase 1)
- Writing a trace + writing a cost ledger entry (Phase 1/3)
- Updating run status + writing final trace (Phase 1)
- Writing an evaluation + writing failure tags (Phase 2)

If any of these are separate queries outside a transaction, flag it
as high severity (phantom-ledger risk).

### 6. Error response consistency

All errors should use `errorResponse()` from `lib/api-utils.ts`.
Check for any `new Response(JSON.stringify(...))` or `Response.json({ error: ... })`
that bypasses the standard pattern.

---

## Review output format

Follow the standard darkcat review format:

1. **Narrative report** - organised by phase or theme, with reasoning
2. **Structured findings** - YAML block with: id, file, line, severity
   (critical/high/medium/low), watchdog classification, slopodar
   pattern (if applicable), title, description, recommendation

Severity guide:
- **critical** - data loss, financial corruption, security breach
- **high** - incorrect behaviour under realistic conditions
- **medium** - incorrect behaviour under edge conditions
- **low** - code quality, scaling concern, documentation inaccuracy

The watchdog taxonomy and slopodar patterns are defined in
`docs/internal/weaver/darkcat-review-instructions.md`. If you do not
have access to that file, classify findings using the severity levels
above and describe the pattern in plain language.
