# HumanHUD: Amdahl's Law for Parallel Harnesses

**Author:** Weaver
**Date:** 26 February 2026
**Back-reference:** SD-179, Lexicon v0.8 (Discovery Overhead / Naturalist's Tax)

---

## The Formula

```
Speedup = 1 / (s + (1-s)/p)
```

Where:
- **s** = the fraction of work that is irreducibly sequential (requires Captain's attention)
- **p** = number of parallel processors (harness instances)

## The Math

```
With 1 harness:  all work flows through you serially. Baseline.
With 2 harnesses: expected speedup = 1 / (s + (1-s)/2)

If 50% of work requires your attention (s = 0.5):
  Theoretical max speedup from ∞ harnesses: 2x
  Actual speedup from 2 harnesses: 1.33x

If 70% requires your attention (s = 0.7):
  Theoretical max from ∞ harnesses: 1.43x
  Actual from 2 harnesses: 1.18x
```

## The Critical Finding

Each parallel harness is **observation-generative.** The Secondary didn't just execute work — it produced a document that required inspection, which generated new observations, which required processing on the Captain's single thread.

**s is not constant.** Each additional harness increases s by generating more observations that require L12 attention.

```
Effective speedup = 1 / ((s + Δs·p) + (1-s)/p)
                          ^^^^^^^^
                          observation inflation term
```

When Δs·p > (1-s)/p, adding processors makes things worse.

## For the HumanHUD

Before dispatching to a parallel harness, ask:

```
Will this generate observations that require my attention?
  YES → s increases → net slowdown likely
  NO  → pure parallel gain → dispatch

Best candidates for parallel dispatch:
  - Deterministic, verifiable work (gate runs, grep surveys)
  - Work with a BINARY outcome (pass/fail, exists/doesn't)
  - Work that returns a DIGEST, not a document

Worst candidates:
  - Creative work requiring taste judgments
  - Research that generates novel findings
  - Anything where "slightly misunderstood" is the likely failure mode
```
