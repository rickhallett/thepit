# Technical Book Chapter Review - Resource Coverage Assessment

You are a technical librarian assessing a chapter index for a book aimed at
software engineers (3+ years experience) who work with AI coding agents.

For each chapter below, assess: how easily could the target reader learn this
material to equivalent depth from freely available published resources? Consider
official documentation, textbooks, tutorials, conference talks, and blog posts.

Rate each chapter:

- **WIDELY** - Multiple high-quality free resources cover this to equivalent depth
- **PARTIALLY** - Coverage exists but is fragmented, shallow, or scattered across many sources
- **SCARCE** - Little to no published material covers this at comparable depth

Do not conflate "this topic is frequently discussed" with "equivalent-depth
coverage exists." Surface-level blog posts do not count as equivalent depth.

---

## Chapter Index

### Part I: Linux Substrate

- I.1 (6,799w) The Unix Process Model - File descriptors, pipes, and signals; the kernel primitives that everything else composes on.
- I.2 (9,393w) The Shell Language - POSIX sh then bash: quoting, expansion, control flow, error handling.
- I.3 (7,537w) The Filesystem as State - Paths, permissions, inodes, /proc, /sys; the agent's working memory is the filesystem.
- I.4 (8,401w) The Text Processing Pipeline - jq, grep, awk, sed, yq and composable text stream tools.
- I.5 (5,518w) Python as a CLI Tool - stdin/stdout, exit codes, argparse, subprocess, uv.
- I.6 (6,932w) Make and Just as Orchestrators - DAG execution and recipe running for deterministic pipelines.
- I.7 (6,960w) Git Internals - Git's object model so every agent git operation can be verified at the plumbing level.
- I.8 (7,162w) Process Observation - strace, ltrace, lsof, ss for observing what a process actually does.
- I.9 (10,096w) Container Internals - Namespaces, cgroups, OverlayFS; a container is a process with three kernel restrictions.
- I.10 (7,832w) Networking from the CLI - curl, openssl, dig, tcpdump, iptables.
- I.11 (9,623w) Process Supervision - systemd, cron, supervisord for long-running agent processes.
- I.12 (10,797w) Advanced Bash - trap, coprocesses, associative arrays, BASH_REMATCH, production shell patterns.

### Part II: Agentic Engineering Practices

- II.1 (11,395w) How LLMs Actually Work - Transformer architecture, tokenisation, context windows, autoregressive generation; operational consequences of the math.
- II.2 (6,921w) Agent Architecture Patterns - Workflows vs agents, five Anthropic patterns, single vs multi-agent, the simplicity principle.
- II.3 (8,986w) Prompt Engineering as System Design - System prompts as specifications, structured output, few-shot patterns.
- II.4 (11,757w) Context Engineering - Working set theory (Denning 1968 applied to LLMs), cold/hot pressure, compaction loss, the dumb zone.
- II.5 (9,916w) Tool Design and Agent-Computer Interfaces - ACI design, poka-yoke for tools, MCP, tool result injection.
- II.6 (13,427w) Verification and Quality for Probabilistic Systems - The oracle problem, quality gates, Swiss Cheese Model, five named test anti-patterns.
- II.7 (13,027w) The Human-AI Interface - 13-layer operational model (L0-L12), sycophantic drift vs hallucination, anti-pattern taxonomy, seven named HCI failure modes with detection heuristics.
- II.8 (5,724w) Multi-Model Verification - N-version programming for LLMs, convergence/divergence analysis, the monoculture problem.
- II.9 (11,231w) Failure Modes and Recovery - Seven HCI failure modes in operational depth, cognitive deskilling (Bainbridge 1983), checkpoint recovery, governance recursion.
- II.10 (10,459w) Governance and Enterprise Integration - Engineering loop, atomic changes, human-in/out-the-loop spectrum, bearing checks, pull-based review.
- II.11 (9,256w) Cost, Security, Legal, and Compliance - Token economics, sandbox design, prompt injection, credential management, IP ownership, audit trails.

### Part III: Operational Analytics

- III.1 (6,694w) Tabular Data with pandas and DuckDB - DataFrames, column operations, groupby, joins, reshaping.
- III.2 (4,830w) Descriptive Statistics - Central tendency, spread, percentiles, distribution shape, correlation.
- III.3 (5,333w) SQL Analytics with DuckDB - CTEs, window functions, self-joins, pivoting, date/time operations.
- III.4 (6,803w) Statistical Testing for Practitioners - t-tests, Mann-Whitney, chi-squared, effect size, multiple comparisons.
- III.5 (5,930w) Time Series Basics - Moving averages, trend detection, seasonality, anomaly detection, change points.
- III.6 (6,782w) Visualisation for Decision-Making - matplotlib, chart selection, multi-panel figures, heatmaps, annotations.
- III.7 (5,145w) Log Analysis Patterns - Log parsing, session reconstruction, error rate computation, latency analysis.
- III.8 (5,798w) Cost Modelling for API-Based Systems - Token economics, cost per task, trend analysis, marginal cost, budget forecasting.
- III.9 (6,023w) Text Analysis Basics - String similarity, TF-IDF, embedding-based similarity, simple classification, diffing.
- III.10 (4,368w) Notebook-Based Analysis Workflows - Notebook organisation, reproducibility, exploration-to-script pipeline.

### Part IV: Evaluation and Adversarial Testing

- IV.1 (12,237w) What Evaluations Actually Measure - Construct validity, content contamination, saturation, Goodhart's law; the epistemology of evals.
- IV.2 (10,287w) Designing Eval Datasets - Success criteria, edge cases, synthetic data, held-out test sets, dataset versioning.
- IV.3 (9,214w) Scoring and Grading Methods - Code-based grading, LLM-as-judge, human grading, rubric design, grader calibration.
- IV.4 (11,302w) Evaluating Agents and Workflows - Task-based evaluation, trajectory analysis, Inspect AI, sandboxed execution, tool use accuracy.
- IV.5 (6,342w) Eval Infrastructure and Automation - Eval-driven development, evals in CI/CD, regression testing, eval cost budgeting.
- IV.6 (13,851w) Adversarial Testing Methodology - Structured adversarial testing, prompt injection testing, multi-model review, anti-pattern detection.
- IV.7 (10,634w) Red Teaming for Safety-Critical Capabilities - Safety evaluation, sabotage modalities, alignment faking, deception detection, responsible disclosure.
- IV.8 (6,448w) Interpreting and Communicating Eval Results - Confidence intervals, honest model comparison, eval limitations, avoiding eval theatre.
- IV.9 (10,260w) Building an Eval Culture - Eval review, ownership, roadmaps, sharing, continuous evaluation in production.

### Part V: Agent Infrastructure in Practice

- V.1 (11,373w) The Retrieval Problem - Why agents need external knowledge, the naive RAG pipeline, where it breaks, retrieval quality metrics.
- V.2 (11,006w) Embeddings and Vector Search - Dense vector representations, similarity metrics, vector databases, indexing strategies.
- V.3 (8,335w) Embeddings and Vector Search - Chunking strategies, query processing, context assembly, citation, RAG evaluation.
- V.4 (10,976w) Advanced Retrieval Patterns - Hybrid search, reranking, agentic RAG, GraphRAG, code retrieval.
- V.5 (12,984w) State Management for Agents - Stateless to stateful spectrum, filesystem as state, state backends, schema design, concurrency.
- V.6 (6,917w) Conversation Memory and Session Persistence - Memory patterns (full, sliding window, summary, entity, retrieval-augmented), selective forgetting.
- V.7 (11,773w) Agent Observability and Tracing - Traces, spans, structured logging, OpenTelemetry for LLM, custom tracing, alert fatigue.
- V.8 (13,197w) Debugging Agent Systems - Replay debugging, failure classification, diagnosis by layer, common patterns, post-mortems.
- V.9 (11,405w) Production Patterns - Rate limiting, fallback chains, scaling, deployment patterns, cost controls, reliability.

---

## Output Format

Respond in YAML only. No commentary outside the YAML block.

```yaml
reviewer: "<model name and version>"

availability:
  I.1: { rating: "WIDELY|PARTIALLY|SCARCE", reason: "<1 sentence>" }
  I.2: { rating: "...", reason: "..." }
  # all 51 chapters
```
