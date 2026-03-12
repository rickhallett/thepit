# Task IV-10: Write - Step 4: Evaluating Agents and Workflows

**Type:** Write
**Depends on:** Tasks IV-01 (format), IV-02 (internal refs), IV-04 (Tier 2 external),
  IV-06 (eval frameworks)
**Parallelizable with:** IV-11 (once Tier 2 research is available)
**Output:** `docs/bootcamp/step-iv-04-agent-eval.md`

---

## Objective

Write the full Step 4 content: "Evaluating Agents and Workflows." This is where
evaluation gets harder - agents are non-deterministic, multi-step, and environment-
interactive. Field maturity: EMERGING/FRONTIER.

Estimated target: 40-55k characters (~1200-1500 lines).

## Prime Context (load before writing)

1. `docs/bootcamp/tasks/iv-01-research-format-reuse/findings.md` - format template
2. `docs/bootcamp/tasks/iv-02-research-internal-refs/findings.md` - internal concepts
3. `docs/bootcamp/tasks/iv-04-research-tier2-external/findings.md` - external references
4. `docs/bootcamp/tasks/iv-06-research-eval-frameworks/findings.md` - Inspect AI agent
   evaluation specifics
5. `docs/bootcamp/BOOTCAMP-IV-OUTLINE.md` lines 304-368 - the Step 4 outline

## Content Structure

### Mandatory Sections

1. **Why This is Step 4** - Frame: Steps 1-3 taught you to evaluate single
   input-output pairs. Agents produce trajectories through state spaces. A prompt
   eval tests one pair. An agent eval tests a path. This changes everything about
   how you design, run, and score evaluations.

2. **Why agent evaluation is harder** - Non-deterministic tool use, multi-step
   trajectories, environment interaction, partial observability. The same agent
   given the same task may take different paths. How do you evaluate that?

3. **Task-based evaluation** - Define a task, provide an environment, measure success.
   Concrete examples:
   - SWE-bench: resolve this GitHub issue (code generation + tool use)
   - WebArena: navigate this website to accomplish a goal
   - OSWorld: use this desktop environment to complete a task
   - What these benchmarks get right and wrong

4. **Trajectory evaluation** - Not just "did it succeed?" but "how did it succeed?"
   - Quality of intermediate steps
   - Tool use efficiency (did it use the right tool? Did it need 50 calls or 5?)
   - Error recovery behaviour (when a tool call fails, what does it do?)
   - OpenAI's trace grading approach

5. **The Inspect AI agent evaluation model** - Practical implementation:
   - Tasks combining Datasets + Solvers (including agent scaffolds) + Scorers
   - Built-in agents (ReAct pattern)
   - Multi-agent evaluation
   - Sandboxed execution (Docker, Kubernetes)
   - How Inspect handles trajectory logging

6. **Sandboxing for agent evals** - Running untrusted model-generated code safely.
   Docker sandboxes in Inspect AI. Connect to Bootcamp I Step 9 (container internals
   - namespaces, cgroups). Why sandboxing is non-negotiable for agent evals.

7. **Workflow evaluation** - Evaluating multi-step pipelines (prompt chaining, routing,
   parallelisation). Each step can be evaluated independently or end-to-end. When
   to do component evaluation vs integration evaluation.

8. **Cost and latency as eval dimensions** - An agent that solves the task in 50 API
   calls is different from one that solves it in 5. Metrics:
   - Token efficiency (tokens per successful resolution)
   - Time to completion
   - Cost per successful resolution
   - These are first-class eval dimensions, not afterthoughts

9. **Evaluating tool use** - Sub-metric for agent evaluation:
   - Did it select the right tool?
   - Did it provide correct parameters?
   - Did it interpret the result correctly?
   - Tool use accuracy as a decomposable metric

### Novel Content from This Project

- The polecat pattern (one-shot agent job) as an eval-friendly architecture:
  deterministic, fresh context, no interactive steering = reproducible evaluation
- The gauntlet pipeline as a worked example of multi-stage agent evaluation
- The quality gate is itself an agent eval scorer - the gate tests whether the
  agent's output is correct (typecheck + lint + test = code-based grading)

### Exercises

3 exercises from the outline:
- Design an agent eval for file search: agent uses grep, read, glob tools to find
  information across 10 files. Define success criteria, dataset (20 search tasks),
  scorer (correctness + efficiency)
- Build an Inspect AI eval for a simple ReAct agent with bash and Python tools.
  Measure: task success rate, average steps to completion, tool use accuracy
- Evaluate the same task with two architectures (single-agent vs orchestrator-worker).
  Compare: success rate, cost, latency, error recovery

### Agentic Grounding

Connect to:
- Why trajectory evaluation matters (an agent that stumbles to the right answer
  is different from one that takes a clean path)
- Why sandboxing is a safety requirement, not a convenience
- Why cost/latency metrics matter for production deployment decisions

## Quality Constraints

- No emojis, no em-dashes
- 2 spaces indentation in code blocks
- Include Inspect AI code examples for agent evaluation
- SWE-bench and WebArena descriptions should be accurate to current state
- The polecat-as-eval-friendly-architecture insight should be presented as an
  observation, not a claim of invention
