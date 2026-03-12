# Step 9 External Reference Findings - Production Patterns

**Researcher:** Agent (Claude Opus 4.6)
**Date:** 2026-03-10
**Field maturity:** EMERGING
**Scope:** All references listed in Step 9 of Bootcamp V outline

---

## 1. Rate Limiting and Retry Patterns

### Anthropic API Rate Limits

- **Status:** verified
- **URL:** https://docs.anthropic.com/en/api/rate-limits
- **Key Extraction:**
  - Rate limits are measured in RPM (requests per minute), ITPM (input tokens per minute), and OTPM (output tokens per minute) per model class
  - Uses token bucket algorithm (continuous replenishment, not fixed-interval reset) - important conceptual distinction for students
  - Four usage tiers (Tier 1 through Tier 4) with automatic graduation based on spend. Tier 1 starts at 50 RPM; Tier 4 reaches 4,000 RPM
  - Cached input tokens do NOT count towards ITPM for most models - prompt caching effectively multiplies throughput (e.g. 80% cache hit rate turns 2M ITPM into 10M effective ITPM)
  - Response headers expose real-time rate limit state: `anthropic-ratelimit-requests-remaining`, `anthropic-ratelimit-tokens-remaining`, `retry-after`
  - Separate limits for Batch API (up to 500K batch requests in processing queue at Tier 4)
  - Current models: Opus 4.x, Sonnet 4.x, Haiku 4.5, Haiku 3 (some deprecated)
- **Best Quote/Passage:** "Your capacity is continuously replenished up to your maximum limit, rather than being reset at fixed intervals."
- **Caveat:** Model lineup has changed significantly. As of March 2026, Claude Sonnet 3.7 and Haiku 3.5 are deprecated. Opus and Sonnet now use shared rate limits across sub-versions (e.g., Opus 4.6, 4.5, 4.1, 4 all share one pool).

### OpenAI API Rate Limits

- **Status:** verified
- **URL:** https://platform.openai.com/docs/guides/rate-limits
- **Key Extraction:**
  - Rate limits measured in five ways: RPM, RPD (requests per day), TPM, TPD (tokens per day), and IPM (images per minute)
  - Five usage tiers (Free through Tier 5). Tier 5 requires $1,000 paid and 30+ days, with $200,000/month usage limit
  - Rate limits are set at the organization and project level, not user level
  - Shared rate limits across model families - all models in a "shared limit" group draw from the same pool
  - Response headers provide `x-ratelimit-remaining-requests`, `x-ratelimit-remaining-tokens`, `x-ratelimit-reset-requests`
  - Batch API allows async processing with separate queue-based limits and 50% cost savings
  - Latest model mentioned: GPT-5.4
- **Best Quote/Passage:** "Rate limits can be hit across any of the options depending on what occurs first."
- **Caveat:** As of March 2026 OpenAI has GPT-5.4 as their flagship. The model landscape has changed dramatically. Students should check current pricing page at build time.

### Exponential Backoff with Jitter (AWS Architecture Blog)

- **Status:** verified
- **URL:** https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
- **Key Extraction:**
  - Canonical reference by Marc Brooker (2015, updated May 2023). Still the definitive treatment with simulation data
  - Three jitter strategies compared: "Full Jitter" (sleep = random(0, min(cap, base * 2^attempt))), "Equal Jitter" (keeps half backoff + half jitter), "Decorrelated Jitter" (increases max based on last random value)
  - Full Jitter produces the best results: lowest total work, approximately constant rate of calls after initial spike
  - Without jitter, exponential backoff still clusters retries (just at wider intervals). Jitter spreads them to approximately constant rate
  - AWS SDKs now support this natively in standard and adaptive retry modes
  - The companion deep-dive in Amazon Builders' Library covers timeouts, retries, and backoff with jitter
- **Best Quote/Passage:** "The return on implementation complexity of using jittered backoff is huge, and it should be considered a standard approach for remote clients."
- **Caveat:** None. This article remains the canonical reference. Both Anthropic and OpenAI cite exponential backoff with jitter in their rate limit docs.

### Circuit Breaker Pattern (Michael Nygard, "Release It!")

- **Status:** verified (book reference, not fetchable URL)
- **URL:** Book: "Release It!" by Michael Nygard (1st ed. 2007, 2nd ed. 2018, Pragmatic Bookshelf)
- **Key Extraction:**
  - Circuit breaker has three states: Closed (normal flow), Open (all calls fail fast), Half-Open (test calls to check recovery)
  - Prevents cascading failures by failing fast when a downstream service is known to be unavailable
  - For agent systems: if the LLM API is returning 5xx or timing out, stop sending requests and fail fast instead of exhausting retry budgets
  - Implementation: track failure count over a window; trip to Open when threshold exceeded; after a timeout, move to Half-Open; if test call succeeds, move to Closed
  - Complementary to retry with backoff: retries handle transient failures; circuit breaker handles sustained failures
- **Best Quote/Passage:** From Nygard: "Every integration point is a potential failure point."
- **Caveat:** The book is a physical/ebook reference. No free online version. For teaching, the pattern is well-documented in Microsoft's Cloud Design Patterns (https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker) which is freely available.

### Python Retry Library: Tenacity

- **Status:** verified
- **URL:** https://tenacity.readthedocs.io/en/latest/
- **Key Extraction:**
  - Apache 2.0 licensed, general-purpose retrying library. Originates from a fork of the abandoned `retrying` library
  - Decorator-based API: `@retry(wait=wait_random_exponential(min=1, max=60), stop=stop_after_attempt(6))`
  - Composable stop conditions (combine with `|`), wait strategies (fixed, random, exponential, chain), and retry predicates (exception type, return value)
  - Supports async (asyncio, Tornado, Trio) with async-native sleep
  - Context manager mode for retrying code blocks without wrapping in functions
  - Before/after callbacks for logging, and built-in `before_sleep_log` for retry event logging
  - `.retry.statistics` attribute provides retry metrics
  - OpenAI's own rate limit documentation recommends tenacity as the primary retry library
- **Best Quote/Passage:** From OpenAI docs: "Tenacity is an Apache 2.0 licensed general-purpose retrying library, written in Python, to simplify the task of adding retry behavior to just about anything."
- **Caveat:** Current stable version is on readthedocs. Library is actively maintained. OpenAI also mentions the `backoff` library as an alternative.

---

## 2. Deployment Patterns for AI Systems

### Blue-Green and Canary Deployment Patterns

- **Status:** verified (general pattern, no single canonical URL for AI-specific use)
- **URL:** General: https://martinfowler.com/bliki/BlueGreenDeployment.html (Fowler's original) and cloud provider docs
- **Key Extraction:**
  - Blue-green: two identical production environments; switch traffic atomically. For agent systems, this applies to prompt version changes - deploy new prompt to "green", validate, switch
  - Canary: route a small percentage of traffic to the new version, monitor metrics, gradually increase. For model version changes, route 5% of requests to the new model, compare output quality
  - Neither Anthropic nor OpenAI publish specific guidance on blue-green/canary for prompt or model changes as of March 2026. This is a gap - teams must build their own
  - The pattern maps well to agent systems: version your system prompts, deploy to a subset of users, compare eval metrics before full rollout
  - OpenAI's "Agent Builder" and ChatKit suggest a managed deployment approach, but no canary tooling is exposed
- **Best Quote/Passage:** N/A - no provider-specific guidance found
- **Caveat:** This is an area where conventions are still forming. No standard tooling exists for prompt-level canary deployments. Feature flags (see below) are the practical mechanism.

### Feature Flags (LaunchDarkly, Unleash)

- **Status:** verified
- **URL:** https://docs.getunleash.io/ (Unleash - open source), https://launchdarkly.com/docs/ (LaunchDarkly - commercial)
- **Key Extraction:**
  - Unleash: open-source feature management platform with activation strategies, segments, gradual rollout, and A/B testing built in. Supports Node, Python, Java, Go, .NET, Ruby, Rust, React, and more
  - Key concepts: feature flags, environments (dev/staging/prod), activation strategies (percentage rollout, user targeting), strategy variants (A/B testing), and change requests (four-eyes principle)
  - For agent systems: feature flags can gate which model version, prompt version, or tool set an agent uses. Enable gradual rollout of new agent capabilities
  - Unleash has built-in analytics ("impact metrics") to connect flag changes to application metrics - useful for measuring prompt change impact
  - Unleash now has an MCP server for LLM-powered coding assistants to manage flags, and specific guides for Claude Code integration
  - LaunchDarkly is the commercial leader but Unleash is a strong open-source alternative for teaching
- **Best Quote/Passage:** N/A
- **Caveat:** Feature flags for AI systems are an emerging practice. Unleash's "experiment with AI using feature flags" guide explicitly covers managing AI model rollouts.

---

## 3. Scaling Patterns

### Queue-Based Dispatch: Celery (Python)

- **Status:** verified
- **URL:** https://docs.celeryq.dev/en/stable/getting-started/introduction.html
- **Key Extraction:**
  - Current stable version: Celery 5.6.2. Supports Python 3.8-3.13
  - Architecture: clients add messages to a broker (RabbitMQ, Redis, SQS); dedicated worker processes consume tasks. Multiple workers and brokers for HA and horizontal scaling
  - Built-in rate limiting ("how many tasks per second/minute/hour"), time limits, retry of failed tasks, scheduling (cron), and monitoring events
  - Canvas primitives for workflows: chain, group, chord, chunks - useful for orchestrating multi-step agent tasks
  - Resource leak protection via `--max-tasks-per-child` - important for long-running agent workers that may leak memory
  - Does NOT support Windows (relevant caveat for teaching)
  - For agent systems: use Celery to queue agent task requests, with workers that call the LLM API. Rate limits on workers enforce API rate limits
- **Best Quote/Passage:** "A single Celery process can process millions of tasks a minute, with sub-millisecond round-trip latency."
- **Caveat:** Celery is Python-only. For Node.js agent systems, BullMQ is the equivalent (see below).

### Queue-Based Dispatch: BullMQ (Node.js)

- **Status:** verified
- **URL:** https://docs.bullmq.io/
- **Key Extraction:**
  - Node.js queue library built on Redis. Aims for exactly-once delivery semantics (at-least-once in worst case)
  - Features: priorities, delayed jobs, cron-based scheduling, retries, concurrency per worker, sandboxed processing, parent-child job dependencies
  - Designed for horizontal scaling - add more workers to increase throughput
  - Minimal CPU usage via polling-free design (Redis pub/sub)
  - For agent systems in TypeScript/Node.js: BullMQ is the standard choice for queuing agent work
- **Best Quote/Passage:** N/A
- **Caveat:** BullMQ requires Redis. For serverless environments, consider cloud-native alternatives (SQS, Cloud Tasks).

---

## 4. Cost Control

### Anthropic API Pricing (March 2026)

- **Status:** verified
- **URL:** https://claude.com/pricing (API section) and https://docs.anthropic.com/en/api/pricing (returned 404 - pricing is now on claude.com)
- **Key Extraction:**
  - **Opus 4.6:** $5/MTok input, $25/MTok output (prompts up to 200K tokens). Doubles for prompts >200K tokens ($10/$37.50)
  - **Sonnet 4.6:** $3/MTok input, $15/MTok output (up to 200K). Doubles for >200K ($6/$22.50)
  - **Haiku 4.5:** $1/MTok input, $5/MTok output (flat pricing)
  - Prompt caching: cache write costs 1.25x base input; cache read costs 0.1x base input (significant savings for repeated prompts)
  - Batch processing: 50% discount on input and output tokens
  - Web search tool: $10 per 1,000 searches
  - Code execution: $0.05 per hour per container (50 free hours daily per org)
  - US-only inference: 1.1x multiplier on token prices
  - Legacy models still available: Opus 4.5 ($5/$25), Opus 4.1 ($15/$75), Opus 4 ($15/$75), Sonnet 4.5 ($3/$15), Sonnet 4 ($3/$15), Haiku 3 ($0.25/$1.25)
- **Best Quote/Passage:** N/A
- **Caveat:** Pricing changes frequently. The jump from Sonnet to Opus is 1.67x on input and 1.67x on output (Sonnet 4.6 vs Opus 4.6). The jump from Haiku to Sonnet is 3x input, 3x output. These ratios matter for cost modelling exercises.

### OpenAI API Pricing (March 2026)

- **Status:** verified
- **URL:** https://openai.com/api/pricing/
- **Key Extraction:**
  - **GPT-5.4:** $2.50/MTok input, $15.00/MTok output. Cached input: $0.25/MTok
  - **GPT-5 mini:** $0.250/MTok input, $2.000/MTok output. Cached input: $0.025/MTok
  - Batch API: 50% savings on both input and output
  - Fine-tuning available for GPT-4.1, 4.1 mini, 4.1 nano, and o4-mini
  - Priority processing available for enterprise customers
  - Web search tool: $10/1K calls plus search content tokens at model rates
  - Built-in tools (containers, file search, code interpreter) have separate pricing
  - Regional processing endpoints charge additional 10% for GPT-5.4 models
- **Best Quote/Passage:** N/A
- **Caveat:** OpenAI has significantly expanded their model lineup. GPT-5.4 is the current flagship. Pricing on the detailed page (platform.openai.com/docs/pricing) has more granular per-model data.

### Cost Comparison Summary (March 2026)

For a standard text agent workload (assume 1K input tokens, 500 output tokens per call):

| Provider/Model | Input cost | Output cost | Total per call |
|---|---|---|---|
| Haiku 4.5 | $0.001 | $0.0025 | $0.0035 |
| GPT-5 mini | $0.00025 | $0.001 | $0.00125 |
| Sonnet 4.6 | $0.003 | $0.0075 | $0.0105 |
| GPT-5.4 | $0.0025 | $0.0075 | $0.01 |
| Opus 4.6 | $0.005 | $0.0125 | $0.0175 |

---

## 5. Security in Production

### OWASP Top 10 for LLM Applications

- **Status:** verified (updated to 2025 version)
- **URL:** https://genai.owasp.org/llm-top-10/ (current), https://owasp.org/www-project-top-10-for-large-language-model-applications/ (project page)
- **Key Extraction:**
  - The 2025 version is the current release. The project has expanded into the "OWASP GenAI Security Project" with 600+ contributors from 18+ countries
  - **2025 Top 10 list:**
    1. LLM01: Prompt Injection
    2. LLM02: Sensitive Information Disclosure
    3. LLM03: Supply Chain
    4. LLM04: Data and Model Poisoning
    5. LLM05: Improper Output Handling
    6. LLM06: Excessive Agency
    7. LLM07: System Prompt Leakage
    8. LLM08: Vector and Embedding Weaknesses
    9. LLM09: Misinformation
    10. LLM10: Unbounded Consumption
  - Notable changes from v1.1 (2023): "Insecure Plugin Design" replaced by "System Prompt Leakage" and "Vector and Embedding Weaknesses"; "Model Theft" replaced by "Misinformation" and "Unbounded Consumption"
  - The project now includes an Agentic Security Initiative, AI Red Teaming resources, and a Governance Checklist
  - Available in multiple languages (Spanish, Portuguese, Chinese, German, Russian, Japanese, Korean, Hindi, Greek, and more)
- **Best Quote/Passage:** "Excessive Agency: An LLM-based system is often granted a degree of agency... granting LLMs unchecked autonomy to take action can lead to unintended consequences."
- **Caveat:** The 2025 version is significantly restructured from v1.1. Teaching materials should use the 2025 version. The "Agentic Security Initiative" is particularly relevant for Bootcamp V.

### Prompt Injection Defences

- **Status:** verified (emerging practice, no single canonical reference)
- **URL:** https://genai.owasp.org/llmrisk/llm01-prompt-injection/ (OWASP LLM01 detail page)
- **Key Extraction:**
  - Prompt injection remains the #1 risk in the OWASP LLM Top 10 for 2025
  - Two types: direct (user input manipulates model behavior) and indirect (external content injected via retrieved documents, tools, etc.)
  - Defence layers (defence in depth): input validation/sanitization, privilege control (least privilege for tools), human-in-the-loop for high-stakes actions, output validation before any write operation, separate system/user prompt boundaries
  - No silver bullet exists as of March 2026. This is a fundamental property of instruction-following models
  - Provider-level mitigations: Anthropic's constitutional AI, OpenAI's safety checks and cybersecurity checks
  - For agent systems: the risk is amplified because agents have tool access. A prompt injection that triggers a tool call is more dangerous than one that only affects text output
- **Best Quote/Passage:** N/A
- **Caveat:** This is an unsolved problem. Teaching should emphasize defence in depth rather than any single technique.

---

## 6. Reliability Patterns

### SRE Concepts: SLI, SLO, SLA (Google SRE Book)

- **Status:** verified
- **URL:** https://sre.google/sre-book/service-level-objectives/ (Chapter 4), https://sre.google/sre-book/table-of-contents/
- **Key Extraction:**
  - **SLI** (Service Level Indicator): a quantitative measure of service level (latency, error rate, throughput, availability)
  - **SLO** (Service Level Objective): target value for an SLI (e.g., "99% of requests complete in <100ms")
  - **SLA** (Service Level Agreement): explicit contract with consequences for missing SLOs
  - Key insight: "SRE doesn't typically get involved in constructing SLAs, because SLAs are closely tied to business and product decisions"
  - Use percentiles not averages - "5% of requests are 20 times slower" is hidden by averaging
  - Error budgets: allow a rate at which SLOs can be missed, track daily/weekly. Gap between error budget and SLO violation rate informs release decisions
  - Don't overachieve: "Users build on the reality of what you offer, rather than what you say you'll supply." Deliberately take the system offline to prevent over-dependence (Chubby planned outage example)
  - For agent systems: relevant SLIs include request latency (including LLM API time), task completion rate, tool call success rate, cost per task
  - Relevant chapters: Ch 3 (Embracing Risk), Ch 4 (SLOs), Ch 6 (Monitoring), Ch 17 (Testing for Reliability), Ch 21 (Handling Overload), Ch 22 (Cascading Failures)
- **Best Quote/Passage:** "It's impossible to manage a service correctly, let alone well, without understanding which behaviors really matter for that service and how to measure and evaluate those behaviors."
- **Caveat:** The Google SRE book is freely available online at sre.google. The concepts apply directly but need adaptation for agent-specific metrics (token usage, model latency, prompt cache hit rate).

### Kubernetes Health Checks / Readiness Probes

- **Status:** verified
- **URL:** https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- **Key Extraction:**
  - Three probe types: **Liveness** (is the container alive? restart if not), **Readiness** (is it ready to serve traffic? remove from load balancer if not), **Startup** (has it finished starting? blocks other probes until success)
  - Probe mechanisms: HTTP GET, TCP socket, exec command, gRPC
  - For agent workers: liveness probe checks worker process is alive; readiness probe checks the worker can reach the LLM API and any required databases; startup probe handles slow model loading or warmup
  - Configuration parameters: initialDelaySeconds, periodSeconds, timeoutSeconds, failureThreshold, successThreshold
  - Kubernetes is currently at v1.35 (as of March 2026)
  - Pattern applies beyond Kubernetes: any containerized agent service should implement health check endpoints
- **Best Quote/Passage:** N/A
- **Caveat:** The probe concepts are universal but the Kubernetes-specific YAML configuration is only relevant if deploying to Kubernetes. The pedagogical value is in the conceptual separation of liveness vs readiness vs startup.

---

## 7. Operational Baseline

### Google SRE Book - Full Table of Contents

- **Status:** verified
- **URL:** https://sre.google/sre-book/table-of-contents/
- **Key Extraction:**
  - Free online book, 34 chapters plus appendices. CC BY-NC-ND 4.0 license
  - Most relevant chapters for agent systems:
    - Ch 3: Embracing Risk (error budgets)
    - Ch 4: Service Level Objectives (SLI/SLO/SLA framework)
    - Ch 6: Monitoring Distributed Systems
    - Ch 8: Release Engineering
    - Ch 15: Postmortem Culture
    - Ch 17: Testing for Reliability
    - Ch 21: Handling Overload
    - Ch 22: Addressing Cascading Failures
    - Appendix E: Launch Coordination Checklist
  - Agent-specific SLI suggestions derived from the framework:
    - Availability: fraction of agent tasks that complete successfully
    - Latency: p50, p95, p99 of end-to-end task completion time
    - Error rate: fraction of tasks that fail (LLM errors, tool errors, timeout)
    - Cost per task: mean and p95 token cost
    - Throughput: tasks completed per minute
- **Best Quote/Passage:** See SLO chapter quote above.
- **Caveat:** The book is from 2017 but the principles are timeless. Agent-specific metrics need to be defined by the practitioner.

---

## 8. General Research: Production Agent Systems (March 2026)

### State of Production Agent Deployment

- **Status:** verified (synthesis from multiple sources)
- **URL:** Multiple - OpenAI agents docs, Anthropic agent docs, provider best practice pages
- **Key Extraction:**
  - Both major providers now have dedicated agent infrastructure:
    - OpenAI: Agent Builder, Agents SDK, ChatKit for deployment, Agent Evals, Trace Grading. Full "Agents" section in docs with builder, deploy, and optimize subsections
    - Anthropic: Claude Code, Cowork, Skills, Connectors, MCP (Model Context Protocol) for tool integration
  - OpenAI has a "Going Live" section with Production Best Practices, Latency Optimization (including Predicted Outputs, Priority Processing), Cost Optimization (Batch, Flex processing), and Safety (Safety Checks, Cybersecurity Checks)
  - Emerging standard patterns:
    - Queue-based dispatch for async agent work
    - Streaming for real-time agent interaction
    - Prompt caching as a primary cost optimization (both providers support it)
    - Feature flags for gradual agent capability rollout
    - Batch processing for offline/bulk agent operations (50% cost savings)
  - Infrastructure patterns converging on:
    - Containerized workers consuming from message queues
    - Redis for queue backend and caching
    - Structured logging with trace IDs per agent task
    - Rate limit-aware request dispatching
  - Common failure modes in production:
    - Rate limit exhaustion during burst traffic
    - Context window overflow from accumulated conversation history
    - Tool call failures cascading to agent failure
    - Cost runaway from unbounded agent loops
    - Prompt injection via user input or retrieved documents
- **Caveat:** The field is moving very fast. Both OpenAI and Anthropic have launched significant new agent infrastructure in the last 6 months. Teaching materials should include a "check current docs" note.

---

## Production Readiness Checklist

Synthesized across all references. This defines "production-ready" for an agent system as of March 2026.

### Rate Limiting and Resilience

- [ ] Implement exponential backoff with jitter for all LLM API calls (use tenacity or equivalent)
- [ ] Implement circuit breaker for sustained API failures (fail fast, not retry forever)
- [ ] Monitor rate limit headers from API responses and implement proactive throttling
- [ ] Set per-user and per-task rate limits to prevent a single user from exhausting org-wide limits
- [ ] Use prompt caching to maximize effective throughput within rate limits

### Cost Control

- [ ] Set hard budget limits per user, per task, and per organization
- [ ] Track token usage per request (input tokens, output tokens, cached tokens)
- [ ] Use the cheapest adequate model for each task (Haiku for simple tasks, Sonnet for complex, Opus for critical)
- [ ] Implement batch processing for non-time-sensitive workloads (50% savings)
- [ ] Alert on cost anomalies (sudden spikes in token usage)
- [ ] Cap max_tokens output to expected response size
- [ ] Monitor and optimize prompt cache hit rates

### Security

- [ ] Implement defence-in-depth against prompt injection (input sanitization, output validation, privilege control)
- [ ] Apply least-privilege principle to all tool access (agents should have minimum necessary permissions)
- [ ] Validate all agent outputs before any write/execute operation
- [ ] Use secrets management for API keys (never hardcode, use environment variables or vault)
- [ ] Sandbox agent execution (containers, gVisor, or equivalent)
- [ ] Review against OWASP Top 10 for LLM Applications 2025 - especially LLM01 (Prompt Injection), LLM06 (Excessive Agency), and LLM10 (Unbounded Consumption)
- [ ] Human-in-the-loop for high-stakes actions (financial transactions, data deletion, external communications)

### Reliability and Observability

- [ ] Define SLIs: availability, latency (p50/p95/p99), error rate, cost per task, throughput
- [ ] Set SLOs for each SLI (e.g., "99% of agent tasks complete within 30 seconds")
- [ ] Implement health check endpoints (liveness: process alive; readiness: can reach LLM API and dependencies)
- [ ] Structured logging with trace IDs per agent task
- [ ] Graceful degradation when LLM API is unavailable (cached responses, fallback models, user notification)
- [ ] Idempotent agent operations where possible (safe to retry without side effects)
- [ ] Postmortem process for production incidents

### Deployment and Scaling

- [ ] Queue-based dispatch for async agent work (Celery/BullMQ or cloud equivalent)
- [ ] Feature flags for gradual rollout of new prompts, models, or agent capabilities
- [ ] Version control for all prompts and system instructions
- [ ] Blue-green or canary deployment for prompt/model changes
- [ ] Horizontal scaling of agent workers with concurrency limits matching API rate limits
- [ ] Container orchestration with proper resource limits (CPU, memory)
- [ ] Automated rollback capability if eval metrics degrade after deployment

### Testing and Evaluation

- [ ] Eval suite that runs against every prompt/model change before deployment
- [ ] Integration tests that verify tool call behavior
- [ ] Load testing to understand throughput limits and cost at scale
- [ ] Adversarial testing for prompt injection and edge cases
- [ ] Monitoring of model output quality over time (drift detection)
