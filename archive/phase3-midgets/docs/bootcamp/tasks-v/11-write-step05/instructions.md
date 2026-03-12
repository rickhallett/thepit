# Task 11: Write - Step 5: State Management for Agents

**Type:** Write
**Depends on:** Tasks 01 (format), 02 (internal refs), 04 (external refs for Steps 5-6)
**Parallelizable with:** Tasks 07-10 (Tier 1 retrieval steps, different tier)
**Output:** `docs/bootcamp/step05-state-management.md`

---

## Objective

Write the full Step 5 content: "State Management for Agents." This is EMERGING - patterns
exist but conventions are still forming. This step's strongest asset is the project itself:
the file-based state architecture (AGENTS.md boot sequence, events.yaml, session-decisions,
.keel-state) is a worked example of deliberate state management.

Estimated target: 35-50k characters (~1000-1400 lines).

## Prime Context (load before writing)

1. `docs/bootcamp/tasks-v/01-research-format/findings.md` - format template
2. `docs/bootcamp/tasks-v/02-research-internal-refs/findings.md` - internal concepts (critical for this step)
3. `docs/bootcamp/tasks-v/04-research-state-external/findings.md` - external references
4. `docs/bootcamp/BOOTCAMP-V-OUTLINE.md` lines 373-443 - the Step 5 outline
5. Bootcamp I Step 3 reference: `docs/bootcamp/03-filesystem-as-state.md` (first 200 lines
   for cross-reference, not full content)

## Content Structure

### Mandatory Sections

1. **Why This is Step 5** - Frame: agents that forget everything between interactions are
   useful for one-shot tasks but useless for sustained work. State management is the
   difference between a demo agent and a production system. This step bridges Bootcamp I
   Step 3 (filesystem as state) to production agent state management.

2. **The state management spectrum** - From stateless to fully stateful:
   - Stateless: one-shot agent jobs (this project's polecat pattern). Fresh context
     every time. Deliberate choice, not limitation. When this is correct (deterministic
     pipelines, idempotent tasks).
   - Session state: within a single conversation or task. Dies when session ends.
   - Persistent state: across sessions. Survives session boundaries.
   - The spectrum is a design choice, not a progression from bad to good.

3. **The filesystem as state** - This project's approach, presented as a worked example:
   - AGENTS.md as boot state (loaded at session start, defines agent identity)
   - events.yaml as event log (append-only, structured, queryable)
   - session-decisions as decision chain (immutable history, SD-266)
   - .keel-state as runtime state (flock-protected, typed)
   - catch-log.tsv as control log (append-only, TSV for easy querying)
   - backlog.yaml as task tracking (structured, CLI-managed)
   - When filesystem state is sufficient: version-controlled, human-readable,
     no concurrent write contention. When it isn't: high concurrency, complex
     queries, large datasets.

4. **State categories** - A framework for thinking about what to persist:
   - Ephemeral state: within a single LLM call. The context window itself. Dies when
     the call ends. Never persist this (it's recreated each call).
   - Session state: conversation history, tool results, intermediate computations.
     Persist if sessions can be interrupted (network, timeout).
   - Persistent state: user preferences, learned patterns, accumulated knowledge.
     Must persist. Must have schema. Must have migration strategy.

5. **The durable write as policy** - SD-266 "write to durable file, not context only."
   Why this is a standing order: context window death means ephemeral state is permanently
   lost. No graceful degradation - binary, total loss. The write-ahead log pattern
   applied to agent state: write intent to durable storage before acting.

6. **State backends** - For each: what it is, when to use, tradeoffs:
   - Files (simple, version-controlled, human-readable) - this project's choice
   - SQLite (structured, queryable, single-file, WAL mode for concurrent reads)
   - Redis (fast, ephemeral by default, shared across processes, TTL for session state)
   - Postgres (durable, scalable, relational, pgvector for embeddings in same db)
   - Choosing: existing infrastructure, query complexity, concurrency needs

7. **State schema design** - What to persist and what to let die:
   - Persisting everything is expensive and creates noise
   - Persisting nothing creates amnesia
   - The working set concept applied to state: what is the minimum state for correct
     behaviour? (Novel framing from this project)
   - Schema evolution: what happens when state shape changes between versions?

8. **Concurrency and state** - Multiple agents accessing shared state:
   - File locking (flock, as used by .keel-state) - simple, works for single-host
   - Optimistic concurrency (version numbers, compare-and-swap) - works for databases
   - Event sourcing as alternative to mutable state: append events, derive current
     state by replay. Never conflicts because appends don't conflict.
   - events.yaml as a project-level event sourcing example

### Project Vocabulary Integration

- **Working set** (Denning 1968) applied to state: minimum state for correct behaviour
- **Compaction loss** - context window death destroying ephemeral state
- **Checkpoint recovery** (dead-reckoning.md) - navigate from last known position
- **One-shot agent job** - stateless as deliberate architectural choice
- **SD-266** - "write to durable file" as state management policy
- **Stale reference propagation** - stale state file producing wrong agent behaviour

### Exercises

- **State architecture analysis** (medium) - Map every durable state file in this project.
  For each: what state does it hold? Update pattern? What happens if lost?

- **Session state implementation** (medium-hard) - Agent processes 5 sequential tasks,
  each building on previous result. Store state in (1) file, (2) SQLite. Compare: ease
  of implementation, queryability, crash recovery.

- **State schema design** (hard) - Design state schema for a customer service agent:
  what persists across sessions (customer history), within session (conversation context),
  and what is ephemeral (current tool call)?

## Quality Constraints

- No emojis, no em-dashes
- 2 spaces indentation in code blocks
- The project's file-based state is presented as a legitimate architectural choice,
  not as "we should have used a database"
- Honest about when files are sufficient and when they aren't
- Code examples: Python with SQLite, file operations, and conceptual Redis/Postgres
- Build on Bootcamp I Step 3 (filesystem as state) - reference, extend, don't repeat
