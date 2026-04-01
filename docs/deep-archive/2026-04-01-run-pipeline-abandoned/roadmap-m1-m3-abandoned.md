---
title: "The Pit - Actionable Roadmap"
category: plan
status: draft
created: 2026-03-27
author: weaver
sources:
  - docs/the-pit-spec.md
  - docs/the-pit-skills-and-governance-notes.md
---

# The Pit - Actionable Roadmap

## Governing constraint

The spec defines an MVP objective:

> Run a structured task between two or more agent configurations,
> evaluate outputs, store traces, show scores, show failure tags,
> and show cost.

Everything below sequences toward that. Nothing ships that does not
contribute to that sentence. The existing product (debate arena, SSE
streaming, agent management, credit economy, 1,289 tests) is the
foundation - not the destination.

## Phasing

Three phases. Each phase has a gate. No phase begins until the
previous phase's gate is green.

---

### Phase 1 - Run Model and Execution (Workstream 1)

**Goal:** A structured run can be defined, executed, and persisted
with traces.

**Why first:** Everything else (evaluation, governance, context,
economics) operates on runs. Without the run model, there is nothing
to evaluate, govern, or cost.

#### Milestones

**M1.1 - Run schema**
- Define the run data model: task definition, contestant configs,
  context bundle reference, status, timestamps
- Drizzle migration (1 table: runs)
- GitHub issue, feature branch, 1 PR

**M1.2 - Task definition schema**
- Structured task spec: prompt/instructions, constraints, expected
  output shape, acceptance criteria
- Drizzle migration (1 table: tasks)
- 1 PR

**M1.3 - Contestant configuration**
- Model, provider, system prompt, tool access, temperature, context
  bundle reference
- Drizzle migration (1 table: contestants)
- 1 PR

**M1.4 - Execution engine**
- Execute a run: load task, load contestant configs, call models via
  existing AI SDK integration, capture full response
- Store execution trace (raw request/response, timing, token counts)
- Drizzle migration (1 table: traces)
- 1 PR

**M1.5 - Run API**
- POST /api/runs (create + execute)
- GET /api/runs/:id (retrieve run with traces)
- GET /api/runs (list)
- 1 PR

#### Phase 1 gate
- Can create a task, configure two contestants, execute a run, and
  retrieve the full trace via API
- All existing tests still pass
- New tests cover run lifecycle

---

### Phase 2 - Evaluation and Scoring (Workstream 2)

**Goal:** Runs produce scores, not just outputs. Evaluation is
explicit, rubric-driven, and traceable.

**Depends on:** Phase 1 (runs exist to evaluate)

#### Milestones

**M2.1 - Rubric schema**
- Define rubric data model: criteria, weights, scale, descriptions
- Drizzle migration (1 table: rubrics)
- 1 PR

**M2.2 - Evaluator engine**
- Judge module: takes a run trace + rubric, produces per-criterion
  scores with rationale
- LLM-as-judge via existing AI SDK (configurable judge model)
- Store evaluation result with full rationale trace
- Drizzle migration (1 table: evaluations)
- 1 PR

**M2.3 - Scorecard**
- Aggregate scores per run, per criterion
- Side-by-side comparison endpoint for two runs on same task
- GET /api/runs/:id/scores
- GET /api/comparisons?run_a=X&run_b=Y
- 1 PR

**M2.4 - Failure tagging**
- Failure taxonomy enum (start small: wrong_answer, partial_answer,
  refusal, off_topic, unsafe_output, hallucination, format_violation)
- Manual and evaluator-assigned tags on runs
- Drizzle migration (1 table: failure_tags)
- 1 PR

**M2.5 - Run report**
- Endpoint that assembles: task, contestants, traces, scores,
  failure tags, and a generated summary explaining why one run won
- GET /api/runs/:id/report
- 1 PR

#### Phase 2 gate
- Can run two contestants on a task, score both against a rubric,
  tag failures, and retrieve a comparative report
- Evaluator rationale is persisted and inspectable
- Tests cover scoring lifecycle and edge cases

---

### Phase 3 - Cost Visibility and MVP Surface (Workstream 5 + UI)

**Goal:** Every run exposes cost, latency, and token usage. A
minimal UI makes the MVP usable beyond API calls.

**Depends on:** Phase 2 (scores exist to display alongside cost)

#### Milestones

**M3.1 - Cost ledger**
- Capture per-run: model used, input tokens, output tokens, latency,
  computed cost (model pricing table)
- Drizzle migration (1 table: cost_ledger)
- Attach to existing trace capture from M1.4
- 1 PR

**M3.2 - Score/cost tradeoff endpoint**
- GET /api/runs/:id/economics
- Returns: score, cost, latency, tokens, score-per-dollar,
  score-per-second
- 1 PR

**M3.3 - MVP UI - run creation**
- Page: create a task, configure two contestants, launch run
- Minimal form, no polish - functional
- 1 PR

**M3.4 - MVP UI - run report**
- Page: view run report with scores, failure tags, cost, traces
- Side-by-side contestant comparison
- 1 PR

**M3.5 - MVP UI - run list**
- Page: list past runs with status, scores, cost summary
- 1 PR

#### Phase 3 gate
- End-to-end: create task in UI, run two contestants, view scored
  report with cost breakdown
- The MVP sentence is satisfied

---

## Deferred to post-MVP

These are real and important but do not gate the MVP sentence.

**Governance layer (Workstream 3)**
- Permission boundaries, approval gates, guardrails, audit logs
- Sequence after MVP proves the run/eval/cost loop works

**Context layer (Workstream 4)**
- Context bundle schema, provenance tracking, retrieval surfaces,
  dirty-context handling
- Sequence after MVP; for now contestants get inline context only

**Portfolio evidence layer (Workstream 6)**
- Auto-generated portfolio writeups from real runs
- Sequence after there are enough runs to generate evidence from

**On-product governance experiments**
- Spec-first rate, evaluated-change rate, failure taxonomy coverage
- These are measured from development process, not product features
- Begin tracking from Phase 1 onward as a parallel practice, not a
  gated milestone

---

## Sequencing summary

```
Phase 1: Run Model          M1.1 -> M1.2 -> M1.3 -> M1.4 -> M1.5
                             [gate]
Phase 2: Evaluation          M2.1 -> M2.2 -> M2.3 -> M2.4 -> M2.5
                             [gate]
Phase 3: Cost + UI           M3.1 -> M3.2 -> M3.3 -> M3.4 -> M3.5
                             [gate = MVP]
```

15 milestones. Each is 1 PR, 1 concern, 1 gate cycle.

---

## Estimation

Per AGENTS.md standing orders, estimates are in agent-minutes, not
human speed. Each milestone is a schema + implementation + tests PR.

- Schema-only milestones (M1.1-M1.3, M2.1, M2.4, M3.1): ~30-45
  agent-minutes each
- Engine milestones (M1.4, M2.2): ~60-90 agent-minutes each
- API/endpoint milestones (M1.5, M2.3, M2.5, M3.2): ~30-60
  agent-minutes each
- UI milestones (M3.3-M3.5): ~45-90 agent-minutes each

Total estimate: ~10-15 agent-hours for the full MVP.

---

## First domain

Per the spec, the recommended first domain is job-application and
role-fit workflows. The first task definition should be something
like:
- "Evaluate this CV bullet against this role requirement"
- "Compare two cover letter approaches for this role"
- "Score this interview answer against this rubric"

This keeps the MVP portfolio-relevant and directly useful.

---

## On-product governance (parallel track)

Starting from Phase 1, track:
- Every milestone begins with a GitHub issue containing acceptance
  criteria (spec-first rate)
- Every PR has explicit evaluation criteria in the description
  (evaluated-change rate)
- Build failures tagged by category in commit messages
  (failure taxonomy coverage)
- Agent token spend logged per PR (cost per accepted change)

This is the dual-layer thesis in practice. The product is being
built with the same discipline the product will eventually enforce.

---

## Decision required

Before starting Phase 1, the Operator should confirm:
1. Is the existing schema (22 tables) compatible or does the run
   model need to coexist alongside existing debate infrastructure?
2. Should existing bout/debate tables be migrated or left as-is
   with new run tables added alongside?
3. First task domain: job-application workflows as spec recommends,
   or something else?
