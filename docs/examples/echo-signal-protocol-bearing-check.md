# Example: Echo→Signal Protocol — Bearing Check into Bout Dispatch

> Portfolio material. Captured 2026-03-08.
> Demonstrates: echo protocol [SD-315], bearing check governance unit, PLAN.md provenance practice.

## What this shows

The echo→signal protocol creates a mutually understood, machine-auditable contract between Operator and agent before work begins. The Operator issues an order in natural language; the agent compresses it into Signal notation and echoes it back. Both parties now have a shared, unambiguous target. The overhead is one exchange. The error surface collapses.

This example captures the transition from bearing check (drift review) into phase-level work dispatch. It's a good specimen because:

1. **Defined, mutually understood targets.** The echo compresses the Operator's intent into verifiable checkboxes.
2. **Little room for error overhead.** Signal notation removes the ambiguity that natural language allows.
3. **Excellent audit/provenance practice.** The move into updating PLAN.md indexes progress at a high level with commit refs.
4. **Disciplined sequencing.** Plan → Makefile → governance codification → dispatch. Not "do everything at once."

## The exchange

### Operator's order (natural language)

> plan, makefile, then bouts. also I think we should include what we just did (spec/plan/eval drift review) into the larger macro workflow as a unit of repeatable governance
>
> vgrep(workflow) -> high level operator overview

### Agent's echo (Signal compression)

```yaml
watch_officer: weaver
weave_mode: tight
register: quarterdeck
tempo: making-way
true_north: "hired = proof > claim"
bearing: governance hardening → PLAN.md → Makefile → bouts
last_known_position: drift review complete, all instruments calibrated
```

```signal
ORDER := update(PLAN.md) -> modularise(Makefile) -> bouts
ALSO  := codify(drift_review) -> repeatable_governance_unit
ALSO  := vgrep(workflow) -> high_level_operator_overview
SEQUENCE := plan -> makefile -> governance_unit -> workflow_vgrep -> dispatch(bouts)
```

### Decomposed into action items

```
[•] Update PLAN.md: already-complete table + touch .done markers
[ ] Fix REVIEW-CHECKLIST.md bigint mode note
[ ] Modularise Makefile into 3 includes (mk/polecats.mk, mk/darkcat.mk, mk/gauntlet.mk)
[ ] Codify drift review as repeatable governance unit in AGENTS.md
[ ] vgrep(workflow) — high-level operator overview of macro workflow
[ ] Dispatch bouts to @Architect (PR1 then PR2)
```

### What happened next

The agent began with PLAN.md — grounding the completed-work index with commit SHAs before touching anything else. This is provenance practice: before building forward, make the record of what's behind accurate and referenced.

```
Starting. PLAN.md first — need the commit SHAs for completed work:
```

Then proceeded through the todo list sequentially, running the gate after each change, until all items were complete and the workflow overview was delivered.

## Why this matters

The echo protocol is not overhead. It is the mechanism by which:

- **Scope is locked.** The agent can't drift because the Signal notation is its own constraint.
- **Progress is auditable.** Each todo item maps to a verifiable action.
- **The Operator reviews intent, not execution.** One glance at the echo confirms alignment. No need to steer mid-flight.
- **Errors are caught at the cheapest possible point.** A misunderstood order caught in the echo costs one exchange. A misunderstood order caught after implementation costs a reset.

The compression ratio matters too. The Operator's order was 2 sentences + 1 vgrep instruction. The echo expanded it into 6 specific action items with correct sequencing. The expansion is where misunderstanding would hide — and the echo makes it visible before work begins.

## References

- SD-315: Echo/check-fire standing order
- SD-313/314: Signal protocol PoC and early results
- AGENTS.md: § The Bearing Check, § The Macro Workflow
- PLAN.md: § Already complete (updated in this session)
