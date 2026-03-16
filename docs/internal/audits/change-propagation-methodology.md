# Change Propagation Analysis - Methodology

Version: 1.0
First applied: 2026-03-16 (The Pit, results in change-propagation-phase{1-4}.md)
Author: Weaver
Purpose: Reusable instruction set for analysing how change moves through any codebase

---

## What This Is

A structured methodology for producing an architectural map of a codebase from the perspective of change propagation. The output tells a lead engineer: here is how change actually moves through this system, here is where the mechanisms are consistent, here is where they are not, here is what breaks next, and here is what was deliberately chosen.

This is a read-only analysis. It produces a map, not changes. Changes come after the human has reviewed and prioritised the findings.

## When To Use

- Before a major feature that crosses multiple modules
- When onboarding to an unfamiliar codebase
- When "nobody knows how this works" and the architecture has drifted from the intended design
- Periodically (quarterly or after major refactors) to detect accumulated drift

## Estimated Cost

First run on a mid-sized monolith (50-100 source files, 20 API endpoints): 60-90 agent-minutes. Subsequent runs on the same codebase with incremental changes: 20-30 agent-minutes (skip Phase 1 if recent, re-trace only changed paths).

---

## Phase 1: Structural Inventory

**Goal:** Establish the terrain before tracing any paths.

### 1.1 Module Boundary Map

1. List every top-level module, service, or bounded context. In a monorepo this is typically directories; in a microservice architecture this is services.

2. For each module, identify:
   - **What it owns:** data (tables, state), behaviour (business logic), presentation (UI)
   - **What it exposes:** exported functions, API endpoints, types, event emitters
   - **What it consumes:** imports from other modules, DB connections, external service calls

3. Build a dependency graph from actual imports/requires. Use a tool or grep for import statements. Flag circular dependencies explicitly - they indicate coupling that cannot be broken without refactoring.

4. Classify each module boundary:
   - **Tight coupling:** direct imports of internals (raw schema types, private functions, implementation details)
   - **Interface coupling:** imports of defined contracts (exported types, public API, documented interfaces)
   - **Decoupled:** event/message based, separate runtimes, or no direct code dependency

5. Identify the highest fan-in nodes (most depended upon) and highest fan-out nodes (depend on the most). These are the system's structural bottlenecks.

**Output format:** Table of modules with ownership/exposure/consumption. Dependency graph (text or diagram). Coupling classification per boundary. Fan-in/fan-out ranking.

### 1.2 State Inventory

1. Identify every location where persistent or session state lives:
   - Databases (tables, columns, relationships, indexes)
   - Caches (in-memory, Redis, CDN, framework-level like ISR)
   - Client-side (useState, context, localStorage, sessionStorage, cookies)
   - Configuration (env vars, config files, feature flags)
   - Cross-runtime (files shared between different language runtimes)

2. For each state location, document:
   - **Who writes:** which files/functions mutate this state
   - **Who reads:** which files/functions consume this state
   - **Source of truth:** is this the canonical location, or a derived copy?
   - **Sync mechanism:** if derived, how is it kept consistent with the source?

3. Flag:
   - State duplicated across boundaries without a sync mechanism
   - Dead state (tables/fields with no active readers or writers)
   - State that only a human can verify is consistent (manual sync required)

**Output format:** Table per state category. Source-of-truth topology diagram if multiple state locations exist.

### 1.3 API Surface Catalogue

1. For each module boundary, list the exposed interface:
   - Exported functions (with signatures if feasible)
   - API endpoints (method, path, auth, rate limiting, DB access, external calls)
   - Event emitters or pub/sub topics
   - Shared types and schemas

2. Assess leakage:
   - Are internal implementation details visible across the boundary? (e.g., raw DB schema types imported by consumers)
   - Is there a module whose public surface is effectively "everything" (no barrel file, no encapsulation)?
   - Are there well-encapsulated boundaries worth preserving?

3. Document the cross-cutting patterns:
   - Common infrastructure (logging, validation, error handling)
   - Shared middleware or request/response wrappers
   - Consistent vs inconsistent patterns across endpoints

**Output format:** Table of endpoints/exports with auth/rate-limit/DB columns. Leakage assessment per boundary.

---

## Phase 2: Change Propagation Tracing

**Goal:** Trace how specific user actions propagate through the system, hop by hop.

### Selection

Choose 5-8 representative user-facing actions that:
- Cross the most module boundaries (reveals architecture)
- Exercise the critical data-writing paths (reveals failure modes)
- Include the system's core product action (the thing users are here to do)
- Include at least one async/event-driven path if one exists
- Include at least one external integration (payment, API, webhook)

Good selections often include: the core user action, user registration/onboarding, payment/billing, a read-heavy page with caching, a real-time feature, an admin operation.

### Trace Protocol

For each selected action, start from the user-facing entry point and follow the change through every layer. At each hop, record:

```
HOP N:
  From: [origin - file, function, line if possible]
  To: [destination - file, function, line if possible]
  Mechanism: [one of the categories below]
  Boundary crossed: [yes/no - which modules]
  Failure mode: [silent | logged | surfaced | cascading]
  Ordering assumption: [describe or "none"]
  Notes: [anything notable]
```

**Mechanism categories:**
- **Direct mutation:** State changed in place (DB UPDATE/INSERT, object modification, variable reassignment)
- **Event propagation:** Signal emitted for subscribers (DOM events, custom events, pub/sub, webhooks, SSE)
- **Request-response:** Synchronous call with return value (HTTP request, function call, DB query)
- **Derived computation:** Value recomputes from changed inputs (React re-render, computed property, reactive subscription, ISR revalidation)
- **Schema migration:** Structure itself changes, not just data

**Failure mode categories:**
- **Silent:** Error is swallowed or ignored; no log, no user feedback
- **Logged:** Error is logged but not surfaced to the user
- **Surfaced:** Error reaches the user with a meaningful message
- **Cascading:** Error propagates to other systems (e.g., webhook returns 500, triggering retries)

### Trace Summary

After each trace, summarise:
- Total hops
- Unique mechanisms used
- Boundaries crossed (count and names)
- Consistency assessment: are the mechanism choices consistent and intentional?

### Depth Calibration

The traces should be deep enough to identify every DB write, every external service call, and every failure handling gap. If a hop delegates to a function that does 5 things, trace all 5. The value is in the completeness - a trace that skips "the function handles it" misses the architecture.

For large functions (500+ lines), note the line ranges for each logical phase rather than tracing every line.

---

## Phase 3: Pattern Analysis

**Goal:** Analyse across all traces to find systemic patterns.

### 3.1 Mechanism Consistency

For each module boundary, aggregate every mechanism used to cross it across all traces.

Flag boundaries where multiple mechanisms are used. Assess:
- **Intentional variation:** Different mechanisms for different reasons (e.g., server actions for navigation mutations, fetch for in-place mutations)
- **Accidental variation:** No clear rationale (e.g., same data loaded via fetch in one place and server action in another)

Identify the system's dominant propagation pattern. Name it: "primarily request-response," "primarily event-driven," "mixed with clear separation," or "mixed without clear rationale."

### 3.2 Smell Catalogue

Evaluate each smell. Report findings with specific file/function references. Not all smells apply to all systems - note "N/A" where appropriate.

| Smell | Description | Severity Guide |
|-------|-------------|----------------|
| **Cross-boundary direct mutation** | One module directly mutates another's state without a defined interface | High |
| **Inconsistent mechanism at same boundary** | Same boundary uses events in one place and function calls in another without reason | Medium |
| **Missing failure handling on change hops** | Change crosses a boundary with no handling for receiver failure | High for data-writing paths |
| **Implicit ordering dependencies** | Code assumes change A visible before change B with no guarantee | High |
| **Manual sync of derived state** | Value should be computed from source of truth but is manually updated in N places | Medium-High |
| **Event chains with no circuit breaker** | Event A triggers B triggers C with no depth limit or cycle detection | Medium |
| **Polling where subscription would serve** | Periodic check for changes that could be pushed | Low-Medium |
| **State duplication without sync strategy** | Same data in 2+ locations with no consistency mechanism | High |
| **God module** | One file/class with disproportionate fan-out, mixing multiple concerns | Medium-High |
| **Dead state** | Tables, columns, or state stores with no active readers or writers | Low |

For each finding: describe the smell, reference the specific files, assess severity, note whether it requires human judgment to determine if intentional.

### 3.3 Change Impact Projection

Select 3 plausible future requirements. Use the roadmap, backlog, or open issues if available. For each:

1. **Trace which modules change.** List files, new files needed, DB schema changes.
2. **Count boundaries and mechanisms.** How many module boundaries does the change cross? Does it need new mechanisms?
3. **Assess difficulty.** Easy (additive, follows existing patterns), Awkward (needs modifications to existing patterns), or Structurally Difficult (existing patterns actively obstruct).
4. **Identify obstructions.** Any current mechanism choice that would need to be replaced or worked around.

**Output format:** Table of requirements with difficulty ratings and primary friction description.

---

## Phase 4: Architectural Assessment

**Goal:** Synthesise findings into actionable output.

### 4.1 Health Summary

Produce a summary covering:

- **Dominant propagation pattern:** What is the system's primary way of expressing change? Is it appropriate for the domain and scale?
- **Boundary integrity score:** What proportion of boundaries are clean vs leaky? (Use a fraction, not a percentage.)
- **Failure resilience:** Across all traced hops, what proportion have adequate failure handling? Flag the gaps by category (silent, missing, cascading).
- **Change readiness:** Based on impact projection, how well does the architecture accommodate likely future requirements?

### 4.2 Prioritised Recommendations

List specific recommendations ordered by impact-to-effort ratio. For each:

- **Current state:** What exists now, with file references
- **Target state:** What it should become
- **Mechanism:** Whether the propagation mechanism changes or stays the same
- **Migration path:** How to get there (lines of code, files affected, risk level)
- **What breaks if unfixed:** Under what conditions the current state causes a problem

Be concrete. "Improve error handling" is not a recommendation. "Add try/catch to app/actions.ts:89-98 around the INSERT INTO bouts call" is.

### 4.3 Decision Log

For each inconsistency that turns out to be intentional, document:

- **What the tradeoff is**
- **Why it was made** (inferred or known)
- **Under what conditions it should be revisited**

This is the most important output for long-lived systems. It prevents future reviewers from "fixing" deliberate choices. Use the format: "This looks wrong, it is not wrong, here is why, revisit when X changes."

---

## Execution Notes

### Parallelism

Phase 1 can be parallelised across its 3 sub-phases (module map, state inventory, API surface). Use subagents or parallel tool calls.

Phase 2 traces can be partially parallelised - traces that touch disjoint code can run concurrently. Traces that share code (e.g., two actions that both go through the same engine) should be done sequentially to avoid redundant file reads.

Phase 3 and 4 are sequential and depend on all prior phases.

### File Reading Strategy

Read every file that appears in a trace. Do not infer what a function does from its name - read it. The value of this analysis is in the ground truth, not in assumptions. The methodology fails silently when a trace says "delegates to X" without reading X.

For large files (500+ lines), read in sections by logical phase. Note line ranges.

### Output Format

Write each phase as a separate file in the audit directory. This allows:
- Incremental review (the human can read Phase 1 while Phase 2 is in progress)
- Selective re-runs (re-run Phase 2 traces for changed code without redoing Phase 1)
- Stable references (other documents can cite "change-propagation-phase3.md, SMELL-04a")

### What This Does Not Cover

- **Performance profiling:** This methodology traces logical paths, not execution time
- **Security review:** This identifies failure handling gaps but does not assess authentication/authorisation design
- **Code quality:** This assesses architecture and propagation mechanisms, not code style or naming
- **Test coverage:** This identifies what should be tested based on failure modes but does not measure existing coverage

### Calibrating Depth

The depth should match the system's complexity. Signals that you need more depth:
- A trace says "delegates to X" and you do not know what X does
- A failure mode is listed as "unknown"
- An ordering assumption is listed as "assumed but not verified"

Signals that you have enough depth:
- Every DB write is identified with the specific table and operation
- Every external service call is identified with the specific API
- Every failure mode has a specific category (silent/logged/surfaced/cascading)
- Every ordering assumption is either verified or flagged as implicit

### Adapting to Different Architectures

**Monolith (like the first application):** Module boundaries are directories. State is usually a single database. The analysis focuses on internal module coupling and the data access layer.

**Microservices:** Module boundaries are services. State is distributed. The analysis focuses on inter-service communication mechanisms (REST, gRPC, events, queues) and consistency guarantees.

**Event-driven:** The smell catalogue shifts emphasis. "Event chains with no circuit breaker" and "implicit ordering dependencies" become primary concerns. "Cross-boundary direct mutation" may be rare.

**Serverless:** The state inventory gains importance. In-memory state is ephemeral. Caching layers are critical. Rate limiting across instances is a recurring concern.

---

## Results Index

| Date | Codebase | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|------|----------|---------|---------|---------|---------|
| 2026-03-16 | The Pit (thepit-v2) | change-propagation-phase1.md | change-propagation-phase2.md | change-propagation-phase3.md | change-propagation-phase4.md |
