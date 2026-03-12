# Task 12: Write - Step 7: Log Analysis Patterns

**Type:** Write
**Parallelizable with:** Tasks 09, 10, 11, 13, 14, 15 (Tier 2/3 steps)
**Depends on:** Task 01 (format), Task 02 (data sources), Task 03 (pandas/DuckDB APIs)
**Output:** `docs/bootcamp/bootcamp3-07-log-analysis.md`

---

## Objective

Write the full instructional content for Bootcamp III Step 7: Log Analysis Patterns.
This is a Tier 3 applied step. It bridges Bootcamp I Step 4 (text pipelines with
grep/awk/jq) and the tabular analysis tools from Steps 1-3 to handle real agent logs.

## Prime Context

Load these files before writing:

- `docs/bootcamp/tasks/01-research-format/findings.md` - format template
- `docs/bootcamp/tasks/02-research-data-sources/findings.md` - real data schemas
- `docs/bootcamp/tasks/03-research-python-analytics/findings.md` - pandas/DuckDB APIs
- `docs/bootcamp/BOOTCAMP-III-OUTLINE.md` lines 540-610 - the outline for this step

## Content Specification

From the outline, this step covers 6 topics:

1. Log format parsing (regex, JSONL, key=value, timestamps)
2. Session reconstruction (group by session/trace ID)
3. Error rate computation (errors per window, trends, classification)
4. Latency analysis (percentiles, by endpoint/model/time)
5. Multi-line log records (stack traces, agent reasoning blocks)
6. Log aggregation in DuckDB (JSONL to SQL)

Plus 4 exercises and an agentic grounding section.

## Writing Requirements

### Structure

Follow the Bootcamp I format template. Title: `# Step 7: Log Analysis Patterns`

### Bridge Role

This step explicitly bridges Bootcamp I (grep, awk, jq) and Bootcamp III (pandas,
DuckDB). The `## Why This is Step 7` section should acknowledge:
- Bootcamp I Step 4 handles single-pass extraction
- This step covers patterns that require statefulness
- The escalation path: grep for quick checks, pandas for exploration, DuckDB for scale

### Simulated Data Required

The project's actual logs are small (catch-log.tsv has limited entries). For the
session reconstruction, latency analysis, and error rate topics, the step needs
simulated data. Include Python snippets that generate realistic:
- JSONL API log files (timestamp, model, tokens_in, tokens_out, latency_ms, status)
- Multi-agent session logs (session_id, agent_role, tool_call, outcome, duration)
- Error logs with various error types

These generators become exercise setup code.

### The Escalation Pattern

Each topic should show the same analysis at three scales:
1. Quick check: bash one-liner (grep + awk)
2. Exploration: pandas in a notebook
3. Repeatable: DuckDB SQL query

This reinforces when to use each tool.

### Code Examples

- Regex patterns for common log formats (ISO 8601 timestamps, JSONL, key=value)
- `pd.read_json(path, lines=True)` for JSONL loading
- `duckdb.sql("SELECT * FROM read_json_auto('log.jsonl')")` for DuckDB loading
- Session reconstruction: `df.groupby('session_id').agg(...)` pattern
- Latency percentiles: `df.groupby('endpoint')['latency'].quantile([.5, .95, .99])`

### Voice and Target Length

- Direct, technical, no filler, no emojis, no em-dashes
- 700-1000 lines. This is a 3-4 hour step with 6 topics.
- Operational framing: "your agents produced 50,000 log lines. Now what?"

## Quality Gate

- Data generator snippets must produce realistic, parseable output
- Regex patterns must be correct for the formats described
- The escalation pattern (bash -> pandas -> DuckDB) must appear in at least 3 topics
- Real project files (catch-log.tsv, events.yaml) must be used alongside simulated data
- No emojis, no em-dashes
