# Task 06: Research - External References for Production Patterns (Step 9)

**Type:** Research (read-only, web fetch)
**Parallelizable with:** Tasks 01, 02, 03, 04, 05
**Blocks:** Task 15 (write task for Step 9)
**Output:** `docs/bootcamp/tasks-v/06-research-production-external/findings.md`

---

## Objective

Research and verify external references cited in Step 9 of the Bootcamp V outline.
Step 9 is EMERGING - production patterns for agent systems are documented by providers
but conventions are still forming. This research needs to capture current (March 2026)
best practices for deploying, scaling, and operating agent systems.

## Step 9 References: Production Patterns

**Field maturity: EMERGING**

1. **Rate limiting and retry patterns:**
   - Anthropic API rate limits documentation (current)
   - OpenAI API rate limits documentation (current)
   - Exponential backoff with jitter - standard reference (AWS architecture blog,
     or equivalent canonical source)
   - Circuit breaker pattern (Michael Nygard, "Release It!" 2007/2018)
   - Python retry libraries: tenacity (current state), httpx retry

2. **Deployment patterns for AI systems:**
   - Blue-green deployment for prompt changes - any published examples?
   - Canary deployment for model version changes - provider guidance
   - Feature flags for agent capabilities (LaunchDarkly, Unleash, or equivalent)
   - How providers recommend deploying prompt changes (Anthropic, OpenAI)

3. **Scaling patterns:**
   - Queue-based agent dispatch (Celery, Bull, RabbitMQ, or cloud equivalents)
   - Concurrency limits for API-bound workloads
   - Worker pool patterns for agent systems
   - Serverless vs long-running workers for agent tasks

4. **Cost control:**
   - Current API pricing (Anthropic Claude, OpenAI GPT-4, March 2026)
   - Token budget enforcement patterns
   - Cost monitoring tools (existing or need to build?)
   - Connection to Bootcamp III Step 8 (cost modelling) and Bootcamp IV Step 5
     (eval in CI/CD)

5. **Security in production:**
   - Prompt injection defence: current best practices (March 2026)
   - OWASP Top 10 for LLM Applications (verify current version)
   - Credential management for agent systems (secrets management, not raw API keys)
   - Sandbox boundaries: containers (Bootcamp I Step 9), gVisor, Firecracker
   - Output validation before any write operation

6. **Reliability patterns:**
   - Idempotency in agent operations - standard patterns
   - Health checks and readiness probes for agent services (Kubernetes patterns)
   - Graceful degradation when LLM API is unavailable
   - Connection to Bootcamp II Step 11 (cost and security) if it exists

7. **Operational baseline:**
   - SRE concepts: SLI, SLO, SLA applied to agent systems
   - What metrics define "healthy" for an agent service?
   - Google SRE book references (relevant chapters)
   - Anomaly detection for agent behaviour (statistical, not ML-based)

8. **General research:**
   - How are production agent systems deployed and operated (March 2026)?
   - Any published case studies of agent systems at scale?
   - What infrastructure patterns have emerged as standard?
   - What are the common failure modes in production (not in the model, but in
     the infrastructure around the model)?

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

Include a "Production Readiness Checklist" section: synthesise across all references
a checklist of what "production-ready" means for an agent system, as of March 2026.
This becomes a teaching artifact for Step 9.
