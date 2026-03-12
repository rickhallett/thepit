# Task 16: Write - Step 11: Cost, Security, Legal, and Compliance

**Type:** Write
**Depends on:** Tasks 01 (format), 02 (internal refs), 05 (external refs for Step 11), Task 07 (Step 2), Task 10 (Step 5)
**Parallelizable with:** Task 15 (Step 10) - different topics, similar dependency depth
**Output:** `docs/bootcamp/step11-cost-security-legal.md`

---

## Objective

Write the full Step 11 content: "Cost, Security, Legal, and Compliance." EMERGING
maturity - each subdomain (security, legal, cost) is well-covered individually but
their intersection with agentic engineering is still forming. This step is where
enterprise requirements diverge most sharply from individual developer use.

Estimated target: 35-45k characters (~1000-1300 lines).

## Prime Context (load before writing)

1. `docs/bootcamp/tasks/01-research-format/findings.md` - format template
2. `docs/bootcamp/tasks/02-research-internal-refs/findings.md` - ROI gate, L5 as measurement point
3. `docs/bootcamp/tasks/05-research-tier3-external/findings.md` - OWASP, provider security docs, legal landscape
4. `docs/bootcamp/BOOTCAMP-II-OUTLINE.md` lines 854-945 - the Step 11 outline
5. `docs/bootcamp/step02-agent-architecture.md` - routing pattern (for cost optimisation)
6. `docs/bootcamp/step05-tool-design.md` - sandbox design, tool security

## Content Structure

### Mandatory Sections - Cost and Resource Management

1. **Token economics** - The cost model:
   - Input tokens, output tokens, reasoning tokens (where applicable)
   - Cached tokens and the cache hit rate (the 95% observation)
   - How caching changes the cost model fundamentally
   - Provider pricing comparison (date-stamped - this changes fast)

2. **Model selection strategy** - Cost-performance tradeoffs:
   - Reasoning models for complex tasks (expensive, slow, high quality)
   - Fast models for routine classification (cheap, fast, adequate)
   - Cost-efficient models for routine work
   - The routing pattern from Step 2 applied to cost optimisation

3. **The ROI gate** - Standing order before dispatching work:
   - Weigh cost, time, and marginal value
   - Diminishing marginal returns on review cycles
   - Marginal analysis: continue while marginal value > marginal cost
   - The exit condition for review loops

4. **Cost monitoring** - Per-task tracking:
   - API-level cost tracking (L5 is the only calibrated measurement point)
   - Cost alerts and spend limits
   - Budget allocation per task type
   - The cost visibility problem (API charges are the only reliable number)

### Mandatory Sections - Security

5. **Sandbox design** - Agent execution environments:
   - Namespaces and cgroups from Bootcamp I Step 9
   - Process isolation, filesystem restrictions, network policies
   - The principle: agents run in the smallest box that allows the task

6. **Credential management:**
   - Agents should never see raw credentials
   - Credential vaults, scoped tokens, short-lived access
   - Principle of least privilege for agent systems
   - What happens when an agent leaks a credential (blast radius)

7. **Prompt injection** - The attack surface:
   - Direct injection (in user input to the agent)
   - Indirect injection (in retrieved documents, tool results, database records)
   - Defence in depth: input validation, output validation, sandboxing
   - Current state of the art (this is an active research area)

8. **Output validation:**
   - Agent output validated before affecting production state
   - The gate as primary defence
   - Additional validation for data writes, API calls, deployment actions
   - The principle: no agent output modifies production without a gate

9. **Supply chain risks:**
   - Agent dependencies: model providers, tool libraries, data sources
   - Vendor lock-in risk and mitigation (MCP, standard interfaces)
   - Model deprecation risk (your workflow breaks when the model is retired)

### Mandatory Sections - Legal and Compliance

10. **IP ownership** - Current ambiguity:
    - Who owns agent-generated code? (currently unclear)
    - Work-for-hire doctrine applicability
    - Copyright Office guidance (US) - date-stamp this
    - Practical approach: treat as employee work-product, document provenance

11. **Audit trails:**
    - Agent actions logged and attributable
    - Git as audit trail (commit trailers for provenance)
    - API logs for token-level accountability
    - The compliance requirement: who did what, when, why?

12. **Data residency:**
    - Where does code go when sent to an API?
    - Model provider terms of service
    - Enterprise agreements vs standard terms
    - On-premise vs cloud tradeoffs (latency, cost, control)

13. **Regulatory considerations:**
    - Sector-specific: financial services, healthcare, government
    - The compliance case for human-in-the-loop review
    - Audit requirements in regulated industries

14. **Liability:**
    - When agent-generated code causes harm, who is responsible?
    - Engineering controls as liability management framework
    - The verification pipeline as the legal defence

### Challenges

Design 4-6 challenges:
- Token budget calculation (easy - estimate cost for a real workflow)
- ROI analysis (medium - given a task, calculate whether agent assistance has positive ROI)
- Sandbox design exercise (medium - design a sandbox for a specific agent use case)
- Prompt injection defence (medium - build input validation for an agent interface)
- Audit trail implementation (hard - implement commit trailers and provenance tracking)
- Compliance assessment (hard - assess a hypothetical agent deployment against regulatory requirements)

### Field Maturity

`> FIELD MATURITY: EMERGING` throughout. Individual domains (cloud security, IP law,
token pricing) are established. Their intersection with agentic engineering is emerging.
Novel: ROI gate as standing order, L5 as only calibrated measurement, commit trailers
as provenance mechanism.

## Quality Constraints

- No emojis, no em-dashes
- ALL legal and pricing information must be date-stamped (this field moves fast)
- Security guidance should reference OWASP LLM Top 10 by name
- Cost examples should use real (or realistic) token prices
- Regulatory section should be honest about jurisdictional differences
- Reference Bootcamp I Step 9 (containers) for sandbox design foundation
- IP ownership section should present ambiguity honestly, not pretend clarity exists
