# Task IV-06: Research - Eval Framework Deep Dive (Inspect AI, OpenAI Evals)

**Type:** Research (read-only, web fetch)
**Parallelizable with:** Tasks IV-01, IV-02, IV-03, IV-04, IV-05
**Blocks:** Tasks IV-09, IV-10, IV-11, IV-12 (Steps 3-6 write tasks)
**Output:** `docs/bootcamp/tasks/iv-06-research-eval-frameworks/findings.md`

---

## Objective

Deep-dive into the two primary eval frameworks referenced throughout Bootcamp IV:
UK AISI's Inspect AI and OpenAI's evals framework. The write tasks need accurate
API patterns, architectural understanding, and concrete code examples. This task
produces the technical foundation that multiple write tasks depend on.

This research task exists because eval frameworks are referenced across Steps 3, 4,
5, and 6 - too broadly for any single tier-specific research task to cover adequately.

## Inspect AI Deep Dive

URL: https://inspect.ai-safety-institute.org.uk/ (verify)
GitHub: https://github.com/UKGovernmentBEIS/inspect_ai (verify)

### Architecture

1. **Core abstractions** - document the full architecture:
   - **Task** - the top-level unit combining Dataset + Solver + Scorer
   - **Dataset** - eval samples (JSONL, CSV, or Python-generated)
   - **Solver** - the thing being evaluated (prompt pipeline, agent, chain)
   - **Scorer** - how outputs are graded
   - **Sandbox** - execution environment (Docker, K8s)
   - How these compose together

2. **Built-in Solvers**
   - Simple prompt solvers
   - Agent solvers (ReAct, tool-use patterns)
   - Multi-turn solvers
   - How custom solvers are implemented

3. **Built-in Scorers**
   - Code-based: exact, includes, pattern
   - Model-graded: model_graded_fact, model_graded_qa
   - Custom scorer interface
   - How scorers receive the task output and expected answer

4. **Agent evaluation specifics**
   - How Inspect evaluates agent trajectories
   - Sandboxed execution (Docker containers for running agent-generated code)
   - Tool definitions within Inspect
   - Multi-agent evaluation patterns

5. **Infrastructure features**
   - Parallel execution (async)
   - Rate limiting and retry
   - Log storage and the log viewer
   - Eval sets (running multiple evals as a suite)
   - VS Code extension capabilities

6. **Pre-built evals**
   - Verify the "100+ pre-built evals" claim
   - What categories exist (safety, capability, domain-specific?)
   - How to use pre-built evals as baselines

### Code Patterns to Document

For each, provide a minimal working example:

- Define a simple Task with a JSONL dataset, prompt solver, and exact scorer
- Define a Task with model_graded_qa scorer (LLM-as-judge)
- Define an agent Task with ReAct solver and tool use
- Define a custom Scorer
- Run an eval from CLI and from Python
- Access and interpret eval logs

## OpenAI Evals Deep Dive

GitHub: https://github.com/openai/evals (verify status - maintained or archived?)

### Architecture

1. **Registry pattern** - how evals are registered and discovered
2. **Eval templates** - model-graded, classification, code execution
3. **Dataset format** - JSONL schema, input/ideal structure
4. **Running evals** - CLI interface, programmatic usage
5. **Current status** - is this framework still actively maintained? Has it been
   superseded by the newer OpenAI agents/evals documentation?

### Code Patterns to Document

- Define a simple eval with a JSONL dataset
- Define a model-graded eval with a rubric
- Run an eval and interpret results

## Comparison Table

Produce a comparison table:

| Feature | Inspect AI | OpenAI Evals |
|---------|-----------|-------------|
| Agent evaluation | ? | ? |
| Sandboxing | ? | ? |
| LLM-as-judge | ? | ? |
| Pre-built evals | ? | ? |
| CI/CD integration | ? | ? |
| Log viewer | ? | ? |
| Active maintenance | ? | ? |
| Python API | ? | ? |
| CLI | ? | ? |

## Output Format

Structured markdown with separate sections for each framework. Code examples should
be copy-pasteable (modulo API keys). Version-stamp all API patterns. Include the
comparison table. Flag any API patterns that may have changed between versions.

The write tasks will draw from this research for:
- Step 3: Scorer API and LLM-as-judge patterns
- Step 4: Agent evaluation architecture
- Step 5: Infrastructure, CI/CD, logging
- Step 6: Sandboxed adversarial evaluation
