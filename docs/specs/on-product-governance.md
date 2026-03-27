---
title: "On-Product Governance - Development Tracking"
category: spec
status: active
created: 2026-03-27
applies_to: all phases
cost: near-zero (process discipline, not product code)
---

# On-Product Governance

Development of The Pit is itself a governed agentic system. This
document specifies what is tracked, how, and when. None of this
requires product code. It runs on GitHub, the existing toolchain,
and one YAML file.

---

## Per-PR discipline (every PR, all phases)

### 1. Issue with acceptance criteria

Every milestone (M1.1 through M3.5) gets a GitHub issue. The issue
body must include:
- One-sentence scope (from spec)
- Acceptance criteria (from spec gate checklist)
- Labels: `spec-attached` + phase label (`phase-1`, `phase-2`, `phase-3`)

If the milestone has a spec section in `docs/specs/phase-*.md`, link
to it. If the spec section defines tests, list them in the issue.

### 2. PR description with evaluation criteria

Every PR description must include:
- What it does (1-2 sentences)
- What was evaluated: which tests, gate result, adversarial findings
- Labels: `gate-passed` (after gate green), `adversarial-reviewed`
  (after darkcat), `failure-tagged` (if failures were classified)

### 3. Development cost entry

After each PR or session, append to `docs/internal/dev-cost-ledger.yaml`:

```yaml
entries:
  - date: "YYYY-MM-DD"
    pr: "PR-NNN"           # or null for non-PR work
    milestone: "M1.1"
    agent_minutes: N
    model_calls_estimate: N
    failures_caught: N      # by gate, review, or manual
    notes: "brief description"
```

### 4. Failure classification

When the gate fails, when darkcat finds something, or when a bug is
caught during implementation:
- Tag the finding with a failure category from the product's
  failure_category enum (SD-329) or the watchdog taxonomy
- Log to `docs/internal/weaver/catch-log.tsv` (existing)
- The category distribution is aggregated at phase boundary

---

## Per-phase retrospective (each phase gate)

At each phase boundary (Phase 1 gate, Phase 2 gate, Phase 3/MVP gate),
write `docs/internal/retros/phase-N-retro.md` covering:

### Metrics

| Metric | Count | Target |
|--------|-------|--------|
| Issues with acceptance criteria | X / Y | 100% |
| PRs with evaluation criteria | X / Y | 100% |
| PRs with adversarial review | X / Y | 100% for code PRs |
| Failures caught by gate | N | - |
| Failures caught by adversarial review | N | - |
| Failures caught post-merge | N | 0 |
| Total agent-minutes | N | - |
| Cost per accepted PR | N / Y | - |
| Failure category distribution | table | - |

### Questions to answer

1. Did every task start with an explicit spec? If not, why not?
2. Did every change have evaluation criteria? What was missed?
3. What failures were caught by which gate? Were any caught too late?
4. What was the total cost? Was it justified by the outcome?
5. What would we change for the next phase?
6. Did any failure repeat from a previous phase? (Recurrence check)

### Portfolio extract

The retro should end with a 2-3 paragraph summary suitable for
external consumption. Not the full retro - the distillation. This
becomes raw material for portfolio writeups.

---

## Adversarial review tiers

Full darkcat (3-model cross-triangulation) on every PR is expensive
and historically low-yield on schema + CRUD work. The git history
shows darkcat earning its keep on engine and integration code -
rate limiter tier collision (c8ce063), bout-sweep double-refund
race + SQL injection (2805384), Upstash serialization bugs (a7e5514).
All semantic correctness bugs that pass typecheck, lint, and tests.

Review is tiered by risk surface:

| Tier | Milestones | Review level |
|------|-----------|-------------|
| Gate only | M1.1-M1.3, M2.1, M2.4, M3.1 | `just gate` green = ship. Schema + CRUD. Low finding density. |
| Single-model review | M1.5, M2.3, M2.5, M3.2-M3.5 | Gate + one darkcat pass. API routes, query logic, UI data fetching. |
| Full darkcat | M1.4, M2.2 | Gate + 3-model triangulation. Execution engine, judge engine. Transaction boundaries, concurrency, LLM integration. |

This cuts adversarial overhead by roughly half while concentrating
it where history shows it catches real bugs. The gate is never
skipped. The question is only how many models review after the gate.

---

## GitHub label setup (one-time, before Phase 1)

Create these labels on the repo:

- `spec-attached` - issue has acceptance criteria from spec
- `phase-1`, `phase-2`, `phase-3` - phase membership
- `gate-passed` - PR passed typecheck + lint + test
- `adversarial-reviewed` - PR went through darkcat
- `failure-tagged` - failures classified by category

---

## Development cost ledger

File: `docs/internal/dev-cost-ledger.yaml`

```yaml
# Development cost tracking for on-product governance.
# Updated per PR or per session. Aggregated at phase boundary.
# This is the evidence for "cost per accepted change" metric.

entries: []
```

Create this file before the first PR.

---

## What this produces

By MVP gate, without any product code for on-product governance:

- Spec-first rate across 15 milestones
- Evaluated-change rate across all PRs
- Failure distribution by category (gate vs review vs post-merge)
- Cost per accepted PR in agent-minutes
- Three phase retrospectives with portfolio-ready summaries
- A development cost ledger showing total spend

These are the numbers behind the dual-layer claim. The product
demonstrates in-product governance (runs, evaluation, scoring,
failure tags, cost). The development process demonstrates on-product
governance (spec-first, evaluated changes, failure taxonomy, cost
tracking). Both are backed by inspectable evidence.
