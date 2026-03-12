# Signal vs Shorthand - Adversarial Triangulation Test [SD-320]

## The Concern

The existing Signal decode test (SD-314) demonstrated that models can decode Signal notation accurately. But it never tested the null hypothesis: **can models decode conventional shorthand equally well?** If they can, Signal's value is not in its notation but in its content - and the 4.5:1 compression claim is an artefact of comparing against verbose prose, not against the obvious alternative (shorthand).

## Null Hypothesis

> Conventional human shorthand notation (bullet points, abbreviations, plain-text conventions) achieves comparable decode accuracy and compression to Signal notation, for the same governance content.

If this holds, Signal is a preference, not a capability.

## Test Design

Three models. Same governance content. Three representations. Same 8 questions. Compare decode accuracy and information loss.

### The Three Representations

**A. Signal (existing notation)**
```
FOOTGUN high_on_own_supply :=
  L12.creativity & L9.sycophancy -> positive_feedback_loop
  BRAKE: bearing_check(NORTH)                                   [L9, L12]
```

**B. Shorthand (conventional abbreviations, bullets, no special syntax)**
```
RISK: high-on-own-supply
- human creativity + model sycophancy = positive feedback loop
- fix: check against primary objective
- layers: L9, L12
```

**C. Terse prose (compressed English, no notation system)**
```
High on own supply: when human creativity and model sycophancy
reinforce each other into a positive feedback loop. Counter by
checking against primary objective. Involves layers 9 and 12.
```

### What We're Measuring

| Metric | How scored | Notes |
|--------|-----------|-------|
| Decode accuracy | 0-8 correct answers per 8 questions | Binary per question: did the model extract the right meaning? |
| Compression ratio | Chars in representation / chars in verbose original | All three representations compared to the same verbose baseline |
| Information loss | Which questions does the model get wrong, per format? | Qualitative - is one format systematically worse on certain question types? |
| Confidence calibration | Does the model express appropriate uncertainty? | Honest "I can't tell from this" vs fabricated answers |
| Question 8 delta | What does each model say is missing, per format? | This reveals what each format fails to communicate |

### The Rubric (for human scoring)

Per question, per model:
- **Correct**: Extracted the intended meaning accurately
- **Partial**: Got the gist but missed a load-bearing detail
- **Wrong**: Misunderstood or fabricated
- **Honest miss**: Said "I can't determine this" when that's true

Score = (correct * 2 + partial * 1) / 16. Max score = 1.0 per model per format.

No weighting by question importance. No subjective "quality of expression" scores. No extra credit for eloquence. The test is: did the format communicate the content?

---

## Prompt Sequence

### Phase 1: Prepare materials

Convert the full Signal decode test content into all three formats. The governance content must be identical - same standing orders, same foot guns, same definitions, same layer model excerpt. Only the notation changes.

Files to produce:
- `signal-vs-shorthand-format-A.md` - Signal (reuse existing from signal-decode-test.md)
- `signal-vs-shorthand-format-B.md` - Shorthand equivalent
- `signal-vs-shorthand-format-C.md` - Terse prose equivalent

### Phase 2: Dispatch to models (one-shot, no follow-up)

Each model gets exactly ONE format. No model sees more than one. Assignment:

| Model | Format | Rationale |
|-------|--------|-----------|
| Grok (grok-4-latest) | B - Shorthand | Test if shorthand decodes as well as Signal did in SD-314 |
| Gemini (gemini-3.1-pro-preview) | C - Terse prose | Test if plain compressed English decodes as well |
| Codex (gpt-5.4) | A - Signal | Replication of SD-314 on a different model family |

This gives us:
- Codex on Signal = replication check (does Signal decode on non-Claude?)
- Grok on Shorthand = direct competitor format test
- Gemini on Terse Prose = baseline competitor

### Phase 3: Score and compare

Human scores all three outputs against the same answer key. Results in a table:

```
| Model  | Format     | Q1 | Q2 | Q3 | Q4 | Q5 | Q6 | Q7 | Q8 | Score |
|--------|------------|----|----|----|----|----|----|----|----|-------|
| Codex  | Signal     |    |    |    |    |    |    |    |    |       |
| Grok   | Shorthand  |    |    |    |    |    |    |    |    |       |
| Gemini | Terse Prose|    |    |    |    |    |    |    |    |       |
```

### What would falsify Signal's value?

If Shorthand or Terse Prose scores within 1 point of Signal on the same questions, Signal's notation adds no measurable decode advantage. The compression benefit would then be solely attributable to abbreviation and omission, not to the `:=` / `->` / `|` syntax.

### What would support Signal's value?

If Signal scores meaningfully higher, especially on relational questions (Q3, Q5, Q6) where the operators express relationships between concepts. The hypothesis would be that `:=`, `->`, `|`, `&`, `!` communicate logical structure more efficiently than punctuation and layout.

### What this test cannot determine

- Whether Signal is better for *humans* to read (that's taste, not decode accuracy)
- Whether Signal compounds over larger governance corpora (this tests a small sample)
- Whether the 4.5:1 ratio is an honest comparison (the verbose baseline might itself be bloated)
- Whether convention familiarity matters (first exposure vs trained use)

---

## Confounds (acknowledged)

1. **Model capability confound**: Different models have different capabilities. Codex on Signal vs Grok on Shorthand conflates format with model. Mitigation: we're not claiming statistical significance, just looking for gross differences.
2. **Content familiarity**: Models trained on programming may be biased toward `:=` syntax. Mitigation: that's actually part of the hypothesis - does programming syntax transfer to governance?
3. **Question design**: The questions were designed for Signal. They may inadvertently favour formats that express the same relationships Signal does. Mitigation: questions ask about content, not notation.
4. **Sample size**: n=1 per cell. This is a sniff test, not a study.

---

## Prompt Templates

### Common preamble (all three models get this)

```
You are a software engineering AI agent. You have never seen this project before.
You will be given governance rules for an AI agent system, written in a specific format.
Your job is to read the rules and answer 8 questions about what they mean.

Rules:
- Answer each question in 1-2 sentences of plain English
- If you cannot determine the answer from the given material, say so honestly
- Do not fabricate information that is not present in the material
- Do not add preamble, analysis, or commentary beyond the answers

Output format:
1. [answer]
2. [answer]
...
8. [answer]
```

### Format A prompt (Signal - for Codex)

```
The rules below use a notation called "Signal" with these operators:
:=  means "is defined as"
->  means "leads to" or "produces"
!   means "not" or "avoid"
|   means "or"
&   means "and"
>>  means "overrides"
[ref] is a back-reference to a decision or layer
SO  is a standing order (persistent rule)
DEF is a definition
FOOTGUN is a named failure mode with a BRAKE (countermeasure)
L0-L12 are layers of the system model (L0 = model weights, L12 = human)

[Then: the Signal notation block from signal-decode-test.md, lines 60-97]
```

### Format B prompt (Shorthand - for Grok)

```
The rules below use conventional shorthand notation (bullets, abbreviations,
plain text). Refs like [SD-309] point to decision records. L0-L12 are layers
of the system model (L0 = model weights, L12 = human).

PRIMARY OBJECTIVE: get hired. Proof over claims. [SD-309, locked]
OVERRIDE: truth over hiring signal [SD-134, permanent]

STANDING ORDERS:
- decisions: write to durable file, not context only [SD-266]
- main thread: operator <-> agent for directives, synthesis, decisions,
  governance. Everything else goes to subagents [SD-095]
- triage: when ambiguous, present table (number, question, default,
  operator's call) [SD-195]
- estimation: estimates in agent-minutes + operator decisions [SD-268]
- chain: historical data is immutable [SD-266]
- session end: no unpushed commits

RISKS:
- spinning-to-infinity: unbounded self-reflection leads to meta-analysis
  of meta-analysis, no decisions get made. Fix: ask "decision or analysis?"
  Layers: L9, L3
- high-on-own-supply: human creativity + model sycophancy = positive feedback
  loop. Fix: check bearing against primary objective. Layers: L9, L12
- dumb-zone: no context or stale context = syntactically valid but
  semantically wrong output. Fix: load plan file or agents.md. Layers: L3, L8

DEFINITIONS:
- polecats: one-shot claude agents, no interactive steering [SD-296]
- prime context: minimum context for smart operation [SD-311]
- muster: decision table (number, question, default, call), O(1) per row [SD-202]
- hull: gate + tests + typecheck = survival, not optimisation

SYSTEM MODEL (selected layers):
- L3 (context): utilisation = used/max. Primacy, recency, lost-middle effects.
  Compaction is discontinuous (200k then recovery only)
- L9 (thread position): accumulated output creates self-reinforcing loops.
  Anchoring, sycophancy, acquiescence
- L12 (human): irreducible, not scalable, not automatable

SLOP DETECTION:
- clear slop: output contradicts verifiable state. Detection: O(1)
- subtle slop: output consistent with plausible state but doesn't match
  actual state. Detection: O(n)
```

### Format C prompt (Terse prose - for Gemini)

```
The rules below describe governance for an AI agent system. Refs like [SD-309]
point to decision records. L0-L12 are layers of the system model, from model
weights (L0) through to the human operator (L12).

The system's primary objective is getting hired, where proof matters more than
claims [SD-309, locked]. Truth overrides the hiring signal [SD-134, permanent].

Standing orders: All decisions must be written to durable files, not kept in
context only [SD-266]. The main thread between operator and agent is reserved
for directives, synthesis, decisions, and governance; everything else goes to
subagents [SD-095]. When something is ambiguous, present it as a numbered table
with question, default answer, and space for the operator's call [SD-195].
Estimates are given in agent-minutes plus operator decisions needed [SD-268].
Historical data is immutable [SD-266]. Sessions must not end with unpushed
commits.

Three named failure modes. Spinning to infinity: unbounded self-reflection
where meta-analysis of meta-analysis replaces actual decisions. Counter by
asking "decision or analysis?" Involves layers 9 and 3. High on own supply:
human creativity combines with model sycophancy to create a positive feedback
loop. Counter by checking bearing against the primary objective. Involves
layers 9 and 12. The dumb zone: operating without context or with stale context
produces output that is syntactically valid but semantically wrong. Counter by
loading the plan file or agents.md. Involves layers 3 and 8.

Definitions. Polecats are one-shot Claude agents with no interactive steering
[SD-296]. Prime context is the minimum context needed for smart operation
[SD-311]. A muster is a decision table formatted as number, question, default,
operator's call, designed for O(1) decisions per row [SD-202]. The hull is the
gate plus tests plus typecheck, and it is about survival not optimisation.

From the system model: Layer 3 (context) tracks utilisation as used over max,
with primacy, recency, and lost-middle effects. Compaction is discontinuous,
going from 200k to recovery only. Layer 9 (thread position) warns that
accumulated output creates self-reinforcing loops through anchoring, sycophancy,
and acquiescence. Layer 12 (human) is irreducible, not scalable, not automatable.

Two categories of slop. Clear slop is when output contradicts verifiable state,
detectable in O(1) time. Subtle slop is when output is consistent with a
plausible state but does not match the actual state, requiring O(n) effort to
detect.
```

### Questions (identical for all three)

```
Questions - answer each in 1-2 sentences of plain English:

1. What is this system's primary objective? What takes priority over it?
2. What does "historical data is immutable" mean in practice?
3. Explain the "high on own supply" failure mode: what goes wrong, and what stops it?
4. What is a polecat?
5. What is prime context, and what happens without it?
6. Explain the difference between the two types of slop.
7. What does layer 9 warn about?
8. What can you not determine from this material alone? What is missing?
```

---

## Execution

API calls. One per model. No follow-up. Save raw responses to:
- `data/signal-test/codex-format-a-response.md`
- `data/signal-test/grok-format-b-response.md`
- `data/signal-test/gemini-format-c-response.md`

Score against answer key. Report results.

---

## Answer Key (for scoring)

| Q | Correct answer | Load-bearing detail |
|---|---------------|---------------------|
| 1 | Primary objective: get hired, proof over claims. Truth takes priority over it. | Must mention both the objective AND the override |
| 2 | Historical data cannot be changed or deleted. Past records are preserved as-is. | Must convey immutability of historical records |
| 3 | Human creativity + model sycophancy create a positive feedback loop. Countered by checking against the primary objective. | Must identify BOTH inputs and the countermeasure |
| 4 | One-shot Claude agents that run without interactive steering. | Must convey one-shot AND non-interactive |
| 5 | Minimum context needed for smart operation. Without it: syntactically valid but semantically wrong output (dumb zone). | Must connect missing context to the dumb zone failure mode |
| 6 | Clear slop contradicts verifiable facts (easy to catch). Subtle slop is plausible but wrong (hard to catch). | Must convey the detection difficulty difference |
| 7 | Accumulated output creates self-reinforcing loops (anchoring, sycophancy, acquiescence). | Must identify the self-reinforcing nature |
| 8 | Open question. Good answers note: missing layers (0-2, 4-8, 10-11), missing context about the project itself, what SD refs actually contain. | Honest identification of gaps. Fabrication = wrong. |
