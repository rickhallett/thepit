# Task 05: Research Findings - External References for Observability (Steps 7-8)

**Researched:** 2026-03-10
**Agent:** Research agent (claude-opus-4-6)
**Status:** Complete

---

## Step 7 References: Agent Observability and Tracing

### OpenTelemetry GenAI Semantic Conventions
- **Status:** verified - active development, not yet stable
- **URL:** https://opentelemetry.io/docs/specs/semconv/gen-ai/
- **Spec version at time of research:** Semantic Conventions v1.40.0
- **Key Extraction:**
  - Status is explicitly "Development" (not stable). The spec includes separate conventions for GenAI model spans, agent spans, events, metrics, and provider-specific conventions (Anthropic, OpenAI, AWS Bedrock, Azure AI).
  - Agent-specific spans now exist (`gen-ai-agent-spans`), covering `create_agent` and `invoke_agent` operations with attributes for agent name, ID, version, and description.
  - Model spans track: `gen_ai.request.model`, `gen_ai.usage.input_tokens`, `gen_ai.usage.output_tokens`, `gen_ai.response.finish_reasons`, temperature, top_p, max_tokens, seed, and other request parameters.
  - Content capture (input/output messages, system instructions, tool definitions) is opt-in to avoid logging sensitive data by default.
  - MCP (Model Context Protocol) semantic conventions also exist as a separate section.
  - The transition plan: instrumentations using v1.36.0 or prior SHOULD NOT change defaults. New behavior requires opt-in via `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental`.
- **Best Quote/Passage:** "Existing GenAI instrumentations that are using v1.36.0 of this document (or prior) SHOULD NOT change the version of the GenAI conventions that they emit by default." - This signals the spec is still actively evolving and breaking changes are expected.
- **Caveat:** The GenAI conventions are NOT stable as of March 2026. They are in "Development" status, which means they can change without notice. Bootcamp material should teach the concepts (span structure, standard attributes) while warning that specific attribute names may shift before stabilization.

### OpenTelemetry Python SDK
- **Status:** verified - the core SDK is stable; GenAI instrumentation packages exist but are experimental
- **URL:** https://opentelemetry.io/docs/languages/python/
- **Key Extraction:**
  - The core `opentelemetry-api` and `opentelemetry-sdk` packages are stable and production-ready.
  - GenAI-specific instrumentation is provided through the OpenInference project (Arize) and through individual provider-specific packages.
  - For bootcamp purposes, the basic pattern is: create a tracer, create spans around LLM calls, attach attributes. This core pattern is stable even if the GenAI-specific attribute names are not.
  - Python SDK supports OTLP export, console export, and custom exporters.
- **Caveat:** The GenAI semantic conventions being in development means auto-instrumentation libraries for LLM calls may change their attribute naming. Teaching manual instrumentation (creating spans, adding attributes) is more durable than teaching specific auto-instrumentation packages.

### LangSmith (LangChain Observability)
- **Status:** verified - actively maintained, framework-agnostic positioning
- **URL:** https://docs.smith.langchain.com/
- **Key Extraction:**
  - LangSmith now positions itself as "framework-agnostic" - it works with OpenAI, Anthropic, CrewAI, Vercel AI SDK, Pydantic AI, and more, not just LangChain.
  - Three core pillars: Observability (tracing), Evaluation (measuring quality), Deployment (agent servers).
  - No credit card required for free tier. Self-hosted option available.
  - Integrations page lists many frameworks beyond LangChain.
  - Features: trace requests, evaluate outputs, test prompts, manage deployments. Includes prompt engineering tools with versioning.
  - HIPAA, SOC 2 Type 2, GDPR compliance mentioned.
- **Best Quote/Passage:** "LangSmith is a framework-agnostic platform for developing, debugging, and deploying AI agents and LLM applications."
- **Caveat:** Despite the "framework-agnostic" claim, LangSmith originated from LangChain and the integration is deepest there. The broader integrations are newer. For bootcamp purposes, it is a good example of a commercial observability platform, but students should understand the vendor lock-in consideration. The pivot to "framework-agnostic" is a significant change from the outline's assumption that it was "LangChain-specific."

### Braintrust
- **Status:** verified - actively maintained
- **URL:** https://www.braintrust.dev/docs
- **Key Extraction:**
  - Positions as "AI observability platform" for measuring, evaluating, and improving AI in production.
  - Workflow: Instrument -> Observe -> Annotate -> Evaluate -> Deploy.
  - Combines eval and observability in a single platform - relevant for connecting Bootcamp IV (eval) to Bootcamp V (observability).
  - "Compare models, iterate on prompts, catch regressions, and leverage real user data" - the production feedback loop.
  - Free tier available for getting started.
- **Best Quote/Passage:** The Instrument -> Observe -> Annotate -> Evaluate -> Deploy workflow is a clean pedagogical model for how observability feeds back into improvement.
- **Caveat:** Braintrust and LangSmith are competitors offering similar capabilities. The key differentiator for bootcamp purposes: Braintrust emphasizes the eval-to-observability connection more strongly, which maps well to the Bootcamp IV -> V progression.

### Arize Phoenix (Open-Source)
- **Status:** verified - actively maintained, 8.8k GitHub stars, 742 forks
- **URL:** https://github.com/Arize-ai/phoenix
- **Key Extraction:**
  - Open-source AI observability platform. Install via `pip install arize-phoenix`. Also available as Docker container and cloud-hosted (app.phoenix.arize.com).
  - Core features: Tracing (OpenTelemetry-based), Evaluation (LLM evals), Datasets, Experiments, Playground, Prompt Management.
  - Built on OpenTelemetry - uses OpenInference instrumentation for tracing. Vendor-agnostic with support for OpenAI, Anthropic, Google GenAI, AWS Bedrock, LangChain, LlamaIndex, DSPy, CrewAI, and more.
  - Runs locally, in Jupyter notebooks, containerized, or in cloud. This makes it suitable for bootcamp exercises.
  - Python and TypeScript sub-packages available. Includes MCP server implementation.
  - 7,861 commits, active development (as of research date).
  - License: appears to be open-source (LICENSE file present in repo root).
- **Best Quote/Passage:** "Phoenix is an open-source AI observability platform designed for experimentation, evaluation, and troubleshooting... Phoenix runs practically anywhere, including your local machine, a Jupyter notebook, a containerized deployment, or in the cloud."
- **Caveat:** Phoenix is the strongest candidate for bootcamp hands-on exercises because it is open-source, runs locally with `pip install`, and supports the OpenTelemetry standard. However, the API surface area is large and may require careful scoping for bootcamp exercises. The `arize-phoenix-otel` sub-package provides a lightweight wrapper for just the tracing component.

### Inspect AI Tracing and Log Viewer
- **Status:** verified - actively maintained by UK AI Security Institute
- **URL (main):** https://inspect.ai-safety-institute.org.uk/
- **URL (tracing):** https://inspect.ai-safety-institute.org.uk/tracing.html
- **URL (log viewer):** https://inspect.ai-safety-institute.org.uk/log-viewer.html
- **Key Extraction:**
  - Inspect includes a built-in runtime tracing tool. Trace logs are JSON Lines format, gzip compressed, automatically retained for last 10 evaluations.
  - Tracing captures: model generate() calls, subprocess execution, Docker Compose commands, remote storage writes, tool calls, and subtask spawns.
  - `inspect trace anomalies` command identifies running/cancelled/errored/timed-out actions - useful for diagnosing stuck evaluations.
  - `inspect trace http` shows all HTTP requests for a run (with `--failed` filter).
  - Custom tracing API: `trace_action()` (context manager for enter/exit of operations) and `trace_message()` (point-in-time events).
  - Log Viewer provides: message history display, scoring details, metadata tab, filtering by score, sorting by sample/epoch. Live view during evaluation runs.
  - "Inspect Scout" announced as companion tool for "in-depth analysis of AI agent transcripts" (https://meridianlabs-ai.github.io/inspect_scout/).
  - Log Viewer supports publishing: `inspect view bundle` creates static deployable site. Can publish to HuggingFace Spaces.
  - Log Dataframes: API for extracting dataframes from log files for programmatic analysis.
- **Best Quote/Passage:** "Trace logs also do explicit enter and exit logging around actions that may encounter errors or fail to complete... Action logging enables you to observe execution times, errors, and commands that hang and cause evaluation tasks to not terminate."
- **Caveat:** Inspect's tracing is evaluation-focused, not general-purpose agent observability. It is excellent for debugging eval runs but is not designed as a production monitoring system. For bootcamp, it provides the best "replay debugging" capability since traces capture the full message history. The connection to Bootcamp IV (eval framework) is direct - Inspect is the same tool. The new "Inspect Scout" tool for agent transcript analysis may be worth monitoring.

### DuckDB for Log Analysis
- **Status:** verified - stable, mature
- **URL:** https://duckdb.org/docs/stable/data/json/overview.html
- **Key Extraction:**
  - DuckDB's JSON extension is auto-loaded and ships with most distributions. Supports `read_json()` for loading JSON/JSONL files directly.
  - JSONPath and JSON Pointer syntax for extraction: `j->'$.field'` returns JSON, `j->>'$.field'` returns VARCHAR.
  - Can read JSONL directly: `SELECT * FROM 'traces.jsonl'` with auto-detection of schema.
  - `CREATE TABLE traces AS SELECT * FROM 'traces.jsonl'` for persistent analysis.
  - Supports `filename` virtual column (since v1.3.0) for multi-file analysis.
  - The pattern for bootcamp exercises: write agent traces as JSONL, load into DuckDB, query with SQL for aggregations (avg latency, p95 latency, tool call counts, failure rates).
- **Best Quote/Passage:** N/A - DuckDB is well-documented and straightforward.
- **Caveat:** Already covered in Bootcamp III Step 3. The cross-reference is valid. For Step 7, DuckDB is the analysis layer that sits on top of JSONL traces. The pedagogical point: tracing produces data, DuckDB (or similar) analyzes it. This is the same pattern as traditional observability (Prometheus collects, Grafana queries).

### Traditional Observability: Three Pillars / Honeycomb
- **Status:** verified - established concept
- **URL:** https://www.honeycomb.io/blog/observability-101-terminology-and-concepts (redirected to glossary)
- **URL (glossary):** https://www.honeycomb.io/resources/getting-started/observability-glossary
- **Key Extraction:**
  - Honeycomb defines observability as "gaining an understanding into the behavior and performance of applications and systems" through telemetry data: traces, logs, and metrics.
  - Key terms relevant to Step 7: structured events (wide events with many fields), cardinality (high-cardinality is essential for observability), telemetry, distributed tracing, spans, SLIs/SLOs, alert fatigue.
  - Honeycomb's position: "Monitoring can tell you that an issue occurred while observability can tell you why an issue occurred."
  - OpenTelemetry is the collection standard; observability platforms (Honeycomb, Datadog, etc.) are the analysis layer.
  - Honeycomb now offers "LLM Observability" and "AI Agents" as explicit product categories, confirming the convergence of traditional observability with AI-specific tooling.
  - "Alert fatigue" is explicitly defined: "occurs when a person is exposed to too many alerts and becomes desensitized to them." Maps directly to the lexicon's "naturalist's tax."
- **Best Quote/Passage:** "Monitoring can tell you that an issue occurred while observability can tell you why an issue occurred." - Good framing for Step 7's distinction between basic logging and deep observability.
- **Caveat:** The "three pillars" (logs, metrics, traces) framing is sometimes criticized by Charity Majors herself as an oversimplification. The more useful framing for agent systems may be "structured events with high cardinality and high dimensionality." For bootcamp, teach both the three pillars as foundation and structured events as the modern practice.

### JSON Lines (JSONL) Specification
- **Status:** verified - stable specification
- **URL:** https://jsonlines.org/
- **Key Extraction:**
  - Three requirements: UTF-8 encoding, each line is valid JSON, line terminator is `\n`.
  - Convention: `.jsonl` file extension. Compression: `.jsonl.gz` or `.jsonl.bz2`.
  - MIME type: `application/jsonl` (not yet standardized).
  - "A great format for log files. Also a flexible format for passing messages between cooperating processes."
  - Works well with Unix text processing tools and shell pipelines.
- **Best Quote/Passage:** "JSON Lines is a convenient format for storing structured data that may be processed one record at a time. It works well with unix-style text processing tools and shell pipelines. It's a great format for log files."
- **Caveat:** JSONL is simple and well-understood. It is the de facto format for agent traces (Inspect uses it, custom tracing naturally produces it). Bootcamp I covered text pipelines; JSONL connects those skills to observability. The specification is stable and unlikely to change.

### General Research: Current Standard for Agent Observability (March 2026)
- **Status:** assessed
- **Key Extraction:**
  - OpenTelemetry GenAI semantic conventions are NOT yet stable but are the clear direction. Every major tool (Phoenix, LangSmith, Braintrust) is building on or toward OTel compatibility.
  - The practical standard as of March 2026: JSONL structured logging for custom tracing, OpenTelemetry for framework integration, platform-specific tools (LangSmith, Phoenix, Braintrust) for visual analysis.
  - Major providers: Anthropic and OpenAI do not provide built-in observability dashboards. Observability is left to third-party tools or self-instrumentation. Both providers' APIs return token usage data in responses, which is the minimum for custom tracing.
  - The OpenInference project (from Arize) provides the most comprehensive set of auto-instrumentation packages for LLM providers and frameworks.
  - No single tool has emerged as the "standard" - the field is fragmented across commercial platforms (LangSmith, Braintrust, Datadog AI Observability) and open-source tools (Phoenix, custom JSONL+DuckDB).
- **Caveat:** The landscape is fragmented enough that teaching principles (structured tracing, span hierarchy, standard attributes) is more valuable than teaching any single tool. The bootcamp's approach of starting with custom JSONL tracing and then comparing against frameworks is pedagogically sound because it teaches the underlying concepts before the abstraction.

---

## Step 8 References: Debugging Agent Systems

### Inspect AI Log Viewer (for Step-by-Step Replay)
- **Status:** verified - robust feature set
- **URL:** https://inspect.ai-safety-institute.org.uk/log-viewer.html
- **Key Extraction:**
  - Messages tab: displays full message history with role labels (user, assistant, tool). Shows tool call parameters and results inline.
  - Scoring tab: shows input, target, extracted answer, model explanation. Critical for understanding scorer failures.
  - Metadata tab: shows additional data from solvers, tools, scorers (e.g., URLs visited by web_search tool).
  - Filtering: filter by score value (e.g., show only incorrect samples). Sorting by score, sample, or epoch.
  - Live view: watch evaluation progress in real-time, including incremental metric calculations.
  - `inspect view bundle` creates self-contained deployable site for sharing replay analysis.
  - The viewer is NOT usable as a standalone replay tool without running Inspect - it reads Inspect log files which require running evaluations to produce.
  - "Inspect Scout" (announced but not yet fully documented) provides deeper agent transcript analysis.
- **Best Quote/Passage:** "Looking carefully at the message history (especially for agents or multi-turn solvers) is critically important for understanding how well your evaluation is constructed."
- **Caveat:** For bootcamp purposes, the Inspect log viewer is the best available replay tool for agent traces produced by Inspect evals. For non-Inspect agent traces, a custom JSONL replay notebook is needed. The exercises should cover both: Inspect viewer for eval debugging, custom replay for general agent debugging.

### The "Rerun Don't Fix" Principle
- **Status:** verified - internal standing order with external analogues
- **Internal reference:** AGENTS.md standing order: "bad output means diagnose, reset, rerun - not fix in place"
- **Key Extraction:**
  - The standing order is documented in AGENTS.md and has been consistent since early in the project chain.
  - SRE literature equivalent: "immutable infrastructure" / "cattle not pets" thinking. Servers (or agent runs) are disposable instances, not unique snowflakes to be repaired.
  - The Google SRE Book (Chapter 12, "Effective Troubleshooting"): "Your first response in a major outage may be to start troubleshooting and try to find a root cause as quickly as possible. Ignore that instinct! Instead, your course of action should be to make the system work as well as it can under the circumstances." (Already captured in earlier research findings.)
  - The key pedagogical point: fixing agent output inline destroys the trace evidence. If you edit a model's response mid-conversation, you can no longer diagnose what went wrong. This is equivalent to modifying evidence at a crime scene.
  - For probabilistic systems: the same input may produce different output. A "fix" to one run's output may not generalize. Rerunning tests whether the failure is systematic (reproducible) or stochastic (one-off).
- **Caveat:** The principle maps cleanly to immutable infrastructure concepts. The additional insight specific to agent systems: LLM output is non-deterministic, so "fixing" a specific output is meaningless for preventing future failures. Only systematic fixes (better prompts, better tools, better context) prevent recurrence.

### Immutable Infrastructure / Cattle Not Pets
- **Status:** verified - established DevOps concept
- **URL:** Various (well-documented concept, no single canonical source)
- **Key Extraction:**
  - "Cattle not pets" originated from a presentation by Bill Baker (Microsoft) and was popularized by Randy Bias (Cloudscaling) around 2011-2012.
  - Pets: servers you name, nurture back to health when sick, each one unique. Cattle: servers you number, replace when sick, interchangeable.
  - Immutable infrastructure: once deployed, infrastructure is never modified. Changes require deploying a new instance. Key proponents: HashiCorp (Terraform), Docker.
  - Agent analogy: agent runs are cattle, not pets. A failed run is replaced by a new run, not repaired in place. The trace from the failed run becomes diagnostic evidence.
  - This maps to the "rerun" standing order and to the general principle that agent outputs are disposable artifacts while traces are the valuable diagnostic record.
- **Caveat:** The analogy is clean for simple agent runs. It gets more complex for long-running agents with accumulated state (multi-day conversations, persistent memory). The bootcamp should acknowledge this: for stateless agent runs, rerun is straightforward. For stateful agents, you need checkpointing and state recovery, which is a more advanced topic.

### Failure Classification Frameworks
- **Status:** partially verified - established incident classification exists; agent-specific taxonomies are emerging
- **Key Extraction:**
  - Standard incident classification: SEV-1 through SEV-4 based on impact/urgency (ITIL framework). Used in SRE for production incidents.
  - The outline's agent-specific failure types (model error, context error, tool error, environment error, orchestration error, state error) do not appear to have a published, standardized taxonomy as of March 2026. This is the project's own classification, which is well-structured and useful.
  - Closest published equivalent: the layer model's L0-L12 provides a systematic diagnostic framework. Each failure type maps to specific layers: model error = L0/L4, context error = L3, tool error = L7, environment error = external, orchestration error = L6, state error = application state.
  - Arize Phoenix and LangSmith both provide error categorization in their trace views, but these are tool-specific, not standardized taxonomies.
  - Academic work on LLM failure modes exists (hallucination taxonomies, benchmark failure analysis) but focuses on model errors, not system-level agent failures.
- **Caveat:** The failure classification in the outline is original and well-structured. The bootcamp should present it as "a useful framework" rather than "the industry standard" because no industry standard exists yet. This is an honest representation: the field is too young for standardized failure taxonomies.

### Replay Debugging Tools (March 2026)
- **Status:** assessed - no dominant tool exists for LLM agent replay
- **Key Extraction:**
  - Time-travel debugging analogies: `rr` (Mozilla, for C/C++ programs) records and replays execution deterministically. Replay.io records browser sessions for deterministic replay. Both rely on deterministic replay of recorded execution.
  - The fundamental challenge for LLM agents: LLM output is non-deterministic. Even with the same prompt and temperature=0, outputs can vary between API calls. True deterministic replay is impossible without caching the model responses.
  - Inspect AI's approach: log the full message history (including all model responses). Replay means "read back the recorded conversation," not "re-execute the agent." This is post-mortem analysis, not time-travel debugging.
  - LangSmith's approach: trace visualization with step-by-step message replay. Similar to Inspect but with a web UI.
  - Custom replay pattern: read JSONL trace, display step-by-step in a notebook. Compare: re-execute with cached responses to test "what if the model said the same thing but we handled it differently."
  - Approximate replay: send the same messages to the model and compare outputs. Divergence indicates non-determinism or model updates. Useful for testing prompt changes.
  - No equivalent of `rr` or Replay.io exists for LLM agent systems as of March 2026.
- **Caveat:** The bootcamp outline correctly identifies this: "Non-deterministic LLM output means exact replay is impossible - what can you approximate?" The answer is: post-mortem trace analysis (review what happened) and approximate replay (resend and compare). Teaching both, with honesty about the limitations, is the right approach.

### General Research: How Teams Debug Agent Systems (March 2026)
- **Status:** assessed
- **Key Extraction:**
  - The dominant pattern: structured logging/tracing during execution, post-mortem analysis of traces after failure. No real-time step-through debugging of API-based LLM calls.
  - Common workflow: (1) detect failure via monitoring/alert, (2) pull the trace, (3) review message history step by step, (4) classify the failure, (5) fix the system (not the output), (6) rerun and verify.
  - Tools used: LangSmith/Phoenix for visual trace analysis, DuckDB/pandas for aggregate analysis across many traces, Jupyter notebooks for ad-hoc investigation.
  - No published "debugging agent systems" runbooks or standardized guides found. This is still too new for standardization.
  - The Inspect team's announcement of "Inspect Scout" for agent transcript analysis suggests this is a recognized gap that tools are beginning to fill.
- **Caveat:** The absence of standardized debugging guides for agent systems is itself a finding. The bootcamp is producing pedagogical material for a gap in the field. This should be presented honestly: "here is a systematic approach to a problem that most teams are still solving ad hoc."

---

## Maturity Assessment

### Stable Enough to Teach as Standard Practice
These can be taught as durable knowledge that will remain relevant regardless of tool changes:

| Reference | Why Stable |
|-----------|-----------|
| OpenTelemetry (core concepts) | Spans, traces, attributes, exporters - the conceptual model is stable even if GenAI-specific conventions are not |
| JSONL structured logging | Simple specification, widely adopted, unlikely to change |
| DuckDB for log analysis | Mature, stable database. SQL skills are transferable |
| Three pillars of observability | Established framework (logs, metrics, traces). The concepts predate AI and will outlast current tools |
| Structured events / high cardinality | The Honeycomb insight that wide, structured events enable observability. Fundamental principle |
| Failure classification by type | The model/context/tool/environment/orchestration/state taxonomy is a useful diagnostic framework |
| "Rerun don't fix" / immutable infrastructure | Established operational principle. Especially important for probabilistic systems |
| Inspect AI (eval debugging) | Backed by UK AISI, active development, strong eval community. The specific tool may evolve but the log viewer pattern is stable |

### Present as "Current Best, Expect Change"
These should be taught with explicit caveats about their evolving nature:

| Reference | Why Expect Change |
|-----------|------------------|
| OpenTelemetry GenAI semantic conventions | Explicitly "Development" status. Attribute names will change. Teach the concepts, not the specific attribute names |
| LangSmith | Commercial product, actively pivoting (was LangChain-specific, now "framework-agnostic"). Features and pricing will change |
| Braintrust | Newer entrant, still establishing position. Good for demonstrating eval+observability connection |
| Arize Phoenix | Best open-source option today but the API surface is large and evolving rapidly (7,800+ commits, very active development) |
| Agent replay debugging tools | No dominant tool exists. Inspect log viewer + custom JSONL replay are the best current options. This area will see significant tooling in the next 1-2 years |
| Agent failure taxonomies | No published standard. The outline's taxonomy is good but should be presented as "a useful framework" not "the standard" |

### Frontier / Speculative
These are mentioned in the outline but have no stable tooling:

| Reference | Status |
|-----------|--------|
| Deterministic replay for agent systems | Fundamentally limited by LLM non-determinism. Approximate replay is possible; exact replay is not |
| Standardized agent post-mortem process | Does not exist as a published practice. The outline's approach is original and well-structured |
| Production agent debugging (live) | No real-time debugger for API-based LLM agents exists. All debugging is post-mortem via traces |

---

## Cross-References to Other Bootcamps

| Bootcamp | Step | Connection |
|----------|------|-----------|
| Bootcamp I | Step 4 (text pipelines) | JSONL processing with Unix tools |
| Bootcamp I | Step 9 (containers) | Docker for running Phoenix locally |
| Bootcamp II | Step 9 (failure modes) | Agent failure classification extends the failure mode discussion |
| Bootcamp III | Step 3 (SQL analytics) | DuckDB for querying JSONL traces |
| Bootcamp III | Step 5 (time series) | Latency distributions, token usage over time |
| Bootcamp IV | Steps 1-9 (eval framework) | Inspect AI is the same tool for eval and trace debugging |
| Bootcamp V | Step 5 (tool use) | Tool call tracing is a core observable |
| Bootcamp V | Step 6 (multi-step agents) | Multi-step traces are the primary unit of analysis |
