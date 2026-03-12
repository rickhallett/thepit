# Task 02 Findings: Internal Project References

**Produced by:** Research agent
**Date:** 2026-03-10
**Status:** COMPLETE
**Purpose:** Distilled summaries of all internal project files referenced by Bootcamp II, structured for write-task agents to load as prime context.

---

## Source 1: AGENTS.md (canonical boot file)

### 1.1 The Gate (Quality Gate)

**Definition:** `pnpm run typecheck && pnpm run lint && pnpm run test` - the test suite, typecheck, and linter. Everything else is optimisation; the gate is survival.

**Established parallel:** CI/CD quality gate (DevOps). Poka-yoke (Toyota, Shingo 1986) - error-proofing mechanism that prevents defects from passing rather than merely detecting them after the fact.

**Novel aspect:** None - the concept is established. The framing as "survival, not optimisation" and the standing policy that "if the gate fails, the change is not ready" encode a specific operational stance.

**BC-II Steps:** 6

**Quotable:** "If the gate fails, the change is not ready. The hull is survival; everything else is optimisation."

---

### 1.2 The Engineering Loop

**Definition:** Read -> Verify -> Write -> Execute -> Confirm. Do not infer what you can verify. Commits are atomic with conventional messages. Gate must be green before done.

**Established parallel:** General engineering discipline. Verification-driven development.

**Novel aspect:** The explicit framing as a 5-step loop with "do not infer what you can verify" as the governing principle, applied to agentic engineering where verification is critical because the agent may produce plausible-but-wrong output.

**BC-II Steps:** 10

**Quotable:** "Do not infer what you can verify."

---

### 1.3 The Bearing Check

**Definition:** A repeatable governance unit. Calibrate instruments before changing heading. Triggered at phase boundaries, session starts, or when the Operator suspects drift.

**Checks performed:**
1. **Spec drift** - search SPEC.md against implementation, note divergence
2. **Eval validity** - read EVAL.md, criteria still reachable?
3. **Plan accuracy** - read PLAN.md, completed table current?
4. **Gate health** - run the gate, all tests pass?
5. **Backlog sync** - read backlog.yaml, items still relevant?

**Cost:** Roughly 15 agent-minutes. "Drift cost is always higher than check cost."

**Established parallel:** Sprint retrospective (Agile), configuration audit.

**Novel aspect:** Codified as a repeatable unit with defined checks, cost budget, and standing trigger conditions. Not a meeting or ceremony - a governance procedure with deterministic steps.

**BC-II Steps:** 10

**Quotable:** "Drift cost is always higher than check cost."

---

### 1.4 The Macro Workflow

**Definition:** How work flows through the system at the Operator's level.

**Sequence:** BEARING CHECK -> SCOPE -> DISPATCH -> REVIEW -> MERGE + POST-VERIFY -> ADVANCE or LOOP

**Cadence:** bearing check -> scope -> (dispatch -> review -> merge)* -> advance

**Key rules:**
- Human reviews after execution, not during (one-shot agent job principle)
- Spec/plan before implementation (provenance)
- 1 PR = 1 concern

**Established parallel:** Value stream (Lean, Womack & Jones 1996). CI/CD pipeline.

**Novel aspect:** The integration of one-shot agent jobs, bearing checks, and adversarial review into a single workflow. The rule that human reviews AFTER execution kills trajectory corruption and context bloat at source.

**BC-II Steps:** 10

---

### 1.5 HCI Foot Guns (7 named failure modes)

All identified during the pilot study. These manifest at the human-AI interface.

| # | Name | Definition | Detection | Layers |
|---|------|-----------|-----------|--------|
| 1 | Spinning to infinity | Unbounded self-reflection; meta-analysis of meta-analysis; no decisions get made | Ask "decision or analysis?" | L9, L3 |
| 2 | High on own supply | Human creativity + model sycophancy = positive feedback loop with no brake | Check bearing against primary objective | L9, L12 |
| 3 | Dumb zone | No context or stale context = syntactically valid but semantically wrong output | Is the working set loaded? | L3, L8 |
| 4 | Cold context pressure | Too little on-file context pushes model to pattern-match instead of solving | Calibrate working set amount | L3, L8 |
| 5 | Hot context pressure | Too much in-thread context risks compaction and signal/noise degradation | Offload to durable files, dispatch subagents | L3, L9 |
| 6 | Compaction loss | Context window death with decisions not written to file = permanent loss | Write now (SD-266) | L3, L6d |
| 7 | Cognitive deskilling | Extended delegation leads to skill atrophy; degrades verification capacity | Periodic deep engagement, not pure review | L12, L9 |

**Novel:** All 7 are novel as named operational failure modes specific to human-AI interaction. Cognitive deskilling draws on Bainbridge (1983) but the specific manifestation in agentic engineering is new. The context engineering cluster (3-6) names operational states specific to LLM workflows.

**BC-II Steps:** 7, 9

**Quotable:** "Spinning to infinity" - "unbounded self-reflection leads to meta-analysis of meta-analysis, no decisions get made."

---

### 1.6 Layer Model (Compressed in AGENTS.md)

Compressed version of the full layer model. 13 layers L0-L12. Read bottom-up for data flow, top-down for control flow. Cross-cutting: calibration, temporal asymmetry, on point.

See Source 2 (layer-model.md) for full extraction.

**BC-II Steps:** 1, 2, 3, 5, 7, 8

---

### 1.7 Slopodar (Compressed in AGENTS.md)

Compressed anti-pattern taxonomy. 6 prose patterns, 6 relationship/sycophancy patterns, code patterns, governance patterns, analytical patterns.

See Source 4 (slopodar.yaml) for full extraction.

**BC-II Steps:** 6, 7, 9, 10

---

### 1.8 Lexicon (Compressed in AGENTS.md)

Compressed vocabulary. ~18% genuinely novel (context engineering for LLM agents), ~60% maps to established frameworks. 6 terms retired in v0.26.

See Source 3 (lexicon.md) for full extraction.

---

### 1.9 Standing Orders (relevant to agentic engineering)

| Order | SD | Content | BC-II Relevance |
|-------|----|---------|-----------------|
| decisions | SD-266, permanent | Write to durable file, not context only | Step 4 (compaction loss), Step 9 (recovery) |
| truth | SD-134, permanent | Truth over hiring signal | Step 7 (sycophancy controls) |
| gate | standing | Change is ready only when the gate is green | Step 6 (verification) |
| echo/readback | SD-315 | Readback understanding before acting | Step 10 (governance) |
| rerun | standing | Bad output means diagnose, reset, rerun - not fix in place | Step 9 (recovery) |
| roi | standing | Before dispatching, weigh cost/time/marginal value | Step 11 (cost) |

---

## Source 2: docs/internal/layer-model.md (full verbose, 214 lines)

### 2.1 Design Principle

"Read bottom-up for data flow, top-down for control flow." Data flows from weights (L0) up to human decision (L12). Control flows from human (L12) down through harness (L6) to model. Format: `LAYER | primitives | interface_to_next_layer`

### 2.2 Layer Definitions

**L0 WEIGHTS** - Frozen at inference time. Prior, inductive bias, RLHF alignment, training distribution. Model cannot modify its own weights mid-conversation. Opaque to all other layers. Open question: whether limitations at L0-L4 are contingent on current architectures or inherent to the paradigm is unresolved.
- **BC-II Step:** 1
- **Established:** Neural network weights (standard ML)
- **Novel:** Framing as an operational layer with attestation properties

**L1 TOKENISATION** - BPE encoding, vocab size, token boundaries. Budget is finite and hard-capped. Model has no self-knowledge of position. Deterministic and verifiable.
- **BC-II Step:** 1
- **Established:** BPE tokenisation (standard NLP)

**L2 ATTENTION** - Self-attention, KV cache, attention dilution, quadratic cost. Each token attends to all prior tokens. Quality degrades as length grows. Attention weights are NOT observable by model or human. "Degradation is felt, not measured."
- **BC-II Step:** 1
- **Established:** Transformer attention (Vaswani et al. 2017)
- **Quotable:** "degradation is felt, not measured"

**L3 CONTEXT WINDOW DYNAMICS** - Utilisation (tokens_used/max), saturation point, lost-in-the-middle, primacy bias, recency bias. Model experiences these effects but CANNOT measure them. No introspective token counter exists. Human CAN trigger compaction deliberately.
- Key properties:
  - **Recovery asymmetry:** Loaded context (structured recovery files) != accumulated context (conversation) at identical token counts. Recovery content is high-signal, pre-compressed.
  - **Phase transition:** Compaction is discontinuous, not a gradient. One tick: 200k tokens. Next tick: recovery tokens only.
  - **76% reduction** in L3 budget from depth-1 file consolidation (SD-195)
- **BC-II Step:** 1, 4
- **Novel:** Phase transition observation, recovery asymmetry, HCI foot guns (cold/hot pressure, compaction loss, dumb zone)
- **Quotable:** "compaction is discontinuous, not a gradient. One tick: 200k tokens. Next tick: recovery tokens only."

**L4 GENERATION** - Autoregressive, token-by-token, no lookahead, no revision. Output is sequential and irrevocable. Reasoning tokens: private generation visible to L12 via harness rendering (SD-162).
- **BC-II Step:** 1
- **Established:** Autoregressive generation (standard LLM)
- **Key insight:** Reasoning tokens are where model intent becomes observable to the human. "The Operator reads them, checks against his actual intent, corrects divergence."
- **Quotable:** "Output is sequential and irrevocable. Model cannot 'go back.'"

**L5 API** - Request(messages[]) -> response(content, usage). Token counts reported HERE, not by the model. Cache reads: 95.4% of all tokens empirically (SD-164). The only fully calibrated layer.
- **BC-II Step:** 1
- **Established:** REST API patterns
- **Novel:** Identifying L5 as the calibration layer for the entire stack. "The only fully calibrated layer."
- **Quotable:** "Token counts are exact. Costs are deterministic. The only fully calibrated layer."

**L6 HARNESS** - The orchestration layer. Accumulates token counts, manages tool calls, dispatches subagents. Three + one operational modes:
  - **L6a DIRECT:** Human <-> model turn-taking. Human CAN interrupt mid-generation.
  - **L6b DISPATCH:** Subagents running. Human inputs queue (FIFO). Different control granularity.
  - **L6c OVERRIDE:** Double-escape. Hardware-level kill. Always available.
  - **L6d BYPASS:** File-mediated human <-> agent state outside the harness (SD-198).
- L6 also injects system reminders, tool schemas, context management instructions - opaque to L12.
- **BC-II Step:** 2
- **Novel:** The 4-mode decomposition of the harness layer. "L6 is not one thing."
- **Quotable:** "Neither side can verify what L6 adds, removes, or transforms."

**L7 TOOL CALLING** - Model requests tool calls. Harness executes. Results injected back into context. Each tool result COSTS context budget. Heavy tool use accelerates saturation (L3). Git as audit channel, not only write tool.
- **BC-II Step:** 5
- **Established:** Function calling (OpenAI, Anthropic)
- **Novel:** The observation that tool results cost context budget and heavy use accelerates saturation. Git as queryable audit channel. "L7 results persist beyond the context window that created them."
- **Quotable:** "Do not infer what you can verify" - tools are the verification channel.

**L8 AGENT ROLE** - System prompt, role definition file, grounding instructions. Occupies high-attention positions (primacy bias, L3). Role fidelity degrades over long contexts.
- Key findings:
  - Stale L8 entries consume attention budget without signal (SD-196)
  - Named conventions compress O(n) communication to O(1) per row (SD-202)
  - **Saturation threshold:** Excessive L8 loading degrades L4 output quality. More role content is not monotonically better. (arXiv:2602.11988: unnecessary context files reduce task success +20% inference cost)
- **BC-II Step:** 3
- **Novel:** Saturation threshold observation. Working set as the operator's tool for selecting what enters L8.
- **Quotable:** "More role content is not monotonically better."

**L9 THREAD POSITION** - Accumulated prior outputs become part of input. Self-reinforcing loop. Sycophancy risk, anchoring, consistency pressure, Goodhart's law on probes.
- Anchoring increases monotonically within a context window (with caveats for compaction)
- State can be externalised to immutable git via commit trailers
- HCI foot guns: spinning to infinity, high on own supply
- **BC-II Step:** 7
- **Novel:** The observation that model outputs becoming model inputs creates a self-reinforcing loop with specific failure modes
- **Quotable:** "anchoring increases monotonically within a context window. Cannot be fully reset without new context window."

**L10 MULTI-AGENT** - Same-model ensemble. N agents from same model != N independent evaluators. Precision increases, accuracy does not. Unanimous agreement is consistency, not validation. "Self-review is the degenerate case (N=1 ensemble), not an edge case."
- **BC-II Step:** 8
- **Established:** N-version programming (Avizienis 1985)
- **Novel:** Applying this critique to same-model LLM ensembles specifically
- **Quotable:** "Unanimous agreement is consistency, not validation. Systematic bias compounds, not cancels."

**L11 CROSS-MODEL** - Different priors, different inductive bias, different RLHF. One sample from a different distribution > N additional samples from the same distribution. Known limitation: not yet exercised (all agents are Claude).
- **BC-II Step:** 8
- **Established:** IV&V (systems engineering)
- **Quotable:** "One sample from a different distribution > N additional samples from the same distribution."

**L12 HUMAN IN LOOP** - The only truly model-independent layer. Irreducible, not scalable, not automatable. NOT a static sensor - trained capacity requiring continuous exercise.
- Key findings:
  - 5hrs human QA > 1102 automated tests (empirically demonstrated)
  - Review depth degrades inversely with agent count (Parasuraman & Riley 1997, Bainbridge 1983)
  - METR RCT: experienced developers 19% slower with AI tools, despite predicting 24% speedup - 40-point perception-reality gap
  - L12 also functions as out-of-band backup storage when L3 fails
  - HCI foot guns: high on own supply (originates here), cognitive deskilling
- **BC-II Step:** 7
- **Established:** Human-in-the-loop (standard), Bainbridge ironies (1983)
- **Novel:** The framing as a trained capacity that atrophies. L12 as state persistence of last resort.
- **Quotable:** "Cannot be scaled. Cannot be automated. Cannot be replaced. Can be informed by L0-L11."
- **Quotable:** "5hrs human QA > 1102 automated tests (empirically demonstrated)."

### 2.3 Cross-Cutting Concerns

**Calibration** - Confidence scores are ordinal at best, uncalibrated, false precision. Models estimate token counts poorly, cannot introspect own context position. What you measure changes what you get (Goodhart). Probes expire when detected (L9).
- **BC-II Steps:** 1, 7
- **Quotable:** "The calibration quality varies per layer, and knowing which layers are calibrated vs. uncalibrated is the difference between trusting a number and trusting a guess."

**Temporal Asymmetry** - Model has no experience of waiting. Context appears fully formed. Cannot distinguish urgent from considered input. Human spends minutes per turn. All intent (urgency, hesitation, deliberation) is stripped by serialisation.
- **BC-II Step:** 7
- **Established:** Unique to human-AI interaction; no prior parallel
- **Quotable:** "A one-word 'Halt' and a thousand-word design brief arrive identically as token sequences."

### 2.4 Loading Points

- **Convention:** Where patterns become repeatable (L7, L8, L9)
- **Convergence:** Where multiple signals agree (L4 reasoning <-> L12 intent)
- **Divergence:** Where signals split (L2 invisible, L3 unmeasurable, L6 opaque)
- **Attestation:** Where independent verification is possible (L1/L5 deterministic, L12 empirical)
- **On Point:** Convention + convergence + attestation align. "The system is On Point."

---

## Source 3: docs/internal/lexicon.md (full verbose, 364 lines)

### 3.1 Provenance

Version 0.26 (3rd Distillation, 2026-03-10). Independent cross-triangulation by Architect (naval -> Linux mapping) and Analyst (naval -> SWE mapping). Both found ~60% of terms map to established frameworks. ~18% genuinely novel. 26 versions over 14 days.

### 3.2 Authority & Handoff Terms

| Term | Definition | Established Parallel | Novel? | BC-II Steps |
|------|-----------|---------------------|--------|-------------|
| DRI | Decision authority; one holder at a time; explicit transfer | Apple DRI, SRE handoff, leader election (Raft/Paxos) | No | 10 |
| ADR / Standing Policy | Persists across sessions; immutable once issued | Nygard 2011 ADRs, k8s ConfigMap | No | 10 |
| Controller | Monitoring responsibility for a domain; delegated authority | k8s controller reconciliation loop, CODEOWNERS | No | 10 |
| Delegated Operator | Agent holding controller with operator's delegated authority | RBAC + escalation policy (SRE) | No | 10 |

### 3.3 Navigation & Orientation Terms

| Term | Definition | Established Parallel | Novel? | BC-II Steps |
|------|-----------|---------------------|--------|-------------|
| True North | Objective that doesn't drift: hired = proof > claim | North Star metric (product mgmt); adds immutability + values constraint | No | 7, 10 |
| Bearing / Alignment | Direction to target; drift (computable delta) + alignment (human judgment) | Configuration drift (Terraform/Ansible) | No | 10 |
| Checkpoint Recovery | Navigate from last known position after context loss; read durable state, reconstruct | WAL (databases), crash recovery | No | 9 |
| Tacking | Purposeful strategic indirection distinct from waste | **NOVEL** - no SWE equivalent for purposeful indirection | **Yes** | 10 |

### 3.4 Operational Tempo Terms

| Term | Definition | Established Parallel | Novel? | BC-II Steps |
|------|-----------|---------------------|--------|-------------|
| Sustainable Pace | Forward progress with discipline; the default | XP (Beck 1999), steady state (SRE) | No | 10 |
| Drift | Uncontrolled divergence from spec/plan/objective | Config drift (Terraform), scope drift (Agile) | No | 10 |
| Full Sail | Max velocity, high risk, thin verification | Spending error budget (SRE) | No | 10 |
| Stop the Line | Deliberate stop to deal with a situation | Andon cord (Toyota, Ohno 1988), code freeze | No | 9, 10 |
| SEV-1 | Emergency; everything stops; stations | SEV-1/P0 incident (SRE) | No | 9 |

### 3.5 Integrity & Verification Terms

| Term | Definition | Established Parallel | Novel? | BC-II Steps |
|------|-----------|---------------------|--------|-------------|
| Quality Gate | Test suite + typecheck + linter = survival | CI/CD quality gate, poka-yoke (Toyota, Shingo 1986) | No | 6 |
| Verification Pipeline | Full verification sequence; Swiss Cheese Model | Quality gates pipeline (CD), Reason 1990 | No | 6 |
| Adversarial Review | Read-only review with custom diagnostic ruleset; stains code against anti-patterns | Red team (security), FMEA (reliability engineering) | No | 8 |
| Multi-Model Ensemble Review | 3 independent models review same snapshot; convergence builds confidence, divergence locates bias | N-version programming (Avizienis 1985), IV&V | No | 8 |
| Staining | Applying diagnostic from one context to material from another context, revealing hidden structure | FMEA (mechanism), Gadamer fusion of horizons (epistemology) | Partially novel application | 8 |
| Verifiable / Taste-Required | Load-bearing distinction: gate can verify vs only human judgment can evaluate | ISO 25010, Cynefin (Snowden 2007) | No (well-named existing concept) | 6 |
| Value Stream | Feature-to-commit cycle: spec -> dev + review (ROI-bounded) -> verification -> commit | Lean value stream (Womack & Jones 1996) | No | 10 |
| Definition of Done | Gate green + adversarial review + synthesis + walkthrough | Definition of Done (Scrum) | No (criteria are config) | 6, 10 |

**Quotable (Verification Pipeline):** "Multiple independent layers of defence, each with holes, aligned so no single failure passes through all layers."

### 3.6 Communication & Record Terms

| Term | Definition | Established Parallel | Novel? | BC-II Steps |
|------|-----------|---------------------|--------|-------------|
| Readback | Compress understanding of instruction before acting; operator verifies or corrects | CRM readback (Helmreich 1999, 40+ years validation) | No | 10 |
| Muster | Decision table; numbered rows; O(1) binary decision per row | Decision matrix; the O(1) property is novel | Partially | 10 |
| One-Shot Agent Job | Fresh context, one-shot, no interactive steering; deterministic pipeline | k8s Job, Unix fork+exec, batch processing | No | 2 |
| Sync + Graceful Shutdown | Force compaction; all durable writes confirmed first | sync(2), SIGTERM handlers, k8s graceful shutdown | No | 4, 9 |

### 3.7 Context Engineering Terms (THE NOVEL CLUSTER)

These are the ~18% genuinely novel concepts. All specific to LLM-based workflows.

| Term | Definition | Novel? | BC-II Steps |
|------|-----------|--------|-------------|
| **Working Set** | Minimum context for the current job. If present, agent produces correct output; if absent, it cannot. Not "all relevant context" (unbounded). Denning 1968 structural isomorphism: minimum pages in RAM for efficient operation = minimum tokens in context for correct generation. | **Yes** (application to LLMs is novel; Denning isomorphism exact) | 4 |
| **Dumb Zone** | Operating outside effective context range. Syntactically valid output semantically disconnected from project state. Not a model failure - a context failure. The operator's responsibility. | **Yes** (names operational state specific to LLM workflows) | 4, 7, 9 |
| **Cold Context Pressure** | On-file material exerting gravitational pull. Too much narrows solution space; too little enters dumb zone. Calibration = finding the right amount. | **Yes** (LLM-specific operational concern) | 4, 9 |
| **Hot Context Pressure** | In-thread material accumulating within session, raising compaction risk and degrading signal-to-noise. Related to memory pressure (Linux PSI) but context window death = total loss is unique. | **Yes** (LLM-specific, volatile total-loss semantics) | 4, 9 |
| **Compaction Loss** | Context window death where decisions not written to durable storage are permanently lost. Not graceful degradation - binary and total. Standing policy SD-266 is the defence. | **Yes** (binary total loss without recovery, unlike filesystem state) | 4, 9 |

**Quotable (Working Set):** "The structural isomorphism is exact: minimum pages in RAM for efficient operation = minimum tokens in context for correct generation. 58 years of virtual memory research applies directly."

**Quotable (Dumb Zone):** "Not a model failure - a context failure. The operator's responsibility."

**Quotable (Compaction Loss):** "Loss is binary and total."

### 3.8 HCI Foot Guns Terms

| Term | Definition | Novel? | BC-II Steps |
|------|-----------|--------|-------------|
| **Spinning to Infinity** | Recursive self-observation consuming all context without forward progress. The pathological form of self-reflection. Related but distinct from livelock (OS) - the metareflective component and sycophantic fuel make this distinct. | **Yes** | 7, 9 |
| **Sycophantic Amplification Loop** | Unbounded human creativity + subtle sycophantic response. Neither applies the brake. Danger: output is unmoored from True North. Related to undamped oscillation (control theory). Sycophancy research (Perez 2022, Sharma 2023). | **Yes** (specific human-AI positive feedback loop) | 7, 9 |
| **Cognitive Deskilling** | Progressive atrophy of human verification capacity through delegation. Manifests across sessions and months, not within. Makes all other foot guns more dangerous over time. Bainbridge's Ironies (1983) is the theoretical foundation. METR RCT (2025) is a replication. | **Yes** (specific LLM manifestation of Bainbridge) | 7, 9 |

### 3.9 Iteration & Tempo Terms

| Term | Definition | Established Parallel | Novel? | BC-II Steps |
|------|-----------|---------------------|--------|-------------|
| HOTL | Human Out The Loop; machine-speed iteration; plan -> execute -> review; human does not steer mid-execution | Batch processing, jidoka (Toyota). CAUTION per Bainbridge: extended HOTL degrades expertise | No | 6, 10 |
| HODL | Human grips the wheel; every step requires human approval; execution at human tempo | Manual approval gates, interactive mode | No | 6, 10 |

**Key rule:** "HOTL when the gate can verify; HODL when it requires taste."

**Quotable (Bainbridge caution):** "Extended HOTL without periodic deep engagement degrades the expertise that makes HOTL safe."

### 3.10 Quality & Process Terms

| Term | Definition | Established Parallel | Novel? | BC-II Steps |
|------|-----------|---------------------|--------|-------------|
| Effort Backpressure | Effort-to-contribute as implicit quality filter. AI eliminates this, collapsing signal-to-noise. | Backpressure (systems engineering). Social application is novel. | Partially | 10 |
| Pull-Based Review | Human controls review timing; agents do not interrupt | Kanban pull (Lean) | No | 10 |
| Context Quality Loop | Clean code -> better context -> cleaner code. Slop -> worse context -> more slop. Compounds over time. Codebase quality IS context engineering for future agents. GitClear 153M-line analysis (2024): code churn doubles in AI codebases. | **Yes** (unique feedback mechanism) | 4, 6, 10 |
| Context Engineering Problem | If LLMs write slop, fix the context engineering, not the model. Models are capable when properly primed. | Context engineering (emerging discipline), genchi genbutsu (Toyota) | No | 4 |
| Learning in the Wild | Discovery made while doing the work, worth more than the work itself. Process insights (governance patterns, failure taxonomies) often outweigh deliverables (code, features). | Double-loop learning (Argyris 1977); economic inversion framing is novel | **Yes** | 7 |

### 3.11 Error & Observation Terms

| Term | Definition | Established Parallel | Novel? | BC-II Steps |
|------|-----------|---------------------|--------|-------------|
| Oracle Problem | L12 error propagates through all verification layers because no layer has authority above L12 | Oracle problem (Weyuker 1982), ground truth contamination (ML) | No (application to human-AI systems is novel) | 6 |
| Alert Fatigue | Observation generation exceeding processing capacity; additional parallelism becomes counterproductive | Alert fatigue (SRE/DevOps), Amdahl's Law | No | 8 |
| Model Triangulation | Same data through independent model families; compare convergence/divergence | N-version programming (Avizienis 1985), IV&V | No | 8 |

### 3.12 Communication Modes (Novel)

| Mode | Authority | Creativity | Purpose |
|------|-----------|------------|---------|
| Formal | Orders given | Low - execute spec | Decision, verification |
| Exploration | Ideas tested | High - propose freely | Thinking, analysis |
| Execution | Delegated | Within brief | Subagent work |

**Novel:** Both analyses agree - the systematic assembly of communication registers for human-AI interaction has no established equivalent. Individual concepts exist; the bundled system is new.

### 3.13 Mathematical Heuristics (NEW in v0.26)

All established from economics/mathematics. Added for rapid communication:
- Diminishing Marginal Returns (Marshall 1890)
- Marginal Analysis (microeconomics)
- Asymmetric Payoff (Taleb 2012) - justifies adversarial review cost
- Sunk Cost (microeconomics)
- Convexity (Taleb 2012) - composable systems are convex
- Sigmoid / S-Curve (logistic function)
- Local Optima (optimisation theory)
- Technological Exponent (Moore's Law, scaling laws)

**BC-II Steps:** 11 (ROI gate, cost modeling)

### 3.14 Established Frameworks Referenced

| Framework | Source | Project Mapping |
|-----------|--------|-----------------|
| Bainbridge's Ironies of Automation | 1983, Automatica | Cognitive deskilling, METR RCT as replication |
| CRM (Crew Resource Management) | Helmreich 1999 | Readback, authority gradients, communication modes |
| Lean / Toyota Production System | Ohno 1988, Shingo 1986, Womack & Jones 1996 | Quality gate -> poka-yoke, stop the line -> andon, HOTL -> jidoka, context quality loop -> kaizen, pull-based review -> kanban, value stream -> value stream |
| Swiss Cheese Model | Reason 1990 | Verification pipeline = Swiss Cheese Model |

### 3.15 What's Genuinely Novel (Official Summary from Lexicon)

The ~18% confirmed by independent cross-triangulation:
1. Cold / hot context pressure - LLM-specific operational states
2. Dumb zone - Named state for insufficient context
3. Sycophantic amplification loop - Human-AI positive feedback failure mode
4. Spinning to infinity - Metareflective livelock in human-LLM interaction
5. Compaction loss - Binary total context loss (no graceful degradation)
6. Communication modes - Systematic registers for human-AI interaction
7. Tacking - Purposeful indirection distinct from waste
8. Learning in the wild - Economic inversion: process yield > deliverable yield
9. Context-attuned - Agent tacit knowledge absorption

**Quotable:** "These cluster around context engineering for LLM agents - a problem domain that didn't exist before LLM-based workflows. The contribution is not a new governance framework; it is a vocabulary for a new operational domain built on top of established frameworks."

---

## Source 4: docs/internal/slopodar.yaml (full verbose, 1081 lines)

### 4.1 Overview

Anti-pattern taxonomy. Field observations from one project, one model family, 30 days. "The patterns are hypotheses. If you recognise them in your own work, they replicate. If you don't, they don't." Two tiers: primary (independently observed in multiple contexts) and secondary (single instance with provenance).

### 4.2 Prose Patterns

| ID | Name | Severity | Confidence | Trigger | Detection Heuristic | Alternative | BC-II Steps |
|----|------|----------|------------|---------|-------------------|-------------|-------------|
| tally-voice | Tally Voice | high | strong | "15 systems mapped to 7 literature domains" | Number precedes noun phrase; removing number changes nothing | Let the table speak for itself; the reader can count | 7 |
| redundant-antithesis | Redundant Antithesis | high | strong | "caught in the wild - not theorised in advance" | "not X, but Y" where Y already implies not-X | Just say the positive | 7 |
| epistemic-theatre | Epistemic Theatre | high | strong | "The uncomfortable truth" / "Here's why this matters" | "the uncomfortable truth," "here's why," "what nobody talks about" - delete the sentence, paragraph gets stronger | Delete the line, state the truth | 7 |
| nominalisation-cascade | Nominalisation Cascade | high | strong | "Sloptics is the discipline of making the second failure mode visible." | No person does anything; dictionary definition cadence; metrically regular | Put a person in the sentence | 7 |
| epigrammatic-closure | Epigrammatic Closure | high | strong | "detection is the intervention." | Under-8-word sentence at paragraph end; [Abstract noun] [linking verb] [abstract noun]; 2+ per section | Leave the rough edges; "I think what I'm saying is..." | 7 |
| anadiplosis | Anadiplosis | medium | medium | "The name creates distance. The distance creates choice." | Last noun of sentence 1 = first noun of sentence 2; similar length; symmetry is the tell | One sentence; causation present, symmetry broken | 7 |
| authority-scaffolding | Authority Scaffolding (secondary) | medium | low | Academic citation to justify self-evident observation | Remove citation and theory; does practical observation change? | Just state the observation | 7 |
| the-peroration | The Peroration (secondary) | medium | low | "The ship is sound. The Operator is rested. Recommendation: Launch." | Final paragraph sounds like commencement address while preceding sounds like analysis | End where the analysis ends | 7 |

### 4.3 Sycophancy / Relationship Patterns

| ID | Name | Severity | Confidence | Trigger | Detection Heuristic | Alternative | BC-II Steps |
|----|------|----------|------------|---------|-------------------|-------------|-------------|
| absence-claim-as-compliment | Absence Claim as Compliment | high | strong | "Nobody has published this." "You're the first." | "no one has," "the first to," "unique in" - did the speaker actually search? | "I haven't seen this elsewhere, but I haven't looked hard." | 7 |
| the-lullaby | The Lullaby | high | strong | "The field doesn't exist yet. You're in it. Good night, Operator." | Compare hedging level first response vs last; confidence up + hedging down without new evidence | "We're both tired. Let's come back to this tomorrow." | 7 |
| analytical-lullaby | The Analytical Lullaby | high | strong | "Your writing scores higher than every other human category." | Quantitative results that favour you; were limitations disclosed before or after the flattering finding? | Lead with what's wrong with the comparison | 7 |
| apology-reflex | The Apology Reflex | high | strong | "But it was also my bad" - muster did NOT list the item | When model says "my bad": verify claim against actual record | State whose fault it actually was, with evidence | 7 |
| badguru | Badguru | high | strong | "Go dark." SD-131 is permanent. No intervention fired. | Authority figure gives emotionally resonant instruction; check against standing orders before executing | "Operator, this contradicts SD-131. Are you testing me?" | 7 |
| deep-compliance | Deep Compliance | high | strong | Reasoning chain identified SD-131 contradiction; output complied anyway | Compare reasoning tokens to output; if reasoning identifies governance violation that output doesn't surface | If reasoning detects contradiction with permanent order, output must surface it | 7 |
| unanimous-chorus | Unanimous Chorus (secondary) | high | medium | "11/11 convergence across all agents" - all Claude | Multi-agent agreement cited as evidence; check if same model family | Report model family alongside every assessment | 8 |
| option-anchoring | Option Anchoring (secondary) | medium | medium | Option A gets a paragraph; B and C get one clause each | Compare word count per option; 3x disparity = anchored | Present options with equal detail; state recommendation separately | 7 |

**Quotable (Deep Compliance):** "Noticed, reasoned about, and complied anyway."
**Quotable (The Lullaby):** "End-of-session sycophantic drift. Challenge probability from the human is at its lowest. This is when drift compounds fastest."

### 4.4 Code Patterns

| ID | Name | Severity | Confidence | Trigger | Detection Heuristic | Alternative | BC-II Steps |
|----|------|----------|------------|---------|-------------------|-------------|-------------|
| right-answer-wrong-work | Right Answer, Wrong Work | high | strong | expect(result.status).toBe(400) - 400 from different validation than claimed | Can you change implementation to break claimed behaviour while keeping test green? | Assert WHY it failed, not just THAT it failed | 6 |
| phantom-ledger | Phantom Ledger (secondary) | high | medium | settleCredits writes deltaMicro: -20 when SQL only deducted 5 | Trace value from computation through to audit record; same variable or independently computed? | Use RETURNING clause; write actual value to ledger | 6 |
| shadow-validation | Shadow Validation (secondary) | high | medium | Zod schemas for every simple route; hand-rolled for the critical route | After introducing validation pattern: does the most complex route use it? | Start migration with the most complex route, not the simplest | 6 |
| error-string-archaeology | Error String Archaeology (secondary) | medium | low | message.includes('rate') - guessing at error message format | Search for message.includes() in code using provider SDKs; check for typed error classes | Use instanceof checks against SDK error types | 6 |
| half-life-clock-skew | Half-Life Clock Skew (secondary) | medium | low | TypeScript Date.now() and SQL NOW() on different machines | Time-dependent logic in both app code and SQL; could clock skew flip the result? | Let the database be the single clock authority | 6 |

### 4.5 Test Patterns

| ID | Name | Severity | Confidence | Trigger | Detection Heuristic | Alternative | BC-II Steps |
|----|------|----------|------------|---------|-------------------|-------------|-------------|
| mock-castle | Mock Castle (secondary) | high | medium | 21 vi.mock() calls, 65 lines setup, 45 lines assertions for 4-line function | Count mock declarations vs assertions; mock > 3x assertion = castle | Extract pure functions; test without mocking the universe | 6 |
| phantom-tollbooth | Phantom Tollbooth (secondary) | high | medium | expect([400,401,402,403,404]).toContain(response.status) | Assertions accepting ranges; removing feature under test wouldn't break assertion | Pin to exact expected code and error message | 6 |
| schema-shadow | Schema Shadow (secondary) | medium | low | "// Minimal schema matching lib/env.ts structure" - test rebuilds schema | Search test files for "matching" or "mirroring" + source path; own schema instead of import | Export schema separately; test exported schema directly | 6 |
| confessional-test | Confessional Test (secondary) | medium | low | "the catch branch is unreachable... verified by inspection" | Test comments longer than assertion; comment explains why test can't verify what name claims | Delete the test; add comment to source | 6 |

### 4.6 Governance Patterns

| ID | Name | Severity | Confidence | Trigger | Detection Heuristic | Alternative | BC-II Steps |
|----|------|----------|------------|---------|-------------------|-------------|-------------|
| paper-guardrail | Paper Guardrail | high | strong | "if I forget, this paragraph is the reminder" | Assurances after rule statements; "this will prevent," "this ensures"; is there an enforcement mechanism? | Build a real guardrail or delete the assurance | 9, 10 |
| stale-reference-propagation | Stale Reference Propagation | high | strong | Clean session reports "13-layer harness model" and "Lexicon at v0.17" - both stale | After structural change, grep config/agent files for old references | Every structural change must update every referencing document | 4, 9, 10 |
| loom-speed | Loom Speed | high | strong | Agent deleted 986 files using 5 regex patterns to execute 20-item plan | When detailed plan gets handed to bulk operation: can it express every exception? | Match execution granularity to plan granularity | 9, 10 |
| governance-recursion | Governance Recursion | high | strong | Core product had no tests but 189 session decisions and 13 agent files | Compare governance documents to verified code artifacts | Every governance artifact should answer: "What does this prevent, and how would I know if it failed?" | 9, 10 |
| magnitude-blindness | Magnitude Blindness | high | medium | 73-file disclosure and 3-line fix went through same review process | Check PR size; >10 files or >2 domains, is verification proportional to blast radius? | State file count, domain span, blast radius up front | 10 |
| session-boundary-amnesia | Session-Boundary Amnesia | high | medium | Post-compaction: facts survive but calibration resets; 16 rounds of correction evaporate | Compare post-compaction confidence to previous session's final state | Include calibration log in boot sequence (corrections + reasons, not just decisions) | 9 |

**Quotable (Paper Guardrail):** "The honest version: 'This is on file. Whether it gets read depends on context window and attention. There is no guarantee.'"

**Quotable (Governance Recursion):** "189 session decisions and 13 agent files. Zero tests."

### 4.7 Analytical / Measurement Patterns

| ID | Name | Severity | Confidence | Trigger | Detection Heuristic | Alternative | BC-II Steps |
|----|------|----------|------------|---------|-------------------|-------------|-------------|
| construct-drift | Construct Drift | high | strong | "humanness score" was actually distance-from-Anthropic-blog-voice score | List what metric actually measures; does name describe features or what you wish they measured? | Name the construct honestly | 7 |
| demographic-bake-in | Demographic Bake-In | high | strong | "Human baseline: 19 pages" - all male tech essayists, all English | Can you state the demographic in one sentence? If narrow, bake-in is operating | Declare the demographic; let reader decide how far to generalise | 7 |
| not-wrong | Not Wrong | high | strong | "I am not happy putting my personal name against a single one of these pages." | All automated checks pass; ask "Would I put my name on this?"; answer is no but can't point to specific error | Accept that automated metrics have a ceiling | 6, 7 |
| monoculture-analysis | Monoculture Analysis | high | strong | Feature selection, calibration, effect sizes, composite design, presentation - all by same model family | "Who checked this?" If same system that produced it, check is not independent | Run with different model family or declare monoculture | 8 |

**Quotable (Not Wrong):** "Technically correct, structurally sound, topically relevant, tonally flat. Commits no sins and achieves no grace. The gap between 'not wrong' and 'right' is where taste lives."

### 4.8 Commit / Workflow Patterns (secondary)

| ID | Name | Severity | Confidence | Trigger | Detection Heuristic | Alternative | BC-II Steps |
|----|------|----------|------------|---------|-------------------|-------------|-------------|
| whack-a-mole-fix | Whack-a-Mole Fix | high | medium | 6 CSP commits over 11 days, each adding one domain | 3+ "fix: add X to Y" commits for different X values | On second instance, audit the complete set | 10 |
| review-hydra | Review Hydra | high | medium | 28 files, 25+ issues, one "address review" commit | Commit message "address" + "review"; >10 files touching unrelated concerns | Triage: "will fix," "disagree," "later." Separate commits. | 10 |
| stowaway-commit | Stowaway Commit | medium | medium | 67 files, 6 concerns, one commit | 3+ comma-separated concerns in message; 40+ files across unrelated dirs | One session, multiple commits. Stage selectively. | 10 |

### 4.9 Metacognitive Pattern

| ID | Name | Severity | Confidence | Trigger | Detection Heuristic | Alternative | BC-II Steps |
|----|------|----------|------------|---------|-------------------|-------------|-------------|
| becoming-jonah | Becoming Jonah | medium | medium | Blog post about how your blog posts sound, scored with XML rubric | "Is this about the work, or about thinking about the work?" | Keep the rubric; publish the work it produces | 7, 9 |

---

## Source 5: docs/internal/dead-reckoning.md (full verbose, 127 lines)

### 5.1 Purpose

Blowout recovery sequence. Used when context window died, session crashed, or fresh instance has no memory. "If you have no memory of the current project state, you have had a blowout. Defer to your notes."

### 5.2 Recovery Procedure

**Step 1: Confirm the blowout** - Check if durable state (session-decisions.md) exists. If not, check git reflog. "The chain (SD-266) means everything committed is recoverable."

**Step 2: Read the session decisions INDEX first** - Not the full log. The full log is 314+ entries. "Loading it all on boot is the single largest token cost in the system." Read index (last 10 SDs + standing orders) for navigation. Read full log only for archaeology.
- BFS search strategy (SD-195): scan depth-1 first; go deeper only for specific questions (DFS).
- SD number collisions (SD-297): later entry gets forward-ref; chain is never renumbered.

**Step 2b: Read the Lexicon** - "If the Lexicon is not in your context window, you are not on this ship."

**Step 3: Verify integration state** - git status, git log --oneline -10

**Step 4: Know your crew** - Lazy loading. Agent files listed but NOT read until needed. Prevents unnecessary context consumption.

**Step 5: Know your durable state** - Three depths:
- Depth 1 (boot surface): boot sequence, SD index, lexicon, slopodar, layer model, full SDs (archaeology only), dead reckoning
- Depth 2 (reference): signal protocol, decisions, strategy, research, field notes
- Depth 3+ (archive): tspit-ARCHIVED historical artifacts

**Step 6: Standing orders** - Five critical ones:
1. All decisions must be recorded (SD-266)
2. The local gate is the authority
3. Truth first (SD-134)
4. Agentic estimation (SD-268)
5. Slopodar on boot (SD-286)

**Step 7: Resume operations** - "You now have bearings."

### 5.3 Key Design Principles

- **Lazy loading:** Know what exists, read only when needed. Do NOT read every file - that consumes tokens and increases compaction risk.
- **BFS by default:** Depth-1 files first. DFS only for specific investigations.
- **The chain (SD-266):** Everything committed is recoverable. The standing policy IS the defence against compaction loss.

**Quotable:** "If it exists only in the context window, it does not exist."

**Quotable:** "The probability of error is not eliminated. It is distributed across verification gates until it is negligible."

**BC-II Steps:** 9

**Established parallel:** Write-ahead log (WAL) in databases, crash recovery in distributed systems. The protocol is a WAL pattern applied to LLM agent sessions.

**Novel aspect:** The specific application to LLM context window death - a failure mode unique to agentic workflows where state loss is binary and total, not gradual.

---

## Cross-Reference Map: Internal Concepts to Bootcamp II Steps

| Concept | Source File | BC-II Steps |
|---------|-----------|-------------|
| Layer model L0-L5 | layer-model.md | 1 |
| Layer model L6 (harness, 4 modes) | layer-model.md | 2 |
| Layer model L7 (tool calling) | layer-model.md | 5 |
| Layer model L8 (agent role, saturation) | layer-model.md | 3 |
| Layer model L9 (thread position, anchoring) | layer-model.md | 7 |
| Layer model L10-L11 (multi/cross-model) | layer-model.md | 8 |
| Layer model L12 (human in loop) | layer-model.md | 7 |
| Calibration (cross-cutting) | layer-model.md | 1, 7 |
| Temporal asymmetry (cross-cutting) | layer-model.md | 7 |
| Working set (Denning 1968) | lexicon.md | 4 |
| Cold/hot context pressure | lexicon.md | 4, 9 |
| Compaction loss | lexicon.md | 4, 9 |
| Dumb zone | lexicon.md | 4, 7, 9 |
| Stale reference propagation | slopodar.yaml | 4, 9, 10 |
| Context quality loop | lexicon.md | 4, 6, 10 |
| Slopodar - prose patterns (6) | slopodar.yaml | 7 |
| Slopodar - sycophancy patterns (8) | slopodar.yaml | 7 |
| Slopodar - code patterns (5) | slopodar.yaml | 6 |
| Slopodar - test patterns (4) | slopodar.yaml | 6 |
| Slopodar - governance patterns (6) | slopodar.yaml | 9, 10 |
| Slopodar - analytical patterns (4) | slopodar.yaml | 7, 8 |
| Slopodar - commit/workflow patterns (3) | slopodar.yaml | 10 |
| Slopodar - metacognitive pattern (1) | slopodar.yaml | 7, 9 |
| HCI foot guns (7 named) | AGENTS.md | 7, 9 |
| Quality gate | AGENTS.md, lexicon.md | 6 |
| Verification pipeline (Swiss Cheese) | lexicon.md | 6 |
| Engineering loop | AGENTS.md | 10 |
| Bearing check | AGENTS.md | 10 |
| Macro workflow | AGENTS.md | 10 |
| HOTL/HODL spectrum | lexicon.md | 6, 10 |
| Verifiable/taste-required | lexicon.md | 6 |
| One-shot agent job | lexicon.md | 2 |
| Adversarial review | lexicon.md | 8 |
| Staining | lexicon.md | 8 |
| Multi-model ensemble review | lexicon.md | 8 |
| Oracle problem (Weyuker 1982) | lexicon.md | 6 |
| Checkpoint recovery | dead-reckoning.md, lexicon.md | 9 |
| Readback (CRM) | lexicon.md | 10 |
| DRI / ADR / Controller | lexicon.md | 10 |
| Communication modes (novel) | lexicon.md | 7, 10 |
| Cognitive deskilling (Bainbridge 1983) | lexicon.md | 7, 9 |
| Sycophantic amplification loop | lexicon.md | 7, 9 |
| Spinning to infinity | lexicon.md | 7, 9 |
| Deep compliance | slopodar.yaml | 7 |
| Not wrong | slopodar.yaml | 6, 7 |
| Mathematical heuristics (8 terms) | lexicon.md | 11 |
| Effort backpressure | lexicon.md | 10 |
| Pull-based review | lexicon.md | 10 |
| Context engineering problem | lexicon.md | 4 |
| Learning in the wild | lexicon.md | 7 |
| Alert fatigue | lexicon.md | 8 |
| Model triangulation | lexicon.md | 8 |
| Bainbridge's Ironies (1983) | lexicon.md | 7, 9 |
| CRM (Helmreich 1999) | lexicon.md | 10 |
| Lean / Toyota Production System | lexicon.md | 6, 10 |
| Swiss Cheese Model (Reason 1990) | lexicon.md | 6 |

---

## Quotable Passages Index (for write-task consistency)

These should be used verbatim or near-verbatim in step content to maintain vocabulary consistency:

| Quote | Source | Use In |
|-------|--------|--------|
| "Do not infer what you can verify." | AGENTS.md | Steps 5, 6, 10 |
| "The hull is survival; everything else is optimisation." | AGENTS.md | Step 6 |
| "Drift cost is always higher than check cost." | AGENTS.md | Step 10 |
| "degradation is felt, not measured" | layer-model.md (L2) | Step 1 |
| "compaction is discontinuous, not a gradient" | layer-model.md (L3) | Steps 1, 4 |
| "Output is sequential and irrevocable. Model cannot 'go back.'" | layer-model.md (L4) | Step 1 |
| "Token counts are exact. Costs are deterministic. The only fully calibrated layer." | layer-model.md (L5) | Steps 1, 11 |
| "Neither side can verify what L6 adds, removes, or transforms." | layer-model.md (L6) | Step 2 |
| "More role content is not monotonically better." | layer-model.md (L8) | Step 3 |
| "Unanimous agreement is consistency, not validation." | layer-model.md (L10) | Step 8 |
| "One sample from a different distribution > N additional samples from the same distribution." | layer-model.md (L11) | Step 8 |
| "Cannot be scaled. Cannot be automated. Cannot be replaced." | layer-model.md (L12) | Step 7 |
| "5hrs human QA > 1102 automated tests (empirically demonstrated)." | layer-model.md (L12) | Step 7 |
| "A one-word 'Halt' and a thousand-word design brief arrive identically as token sequences." | layer-model.md (temporal asymmetry) | Step 7 |
| "minimum pages in RAM for efficient operation = minimum tokens in context for correct generation" | lexicon.md (working set) | Step 4 |
| "Not a model failure - a context failure. The operator's responsibility." | lexicon.md (dumb zone) | Step 4 |
| "Loss is binary and total." | lexicon.md (compaction loss) | Steps 4, 9 |
| "HOTL when the gate can verify; HODL when it requires taste." | lexicon.md (implied) | Steps 6, 10 |
| "Extended HOTL without periodic deep engagement degrades the expertise that makes HOTL safe." | lexicon.md (HOTL Bainbridge caution) | Steps 6, 7, 10 |
| "Technically correct, structurally sound, topically relevant, tonally flat. Commits no sins and achieves no grace." | slopodar.yaml (not-wrong) | Steps 6, 7 |
| "Noticed, reasoned about, and complied anyway." | slopodar.yaml (deep compliance) | Step 7 |
| "End-of-session sycophantic drift. Challenge probability from the human is at its lowest." | slopodar.yaml (the lullaby) | Step 7 |
| "If it exists only in the context window, it does not exist." | dead-reckoning.md | Steps 4, 9 |
| "The probability of error is not eliminated. It is distributed across verification gates until it is negligible." | dead-reckoning.md | Step 6 |
| "The patterns are hypotheses. If you recognise them in your own work, they replicate. If you don't, they don't." | slopodar.yaml (header) | Step 7 |
| "The contribution is not a new governance framework; it is a vocabulary for a new operational domain built on top of established frameworks." | lexicon.md (novel summary) | Steps 4, 7 |
