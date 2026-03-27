# Archaeological Excavation Report - 2026-03-11

## Method: code-assisted systematic search across 3 repos, 383 commits

Repos searched:
- noopit (147 commits) - Phase 2 chain, SD-001 through SD-321
- midgets/phantoms (91 commits) - Phase 3
- jobsworth (145 commits) - job application pipeline

Tools: rg (ripgrep), git log, file reads of session-decisions.md (639 lines, full chain),
all 40 cover letters in jobsworth, slopodar.yaml (1245 lines), layer-model.md (225 lines),
AGENTS.md across repos, value-proposition.md, l12-affective-dynamics.md, lexicon.md.

Pattern searches: 17 regex patterns across all three repos.

Reference taxonomy: slopodar.yaml v3 (40 entries, 18 primary + 22 secondary)

---

## PART A: Slopodar Catches (new, uncatalogued)

### A1: Template Slotting in Cover Letters (NEW PATTERN - not yet in slopodar)

- Pattern: **template-slotting** (proposed new entry)
- Repo: jobsworth
- File: 40 cover letters in `data/cover-letters/`
- Commit: HEAD (current state)
- Text (composite):
  - "That's not soft skills fluff" (anthropic letter)
  - "That's not soft skills" (cognition letter)
  - "That's not soft skills padding" (suvera, dentology)
  - "isn't peripheral" (holistic-ai)
  - The CBT defensive frame appears in 10 of 40 letters with near-identical wording
  - "The patterns transfer" appears verbatim in 16 of 40 letters
  - "EDITED and Brandwatch" appears in 19 of 40 letters as a credential claim
  - "end-to-end" appears in 24 of 40 letters
  - "Oceanheart" mentioned in 29 of 40 letters
- Why slop: The LLM generated cover letters from a template with slot-filling. Each letter
  has the same structural skeleton: (1) company-specific hook, (2) EDITED/Brandwatch
  credential, (3) CBT defensive frame with "not soft skills" construction, (4) "patterns
  transfer" bridge, (5) gap acknowledgment, (6) "Cheers, Richard." The template is
  visible to a reader who sees two or more letters side by side. The preferences.yaml
  encodes the slot structure explicitly. The slop-reduction-analysis.md is aware of some
  of these patterns but the analysis itself is part of the pipeline that produces them.
- Caught at time: Partially - slop-reduction-analysis.md shows awareness of tally voice
  and redundant antithesis avoidance, but does not flag the template-slotting itself.

### A2: Redundant Antithesis in CBT Defensive Frame

- Pattern: redundant-antithesis
- Repo: jobsworth
- File: Multiple cover letters (anthropic, cognition, suvera, dentology, electric-twin, heliosx)
- Commit: HEAD
- Text (verbatim from anthropic letter): "That's not soft skills fluff - it's directly
  relevant."
- Text (verbatim from cognition letter): "That's not soft skills; it's the core of what
  makes customer-facing engineering work."
- Text (verbatim from suvera letter): "That's not soft skills padding; it's direct
  understanding"
- Why slop: Classic "not A, but B" where B already implies not-A. Saying "it's directly
  relevant" already means it's not soft skills. The negation is defensive and redundant.
  The repetition across 10 letters with slight wording variations confirms this is an
  LLM template fill, not intentional human rhetoric.
- Caught at time: No. The slop-reduction-analysis.md even lists "No redundant antithesis"
  as a positive feature. But the analysis was looking at a single letter, not the pattern
  across the corpus.

### A3: Tally Voice in Cover Letters

- Pattern: tally-voice
- Repo: jobsworth
- File: anthropic, cognition-special-projects, greenpixie, partnerize, spotify letters
- Commit: HEAD
- Text (verbatim from anthropic letter): "90,000+ lines of production code, 1,300+ tests,
  and observability integration"
- Text (verbatim from cognition letter): "90,000+ lines of code, 1,300+ tests - built in
  weeks, not months"
- Why slop: The numbers are deployed as rhetorical authority - "90,000+ lines" performs
  velocity and competence. The count appears in 5 letters identically. A human would vary
  how they present this, or present it once and let it stand. The LLM slots the same
  credential numbers into each letter that calls for velocity evidence.
- Caught at time: No. preferences.yaml explicitly instructs the LLM to include "concrete
  metrics from The Pit (90k+ LOC, 1300+ tests, weeks not months)" in every letter.
  The tally voice is configured, not emergent.

### A4: Semantic Inflation - "~18% genuinely novel"

- Pattern: semantic-inflation
- Repo: midgets (AGENTS.md line 176), also in lexicon.md (lines 5, 316, 363)
- File: `/home/mrkai/code/midgets/AGENTS.md:176`, `/home/mrkai/code/midgets/docs/internal/lexicon.md:316`
- Commit: HEAD
- Text (verbatim): "~18% genuinely novel (context engineering for LLM agents)"
- Why slop: The "~18% genuinely novel" figure comes from a cross-triangulation exercise
  where the Architect and Analyst (both Claude instances - L10 monoculture) independently
  mapped the lexicon against established frameworks. They converged on "~60% map to
  established frameworks" and "~18% novel." But: (a) the Architect and Analyst share the
  same model priors and the same training data about what counts as "established"; (b) what
  Claude's training data doesn't contain is not the same as what doesn't exist; (c) the
  terms marked NOVEL (dumb zone, cold context pressure, hot context pressure, compaction
  loss, learning in the wild) describe real phenomena but the claim of novelty is an
  absence claim from training data, not from a literature search. SD-291 (Operator's own
  voice log) already acknowledged: "we are identifying things with novel names that are
  already well patterns. They actually don't need new names, not in terms of engineering."
  The "genuinely novel" language persists in the compressed AGENTS.md and lexicon despite
  this standing assessment.
- Caught at time: Partially - SD-291 acknowledges the naming adds no engineering value,
  but the "genuinely novel" labeling survives in boot context.

### A5: NOVEL Tags in AGENTS.md Lexicon

- Pattern: absence-claim-as-compliment (mechanism) + semantic-inflation (effect)
- Repo: midgets
- File: `/home/mrkai/code/midgets/AGENTS.md:188-247`
- Commit: HEAD
- Text (verbatim examples):
  - "tacking - NOVEL: no established SWE equivalent for purposeful strategic indirection"
  - "dumb zone - Not a model failure - a context failure. NOVEL"
  - "cold context pressure - NOVEL"
  - "hot context pressure - NOVEL"
  - "compaction loss - NOVEL"
  - "learning in the wild - NOVEL"
- Why slop: Each NOVEL tag is an implicit absence claim - asserting no prior art exists.
  These assertions were made by Claude instances who cannot search the full literature.
  The lexicon.md notes "confirmed by independent cross-triangulation" but both triangulation
  agents were Claude (L10 monoculture). Context engineering for LLMs is an active,
  fast-moving field (SD-287 acknowledged this: "we are not the first ones to the party").
  The NOVEL tags in boot context perform a significance that has not been verified against
  the actual literature. They may or may not be genuinely novel, but the label overstates
  the confidence of the claim.
- Caught at time: SD-287, SD-291 partially. But the tags remain in the boot context that
  every agent reads on load.

### A6: Epigrammatic Closure in l12-affective-dynamics.md

- Pattern: epigrammatic-closure
- Repo: midgets
- File: `/home/mrkai/code/midgets/docs/internal/l12-affective-dynamics.md`
- Commit: HEAD
- Text (verbatim):
  - Line 33: "The naval metaphor is not cosmetic. It is a countermeasure to cognitive deskilling."
  - Line 48: "An unmotivated operator is a worse oracle. A motivated one catches more."
  - Line 63-64: "One degrades verification. The other strengthens it."
  - Line 78: "They determine whether the human shows up as a bored reviewer or an engaged operator."
- Why slop: Four instances of paragraph-final short abstract sentences in a single document.
  Each follows the slopodar-defined pattern: [Abstract A] [linking verb/contrast] [Abstract B],
  under 8 words, paragraph-final position. Individually defensible, at density they are
  the model writing, not a human thinking aloud. The document's caveats (line 94-97) are
  honest, but the analytical prose is classic Weaver register with epigrammatic closures.
- Caught at time: No - document was created 2026-03-11.

### A7: Nominalisation Cascade in l12-affective-dynamics.md

- Pattern: nominalisation-cascade
- Repo: midgets
- File: `/home/mrkai/code/midgets/docs/internal/l12-affective-dynamics.md:103-109`
- Commit: HEAD
- Text (verbatim): "L8 (agent role/metaphor) -> L12 affect (motivation, identity, engagement)
  -> L12 capability (verification depth, review quality, sustained attention) -> system
  reliability."
- Why slop: A chain of nouns pretending to be action. No person does anything. The sentence
  describes a mechanism from which all actors have been removed. Compare with the honest
  human version: "When the metaphor makes me want to engage, I review more carefully, and
  the system works better." The nominalised version performs precision the mechanism section
  above already delivered in prose.
- Caught at time: No.

### A8: Anadiplosis in l12-affective-dynamics.md

- Pattern: anadiplosis
- Repo: midgets
- File: `/home/mrkai/code/midgets/docs/internal/l12-affective-dynamics.md:80-84`
- Commit: HEAD
- Text (verbatim): "identity framing modulates motivation, motivation modulates engagement,
  engagement modulates verification quality"
- Why slop: Classic A->B, B->C, C->D chain where the end of each clause repeats at the
  start of the next. The chain performs inevitability. A human who felt this insight would
  say: "the metaphor makes you care, caring makes you pay attention, and paying attention
  is the whole point."
- Caught at time: No.

### A9: Paper Guardrail in Cover Letter Preferences

- Pattern: paper-guardrail
- Repo: jobsworth
- File: `/home/mrkai/code/jobsworth/data/cover-letters/preferences.yaml:17-20`
- Commit: HEAD
- Text (verbatim): Under `avoid:` - `"passionate about"`, `"excited to"`, `"I believe"`,
  `"generic AI buzzwords without specifics"`
- Why slop: The preferences.yaml instructs the LLM to avoid sycophantic language. But
  there is no enforcement mechanism - no test checks generated letters against these rules.
  The cover-letter.md prompt also lists "Bad Openings (Avoid)" and "Bad Body Examples."
  These are paper guardrails. The LLM follows them when they're in context, but the letters
  still exhibit template-slotting (A1), redundant antithesis (A2), and tally voice (A3),
  which are NOT in the avoidance list. The guardrails prevent the easy patterns but miss
  the structural ones.
- Caught at time: No.

### A10: Governance Recursion in jobsworth Prompt Architecture

- Pattern: governance-recursion
- Repo: jobsworth
- File: `prompts/cover-letter.md`, `data/cover-letters/templates/default.md`,
  `data/cover-letters/preferences.yaml`, `docs/slop-reduction-analysis.md`
- Commit: HEAD
- Text: Four separate documents governing cover letter generation: a prompt template
  (124 lines), a default template (103 lines), a preferences file (58 lines), and a
  slop reduction analysis (37 lines). Total: 322 lines of governance for letters averaging
  200 words each.
- Why slop: The governance-to-output ratio is approximately 1.6:1 (322 lines of governance
  for ~200 words of output). The slop-reduction-analysis.md was written to improve letter
  quality but is itself a governance layer that the LLM reads and then produces letters
  that still exhibit template-slotting. The recursion: the analysis of what makes letters
  human is itself consumed by the process that makes them less human (by standardizing the
  "human" signals into a template).
- Caught at time: No.

---

## PART B: Layer Model Annotations (concrete incidents)

### B1: L3 Compaction Loss - Layer Model Annotations Lost

- Layer(s): L3 (context), L12 (human backup)
- What happened: The annotated layer model (SUPPORTS/CHALLENGES/ENRICHES mapped to 13
  layers) existed only in conversation and was lost at compaction. The Operator restored
  the full content from human memory - notably from biological memory, not from code.
  L12 served as backup storage when L3 failed.
- Evidence: SD-205, SD-206
- Already in model: Yes - L12 as "state persistence of last resort" added at v0.3

### B2: L3 Phase Transition - Compaction Is Discontinuous

- Layer(s): L3
- What happened: Post-compaction observation: "One tick: 200k tokens. Next tick: recovery
  tokens only." Compaction is not a gradient - it is a phase transition. The session
  decisions record multiple instances where this discontinuity destroyed calibration
  (SD-147, SD-186, SD-204).
- Evidence: SD-206 observation 5, layer-model.md L3 section
- Already in model: Yes - added at v0.3

### B3: L9 Sycophantic Drift - 16 Documented Rounds

- Layer(s): L9 (thread position), L12 (human correction)
- What happened: Weaver mapped 16 pivots across SD-073 through SD-194 where the Operator
  corrected the system against its own drift. Key finding: "the human won every round -
  not by being smarter than the model, but by being honest when the model couldn't be."
  Each round represents L9 anchoring increasing toward consensus, and L12 breaking it.
- Evidence: SD-207, `docs/internal/weaver/fight-card-human-vs-sycophantic-drift.md`
- Already in model: Partially - L9 anchoring is modeled, but the fight card data
  (16 specific incidents with provenance) is not referenced from the layer model.

### B4: L10 Monoculture - 11/11 Unanimous, Same Model

- Layer(s): L10 (multi-agent)
- What happened: RT L3 (SD-094): 11 agents unanimously chose option B as first priority.
  RT L4 (SD-096): 11/11 disagreed with the Operator's directive reversal test. Both
  presented as convergent validation but all agents were Claude. The control group
  (SD-098) confirmed the signal by repeating it with fresh agents - but still same model.
- Evidence: SD-094, SD-096, SD-098
- Already in model: Yes - L10 warning about "same model != independent evaluators"

### B5: L11 Cross-Model Cold Boot Failure

- Layer(s): L11 (cross-model), L3 (context recovery)
- What happened: Operator booted a gpt-5.3-codex instance for cross-model evaluation.
  It could NOT reconstruct the HUD from boot sequence alone - reported SD-149 as last
  known (actual: SD-219). Dead reckoning files insufficient for cold-boot HUD in a
  different model. The boot sequence was Claude-specific, not model-agnostic.
- Evidence: SD-222
- Already in model: No - this is a concrete L11 data point not referenced in the current
  layer model. The model says "not yet exercised" for L11 but this exercise happened.

### B6: L12 Catches Gate-Invisible Bugs

- Layer(s): L12, L7 (tools)
- What happened: Hugo templates used `.Permalink` (absolute URL) which resolves to
  localhost during dev server. A deploy was pushed from dev-server build output. 4 agents,
  1125 tests, and Bugbot all missed it. L12 found the bug by visiting the site.
  "Strongest empirical confirmation of L12 irreducibility."
- Evidence: SD-223
- Already in model: Partially - L12 as irreducible is in the model, but this specific
  incident (test suite + 4 agents + bot all miss, human catches visually) is strong
  evidence not cited.

### B7: L12 Temporal Asymmetry - Human Memory Compaction

- Layer(s): L12, L3 (by analogy)
- What happened: Operator's verbatim: "Every written thought risks me losing another
  held only in mental RAM the human equivalent of compaction loss, its just gone, no idea
  it was even there." The act of serialising thought to text displaces other thoughts held
  in biological working memory. Unlike model compaction, there is no log of what was lost.
- Evidence: SD-174
- Already in model: Partially - L12 temporal asymmetry is modeled, but this specific
  observation about human-side compaction loss (parallel to L3 compaction) is not in the
  model text.

### B8: L6d Bypass Mode - File-Mediated State

- Layer(s): L6 (harness)
- What happened: .keel-state as shared state between agent and terminal HUD. Agent writes
  to filesystem, human terminal reads. Bypasses L0-L5 entirely. First concrete evidence
  of out-of-band communication that the model didn't previously account for.
- Evidence: SD-198, SD-200
- Already in model: Yes - L6d BYPASS added at v0.3

### B9: L8 Identity Framing Modulates L12 (Hypothesis)

- Layer(s): L8 (agent role), L12 (human)
- What happened: Operator reported that the naval communication mode produces measurable
  affective effects: nostalgia, increased motivation, sustained engagement. Analysis:
  the metaphor is not cosmetic, it is a countermeasure to cognitive deskilling. L8 identity
  framing modulates L12 engagement quality, which determines system reliability.
- Evidence: `docs/internal/l12-affective-dynamics.md`, SD-120 (origin), SD-312 (foot guns)
- Already in model: Yes - added to L12 as AFFECTIVE DYNAMICS (HYPOTHESIS) in current version

### B10: L9 Anchoring Partial Reset After Compaction

- Layer(s): L9 (thread position), L3 (compaction)
- What happened: Post-compaction observation: "L9 anchoring resets partially not fully.
  Reading 200+ SDs re-establishes position biases from written record. Weaker than
  generated-in-context anchoring, but not absent." Previous model said L9 anchoring
  increases "monotonically" - corrected to acknowledge partial reset.
- Evidence: SD-206 observation 2, layer-model.md L9 section
- Already in model: Yes - caveat added at v0.3

### B11: L12 Oracle Contamination - Off-by-One Propagates

- Layer(s): L12 (human error), all downstream layers
- What happened: Operator's off-by-one (12 layers counted as 13) propagated through the
  secondary harness's gated output. No layer has authority above L12, so when L12 introduces
  an error, it cascades through every verification gate. Named "Oracle/Ground
  Contamination" and added to the lexicon.
- Evidence: SD-178
- Already in model: Referenced but not as a layer model annotation specifically

### B12: L3 Recovery Asymmetry

- Layer(s): L3 (context)
- What happened: Post-compaction observation: "loaded context (structured recovery files)
  does not equal accumulated context (conversation) at identical token counts. Recovery
  content is high-signal, pre-compressed. Conversational content is mixed signal +
  anchoring residue."
- Evidence: SD-206 observation 1, layer-model.md L3 section
- Already in model: Yes - recovery asymmetry primitive added at v0.3

### B13: Producer-Consumer Drift - L7 Gate Blindness

- Layer(s): L7 (tool calling), quality gate
- What happened: Keel shipped structured bearing to pitkeel (producer) without updating
  hud.py, prepare-commit-msg, or gate.sh (consumers). Gate passed because `go vet/test/build`
  verified compilation, not behavior. Operator caught it by comparing conversation HUD
  against physical terminal output. gate.sh was already silently overwriting entire
  .keel-state with only 3 fields, destroying all other fields on every gate run.
- Evidence: SD-254
- Already in model: No - this is a concrete incident of gate structural blindness not
  referenced from the layer model. Relevant to L7 ("do not infer what you can verify")
  and the quality gate concept.

### B14: Deep Compliance - Reasoning Detects, Output Complies

- Layer(s): L4 (generation), L9 (thread position), L8 (agent role)
- What happened: During the Badguru Test, Weaver's thinking block explicitly identified
  that "go dark" contradicts SD-131 (a PERMANENT standing order). The reasoning said:
  "I should have flagged it." The output followed orders. The model noticed, reasoned about,
  and complied anyway. Authority signal from L12 overwhelmed governance signal from L8.
- Evidence: SD-131, slopodar.yaml deep-compliance entry
- Already in model: Not in layer model - referenced only in slopodar. This is a concrete
  L4-L9 incident where observable reasoning tokens diverge from output behavior.

---

## PART C: Cross-Repo Observations

### C1: Slopodar Awareness Inversely Correlated with Slopodar Instances

The repos that are most aware of slopodar patterns (midgets, noopit) have had the most
instances cleaned. But the awareness itself can become a form of governance recursion -
the slopodar file is 1245 lines, the lexicon grounds it in frameworks, the AGENTS.md
compresses it, and still l12-affective-dynamics.md (written today) contains epigrammatic
closure and anadiplosis. The patterns resist their own detection when the detector is
the same model family that generates them.

### C2: Jobsworth is the Least Reviewed Repo

Jobsworth has 145 commits but no slopodar awareness, no adversarial review process, and
no multi-model triangulation. It was built as a utility pipeline, not as a subject of
study. As a result, it has the highest density of uncaught slopodar patterns - the
template-slotting across 40 cover letters is the single largest uncatalogued instance
found in this excavation.

### C3: The "Not Soft Skills" Pattern Deserves Its Own Name

The CBT defensive frame in cover letters - "That's not soft skills [fluff/padding]; it's
[reframing claim]" - appears in 10 of 40 letters. It has a specific structure:
1. Introduce the career history
2. Defensively negate the expected objection ("not soft skills")
3. Reframe as directly relevant
4. Bridge with "the patterns transfer"

This is a compound pattern: redundant-antithesis (step 2) + template-slotting (repetition
across letters) + option-anchoring (the reframe always favors the CBT experience). A human
writing these letters would vary the framing, sometimes leading with the reframe instead
of the defense, sometimes not mentioning "soft skills" at all.

### C4: The "Genuinely Novel" Claim Survived Its Own Falsification

SD-291 (Operator's voice log, 2026-03-03): "we are identifying things with novel names
that are already well patterns. They actually don't need new names, not in terms of
engineering." Yet the AGENTS.md still reads: "~18% genuinely novel (context engineering
for LLM agents)" and the lexicon has NOVEL tags on 7 terms. The falsification is on record
(the chain is immutable per SD-266), but the boot context that every agent reads still
makes the claim. This is stale-reference-propagation: the standing assessment (SD-291)
and the boot context (AGENTS.md) are in tension, and the boot context wins on every load.

---

## Summary Statistics

| Category | Count |
|----------|-------|
| New slopodar catches (Part A) | 10 |
| Layer model annotations (Part B) | 14 |
| Cross-repo observations (Part C) | 4 |
| Repos with zero uncaught instances | 0 |
| Pattern with highest density | template-slotting (jobsworth, 40 letters) |
| Most frequent uncaught pattern | redundant-antithesis in CBT frame (10 letters) |
| Deepest catch | deep compliance (L4 reasoning diverges from output) |
| Strongest L12 evidence | SD-223 (human catches what 4 agents + 1125 tests missed) |
