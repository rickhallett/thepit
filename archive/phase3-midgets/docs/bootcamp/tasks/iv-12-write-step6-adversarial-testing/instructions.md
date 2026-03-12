# Task IV-12: Write - Step 6: Adversarial Testing Methodology

**Type:** Write
**Depends on:** Tasks IV-01 (format), IV-02 (internal refs), IV-04 (Tier 2 external),
  IV-06 (eval frameworks)
**Parallelizable with:** IV-13 (once Tier 2 + Tier 3 research available)
**Output:** `docs/bootcamp/step-iv-06-adversarial-testing.md`

---

## Objective

Write the full Step 6 content: "Adversarial Testing Methodology." This is the first
FRONTIER step - moving adversarial testing from "poke at it and see what happens"
to a repeatable, structured engineering discipline. This step is load-bearing for the
Anthropic red teaming role application.

Estimated target: 45-60k characters (~1300-1700 lines). Longer than average due to
the worked examples and the importance of this step for the portfolio.

## Prime Context (load before writing)

1. `docs/bootcamp/tasks/iv-01-research-format-reuse/findings.md` - format template
2. `docs/bootcamp/tasks/iv-02-research-internal-refs/findings.md` - internal concepts
   (slopodar, darkcat, staining, multi-model review)
3. `docs/bootcamp/tasks/iv-04-research-tier2-external/findings.md` - external references
4. `docs/bootcamp/tasks/iv-06-research-eval-frameworks/findings.md` - eval frameworks
5. `docs/bootcamp/BOOTCAMP-IV-OUTLINE.md` lines 435-499 - the Step 6 outline

## Content Structure

### Mandatory Sections

1. **Why This is Step 6** - Frame: Steps 1-5 taught you to evaluate cooperatively -
   testing whether a system works as intended. This step inverts the question: how
   do you test whether a system fails in ways you did not intend? Adversarial testing
   is the discipline of systematically finding those failures.

2. **Adversarial testing as discipline** - The Anthropic observation: "Red teaming AI
   systems is presently more art than science." This step aims to move it closer to
   science. Structure, methodology, repeatability.

3. **The adversarial mindset** - Thinking like an attacker, not a user:
   - What would make this system fail?
   - What would make it produce harmful output?
   - What would make it leak information it should not?
   - The shift from "does it work?" to "how can it break?"

4. **Structured adversarial testing** - The methodology:
   - Define threat models
   - Enumerate attack surfaces
   - Design test cases per threat
   - Execute systematically (not ad hoc exploration)
   - Document findings with severity, reproducibility, suggested mitigations
   - This is the progression from ad hoc to engineering

5. **Prompt injection testing** - The primary attack vector:
   - Direct injection (malicious user input)
   - Indirect injection (malicious content in retrieved documents, tool results)
   - Jailbreaks, instruction override, role escape
   - Systematic test cases for each category
   - Current state of defenses

6. **Multi-model adversarial review** - The darkcat alley process as a worked example:
   - Using independent models to review the same artifact
   - Convergence = probable real finding
   - Divergence = where bias lives (L10 same-model correlation, L11 cross-model
     independence)
   - Structured YAML output format
   - The triangulate matching algorithm for comparing findings
   - Quantitative metrics: agreement rate, unique findings per model

7. **Anti-pattern detection as adversarial testing** - The slopodar applied:
   - The taxonomy as a structured diagnostic
   - Staining: applying diagnostic from one context to material from another
   - Detection heuristics for each pattern class
   - How anti-pattern detection scales to automated adversarial testing

8. **Adversarial dataset construction** - Creating eval samples designed to trigger
   known failure modes:
   - Sarcasm for sentiment models
   - Ambiguous instructions for agent systems
   - Boundary values for structured output
   - The adversarial dataset as a specialised eval dataset (connects to Step 2)

9. **Documenting adversarial findings** - The output:
   - Severity classification (critical, high, medium, low)
   - Reproducibility information (steps to reproduce, frequency)
   - Suggested mitigations
   - The darkcat findings format as a template

### Novel Content from This Project

This step has the highest novel content proportion:
- The darkcat alley process as a structured, repeatable, multi-model adversarial
  review with quantitative metrics
- The slopodar as a diagnostic taxonomy for adversarial testing
- The staining concept (applying diagnostic from one context to material from another)
- The darkcat review instructions as a reusable adversarial review rubric

Mark each novel contribution clearly with `> NOVEL:` blockquotes. The field/novel
boundary is especially important in this step because it is the primary portfolio
artifact for the Anthropic application.

### Exercises

3 exercises from the outline:
- Design a structured adversarial test plan for a customer service chatbot:
  5 threat models, 10 test cases per threat, success/failure criteria, severity scale
- Run a darkcat-style multi-model adversarial review on a piece of code: send the
  same file to 3 models with darkcat review instructions, parse findings, compute
  convergence. (Uses the project's actual infrastructure)
- Build an adversarial eval dataset: 30 samples designed to trigger slopodar patterns
  in LLM output. Run against 2 models. Compare susceptibility per pattern

### Agentic Grounding

Connect to:
- Why structured adversarial testing is more valuable than ad hoc exploration
- Why multi-model review provides independent signal (L10/L11)
- Why staining is a generalizable technique beyond this project

## Quality Constraints

- No emojis, no em-dashes
- 2 spaces indentation in code blocks
- The darkcat alley worked example must be detailed enough to reproduce
- Slopodar references must use actual pattern names and definitions from the project
- Threat model examples must be concrete and realistic
- Do NOT present this as the definitive methodology - present it as one structured
  approach that has been tested in practice, with clear limitations
