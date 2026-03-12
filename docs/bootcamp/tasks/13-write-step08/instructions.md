# Task 13: Write - Step 8: Multi-Model Verification Strategies

**Type:** Write
**Depends on:** Tasks 01 (format), 02 (internal refs), 05 (external refs for Step 8), Task 06 (Step 1), Task 11 (Step 6), Task 12 (Step 7)
**Parallelizable with:** Task 14 (Step 9) - both depend on Steps 6 and 7, but different external refs
**Output:** `docs/bootcamp/step08-multi-model-verification.md`

---

## Objective

Write the full Step 8 content: "Multi-Model Verification Strategies." FRONTIER step.
This is the practical operationalisation of the insight that same-model agreement is
not independent evidence. N-version programming (Avizienis 1985) adapted for LLM
verification.

Estimated target: 30-40k characters (~900-1200 lines). Shorter step (3-4h estimated).

## Prime Context (load before writing)

1. `docs/bootcamp/tasks/01-research-format/findings.md` - format template
2. `docs/bootcamp/tasks/02-research-internal-refs/findings.md` - adversarial review, staining, monoculture analysis
3. `docs/bootcamp/tasks/05-research-tier3-external/findings.md` - Avizienis 1985, IV&V
4. `docs/bootcamp/BOOTCAMP-II-OUTLINE.md` lines 628-692 - the Step 8 outline
5. `docs/bootcamp/step06-verification-quality.md` - verification pipeline, Swiss Cheese
6. `docs/bootcamp/step07-human-ai-interface.md` - L10/L11, monoculture problem

## Content Structure

### Mandatory Sections

1. **Why This is Step 8** - Enterprises cannot afford correlated blind spots. Multi-model
   strategies provide practical defence against systematic biases. Cost is modest (3x).
   Asymmetric payoff: low cost when nothing found, high value when something is.

2. **The monoculture problem** - N agents from the same model family agreeing:
   - Same training data, same RLHF, same blind spots
   - Precision increases (consistent output), accuracy does not (same errors)
   - 11/11 same-model agreement has the evidential weight of one observation
   - This is L10: multi-agent from same model != independent

3. **N-version programming applied** - Avizienis 1985:
   - Original: independent implementations of same spec, vote on output
   - Applied to LLMs: independent model families review same code/output
   - Convergence builds confidence (all agree = probably real finding)
   - Divergence locates bias (they disagree = focus human attention there)
   - Limitation: models share training data overlap, so independence is bounded

4. **Multi-model ensemble review** - The triangulation pattern:
   - 3 independent models review same code snapshot
   - Structured YAML output format (consistent schema for each reviewer)
   - Synthesis step: compute convergence/divergence
   - This project's implementation: `bin/triangulate` parser, YAML findings,
     8 metrics, convergence matrix
   - Practical workflow: Claude + GPT-4 + Gemini (or any 3 distinct families)

5. **When models disagree** - Divergence is more informative than convergence:
   - If all three converge on a finding: high confidence, probably real
   - If two converge, one diverges: investigate the divergence - it locates bias
   - If all three diverge: the question is ambiguous or taste-required
   - Human attention goes to divergence points, not convergence

6. **Selection criteria per task type:**
   - Reasoning models (o1/o3, Claude Opus): complex logic, multi-step analysis
   - Fast models (Haiku, GPT-4o-mini): routine classification, simple checks
   - Different families for adversarial review: the whole point is different priors
   - Cost-performance tradeoffs: adversarial review 3x cost for potentially
     high-value findings

7. **The adversarial review pattern:**
   - Read-only review pass (no code modification)
   - Custom diagnostic ruleset (what to look for)
   - Staining: applying diagnostic from one context to material from another
   - Red team methodology adapted for code and prose review
   - The reviewer's job is to find what the author missed

8. **Limitations:**
   - Training data overlap bounds independence
   - Not a statistical guarantee - an engineering heuristic
   - Diminishing returns past 3 models (marginal value drops)
   - Models can share systematic blind spots from common training patterns

### Layer Model Integration

- L10 multi-agent: same model does not mean independent (precision without accuracy)
- L11 cross-model: different priors produce independent signal
- The jump from L10 to L11 is the value proposition of multi-model review

### Challenges

Design 4-5 challenges:
- Monoculture demonstration (easy - same prompt to same model 3x, measure agreement)
- Cross-model comparison (medium - same review task to 3 model families, compare findings)
- Convergence analysis (medium - given 3 model reviews, identify convergence/divergence)
- Triangulation pipeline (hard - build a 3-model review pipeline with structured YAML output)
- Adversarial review exercise (hard - design a diagnostic ruleset for a specific codebase)

### Field Maturity

`> FIELD MATURITY: FRONTIER` - N-version programming is established (1985). IV&V is standard.
Novel: structured multi-model ensemble review, the triangulation synthesis pattern, staining
concept, the observation about unanimous chorus evidential weight.

## Quality Constraints

- No emojis, no em-dashes
- The monoculture problem must be presented as intuitive, not academic
- Practical workflow examples should be reproducible with standard API access
- The limitation section is as important as the method section - intellectual honesty
- YAML review format examples should be concrete and usable
