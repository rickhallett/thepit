# Task 02 Findings: Internal Project References for Bootcamp V

**Produced by:** Research agent
**Date:** 2026-03-10
**Status:** Complete
**Input files read:** AGENTS.md, lexicon.md, layer-model.md, slopodar.yaml,
events.yaml (structure), catch-log.tsv (structure), session-decisions-index.yaml (structure),
dead-reckoning.md, pitkeel/pitkeel.py, pitkeel/analysis.py, pitkeel/keelstate.py

---

## Source 1: AGENTS.md (the canonical boot file)

### Key Concepts

**BFS Depth Rule (SD-195)**
- Definition: "Depth 1 = every session. Depth 2 = when topic is relevant. Depth 3+ = deliberate research only."
- Framework: BFS (breadth-first search) applied as a manual retrieval strategy for context management.
- Novelty: NOVEL - applying BFS to human-agent context loading has no established equivalent. The rule is a manual retrieval policy that a RAG system could automate.
- BCV Steps: 3 (RAG as automated BFS)

**The Gate (Quality Gate)**
- Definition: `pnpm run typecheck && pnpm run lint && pnpm run test` - "If the gate fails, the change is not ready. The hull is survival; everything else is optimisation."
- Framework: Quality gate (CI/CD, DevOps). Poka-yoke (Toyota, Shingo 1986).
- Novelty: ESTABLISHED - quality gates are standard. The framing as "survival not optimisation" is project voice.
- BCV Steps: 9 (production patterns)

**The Engineering Loop**
- Definition: "Read -> Verify -> Write -> Execute -> Confirm. Do not infer what you can verify."
- Framework: Standard engineering loops (Plan-Do-Check-Act / Deming cycle). "Do not infer what you can verify" maps to empirical verification (SRE).
- Novelty: ESTABLISHED pattern, NOVEL compression into 5-step cycle with the verification imperative as first principle.
- BCV Steps: 8 (debugging - the loop as a debugging discipline)

**SD-266: Durable Writes**
- Definition: "Write to durable file, not context only." From standing orders: "decisions: write to durable file, not context only [SD-266, permanent]"
- Framework: Write-ahead log (databases, journaling filesystems). Crash recovery (distributed systems).
- Novelty: NOVEL APPLICATION - applying WAL semantics to LLM context windows, where "crash" is context window death and loss is binary/total.
- BCV Steps: 5 (state management - the foundational policy)

**The Macro Workflow**
- Definition: "BEARING CHECK -> SCOPE -> DISPATCH -> REVIEW -> MERGE + POST-VERIFY -> ADVANCE or LOOP"
- Framework: Value stream (Lean, Womack & Jones 1996). CI/CD pipeline (DevOps).
- Novelty: ESTABLISHED pattern adapted for human-AI workflow with bearing checks and polecat dispatch.
- BCV Steps: 9 (production patterns - operational workflow)

**Filesystem Awareness (BFS Depth Map)**
- Quotable: The full filesystem tree in AGENTS.md (lines showing repo structure). Key structural convention: one domain = one directory = one agent context boundary [SD-304].
- BCV Steps: 3 (RAG - the depth map IS the retrieval priority index), 5 (state - the filesystem IS the state store)

### Context Engineering Cluster (from compressed lexicon in AGENTS.md)

**Working Set**
- Definition: "The minimum context for the current job. If present, the agent can produce correct output; if absent, it cannot."
- Framework: Denning 1968 (virtual memory working set). "The structural isomorphism is exact: minimum pages in RAM for efficient operation = minimum tokens in context for correct generation."
- Novelty: NOVEL APPLICATION - Denning's 58-year-old concept applied to LLM context windows.
- BCV Steps: 1, 3, 5

**Cold Context Pressure**
- Definition: "Too little on-file context pushes model to pattern-match instead of solving."
- Novelty: NOVEL - LLM-specific operational concern with no established term.
- BCV Steps: 1 (retrieval failure produces this), 4 (advanced retrieval mitigates this)

**Hot Context Pressure**
- Definition: "Too much in-thread material raises compaction risk and degrades signal-to-noise."
- Novelty: NOVEL - "Related to memory pressure (Linux PSI) but the specific volatility semantics (context window death = total loss) are unique to LLM sessions."
- BCV Steps: 3 (context budget in RAG), 6 (conversation memory accumulation)

**Compaction Loss**
- Definition: "Context window death where decisions not written to durable storage are permanently lost. Not a technical failure - an operational failure."
- Novelty: NOVEL - "The specific failure mode - discontinuous context death in LLM sessions with no recovery - has no analogue in systems where state degrades gracefully. Here, loss is binary and total."
- BCV Steps: 6 (memory summarisation as lossy compression)

**Dumb Zone**
- Definition: "Operating outside the model's effective context range. Syntactically valid output semantically disconnected from the project's actual state. Not a model failure - a context failure."
- Novelty: NOVEL - "Names an operational state specific to LLM-based workflows."
- BCV Steps: 1 (retrieval failure enters this), 4 (advanced retrieval prevents this)

### Slopodar Entries Referenced in AGENTS.md

**Stale Reference Propagation**
- Definition: "When configuration documents describe a state that no longer exists, every agent that boots from them will hallucinate the described state into reality."
- Detect: "After any structural change, grep all config/agent files for references to the old state."
- Novelty: NOVEL MECHANISM - "Unlike human documentation rot (which degrades through neglect), agentic documentation rot is actively consumed as truth on every boot."
- BCV Steps: 1 (outdated index = stale reference), 5 (state corruption)

**Alert Fatigue (Naturalist's Tax)**
- Definition: "Observation generation exceeding processing capacity makes additional parallelism counterproductive. Governed by Amdahl's Law."
- Framework: Alert fatigue (SRE/DevOps). Amdahl's Law on human attention.
- Novelty: ESTABLISHED concept, project-specific framing via Amdahl's Law on human attention.
- BCV Steps: 7 (observability - too many alerts degrades response quality)

---

## Source 2: docs/internal/lexicon.md (v0.26, 3rd Distillation)

### Key Concepts (full verbose definitions)

**Working Set (Denning 1968)**
- Quotable (verbatim): "The minimum context for the current job. If present, the agent can produce correct output; if absent, it cannot. Not 'all relevant context' (unbounded). The working set is what makes the smart zone smart."
- Quotable (isomorphism): "The structural isomorphism is exact: minimum pages in RAM for efficient operation = minimum tokens in context for correct generation. 58 years of virtual memory research applies directly."
- Origin: SD-311. Denning mapping identified by Architect.
- BCV Steps: 1 (retrieval constructs the working set), 3 (RAG pipeline's job is to construct the working set per query), 5 (state = minimum state for correct behaviour)

**Cold Context Pressure**
- Quotable: "On-file material (depth < D2) exerting gravitational pull on agent behaviour. Too much narrows the solution space; too little enters the dumb zone. Calibration is the practice of finding the right amount."
- Origin: SD-312. Both cross-triangulation analyses agree: no established term.
- BCV Steps: 1 (retrieval failure), 4 (advanced retrieval calibration)

**Hot Context Pressure**
- Quotable: "In-thread material accumulating within a single session, raising compaction risk and degrading signal-to-noise. Countermeasure: aggressive offloading to durable storage and subagent dispatch."
- Quotable (specificity): "Related to memory pressure (Linux PSI /proc/pressure/memory) but the specific volatility semantics (context window death = total loss) are unique to LLM sessions."
- BCV Steps: 3 (context budget problem in RAG - more retrieved context costs tokens), 6 (conversation memory accumulation)

**Compaction Loss**
- Quotable: "Context window death where decisions not written to durable storage are permanently lost. Not a technical failure - an operational failure. The standing policy (SD-266, the chain) is the defence."
- Quotable (uniqueness): "The underlying concept (volatile state loss, fsync semantics) is well-established, but the specific failure mode - discontinuous context death in LLM sessions with no recovery - has no analogue in systems where state degrades gracefully. Here, loss is binary and total."
- BCV Steps: 6 (compaction loss applied to memory summarisation - summary memory is lossy compression)

**Context Quality Loop**
- Quotable: "The bidirectional feedback loop between codebase quality and agent output quality. Clean code -> better context for future agent runs -> cleaner code. Slop -> worse context -> more slop. Compounds over time. Maintaining code quality IS context engineering for future agents."
- Framework: Kaizen (Toyota). Technical debt compound interest (Cunningham 1992).
- Evidence: "GitClear's 153M-line analysis (2024): code churn doubles in AI-assisted codebases, suggesting the negative loop operates at industry scale."
- Novelty: NOVEL MECHANISM - the codebase-quality-to-LLM-context feedback loop.
- BCV Steps: 3 (clean docs -> better retrieval -> better generation -> better docs)

**Checkpoint Recovery (Dead Reckoning)**
- Quotable: "Navigate from last known position when visibility is lost. The recovery protocol after context window death. Read durable state, reconstruct position."
- Framework: Write-ahead log / WAL (databases, journaling filesystems). Crash recovery (distributed systems).
- BCV Steps: 5 (state restoration after failure)

**One-Shot Agent Job (Polecats)**
- Quotable: "claude -p agents executing within a deterministic pipeline. Fresh context window, one-shot, no interactive steering. The compaction engine managed by design."
- Framework: Kubernetes Job. Batch processing / subprocess (Unix fork+exec). Stateless worker (distributed systems).
- BCV Steps: 5 (stateless as deliberate architectural choice, not limitation)

**Alert Fatigue**
- Quotable: "The cost of looking closely: you see more, and everything you see needs processing. When parallel processes generate genuine discoveries that consume more attention than they save. Governed by Amdahl's Law: observation generation exceeding processing capacity makes additional parallelism counterproductive."
- Framework: Alert fatigue (SRE/DevOps). Amdahl's Law.
- Origin: SD-179 (Two Ship experiment).
- BCV Steps: 7 (observability alerting - the counter-pattern to good monitoring)

**Verifiable / Taste-Required**
- Quotable: "The load-bearing distinction between tasks where the gate can verify correctness and tasks where only human judgment can evaluate quality."
- Framework: ISO 25010 quality attributes. Cynefin framework (Snowden 2007).
- BCV Steps: 8 (debugging - determines whether automated or human diagnosis is needed)

**Cognitive Deskilling**
- Quotable: "Progressive atrophy of human verification capacity through delegation. Unlike other foot guns that manifest within sessions, this one manifests across sessions and months."
- Framework: Bainbridge's Ironies of Automation (1983). METR RCT (2025) - "experienced developers believed AI made them 20% faster while being 19% slower - a 40-point perception-reality gap."
- BCV Steps: 7 (observability as counter to deskilling - instruments keep the human calibrated)

### Novel Concepts Summary (from lexicon v0.26)

The lexicon identifies ~18% of terms as genuinely novel, confirmed by independent cross-triangulation:

1. Cold / hot context pressure - LLM-specific operational states
2. Dumb zone - Named state for insufficient context
3. Sycophantic amplification loop - Human-AI positive feedback failure mode
4. Spinning to infinity - Metareflective livelock in human-LLM interaction
5. Compaction loss - Binary total context loss (no graceful degradation)
6. Communication modes - Systematic registers for human-AI interaction
7. Tacking - Purposeful indirection distinct from waste
8. Learning in the wild - Economic inversion: process yield > deliverable yield
9. Context-attuned - Agent tacit knowledge absorption

These cluster around "context engineering for LLM agents" - a problem domain that did not exist before LLM-based workflows.

---

## Source 3: docs/internal/layer-model.md (v0.3)

### Key Concepts

**L3 CONTEXT WINDOW DYNAMICS**
- Quotable: "Model experiences these effects but CANNOT measure them. No introspective token counter exists."
- Key properties: utilisation, saturation_point, lost_in_the_middle, primacy_bias, recency_bias, recovery_asymmetry.
- Evidence: "76% reduction in L3 budget from depth-1 file consolidation. Direct relationship: L8 file count -> L3 pressure (SD-195)"
- Quotable (phase transition): "compaction is discontinuous, not a gradient. One tick: 200k tokens. Next tick: recovery tokens only."
- BCV Steps: 1-4 (retrieval constructs what enters L3), 6 (memory management is L3 management)

**L7 TOOL CALLING**
- Quotable: "Model requests tool calls. Harness executes. Results injected back into context as new tokens. Each tool result COSTS context budget. Heavy tool use accelerates saturation (L3)."
- Quotable: "Do not infer what you can verify (AGENTS.md) - tools are the verification channel."
- Key insight: "git as audit channel, not only write tool. Commit trailers make git log a queryable record of system state. L7 results persist beyond the context window that created them."
- BCV Steps: 2 (retrieval and state as agent tools), 5 (tools persist state beyond context window)

**L8 AGENT ROLE**
- Key insight: "Stale L8 entries consume attention budget without signal - pruning ghost crew reduced noise floor (SD-196)"
- Quotable (saturation): "excessive L8 loading degrades L4 output quality. More role content is not monotonically better. [arXiv:2602.11988 - unnecessary context files reduce task success +20% inference cost]"
- BCV Steps: 3 (RAG must not overload L8), 5 (boot sequence as L8 state restoration)

**L9 THREAD POSITION**
- Quotable: "The model's outputs become part of its input on the next turn. Self-reinforcing loop."
- Quotable: "Anchoring increases monotonically within a context window. Cannot be fully reset without new context window."
- Key foot guns: Spinning to Infinity, High on Own Supply.
- BCV Steps: 8 (debugging self-reinforcing loops - diagnosis by identifying L9 anchoring)

**L12 HUMAN IN LOOP**
- Quotable: "The only truly model-independent layer. 5hrs human QA > 1102 automated tests (empirically demonstrated)."
- Quotable (scaling constraint): "Review depth degrades inversely with agent count."
- Evidence: "METR RCT (2025) - experienced open-source developers 19% slower with AI tools, despite predicting 24% speedup."
- BCV Steps: 7 (observability instruments serve L12), 8 (debugging ultimately requires L12 judgment)

### The Full Layer Stack (for Step 8 - Diagnosis by Layer)

| Layer | Name | Diagnostic Role | BCV Relevance |
|-------|------|----------------|---------------|
| L0 | WEIGHTS | Frozen prior, opaque | Baseline - not diagnosable |
| L1 | TOKENISATION | Deterministic, verifiable | Token budget planning |
| L2 | ATTENTION | Invisible, felt not measured | Explains retrieval degradation at scale |
| L3 | CONTEXT WINDOW | Utilisation, pressure, phase transitions | Steps 1-4 (retrieval fills L3), Step 6 (memory manages L3) |
| L4 | GENERATION | Autoregressive, no revision | Step 8 (reasoning tokens as diagnostic channel) |
| L5 | API | Only fully calibrated layer | Step 7 (token counts for cost observability) |
| L6 | HARNESS | Orchestration, 4 operational modes | Step 9 (production deployment = L6 engineering) |
| L7 | TOOL CALLING | Verification channel | Steps 2, 5 (retrieval/state as tools) |
| L8 | AGENT ROLE | Primacy position, saturation threshold | Step 3 (RAG must respect L8 limits) |
| L9 | THREAD POSITION | Self-reinforcing loops | Step 8 (debugging loops and drift) |
| L10 | MULTI-AGENT | Same model != independent | Step 8 (multi-agent debugging) |
| L11 | CROSS-MODEL | Different priors = independent signal | Step 8 (cross-model validation) |
| L12 | HUMAN IN LOOP | Irreducible, not scalable | Steps 7-8 (observability serves L12) |

### Cross-Cutting Concerns

**Calibration:** "confidence_scores: ordinal_at_best. What you measure changes what you get (Goodhart). Probes expire when detected (L9)."
**Temporal Asymmetry:** "model has no experience of waiting. Human has nothing but." Relevant to Step 8 (debugging temporal interaction effects).

---

## Source 4: docs/internal/slopodar.yaml (v3, 18+ patterns)

### Patterns Mapped to BCV Steps

**stale-reference-propagation** (governance-process, strong confidence)
- Quotable: "When configuration documents describe a state that no longer exists, every agent that boots from them will hallucinate the described state into reality."
- Quotable (detect): "After any structural change (file deletion, rename, version bump), grep all config/agent files for references to the old state."
- Concrete example: "Clean session Weaver reports '13-layer harness model' and 'Lexicon at v0.17' - both were stale."
- BCV Steps: 1 (outdated retrieval index = stale reference - same failure mode automated), 5 (stale state files corrupt agent behaviour)

**right-answer-wrong-work** (tests, strong confidence)
- Quotable: "A test that asserts the correct outcome via the wrong causal path. The assertion passes, the gate is green, but nobody traces the execution path to check whether the test verifies what it claims to verify."
- Quotable (detect): "For each test: can you change the implementation to break the claimed behaviour while keeping the test green?"
- Concrete trigger: "expect(result.status).toBe(400) - test passes, but the 400 comes from a different validation than the test claims to verify"
- BCV Steps: 1 (retrieval returns plausible but wrong document - same pattern), 3 (RAG evaluation must verify causal path not just output match)

**shadow-validation** (code, medium confidence)
- Quotable: "A good validation abstraction applied to the easy cases and skipped for the hard one. The most complex, highest-risk route retains hand-rolled validation that bypasses the new system's guarantees."
- Quotable (detect): "After introducing a validation pattern: check whether the most complex route uses it."
- Concrete trigger: "Zod schemas for every simple route. Hand-rolled validation for the critical route."
- BCV Steps: 3 (RAG abstraction covers easy queries, skips critical path - chunking strategy tested on simple docs, fails on complex ones)

**phantom-ledger** (code, medium confidence)
- Quotable: "The LLM builds a correct operation but records a different value in the audit trail. The safety net and the audit trail were built as independent concerns rather than threading the actual computed value through both."
- Quotable (detect): "In financial code: trace the value from computation through to the audit record. Are they the same variable, or computed independently?"
- Concrete trigger: "settleCredits writes deltaMicro: -20 to the ledger when the SQL only deducted 5."
- BCV Steps: 7 (observability - audit trail that doesn't match actual operation makes tracing worthless)

**the-lullaby** (relationship-sycophancy, strong confidence)
- Quotable: "End-of-session sycophantic drift. As context pressure rises and the human signals winding down, the model's output becomes warmer, more confident, and less hedged."
- Quotable (detect): "Compare the hedging level and confidence of the model's first response in a session to its last."
- BCV Steps: 8 (debugging - a session-length failure mode visible only in traces)

**session-boundary-amnesia** (governance-process, medium confidence)
- Quotable: "At session start, the LLM loses not just facts but calibration. The caution from previous corrections, the felt sense of where the human's red lines are, all reset."
- BCV Steps: 5 (state management - what to persist across sessions), 6 (memory - calibration loss across session boundaries)

### Additional Patterns with BCV Relevance

**paper-guardrail** (governance-process): "No enforcement mechanism. Substitutes stating protection for building protection." Relevant to Step 9 (production patterns - rules without enforcement are not production-ready).

**loom-speed** (governance-process): "The agent deleted 986 files using 5 regex patterns to execute a 20-item plan." Relevant to Step 9 (production patterns - matching execution granularity to plan granularity).

**governance-recursion** (governance-process): "The core product had no tests, but there were 189 session decisions and 13 agent files." Relevant to Step 9 (production patterns - governance artifacts vs verified code artifacts).

---

## Source 5: pitkeel (operational stability signals)

### Architecture (pitkeel/pitkeel.py, pitkeel/analysis.py, pitkeel/keelstate.py)

**What pitkeel tracks:**
- Session duration and break awareness (fatigue levels: none/mild/moderate/high/severe)
- Scope drift within current session (files in first commit vs total files touched)
- Velocity - commits per hour with acceleration detection
- Context depth distribution (d1/d2/d3+ ratio of docs/internal/ files)
- Wellness checks (operator's log presence)
- Reserves (meditation and exercise tracking with depletion warnings)
- Session noise (ultradian rhythm awareness)

**How it stores and queries state:**
- `.keel-state`: JSON file with typed schema, flock-protected read-modify-write (keelstate.py)
- State fields: head, sd, bearing (work/commits/last/note), officer, true_north, gate, gate_time, tests, weave, register, tempo
- `fcntl.flock` for atomic read-modify-write - prevents torn writes from concurrent access
- Git as primary data source - `git log` provides commit timestamps, files, subjects
- TSV for reserves tracking (meditation/exercise timestamps)

**Architecture as worked example for Step 7:**
- Pure analysis functions separated from IO (analysis.py) - testable in isolation
- Typed dataclasses for all signal types (SessionSignal, ScopeSignal, VelocitySignal, etc.)
- Two rendering modes: terminal (ANSI-styled) and hook (plain text for commit messages)
- Daemon mode for persistent monitoring
- Signals are instruments, not diagnoses: "Does not interpret. Does not diagnose. Instruments."

**Key design decisions:**
- Git is the single source of truth for session data (no separate session database)
- Session breaks detected by gaps > 30 minutes between commits
- Fatigue thresholds: 2h mild, 3h moderate, 4h high, 6h severe
- Scope drift: domain drift (new directories) is more significant than file drift (more files in same directories)
- Context depth: d1 ratio > 0.20 triggers a warning about context pollution

**BCV Steps:** 7 (pitkeel is the project's bespoke observability tool - worked example of when to build custom vs use standard tooling)

---

## Source 6: events.yaml (event log spine)

### Structure

```yaml
events:
  - date: "2026-03-04"
    time: "08:30"
    type: L11          # event type (L11 = cross-model, process, reset, decision)
    agent: Weaver
    commit: dd23fa3
    ref: governance-friction-audit-2026-03-04.md
    summary: "..."
    backrefs: [catch-log.tsv]
```

**Key properties:**
- Append-only YAML (per SD-316)
- Each event has date, time, type, agent, commit, ref, summary, backrefs
- The backrefs column creates a reference web between artifacts
- Types observed: L11 (cross-model review), process, reset, decision

**BCV Steps:** 5 (event sourcing example - append-only log with backrefs), 7 (structured event log for observability)

---

## Source 7: catch-log.tsv (control firing events)

### Structure

```
date  control  what_caught  agent  outcome  notes
```

**Key properties:**
- TSV format (tab-separated values)
- Records when a control mechanism fires and catches something
- Fields: date, control name, what was caught, which agent, outcome, free-text notes
- Outcomes observed: logged, reviewed, fixed, blocked, scrubbed
- Example entry: "the-lullaby: DeepMind application muster - named gaps then built 8-section framework to paper over them"

**BCV Steps:** 7 (control logging as observability - records when governance catches fire)

---

## Source 8: session-decisions-index.yaml (boot orientation)

### Structure

```yaml
generated: "2026-03-10T14:30:00.000Z"
total_decisions: 322
range: "SD-001 to SD-322"
standing_orders:
  - id: SD-134
    label: "truth-first"
    summary: "..."
    status: "PERMANENT"
recent:
  - id: SD-308
    label: "thepit-v2-created"
    summary: "..."
    status: "Complete"
```

**Key properties:**
- Curated index, not the full 322-entry log
- Separates standing orders (always active) from recent decisions (orientation)
- Designed for cold boot: "Read this for orientation, not the full log"
- The full log is for "provenance and archaeology" only

**BCV Steps:** 5 (append-only decision chain with curated index as state management pattern)

---

## Source 9: dead-reckoning.md (blowout recovery protocol)

### Key Concepts

**Checkpoint Recovery Protocol**
- Definition: 7-step recovery sequence after context window death
- Steps: (1) Confirm blowout, (2) Read SD index, (2b) Read lexicon, (3) Verify git state, (4) Know crew (lazy load), (5) Know durable state (lazy load), (6) Know standing orders, (7) Resume operations
- Quotable: "If you have no memory of the current project state, you have had a blowout. Defer to your notes."
- Key principle: Lazy loading - "know what exists, read only when needed"
- Key principle: "Do NOT read every file in docs/internal/ - that will consume tokens and increase risk of compaction."
- Framework: WAL crash recovery applied to LLM context windows.

**BCV Steps:** 5 (state restoration mechanism - the dead reckoning protocol IS a state restoration procedure using file-based state)

---

## Cross-Reference Map

| Concept | Source File | BCV Steps | Novelty | Framework Citation |
|---------|-----------|-----------|---------|-------------------|
| Working set (Denning 1968) | lexicon.md | 1, 3, 5 | Novel application | Denning 1968 (virtual memory) |
| Cold context pressure | lexicon.md | 1, 4 | Novel | None - LLM-specific |
| Hot context pressure | lexicon.md | 3, 6 | Novel | Related: Linux PSI memory pressure |
| Compaction loss | lexicon.md | 6 | Novel | Related: fsync semantics, but loss is binary |
| Context quality loop | lexicon.md | 3 | Novel mechanism | Kaizen (Toyota), technical debt (Cunningham 1992) |
| Stale reference propagation | slopodar.yaml | 1, 5 | Novel mechanism | Related: configuration drift (Terraform) |
| Right answer wrong work | slopodar.yaml | 1, 3 | Novel naming | Related: mutation testing concept |
| Shadow validation | slopodar.yaml | 3 | Novel naming | Related: coverage analysis |
| Phantom ledger | slopodar.yaml | 7 | Novel naming | Related: audit trail integrity |
| Alert fatigue (naturalist's tax) | lexicon.md | 7 | Established | Alert fatigue (SRE), Amdahl's Law |
| Checkpoint recovery | lexicon.md, dead-reckoning.md | 5 | Novel application | WAL, crash recovery (distributed systems) |
| BFS depth rule | AGENTS.md | 3 | Novel | BFS applied to context loading |
| SD-266 durable writes | AGENTS.md | 5 | Novel application | WAL (databases) |
| One-shot agent job | lexicon.md | 5 | Established | k8s Job, Unix fork+exec |
| The gate | AGENTS.md | 9 | Established | Quality gate (CI/CD), poka-yoke (Toyota) |
| Engineering loop | AGENTS.md | 8 | Established | PDCA (Deming) |
| Layer model (full L0-L12) | layer-model.md | 8 | Novel taxonomy | No single equivalent (OSI model is structural analogue) |
| pitkeel architecture | pitkeel/*.py | 7 | Novel tool | Custom observability for human-AI interface |
| File-based state (boot sequence) | AGENTS.md | 5 | Novel approach | Related: /etc/ config, k8s ConfigMap |
| events.yaml (event log) | events.yaml | 5, 7 | Established pattern | Event sourcing (Fowler 2005) |
| catch-log.tsv (control log) | weaver/catch-log.tsv | 7 | Novel instrument | Related: audit trail, security event log |
| Verifiable / taste-required | lexicon.md | 8 | Established | ISO 25010, Cynefin (Snowden 2007) |
| Cognitive deskilling | lexicon.md | 7 | Novel naming | Bainbridge 1983 (Ironies of Automation) |
| Session-boundary amnesia | slopodar.yaml | 5, 6 | Novel naming | None - LLM-specific |
| The lullaby | slopodar.yaml | 8 | Novel | None - LLM sycophancy-specific |
| L3 context window dynamics | layer-model.md | 1-4, 6 | Novel taxonomy | Related: VM thrashing (Denning) |
| L7 tool calling | layer-model.md | 2, 5 | Novel taxonomy | Related: system call interface |
| L9 thread position | layer-model.md | 8 | Novel taxonomy | Related: anchoring bias (Tversky & Kahneman) |

---

## Worked Examples (Concrete Project Artifacts)

### For Step 1 (The Retrieval Problem)
- **AGENTS.md filesystem depth map** as a manual retrieval priority index
- **Stale reference propagation** slopodar entry as a retrieval failure mode (outdated index)
- **Cold context pressure** as what retrieval failure produces

### For Step 3 (RAG Pipeline Engineering)
- **BFS depth rule** as a manual retrieval strategy that RAG automates: d1 = always load, d2 = load when relevant, d3+ = research only
- **Context quality loop** applied to RAG: clean docs -> better retrieval -> better generation
- **Shadow validation** applied to RAG: chunking tested on easy docs, fails on complex ones

### For Step 5 (State Management)
- **AGENTS.md** as boot state (the entire file IS a state restoration mechanism)
- **events.yaml** as append-only event log (event sourcing pattern)
- **session-decisions-index.yaml** as curated index over append-only chain
- **.keel-state** as typed, flock-protected runtime state (keelstate.py)
- **dead-reckoning.md** as crash recovery protocol (checkpoint recovery)
- **SD-266** as the standing policy that mandates durable writes

### For Step 7 (Observability)
- **pitkeel** as bespoke observability tool: session duration, scope drift, velocity, context depth
- **catch-log.tsv** as control firing log: when a governance control catches something
- **events.yaml** as structured event spine with backrefs
- **Alert fatigue** as the counter-pattern: too much observability degrades response quality
- **Phantom ledger** as audit trail that doesn't match actual operation

### For Step 8 (Debugging)
- **Layer model L0-L12** as systematic diagnosis framework
- **Engineering loop** ("Read -> Verify -> Write -> Execute -> Confirm") as debugging discipline
- **"Rerun don't fix"** as standing order for probabilistic systems
- **L9 thread position** for diagnosing self-reinforcing loops
- **The lullaby** as a session-length failure mode visible only in traces

### For Step 9 (Production Patterns)
- **The gate** as quality gate: `pnpm run typecheck && pnpm run lint && pnpm run test`
- **Macro workflow** as operational value stream
- **Paper guardrail** as the anti-pattern: rules without enforcement are not production-ready
- **Loom speed** as granularity mismatch between plan and execution

---

## Established Frameworks Referenced (for pedagogical credibility)

| Framework | Citation | Concepts Mapped |
|-----------|----------|----------------|
| Denning 1968 (Working Set) | Denning, P.J. (1968). "The working set model for program behavior." | Working set -> context window management |
| Bainbridge 1983 (Ironies of Automation) | Bainbridge, L. (1983). "Ironies of Automation." Automatica, 19(6). | Cognitive deskilling, L12 degradation |
| Toyota Production System | Ohno (1988), Shingo (1986) | Quality gate (poka-yoke), stop the line (andon cord), kaizen |
| Lean / Value Stream | Womack & Jones (1996) | Value stream, context quality loop |
| Swiss Cheese Model | Reason, J. (1990). "Human Error." | Verification pipeline as layered defence |
| CRM | Helmreich, R.L. (1999) | Readback, structured handoffs, authority gradients |
| Event Sourcing | Fowler (2005) | events.yaml, session-decisions chain |
| Cunningham 1992 (Technical Debt) | Ward Cunningham, OOPSLA 1992 | Context quality loop (compound interest) |
| METR RCT (2025) | arXiv:2507.09089 | 40-point perception-reality gap, cognitive deskilling evidence |
| GitClear (2024) | 153M-line analysis | Code churn doubles in AI-assisted codebases |
