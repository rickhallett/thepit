# Task 13: Write - Step 7: Agent Observability and Tracing

**Type:** Write
**Depends on:** Tasks 01 (format), 02 (internal refs), 05 (external refs for Steps 7-8)
**Parallelizable with:** Tasks 10-12 (different tiers, independent)
**Output:** `docs/bootcamp/step07-observability-tracing.md`

---

## Objective

Write the full Step 7 content: "Agent Observability and Tracing." This is EMERGING -
tooling exists but conventions are still forming. This step's unique advantage is pitkeel
as a worked example of custom observability, and the project's structured logging
(events.yaml, catch-log.tsv) as examples of what to observe and how to record it.

Estimated target: 35-50k characters (~1000-1400 lines).

## Prime Context (load before writing)

1. `docs/bootcamp/tasks-v/01-research-format/findings.md` - format template
2. `docs/bootcamp/tasks-v/02-research-internal-refs/findings.md` - internal concepts (pitkeel, events.yaml, catch-log)
3. `docs/bootcamp/tasks-v/05-research-observability-external/findings.md` - external references
4. `docs/bootcamp/BOOTCAMP-V-OUTLINE.md` lines 506-563 - the Step 7 outline
5. Bootcamp I Step 8 reference: `docs/bootcamp/08-process-observation.md` (first 200 lines
   for cross-reference)

## Content Structure

### Mandatory Sections

1. **Why This is Step 7** - Frame: when an agent fails silently, produces subtly wrong
   output, or takes 50 steps instead of 5, you need to see what happened. Traditional
   APM tracks latency and errors. Agent observability tracks decisions, tool calls,
   reasoning chains, and context state. This step bridges Bootcamp I Step 8 (process
   observation with strace/top/lsof) to agent-level observability.

2. **Why agent observability is different** - Agents make decisions, and decisions need
   to be explainable after the fact. The trace is to agent debugging what the stack trace
   is to traditional debugging. Key differences from traditional APM:
   - Non-deterministic outputs (same input, different output)
   - Multi-step reasoning (a single "request" may be 20 LLM calls)
   - Tool interactions (each tool call is a side effect)
   - Context state evolution (context changes with every step)

3. **The trace** - A structured record of an agent's execution path:
   - Each step records: input to model, model output, tool calls, tool results, next action
   - Trace structure: spans (like OpenTelemetry), steps, parent-child relationships
   - What a good trace captures: enough to replay the agent's decision-making
   - What a bad trace misses: token counts, latency per step, context window utilisation

4. **Tracing frameworks** - Landscape assessment (from Task 05 research):
   - OpenTelemetry for LLM (emerging standard, current state)
   - LangSmith (LangChain's platform): capabilities, coupling to LangChain
   - Braintrust (eval + observability): connection to Bootcamp IV
   - Arize Phoenix (open-source): lightweight, suitable for exercises
   - Inspect AI tracing: log viewer, connection to Bootcamp IV eval framework
   - Assessment: what is mature enough to recommend vs what is still forming

5. **Custom tracing** - When frameworks are overkill:
   - Structured logging with JSONL (JSON Lines)
   - Schema: session_id, step, action, input_tokens, output_tokens, latency_ms,
     tool_calls, error, timestamp
   - Queryable with DuckDB (Bootcamp III Step 3 cross-reference)
   - When custom tracing is the right choice: small teams, specific needs,
     framework lock-in avoidance

6. **The pitkeel model** - This project's bespoke observability tool as a case study:
   - What it tracks: session duration, scope drift, velocity, context depth, wellness
   - How it stores and queries state
   - Not standard observability - a specialised instrument for the human-AI interface
   - When to build custom vs use standard tooling: custom when the problem is
     domain-specific, standard when the problem is generic

7. **Metrics that matter** - What to measure for agent systems:
   - Task success rate (did the agent complete the task correctly?)
   - Steps to completion (efficiency)
   - Tool use accuracy (did the agent use the right tools?)
   - Token efficiency (tokens spent per successful task)
   - Error recovery rate (did the agent recover from tool errors?)
   - Latency distribution (p50, p95, p99 per step and end-to-end)
   - Connection to Bootcamp III (descriptive stats, time series, visualisation)

8. **Alerting** - When should the system notify a human?
   - Token budget exceeded
   - Error rate spike
   - Agent stuck in a loop (same tool called 3+ times with same parameters)
   - Unexpected tool call pattern
   - Alert fatigue (naturalist's tax from project vocabulary): too many alerts
     degrades response quality. Design alerts for actionability, not coverage.

### Project Vocabulary Integration

- **Alert fatigue / naturalist's tax** - observation exceeding processing capacity
- **Phantom ledger** (slopodar) - audit trail doesn't match actual operation
- **events.yaml** as event log spine
- **catch-log.tsv** as control firing events
- **pitkeel** as worked observability example

### Exercises

- **Custom tracing** (medium-hard) - Implement JSONL tracing for a 5-step agent. Log
  each step with full schema. After 20 runs, load into DuckDB. Query: average steps
  to completion, p95 latency, most common tool.

- **Framework comparison** (medium) - Compare custom JSONL tracing vs Arize Phoenix
  (or LangSmith if available). What does the framework give that custom doesn't?

- **Loop detection alert** (medium) - Build an alert for "stuck in loop" pattern.
  Test with deliberately buggy agent that calls same tool repeatedly.

## Quality Constraints

- No emojis, no em-dashes
- 2 spaces indentation in code blocks
- Build on Bootcamp I Step 8 (process observation) - reference the progression
  from OS-level observation to agent-level observation
- Honest about framework maturity - mark what is stable vs what will change
- pitkeel presented as a case study of "build what you need", not as a recommendation
- Code examples: JSONL logging, DuckDB queries, basic alerting logic
