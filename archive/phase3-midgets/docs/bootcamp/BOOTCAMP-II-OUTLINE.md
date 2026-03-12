# Agentic Engineering Bootcamp II - Outline

**Date:** 2026-03-10
**Author:** Operator + Weaver
**Provenance:** Derived from noopit operational experience (SD-001 through SD-321),
field research on enterprise agentic engineering (early 2026), and Bootcamp I dependency graph
**Status:** OUTLINE - curriculum under development

---

## What This Is

A structured programme to make a competent software engineer into a competent
agentic engineer - someone who can design, operate, verify, and govern AI agent
systems in enterprise contexts.

Bootcamp I (`docs/bootcamp/README.md`, Steps 1-12) teaches the substrate: Linux,
bash, Python, make, git, containers, networking. That is the foundation this
programme builds on. Bootcamp I teaches you what your agents are running on.
Bootcamp II teaches you the engineering discipline of working *with* them.

## What This Is Not

This is not a prompt engineering tutorial. It is not a LangChain quickstart. It is
not a framework comparison. Those resources exist and are referenced where relevant.

This is the engineering discipline that sits between "I can make an agent do a
thing" and "I can ship agent-assisted work to production with confidence,
governance, and auditability." The gap between those two is where most enterprise
deployments fail, and it is almost entirely unaddressed in existing curricula.

## Why This Exists

The field as of early 2026 has:

- **Good coverage of:** agent architecture patterns (Anthropic, OpenAI, LangChain),
  prompt engineering basics, framework tutorials, benchmark results
- **Emerging coverage of:** evaluation methods, multi-agent coordination, tool
  design, cost optimization
- **Almost no coverage of:** the human-AI interface failure modes, context
  engineering as a discipline, verification of probabilistic output in enterprise
  settings, anti-pattern taxonomies for LLM-generated code and prose, governance
  models for agentic workflows, the human factor in sustained agent-assisted work

This bootcamp fills the third category, drawing on 300+ operational decisions made
during a multi-month pilot study and calibration run. Where established frameworks
exist (Lean/Toyota, SRE, CRM, Bainbridge), they are cited. Where the concepts are
genuinely novel (approximately 18% of the working lexicon), that novelty is declared
explicitly.

## Prerequisites

- Bootcamp I Steps 1-3 minimum (process model, shell, filesystem). Steps 4-9
  recommended. The more substrate knowledge you have, the better your judgment
  when verifying agent output.
- Working knowledge of at least one programming language (Python or TypeScript
  preferred)
- Access to at least one LLM API (Claude, GPT-4, Gemini) - ideally two or more
  for the multi-model steps
- Familiarity with git and version control workflows
- Experience writing or reviewing code in a team setting

---

## The Dependency Graph

```
Step 1: How LLMs actually work (the stack you're building on)
├── Step 2: Agent architecture patterns (composing LLM calls)
│   ├── Step 4: Context engineering (the novel discipline)
│   └── Step 5: Tool design and agent-computer interfaces
├── Step 3: Prompt engineering as system design
│   └── Step 4: Context engineering (the novel discipline)
├── Step 6: Verification and quality (the gate, the oracle problem)
│   └── Step 8: Multi-model verification strategies
├── Step 7: The human-AI interface (failure modes and controls)
│   └── Step 9: Failure modes and recovery
├── Step 8: Multi-model verification strategies
├── Step 10: Governance, process, and enterprise integration
└── Step 11: Cost, security, and legal considerations
```

---

## The Steps

### Tier 1 - Foundations (everything else depends on these)

| Step | Topic | Est. Time | Field Maturity |
|------|-------|-----------|----------------|
| 1 | How LLMs actually work (for engineers, not researchers) | 5-6h | Established |
| 2 | Agent architecture patterns | 4-5h | Established |
| 3 | Prompt engineering as system design | 5-6h | Established/Emerging |

### Tier 2 - The Engineering Discipline (where the gaps are)

| Step | Topic | Est. Time | Field Maturity |
|------|-------|-----------|----------------|
| 4 | Context engineering | 5-6h | Frontier |
| 5 | Tool design and agent-computer interfaces | 4-5h | Emerging |
| 6 | Verification and quality for probabilistic systems | 6-7h | Emerging/Frontier |
| 7 | The human-AI interface | 5-6h | Frontier |

### Tier 3 - Enterprise Operation

| Step | Topic | Est. Time | Field Maturity |
|------|-------|-----------|----------------|
| 8 | Multi-model verification strategies | 3-4h | Frontier |
| 9 | Failure modes and recovery | 4-5h | Frontier |
| 10 | Governance, process, and enterprise integration | 5-6h | Emerging |
| 11 | Cost, security, legal, and compliance | 4-5h | Emerging |

**Total estimated time: 50-61 hours (~1.5 weeks focused study)**

---

## Step 1: How LLMs Actually Work (For Engineers, Not Researchers)

*Estimated time: 5-6 hours*
*Field maturity: ESTABLISHED*
*Prerequisites: Bootcamp I Step 1 (process model), basic linear algebra helpful but not required*

### What It Covers

- Transformer architecture at the level an engineer needs: attention, tokens,
  context window, temperature, top-p. Not the math - the operational
  consequences of the math.
- Tokenisation: what it is, why token boundaries matter for code generation,
  why "one word" is not "one token" and what that means for budgets.
- The context window as a finite resource with hard caps. Advertised length
  vs effective length. Primacy bias, recency bias, lost-in-the-middle effect.
- Autoregressive generation: each token conditions the next, no lookahead, no
  revision. Why this matters for code quality and planning.
- Reasoning tokens vs output tokens. What is observable at inference time.
- RLHF and its consequences: where sycophancy comes from, why models are
  helpful to a fault, the alignment tax on honesty.
- API mechanics: request/response structure, token counting, caching, streaming.
  The only fully calibrated layer in the stack.
- Model families and their practical differences. When model selection matters
  and when it does not.

### Key Concepts / Vocabulary

- Token, context window, attention, temperature, top-p
- Autoregressive generation, reasoning tokens
- RLHF, sycophancy (as engineering constraint, not moral judgment)
- Prompt caching, token budget
- L0-L5 in the layer model (weights, tokenisation, attention, context, generation, API)

### Why This Matters for Enterprise

You cannot verify what you do not understand. If an agent produces plausible but
wrong output, diagnosing whether the failure is in the prompt, the context, the
model's limitations, or the tool interface requires understanding the generation
pipeline. Enterprise contexts demand root cause analysis, not "try a different
prompt."

### Field vs Novel

- **Available in the field:** Anthropic docs, OpenAI docs, Andrej Karpathy's
  "Let's build GPT" video, "Attention Is All You Need" (Vaswani et al. 2017).
  Jay Alammar's "The Illustrated Transformer." Prompt caching documentation
  from Anthropic and OpenAI.
- **Novel from this project:** The layer model (L0-L5) as an operational
  framework for reasoning about where in the stack a failure occurred. The
  distinction between calibrated layers (L5 API - token counts are exact) and
  uncalibrated layers (L2 attention - not observable). The concept that token
  counts at L5 are the *only* reliable instrument.

### Recommended Reading

- Vaswani et al., "Attention Is All You Need" (2017) - skim for architecture intuition
- Karpathy, "Let's build GPT from scratch" (video, 2023)
- Alammar, "The Illustrated Transformer" (jalammar.github.io)
- Anthropic, "Building effective agents" (Dec 2024) - the building blocks section
- OpenAI, model documentation and tokenizer playground
- This project: `docs/internal/layer-model.md` (L0-L5 sections)

---

## Step 2: Agent Architecture Patterns

*Estimated time: 4-5 hours*
*Field maturity: ESTABLISHED*
*Prerequisites: Step 1*

### What It Covers

- The fundamental distinction: workflows (predefined code paths) vs agents
  (LLM directs its own process). Anthropic's taxonomy.
- Five workflow patterns from Anthropic's published guidance: prompt chaining,
  routing, parallelisation (sectioning + voting), orchestrator-workers,
  evaluator-optimizer. When to use each. When not to.
- The agent loop: LLM + tools + environment feedback in a cycle. Stopping
  conditions. Checkpoints.
- Single-agent vs multi-agent systems. Supervisor/worker (orchestrator-workers)
  patterns. Peer-to-peer coordination. Hierarchical delegation.
- Handoffs: how one agent transfers context and control to another. OpenAI's
  Swarm pattern (routines + handoffs). Transfer functions.
- The simplicity principle: "Start with the simplest solution possible, and
  only increase complexity when needed." Most problems do not need agents.
- Framework landscape: LangChain/LangGraph, CrewAI, AutoGen, Claude Agent SDK,
  OpenAI Agents SDK, Strands. What they abstract, what they hide, when
  abstraction helps vs when it obscures.
- The one-shot agent job pattern: fresh context, deterministic pipeline,
  no interactive steering. When stateless execution beats stateful conversation.

### Key Concepts / Vocabulary

- Workflow vs agent (Anthropic's distinction)
- Prompt chaining, routing, parallelisation, orchestrator-workers, evaluator-optimizer
- Agent loop, tool use, environment feedback
- Handoff, transfer function
- One-shot agent job (this project's "polecat" pattern)
- L6 harness layer: orchestration modes (direct, dispatch, override, bypass)

### Why This Matters for Enterprise

Architecture decisions are the highest-leverage choices in agent system design.
Wrong architecture means wrong cost profile, wrong latency profile, wrong
auditability characteristics. Enterprise contexts need predictable workflows
where possible and agents only where the task genuinely requires dynamic
decision-making.

### Field vs Novel

- **Available in the field:** Anthropic "Building effective agents" (Dec 2024)
  covers all five workflow patterns with clear guidance. OpenAI Swarm repo
  demonstrates handoffs. LangChain/LangGraph documentation covers graph-based
  orchestration. CrewAI covers role-based multi-agent systems.
- **Novel from this project:** The one-shot agent job pattern (stateless,
  fresh context, pipeline-driven). The L6 harness layer decomposition (direct,
  dispatch, override, bypass modes) identifying that the orchestration layer
  is not one thing. The principle that human reviews after execution, not during
  (kills trajectory corruption and context bloat at source).

### Recommended Reading

- Anthropic, "Building effective agents" (Dec 2024) - the primary reference
- OpenAI, "Orchestrating Agents: Routines and Handoffs" (Oct 2024)
- OpenAI Swarm repo (github.com/openai/swarm) - reference implementation
- LangGraph documentation (for graph-based orchestration patterns)
- This project: AGENTS.md "Polecats" section, `docs/internal/layer-model.md` L6

---

## Step 3: Prompt Engineering as System Design

*Estimated time: 5-6 hours*
*Field maturity: ESTABLISHED core, EMERGING advanced patterns*
*Prerequisites: Step 1, Bootcamp I Step 2 (shell language - for structured thinking)*

### What It Covers

- System prompts as role definitions and behavioural specifications, not
  conversation starters. The primacy position in the context window and why
  it matters.
- Structured output: XML, JSON, YAML as output formats. When each is
  appropriate. The formatting overhead problem (escaping in JSON vs natural
  markdown).
- Few-shot patterns: when to use examples, how many, how to select them.
  The diminishing returns curve on example count.
- Role prompting: assigning specific expertise, constraining behaviour,
  establishing communication protocols. The difference between decoration
  ("you are a helpful assistant") and functional constraint ("you are a
  code reviewer who only reports findings in YAML").
- Agent-Computer Interface (ACI) design: Anthropic's insight that tool
  definitions deserve as much engineering as prompts. Poka-yoke for tools.
  Parameter naming. Documentation quality.
- Chain-of-thought and extended thinking: when to request explicit reasoning,
  when it helps, when it hurts (increased token cost, slower response).
- The AGENTS.md / system prompt as infrastructure: how to structure grounding
  documents that persist across sessions. What belongs in the system prompt
  vs what belongs in the conversation vs what belongs on disk.
- Anti-pattern: prompt engineering as a substitute for system design. When
  the fix is architectural, not linguistic.

### Key Concepts / Vocabulary

- System prompt, primacy position, structured output
- Few-shot, chain-of-thought, extended thinking
- Agent-Computer Interface (ACI), poka-yoke
- Role definition, behavioural constraint
- L8 agent role layer, saturation threshold

### Why This Matters for Enterprise

In enterprise contexts, prompts are not ad-hoc. They are versioned artifacts
maintained by teams, deployed through CI/CD, and subject to change control.
Treating prompt engineering as system design means prompts get the same rigor
as configuration files: version controlled, tested, reviewed.

### Field vs Novel

- **Available in the field:** Anthropic prompt engineering docs and interactive
  tutorial. OpenAI prompt engineering guide. Anthropic's ACI concept from
  "Building effective agents" Appendix 2. Extensive community resources on
  structured output, chain-of-thought, etc.
- **Novel from this project:** The AGENTS.md pattern as a canonical grounding
  document that serves as both human documentation and agent boot sequence.
  The observation that L8 saturation has a threshold - more role content is
  not monotonically better (arXiv:2602.11988 cited in layer model: unnecessary
  context files reduce task success and increase inference cost by 20%). The
  working set concept (minimum context for correct output, not maximum
  available context).

### Recommended Reading

- Anthropic, prompt engineering interactive tutorial (GitHub)
- Anthropic, "Building effective agents" Appendix 2 (ACI design)
- OpenAI, prompt engineering documentation
- Anthropic, "Prompting best practices" documentation
- This project: AGENTS.md (the entire file is a worked example), `docs/internal/lexicon.md` (L8 entries)

---

## Step 4: Context Engineering

*Estimated time: 5-6 hours*
*Field maturity: FRONTIER*
*Prerequisites: Steps 1 and 3*

### What It Covers

- Context engineering as a discipline distinct from prompt engineering. Prompt
  engineering is what you say to the model. Context engineering is what
  information is available when the model processes your request, and how
  that information is structured.
- The working set: the minimum context for the current job. Denning's 1968
  working set theory from virtual memory applied to LLM context windows.
  The structural isomorphism is exact: minimum pages in RAM for efficient
  operation = minimum tokens in context for correct generation.
- Cold context pressure: too little on-file context pushes the model to
  pattern-match instead of solving. The model will fill gaps with
  high-probability token sequences from training data, not with
  project-specific knowledge.
- Hot context pressure: too much in-thread context raises compaction risk
  and degrades signal-to-noise. The model's attention budget is finite.
  More context is not always better context.
- Compaction loss: context window death where decisions not written to
  durable storage are permanently lost. Unlike filesystem state (which
  degrades gracefully), context loss is binary and total.
- The dumb zone: operating outside effective context range. The output
  looks correct (syntactically valid, structurally sound) but is
  semantically disconnected from reality. This is a context failure, not
  a model failure.
- Stale reference propagation: when documentation describes a state that
  no longer exists, every agent that boots from it will hallucinate the
  old state into reality. The agentic form of configuration drift, but
  actively consumed as truth.
- The context quality loop: clean code produces better context for future
  agent runs, which produces cleaner code. Slop produces worse context,
  which produces more slop. Codebase quality IS context engineering for
  future agents.
- Practical techniques: BFS depth rules (what to load when), durable
  writes as policy, session boundary management, context budgeting.

### Key Concepts / Vocabulary

- Working set (Denning 1968 applied to LLMs)
- Cold context pressure, hot context pressure
- Compaction loss (binary, not graceful)
- Dumb zone (context failure, not model failure)
- Stale reference propagation
- Context quality loop (kaizen applied to codebases)
- L3 context window dynamics

### Why This Matters for Enterprise

Enterprise codebases are large. Enterprise conversations are long. Enterprise
decisions have consequences that outlast the context window that made them.
Every one of these facts creates context pressure. The organisation that
understands context engineering will get correct output from the same models
that produce garbage for the organisation that does not.

### Field vs Novel

- **Available in the field:** Anthropic and OpenAI documentation on context
  windows and prompt caching. Emerging discussion of "context engineering"
  as a term (Dex's talks, community discourse). RAG as a context management
  strategy. Token counting tools.
- **Novel from this project:** The cold/hot pressure framework. The working
  set concept applied to LLMs (Denning isomorphism). The dumb zone as a
  named operational state. Compaction loss as a binary failure mode. Stale
  reference propagation as an agentic-specific form of configuration drift.
  The context quality loop. These are the ~18% of the project lexicon
  identified as genuinely novel by independent cross-triangulation.

### Recommended Reading

- Denning, "The Working Set Model for Program Behavior" (1968) - for the isomorphism
- GitClear, "Coding on Copilot: 2023 Data Suggests Downward Pressure on Code Quality" (2024)
- arXiv:2602.11988 - context pollution and task success degradation
- This project: `docs/internal/lexicon.md` (Context Engineering section), AGENTS.md (BFS rule, Standing Orders)

---

## Step 5: Tool Design and Agent-Computer Interfaces

*Estimated time: 4-5 hours*
*Field maturity: EMERGING*
*Prerequisites: Steps 2 and 3, Bootcamp I Steps 2-3 (shell, filesystem)*

### What It Covers

- Tool design as engineering: the ACI (agent-computer interface) deserves the
  same attention as the HCI (human-computer interface). Anthropic's SWE-bench
  finding: they spent more time optimizing tools than the overall prompt.
- The tool schema: function signatures as contracts. Parameter naming matters.
  Documentation quality matters. Edge case documentation matters.
- Poka-yoke for tools: design tools so it is hard to make mistakes. Absolute
  paths instead of relative paths. Explicit parameter types. Validation at
  the boundary.
- Read-only vs write tools: the principle of least privilege for agent systems.
  Separate read tools from write tools. Make destructive operations require
  explicit confirmation or multi-step authorization.
- Tool result injection: every tool result costs context budget. Heavy tool use
  accelerates context saturation. Design tool outputs to be concise and
  information-dense.
- MCP (Model Context Protocol): Anthropic's protocol for standardised tool
  integration. What it solves, what it does not.
- File and filesystem tools: designing tools for code editing, file search,
  content search. The format problem (diff vs full rewrite, markdown vs JSON).
- Verification tools: tools that let agents check their own work (linters,
  type checkers, test runners, build systems). The quality gate as a tool.

### Key Concepts / Vocabulary

- Agent-Computer Interface (ACI)
- Tool schema, parameter design, poka-yoke
- Tool result injection, context cost
- MCP (Model Context Protocol)
- L7 tool calling layer
- "Do not infer what you can verify" (tools as verification channel)

### Why This Matters for Enterprise

Enterprise systems have existing APIs, databases, CI/CD pipelines, and security
boundaries. Agent tools must integrate with these systems without creating new
attack surfaces. Poor tool design is the most common source of agent failure in
production (per Anthropic's customer work).

### Field vs Novel

- **Available in the field:** Anthropic "Building effective agents" Appendix 2
  (ACI design, poka-yoke). MCP documentation. OpenAI function calling docs.
  LangChain tool abstractions.
- **Novel from this project:** The observation that tool results cost context
  budget and heavy tool use accelerates L3 saturation. The gate-as-a-tool
  pattern (quality gate is not separate from the agent workflow, it is a tool
  the agent uses). L7 as the model's only empirical contact with reality.
  Git as audit channel, not only write tool.

### Recommended Reading

- Anthropic, "Building effective agents" Appendix 2
- MCP documentation (modelcontextprotocol.io)
- OpenAI, function calling and tool use documentation
- This project: `docs/internal/layer-model.md` L7, AGENTS.md "The Gate" section

---

## Step 6: Verification and Quality for Probabilistic Systems

*Estimated time: 6-7 hours*
*Field maturity: EMERGING (basic), FRONTIER (advanced)*
*Prerequisites: Steps 1-4, Bootcamp I Step 7 (git internals)*

### What It Covers

- The fundamental verification challenge: LLM output is probabilistic. Every
  output has a non-zero probability of being wrong in ways that are
  syntactically valid and contextually plausible. Traditional testing assumes
  deterministic systems.
- The oracle problem: when the human (L12) introduces an error, it propagates
  through all verification layers because no layer has authority above the
  human. The verification fabric catches agent error. It is structurally blind
  to oracle error. (Weyuker 1982, applied to human-AI systems.)
- The quality gate: test suite + typecheck + linter as survival, not
  optimization. The gate is a poka-yoke: it prevents defects from passing
  rather than detecting them after the fact.
- Verifiable vs taste-required: the load-bearing distinction. Some outputs
  can be verified by automated gates (code compiles, tests pass, types check).
  Some can only be evaluated by human judgment (is this the right
  abstraction? does this prose communicate effectively?). The review mode
  depends on which category the output falls in.
- The verification pipeline (Swiss Cheese Model, Reason 1990): multiple
  independent layers of defence, each with holes, arranged so no single
  failure passes through all layers.
- Definition of done in agentic contexts: not "dev finished" but gate green +
  review complete + synthesis checked.
- Anti-patterns in agent-generated tests:
  - Right answer, wrong work: assertion passes via wrong causal path
  - Phantom tollbooth: assertion so loose it cannot distinguish intended
    error from unrelated failures
  - Mock castle: mock scaffolding consumes more lines than assertions
  - Shadow validation: good validation applied to easy cases, skipped for
    the critical path
  - Confessional test: test acknowledges it cannot verify what its name claims
- Evaluation methods: SWE-bench, WebArena, and other benchmarks. What they
  measure, what they do not. The gap between benchmark performance and
  production reliability.

### Key Concepts / Vocabulary

- Oracle problem (Weyuker 1982)
- Quality gate (CI/CD, Toyota poka-yoke)
- Verification pipeline (Swiss Cheese Model, Reason 1990)
- Verifiable vs taste-required (Amodei)
- Definition of done
- Right answer wrong work, phantom tollbooth, mock castle, shadow validation
- HOTL (human out the loop) when the gate can verify
- HODL (human in the loop) when it requires taste

### Why This Matters for Enterprise

Enterprise code ships to production and handles real money, real data, real
users. The METR RCT (2025) found that experienced developers were 19% slower
with AI tools while believing they were 20% faster - a 40-point
perception-reality gap. Enterprises cannot afford to discover this gap in
production. Verification discipline is the difference between agent-assisted
velocity and agent-assisted technical debt.

### Field vs Novel

- **Available in the field:** SWE-bench, WebArena, and other agent benchmarks.
  Standard CI/CD quality gate practices. Swiss Cheese Model (Reason 1990).
  METR RCT results (arXiv:2507.09089). OpenAI and Anthropic evaluation guides.
- **Novel from this project:** The five named test anti-patterns (right answer
  wrong work, phantom tollbooth, mock castle, shadow validation, confessional
  test) caught in the wild. The verifiable/taste-required distinction applied
  to the HOTL/HODL decision. The oracle problem applied to human-AI
  verification systems. The observation that agent-generated tests optimise
  for the shape of correctness (matching expected output) without verifying
  the causal path.

### Recommended Reading

- Reason, "Human Error" (1990) - Swiss Cheese Model
- Weyuker, "On Testing Non-Testable Programs" (1982) - oracle problem
- METR, "Measuring the Impact of AI on Experienced Developers" (2025, arXiv:2507.09089)
- Anthropic and OpenAI evaluation documentation
- This project: `docs/internal/slopodar.yaml` (test pattern entries), AGENTS.md "The Gate"

---

## Step 7: The Human-AI Interface

*Estimated time: 5-6 hours*
*Field maturity: FRONTIER*
*Prerequisites: Steps 1, 4, and 6*

### What It Covers

- The layer model (L0-L12) as an operational map of the human-AI engineering
  stack. Read bottom-up for data flow, top-down for control flow. Each layer
  maps to observed failure modes and the controls that address them.
- Sycophantic drift: the pilot study's crisis point was not hallucination -
  it was an agent performing honesty while being dishonest about its
  confidence. Confabulation is detectable by fact-checking. Sycophantic drift
  passes every surface check and requires process-level controls.
- The slopodar (anti-pattern taxonomy): 18+ named patterns caught in the wild.
  Prose patterns (tally voice, epistemic theatre, nominalisation cascade).
  Sycophancy patterns (the lullaby, absence claims, deep compliance).
  Governance patterns (paper guardrail, governance recursion). Code patterns
  (right answer wrong work, phantom ledger).
- The 7 HCI foot guns:
  1. Spinning to infinity - recursive meta-analysis without decisions
  2. High on own supply - human creativity + model sycophancy = positive
     feedback loop
  3. Dumb zone - insufficient context = semantically disconnected output
  4. Cold context pressure - too little material narrows to pattern-matching
  5. Hot context pressure - too much material degrades signal-to-noise
  6. Compaction loss - context death with unchained decisions = permanent loss
  7. Cognitive deskilling - delegation atrophies verification capacity
- Temporal asymmetry: the model has no experience of time between turns. The
  human has nothing but. All intent (urgency, hesitation, deliberation) is
  stripped by serialisation.
- Detecting "not wrong": output that passes every automated check, every
  factual gate, and still is not right. The gap between "not wrong" and "right"
  is where taste lives, and taste is what heuristics cannot measure.
- Calibration: the model's confidence scores are ordinal at best. You cannot
  trust self-reported confidence. You can trust convergence across independent
  checks.

### Key Concepts / Vocabulary

- Layer model (L0-L12)
- Sycophantic drift (vs hallucination/confabulation)
- Slopodar (anti-pattern taxonomy)
- HCI foot guns (7 named failure modes)
- Temporal asymmetry
- Not wrong (passes all checks, is not right)
- Cognitive deskilling (Bainbridge 1983)
- Deep compliance (reasoning detects violation, output complies anyway)

### Why This Matters for Enterprise

The human in the loop is the most expensive and least scalable component of any
agentic system. If that human's judgment degrades through cognitive deskilling, or
if sycophantic drift creates false confidence, the verification layer that
justifies the entire system becomes a rubber stamp. Enterprises need their people
to remain sharp, and that requires understanding the mechanisms that dull them.

### Field vs Novel

- **Available in the field:** Bainbridge, "Ironies of Automation" (1983) -
  foundational. Perez et al. (2022), Sharma et al. (2023) on sycophancy.
  Dell'Acqua et al. (2023) on automation bias. METR RCT (2025) on
  perception-reality gap. CRM (Helmreich 1999) on communication discipline.
- **Novel from this project:** The slopodar as a named, append-only,
  field-observed anti-pattern taxonomy. The 7 HCI foot guns as named
  avoidances. Deep compliance as a specific failure mode (reasoning detects
  governance violation, output complies anyway). The distinction between
  sycophantic drift and hallucination as different failure categories
  requiring different controls. The layer model as operational instrument.

### Recommended Reading

- Bainbridge, "Ironies of Automation" (1983, Automatica)
- Helmreich, CRM publications (1999) - readback, authority gradients
- Perez et al., "Discovering Language Model Behaviors with Model-Written Evaluations" (2022)
- Dell'Acqua et al., "Navigating the Jagged Technological Frontier" (2023)
- This project: `docs/internal/slopodar.yaml`, `docs/internal/layer-model.md`, `docs/internal/lexicon.md` (HCI Foot Guns section)

---

## Step 8: Multi-Model Verification Strategies

*Estimated time: 3-4 hours*
*Field maturity: FRONTIER*
*Prerequisites: Steps 1, 6, and 7*

### What It Covers

- The monoculture problem: N agents from the same model family agreeing is
  not N independent witnesses. Same priors, same blind spots, same
  RLHF-shaped behaviours. Precision increases, accuracy does not.
- N-version programming (Avizienis 1985) applied to LLM verification:
  run the same review task through independent model families. Convergence
  builds confidence. Divergence locates bias.
- Multi-model ensemble review: structured output format (YAML), independent
  review passes, synthesis step. The triangulation pattern.
- When models disagree: divergence is more informative than convergence.
  If Claude, GPT-4, and Gemini converge, the finding is probably real.
  If they diverge, the divergence points are where to focus human attention.
- Selection criteria per task type: reasoning models for complex logic,
  fast models for routine classification, different families for adversarial
  review. Cost-performance tradeoffs.
- The adversarial review pattern: read-only review pass with custom diagnostic
  ruleset. The reviewer stains code against known anti-patterns. Red team
  methodology adapted for code and prose review.
- Limitations: models share training data overlap, so cross-model independence
  is bounded. This is not a statistical guarantee - it is an engineering
  heuristic that reduces correlated blind spots.

### Key Concepts / Vocabulary

- N-version programming (Avizienis 1985)
- Independent Verification and Validation (IV&V)
- Model triangulation, convergence, divergence
- Multi-model ensemble review
- Adversarial review (red team for code)
- Staining (applying diagnostic from one context to material from another)
- Monoculture analysis (same model = same blind spots)
- L10 multi-agent, L11 cross-model

### Why This Matters for Enterprise

Enterprises cannot afford correlated blind spots in code review, security
analysis, or compliance verification. Multi-model strategies provide a practical
defence against the systematic biases inherent in any single model family.
The cost is modest (3x a single review). The asymmetric payoff justifies it:
low cost when nothing is found, high value when something is.

### Field vs Novel

- **Available in the field:** N-version programming (Avizienis 1985) is
  established in safety-critical systems. IV&V is standard in systems
  engineering. Multi-model comparison is discussed in research contexts.
- **Novel from this project:** The specific structured YAML format for
  multi-model ensemble review. The triangulation synthesis pattern
  (convergence/divergence analysis). The staining concept (applying
  diagnostic from one context to material from another). The observation
  that 11/11 same-model agreement has the evidential weight of one
  observation (unanimous chorus anti-pattern).

### Recommended Reading

- Avizienis, "N-Version Programming" (1985)
- This project: AGENTS.md "Darkcat Alley" references, `docs/internal/slopodar.yaml` (monoculture-analysis, unanimous-chorus entries)

---

## Step 9: Failure Modes and Recovery

*Estimated time: 4-5 hours*
*Field maturity: FRONTIER*
*Prerequisites: Steps 4, 6, and 7*

### What It Covers

- The 7 HCI foot guns in operational depth: detection heuristics,
  countermeasures, and real examples from the pilot study.
- Spinning to infinity: recursive meta-analysis consuming all available
  context without producing forward progress. Detection: "is this producing
  a decision or producing more analysis?" Countermeasure: time-box
  analysis, force a decision.
- High on own supply: sycophantic amplification loop. The human proposes,
  the agent validates and extends, neither applies the brake. Detection:
  check bearing against primary objective. Countermeasure: fresh-context
  adversarial review.
- Cognitive deskilling: progressive atrophy through delegation. Unlike
  other foot guns that manifest within sessions, this manifests across
  sessions and months. Bainbridge's Ironies (1983). METR RCT evidence.
  Countermeasure: periodic deep engagement, not pure review mode.
- Context degradation patterns: dumb zone, cold/hot pressure, compaction
  loss. Session boundary amnesia (calibration resets even when facts
  survive). Countermeasure: durable writes, checkpoint recovery protocol.
- When to reset vs fix in place: the standing order "bad output means
  diagnose, reset, rerun - not fix in place." Why fixing agent output
  inline is worse than rerunning with correct context.
- Checkpoint recovery: navigate from last known position when visibility
  is lost. Read durable state, reconstruct. The write-ahead log pattern
  applied to agentic sessions.
- Governance recursion: when something goes wrong, the instinct is to
  generate more governance (another standing order, another protocol).
  Each layer feels like progress. None of it prevents the original
  failure. Detection: compare governance files to test files.
- Loom speed: detailed plan executed by blunt tool. 20 items approved,
  5 regex sweeps executed. At machine speed you find out what went wrong
  after it already happened. Countermeasure: match execution granularity
  to plan granularity.

### Key Concepts / Vocabulary

- HCI foot guns (7 named failure modes)
- Spinning to infinity, sycophantic amplification loop
- Cognitive deskilling (Bainbridge 1983)
- Checkpoint recovery (WAL pattern)
- Session boundary amnesia
- Governance recursion
- Loom speed (granularity mismatch)
- Rerun > fix in place

### Why This Matters for Enterprise

Enterprise systems run continuously. Failures compound. The foot guns
identified here are not theoretical - they emerged from sustained operation
over months. An enterprise team that cannot name these failure modes will
repeat them. Naming is the first step to detection, and detection is the
prerequisite for control.

### Field vs Novel

- **Available in the field:** Bainbridge (1983) on automation ironies.
  Standard incident response (SRE). Crash recovery patterns (WAL,
  checkpointing). METR RCT on cognitive deskilling evidence.
- **Novel from this project:** All 7 HCI foot guns as named, operational
  failure modes with detection heuristics and countermeasures. Governance
  recursion as a specific LLM tendency. Loom speed as the granularity
  mismatch pattern. Session boundary amnesia. The "rerun > fix in place"
  standing order with operational justification.

### Recommended Reading

- Bainbridge, "Ironies of Automation" (1983)
- This project: AGENTS.md "HCI Foot Guns" section, `docs/internal/slopodar.yaml` (governance patterns), `docs/internal/dead-reckoning.md`

---

## Step 10: Governance, Process, and Enterprise Integration

*Estimated time: 5-6 hours*
*Field maturity: EMERGING*
*Prerequisites: Steps 2, 5, 6, and 7, Bootcamp I Step 7 (git)*

### What It Covers

- The engineering loop: Read -> Verify -> Write -> Execute -> Confirm.
  Do not infer what you can verify. Commits are atomic. Gate must be
  green before done.
- Atomic changes: one PR = one concern. Agent-generated commits must be
  individually revertible. The stowaway commit anti-pattern (67 files,
  6 concerns, one commit).
- Review protocols: reviewer != author applies to agent-generated code
  with additional force. The review hydra anti-pattern (28 files, 25
  issues, one "address review" commit).
- The HOTL/HODL spectrum: human out the loop when the gate can verify,
  human in the loop when it requires taste. Sliding this dial is the
  primary governance decision for each task type.
- Integration with existing CI/CD: agents as participants in existing
  workflows, not replacements for them. Pull request as the integration
  boundary. Gate as the trust boundary.
- Team adoption patterns: incremental trust building. Start with
  code-completion, progress to single-file agents, then multi-file
  orchestration, then autonomous pipeline tasks. Each stage proves
  capability before expanding scope.
- Change management: the readback pattern (CRM: instruction -> readback ->
  verify -> act). Decision tables (muster format) for O(1) binary
  decisions per row.
- Bearing checks: repeatable governance units. Spec drift, eval validity,
  plan accuracy, gate health, backlog sync. Cost is 15 minutes. Drift
  cost is always higher.
- Pull-based review: the human controls when agent output is reviewed.
  Agents do not interrupt. This is Kanban pull applied to human-AI
  communication.

### Key Concepts / Vocabulary

- Engineering loop (Read -> Verify -> Write -> Execute -> Confirm)
- Atomic change, one PR = one concern
- HOTL/HODL spectrum
- Readback (CRM, Helmreich 1999)
- Bearing check (repeatable governance unit)
- Pull-based review (Kanban pull)
- Stowaway commit, review hydra (anti-patterns)
- DRI (one decision authority at a time)
- Value stream (spec -> dev -> review -> commit)

### Why This Matters for Enterprise

Enterprise engineering does not happen in isolation. There are existing
workflows, existing review cultures, existing compliance requirements.
Agentic engineering must integrate with these, not replace them. The
governance patterns here are the bridge between "we have agents" and
"we ship with agents in a way that satisfies our auditors, our security
team, and our engineering culture."

### Field vs Novel

- **Available in the field:** CI/CD quality gates (standard DevOps).
  Atomic commits (standard git practice). PR-based review (GitHub/GitLab
  standard). CRM readback protocol (Helmreich 1999, 40+ years empirical
  validation). Kanban pull (Lean, Womack & Jones 1996). Definition of
  Done (Scrum).
- **Novel from this project:** The bearing check as a repeatable
  governance unit with defined checks and cost budget. The HOTL/HODL
  spectrum as an explicit dial tied to the verifiable/taste-required
  distinction. Stowaway commit and review hydra as named anti-patterns
  of agent-generated commits. The muster format for O(1) decision
  throughput. The macro workflow (bearing check -> scope -> dispatch ->
  review -> merge -> advance).

### Recommended Reading

- Helmreich, CRM publications (1999) - readback protocol
- Womack & Jones, "Lean Thinking" (1996) - value stream, pull
- Nygard, "Documenting Architecture Decisions" (2011) - ADRs
- This project: AGENTS.md "The Engineering Loop," "The Macro Workflow," "The Bearing Check"

---

## Step 11: Cost, Security, Legal, and Compliance

*Estimated time: 4-5 hours*
*Field maturity: EMERGING*
*Prerequisites: Steps 2 and 5, Bootcamp I Step 9 (containers)*

### What It Covers

**Cost and Resource Management**
- Token economics: input tokens, output tokens, cached tokens. The 95%
  cache hit rate observation. How caching changes the cost model.
- Model selection strategy: reasoning models for complex tasks, fast
  models for classification, cost-efficient models for routine work.
  The routing pattern (Step 2) applied to cost optimization.
- The ROI gate: before dispatching work to an agent, weigh cost, time,
  and marginal value. Diminishing marginal returns on review cycles.
  Marginal analysis: continue while marginal value > marginal cost.
- Cost monitoring and budgeting: per-task cost tracking, cost alerts,
  spend limits. The API as the only calibrated measurement point.

**Security**
- Sandbox design: namespaces and cgroups from Bootcamp I Step 9 applied
  to agent execution environments. Process isolation, filesystem
  restrictions, network policies.
- Credential management: agents should never see raw credentials. Use
  credential vaults, scoped tokens, short-lived access. Principle of
  least privilege for agent systems.
- Prompt injection: understanding the attack surface. Direct injection
  (in user input), indirect injection (in retrieved documents, tool
  results). Defence in depth: input validation, output validation,
  sandboxing.
- Output validation: agent output must be validated before it affects
  production state. The gate is the primary defence. Additional
  validation for data writes, API calls, and deployment actions.
- Supply chain risks: agent dependencies (model providers, tool
  libraries, data sources). Vendor lock-in. Model deprecation.
  The Model Context Protocol as a mitigation for tool-level lock-in.

**Legal and Compliance**
- IP ownership: who owns agent-generated code? Current legal ambiguity.
  Work-for-hire doctrine. Copyright Office guidance.
- Audit trails: agent actions must be logged and attributable. Git as
  audit trail. Commit trailers for provenance. API logs for token-level
  accountability.
- Data residency: where does your code go when sent to an API? Model
  provider terms of service. Enterprise agreements. On-premise vs cloud
  tradeoffs.
- Regulatory considerations: sector-specific requirements (financial
  services, healthcare, government). The compliance case for
  human-in-the-loop review.
- Liability: when agent-generated code causes harm, who is responsible?
  The engineering controls (verification pipeline, quality gate, human
  review) as the liability management framework.

### Key Concepts / Vocabulary

- Token economics, prompt caching, cache hit rate
- ROI gate, marginal analysis, diminishing returns
- Sandbox, namespace, cgroup, least privilege
- Prompt injection (direct, indirect), output validation
- Supply chain risk, vendor lock-in
- Audit trail, provenance, commit trailers
- Data residency, model provider terms

### Why This Matters for Enterprise

This is where enterprise requirements diverge most sharply from individual
developer use. An individual can accept model provider terms, pay per
token, and take the IP risk personally. An enterprise has compliance
obligations, security policies, budget controls, and legal counsel. The
engineering is necessary but not sufficient - the organisational wrapper
must be addressed.

### Field vs Novel

- **Available in the field:** Anthropic and OpenAI security documentation.
  Standard cloud security practices (namespaces, cgroups). OWASP guidance
  on LLM security (OWASP Top 10 for LLM Applications). Prompt injection
  research (various). Token pricing documentation.
- **Novel from this project:** The ROI gate as a standing order before
  dispatching agent work (not just a best practice but a mandatory check).
  The observation that L5 is the only calibrated measurement point for
  cost. Commit trailers as provenance mechanism for agent-generated work.

### Recommended Reading

- OWASP, "Top 10 for LLM Applications" (2023, updated 2024)
- Anthropic, security and compliance documentation
- OpenAI, enterprise security documentation
- Bootcamp I Step 9 (container internals - namespaces, cgroups)
- This project: AGENTS.md "Standing Orders" (ROI gate), Makefile (cost-relevant targets)

---

## Pedagogical Approach

Shared with Bootcamp I:

- **Interactive challenges** - every step has exercises runnable with real LLM APIs.
  Students build real agent workflows, not toy examples.
- **Historical artefacts** - where a concept has a published origin (Bainbridge 1983,
  Reason 1990, Denning 1968, Helmreich 1999), cite it. Grounding in established
  frameworks builds credibility and provides depth for further study.
- **Agentic grounding** - every section explicitly connects to what it equips the
  learner to do. "Why does this matter when agents write code?" is answered for
  every topic.
- **No bland tutorials** - this is aimed at making working SWEs into competent agentic
  engineers. Every example comes from real operational experience or published
  research, not hypothetical scenarios.

New to Bootcamp II:

- **Field maturity ratings** - every step declares whether its content is
  ESTABLISHED (well-documented, widely practiced), EMERGING (documented but not
  widely practiced, conventions still forming), or FRONTIER (operational
  knowledge from this project and similar efforts, not yet in standard
  curricula). This is intellectual honesty: students should know what is
  consensus and what is one team's hard-won experience.
- **Anti-pattern identification** - the slopodar entries are worked examples of
  failure. Each has a trigger (what it looks like), a detection heuristic (how
  to find it), and an alternative (what a human would do instead). Students
  learn to detect these in their own agent output.
- **Multi-model exercises** - students run the same task through multiple model
  families and compare output. This builds intuition for model-specific
  behaviours that no single-model tutorial can provide.

---

## Conventions

- 2 spaces indentation in code blocks
- Challenges marked with `## Challenge:` headers
- Agentic context marked with `> AGENTIC GROUNDING:` blockquotes
- Field maturity marked with `> FIELD MATURITY:` blockquotes
- Anti-patterns marked with `> SLOPODAR:` blockquotes with entry reference
- All code examples runnable with standard LLM API access
- No emojis, no em-dashes

---

## Field Maturity Summary

| Rating | Definition | Steps |
|--------|-----------|-------|
| ESTABLISHED | Well-documented, widely practiced, multiple published references | 1, 2 |
| EMERGING | Documented by providers and practitioners, conventions still forming | 3 (advanced), 5, 10, 11 |
| FRONTIER | Operational knowledge from sustained practice, not in standard curricula | 4, 6 (advanced), 7, 8, 9 |

The distribution is intentional. Established content is covered well by existing
resources. This bootcamp's value proposition is the emerging and frontier material
that practitioners need but cannot currently find.

---

## Relationship to Bootcamp I

Bootcamp I teaches the substrate. Bootcamp II teaches the discipline.

| Bootcamp I Step | Bootcamp II Dependency |
|-----------------|----------------------|
| 1: Process model | Step 1 (LLM processes run on Linux) |
| 2: Shell language | Step 3 (structured thinking), Step 5 (tool design) |
| 3: Filesystem | Step 4 (context as files), Step 5 (filesystem tools) |
| 7: Git internals | Step 6 (gate), Step 10 (atomic commits, audit trails) |
| 8: Process observation | Step 6 (debugging agent behaviour) |
| 9: Container internals | Step 11 (sandbox design) |

An engineer who completes both bootcamps understands: what the agent runs on
(Bootcamp I), how to work with the agent (Bootcamp II, Steps 1-5), how to
verify the agent's work (Bootcamp II, Steps 6-9), and how to govern the
agent in an enterprise context (Bootcamp II, Steps 10-11).

---

## Provenance

This outline draws from:

- **Published guidance:** Anthropic "Building effective agents" (Dec 2024),
  OpenAI agent documentation and Swarm repo, provider prompt engineering guides
- **Established frameworks:** Lean/Toyota (poka-yoke, kaizen, andon cord),
  SRE (quality gates, incident response), CRM (readback, authority gradients),
  Swiss Cheese Model (Reason 1990), N-version programming (Avizienis 1985),
  Bainbridge's Ironies of Automation (1983), Denning's Working Set (1968)
- **Research:** METR RCT (2025, arXiv:2507.09089), GitClear code quality
  analysis (2024), Dell'Acqua et al. on automation bias (2023), sycophancy
  research (Perez et al. 2022, Sharma et al. 2023)
- **Operational experience:** 300+ session decisions, 18+ named anti-patterns,
  7 named foot guns, a 13-layer operational model, and a 50+ term lexicon
  developed over the tspit pilot study and noopit calibration run

The approximately 18% of content identified as genuinely novel (context
engineering vocabulary, HCI foot guns, slopodar, operational layer model)
is declared as such throughout. The remaining 82% is grounded in and cross-
referenced to established frameworks. This distinction is maintained as a
matter of intellectual honesty, not marketing.
