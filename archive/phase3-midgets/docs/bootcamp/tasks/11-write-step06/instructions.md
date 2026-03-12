# Task 11: Write - Step 6: Verification and Quality for Probabilistic Systems

**Type:** Write
**Depends on:** Tasks 01 (format), 02 (internal refs), 04 (external refs for Step 6), Tasks 06-09 (Steps 1-4)
**Parallelizable with:** None (convergence point - Steps 1-4 must be complete)
**Output:** `docs/bootcamp/step06-verification-quality.md`

---

## Objective

Write the full Step 6 content: "Verification and Quality for Probabilistic Systems."
EMERGING for basic quality gates, FRONTIER for the oracle problem application, test
anti-patterns, and verifiable/taste-required distinction. This is the longest step
(6-7h estimated) and a critical convergence point in the dependency graph.

Estimated target: 50-60k characters (~1500-1800 lines).

## Prime Context (load before writing)

1. `docs/bootcamp/tasks/01-research-format/findings.md` - format template
2. `docs/bootcamp/tasks/02-research-internal-refs/findings.md` - gate, oracle problem, slopodar code patterns, HOTL/HODL
3. `docs/bootcamp/tasks/04-research-tier2-external/findings.md` - Reason 1990, Weyuker 1982, METR RCT, SWE-bench
4. `docs/bootcamp/BOOTCAMP-II-OUTLINE.md` lines 463-544 - the Step 6 outline
5. `docs/bootcamp/step01-llm-mechanics.md` - generation mechanics (why output is probabilistic)
6. `docs/bootcamp/step04-context-engineering.md` - context quality loop (why verification matters)

## Content Structure

### Mandatory Sections

1. **Why This is Step 6** - LLM output is probabilistic. Every output has non-zero
   P(wrong) that is syntactically valid and contextually plausible. Traditional
   testing assumes deterministic systems. This step teaches verification discipline
   for probabilistic output.

2. **The fundamental verification challenge** - The model can produce output that:
   - Compiles and type-checks
   - Passes existing tests
   - Follows the correct patterns
   - Is completely wrong in intent, logic, or edge case handling
   - Traditional testing catches deterministic bugs. What catches probabilistic ones?

3. **The oracle problem** - Weyuker 1982 applied to human-AI systems:
   - When L12 (human) introduces an error, it propagates through all verification layers
   - No layer has authority above the human
   - The verification fabric catches agent error. It is structurally blind to oracle error.
   - Implication: verification discipline must also include checks on human assumptions

4. **The quality gate** - Test suite + typecheck + linter as survival:
   - The gate is a poka-yoke (prevents defects from passing, not detects after the fact)
   - `pnpm run typecheck && pnpm run lint && pnpm run test`
   - If the gate fails, the change is not ready. No exceptions.
   - The gate is necessary but not sufficient (passes gate != correct)

5. **Verifiable vs taste-required** - The load-bearing distinction:
   - Verifiable: code compiles, tests pass, types check, lint clean - gate handles these
   - Taste-required: right abstraction? good naming? clear prose? correct architecture?
   - Only human judgment evaluates taste-required quality
   - HOTL when verifiable, HODL when taste-required
   - This is THE governance dial for agentic engineering

6. **The verification pipeline (Swiss Cheese Model)** - Reason 1990:
   - Multiple independent layers of defence
   - Each layer has holes (imperfect detection)
   - Arranged so no single failure passes through all layers
   - P(defect reaching production) = product of P(survives each layer)
   - Practical layers: type checker -> linter -> unit tests -> integration tests ->
     code review -> adversarial review -> human verification

7. **Definition of done in agentic contexts:**
   - Not "dev finished" but gate green + review complete + synthesis checked
   - Each verification step adds independent signal
   - "Verified, deployed, working" is the measure, not merge count

8. **Test anti-patterns in agent-generated code** - Five named patterns:
   - **Right answer, wrong work:** assertion passes but via wrong causal path.
     Test asserts output == expected. Output matches. But the function computed
     the right answer for the wrong reason (e.g., hardcoded return that happens
     to match the test case). The test is green. The code is wrong.
   - **Phantom tollbooth:** assertion so loose it cannot distinguish intended
     behaviour from unrelated failures. `expect(result).toBeTruthy()` - passes
     for any truthy value, including error objects.
   - **Mock castle:** mock scaffolding exceeds assertion count. The test
     constructs an elaborate mock universe, then asserts one property. The
     mocks are doing the work, not the code under test.
   - **Shadow validation:** good validation for easy cases, skipped for critical path.
     Edge cases, error paths, and boundary conditions are where bugs live.
   - **Confessional test:** test acknowledges it cannot verify what its name claims.
     `// TODO: actually verify the output format` in a test named `testOutputFormat`.

9. **Evaluation methods** - SWE-bench, WebArena, benchmarks:
   - What they measure (specific task completion under controlled conditions)
   - What they don't (production reliability, maintainability, team integration)
   - The gap between benchmark performance and production confidence
   - METR RCT: 19% slower with AI, believing 20% faster - a 40-point gap

### Layer Model Integration

- The verification pipeline maps to multiple layers: L7 (tools as verification channel),
  L6 (harness orchestrates verification), L10 (multi-agent review), L12 (human judgment)
- The oracle problem is an L12 failure that no lower layer can catch

### Challenges

Design 5-7 challenges:
- Gate construction (easy - build a quality gate for a small project)
- Anti-pattern identification (medium - given test code, identify which anti-pattern)
- Verifiable vs taste audit (medium - categorise changes in a PR as verifiable/taste-required)
- Swiss Cheese design (hard - design a 4-layer verification pipeline for a real workflow)
- Oracle problem exercise (hard - deliberately introduce an L12 error and see if agents catch it)
- METR replication (hard - time yourself with and without AI assistance on a defined task)

### Field Maturity

`> FIELD MATURITY: EMERGING` for quality gates and CI/CD practices.
`> FIELD MATURITY: FRONTIER` for oracle problem application, test anti-patterns,
verifiable/taste-required distinction as governance dial.

## Quality Constraints

- No emojis, no em-dashes
- Test anti-pattern examples must be concrete code, not abstract descriptions
- The METR RCT finding must be cited precisely (arXiv:2507.09089)
- Swiss Cheese Model should be presented with enough depth that students can design their own
- The verifiable/taste-required distinction is load-bearing - make it viscerally clear
