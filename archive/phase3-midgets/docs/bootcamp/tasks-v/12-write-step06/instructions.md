# Task 12: Write - Step 6: Conversation Memory and Session Persistence

**Type:** Write
**Depends on:** Tasks 01 (format), 02 (internal refs), 04 (external refs), Tasks 08 (Step 2, embeddings) and 11 (Step 5, state)
**Parallelizable with:** Tasks 13-15 (Tier 3 steps, after their own dependencies)
**Output:** `docs/bootcamp/step06-conversation-memory.md`

---

## Objective

Write the full Step 6 content: "Conversation Memory and Session Persistence." This is
EMERGING/FRONTIER - the hardest step to write because the field is moving fast and
conventions are not settled. The novel contribution is compaction loss applied to memory
summarisation, and the session-decisions chain as a worked Reflexion-style episodic memory.

Estimated target: 35-50k characters (~1000-1400 lines).

## Prime Context (load before writing)

1. `docs/bootcamp/tasks-v/01-research-format/findings.md` - format template
2. `docs/bootcamp/tasks-v/02-research-internal-refs/findings.md` - internal concepts
3. `docs/bootcamp/tasks-v/04-research-state-external/findings.md` - external references (critical)
4. `docs/bootcamp/BOOTCAMP-V-OUTLINE.md` lines 446-503 - the Step 6 outline
5. `docs/bootcamp/step05-state-management.md` - Step 5 (state management, to build on)
6. `docs/bootcamp/step02-embeddings-vector-search.md` - Step 2 (embeddings, for retrieval-augmented memory)

## Content Structure

### Mandatory Sections

1. **Why This is Step 6** - Frame: LLMs have no memory between API calls. Every call
   starts fresh. "Memory" is a context engineering problem: what prior information do
   you inject into the context window, and how? Step 5 provided the state management
   infrastructure; this step addresses the specific problem of conversation memory.

2. **Conversation memory patterns** - Five distinct approaches, each with tradeoffs:
   - **Full history:** Include all prior messages. Simple, accurate, but context window
     grows without bound. Works for short conversations (<20 turns typically).
   - **Sliding window:** Include last N messages. Fixed cost, loses early context.
     Good when only recent context matters.
   - **Summary memory:** Periodically summarise conversation, include summary instead
     of full history. Compresses context but loses detail. The compaction risk:
     summarisation is lossy - connect to compaction loss from project vocabulary.
   - **Entity memory:** Extract and maintain key entities (names, numbers, decisions).
     Structured state, not free text. Good for task-oriented agents.
   - **Retrieval-augmented memory:** Embed past interactions, retrieve relevant ones
     for current query. The RAG pattern (Steps 1-4) applied to conversation history.
     Most sophisticated, most complex.

3. **Session persistence** - Saving and restoring conversation state:
   - Serialisation formats (JSON, pickle, structured schemas)
   - Storage backends (from Step 5: files, SQLite, Redis, Postgres)
   - Session ID management (generation, storage, lookup)
   - What to serialize: messages, tool results, metadata, timestamps
   - Crash recovery: what happens when a session is interrupted mid-conversation?

4. **Memory evaluation** - How to test whether the agent "remembers" correctly:
   - Consistency evals: ask about something from turn 3 at turn 20
   - Factual accuracy evals: does the memory introduce errors?
   - Connection to Bootcamp IV eval methodology
   - Design test conversations that probe memory at various depths

5. **The forgetting problem** - Not everything should be remembered:
   - User corrections ("actually, I meant X not Y") should update memory
   - Privacy-sensitive information should be forgotten on request
   - GDPR Article 17 and the right to be forgotten applied to agent memory
   - Implementation: how do you delete specific memories from an agent?
   - The tension between comprehensive memory and privacy compliance

6. **Reflexion-style episodic memory** - A persistent record of what went wrong and why:
   - Reflexion (Shinn et al. 2023): the pattern
   - The session-decisions chain as a worked example: SD-001 through SD-321, each
     recording a decision, its reasoning, and its outcome
   - How episodic memory differs from conversation memory: it records experience
     about the process, not the content
   - MemGPT/Letta: the virtual memory hierarchy (if still relevant per Task 04 research)

### Project Vocabulary Integration

- **Compaction loss** applied to memory summarisation: lossy compression of conversation
  history, no graceful degradation
- **Hot context pressure** from over-loading memory into context
- **Session-decisions chain** as episodic memory example
- **Working set** applied to memory: what memory items are in the working set for
  this particular query?

### Exercises

- **Memory strategy comparison** (medium-hard) - Implement 3 strategies for same chatbot:
  full history, sliding window (last 10 messages), summary memory. Test with 50-turn
  conversation. At turn 50, which correctly answers questions about turn 5?

- **Retrieval-augmented memory** (hard) - Embed all past conversations, retrieve relevant
  turns per query. Measure: does this outperform sliding window on long conversations?

- **Memory evaluation design** (hard) - Design 20 test conversations where specific facts
  are introduced early and queried late. Score each strategy on factual accuracy at
  various conversation depths.

## Quality Constraints

- No emojis, no em-dashes
- 2 spaces indentation in code blocks
- Present FRONTIER maturity honestly: "this is the current best practice, expect change"
- Mark what is stable enough to build on vs what is still experimental
- Privacy/GDPR section should be practical, not theoretical
- Code examples: Python chatbot with swappable memory backends
