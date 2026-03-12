# Task IV-08: Write - Step 2: Designing Eval Datasets and Success Criteria

**Type:** Write
**Depends on:** Tasks IV-01 (format), IV-02 (internal refs), IV-03 (external refs Tier 1)
**Parallelizable with:** IV-09 (once IV-07 establishes the voice)
**Output:** `docs/bootcamp/step-iv-02-dataset-design.md`

---

## Objective

Write the full Step 2 content: "Designing Eval Datasets and Success Criteria." This is
the most practical of the foundations tier - how to actually construct the datasets and
define the criteria that evaluations test against. Field maturity: ESTABLISHED.

Estimated target: 40-55k characters (~1200-1500 lines).

## Prime Context (load before writing)

1. `docs/bootcamp/tasks/iv-01-research-format-reuse/findings.md` - format template
2. `docs/bootcamp/tasks/iv-02-research-internal-refs/findings.md` - internal concepts
3. `docs/bootcamp/tasks/iv-03-research-tier1-external/findings.md` - external references
4. `docs/bootcamp/BOOTCAMP-IV-OUTLINE.md` lines 176-235 - the Step 2 outline

## Content Structure

### Mandatory Sections

1. **Why This is Step 2** - Frame: you now understand what evals measure and how they
   can mislead. Before you can score anything, you need something to score against.
   Dataset construction is the hardest part of evaluation - Anthropic's BBQ took
   ~2 person-years across 8 people.

2. **Success criteria design** - Anthropic's framework: specific, measurable, achievable,
   relevant. Walk through the progression from vague ("the model should classify
   sentiments well") to precise ("F1 score of at least 0.85 on a held-out test set
   of 10,000 diverse Twitter posts"). Concrete examples for multiple task types.

3. **Multidimensional criteria** - Most real use cases require evaluation along several
   axes simultaneously. Enumerate: task fidelity, consistency, relevance, tone,
   privacy preservation, context utilisation, latency, cost. Show how to define
   criteria for each dimension and how to weight/combine them.

4. **Dataset construction** - Representative sampling, edge case coverage, class balance.
   The difference between typical-performance testing and boundary-performance testing.
   Practical guidance on sample sizes (when is 50 enough? When do you need 10,000?).

5. **Edge case design** - The discriminating cases: irrelevant input, adversarial input,
   ambiguous input, overly long input, topic shifts, sarcasm, mixed signals. These
   separate "works in the demo" from "works in production." Systematic edge case
   generation rather than ad hoc.

6. **Synthetic data generation** - Using LLMs to generate eval datasets from baseline
   examples. When synthetic data helps (volume, coverage expansion) and when it hurts
   (distribution shift from real data, model-specific artifacts). Practical workflow:
   hand-write 20 examples, generate 200, validate a sample.

7. **Held-out test sets** - Why training data and eval data must be disjoint. The
   temptation to "peek" and how it invalidates results. Versioning test sets.

8. **Dataset versioning and maintenance** - Eval datasets drift as domains evolve.
   Version control for datasets. When to update vs when to create a new eval. The
   JSONL format as used by OpenAI evals and Inspect AI.

### Worked Example: Slopodar Eval Dataset

This is the novel contribution from the project. Walk through constructing an eval
dataset for the slopodar:

- Task: given a text passage, classify which slopodar pattern (if any) it exhibits
- Show the schema: `{"input": "passage text", "ideal": "pattern_name|none"}`
- Show 3-5 hand-written examples (one per slopodar category)
- Discuss edge cases: passages that exhibit multiple patterns, passages that are
  borderline, passages that are clean
- This becomes the basis for the Step 6 adversarial testing exercises

### Exercises

The outline specifies 3 exercises:
- Define multidimensional success criteria for a code review agent (4+ dimensions
  with quantitative targets)
- Build a 50-sample eval dataset for the slopodar (with edge cases where patterns
  overlap or are absent)
- Use an LLM to generate 200 synthetic eval samples from 20 hand-written examples,
  then validate the generation quality

### Agentic Grounding

Connect to:
- Why eval dataset quality determines evaluation quality (garbage in, garbage out)
- Why edge cases matter more than typical cases for production readiness
- The slopodar as a real working taxonomy that can be evaluated against

## Quality Constraints

- No emojis, no em-dashes
- 2 spaces indentation in code blocks
- Include practical JSONL examples (real format, not pseudocode)
- The slopodar worked example must use actual slopodar pattern names from the project
- Code examples should be runnable Python (dataset construction, synthetic generation)
