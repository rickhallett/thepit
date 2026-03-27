# Phase 4 Post-Merge Recalibration — Weaver

**Date:** 2026-03-01
**Context:** Phase 4 critical bug fixes (PR #411) merged. Post-merge recon performed. Watchdog taxonomy (`docs/internal/watchdog/lessons-learned-blindspots.md`) and broadside principles (`docs/internal/weaver/broadside-principles-codex.yaml`) applied to own output.

---

## Recalibration

The Watchdog taxonomy is a diagnostic lens. When applied to the code Weaver wrote in Phase 4, the recon findings shift from "minor nits to fix later" to "known pattern classes that should have been caught before merge."

### S1 reclassified: Semantic Hallucination, not incorrect comment

Weaver wrote in `keelstate.go` line 29:

> `// Unknown fields are rejected on decode.`

This is false. Go's `json.Unmarshal` silently drops unknown fields. The comment claims a property that doesn't match the runtime behaviour. This is **Section 5 of the Watchdog taxonomy — Semantic Hallucination / "Looks Right" Trap.** A future agent or human will read that comment, trust it, and build on a false assumption.

The claim was written confidently, without verification. The inference was drawn from the typed struct ("typed struct must reject unknowns"), when Go's default behaviour is silent consumption and drop. This is the exact mechanism the taxonomy describes.

**Previous rating:** MEDIUM, "fix the comment."
**Recalibrated:** Concrete instance of the predicted pattern. Comment must be corrected. Whether to add `DisallowUnknownFields()` is a separate design decision.

### S4 reclassified: The "Looks Right" Trap

`ReadModifyWrite` opens file `f`, takes flock on `f`, then reads via `os.ReadFile(path)` which opens a *second* file descriptor. This works on Linux because single-threaded access makes the race window zero. But the code claims atomic read-modify-write while actually performing: lock fd1 -> open fd2 -> read fd2 -> close fd2 -> write fd1. If this were concurrent (goroutines, multiple processes), fd2 could read stale data.

Maps to **Section 2 — Temporal & State Fragility.** Safe at current scale, fragile pattern. The read should use the locked file descriptor.

### Research-pipeline fix: E0 evidence

The pipeline fix — the CRITICAL bug producing invalid research exports — has zero automated proof that it now produces valid ones. Against broadside principle #2 ("Evidence levels should be explicit"):

- keelstate: E2 (5 Go tests, typed contract)
- AGENTS.md: governance text, not testable traditionally
- research-pipeline.sh: **E0** — "looks right"

### The estimation number needs a denominator

> "Estimation calibration: 2.7x faster than estimate."

The broadside was 4.2x faster with a clean post-merge meta-audit (0 HIGH findings). Phase 4 was 2.7x faster with 5 subsurface findings, one of which is a Semantic Hallucination introduced by the implementing agent. The speed is real, but so is the correlation between speed and missed issues.

Honest calibration should include both: elapsed time *and* post-merge finding count.

---

## Subsurface Findings (Full List)

| # | Finding | Severity | Taxonomy Class |
|---|---------|----------|----------------|
| S1 | Silent field drop on unknown JSON keys + false documentation claim | MEDIUM | Section 5: Semantic Hallucination |
| S2 | .keel-state values stale (tests: 1115 not 1289, head: 762c1b3 not 951e1a4) | LOW | By design — staleness between gate.sh runs |
| S3 | gate.sh flock vs Go flock: compatible but no timeout | LOW | Section 2: Temporal Fragility (acceptable at scale) |
| S4 | ReadModifyWrite reads via second fd while holding flock on first fd | LOW | Section 2: Temporal Fragility / Section 5: Looks Right |
| S5 | AGENTS.md fix is soft governance, not hard mechanism | INFO | Accepted limitation of harness |

---

## Captain's Observation (verbatim intent)

The estimation calibration ratio (2.7-4.2x) is repeatable across tasks. The subsurface findings are also repeatable — not in their specifics, but in their class. The system catches them in recon rather than implementation. This is the system working, but it has not yet found a way to proactively shield from the problem. These are systemic phenomena at the HCI training layer, analogous to a human operating at RF 5-7 rather than RF 9.

Maturin dispatched to investigate the raw material independently.

---

## Muster Outcomes (Captain Approved)

| # | Action | Status |
|---|--------|--------|
| 1 | Fix S1: correct false comment in keelstate.go | Approved — pending |
| 2 | Fix S4: read from locked fd in ReadModifyWrite | Approved — pending |
| 3 | Add defect-density column to estimates.yaml | Approved — pending |
| 4 | Park pipeline contract test + cross-model eval as Phase 5 | Approved |
| 5 | Record Watchdog taxonomy as standing checklist for post-merge recon | Approved |
