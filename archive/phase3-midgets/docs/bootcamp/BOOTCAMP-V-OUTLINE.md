# Bootcamp V: Agent Infrastructure in Practice

**Date:** 2026-03-10
**Author:** Operator + Weaver
**Provenance:** Coverage gap analysis of Bootcamps I-III, Anthropic "Building effective
agents" (Dec 2024), project operational experience (file-based state, boot sequence,
pitkeel observability, epic E3.3 "Open Brain"), field survey of RAG/memory/observability
tooling as of March 2026
**Status:** OUTLINE - curriculum under development

---

## What This Is

A structured programme covering the three infrastructure concerns that turn a prototype
agent into a production system: retrieval (getting the right information to the agent),
state management (remembering what matters across interactions), and observability
(knowing what the agent is doing and why it went wrong).

These three topics share tooling (embeddings appear in both retrieval and memory),
share concerns (state management underlies both retrieval indices and conversation
history), and observability is how you diagnose when either breaks. They belong
together.

## What This Is Not

This is not a LangChain tutorial. It is not "pip install chromadb and call it RAG."
It is the engineering discipline underneath retrieval, state, and observability -
the principles that survive framework changes, the failure modes that frameworks
hide, and the architectural decisions that determine whether your agent system
scales or collapses.

## Why This Exists

Bootcamps I-III produce an engineer who understands the substrate, the discipline,
and the analytics. Bootcamp IV adds evaluation. But between "I have an agent that
works in a demo" and "I have an agent that works in production with real data,
persistent state, and diagnosable failures" lies infrastructure that none of the
previous bootcamps address.

The gap is concrete:

1. **Retrieval:** Agents need access to information beyond their training data.
   RAG is the dominant pattern, but most implementations are naive (chunk, embed,
   retrieve top-k, hope for the best). Understanding retrieval quality, chunking
   strategies, reranking, and hybrid search is the difference between a demo and
   a system.

2. **State:** Agents that forget everything between interactions are useful for
   one-shot tasks but useless for sustained work. This project's file-based state
   system (AGENTS.md boot sequence, events.yaml, session-decisions, .keel-state)
   is a deliberate, well-reasoned approach to state management without databases.
   But most production systems need more - conversation memory, session persistence,
   long-term knowledge accumulation.

3. **Observability:** When an agent fails silently, produces subtly wrong output,
   or takes 50 steps instead of 5, you need to see what happened. This project has
   pitkeel (session analysis) and catch-log.tsv (control firing events), but lacks
   standard observability tooling. Most agent systems in production have even less.

## Prerequisites

- Bootcamp I Steps 1-5 minimum (process model, shell, filesystem, text pipeline, Python)
- Bootcamp I Step 9 recommended (containers - for deployment contexts)
- Bootcamp II Steps 2 and 5 (agent architecture, tool design)
- Bootcamp II Step 4 (context engineering) - critical for understanding retrieval
- Familiarity with Python, SQL basics (Bootcamp III Step 3 helpful)
- Access to at least one embedding API (OpenAI, Anthropic, or local via sentence-transformers)

---

## The Dependency Graph

```
Step 1: The retrieval problem (why agents need external knowledge)
+-- Step 2: Embeddings and vector search
|   +-- Step 3: RAG pipeline engineering
|   |   +-- Step 4: Advanced retrieval patterns
+-- Step 5: State management for agents
|   +-- Step 6: Conversation memory and session persistence
+-- Step 7: Agent observability and tracing
|   +-- Step 8: Debugging agent systems
+-- Step 9: Production patterns (deployment, scaling, reliability)
```

---

## The Steps

### Tier 1 - Retrieval (getting the right information to the agent)

| Step | Topic | Est. Time | Field Maturity |
|------|-------|-----------|----------------|
| 1 | The retrieval problem | 3-4h | Established |
| 2 | Embeddings and vector search | 4-5h | Established |
| 3 | RAG pipeline engineering | 5-6h | Established/Emerging |
| 4 | Advanced retrieval patterns | 4-5h | Emerging |

### Tier 2 - State (remembering what matters)

| Step | Topic | Est. Time | Field Maturity |
|------|-------|-----------|----------------|
| 5 | State management for agents | 4-5h | Emerging |
| 6 | Conversation memory and session persistence | 4-5h | Emerging/Frontier |

### Tier 3 - Observability and Production (knowing what happened)

| Step | Topic | Est. Time | Field Maturity |
|------|-------|-----------|----------------|
| 7 | Agent observability and tracing | 4-5h | Emerging |
| 8 | Debugging agent systems | 4-5h | Emerging/Frontier |
| 9 | Production patterns | 4-5h | Emerging |

**Total estimated time: 36-45 hours (~1-1.5 weeks focused study)**

---

## Step 1: The Retrieval Problem

*Estimated time: 3-4 hours*
*Field maturity: ESTABLISHED*
*Prerequisites: Bootcamp II Step 4 (context engineering)*

### What It Covers

- Why agents need external knowledge: training data is stale, incomplete, and
  generic. Enterprise agents need access to company documents, codebases, databases,
  and real-time information.
- The context engineering connection: RAG is a context engineering strategy. It
  dynamically populates the context window with relevant information. The working
  set concept (Bootcamp II Step 4) applies directly - RAG's job is to construct
  the working set for each query.
- The retrieval spectrum: from simple keyword search to semantic search to hybrid
  approaches. Each has tradeoffs in precision, recall, latency, and cost.
- The naive RAG pipeline: chunk documents -> embed chunks -> store in vector
  database -> embed query -> retrieve top-k similar chunks -> inject into prompt.
  What this gets right and where it breaks.
- Where naive RAG fails: chunks that split important context across boundaries,
  queries that don't match document vocabulary, retrieval of superficially similar
  but semantically wrong content, context window flooding with marginally relevant
  information.
- The retrieval quality problem: precision (are the retrieved documents relevant?)
  and recall (did we miss relevant documents?). MRR (mean reciprocal rank),
  nDCG (normalised discounted cumulative gain). How to measure retrieval quality
  independently from generation quality.
- When not to use RAG: small knowledge bases that fit in the prompt, tasks where
  the model's training data is sufficient, real-time data where freshness
  requirements exceed indexing speed.

### Key Concepts / Vocabulary

- RAG (Retrieval-Augmented Generation)
- Working set (Denning 1968, applied to retrieval)
- Precision, recall, MRR, nDCG
- Naive RAG, chunking, embedding, top-k retrieval
- Cold context pressure (retrieval failure produces this)
- Stale reference propagation (outdated index produces this)

### Why This Matters for Enterprise

Enterprise RAG is the most common production agent pattern as of 2026. Customer
service bots, internal knowledge bases, compliance document search, code search
across repositories - all are RAG applications. The difference between a system
that retrieves the right paragraph and one that retrieves a plausible but wrong
paragraph is the difference between a useful tool and a liability.

### Field vs Novel

- **Available in the field:** Lewis et al., "Retrieval-Augmented Generation for
  Knowledge-Intensive NLP Tasks" (2020) - the foundational paper. Anthropic's
  context window documentation. OpenAI's retrieval tools. Information retrieval
  fundamentals (Manning et al., "Introduction to Information Retrieval", 2008).
- **Novel from this project:** The explicit connection between RAG and context
  engineering vocabulary. RAG failure as a form of cold context pressure (retrieval
  fails, model falls back to pattern-matching from training data). Outdated indices
  as stale reference propagation (same failure mode as stale AGENTS.md files,
  but automated). The working set concept applied to retrieval - RAG's job is to
  construct the Denning working set for each query.

---

## Step 2: Embeddings and Vector Search

*Estimated time: 4-5 hours*
*Field maturity: ESTABLISHED*
*Prerequisites: Step 1, Bootcamp I Step 5 (Python CLI)*

### What It Covers

- What embeddings are: dense vector representations of text where semantic
  similarity corresponds to geometric proximity. Not magic - a learned mapping
  from text to numbers that preserves meaning relationships.
- Embedding models: OpenAI's text-embedding-3-small/large, Anthropic's embedding
  API, open-source alternatives (sentence-transformers, E5, BGE). Dimension
  tradeoffs. Model selection criteria.
- Similarity metrics: cosine similarity (most common), dot product, Euclidean
  distance. When each is appropriate. Why cosine similarity dominates for
  normalised embeddings.
- Vector databases: purpose-built storage for embedding vectors with approximate
  nearest neighbour (ANN) search. Landscape: pgvector (Postgres extension),
  Chroma (lightweight, Python-native), Pinecone (managed), Weaviate (open-source),
  Qdrant (Rust-based), FAISS (Facebook, library not database).
- Choosing a vector store: in-memory for development (FAISS, Chroma), pgvector
  for existing Postgres infrastructure, managed services for scale. The "do I
  even need a vector database?" question - for small datasets, numpy + cosine
  similarity is sufficient.
- Indexing strategies: HNSW (hierarchical navigable small world), IVF (inverted
  file index), PQ (product quantisation). Not the algorithms in detail - the
  operational tradeoffs: build time, query speed, memory usage, recall.
- Embedding quality: how to evaluate whether your embeddings capture the right
  similarity. The embedding evaluation problem is an instance of the eval
  problem from Bootcamp IV.

### Key Concepts / Vocabulary

- Embedding, vector, dense representation
- Cosine similarity, approximate nearest neighbour (ANN)
- Vector database (pgvector, Chroma, FAISS, Pinecone, Qdrant, Weaviate)
- HNSW, IVF, indexing strategy
- Embedding model (text-embedding-3, sentence-transformers)

### Exercises

- Embed 100 text chunks using OpenAI's API. Store in both numpy (in-memory) and
  Chroma. Query both with the same 10 queries. Compare: results identical? Latency?
- Build a simple semantic search over the project's slopodar entries: embed each
  pattern's description, then query "code that looks correct but isn't" and see
  which patterns surface. Evaluate: does the ranking make sense?
- Compare two embedding models (OpenAI vs sentence-transformers) on the same
  corpus. Measure: cosine similarity distributions, top-k overlap rate, qualitative
  relevance of results.

### Field vs Novel

- **Available in the field:** OpenAI embeddings documentation. Sentence-transformers
  library (Reimers & Gurevych 2019). Extensive vector database documentation and
  tutorials. MTEB leaderboard for embedding model comparison.
- **Novel from this project:** The Bootcamp III Step 9 (text analysis) coverage of
  SequenceMatcher and string similarity as the non-embedding baseline. The
  triangulate script's matching algorithm (0.3 * file_sim + 0.7 * title_sim) as
  a worked example of when embeddings are overkill and string similarity suffices.

---

## Step 3: RAG Pipeline Engineering

*Estimated time: 5-6 hours*
*Field maturity: ESTABLISHED core, EMERGING for advanced patterns*
*Prerequisites: Steps 1-2*

### What It Covers

- The full RAG pipeline: document ingestion -> chunking -> embedding ->
  indexing -> query processing -> retrieval -> context assembly -> generation.
  Each step has engineering decisions.
- Chunking strategies: fixed-size (token count), semantic (paragraph/section
  boundaries), recursive (split at largest boundary first, then subdivide).
  Overlap between chunks to preserve context across boundaries. Chunk size
  tradeoffs: too small = lost context, too large = diluted relevance.
- Document preprocessing: handling multiple formats (PDF, HTML, markdown, code).
  Metadata extraction (source, date, author, section headers). Metadata as
  filterable attributes in the vector store.
- Query processing: the user's query may not match document vocabulary. Query
  expansion, hypothetical document embedding (HyDE - generate a hypothetical
  answer, embed that instead of the query), query decomposition for complex
  questions.
- Context assembly: retrieved chunks need to be assembled into a coherent
  prompt. Ordering (most relevant first vs chronological), deduplication,
  source attribution. The context budget problem: more retrieved context
  improves grounding but costs tokens and risks hot context pressure.
- Citation and grounding: connecting generated claims to retrieved sources.
  The hallucination problem in RAG: the model generates plausible content
  that is not supported by the retrieved documents. Faithful generation
  techniques.
- RAG evaluation: evaluating retrieval quality (precision, recall, MRR)
  independently from generation quality (faithfulness, relevance, completeness).
  RAGAS framework metrics. The connection to Bootcamp IV eval methodology.
- Failure mode analysis: what happens when retrieval fails? What happens when
  the right document exists but is chunked badly? What happens when the query
  is ambiguous? Designing for graceful degradation.

### Key Concepts / Vocabulary

- Chunking (fixed, semantic, recursive), chunk overlap
- Document preprocessing, metadata extraction
- Query expansion, HyDE, query decomposition
- Context assembly, context budget
- Citation, grounding, faithful generation
- RAG evaluation (RAGAS), retrieval quality vs generation quality

### Exercises

- Build a RAG pipeline over the project's bootcamp documentation (12 markdown
  files). Implement: recursive chunking, OpenAI embeddings, Chroma storage,
  cosine similarity retrieval. Query: "What should I know about process
  observation?" Evaluate: are the retrieved chunks from the right step?
- Compare 3 chunking strategies (fixed 500 tokens, fixed 1000 tokens, semantic
  by markdown headers) on the same corpus. Measure retrieval precision@5 for
  10 test queries.
- Implement citation: for each generated sentence, annotate which retrieved
  chunk it draws from. Evaluate: what percentage of generated claims have
  retrievable source support?

### Field vs Novel

- **Available in the field:** LangChain/LlamaIndex RAG tutorials (extensive).
  Anthropic's retrieval documentation. OpenAI's file search tool. RAGAS
  evaluation framework. HyDE (Gao et al. 2022).
- **Novel from this project:** The BFS depth rule (AGENTS.md) as a manual
  retrieval strategy that a RAG system could automate: depth 1 = always load,
  depth 2 = load when relevant, depth 3+ = deliberate research only. The
  context quality loop applied to RAG: clean documents produce better
  retrievals produce better generation produce better documents.

---

## Step 4: Advanced Retrieval Patterns

*Estimated time: 4-5 hours*
*Field maturity: EMERGING*
*Prerequisites: Step 3*

### What It Covers

- Hybrid search: combining semantic search (embeddings) with lexical search
  (BM25/TF-IDF). Semantic search finds meaning-similar content. Lexical search
  finds exact keyword matches. Together they cover more ground than either alone.
  Reciprocal rank fusion for combining results.
- Reranking: two-stage retrieval. Stage 1: fast, broad retrieval (top-100 by
  embedding similarity). Stage 2: rerank with a cross-encoder model that sees
  both query and document together. More accurate but more expensive. Cohere
  Rerank, ColBERT, cross-encoder models.
- Multi-modal retrieval: images, tables, code alongside text. Embedding images
  (CLIP), embedding code (code-specific embedding models), table understanding.
  When multi-modal retrieval adds value vs complexity.
- Agentic RAG: the agent decides when to retrieve, what to query, and how to
  use results. Self-RAG (Asai et al. 2023): the model generates retrieval tokens
  that trigger retrieval as needed rather than always retrieving. Corrective RAG:
  evaluate retrieval quality and re-retrieve if low.
- Knowledge graphs + RAG: structured knowledge (entities, relationships) combined
  with unstructured retrieval. GraphRAG (Microsoft 2024). When graph structure
  adds value: multi-hop reasoning, entity disambiguation, relationship queries.
- Retrieval for code: searching codebases semantically. Code-specific embeddings,
  repository-level context, file dependency awareness. The difference between
  finding a function definition and understanding how it is used.
- Index maintenance: document updates, deletions, re-indexing strategies. The
  freshness problem: how quickly do new documents become searchable? Incremental
  indexing vs full rebuild.

### Key Concepts / Vocabulary

- Hybrid search, BM25, reciprocal rank fusion
- Reranking, cross-encoder, two-stage retrieval
- Agentic RAG, Self-RAG, Corrective RAG
- Knowledge graphs, GraphRAG
- Code retrieval, repository-level context
- Index maintenance, incremental indexing

### Exercises

- Implement hybrid search: BM25 + embedding retrieval over the bootcamp docs.
  Combine with reciprocal rank fusion. Compare to embedding-only retrieval on
  10 test queries. Measure: top-5 precision improvement.
- Add a reranker: use a cross-encoder (sentence-transformers) to rerank the
  top-20 embedding results. Measure: does reranking improve relevance for
  ambiguous queries?
- Implement agentic RAG: give the agent a retrieval tool it can call when
  needed (rather than always retrieving). Compare: when does the agent correctly
  decide NOT to retrieve?

---

## Step 5: State Management for Agents

*Estimated time: 4-5 hours*
*Field maturity: EMERGING*
*Prerequisites: Bootcamp I Step 3 (filesystem as state), Bootcamp II Step 4
(context engineering)*

### What It Covers

- The state management spectrum: from stateless (one-shot agent jobs, fresh
  context every time) to fully stateful (persistent memory across sessions,
  evolving knowledge). Where on the spectrum you should be depends on the task.
- The filesystem as state: this project's approach. AGENTS.md as boot state,
  events.yaml as event log, session-decisions as decision chain, .keel-state
  as runtime state. A worked example of deliberate, file-based state management.
  When this is sufficient and when it isn't.
- State categories:
  - **Ephemeral state:** within a single LLM call. The context window itself.
    Dies when the call ends.
  - **Session state:** within a single conversation or task. Conversation history,
    tool call results, intermediate computations. Dies when the session ends.
  - **Persistent state:** across sessions. User preferences, learned patterns,
    accumulated knowledge. Survives session boundaries.
- The durable write as policy: the standing order "write to durable file, not
  context only" (SD-266). Context window death means ephemeral state is permanently
  lost. The write-ahead log pattern applied to agent state.
- State backends: files (simple, version-controlled, human-readable), SQLite
  (structured, queryable, single-file), Redis (fast, ephemeral, shared),
  Postgres (durable, scalable, relational). Choosing based on requirements.
- State schema design: what to persist and what to let die. Persisting everything
  is expensive and creates noise. Persisting nothing creates amnesia. The working
  set concept applied to state: what is the minimum state for correct behaviour?
- Concurrency and state: when multiple agents access shared state. Locking
  strategies (.keel-state uses flock). Optimistic concurrency. Event sourcing
  as an alternative to mutable state.

### Key Concepts / Vocabulary

- Stateless, session state, persistent state
- Durable write, write-ahead log pattern
- State backend (file, SQLite, Redis, Postgres)
- Working set applied to state
- Event sourcing, append-only logs
- Concurrency, flock, optimistic locking

### Exercises

- Analyse the project's state architecture: map every durable state file
  (AGENTS.md, events.yaml, session-decisions, .keel-state, catch-log.tsv,
  backlog.yaml). For each: what state does it hold? What is its update pattern?
  What happens if it is lost?
- Implement session state for a simple agent: the agent processes 5 sequential
  tasks, each building on the previous result. Store state in (1) a file,
  (2) SQLite. Compare: ease of implementation, queryability, crash recovery.
- Design a state schema for a customer service agent: what must persist across
  sessions (customer history), what persists within a session (conversation
  context), what is ephemeral (current tool call)?

### Field vs Novel

- **Available in the field:** Standard database and caching patterns. Event
  sourcing (Fowler 2005). Redis, SQLite, Postgres documentation. LangChain
  memory abstractions.
- **Novel from this project:** The filesystem-as-state philosophy as a
  deliberate architectural choice, not a limitation. The boot sequence as
  a state restoration mechanism (S0-S3 read order). The .keel-state file
  as a typed, flock-protected runtime state schema. SD-266 "write to durable
  file" as a standing order derived from operational experience with
  compaction loss. The working set concept (Denning 1968) applied to state
  selection.

---

## Step 6: Conversation Memory and Session Persistence

*Estimated time: 4-5 hours*
*Field maturity: EMERGING/FRONTIER*
*Prerequisites: Steps 2 and 5*

### What It Covers

- The memory problem: LLMs have no memory between API calls. Every call starts
  fresh. "Memory" is a context engineering problem: what prior information do
  you inject into the context window, and how?
- Conversation memory patterns:
  - **Full history:** include all prior messages. Simple, accurate, but context
    window grows without bound. Works for short conversations.
  - **Sliding window:** include the last N messages. Fixed cost, but loses early
    context. Good for recent-context tasks.
  - **Summary memory:** periodically summarise the conversation and include the
    summary instead of full history. Compresses context but loses detail.
    The compaction risk: summarisation is lossy.
  - **Entity memory:** extract and maintain key entities (names, numbers, decisions)
    from conversation. Structured state, not free text.
  - **Retrieval-augmented memory:** embed past interactions, retrieve relevant ones
    for the current query. The RAG pattern applied to conversation history.
- Session persistence: saving and restoring conversation state across client
  disconnects, server restarts, and session boundaries. Serialisation formats,
  storage backends, session ID management.
- Memory evaluation: how to test whether the agent "remembers" correctly.
  Consistency evals (ask about something from turn 3 at turn 20). Factual
  accuracy evals (does the memory introduce errors?). Connects to Bootcamp IV.
- The forgetting problem: not everything should be remembered. User corrections
  ("actually, I meant X not Y") should update memory. Privacy-sensitive
  information should be forgotten on request. GDPR and the right to be forgotten
  applied to agent memory.
- Reflexion-style episodic memory: the pattern described in the project's research
  docs - a persistent record of what went wrong and why, surfaced to inform
  future decisions. The session-decisions chain as a worked example.

### Key Concepts / Vocabulary

- Conversation memory (full, sliding window, summary, entity, retrieval-augmented)
- Session persistence, serialisation
- Memory evaluation, consistency eval
- Selective forgetting, right to be forgotten
- Episodic memory (Reflexion pattern)
- Compaction loss applied to memory summarisation

### Exercises

- Implement 3 memory strategies for the same chatbot: full history, sliding
  window (last 10 messages), summary memory. Test with a 50-turn conversation.
  Compare: at turn 50, which strategy correctly answers questions about turn 5?
- Build retrieval-augmented memory: embed all past conversations, retrieve
  relevant turns for each new query. Measure: does this outperform sliding
  window on long conversations?
- Design a memory evaluation: 20 test conversations where specific facts are
  introduced early and queried late. Score each memory strategy on factual
  accuracy at various conversation depths.

---

## Step 7: Agent Observability and Tracing

*Estimated time: 4-5 hours*
*Field maturity: EMERGING*
*Prerequisites: Bootcamp I Step 8 (process observation), Bootcamp II Step 9
(failure modes)*

### What It Covers

- Why agent observability is different from application observability: agents
  make decisions, and decisions need to be explainable after the fact. Traditional
  APM (application performance monitoring) tracks latency and errors. Agent
  observability tracks decisions, tool calls, reasoning chains, and context state.
- The trace: a structured record of an agent's execution path. Each step: input
  to the model, model's output, tool calls made, tool results received, next
  action taken. The trace is to agent debugging what the stack trace is to
  traditional debugging.
- Tracing frameworks: OpenTelemetry for LLM (emerging standard), LangSmith
  (LangChain's observability platform), Braintrust (eval + observability),
  Arize Phoenix (open-source), Inspect AI's tracing. Landscape assessment:
  what exists, what is mature, what is still forming.
- Custom tracing: when frameworks are overkill. Structured logging with
  JSON-per-line (JSONL). Session ID, step number, action type, input, output,
  latency, token count. Queryable with DuckDB (Bootcamp III Step 3).
- The pitkeel model: the project's bespoke observability tool. Session
  duration, scope drift detection, velocity tracking, context depth analysis.
  Not standard observability - a specialised instrument for the human-AI
  interface. When to build custom vs use standard tooling.
- Metrics that matter for agents: task success rate, steps to completion,
  tool use accuracy, token efficiency, error recovery rate, latency
  distribution. Connecting to Bootcamp III (descriptive stats, time series,
  visualisation).
- Alerting: when should the system notify a human? Token budget exceeded,
  error rate spike, agent stuck in a loop, unexpected tool call pattern.
  Alert fatigue (the naturalist's tax from the lexicon) - too many alerts
  degrades response quality.

### Key Concepts / Vocabulary

- Trace, span, step (observability units)
- OpenTelemetry for LLM, LangSmith, Braintrust, Arize
- JSONL structured logging, session ID
- Pitkeel (project-specific observability)
- Alert fatigue (naturalist's tax)
- Token efficiency, steps to completion, tool use accuracy

### Exercises

- Implement custom tracing for a 5-step agent: log each step as a JSONL record
  with session_id, step, action, input_tokens, output_tokens, latency_ms,
  tool_calls. After 20 runs, load into DuckDB and query: average steps to
  completion, p95 latency, most common tool.
- Compare: (1) custom JSONL tracing vs (2) Arize Phoenix (if available) or
  LangSmith (if available). What does the framework give you that custom
  tracing doesn't?
- Build an alert: monitor agent runs for "stuck in loop" pattern (same tool
  called 3+ times with same parameters). Test with a deliberately buggy agent.

---

## Step 8: Debugging Agent Systems

*Estimated time: 4-5 hours*
*Field maturity: EMERGING/FRONTIER*
*Prerequisites: Steps 5 and 7, Bootcamp II Step 9 (failure modes)*

### What It Covers

- The debugging challenge: agent failures are non-deterministic, multi-step, and
  often involve interactions between the model's reasoning, tool behaviour, and
  environment state. Traditional debugging (breakpoints, step-through) doesn't
  apply to API-based LLM calls.
- Replay debugging: given a trace, replay the agent's execution step by step.
  Inspect AI's log viewer. Custom replay from JSONL traces. The goal: understand
  exactly what the agent saw, decided, and did at each step.
- Failure classification: why did this agent run fail?
  - **Model error:** the model produced wrong output given correct input
  - **Context error:** the model had wrong/insufficient context (cold/hot pressure)
  - **Tool error:** a tool returned an error or unexpected result
  - **Environment error:** the external system was unavailable or changed
  - **Orchestration error:** the agent framework made a wrong routing decision
  - **State error:** stale or corrupted state led to wrong behaviour
- The "rerun don't fix" principle: the standing order "bad output means diagnose,
  reset, rerun - not fix in place." Why this is correct for probabilistic systems.
  Fixing agent output inline corrupts the trace and makes root cause analysis
  impossible.
- Diagnosis by layer: using the layer model (L0-L12) to systematically locate
  the failure. L3 context issue? Check what was in the context. L7 tool issue?
  Check tool call parameters and results. L8 role issue? Check the system prompt.
  L9 thread position issue? Check for self-reinforcing loops.
- Common debugging patterns:
  - The infinite loop: agent calls the same tool repeatedly. Diagnosis: check
    stopping conditions, context pollution from repeated tool results.
  - The wrong tool: agent selects a tool that exists but is inappropriate.
    Diagnosis: check tool descriptions, parameter schemas.
  - The hallucinated tool call: agent invents tool parameters that don't match
    the schema. Diagnosis: check structured output constraints.
  - The context overflow: agent accumulates so much context that generation
    quality degrades. Diagnosis: check token counts per step, implement
    compaction.
  - The state corruption: agent acts on stale state from a previous run.
    Diagnosis: check state isolation between runs.
- Debugging in production: when you can't reproduce the failure locally.
  Trace-based post-mortem analysis. The audit trail from tool calls + model
  outputs to root cause.

### Key Concepts / Vocabulary

- Replay debugging, trace analysis
- Failure classification (model, context, tool, environment, orchestration, state)
- "Rerun don't fix" principle
- Diagnosis by layer (L0-L12)
- Common patterns (infinite loop, wrong tool, hallucinated call, context overflow)
- Post-mortem analysis, audit trail

### Exercises

- Given a failed agent trace (provided), diagnose the failure. Classify it by
  failure type. Identify the exact step where things went wrong. Propose a fix.
- Build a "debug dashboard" notebook: load 50 agent traces from JSONL, identify
  the 5 failed runs, compute failure type distribution, show step-by-step
  replay of the worst failure.
- Implement a simple replay tool: given a JSONL trace, re-execute each step and
  compare to the original output. Flag any divergence. This tests reproducibility.

---

## Step 9: Production Patterns

*Estimated time: 4-5 hours*
*Field maturity: EMERGING*
*Prerequisites: All previous steps, Bootcamp I Step 9 (containers), Bootcamp II
Step 11 (cost/security)*

### What It Covers

- Rate limiting and retry strategies: API rate limits are a fact of life.
  Exponential backoff with jitter. Per-model rate limit tracking. Circuit
  breaker pattern for persistent failures.
- Fallback chains: primary model unavailable? Fall back to secondary model.
  Secondary unavailable? Fall back to cached response. Cached response stale?
  Return graceful error. Designing degradation that maintains trust.
- Scaling patterns: horizontal scaling of agent workers. Queue-based dispatch
  (agent tasks in a queue, workers pull and execute). Concurrency limits to
  stay within API rate limits and cost budgets.
- Deployment patterns: blue-green deployment for prompt changes (route 10% of
  traffic to new prompt, compare eval metrics, promote or rollback). Canary
  deployment for model version changes. Feature flags for agent capabilities.
- Cost controls in production: per-request cost caps, daily/monthly budget
  limits, cost alerting. The connection to Bootcamp III Step 8 (cost modelling)
  and Bootcamp IV Step 5 (eval in CI/CD).
- Security in production: credential management (agents never see raw API keys),
  input validation (prompt injection defence in depth), output validation
  (gate before any write operation), sandbox boundaries (containers from
  Bootcamp I Step 9).
- Reliability patterns: idempotent operations (safe to retry), exactly-once
  semantics for state mutations, health checks and readiness probes for agent
  services.
- The operational baseline: before deploying, establish: expected latency
  (p50, p95, p99), expected cost per request, expected success rate, expected
  error types and rates. Monitor against baseline. Alert on deviation.

### Key Concepts / Vocabulary

- Rate limiting, exponential backoff, circuit breaker
- Fallback chains, graceful degradation
- Queue-based dispatch, concurrency limits
- Blue-green deployment, canary deployment
- Cost caps, budget limits
- Idempotency, exactly-once, health checks
- Operational baseline

### Exercises

- Implement a retry wrapper for LLM API calls: exponential backoff with jitter,
  max 3 retries, circuit breaker after 5 consecutive failures. Test with
  simulated rate limit errors.
- Design a fallback chain for a code review agent: primary (Claude), secondary
  (GPT-4), tertiary (cached last-known-good response). Implement and test
  failover.
- Build a cost control system: per-request token budget, daily spending cap,
  alert when 80% of daily budget consumed. Test with realistic API call patterns.

---

## Field Maturity Summary

| Rating | Definition | Steps |
|--------|-----------|-------|
| ESTABLISHED | Well-documented, widely practiced | 1, 2 |
| EMERGING | Documented by providers, conventions still forming | 3 (advanced), 4, 5, 7, 8 (basic), 9 |
| FRONTIER | Operational knowledge, not in standard curricula | 6, 8 (advanced) |

---

## Relationship to Other Bootcamps

| Bootcamp | Dependency |
|----------|-----------|
| I Step 3 (filesystem) | Filesystem as state, state backends |
| I Step 5 (Python CLI) | All implementation exercises |
| I Step 8 (process observation) | Observability concepts |
| I Step 9 (containers) | Sandboxing, production deployment |
| II Step 2 (agent architecture) | Agent patterns that need state/retrieval |
| II Step 4 (context engineering) | RAG as context engineering strategy |
| II Step 5 (tool design) | Retrieval and state as agent tools |
| II Step 9 (failure modes) | Debugging, failure classification |
| III Step 3 (SQL/DuckDB) | Querying traces and logs |
| III Step 6 (visualisation) | Debugging dashboards |
| III Step 8 (cost modelling) | Production cost controls |
| IV Steps 1-4 (evaluation) | RAG evaluation, memory evaluation |

---

## Cross-Cutting Themes

### When to Use What

```
Problem                                 Start here
--------------------------------------------------------------
"Agent needs company docs"              Step 3 (RAG pipeline)
"Agent forgets previous conversations"  Step 6 (conversation memory)
"Agent fails and I don't know why"      Steps 7-8 (observability + debugging)
"Agent works locally, breaks in prod"   Step 9 (production patterns)
"Agent retrieves wrong documents"       Steps 1+4 (retrieval quality + advanced)
"Agent state is corrupted between runs" Step 5 (state management)
```

### The Tool Stack

| Tool | Role | Install |
|------|------|---------|
| sentence-transformers | Open-source embeddings | `uv pip install sentence-transformers` |
| Chroma | Lightweight vector store | `uv pip install chromadb` |
| pgvector | Postgres vector extension | Postgres extension |
| FAISS | In-memory vector search | `uv pip install faiss-cpu` |
| DuckDB | Trace and log analysis | `uv pip install duckdb` |
| Arize Phoenix | Open-source observability | `uv pip install arize-phoenix` |

---

## Provenance

This outline draws from:

- **Published guidance:** Anthropic "Building effective agents" (Dec 2024, augmented
  LLM pattern: retrieval + tools + memory), OpenAI retrieval and file search
  documentation, LangChain RAG and memory abstractions
- **Research:** Lewis et al. "RAG for Knowledge-Intensive NLP Tasks" (2020), Gao et al.
  "HyDE" (2022), Asai et al. "Self-RAG" (2023), Microsoft GraphRAG (2024),
  Manning et al. "Introduction to Information Retrieval" (2008)
- **Frameworks:** Inspect AI (tracing, sandboxing), LangSmith (observability),
  Braintrust (eval + observability), Arize Phoenix (open-source tracing)
- **Operational experience:** Project's file-based state architecture (AGENTS.md boot
  sequence, events.yaml, session-decisions, .keel-state), pitkeel observability tool,
  epic E3.3 "Open Brain" (RAG + semantic recall as future research), the BFS depth
  rule as manual retrieval strategy, SD-266 "durable writes" as state management policy
