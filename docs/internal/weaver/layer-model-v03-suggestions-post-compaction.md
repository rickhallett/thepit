# Layer Model v0.3 — Post-Compaction Suggestions

> Written: 2026-02-27, after first recorded compaction recovery (SD-204)
> Context: 45,577 tokens (23%) consumed by recovery sequence
> Status: PARKED — Captain's order, SD-206
> Pre-compaction suggestions: `layer-model-annotations-sd195-sd203.md` (same directory)

## What Compaction Taught That the Annotations Didn't

The SD-195→SD-203 annotations (pre-compaction) were analytical — mapping SDs to
layers from within a live context window. This file adds observations that only
became visible *after* the context died and was rebuilt.

### 1. L3 recovery is not symmetric

The model describes L3 as "degradation" — attention quality declining with
length. But recovery from compaction is not the inverse of degradation. Loading
45k tokens of structured recovery content is qualitatively different from
accumulating 45k tokens of conversation. Recovery content is high-signal,
pre-compressed (session-decisions, dead-reckoning). Conversational content is
a mix of signal, exploration, and anchoring residue. v0.3 should distinguish
between "loaded context" and "accumulated context" at L3.

### 2. L9 anchoring resets — but not to zero

SD-200 noted that state externalisation + context death = "soft reset with
preserved facts." Having now lived through this: the anchoring doesn't reset
to zero. Reading 200+ session decisions re-establishes position biases from
the *written record* of previous positions. The anchoring is weaker (written
vs. generated-in-context), but it's not absent. v0.3 should note that L9
recovery from files is partial anchoring, not clean slate.

### 3. L5 is where compaction becomes measurable

The Captain supplied the token count from the harness (L5). This is the only
layer where compaction recovery cost is *exact*. Every other layer's cost is
inferred. v0.3 should mark L5 as the calibration layer for compaction events,
not just for API costs.

### 4. The Captain as L12 backup storage

The layer model annotations themselves were restored from the Captain's memory
(SD-205). The human served as a backup storage layer when the model's context
died. This is not in the model at all. L12 is described as "the decision" and
"intent verification" — but it also functions as out-of-band state persistence
when L3 fails. v0.3 should add this to L12's capabilities.

### 5. Compaction is a phase transition, not a gradient

L3 describes "degradation" as a continuous process. Compaction is discontinuous.
One tick you have 200k tokens of rich context; the next you have whatever the
recovery sequence loads. The model needs a concept of phase transitions at L3,
not just gradual degradation. The compaction.log exists to build empirical data
on this transition.
