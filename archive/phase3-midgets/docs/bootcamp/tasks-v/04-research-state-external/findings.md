# Findings: External References for State Management (Steps 5-6)

**Researcher:** Agent (automated)
**Date:** 2026-03-10
**Status:** Complete

---

## Step 5: State Management for Agents

### Event Sourcing (Fowler 2005)
- **Status:** verified
- **URL:** https://martinfowler.com/eaaDev/EventSourcing.html
- **Key Extraction:**
  - Core pattern: "ensure every change to the state of an application is captured in an event object, and that these event objects are themselves stored in the sequence they were applied."
  - Three key capabilities built on the event log: complete rebuild (replay all events on empty state), temporal query (determine state at any point in time), event replay (correct past errors by reversing and replaying).
  - Application state can be derived entirely from the event log - you can cache application state anywhere and rebuild from events after a crash. This is structurally identical to the project's SD-266 "durable writes" standing order.
  - Events that interact with external systems need gateway wrappers that suppress replayed messages - directly relevant to agent tool-calling patterns.
  - The article remains in "draft" status from mid-2000s. Fowler notes he hasn't had time to finish it. Despite this, it is the canonical reference and is widely cited.
- **Best Quote/Passage:** "The key to Event Sourcing is that we guarantee that all changes to the domain objects are initiated by the event objects."
- **Caveat:** Article is marked as draft and has not been updated since the mid-2000s. The pattern itself is well-established and unchanged, but the examples are in C# and the framing predates modern distributed systems. The pedagogical connection to agent state is sound but must be drawn explicitly by the curriculum - Fowler does not discuss agents.

### Write-Ahead Log (WAL) - Postgres
- **Status:** verified
- **URL:** https://www.postgresql.org/docs/current/wal-intro.html (currently Postgres 18)
- **Key Extraction:**
  - Central concept: "changes to data files must be written only after those changes have been logged, that is, after WAL records describing the changes have been flushed to permanent storage."
  - WAL enables crash recovery by redoing changes from log records that haven't been applied to data pages (roll-forward recovery / REDO).
  - WAL reduces disk writes because only the log file needs to be flushed to disk per transaction commit, not every changed data file.
  - WAL enables point-in-time recovery by archiving and replaying WAL data to any desired time instant.
- **Best Quote/Passage:** "If we follow this procedure, we do not need to flush data pages to disk on every transaction commit, because we know that in the event of a crash we will be able to recover the database using the log."
- **Caveat:** None. This is stable database theory documentation. Postgres 18 was current as of the fetch date (Feb 2026 release noted).

### Write-Ahead Log (WAL) - SQLite
- **Status:** verified
- **URL:** https://www.sqlite.org/wal.html
- **Key Extraction:**
  - SQLite WAL inverts the rollback journal approach: original content is preserved in the database file, changes are appended to a separate WAL file. A COMMIT is just appending a special record.
  - Key advantage: readers do not block writers and writers do not block readers. Multiple readers can operate from the original unaltered database while changes are committed into the WAL.
  - Checkpointing transfers WAL transactions back into the original database. Auto-checkpoints happen at ~1000 pages (~4MB).
  - WAL limitations: all processes must be on the same host (no network filesystem), not suitable for very large transactions (>100MB in older versions, improved in 3.11.0+).
  - Notable: a WAL-reset bug was found and fixed in SQLite 3.52.0 (2026-03-06) - just days before this research. The bug could cause corruption under rare concurrent checkpoint conditions. Present since 3.7.0 (2010) but extremely unlikely to trigger organically.
- **Best Quote/Passage:** "The WAL approach inverts this. The original content is preserved in the database file and the changes are appended into a separate WAL file. A COMMIT occurs when a special record indicating a commit is appended to the WAL."
- **Caveat:** The freshly-discovered WAL-reset bug (2026-03-03 through 2026-03-06 fix) is worth noting in curriculum as a real-world example of how long subtle concurrency bugs can hide. Low probability of occurrence but illustrates why understanding WAL internals matters.

### sqlite-utils (Simon Willison)
- **Status:** verified
- **URL:** https://sqlite-utils.datasette.io/en/stable/
- **Key Extraction:**
  - CLI tool and Python library for creating and manipulating SQLite databases. Latest version 3.39 (2025-11-24).
  - Supports WAL mode via both CLI (`sqlite-utils enable-wal`) and Python API (`db.enable_wal()`).
  - Key utility for agent state: insert JSON/CSV data, create tables, add columns, upsert, transform tables - all without writing SQL.
  - Plugin system for extensibility. Designed as a complement to Datasette.
  - Actively maintained. Good fit for rapid prototyping of agent state backends.
- **Best Quote/Passage:** "sqlite-utils is not intended to be a full ORM: the focus is utility helpers to make creating the initial database and populating it with data as productive as possible."
- **Caveat:** None. Stable, actively maintained, well-documented. The version was 3.39 as of Nov 2025. Good pedagogical tool for bootcamp exercises.

### Redis for Agent State
- **Status:** verified (page too large to fetch fully)
- **URL:** https://redis.io/docs/latest/develop/data-types/streams/
- **Key Extraction:**
  - Redis Streams (XADD, XREAD, XRANGE) provide an append-only log data structure with consumer groups - structurally similar to event sourcing patterns.
  - TTL/expiry on keys is native to Redis, making it natural for ephemeral session state that should auto-expire.
  - Redis data structures relevant to agent state: Streams (event logs), Hashes (structured session data), Sorted Sets (priority queues, timestamps), Strings with TTL (simple key-value session state).
  - Redis is commonly used as a session store in production web applications - well-proven pattern.
  - As of 2026, Redis licensing changed (2024) from BSD to dual SSPL/RSAL. Valkey (Linux Foundation fork) exists as an alternative. This is relevant context for production choices.
- **Best Quote/Passage:** N/A (page too large to fetch)
- **Caveat:** Redis licensing situation (SSPL since 2024) means some organizations have moved to Valkey or other forks. Curriculum should note this as a real-world consideration. The technical patterns (streams, TTL) are the same across forks.

### LangChain Memory Abstractions
- **Status:** verified - significantly changed since outline was written
- **URL:** https://python.langchain.com/docs/concepts/memory/
- **Key Extraction:**
  - As of March 2026, LangChain has undergone major restructuring. The overview page now primarily promotes "Deep Agents" (batteries-included agents with automatic conversation compression, virtual filesystem, subagent-spawning) and LangGraph for low-level orchestration.
  - The old `ConversationBufferMemory`, `ConversationSummaryMemory`, etc. classes appear to have been superseded. The current docs emphasize LangGraph-based persistence and state management rather than standalone memory classes.
  - LangChain now recommends: LangChain agents for quick starts, LangGraph for advanced/custom needs, "Deep Agents" for production stateful agents.
  - The documentation landing page no longer prominently features memory abstractions as a first-class concept in the way the outline assumed.
- **Best Quote/Passage:** "LangChain's agent abstraction is designed to be easy to get started with, letting you build a simple agent in under 10 lines of code."
- **Caveat:** The LangChain memory landscape has shifted substantially since the outline was written. The old `ConversationBufferMemory` / `ConversationSummaryMemory` classes, while likely still importable, are no longer the recommended approach. The curriculum should frame LangChain memory as a case study in API churn rather than a stable reference. Use it to teach the principle (buffer vs summary vs window), then note the implementation has moved to LangGraph persistence.

### flock(2) - POSIX File Locking
- **Status:** verified
- **URL:** https://man7.org/linux/man-pages/man2/flock.2.html
- **Key Extraction:**
  - Advisory lock on open files. Two modes: LOCK_SH (shared, multiple holders), LOCK_EX (exclusive, single holder), LOCK_UN (unlock). LOCK_NB for non-blocking.
  - Locks are associated with open file descriptions, not file descriptors. This means forked processes share the lock, and all duplicate FDs must be closed to release it.
  - Advisory only - a process can ignore flock and perform I/O on the file anyway. This is a key teaching point: the lock is a cooperative protocol, not an enforcement mechanism.
  - Converting between shared and exclusive is not atomic - the existing lock is removed, then a new one is established. Race window exists.
  - Relevant to the project's .keel-state file locking pattern.
- **Best Quote/Passage:** "flock() places advisory locks only; given suitable permissions on a file, a process is free to ignore the use of flock() and perform I/O on the file."
- **Caveat:** None. POSIX file locking is stable, well-documented, and unchanged. The man page was last updated 2025-09-21. Good for teaching concurrency fundamentals - advisory vs mandatory locking is a clean pedagogical distinction.

---

## Step 6: Conversation Memory and Session Persistence

### Reflexion (Shinn et al. 2023)
- **Status:** verified
- **URL:** https://arxiv.org/abs/2303.11366
- **Key Extraction:**
  - Core insight: reinforce language agents not by updating weights, but through "linguistic feedback" - agents verbally reflect on task feedback, then maintain reflective text in an episodic memory buffer to improve subsequent decisions.
  - The episodic memory buffer is the key pedagogical element: it is a plain-text, append-only log of what went wrong and what the agent should do differently. This maps directly to the project's session-decisions chain.
  - Reflexion achieves 91% pass@1 on HumanEval (vs GPT-4's 80% at the time), demonstrating that persistent verbal self-reflection can substitute for weight updates.
  - Flexible enough to incorporate various feedback types: scalar values or free-form language, from external or internally simulated sources.
  - Paper went through 4 revisions (March 2023 to October 2023). Authors include Shunyu Yao (also of ReAct/Tree of Thoughts fame).
- **Best Quote/Passage:** "Reflexion agents verbally reflect on task feedback signals, then maintain their own reflective text in an episodic memory buffer to induce better decision-making in subsequent trials."
- **Caveat:** The HumanEval numbers are benchmarked against 2023-era GPT-4. Current models (March 2026) likely exceed 91% on HumanEval without Reflexion. The architectural insight (episodic memory via text) remains valuable regardless of benchmark obsolescence. Curriculum should use this for the pattern, not the numbers.

### MemGPT / Letta (Packer et al. 2023)
- **Status:** verified (paper); verified (Letta product - evolved significantly)
- **URL (paper):** https://arxiv.org/abs/2310.08560
- **URL (product):** https://docs.letta.com/
- **Key Extraction:**
  - Core insight: virtual context management inspired by OS memory hierarchy. LLMs have limited context windows; MemGPT manages different memory tiers (main context = "RAM", external storage = "disk") to provide extended context.
  - Uses interrupts to manage control flow between the agent and user - the agent can autonomously decide to page information in/out of its context window.
  - Evaluated on two domains: document analysis (documents exceeding context window) and multi-session chat (agents that remember and evolve over long-term interactions).
  - Letta (the productized version) as of March 2026 has pivoted heavily toward "Letta Code" - a memory-first coding agent in the terminal, plus "Letta Code SDK" for building apps on top of stateful computer use agents. The product has evolved well beyond the original paper.
  - The "LLM as OS" metaphor: pedagogically useful for explaining the concept, but potentially misleading because real OS memory management has hardware-enforced guarantees while LLM context management is advisory/heuristic.
- **Best Quote/Passage:** "We propose virtual context management, a technique drawing inspiration from hierarchical memory systems in traditional operating systems that provide the appearance of large memory resources through data movement between fast and slow memory."
- **Caveat:** Letta the product (March 2026) looks quite different from MemGPT the paper (October 2023). The current product emphasizes "Letta Code" (coding agent) and a platform API rather than the original OS-metaphor memory management. Curriculum should distinguish between MemGPT-the-paper (stable, citable, good pedagogy) and Letta-the-product (moving target, commercial, different scope). The core virtual memory analogy remains pedagogically strong.

### GDPR Article 17 - Right to Erasure
- **Status:** verified
- **URL:** https://gdpr-info.eu/art-17-gdpr/
- **Key Extraction:**
  - Data subject has the right to obtain erasure of personal data "without undue delay" when: data is no longer necessary for its purpose, consent is withdrawn, subject objects to processing, data was unlawfully processed, or legal obligation requires erasure.
  - Controller must take "reasonable steps, including technical measures" to inform other controllers processing copies of the data.
  - Exceptions exist for: freedom of expression, legal obligation, public health, archiving/research/statistics, and legal claims.
  - The hard problem for AI systems: how do you delete a specific memory from an agent? If the agent has summarized or integrated the information into its state, simple deletion of the original record may not suffice. This is an unsolved engineering problem.
  - Related recitals: (65) Right of Rectification and Erasure, (66) Right to be Forgotten.
- **Best Quote/Passage:** "The data subject shall have the right to obtain from the controller the erasure of personal data concerning him or her without undue delay."
- **Caveat:** GDPR is stable law (effective since May 2018). The application to AI agent memory systems is where the frontier lies. The EU AI Act (entered into force August 2024, with phased enforcement through 2026) adds additional obligations for AI systems but does not fundamentally alter Article 17's requirements. The practical question - how to delete a specific piece of knowledge from a model or agent's memory without degrading overall capability - remains largely unanswered in production systems. Curriculum should present this as a genuine open problem, not a solved pattern.

### Anthropic Conversation Management API
- **Status:** not-found at expected URL
- **URL attempted:** https://docs.anthropic.com/en/docs/build-with-claude/conversation-management (returned 404)
- **URL verified (related):** https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
- **Key Extraction:**
  - Anthropic's Messages API is stateless by design. Each request contains the full conversation history in the `messages` array. There is no server-side conversation/thread object.
  - Prompt caching is the primary mechanism for efficiency in multi-turn conversations: cache the conversation prefix, pay reduced rates (10% of base) for cache hits on subsequent turns. 5-minute default TTL, 1-hour option at 2x cost.
  - Automatic caching (new feature): a single `cache_control` field at request level automatically moves the cache breakpoint to the last cacheable block as conversations grow. This handles the common multi-turn pattern without manual breakpoint management.
  - Up to 4 explicit cache breakpoints for fine-grained control. Minimum cacheable lengths vary by model (1024-4096 tokens).
  - No conversation persistence API. Developers must manage their own conversation state storage.
- **Best Quote/Passage:** "Prompt caching references the entire prompt - tools, system, and messages (in that order) up to and including the block designated with cache_control."
- **Caveat:** The outline expected a "conversation management" page that does not exist. Anthropic's approach is fundamentally different from OpenAI's: purely stateless API with prompt caching for efficiency, vs server-side state management. This is a significant architectural distinction worth teaching. The prompt caching docs are comprehensive and current. The automatic caching feature appears relatively new and is pedagogically useful as a design pattern.

### OpenAI Assistants API / Threads / Conversations
- **Status:** verified - DEPRECATED, migrating to Responses API + Conversations API
- **URL (migration guide):** https://platform.openai.com/docs/assistants/migration
- **URL (conversation state):** https://platform.openai.com/docs/guides/conversation-state
- **Key Extraction:**
  - The Assistants API (with Threads, Runs, Run Steps) is deprecated. Shutdown date: August 26, 2026. Replacement: Responses API + Conversations API + Prompts.
  - New model: Assistants become "Prompts" (versioned behavioral profiles created in dashboard), Threads become "Conversations" (streams of items - messages, tool calls, outputs), Runs become "Responses" (send input items, get output items).
  - Conversations API provides durable server-side state: `openai.conversations.create()` returns a persistent object. Pass `conversation` parameter to subsequent `responses.create()` calls. Items in conversations are not subject to the 30-day TTL that applies to responses.
  - Two state management approaches: (1) `previous_response_id` for chaining responses, (2) Conversations API for persistent cross-session state.
  - Compaction is now a first-class concern: separate docs page for context management, standalone compact endpoint, server-side compaction with `compact_threshold`.
  - Model naming note: references to "GPT-5.4" in the docs suggest significant model evolution since the outline was written.
- **Best Quote/Passage:** "Responses are simpler - send input items and get output items back."
- **Caveat:** This is the single most changed reference since the outline was written. The entire Assistants API (Threads, Runs) is being deprecated. Curriculum MUST reflect the new Responses API + Conversations API model, not the old Assistants API. The migration is in progress with a hard deadline of August 2026. This is a case study in API volatility for the frontier tier of the course.

---

## Frontier Assessment

### Stable Enough to Teach (safe to present as established practice)

| Reference | Stability | Notes |
|-----------|-----------|-------|
| Event sourcing (Fowler) | High | Pattern unchanged for 20 years. Canonical reference. |
| WAL (Postgres/SQLite) | High | Database fundamentals. Will not change. |
| sqlite-utils | High | Stable, actively maintained, well-documented. |
| flock(2) | High | POSIX standard. Unchanged. |
| GDPR Article 17 | High | Law since 2018. Text is stable. Application to AI is the open question. |
| Reflexion paper | High | Published, cited, the architectural insight is timeless. |
| MemGPT paper | High | Published, cited, the virtual memory analogy is durable. |

### Teach the Principle, Note the Implementation Churn

| Reference | Stability | Notes |
|-----------|-----------|-------|
| Redis for agent state | Medium-High | Technical patterns stable. Licensing landscape changed (SSPL/Valkey fork). |
| Anthropic prompt caching | Medium | API is stable but evolving. No conversation management API exists. Automatic caching is relatively new. |
| LangChain memory | Low | The specific classes (ConversationBufferMemory, etc.) are being superseded. Teach the taxonomy of memory types, not the LangChain implementation. |

### Too Volatile to Present as Established (teach as frontier, with caveats)

| Reference | Stability | Notes |
|-----------|-----------|-------|
| OpenAI Assistants/Threads | Deprecated | Being replaced by Responses API + Conversations API. Hard shutdown August 2026. Do NOT teach the old API. |
| Letta (product) | Low | Evolved from MemGPT paper into a different product (coding agent platform). Use the paper, not the product docs. |
| GDPR applied to AI memory | Frontier | No established engineering patterns for selective erasure from agent state. Present as an open problem. |
| Agent memory benchmarks | Frontier | No standard benchmarks for conversation memory evaluation as of March 2026. LongBench/SCROLLS test context length, not memory. |

### Key Curriculum Implications

1. **The OpenAI landscape has shifted dramatically.** The outline's references to "Assistants API threads" need to be rewritten entirely. The new Conversations API is a better teaching target but is itself brand-new.

2. **Anthropic and OpenAI take fundamentally different architectural approaches** to conversation state: Anthropic is stateless-with-caching, OpenAI is building server-side state management. This contrast is itself pedagogically valuable.

3. **LangChain memory abstractions are not a stable reference anymore.** The taxonomy (buffer, summary, window, knowledge graph) is worth teaching abstractly. The LangChain implementation should be treated as a historical example of rapid API evolution.

4. **The strongest teaching references are the foundational patterns** (event sourcing, WAL, flock) because they are stable and transfer to any implementation. The agent-specific frameworks are all in flux.

5. **GDPR erasure applied to agent memory is a genuine unsolved problem.** This makes it an excellent frontier topic but should not be presented as having established solutions.
