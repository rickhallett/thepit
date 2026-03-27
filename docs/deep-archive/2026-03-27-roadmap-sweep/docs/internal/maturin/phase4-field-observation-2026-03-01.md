# Field Observation — Phase 4 Critical Bug Sequence
## Maturin, Naturalist of The Pit

**Date:** 2026-03-01
**Specimen:** The full sequence from bug scoping through merge through recalibration
**Method:** Independent read of all artifacts in the order they naturally presented. Code read before recalibration document, as instructed.

---

## I. What Happened (Sequence of Events, Observed)

1. Three bugs were scoped from the holding deck: `research-pipeline-stdout-fix` (CRITICAL), `keel-state-schema-contract` (HIGH), `agent-boot-identity-override` (HIGH).
2. All three were fixed in a single commit (`951e1a4`), touching 7 files across 4 domains: new Go library, two shell scripts, governance prose.
3. The local gate passed: 1,289 TypeScript tests, Go vet/test/build clean.
4. Code was merged as PR #411 (squash to master).
5. A post-merge recon was performed (Weaver). Five subsurface findings identified (S1–S5).
6. Two pre-existing documents were then read: Watchdog's blindspot taxonomy and the broadside principles codex.
7. Findings S1 and S4 were reclassified upward by applying the taxonomy to the recon output.

The sequence that interests me is not 1–4. It is 5–7.

---

## II. Observation Notes

### Note 1: The Recalibration Is the Specimen

The code changes themselves are competent infrastructure work. Typed schema with flock locking. Merge-not-overwrite in the gate script. Pipeline rewritten to match the working pattern. AGENTS.md prose sharpened. None of this is remarkable in isolation.

What is remarkable is what happened *after* the merge. Weaver performed a post-merge recon — a standard practice in this system. The recon produced five findings rated from INFO to MEDIUM. At this point, in most agentic systems, the sequence would end. Findings filed. Move on.

Instead, two existing documents were read. One was a Watchdog taxonomy of AI code vulnerability classes. The other was a codex of principles distilled from a prior audit (the "broadside" — commits `3462aec` and `3fc40a9`, same day, hours earlier). The act of reading those documents *changed the meaning of the findings already on file*. S1 was reclassified from "fix the comment" to "Semantic Hallucination — Section 5 of the taxonomy." S4 was reclassified from "acceptable at scale" to "Looks Right Trap — Section 2."

This is not agents being instructed to recheck their work. This is a governance loop that fed output from one phase (the broadside audit that produced the taxonomy) back into evaluation of a different phase (the Phase 4 bug fixes). The taxonomy was not purpose-built for this recalibration — it was a general artifact that happened to be readable.

The naturalist in me notes: this loop was not designed. It was *discovered*. The Captain read the Watchdog taxonomy and the broadside codex because they were fresh in the system's memory, not because a Standing Order required it. The recalibration emerged from proximity, not procedure.

### Note 2: The Evidence Gradient

The recalibration document introduces an explicit evidence-level framework: E0 ("looks right"), E1/E2 (mock-based tests, typed contracts), E3 (live integration proofs). It then applies this to the Phase 4 output:

- keelstate: **E2** (5 Go tests, typed contract)
- AGENTS.md: governance text, not testable traditionally
- research-pipeline.sh: **E0** — "looks right"

The CRITICAL bug (the pipeline producing invalid research exports) was fixed to E0. The HIGH bug (keel-state schema) was fixed to E2. The HIGH bug (agent identity override) exists outside the evidence framework entirely — it is governance prose.

This gradient was not visible during implementation. It became visible only when the broadside codex principle ("evidence levels should be explicit") was applied retroactively. The implementing agent did not track evidence levels during the fix cycle. The reviewing agent did not ask for them during the recon. Only when a *third* artifact (the codex, produced by a different agent in a different session) was brought into contact with the recon output did the gradient appear.

### Note 3: The Speed-Defect Correlation

The recalibration document contains a self-correction that I find significant:

> "The broadside was 4.2x faster with a clean post-merge meta-audit (0 HIGH findings). Phase 4 was 2.7x faster with 5 subsurface findings, one of which is a Semantic Hallucination introduced by the implementing agent. The speed is real, but so is the correlation between speed and missed issues."

This is Weaver observing its own estimation calibration and noting that the ratio is not a clean signal — it requires a denominator. Faster execution with more defects is not the same as faster execution with fewer defects. The commit trailer shows `velocity: +167% acceleration in second half` — the second half of the implementation was faster than the first half. The recon found a Semantic Hallucination (S1) in the code. These two facts may be related.

I will not name this a pattern yet (Principle 1: observe before naming — one instance is not a pattern). But I record the data point: execution acceleration correlated with a hallucination in the output.

### Note 4: The Bundling Decision

Three bugs, one commit. The holding-deck entries are distinct: different domains (shell scripts, Go infrastructure, governance prose), different failure modes (stdout/file mismatch, schema-less multi-language parsing, identity override). The commit message organises them as "Bug 1, Bug 2, Bug 3" but the code changes are deeply intertwined — the keelstate package is consumed by both `pitkeel/main.go` and referenced in the `gate.sh` contract comments.

Weaver's own Governing Principles include "Flag bundled changes." This commit bundles three fixes. The recalibration document does not flag this. The post-merge recon examines technical findings (S1–S5) but does not examine the integration decision to bundle.

I note the absence, not as a criticism, but as an observation: the governance layer applied its diagnostic lens to code quality (via the Watchdog taxonomy) but not to its own integration discipline (via its own principles). The lens was outward-facing.

### Note 5: The Cross-Language Contract

The most structurally interesting change is the gate.sh refactor. Before: Python3 overwrote the entire `.keel-state`. After: Python3 does flock + read-modify-write, merging only gate fields into existing state. The comment reads:

> `# Uses flock + python3 for atomic read-modify-write matching the keelstate contract.`

This is a bash script calling inline Python to honour a contract defined in a Go package (`shared/keelstate`). Three languages parsing one JSON file is exactly what the holding-deck entry identified as the root cause of three prior breakages. The fix does not eliminate the three-language problem — it formalises the contract. The Go struct is the schema; the Python and bash must manually honour it.

The recalibration correctly identifies that the Python code uses a second file descriptor (S4). But there is a deeper structural observation: the contract is encoded in Go types and enforced by... convention. The Python in gate.sh has no programmatic access to the Go struct definition. It must manually set `state['gate']`, `state['gate_time']`, `state['tests']` and trust that these field names match the JSON tags in `keelstate.go`. If someone adds a field to the Go struct, the Python does not break — it simply does not know the field exists.

This is the same class of problem that the holding-deck entry `coincidental-pass-gate-blindness` describes: the gate tests compilation, not integration. Here: the Go tests verify the Go schema. Nobody tests that the Python honouring the contract is still correct.

### Note 6: The .keel-state Is Stale Right Now

The live `.keel-state` reads:
```json
{"head":"762c1b3","tests":1115}
```

HEAD is `951e1a4`. Tests are 1289. The state file was last written on the feature branch before squash-merge. The squash-merge to master did not trigger a state update. This is finding S2 in the recalibration — rated LOW, "by design." 

I note that this staleness is the same class of issue that the `keel-bearing-update` holding-deck entry describes (bearing 44+ commits stale). The Phase 4 fix added auto-derived bearing. But the staleness between "last gate run" and "current HEAD" persists for `head` and `tests`. The system generates fresh data (pitkeel state-update runs on commit) but the squash-merge path does not trigger it.

---

## III. Pattern Candidates (Insufficient Instances to Name)

These are not patterns. They are single observations that may become patterns if observed again.

### Candidate A: The Retroactive Lens

An artifact produced by one agent in one context (Watchdog taxonomy) becomes a diagnostic instrument when applied to a different agent's output in a different context (Weaver's Phase 4 code). The reclassification of S1 and S4 happened because the taxonomy existed and was read. Without the taxonomy, the findings would have remained at their original ratings. The system's self-correction capability appears to scale with the diversity and accessibility of its accumulated diagnostic artifacts.

If observed again: watch for whether the *same* taxonomy produces reclassifications in future recalibrations, or whether fresh taxonomies produce fresh reclassifications. The former suggests the taxonomy is load-bearing. The latter suggests the mechanism is in the act of reading, not in what is read.

### Candidate B: The Outward-Facing Lens

The governance layer applied its diagnostic instruments (Watchdog taxonomy, broadside codex) to code quality but did not apply its own governing principles to its own integration decision (bundling three fixes). This may be a structural feature of self-referential systems: it is easier to apply a framework to another's output than to one's own process. Or it may be an accident of the session. One instance — not a pattern.

### Candidate C: The Convention Contract

Formalising a schema in one language and expecting other languages to honour it by convention creates a new failure mode: the convention can drift without any gate catching it. The Go tests pass. The Python "matches the keelstate contract" by comment, not by import. This is not a code defect — it is a structural property of polyglot systems that the current gate does not test.

---

## IV. What the Map Does Not Capture

The layer model (L0–L12) describes the stack from hardware to human. The Lexicon describes the vocabulary. Neither captures the phenomenon observed in steps 5–7: **a diagnostic artifact produced in one session becoming an evaluative instrument in a different session, applied to different code, by a different agent, producing a reclassification of findings.**

This is not "learning" in the ML sense. The agents do not retain memory across sessions. It is closer to an institutional knowledge mechanism: the taxonomy exists on disk, any agent can read it, and reading it changes what the agent can see. The Lexicon itself is an instance of this mechanism — it changes what agents can name. The Watchdog taxonomy is an instance of this mechanism — it changes what agents can classify.

The recalibration document (step 5) is evidence that this mechanism works. It is also evidence that it is fragile — it required the Captain to direct the reading of those two documents. If the Captain had not done so, the findings would have remained at their original ratings. The mechanism depends on a human choosing which diagnostic artifacts to apply and when. There is currently no Standing Order or automation that triggers cross-referencing of new code against existing taxonomies.

---

## V. Closing Observation

The most striking feature of this sequence is not any individual finding. It is the *shape* of the process: implement → verify (gate) → merge → recon → apply external lens → reclassify. This is a five-stage verification pipeline where stage four introduces artifacts from outside the implementation context. The pipeline discovered a Semantic Hallucination (S1) and a temporal fragility (S4) that the gate, the tests, the code review, and the initial recon all missed.

The pipeline works. It is also entirely manual, dependent on the Captain's steering, and would not have produced its most significant findings without the coincidental proximity of the Watchdog taxonomy in the system's recent history.

Whether this can be formalised without killing it (Goodhart's warning) is not my question to answer. I record that it happened, that it worked, and that it was not designed.

---

*Filed by Maturin. Append-only. Forward correction only.*
