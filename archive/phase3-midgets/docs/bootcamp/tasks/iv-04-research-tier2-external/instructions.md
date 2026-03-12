# Task IV-04: Research - Tier 2 External References (Steps 4-6)

**Type:** Research (read-only, web fetch)
**Parallelizable with:** Tasks IV-01, IV-02, IV-03, IV-05, IV-06
**Blocks:** Tasks IV-10, IV-11, IV-12 (write tasks for Steps 4-6)
**Output:** `docs/bootcamp/tasks/iv-04-research-tier2-external/findings.md`

---

## Objective

Research and verify external references for Steps 4-6 (applied evaluation tier).
These are EMERGING to FRONTIER maturity steps. Step 4 (agent evaluation) is at the
frontier - the field is actively developing methodology. Steps 5-6 draw on emerging
infrastructure and adversarial testing practices. Research must clearly mark where
established field coverage ends and novel project content begins.

## Step 4 References to Research

**Topic:** Evaluating agents and workflows (EMERGING/FRONTIER)

1. **SWE-bench (Jimenez et al., 2023)**
   - Verify paper, current URL, dataset availability
   - Extract: methodology (real GitHub issues as eval tasks), scoring (pass@k),
     what it measures well vs what it misses
   - Known limitations and criticisms (as of 2026)
   - Current state-of-the-art scores

2. **WebArena**
   - Verify paper and benchmark, current URL
   - Extract: web navigation evaluation methodology, environment design,
     what it measures (tool use in browser context)
   - How it differs from SWE-bench (interactive environment vs code generation)

3. **OSWorld**
   - Verify benchmark exists, current URL
   - Extract: desktop agent evaluation methodology
   - How it extends WebArena to full OS interaction

4. **Inspect AI agent evaluation framework**
   - Verify documentation URL
   - Extract: Tasks/Solvers/Scorers architecture, agent scaffolds (ReAct),
     sandboxed execution (Docker, Kubernetes), multi-agent evaluation
   - The 100+ pre-built evals claim - verify and list categories
   - How Inspect handles trajectory evaluation vs endpoint evaluation

5. **OpenAI agent evals and trace grading**
   - Verify current documentation
   - Extract: trace grading methodology, how OpenAI evaluates agent trajectories
     (not just final answers), cost and latency as eval dimensions

6. **General research:**
   - Current state of agent evaluation methodology (any survey papers?)
   - Trajectory evaluation vs task-based evaluation - published comparisons?
   - Tool use accuracy as a sub-metric - any standardised measurement?
   - Cost-per-resolution benchmarking - any published approaches?

## Step 5 References to Research

**Topic:** Eval infrastructure and automation (EMERGING)

1. **Inspect AI infrastructure**
   - Verify documentation for: parallel execution, log viewer, VS Code extension,
     eval sets, eval registry
   - Extract: how Inspect runs evals at scale (async parallelisation, rate limiting)
   - The log viewer - what it shows, how results are stored

2. **OpenAI evals CLI**
   - Verify current state (is the evals CLI still maintained or deprecated?)
   - Extract: registry pattern, how evals are registered and run
   - CLI interface for running evals

3. **MLOps practices adapted for LLM evals**
   - General research: how are teams integrating evals into CI/CD?
   - GitHub Actions for eval pipelines - any published examples?
   - Eval regression testing patterns - any standard approaches?

4. **General research:**
   - Braintrust, LangSmith, other eval platforms - current state, what they offer
   - Eval cost budgeting - any published frameworks for estimating LLM-as-judge costs?
   - Dataset versioning in practice - DVC vs Git vs custom solutions
   - Eval-driven development as a methodology - who is writing about this?

## Step 6 References to Research

**Topic:** Adversarial testing methodology (FRONTIER)

1. **Anthropic frontier threats red teaming (2023)**
   - Verify publication, get correct citation
   - Extract: the "more art than science" observation, what methodology exists,
     what gaps remain
   - How Anthropic structures their red team activities

2. **OWASP Top 10 for LLM Applications**
   - Verify current version (2023, updated 2024?)
   - Extract: prompt injection (direct and indirect), data leakage, excessive agency
   - Which entries are most relevant to adversarial eval design

3. **Microsoft AI Red Team**
   - Verify published methodology exists
   - Extract: structured approach to AI red teaming, what they test for,
     how findings are classified

4. **Prompt injection research**
   - Current state of prompt injection attacks and defenses
   - Direct injection vs indirect injection (via retrieved documents, tool results)
   - Any standardised test suites for prompt injection?

5. **General research:**
   - Structured adversarial testing methodology - any published frameworks beyond
     ad hoc "poke at it and see"?
   - Multi-model review for finding convergence/divergence - any published parallel
     to the darkcat alley pattern?
   - Anti-pattern taxonomies for LLM output - any published parallel to the slopodar?
   - Adversarial dataset construction best practices - how to design samples that
     trigger specific failure modes?
   - Finding severity classification for AI systems - any standard scales?

## Output Format

For each reference:
```
### [Reference Name]
- **Status:** verified/not-found/moved/outdated
- **URL/Citation:** (current URL or full academic citation)
- **Key Extraction:** (2-5 bullet points of what's pedagogically useful)
- **Best Quote/Passage:** (if applicable)
- **Field vs Novel:** (what the field provides vs what this project adds on top)
- **Caveat:** (anything changed, disputed, needs updating)
```

Group by step. For FRONTIER topics (Steps 4 advanced, 6), explicitly note where
field coverage ends and project operational experience begins. This boundary is
load-bearing for intellectual honesty.
