# Slopmop Pipe Filter Exploration - 2026-03-10

Date: 2026-03-10
Participants: Operator, Weaver
Outcome: Parked. Added complexity with marginal gain relative to true north.
Backlog: BL-006

## Verbatim Exchange

**Operator:**
> in the interest of staying aligned with unix philsophy, what patterns would be available for creating a pipe sensitive slop filter that just takes a text input, identifies slop by category/confidence, replaces high confidence strings with the more acceptable version and returns it. it would need to be as token efficient as possible so as to make llm calls as quick as possible and not relying on frontier models but instead being able to effecitively uutilise the NLP and semantic abilitiess of smaller models, potentially even small enough to run locally (possible arg option, defer). muster the most important options and we will draft a quick plan; this could be quite a cool portfolio piece, and might itself make a good canditdate for the next build process to run through the (midegified) gate (pending implementation)

**Weaver:**

Proposed three-tier detection model:

| Tier | Detection method | Cost | Examples | Model needed |
|------|-----------------|------|----------|-------------|
| T0 | Byte/regex | ~0 | em-dash, emoji, known phrases ("here's why this matters") | None |
| T1 | Structural heuristic | ~0 | Epigrammatic closure (short sentence at para end), anadiplosis (repeated clause boundary), nominalisation density | None (spaCy POS at most) |
| T2 | Semantic classification | tokens | Redundant antithesis, absence claims, epistemic theatre, analytical lullaby | Small model (2-8B) |

Pipe contract proposed:
```
echo "The uncomfortable truth is that detection is the intervention." \
  | slopmop clean
cat draft.md | slopmop clean --confidence 0.8 > cleaned.md
cat draft.md | slopmop detect --format jsonl
cat draft.md | slopmop score
```

Mustered 10 design decisions (tool name, pipe contract, T0+T1 engine, T2 model target, slopodar as config, replacement strategy, confidence threshold, token budget, build process, first milestone).

**Operator:**
> I was told before that structural heuristics were easily computable; they turned out to be terribly unreliable indicators of slop (see slopodar chrome extension analysis results if interested). We might be headed squarely back into this territory again

**Weaver:**

Acknowledged. T1 is a mirage. Structural heuristics for slop detection were empirically tested (Chrome extension, phase 1) and found unreliable. Epigrammatic closure heuristics would flag good writing alongside slop because each instance is "individually defensible" (slopodar's own words). Architecture collapses to two tiers with no cheap middle:

- T0 (deterministic): byte matching, known phrases, zero false positives by construction
- T2 (semantic): needs a model, no shortcut

Offered to read Chrome extension analysis. Data lives in phase 1 repo, not present in midgets.

**Operator:**
> ok, if not present in this repo it will live on in phase1

**Weaver:**

Confirmed not in repo. Proposed: T0 pipe filter as first deliverable (em-dashes, emoji, known trigger phrases, zero deps, zero latency), T2 deferred with interface designed but not built. Whether 2-3B local models can classify slopodar patterns is a testable hypothesis, not an assumption to build on.

**Operator:**
> record our interaction verbatim and backref in the backlog as a potential direction but has added complexity that distracts from our fundamental purpose with marginal gain

## Key Takeaways

1. Structural heuristics (T1) for slop detection are empirically unreliable - prior Chrome extension work proved this
2. Only two reliable tiers exist: deterministic (T0) and semantic (T2), no cheap middle ground
3. The pipe filter is a legitimate portfolio piece but adds complexity relative to true north (hired = proof > claim)
4. Slopmop v1 (scan + classify + muster) is already functional and covers the immediate need
5. If revisited: test small model classification accuracy against slopodar patterns first, don't assume
