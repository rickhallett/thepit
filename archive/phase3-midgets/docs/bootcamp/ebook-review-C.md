# Technical Book Chapter Review - Priority Construction

You are an editor. A technical book for software engineers (3+ years experience)
who work with AI coding agents currently has 51 chapters and 456,000 words. It
needs to become a focused, coherent book of roughly 80,000 words.

Your task: build the book from scratch. Starting from nothing, add chapters one
at a time in the order you would prioritise them. Stop at 80,000 words.

Rules:
- The dependency graph is a hard constraint. If you include a chapter, ALL its
  listed dependencies must also be included. Their word counts are added when
  you first pull them in.
- The result must read as a coherent book, not a disconnected collection of the
  "best" chapters from different sections.
- You are building for a reader who is a competent SWE wanting to work
  effectively with AI coding agents. They can already program. They may or
  may not know Linux deeply. They have used LLMs but have not built agent
  systems.

---

## Chapter Index with Dependencies

### Part I: Linux Substrate

- I.1 (6,799w, deps: none) The Unix Process Model - File descriptors, pipes, and signals; the kernel primitives that everything else composes on.
- I.2 (9,393w, deps: I.1) The Shell Language - POSIX sh then bash: quoting, expansion, control flow, error handling.
- I.3 (7,537w, deps: I.1) The Filesystem as State - Paths, permissions, inodes, /proc, /sys; the agent's working memory is the filesystem.
- I.4 (8,401w, deps: I.2) The Text Processing Pipeline - jq, grep, awk, sed, yq and composable text stream tools.
- I.5 (5,518w, deps: I.2) Python as a CLI Tool - stdin/stdout, exit codes, argparse, subprocess, uv.
- I.6 (6,932w, deps: I.2) Make and Just as Orchestrators - DAG execution and recipe running for deterministic pipelines.
- I.7 (6,960w, deps: I.3) Git Internals - Git's object model so every agent git operation can be verified at the plumbing level.
- I.8 (7,162w, deps: I.1) Process Observation - strace, ltrace, lsof, ss for observing what a process actually does.
- I.9 (10,096w, deps: I.8) Container Internals - Namespaces, cgroups, OverlayFS; a container is a process with three kernel restrictions.
- I.10 (7,832w, deps: I.1) Networking from the CLI - curl, openssl, dig, tcpdump, iptables.
- I.11 (9,623w, deps: I.1) Process Supervision - systemd, cron, supervisord for long-running agent processes.
- I.12 (10,797w, deps: I.1) Advanced Bash - trap, coprocesses, associative arrays, BASH_REMATCH, production shell patterns.

### Part II: Agentic Engineering Practices

- II.1 (11,395w, deps: none) How LLMs Actually Work - Transformer architecture, tokenisation, context windows, autoregressive generation; operational consequences of the math.
- II.2 (6,921w, deps: II.1) Agent Architecture Patterns - Workflows vs agents, five Anthropic patterns, single vs multi-agent, the simplicity principle.
- II.3 (8,986w, deps: II.1) Prompt Engineering as System Design - System prompts as specifications, structured output, few-shot patterns.
- II.4 (11,757w, deps: II.1, II.3) Context Engineering - Working set theory (Denning 1968 applied to LLMs), cold/hot pressure, compaction loss, the dumb zone.
- II.5 (9,916w, deps: II.2, II.3) Tool Design and Agent-Computer Interfaces - ACI design, poka-yoke for tools, MCP, tool result injection.
- II.6 (13,427w, deps: II.1, II.2, II.3, II.4) Verification and Quality for Probabilistic Systems - The oracle problem, quality gates, Swiss Cheese Model, five named test anti-patterns.
- II.7 (13,027w, deps: II.1, II.4, II.6) The Human-AI Interface - 13-layer operational model (L0-L12), sycophantic drift vs hallucination, anti-pattern taxonomy, seven named HCI failure modes with detection heuristics.
- II.8 (5,724w, deps: II.1, II.6, II.7) Multi-Model Verification - N-version programming for LLMs, convergence/divergence analysis, the monoculture problem.
- II.9 (11,231w, deps: II.4, II.6, II.7) Failure Modes and Recovery - Seven HCI failure modes in operational depth, cognitive deskilling (Bainbridge 1983), checkpoint recovery, governance recursion.
- II.10 (10,459w, deps: II.2, II.5, II.6, II.7) Governance and Enterprise Integration - Engineering loop, atomic changes, human-in/out-the-loop spectrum, bearing checks, pull-based review.
- II.11 (9,256w, deps: II.2, II.5) Cost, Security, Legal, and Compliance - Token economics, sandbox design, prompt injection, credential management, IP ownership, audit trails.

### Part III: Operational Analytics

- III.1 (6,694w, deps: none) Tabular Data with pandas and DuckDB - DataFrames, column operations, groupby, joins, reshaping.
- III.2 (4,830w, deps: III.1) Descriptive Statistics - Central tendency, spread, percentiles, distribution shape, correlation.
- III.3 (5,333w, deps: III.1) SQL Analytics with DuckDB - CTEs, window functions, self-joins, pivoting, date/time operations.
- III.4 (6,803w, deps: III.2) Statistical Testing for Practitioners - t-tests, Mann-Whitney, chi-squared, effect size, multiple comparisons.
- III.5 (5,930w, deps: III.2, III.3) Time Series Basics - Moving averages, trend detection, seasonality, anomaly detection, change points.
- III.6 (6,782w, deps: III.1, III.2) Visualisation for Decision-Making - matplotlib, chart selection, multi-panel figures, heatmaps, annotations.
- III.7 (5,145w, deps: III.1) Log Analysis Patterns - Log parsing, session reconstruction, error rate computation, latency analysis.
- III.8 (5,798w, deps: III.1, III.5) Cost Modelling for API-Based Systems - Token economics, cost per task, trend analysis, marginal cost, budget forecasting.
- III.9 (6,023w, deps: III.1) Text Analysis Basics - String similarity, TF-IDF, embedding-based similarity, simple classification, diffing.
- III.10 (4,368w, deps: III.1) Notebook-Based Analysis Workflows - Notebook organisation, reproducibility, exploration-to-script pipeline.

### Part IV: Evaluation and Adversarial Testing

- IV.1 (12,237w, deps: none) What Evaluations Actually Measure - Construct validity, content contamination, saturation, Goodhart's law; the epistemology of evals.
- IV.2 (10,287w, deps: IV.1) Designing Eval Datasets - Success criteria, edge cases, synthetic data, held-out test sets, dataset versioning.
- IV.3 (9,214w, deps: IV.1, IV.2) Scoring and Grading Methods - Code-based grading, LLM-as-judge, human grading, rubric design, grader calibration.
- IV.4 (11,302w, deps: IV.2) Evaluating Agents and Workflows - Task-based evaluation, trajectory analysis, Inspect AI, sandboxed execution, tool use accuracy.
- IV.5 (6,342w, deps: IV.3) Eval Infrastructure and Automation - Eval-driven development, evals in CI/CD, regression testing, eval cost budgeting.
- IV.6 (13,851w, deps: IV.3) Adversarial Testing Methodology - Structured adversarial testing, prompt injection testing, multi-model review, anti-pattern detection.
- IV.7 (10,634w, deps: IV.1) Red Teaming for Safety-Critical Capabilities - Safety evaluation, sabotage modalities, alignment faking, deception detection, responsible disclosure.
- IV.8 (6,448w, deps: IV.1) Interpreting and Communicating Eval Results - Confidence intervals, honest model comparison, eval limitations, avoiding eval theatre.
- IV.9 (10,260w, deps: IV.1) Building an Eval Culture - Eval review, ownership, roadmaps, sharing, continuous evaluation in production.

### Part V: Agent Infrastructure in Practice

- V.1 (11,373w, deps: none) The Retrieval Problem - Why agents need external knowledge, the naive RAG pipeline, where it breaks, retrieval quality metrics.
- V.2 (11,006w, deps: V.1) Embeddings and Vector Search - Dense vector representations, similarity metrics, vector databases, indexing strategies.
- V.3 (8,335w, deps: V.1, V.2) RAG Pipeline Engineering - Chunking strategies, query processing, context assembly, citation, RAG evaluation.
- V.4 (10,976w, deps: V.3) Advanced Retrieval Patterns - Hybrid search, reranking, agentic RAG, GraphRAG, code retrieval.
- V.5 (12,984w, deps: V.1) State Management for Agents - Stateless to stateful spectrum, filesystem as state, state backends, schema design, concurrency.
- V.6 (6,917w, deps: V.2, V.5) Conversation Memory and Session Persistence - Memory patterns (full, sliding window, summary, entity, retrieval-augmented), selective forgetting.
- V.7 (11,773w, deps: V.1) Agent Observability and Tracing - Traces, spans, structured logging, OpenTelemetry for LLM, custom tracing, alert fatigue.
- V.8 (13,197w, deps: V.5, V.7) Debugging Agent Systems - Replay debugging, failure classification, diagnosis by layer, common patterns, post-mortems.
- V.9 (11,405w, deps: V.1-V.8) Production Patterns - Rate limiting, fallback chains, scaling, deployment patterns, cost controls, reliability.

---

## Output Format

Respond in YAML only. No commentary outside the YAML block.

```yaml
reviewer: "<model name and version>"

build_order:
  - add: "II.1"
    pulls_in: []           # dependencies not yet included that get added
    words_this_step: 11395 # total new words added (chapter + any new deps)
    running_total: 11395
    rationale: "<1 sentence>"
  - add: "II.3"
    pulls_in: []           # II.1 already included
    words_this_step: 8986
    running_total: 20381
    rationale: "..."
  # continue until running_total exceeds 80000, then stop

final:
  chapters_included: ["II.1", "II.3", ...]  # sorted
  chapters_excluded: ["I.4", "I.5", ...]    # sorted
  total_words: <number>
  coherence_note: "<1-2 sentences on whether the included set reads as a book>"
```
