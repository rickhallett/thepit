# Task 05: Research - External References for Observability (Steps 7-8)

**Type:** Research (read-only, web fetch)
**Parallelizable with:** Tasks 01, 02, 03, 04, 06
**Blocks:** Tasks 13, 14 (write tasks for Steps 7-8)
**Output:** `docs/bootcamp/tasks-v/05-research-observability-external/findings.md`

---

## Objective

Research and verify external references cited in Steps 7-8 of the Bootcamp V outline.
Step 7 is EMERGING; Step 8 is EMERGING/FRONTIER. Agent observability tooling is evolving
rapidly. This research needs to capture the current (March 2026) landscape of tracing
frameworks, debugging tools, and established practices.

## Step 7 References: Agent Observability and Tracing

**Field maturity: EMERGING**

1. **OpenTelemetry for LLM:**
   - Verify current state of OpenTelemetry LLM semantic conventions
   - Is there a stable spec? (As of late 2024, it was in development)
   - Key instrumentation patterns for LLM calls (spans, attributes)
   - OpenTelemetry Python SDK current version and LLM support

2. **LangSmith (LangChain's observability platform):**
   - Verify current URL, pricing model
   - Extract: what it tracks (traces, latency, token counts, feedback)
   - Key abstractions, how traces are structured
   - Limitations: LangChain-specific or general-purpose?

3. **Braintrust:**
   - Verify current URL, current capabilities
   - Extract: eval + observability combination (relevant to Bootcamp IV connection)
   - How it differs from LangSmith

4. **Arize Phoenix (open-source):**
   - Verify GitHub repo, current state
   - Extract: key features for agent tracing
   - Installation complexity, dependencies
   - Suitable for bootcamp exercises? (lightweight enough to run locally?)

5. **Inspect AI tracing:**
   - Verify current state (UK AISI, previously Inspect)
   - Extract: trace/log viewer capabilities
   - How Inspect structures agent execution logs
   - The connection to Bootcamp IV (eval framework)

6. **DuckDB for log analysis:**
   - Already covered in Bootcamp III Step 3 - verify cross-reference
   - Extract: JSONL querying patterns relevant to agent trace analysis
   - Current DuckDB version and any new features for JSON/JSONL

7. **Traditional observability references:**
   - OpenTelemetry (standard, non-LLM) - as foundation
   - "The Three Pillars of Observability" (Charity Majors / Honeycomb) - logs, metrics, traces
   - How agent observability extends traditional observability
   - Structured logging best practices (JSONL, JSON Lines specification)

8. **General research:**
   - What is the current standard for agent observability (March 2026)?
   - Has OpenTelemetry for LLM stabilised?
   - Any new entrants in the agent observability space?
   - How do major providers (Anthropic, OpenAI) support observability natively?

## Step 8 References: Debugging Agent Systems

**Field maturity: EMERGING/FRONTIER**

1. **Inspect AI log viewer:**
   - Verify current capabilities for step-by-step replay
   - Extract: how to use it for post-mortem analysis of failed agent runs
   - Is it usable standalone (without running Inspect evals)?

2. **The "rerun don't fix" principle:**
   - This is internal (from standing orders) - verify the standing order text
   - Research: is there an established equivalent in SRE/DevOps literature?
   - "Immutable infrastructure" and "cattle not pets" as analogies

3. **Failure classification frameworks:**
   - Standard incident classification (SEV levels, impact/urgency matrices)
   - How to adapt for agent-specific failure types (model error, context error,
     tool error, environment error, orchestration error, state error)
   - Any published agent failure taxonomies?

4. **Replay debugging tools:**
   - What tools exist for replaying LLM agent traces (March 2026)?
   - Time-travel debugging analogy (rr debugger, Replay.io for web)
   - Is deterministic replay possible for agent systems? (Non-deterministic LLM
     output means exact replay is impossible - what can you approximate?)

5. **General research:**
   - How do teams debug agent systems in production (March 2026)?
   - What patterns have emerged for agent post-mortems?
   - Are there any standard "debugging agent" guides or runbooks?

## Output Format

For each reference:
```
### [Reference Name]
- **Status:** verified/not-found/moved/outdated
- **URL:** (current URL)
- **Key Extraction:** (2-5 bullet points of what's pedagogically useful)
- **Best Quote/Passage:** (if applicable)
- **Caveat:** (anything that has changed since the outline was written)
```

Group by step. Include a "Maturity Assessment" section: which tools/frameworks are
stable enough to teach as standard practice vs which should be presented as "current
best option, expect change."
