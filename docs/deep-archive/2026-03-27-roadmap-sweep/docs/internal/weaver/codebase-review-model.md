# Codebase Review Model

> Provenance: Operator conversation 2026-03-16. Codified by Weaver.
> Decision: SD-328 [tech-debt-exposure]
> Purpose: Structured, repeatable codebase audit at multiple zoom levels.
> The Operator needs deeper exposure to implementation internals to make
> sound architectural and tech-debt decisions going forward.

---

## Premise

The Pit is 60k+ LOC directed into existence by the Operator via AI agents.
The Operator knows the intent behind every module intimately but may not
know every implementation detail. This is an extraordinary learning setup:
full context on the "why" paired with systematic discovery of the "how."

Technical debt is an ever-present threat to the future survivability of
this codebase. The Operator's ability to make the right choices - what to
keep, what to refactor, what to discard - depends on exposure to the
internals at a granularity that directing alone does not provide.

This review model is the mechanism.

---

## The Six Layers

Each layer is a repeatable pass. They can be run independently, revisited
as the codebase evolves, and each builds a different dimension of
engineering judgment. Ordered from highest altitude to lowest.

### L1: Dependency and Boundary Map

**Question:** What depends on what? Where are the module boundaries?

**Method:**
- Generate a dependency graph from imports across `app/`, `lib/`, `components/`, `shared/`, `db/`
- Map which modules know about which other modules
- Identify the fan-in/fan-out for each module

**What to look for:**
- Circular dependencies
- Modules that know too much about each other (high coupling)
- Anything that touches everything (god modules)
- Boundaries that exist in the directory structure but not in the import graph
- Boundaries that exist in the import graph but not in the directory structure

**Output:** Dependency map (visual or textual), list of boundary violations, coupling hotspots.

**Learning target:** Architectural intuition - knowing where the system is clean and where it is tangled without reading a single function body.

---

### L2: API Surface Audit

**Question:** For each module or service boundary, what is exposed vs what should be?

**Method:**
- For each module boundary identified in L1, catalogue the public API (exported functions, types, components)
- Compare against actual usage (who calls what)
- Identify exports that are only used internally (should be private)
- Identify internal functions that are used across boundaries (should be promoted or the boundary is wrong)

**What to look for:**
- Internal implementation details leaking into public interfaces
- Overly broad interfaces (exporting everything)
- The "could I replace this module without the rest knowing" test
- Type leakage - internal types appearing in external signatures

**Output:** Per-module surface audit, encapsulation violations, interface smell log.

**Learning target:** Encapsulation judgment at scale - not "is this variable private" but "could I swap this entire module."

---

### L3: Error Path Review

**Question:** What happens when things fail?

**Method:**
- Ignore the happy path entirely
- Trace error propagation from leaf functions to user-facing boundaries
- Check API routes against `lib/api-utils.ts` patterns
- Walk database operations for transaction handling and rollback behaviour
- Check external service calls (Neon, auth, any third-party) for timeout/retry/fallback

**What to look for:**
- Swallowed errors (catch blocks that log but do not propagate)
- Error types that change shape as they cross boundaries
- Missing error handling entirely (no try/catch around async operations)
- Error messages that expose internals to the user
- Inconsistent error response formats across API routes

**Output:** Error path map, list of swallowed/missing/inconsistent handlers, risk ranking.

**Learning target:** This is where AI-generated code is consistently weakest. LLMs optimise for the demonstrable case. Developing the instinct for "what happens when this fails" is the single highest-value defensive skill.

---

### L4: State Management Audit

**Question:** Where does state live? How many places can mutate it?

**Method:**
- Map all state sources: database, React state, URL params, cookies, local storage, server-side cache
- For each piece of user-visible data, trace the source of truth
- Identify where the same data exists in multiple places
- Check synchronisation mechanisms between state sources

**What to look for:**
- Multiple sources of truth for the same data
- State that can be mutated from too many places
- Stale state bugs (cache vs database divergence)
- Client state that should be server state (or vice versa)
- Derived state stored instead of computed

**Output:** State map, source-of-truth inventory, mutation surface per state item.

**Learning target:** Subtle bugs and scaling problems hide in state management. The instinct for "where does this data actually live and who can change it" is architectural bedrock.

---

### L5: Change Impact Analysis

**Question:** How does change propagate through the system?

**Method:**
- Select 3-5 likely future requirements (real ones from the backlog or roadmap, not hypothetical)
- For each: trace what files, modules, and boundaries would need to change
- Count the touch points
- Identify which changes are additive (new code) vs modificative (changing existing code)

**What to look for:**
- A single feature change that touches 6+ unrelated directories (shotgun surgery)
- Modificative changes that require understanding distant modules (high cognitive load)
- Changes that would require database migration (schema coupling)
- Changes that are blocked by the current architecture (inflexibility signals)

**Output:** Per-requirement change impact map, coupling score, flexibility assessment.

**Learning target:** The ability to reason about consequences at multiple timescales. "What happens to this when X changes" is the question that separates architectural judgment from implementation skill.

---

### L6: Slop Detection (Annotation Pass)

**Question:** What class of defect could hide in this shape?

**Method:**
- During any of the above passes, when a pattern matches a slopodar entry, annotate it in place
- Use structured comments that create a bidirectional reference web between the taxonomy and the code

**Annotation format:**

```
// @slop(<slopodar-id>) <brief description of what was spotted>
// ref: slopodar.yaml#<entry-name> | review: L<layer>
```

**Example:**

```typescript
// @slop(phantom-ledger) audit log writes but never verifies write success
// ref: slopodar.yaml#phantom-ledger | review: L3
```

**What to look for:** Apply the Watchdog staining checklist:

| Check | What to look for |
|-------|-----------------|
| Semantic hallucination | Comments or docstrings that claim behaviour the code does not implement |
| Looks-right trap | Code that follows the correct pattern but operates on the wrong handle, ref, or scope |
| Completeness bias | Each function correct in isolation but duplicated logic not extracted |
| Dead code | Error-handling paths copied from another context where they are unreachable here |
| Training data frequency | stdlib/API choices reflecting corpus frequency rather than current best practice |

**Cross-reference:** `docs/internal/slopodar.yaml` (49 entries), `docs/internal/watchdog/lessons-learned-blindspots.md`

**Output:** Annotated source files (comments in code), slop annotation log (TSV: date, file, line, slopodar_id, layer, description, commit).

**Learning target:** The naming is what converts exposure into transferable judgment. Every time you spot something off and articulate what the smell is and why, you are building engineering vocabulary that compounds. Without naming, you have intuition that works but cannot be examined or taught. With it, you have vocabulary that transfers to interviews, code reviews, and architectural discussions.

---

## Execution Guidance

**Sequencing:** L1 first (highest altitude, fastest orientation). L5 second (immediate interview value - "I know how change propagates through my system"). L3 third (highest defect yield in AI-generated code). L2, L4, L6 as the passes deepen.

**Tooling:** Each layer requires LLM assistance at every stage due to codebase magnitude. The Operator's role is decision-making at binary speed (yes/no on each finding) while the agent drives the analysis. The Operator touches every iteration.

**Cadence:** Each layer is a value stream. Gate at the end of each. Findings become both learning and portfolio evidence.

**Annotation accumulation:** L6 annotations accumulate across all passes. Over time they form a heat map of where probabilistic generation errors concentrate in the codebase. This heat map is itself a data product worth discussing in interviews.

---

## Relationship to Interview Preparation

This review model is not a return to building. It is a different mode of engagement with what was built. The Operator is doing a senior engineer's codebase audit on a system where they have full context on the "why" behind every module. That combination almost never exists.

The five non-slop layers map directly to interview competencies:
- L1 -> "describe your system's architecture"
- L2 -> "how do you think about encapsulation"
- L3 -> "how do you handle errors" / "tell me about a bug you found"
- L4 -> "how do you manage state at scale"
- L5 -> "how would you add feature X to your system"

The slop detection layer (L6) maps to: "how do you do code review" and "what do you look for in AI-generated code" - questions that are increasingly asked and rarely answered well.
