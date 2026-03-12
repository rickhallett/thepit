# IV-01 Findings: Format Template Reuse for Bootcamp IV

**Task:** IV-01 (Research - read-only)
**Date:** 2026-03-10
**Input files reviewed:**
- `docs/bootcamp/01-process-model.md` (1441 lines, complete BC-I step)
- `docs/bootcamp/07-git-internals.md` (first 100 lines, structural comparison)
- `docs/bootcamp/README.md` (BC-I README, conventions section)
- `docs/bootcamp/BOOTCAMP-IV-OUTLINE.md` (687 lines, the outline being implemented)
- `docs/bootcamp/BOOTCAMP-II-OUTLINE.md` (first 60 lines, structural comparison)

**Note:** `docs/bootcamp/tasks/01-research-format/findings.md` does not exist. This
document is built directly from source analysis of the completed BC-I steps.

---

## 1. Reusable Template Elements

These elements are confirmed present in all completed BC-I steps and should carry
forward to BC-IV without modification.

### 1.1 File Header

Every step file opens with the same structure:

```markdown
# Step N: Title

**Subtitle/descriptor**

Step N of M in the [Bootcamp Name].
Estimated total time: X-Yh.

---

## Why This is Step N / Why This Step Exists

[2-4 paragraphs establishing compositional leverage and dependency rationale]

---
```

Concrete example from `01-process-model.md:1-26`:

```markdown
# Step 1: The Unix Process Model

**File Descriptors, Pipes, and Signals**

Step 1 of 12 in the Agent-Native Engineering Bootcamp.
Estimated total time: 4-6 hours.

---

## Why This is Step 1

Every agent you steer operates on Linux. ...
```

And from `07-git-internals.md:1-6`:

```markdown
# Step 7: Git Internals - Beyond Porcelain Commands

**Estimated time:** 4 hours
**Prerequisites:** Step 3 (filesystem as state) - you need the inode/directory/symlink model
**Leads to:** Step 8 (process observation)
```

**BC-IV adaptation note:** The `07-git-internals.md` variant includes explicit
prerequisite and "leads to" fields. BC-IV should adopt this variant because BC-IV has
cross-bootcamp prerequisites (BC-II and BC-III steps), making explicit dependency
declaration more important. Additionally, BC-IV should include a **Field maturity** line
in the header, since the outline already tags each step with maturity level.

**Confirmed BC-IV header format:**

```markdown
# Step N: Title

**Estimated time:** X-Yh
**Field maturity:** ESTABLISHED | EMERGING | FRONTIER
**Prerequisites:** [list with bootcamp cross-refs]
**Leads to:** Step M (topic)

Step N of 9 in the Evaluation & Adversarial Testing Bootcamp.

---

## Why This Step Exists

[2-4 paragraphs]

---
```

### 1.2 Table of Contents

Present in all completed BC-I steps. Numbered list with anchor links and time estimates
per section.

From `01-process-model.md:28-38`:

```markdown
## Table of Contents

1. [What is a Process](#1-what-is-a-process) (~30 min)
2. [fork/exec: The Two-Step Creation](#2-forkexec-the-two-step-creation) (~45 min)
3. [File Descriptors](#3-file-descriptors) (~45 min)
...
7. [Challenges](#7-challenges) (~60-90 min)
8. [What to Read Next](#8-what-to-read-next)
```

**Convention:** Numbered sections in the ToC match numbered `## N. Section Title` headings
in the body. The last two sections are always Challenges and What to Read Next (or
Recommended Reading, then What to Read Next).

**No adaptation needed for BC-IV.** Carry forward as-is.

### 1.3 Section Structure

Each content section follows this pattern:

```markdown
## N. Section Title

*Estimated time: X minutes*

[Explanatory prose - 3-15 paragraphs]

[Code blocks with runnable examples where applicable]

[Optional subsections with ### headings]

> **AGENTIC GROUNDING:** [connection to agent engineering context]

---
```

The `---` horizontal rule separates every top-level section.

### 1.4 Code Block Conventions

- Language tag on all fenced code blocks (```bash, ```python, ```markdown)
- 2 spaces indentation
- Comments explain purpose, not syntax
- `printf` instead of `echo` (standing order from AGENTS.md)
- All examples runnable on standard Linux

**BC-IV adaptation:** Most BC-IV code examples will be Python (eval scripts, Inspect AI
tasks, rubric definitions) rather than bash. The conventions still apply. Additionally,
BC-IV will include JSONL snippets for eval datasets and YAML for structured rubrics.

### 1.5 Challenges Section

Located near the end of each step. Pattern from `01-process-model.md:943-955`:

```markdown
## 7. Challenges

*Estimated time: 60-90 minutes total*

These challenges are designed to be run on a Linux system (Arch, Debian, Ubuntu, or any
distribution with standard GNU/Linux tools). Each one exercises a specific concept from
this step.

---

### Challenge N: Title

*Estimated time: X minutes*

[Description of what to do]

**Expected output format:** [what the learner should produce]

**What you are learning:** [the pedagogical purpose]

<details>
<summary>Hints</summary>

[code block with hints or partial solution]

</details>
```

Some challenges have a `<details><summary>Solution</summary>` block instead of hints.
Some have a **Stretch goal:** extension.

**BC-IV adaptation needed.** See Section 2.3 below.

### 1.6 Key Takeaways

Present at end of content sections, before Recommended Reading. Pattern from
`01-process-model.md:1370-1402`:

```markdown
## Key Takeaways

Before moving to Step N+1, you should be able to answer these questions without
looking anything up:

1. [Question that tests conceptual understanding, not recall]
2. ...
```

**No adaptation needed for BC-IV.** Carry forward as-is.

### 1.7 Recommended Reading and What to Read Next

Two separate sections at the end. Recommended Reading lists primary sources with brief
annotations. What to Read Next provides a 3-5 sentence preview of the next step that
explains the dependency connection.

From `01-process-model.md:1406-1441`:

```markdown
## Recommended Reading

- **The Design of the UNIX Operating System** - Maurice Bach (1986). Chapter 7 ...

---

## What to Read Next

**Step 2: The Shell Language** - Bash is not a scripting language bolted onto a terminal.
It is a process launcher with a programming language bolted on. Step 2 covers: ...
```

**No adaptation needed for BC-IV.** Carry forward as-is.

### 1.8 Blockquote Conventions (from README.md)

From `docs/bootcamp/README.md:108-113`:

```markdown
## Conventions

- 2 spaces indentation in code blocks
- Challenges marked with `## Challenge:` headers
- Agentic context marked with `> AGENTIC GROUNDING:` blockquotes
- Historical notes marked with `> HISTORY:` blockquotes
- All code examples runnable on Arch Linux / Debian / Ubuntu
- No emojis, no em-dashes
```

These are the BC-I blockquote types. BC-IV requires additional types (see Section 2).

---

## 2. BC-IV-Specific Adaptations

### 2.1 FIELD MATURITY Blockquotes

BC-IV has a heavier FRONTIER proportion than BC-I/II/III. The outline explicitly tags
each step (see the step tables in `BOOTCAMP-IV-OUTLINE.md:81-101`):

| Step | Field Maturity |
|------|----------------|
| 1 | Established/Emerging |
| 2 | Established |
| 3 | Emerging |
| 4 | Emerging/Frontier |
| 5 | Emerging |
| 6 | Frontier |
| 7 | Frontier |
| 8 | Emerging |
| 9 | Emerging |

Three steps are FRONTIER (4 partially, 6 fully, 7 fully). This is a higher ratio than
any previous bootcamp. The step header captures the overall maturity, but individual
sections within a step may differ.

**Convention:** Use `> FIELD MATURITY:` blockquotes within sections where the maturity
level differs from the step-level default, or where the distinction between established
knowledge and frontier practice is load-bearing.

```markdown
> **FIELD MATURITY: FRONTIER** - Multi-model adversarial review as a structured
> engineering practice (not ad hoc) has no published methodology outside this project's
> operational documentation. The individual components (red teaming, LLM-as-judge,
> cross-model comparison) are emerging, but the composed pipeline is frontier.
```

```markdown
> **FIELD MATURITY: ESTABLISHED** - Construct validity as a measurement concept comes
> from psychometrics (Messick 1989) and has 40+ years of empirical validation. The
> application to LLM evaluation is emerging, but the framework itself is established.
```

The three-level scale (ESTABLISHED, EMERGING, FRONTIER) matches the outline's usage.
Do not invent additional levels.

### 2.2 AGENTIC GROUNDING Adaptation

In BC-I, AGENTIC GROUNDING connects substrate concepts to agent operations:

From `01-process-model.md:126-130`:

```markdown
> **AGENTIC GROUNDING:** When an agent spawns a subprocess and you need to understand
> what it is doing, `/proc/$PID/` is your primary diagnostic tool. You can inspect its
> open file descriptors, its memory usage, its current working directory, its command
> line arguments, and its environment variables without attaching a debugger or modifying
> the process. Agents never check these. You should check them routinely.
```

In BC-IV, AGENTIC GROUNDING must connect to eval design and adversarial testing, not
just "how agents use this." The grounding question shifts from "why does this matter when
agents write code?" to "why does this matter when you evaluate agent output?" and "how
does this connect to adversarial testing of agent systems?"

**Adapted examples for BC-IV:**

```markdown
> **AGENTIC GROUNDING:** When you design an eval for agent-generated code, construct
> validity is not abstract - it is the question of whether your eval measures the code's
> correctness or merely the agent's ability to produce code that *looks* correct. The
> slopodar's "right answer wrong work" pattern is a construct validity failure: the test
> passes via the wrong causal path.
```

```markdown
> **AGENTIC GROUNDING:** The darkcat alley pipeline in this project is a worked example
> of multi-model adversarial review. Three models review the same code snapshot using
> structured YAML. Convergence across models builds confidence. Divergence locates where
> a single model's bias lives. This is eval infrastructure, not just code review.
```

**Rule:** Every AGENTIC GROUNDING in BC-IV should answer at least one of:
1. Why does this matter when designing evals for agent systems?
2. How does this connect to adversarial testing of LLM/agent output?
3. What project artifact demonstrates this concept in practice?

### 2.3 Exercise Format for Eval Design Exercises

BC-I challenges are implementation exercises: write a script, run commands, observe
output. BC-IV exercises are eval design exercises: design a rubric, build a dataset,
run adversarial tests, interpret results.

**The BC-I challenge format needs adaptation.** The key differences:

| Element | BC-I | BC-IV |
|---------|------|-------|
| Core activity | Write code, run commands | Design evals, build datasets, write rubrics |
| Output | Terminal output, scripts | JSONL datasets, rubric documents, eval reports |
| Verification | "did it run correctly?" | "does the eval measure what it claims?" |
| Hints section | Code snippets | Design considerations, edge case suggestions |
| Stretch goals | More complex code | Cross-model comparison, calibration analysis |

The outline already provides exercise descriptions. Example from
`BOOTCAMP-IV-OUTLINE.md:216-224`:

```markdown
### Exercises

- Define multidimensional success criteria for a code review agent. Specify at least
  4 dimensions with quantitative targets.
- Build a 50-sample eval dataset for the slopodar: given a text passage, classify
  which slopodar pattern (if any) it exhibits. Include edge cases where patterns
  overlap or are absent.
- Use an LLM to generate 200 synthetic eval samples from 20 hand-written examples.
  Measure: how many generated samples are valid? How does the distribution compare
  to the hand-written set?
```

**Proposed BC-IV challenge structure:**

```markdown
### Challenge N: Title

*Estimated time: X minutes*
*Type: Design | Build | Analyse*

[Description of the eval design task]

**Deliverable:** [what the learner produces - dataset, rubric, report, code]

**Design constraints:**
- [specific constraint 1]
- [specific constraint 2]

**Evaluation criteria:** [how the learner knows if their design is good]

<details>
<summary>Design guidance</summary>

[Guidance on approach, common pitfalls, edge cases to consider]

</details>
```

The `*Type:*` line distinguishes three BC-IV exercise types:
- **Design** - create an eval plan, rubric, or success criteria document
- **Build** - construct a dataset, implement a scorer, write eval code
- **Analyse** - run an eval, interpret results, write a findings report

### 2.4 SLOPODAR Blockquotes

The slopodar is used throughout BC-IV as a worked example of adversarial testing. The
outline references it in Steps 2, 6, 7, and 8. The slopodar taxonomy
(`docs/internal/slopodar.yaml`) is mandatory reading per SD-286.

**Convention:**

```markdown
> **SLOPODAR:** The "not wrong" pattern applies directly here. An eval that produces
> technically correct scores on every sample but measures the wrong construct is "not
> wrong" - it passes every surface check and requires deeper analysis to detect. This is
> why construct validity matters.
```

```markdown
> **SLOPODAR:** "Analytical lullaby" - warm numbers with no caveats. "95% accuracy
> across 10,000 samples" sounds impressive until you learn the samples are all easy
> cases. This pattern appears frequently in published benchmark results.
```

**Rule:** SLOPODAR blockquotes should:
1. Name the specific pattern (use the exact name from the taxonomy)
2. Connect the pattern to the eval/adversarial testing concept being discussed
3. Be concise - 2-4 lines maximum

---

## 3. New Conventions Proposed

### 3.1 NOVEL Blockquotes

The BC-IV outline has explicit "Field vs Novel" sections in every step. Example from
`BOOTCAMP-IV-OUTLINE.md:155-165`:

```markdown
### Field vs Novel

- **Available in the field:** Anthropic "Challenges in evaluating AI systems" (2023)
  is the primary reference on measurement challenges. Goodhart's law is well-established.
  Construct validity from psychometrics (Messick 1989). ...
- **Novel from this project:** The connection between eval measurement problems and
  the layer model (L0 training data contamination at weights level, L3 eval sensitivity
  to context formatting, L12 human evaluator as oracle with its own error rate). The
  "not wrong" concept from the slopodar applied to evals ...
```

This "Field vs Novel" structure in the outline should map to two inline mechanisms in
the step content:

1. The `> FIELD MATURITY:` blockquotes (Section 2.1 above) for established/emerging content
2. A `> NOVEL:` blockquote for content genuinely novel from this project

**Convention:**

```markdown
> **NOVEL:** The concept of "staining" - applying a diagnostic from one context to
> material from another to reveal hidden structure - is novel from this project. It draws
> on Gadamer's epistemology and FMEA mechanism analysis, but the composed application to
> LLM output review is not published elsewhere.
```

**Rule:** NOVEL blockquotes must:
1. State what is novel with precision
2. Not overclaim - if the components exist and only the composition is novel, say so
3. Reference the project artifact where the concept is documented or demonstrated
4. Be used sparingly - most content in BC-IV is ESTABLISHED or EMERGING, not NOVEL

The outline identifies approximately 18% of the project's lexicon as genuinely novel
(README.md line 48 via BC-II outline). NOVEL blockquotes should appear at roughly that
frequency or less.

### 3.2 Safety Notes for Steps 6-7

Steps 6 (Adversarial Testing Methodology) and 7 (Red Teaming for Safety-Critical
Capabilities) cover content that has responsible disclosure and safety implications.
The outline explicitly discusses CBRN assessment, dangerous capability evaluation,
and the "security clearance problem."

**Proposed convention - a `> SAFETY NOTE:` blockquote:**

```markdown
> **SAFETY NOTE:** The exercises in this section ask you to design adversarial tests,
> not to execute attacks against production systems. All testing should be conducted
> against your own systems or purpose-built evaluation environments. If you discover a
> concerning capability during evaluation, follow responsible disclosure practices -
> coordinate with the model provider before publishing findings.
```

```markdown
> **SAFETY NOTE:** Designing evals for dangerous capabilities (CBRN, ARA) requires
> domain expertise beyond software engineering. The exercises here teach the evaluation
> methodology, not the domain knowledge. Real dangerous capability evaluation involves
> cleared domain experts, institutional review, and coordination with government agencies.
> Do not attempt to independently assess dangerous capabilities.
```

**Placement:** Safety Notes should appear:
- Once at the top of Steps 6 and 7 (in the "Why This Step Exists" section)
- Before any exercise that involves adversarial testing of safety-relevant capabilities
- They should not be overused; two or three per step maximum

**Rule:** Safety Notes are factual warnings, not CYA boilerplate. Each one must identify
a specific risk and the specific mitigation. Generic "be careful" warnings are paper
guardrails (slopodar) and should not be used.

---

## 4. Complete Blockquote Registry for BC-IV

For reference, the full set of blockquote types available to BC-IV write agents:

| Blockquote | Source | Usage |
|------------|--------|-------|
| `> **AGENTIC GROUNDING:**` | BC-I (carried forward) | Connect concept to eval/adversarial testing context |
| `> **HISTORY:**` | BC-I (carried forward) | Historical origin stories, memory anchors |
| `> **FIELD MATURITY: LEVEL**` | BC-IV (new) | Mark established/emerging/frontier content |
| `> **SLOPODAR:**` | BC-IV (new) | Connect to anti-pattern taxonomy |
| `> **NOVEL:**` | BC-IV (new) | Mark genuinely novel content from this project |
| `> **SAFETY NOTE:**` | BC-IV (new, Steps 6-7 only) | Specific risk + mitigation for adversarial content |

---

## 5. Confirmed Template Summary

For write-task agents loading this as prime context, the confirmed BC-IV step structure is:

```
# Step N: Title
  - Estimated time, Field maturity, Prerequisites, Leads to
  - Step N of 9 in the Evaluation & Adversarial Testing Bootcamp.

## Why This Step Exists
  - 2-4 paragraphs with compositional rationale

## Table of Contents
  - Numbered list with anchor links and time estimates

## 1. Section Title
  - *Estimated time: X minutes*
  - Explanatory prose, code blocks, subsections
  - > **AGENTIC GROUNDING:** (eval/adversarial focus)
  - > **FIELD MATURITY:** (where section-level differs from step-level)
  - > **SLOPODAR:** (where taxonomy connects to topic)
  - > **NOVEL:** (where content is genuinely novel)
  - ---

## N. [Further content sections...]

## Challenges
  - *Estimated time: X-Y minutes total*
  - ### Challenge N: Title
    - *Estimated time:* / *Type: Design|Build|Analyse*
    - Description, Deliverable, Design constraints, Evaluation criteria
    - <details> with design guidance
  - > **SAFETY NOTE:** (Steps 6-7 only, before adversarial exercises)

## Key Takeaways
  - Numbered questions testing conceptual understanding

## Recommended Reading
  - Primary sources with annotations

## What to Read Next
  - 3-5 sentence preview of next step with dependency connection
```

**Standing conventions (no change):**
- 2 spaces indentation in code blocks
- `printf` not `echo`
- No emojis, no em-dashes
- All code examples runnable on standard Linux
- Language tags on all fenced code blocks
