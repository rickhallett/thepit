# Agent-Native Engineering Bootcamp

**Date:** 2026-03-10
**Author:** Operator + Weaver
**Provenance:** Derived from `docs/research/agent-native-software-taxonomy.md` analysis
**Status:** ACTIVE - learning materials under construction

---

## What This Is

A structured self-study programme to make a competent software engineer into a competent
agentic engineer - someone who can develop, test, validate, and govern agent-native software.

This is not a tutorial collection. It is a first-principles curriculum where each step
composes into the next, ordered by the dependency graph of the underlying systems. The
subject matter (Linux, bash, Python, make) is also the execution stack - every concept
can be tested immediately in the environment where it will be used.

## Why This Exists

The agent-native software taxonomy (`docs/research/agent-native-software-taxonomy.md`)
established that 75% of software categories reduce to CLI/API operations. The composition
advantage - pipes, text streams, composable primitives - is the architectural foundation
of agent-native computing. But composition requires understanding the primitives.

The Operator's role in the agentic model is not implementation - it is steering and
verification (L12 in the layer model). When an agent constructs a pipeline that silently
drops data, or generates shell with a quoting bug invisible at the surface level, or
claims a process is running when it is not - the Operator must be able to diagnose.
Ignorance at the foundation creates oracle problems that propagate through every
verification layer.

The goal: deep enough understanding of the substrate that no agent output at the
system level is opaque. Not memorisation - mental models that compose.

## The Dependency Graph

```
Step 1: Process model (fork/exec/fd/pipe/signal)
├── Step 2: Shell language (composes processes)
│   ├── Step 4: Text pipeline (grep/sed/awk/jq)
│   ├── Step 6: Make/Just (orchestrates shell recipes)
│   └── Step 5: Python CLI tools (when shell hits its ceiling)
├── Step 3: Filesystem as state (paths, permissions, /proc, /sys)
│   └── Step 7: Git internals (versioned filesystem)
├── Step 8: Process observation (strace/lsof/ss)
│   └── Step 9: Container internals (namespaced processes)
├── Step 10: Networking (curl/openssl/dig/tcpdump)
├── Step 11: Process supervision (systemd/cron/supervisord)
└── Step 12: Advanced bash (trap, coprocesses, BASH_REMATCH)
```

## The Steps

### Tier 1 - Foundational (everything else depends on these)

| Step | Topic | Est. Time | File |
|------|-------|-----------|------|
| 1 | Process model, file descriptors, pipes, signals | 4-6h | [01-process-model.md](01-process-model.md) |
| 2 | Shell as a programming language (POSIX then bash) | 8-12h | [02-shell-language.md](02-shell-language.md) |
| 3 | The filesystem as state | 4-6h | [03-filesystem-as-state.md](03-filesystem-as-state.md) |

### Tier 2 - Composition Layer (tools that compose via Tier 1 primitives)

| Step | Topic | Est. Time | File |
|------|-------|-----------|------|
| 4 | Text processing pipeline (jq/grep/awk/sed/yq) | 6-8h | [04-text-pipeline.md](04-text-pipeline.md) |
| 5 | Python as a CLI tool | 4h | [05-python-cli-tools.md](05-python-cli-tools.md) |
| 6 | Make/Just as orchestrators | 4-5h | [06-make-just-orchestration.md](06-make-just-orchestration.md) |

### Tier 3 - Verification and Observation

| Step | Topic | Est. Time | File |
|------|-------|-----------|------|
| 7 | Git internals (beyond porcelain) | 4h | [07-git-internals.md](07-git-internals.md) |
| 8 | Process observation (strace/lsof/ss) | 3h | [08-process-observation.md](08-process-observation.md) |
| 9 | Container internals (namespaces/cgroups/overlayfs) | 4h | [09-container-internals.md](09-container-internals.md) |

### Tier 4 - Advanced (learn when needed)

| Step | Topic | Est. Time | File |
|------|-------|-----------|------|
| 10 | Networking from the CLI | 4h | [10-networking-cli.md](10-networking-cli.md) |
| 11 | Process supervision (systemd/cron) | 3h | [11-process-supervision.md](11-process-supervision.md) |
| 12 | Advanced bash | 3h | [12-advanced-bash.md](12-advanced-bash.md) |

**Total estimated time: 51-65 hours (~1.5 weeks focused study)**

## Pedagogical Approach

- **Interactive challenges** - every concept has a hands-on exercise runnable in the same
  environment (bash, Python, make, Linux). The subject IS the execution stack.
- **Historical artefacts** - where a concept has a memorable origin story (Thompson, McIlroy,
  Ritchie, Torvalds), include it. Stories create memory anchors.
- **Metaphors** - where established and appropriate. Not decoration - structural analogies
  that aid the mental model.
- **Agentic grounding** - every section explicitly connects to what it equips the learner
  to do in an agentic engineering context. "Why does this matter when agents write code?"
  is answered for every topic.
- **Jupyter notebooks** - at suitable junctures (Python CLI, text pipeline, data processing)
  for tool literacy and interactive exploration.
- **No bland tutorials** - this is specifically aimed at making an SWE a competent agentic
  engineer. Every example, challenge, and explanation is grounded in the development,
  testing, validation, and governance of agent-native software.

## Conventions

- 2 spaces indentation in code blocks
- Challenges marked with `## Challenge:` headers
- Agentic context marked with `> AGENTIC GROUNDING:` blockquotes
- Historical notes marked with `> HISTORY:` blockquotes
- All code examples runnable on Arch Linux / Debian / Ubuntu
- No emojis, no em-dashes

---

## Bootcamp III: Operational Analytics for Agentic Engineering

**Prerequisites:** Bootcamp I (Steps 1-5 especially), Bootcamp II (agentic practices)
**Status:** ACTIVE - learning materials under construction
**Total estimated time: 32-40 hours**

The 20% of data science that does 80% of the heavy lifting for agentic engineers.
Agents generate structured data (YAML metrics, TSV logs, review findings, cost records).
This bootcamp teaches the analytical skills to turn that data into operational decisions.

### Dependency Graph

```
Step 1: Tabular data (pandas, DuckDB)
├── Step 2: Descriptive statistics
│   ├── Step 4: Statistical testing
│   └── Step 5: Time series basics
├── Step 3: SQL analytics (DuckDB)
│   └── Step 5: Time series basics
├── Step 6: Visualization
├── Step 7: Log analysis patterns
└── Step 8: Cost modeling

Step 9: Text analysis basics (independent, can start after Step 1)
Step 10: Notebook workflows (independent, can start any time)
```

### Tier 1 - Foundations (everything else depends on these)

| Step | Topic | Est. Time | File |
|------|-------|-----------|------|
| 1 | Tabular data with pandas and DuckDB | 4-5h | [bootcamp3-01-tabular-data.md](bootcamp3-01-tabular-data.md) |
| 2 | Descriptive statistics | 3-4h | [bootcamp3-02-descriptive-stats.md](bootcamp3-02-descriptive-stats.md) |
| 3 | SQL analytics with DuckDB | 4-5h | [bootcamp3-03-sql-analytics.md](bootcamp3-03-sql-analytics.md) |

### Tier 2 - Core Analysis (skills that answer operational questions)

| Step | Topic | Est. Time | File |
|------|-------|-----------|------|
| 4 | Statistical testing for practitioners | 3-4h | [bootcamp3-04-statistical-testing.md](bootcamp3-04-statistical-testing.md) |
| 5 | Time series basics | 3-4h | [bootcamp3-05-time-series.md](bootcamp3-05-time-series.md) |
| 6 | Visualization for decision-making | 4-5h | [bootcamp3-06-visualization.md](bootcamp3-06-visualization.md) |

### Tier 3 - Applied (domain-specific agentic analytics)

| Step | Topic | Est. Time | File |
|------|-------|-----------|------|
| 7 | Log analysis patterns | 3-4h | [bootcamp3-07-log-analysis.md](bootcamp3-07-log-analysis.md) |
| 8 | Cost modeling for API-based systems | 3-4h | [bootcamp3-08-cost-modeling.md](bootcamp3-08-cost-modeling.md) |
| 9 | Text analysis basics | 3-4h | [bootcamp3-09-text-analysis.md](bootcamp3-09-text-analysis.md) |
| 10 | Notebook-based analysis workflows | 2-3h | [bootcamp3-10-notebook-workflows.md](bootcamp3-10-notebook-workflows.md) |

### Tool Stack

| Tool | Role | Install |
|------|------|---------|
| pandas | Tabular data manipulation | `uv pip install pandas` |
| DuckDB | SQL analytics on local files | `uv pip install duckdb` |
| matplotlib | Plotting and visualization | `uv pip install matplotlib` |
| seaborn | Statistical visualization | `uv pip install seaborn` |
| scipy | Statistical tests | `uv pip install scipy` |
| scikit-learn | TF-IDF, simple classification | `uv pip install scikit-learn` |
| jupyter | Notebook environment | `uv pip install jupyter` |
| statsmodels | Time series decomposition | `uv pip install statsmodels` |

### Sequencing Recommendation

**Week 1 (12-14h):** Steps 1, 2, 3 - tabular data, descriptive stats, SQL analytics.
These unlock all downstream steps and are immediately useful.

**Week 2 (10-13h):** Steps 6, 7, 10 - visualization, log analysis, notebooks. Daily-use
skills that compound with Steps 1-3.

**Week 3 (9-12h):** Steps 4, 5, 8 - statistical testing, time series, cost modeling.
Analytical depth that turns data reading into data reasoning.

**As needed:** Step 9 - text analysis. Most useful when working on finding matching,
output comparison, or content quality signals.

### Cross-references to Bootcamp I

- Bootcamp I Step 4 (text pipeline) -> Bootcamp III Step 7 (log analysis patterns)
- Bootcamp I Step 5 (Python CLI) -> Bootcamp III Step 1 (tabular data)
- Bootcamp I Step 5.10 (Jupyter) -> Bootcamp III Step 10 (notebook workflows)

---

## Provenance

Ranking criteria from the taxonomy review:
1. **Compositional leverage** - does this knowledge compose into everything above it?
2. **Return per hour** - how much capability per unit of learning time?
3. **Irreplaceability** - can an agent compensate for ignorance, or must the Operator know?

The third criterion is the differentiator. In the Operator model, you steer and verify.
Where ignorance creates oracle problems (L12 errors propagating because no verification
layer can catch them), that knowledge is irreplaceable and ranks highest.
