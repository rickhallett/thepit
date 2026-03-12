# Task 04: Research - External References for State Management (Steps 5-6)

**Type:** Research (read-only, web fetch)
**Parallelizable with:** Tasks 01, 02, 03, 05, 06
**Blocks:** Tasks 11, 12 (write tasks for Steps 5-6)
**Output:** `docs/bootcamp/tasks-v/04-research-state-external/findings.md`

---

## Objective

Research and verify external references cited in Steps 5-6 of the Bootcamp V outline.
Step 5 is EMERGING; Step 6 is EMERGING/FRONTIER. The state management and conversation
memory space is evolving rapidly. This research needs to capture current (March 2026)
best practices, frameworks, and known limitations.

## Step 5 References: State Management for Agents

**Field maturity: EMERGING**

1. **Event sourcing (Fowler 2005, "Event Sourcing" article):**
   - Verify URL (martinfowler.com/eaaDev/EventSourcing.html)
   - Extract: core pattern, why append-only is relevant for agent state
   - How event sourcing compares to mutable state for agent systems

2. **Write-ahead log (WAL) pattern:**
   - Standard reference for WAL in databases (Postgres WAL, SQLite WAL mode)
   - Extract: the insight - write to log before mutating state, recover by replay
   - Connection to SD-266 "durable writes" standing order

3. **SQLite as agent state backend:**
   - Current SQLite documentation, WAL mode
   - sqlite-utils (Simon Willison) - current state, suitability for structured agent state
   - When SQLite is sufficient vs when you need Postgres

4. **Redis for agent state:**
   - Current Redis documentation, data structures relevant to agent state
   - Redis streams for event log patterns
   - Expiry/TTL for ephemeral session state

5. **LangChain memory abstractions:**
   - Current state of LangChain's memory module
   - What abstractions exist (ConversationBufferMemory, ConversationSummaryMemory, etc.)
   - Critique: what the abstraction hides and why that matters

6. **Concurrency patterns:**
   - flock(2) - POSIX file locking (used by .keel-state)
   - Optimistic concurrency control - standard reference
   - How agent frameworks handle concurrent state access (if they do)

7. **General research:**
   - How do production agent systems manage state as of March 2026?
   - What patterns have emerged since the outline was written?
   - Are there any new frameworks or standards for agent state management?

## Step 6 References: Conversation Memory and Session Persistence

**Field maturity: EMERGING/FRONTIER**

1. **Reflexion (Shinn et al. 2023, "Reflexion: Language Agents with Verbal Reinforcement Learning"):**
   - Verify paper (arXiv:2303.11366)
   - Extract: the episodic memory insight - persist what went wrong, surface it later
   - Connection to the project's session-decisions chain as a worked example

2. **MemGPT / Letta (Packer et al. 2023, "MemGPT: Towards LLMs as Operating Systems"):**
   - Verify paper (arXiv:2310.08560)
   - Extract: the virtual memory hierarchy for LLMs (main context, external storage)
   - Current state of Letta (the productised version) - is it production-ready?
   - The "LLM as OS" metaphor: useful or misleading?

3. **Conversation memory evaluation:**
   - How do you test whether an agent "remembers" correctly?
   - Any standard benchmarks for conversation memory (March 2026)?
   - LongBench, SCROLLS, or other long-context benchmarks as proxies

4. **GDPR and the right to be forgotten:**
   - Standard reference for GDPR Article 17 applied to AI systems
   - Current guidance (EU AI Act, if relevant) on agent memory and personal data
   - Practical implementation: how do you delete specific memories from an agent?

5. **Anthropic's conversation management:**
   - Current API capabilities for multi-turn conversations
   - How Claude handles conversation context natively
   - Any Anthropic guidance on conversation memory patterns?

6. **OpenAI's thread and message model:**
   - Assistants API threads - current state
   - How OpenAI frames persistent conversation state
   - Limitations and known issues

7. **General research:**
   - What is the current state of the art for agent memory (March 2026)?
   - Any new memory architectures since MemGPT?
   - How do production chatbots (Intercom, Zendesk, etc.) handle conversation persistence?

## Output Format

For each reference:
```
### [Reference Name]
- **Status:** verified/not-found/moved/outdated
- **URL:** (current URL)
- **Key Extraction:** (2-5 bullet points of what's pedagogically useful)
- **Best Quote/Passage:** (if applicable)
- **Caveat:** (anything that has changed since the outline was written)
```

Group by step. Include a "Frontier Assessment" section: what is stable enough to teach
vs what is still too volatile to present as established practice.
