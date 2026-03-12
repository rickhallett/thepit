# Ebook Inclusion Ranking Worksheet

51 chapters, 456k words. Rank each chapter for inclusion in the abridged edition.
Dependencies (DAG) shown per chapter - do not include a chapter without its deps.

Rank key: A = must include, B = strong include, C = include if space, X = cut


## Part I: Linux Substrate

| Rank | Step | Words | Deps | Title | Description |
|------|------|------:|------|-------|-------------|
| | I.1 | 6,799 | none | The Unix Process Model | File descriptors, pipes, and signals. The kernel primitives that everything else composes on. |
| | I.2 | 9,393 | I.1 | The Shell Language | POSIX sh then bash. Quoting, expansion, control flow, error handling. The glue that composes processes. |
| | I.3 | 7,537 | I.1 | The Filesystem as State | Paths, permissions, inodes, /proc, /sys - the agent's working memory is the filesystem. |
| | I.4 | 8,401 | I.2 | The Text Processing Pipeline - grep, sed, awk, jq, yq | The tools that transform text streams: jq, grep, awk, sed, yq, and the supporting cast that make Unix pipelines practical. |
| | I.5 | 5,518 | I.2 | Python as a CLI Tool - The Escape Hatch from Shell Complexity | The escape hatch from shell complexity. stdin/stdout, exit codes, argparse, subprocess, uv. |
| | I.6 | 6,932 | I.2 | Make and Just as Orchestrators | DAG execution and recipe running - how shell recipes become deterministic pipelines. |
| | I.7 | 6,960 | I.3 | Git Internals - Beyond Porcelain Commands | Git's object model made transparent so every agent git operation can be verified at the object level, not just the porcelain level. |
| | I.8 | 7,162 | I.1 | Process Observation - strace, ltrace, lsof, ss | The Operator's instruments for observing what a process actually does at the syscall, file descriptor, and network level. |
| | I.9 | 10,096 | I.8 | Container Internals - Namespaces, Cgroups, and OverlayFS | A container is a process with three kernel restrictions. Namespaces restrict visibility, cgroups restrict resources, and OverlayFS controls the filesystem. |
| | I.10 | 7,832 | I.1 | Networking from the CLI - curl, openssl, dig, tcpdump, iptables | Every agent operates over a network. These tools let you inspect every layer of the stack from the command line. |
| | I.11 | 9,623 | I.1 | Process Supervision - systemd, cron, and supervisord | Keeping long-running agent processes alive with systemd, cron, and supervisord. |
| | I.12 | 10,797 | I.1 | Advanced Bash - trap, coprocesses, associative arrays, BASH_REMATCH, and production patterns | Signal traps, indexed and associative arrays, regex matching, coprocesses, process substitution, production-grade shell scripting patterns, and shellcheck. |

## Part II: Agentic Engineering Practices

| Rank | Step | Words | Deps | Title | Description |
|------|------|------:|------|-------|-------------|
| | II.1 | 11,395 | none | How LLMs Actually Work | Transformer architecture, tokenisation, context windows, autoregressive generation. The operational consequences of the math. |
| | II.2 | 6,921 | II.1 | Agent Architecture Patterns | Workflows vs agents. The five patterns from Anthropic's guidance. Single-agent vs multi-agent. The simplicity principle. |
| | II.3 | 8,986 | II.1 | Prompt Engineering as System Design | System prompts as specifications. Structured output. Few-shot patterns. The AGENTS.md pattern. |
| | II.4 | 11,757 | II.1, II.3 | Context Engineering | The working set, cold and hot pressure, compaction loss, the dumb zone. The novel discipline. |
| | II.5 | 9,916 | II.2, II.3 | Tool Design and Agent-Computer Interfaces | ACI design, poka-yoke for tools, MCP, tool result injection. The agent's empirical contact with reality. |
| | II.6 | 13,427 | II.1, II.2, II.3, II.4 | Verification and Quality for Probabilistic Systems | The oracle problem, the quality gate, the Swiss Cheese Model. Five named test anti-patterns. |
| | II.7 | 13,027 | II.1, II.4, II.6 | The Human-AI Interface | The layer model (L0-L12), sycophantic drift, the slopodar, seven HCI foot guns. |
| | II.8 | 5,724 | II.1, II.6, II.7 | Multi-Model Verification Strategies | N-version programming for LLMs. Convergence, divergence, triangulation. The monoculture problem. |
| | II.9 | 11,231 | II.4, II.6, II.7 | Failure Modes and Recovery | Seven HCI foot guns in operational depth. Cognitive deskilling. Checkpoint recovery. Governance recursion. |
| | II.10 | 10,459 | II.2, II.5, II.6, II.7 | Governance, Process, and Enterprise Integration | The engineering loop. Atomic changes. HOTL/HODL spectrum. Bearing checks. Pull-based review. |
| | II.11 | 9,256 | II.2, II.5 | Cost, Security, Legal, and Compliance | Token economics, sandbox design, prompt injection, credential management. IP ownership and audit trails. |

## Part III: Operational Analytics

| Rank | Step | Words | Deps | Title | Description |
|------|------|------:|------|-------|-------------|
| | III.1 | 6,694 | none | Tabular Data with pandas and DuckDB | DataFrames, column operations, groupby, joins, reshaping. The foundation for all analysis. |
| | III.2 | 4,830 | III.1 | Descriptive Statistics | Central tendency, spread, percentiles, distribution shape, correlation. Describing what you have before claiming anything. |
| | III.3 | 5,333 | III.1 | SQL Analytics with DuckDB | CTEs, window functions, self-joins, pivoting, date/time operations. Analytical SQL for agent data. |
| | III.4 | 6,803 | III.2 | Statistical Testing for Practitioners | t-tests, Mann-Whitney, chi-squared, effect size, multiple comparisons. Is the change real or noise? |
| | III.5 | 5,930 | III.2, III.3 | Time Series Basics | Moving averages, trend detection, seasonality, anomaly detection, change points. Agent metrics over time. |
| | III.6 | 6,782 | III.1, III.2 | Visualisation for Decision-Making | matplotlib, the right chart for the question, multi-panel figures, heatmaps, annotations. |
| | III.7 | 5,145 | III.1 | Log Analysis Patterns | Log parsing, session reconstruction, error rate computation, latency analysis, JSONL in DuckDB. |
| | III.8 | 5,798 | III.1, III.5 | Cost Modelling for API-Based Systems | Token economics, cost per task, trend analysis, marginal cost, budget forecasting. |
| | III.9 | 6,023 | III.1 | Text Analysis Basics | String similarity, TF-IDF, embedding-based similarity, simple classification, diffing. |
| | III.10 | 4,368 | III.1 | Notebook-Based Analysis Workflows | Notebook organisation, reproducibility, the exploration-to-script pipeline, analysis templates. |

## Part IV: Evaluation and Adversarial Testing

| Rank | Step | Words | Deps | Title | Description |
|------|------|------:|------|-------|-------------|
| | IV.1 | 12,237 | none | What Evaluations Actually Measure | Construct validity, content contamination, saturation, Goodhart's law. The epistemology of evals. |
| | IV.2 | 10,287 | IV.1 | Designing Eval Datasets and Success Criteria | Success criteria, edge cases, synthetic data, held-out test sets, dataset versioning. |
| | IV.3 | 9,214 | IV.1, IV.2 | Scoring and Grading Methods | Code-based grading, LLM-as-judge, human grading. Rubric design, grader calibration. |
| | IV.4 | 11,302 | IV.2 | Evaluating Agents and Workflows | Task-based evaluation, trajectory analysis, Inspect AI, sandboxed execution, tool use accuracy. |
| | IV.5 | 6,342 | IV.3 | Eval Infrastructure and Automation | Eval-driven development, evals in CI/CD, regression testing, eval cost budgeting. |
| | IV.6 | 13,851 | IV.3 | Adversarial Testing Methodology | Structured adversarial testing, prompt injection, multi-model review, anti-pattern detection. |
| | IV.7 | 10,634 | IV.1 | Red Teaming for Safety-Critical Capabilities | Safety evaluation, sabotage modalities, alignment faking, deception detection, responsible disclosure. |
| | IV.8 | 6,448 | IV.1 | Interpreting and Communicating Eval Results | Confidence intervals, honest model comparison, eval limitations, avoiding eval theatre. |
| | IV.9 | 10,260 | IV.1 | Building an Eval Culture | Eval review, ownership, roadmaps, sharing, continuous evaluation in production. |

## Part V: Agent Infrastructure in Practice

| Rank | Step | Words | Deps | Title | Description |
|------|------|------:|------|-------|-------------|
| | V.1 | 11,373 | none | The Retrieval Problem | Why agents need external knowledge. The naive RAG pipeline. Where it breaks. Retrieval quality metrics. |
| | V.2 | 11,006 | V.1 | Embeddings and Vector Search | Dense vector representations, similarity metrics, vector databases, indexing strategies. |
| | V.3 | 8,335 | V.1, V.2 | RAG Pipeline Engineering | Chunking strategies, query processing, context assembly, citation, RAG evaluation. |
| | V.4 | 10,976 | V.3 | Advanced Retrieval Patterns | Hybrid search, reranking, agentic RAG, GraphRAG, code retrieval, index maintenance. |
| | V.5 | 12,984 | V.1 | State Management for Agents | Stateless to stateful. Filesystem as state. State backends. Schema design. Concurrency. |
| | V.6 | 6,917 | V.2, V.5 | Conversation Memory and Session Persistence | Memory patterns (full, sliding window, summary, entity, retrieval-augmented). Selective forgetting. |
| | V.7 | 11,773 | V.1 | Agent Observability and Tracing | Traces, spans, structured logging. OpenTelemetry for LLM. Custom tracing. Alert fatigue. |
| | V.8 | 13,197 | V.5, V.7 | Debugging Agent Systems | Replay debugging, failure classification, diagnosis by layer, common patterns, post-mortems. |
| | V.9 | 11,405 | V.1, V.2, V.3, V.4, V.5, V.6, V.7, V.8 | Production Patterns | Rate limiting, fallback chains, scaling, deployment patterns, cost controls, reliability. |

## Summary

| Part | Chapters | Words | Included | Cut |
|------|----------|------:|----------|-----|
| I: Linux Substrate | 12 | 97,050 | | |
| II: Agentic Engineering Practices | 11 | 112,099 | | |
| III: Operational Analytics | 10 | 57,706 | | |
| IV: Evaluation and Adversarial Testing | 9 | 90,575 | | |
| V: Agent Infrastructure in Practice | 9 | 97,966 | | |
| **Total** | **51** | **455,396** | | |

