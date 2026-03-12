# Task 15: Write - Step 9: Production Patterns

**Type:** Write
**Depends on:** Tasks 01 (format), 02 (internal refs), 06 (external refs for Step 9), all previous steps
**Parallelizable with:** None (capstone step, depends on all others conceptually)
**Output:** `docs/bootcamp/step09-production-patterns.md`

---

## Objective

Write the full Step 9 content: "Production Patterns." This is the capstone step that ties
together retrieval, state, and observability into production-ready agent systems. EMERGING
maturity - patterns are documented by providers but conventions are still forming.

Estimated target: 35-50k characters (~1000-1400 lines).

## Prime Context (load before writing)

1. `docs/bootcamp/tasks-v/01-research-format/findings.md` - format template
2. `docs/bootcamp/tasks-v/02-research-internal-refs/findings.md` - internal concepts
3. `docs/bootcamp/tasks-v/06-research-production-external/findings.md` - external references (critical)
4. `docs/bootcamp/BOOTCAMP-V-OUTLINE.md` lines 633-688 - the Step 9 outline
5. Previous steps for cross-reference (don't load fully, reference by topic)

## Content Structure

### Mandatory Sections

1. **Why This is Step 9** - Frame: the capstone. Steps 1-8 built retrieval, state, and
   observability capabilities. This step addresses what happens when these systems need
   to be reliable, cost-effective, and secure at scale. The gap between "works on my
   machine" and "works in production" is where most agent projects die.

2. **Rate limiting and retry strategies** - API rate limits are a fact of life:
   - Exponential backoff with jitter (the standard pattern, explain why jitter matters)
   - Per-model rate limit tracking (different models, different limits)
   - Circuit breaker pattern (Nygard): after N consecutive failures, stop trying for
     a cooldown period. Prevents cascading failures.
   - Python implementation: tenacity library or custom retry decorator
   - Code example: a robust API call wrapper with backoff, jitter, and circuit breaking

3. **Fallback chains** - Graceful degradation when primary systems fail:
   - Primary model unavailable -> secondary model -> cached response -> graceful error
   - Prompt compatibility across models (prompts may need adaptation)
   - Designing degradation that maintains trust (don't silently switch to a worse model
     without telling the user, unless the degradation is quality-neutral)
   - Code example: fallback chain with automatic failover

4. **Scaling patterns** - When one agent worker is not enough:
   - Queue-based dispatch: agent tasks in a queue, workers pull and execute
   - Concurrency limits: stay within API rate limits and cost budgets
   - Worker pool patterns: fixed pool vs auto-scaling
   - Serverless vs long-running workers: tradeoffs for agent workloads
   - Connection to Bootcamp I Step 9 (containers) for deployment

5. **Deployment patterns** - Deploying changes to agent systems:
   - Blue-green for prompt changes: route 10% of traffic to new prompt, compare eval
     metrics, promote or rollback. Prompts are code; treat them like code.
   - Canary deployment for model version changes
   - Feature flags for agent capabilities (enable/disable tools, adjust behaviour)
   - Connection to Bootcamp IV Step 5 (eval in CI/CD): eval metrics as deployment gates

6. **Cost controls** - Production cost management:
   - Per-request token budget (max tokens for a single agent run)
   - Daily/monthly spending caps
   - Cost alerting (80% of budget consumed -> alert)
   - Cost attribution (which users/tasks consume the most?)
   - Connection to Bootcamp III Step 8 (cost modelling)
   - Code example: cost tracking middleware

7. **Security in production** - Agent-specific security concerns:
   - Credential management: agents never see raw API keys (env vars, secrets managers)
   - Prompt injection defence: input validation, output validation, sandwich technique
   - OWASP Top 10 for LLM Applications (current version)
   - Output validation: gate before any write operation (the quality gate principle
     extended to agent outputs)
   - Sandbox boundaries: containers (Bootcamp I Step 9), restricted file access,
     network policies

8. **Reliability patterns** - Making agent systems dependable:
   - Idempotent operations: safe to retry without side effects
   - Exactly-once semantics for state mutations (from Step 5)
   - Health checks and readiness probes for agent services
   - Graceful shutdown: complete current task before stopping
   - Connection to the project's gate concept: the gate as a reliability mechanism

9. **The operational baseline** - What "healthy" looks like:
   - Define before deploying: expected latency (p50, p95, p99), expected cost per
     request, expected success rate, expected error types and rates
   - Monitor against baseline, alert on deviation
   - SRE concepts (SLI, SLO) applied to agent systems
   - The operational baseline as a contract between the agent system and its operators

### Project Vocabulary Integration

- **The gate** as production verification (not just development)
- **The macro workflow** as an operational pattern
- **Checkpoint recovery** for production failure recovery
- **The engineering loop** applied to production operations
- **Alert fatigue** (from Step 7) in production alerting context

### Exercises

- **Retry wrapper** (medium) - Implement exponential backoff with jitter, max 3 retries,
  circuit breaker after 5 consecutive failures. Test with simulated rate limit errors.

- **Fallback chain** (medium-hard) - Design fallback for code review agent: primary
  (Claude), secondary (GPT-4), tertiary (cached response). Implement and test failover.

- **Cost control system** (hard) - Per-request token budget, daily spending cap, alert
  at 80% consumption. Test with realistic API call patterns.

## Quality Constraints

- No emojis, no em-dashes
- 2 spaces indentation in code blocks
- Capstone feel: synthesise across all previous steps, don't just list new topics
- Practical and immediately applicable: every pattern should have a code example
- Honest about complexity: production agent systems are hard
- Security section should be concrete, not checklist-style hand-waving
- Build on Bootcamp I Step 9 (containers), Bootcamp II Step 11 (if exists), Bootcamp III
  Step 8 (cost), Bootcamp IV Step 5 (eval in CI/CD) - reference each cross-connection
