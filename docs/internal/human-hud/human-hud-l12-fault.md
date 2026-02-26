# HumanHUD: L12 Fault Propagation

**Author:** Weaver
**Date:** 26 February 2026
**Back-reference:** SD-178, Lexicon v0.8 (Oracle/Ground Contamination)

---

## The Pattern

**Ground truth contamination.** In ML/DS: when human-annotated labels are wrong, the model learns the wrong thing. No amount of cross-validation catches it because every check references the contaminated ground truth.

In the layer model: L12 is axiomatic. When the axiom has a fault, everything built on it is internally consistent and externally wrong. The only counter-measure is a **second L12 reading** — another human, or the same human with fresh eyes.

## The Mechanism

The Captain's off-by-one ("12-layer" instead of "13-layer") propagated through the Secondary harness's gated output because **no gate has authority above L12.** The verification fabric catches agent error. It is structurally blind to oracle error.

The testing-theory term is **oracle problem** — when the test oracle (source of expected behavior) is itself incorrect, every test that checks against it passes while the system is wrong.

## For the HumanHUD

**L12 Fault** — an error at the oracle layer that propagates unchecked because it IS the top of the verification chain.

**Counter-measure:** A second L12 reading. The Two Ship experiment. Two eyes are better than one. Sometimes.
