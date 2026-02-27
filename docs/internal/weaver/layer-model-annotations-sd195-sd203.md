# Layer Model Annotations — SD-195 through SD-203

> Companion to `docs/lexical-harness-not-prompt-harness.md` (v0.2)
> Generated: 2026-02-26 session (Context Audit)
> Restored: 2026-02-27 from Captain's prompt harness memory after compaction
> Status: AWAITING CAPTAIN DECISION — revise model to v0.3 or park

These annotations map the nine SDs from the Context Audit session to specific
layers in the model. Each is classified as SUPPORTS (hard data confirms model
prediction), CHALLENGES (hard data suggests model needs revision), or ENRICHES
(new capabilities not yet in model).

---

## Annotation Summary

```
SUPPORTS (hard data confirms model prediction)
├── L12: context pollution degrades human O(1) → O(n) [arXiv:2602.11988]
├── L8:  stale entries consume attention without signal [SD-196]
├── L8:  named conventions compress O(n) to O(1)       [SD-202]
└── L3:  fewer boot files = less L3 pressure            [SD-195]

CHALLENGES (hard data suggests model needs revision)
├── L10: self-review is degenerate N=1 ensemble         [SD-201]
│        model should warn explicitly
├── L9:  "monotonically increasing" is incomplete —     [SD-200]
│        state externalisation + context death = soft
│        reset with preserved facts
├── L8:  MORE L8 content can REDUCE performance         [SD-195]
│        needs saturation threshold concept
│        HARD REF: arXiv:2602.11988
└── L6:  "mediates ALL communication" is no longer true [SD-198]
         .keel-state is an out-of-band bypass channel

ENRICHES (new capabilities not yet in model)
├── L12: terminal HUD as new instrument                 [SD-197]
├── L9:  position trail externalised to immutable git   [SD-203]
├── L7:  git as audit channel, not just write tool      [SD-203]
├── L3:  learning log + boot diagram = structured       [SD-199]
│        recovery from context death
└── L6:  needs "bypass" category for file-mediated      [SD-198]
         human↔agent state outside the harness
```

---

## Per-Layer Detail

### L12 — HUMAN IN LOOP

**◆ (SD-195, context-audit) SUPPORTS**
Human cognitive load follows Big O classes. 52 depth-1 files forced L12 from
O(1) into O(n). Reduction to 7 restored O(1) triage capability.
HARD REF: arXiv:2602.11988 — context files reduce task success rates +
increase inference cost 20%.

**◆ (SD-197, hud-terminal) ENRICHES**
New L12 instrument: persistent terminal HUD. Reduces "where are we?" queries
to zero. L12 can now observe system state without consuming L3 context budget.

**◆ (SD-202, muster-term) ENRICHES**
Named convention for O(1) decision format. Structured input at L8 reduces L12
parse cost. Cross-ref: Big O model (SD-180).

### L11 — CROSS MODEL VALIDATION

No new SDs touch this layer.

### L10 — MULTI AGENT ENSEMBLE

**◆ (SD-201, slopodar-flag) CHALLENGES**
"Reviewed by the same system that wrote it. Both reviews passed on the first
attempt." Self-review is L10 with N=1. The slopodar header is a structural
confession of this failure mode. ENRICHMENT: L10 should note that self-review
is the degenerate case, not an edge case.

### L9 — THREAD POSITION

**◆ (SD-200, state-history) CHALLENGES**
Externalising state to disk partially defeats L9. New context window loads
.keel-state: the facts survive, the anchoring resets to zero. This is a
workaround the model doesn't currently describe. L9 says "monotonically
increasing" — but state externalisation + context death = soft reset with
preserved facts. Nuance needed.

**◆ (SD-203, commit-trailers) ENRICHES**
Position trail externalised to immutable storage. `git log --grep` recovers
the L9 trail from any future context window. L9 becomes auditable.

### L8 — AGENT ROLE

**◆ (SD-195, context-audit) CHALLENGES**
arXiv:2602.11988 — MORE L8 content can REDUCE task success. "Unnecessary
requirements from context files make tasks harder." The model says L8 "shapes
all downstream generation" but does not warn that excessive L8 loading degrades
L4. ENRICHMENT: L8 needs a saturation threshold. Signal-to-noise at L8 governs
L4 output quality.

**◆ (SD-196, crew-prune) SUPPORTS**
Stale L8 entries (ghost crew in dead-reckoning) consume attention budget
without providing signal. Pruning = reducing L8 noise floor.

**◆ (SD-202, muster-term) SUPPORTS**
Named conventions at L8 reduce parse error at L12. "Muster" is an L8
convention that compresses an O(n) communication pattern into O(1) per row.

### L7 — TOOL CALLING

**◆ (SD-203, commit-trailers) ENRICHES**
git as an instrument, not just a version control tool. Commit trailers make
git log a queryable record of system state at each decision point. L7 becomes
an audit channel, not just a write tool.

### L6 — HARNESS

**◆ (SD-198, hud-state) CHALLENGES**
.keel-state is an OUT-OF-BAND channel. Agent writes to filesystem. Human
terminal reads. Bypasses L0-L5 entirely. Not mediated by L6. The model says
L6 mediates ALL communication — .keel-state proves that's no longer true.
ENRICHMENT: L6 description needs a "bypass" category for file-mediated
human↔agent state.

### L5 — API

No new SDs touch this layer.

### L4 — GENERATION

No new SDs touch this layer directly, but SD-195 implies L8 overload degrades
L4 output quality (arXiv:2602.11988).

### L3 — CONTEXT WINDOW DYNAMICS

**◆ (SD-195, context-audit) SUPPORTS**
Fewer depth-1 files = fewer tokens loaded at boot. 76% reduction in L3 budget
consumed by docs. Direct relationship: L8 file count → L3 pressure.

**◆ (SD-199, weaver-log) ENRICHES**
Learning log survives context death. Dead reckoning + boot-sequence diagram =
structured L3 recovery. L3 death is no longer total state loss.

### L2 — ATTENTION

No new SDs touch this layer.

### L1 — TOKENISATION

No new SDs touch this layer.

### L0 — WEIGHTS

No new SDs touch this layer.

---

## Captain's Decision Required

Four challenges with hard refs. Three of those could inform a v0.3 revision:
- L8 saturation threshold (arXiv:2602.11988)
- L9 soft reset via state externalisation (SD-200)
- L6 bypass category for out-of-band channels (SD-198)

The fourth (L10 degenerate ensemble, SD-201) is a warning annotation, not a
structural revision.

Options: revise model to v0.3 now, or park until back at sea.
