# Task 09: Write - Step 4: Context Engineering

**Type:** Write
**Depends on:** Tasks 01 (format), 02 (internal refs), 04 (external refs for Step 4), Task 06 (Step 1), Task 08 (Step 3)
**Parallelizable with:** Task 10 (Step 5) - different dependency chains converge here
**Output:** `docs/bootcamp/step04-context-engineering.md`

---

## Objective

Write the full Step 4 content: "Context Engineering." This is a FRONTIER step - the
field's coverage is thin. This project's novel vocabulary (working set, cold/hot
pressure, compaction loss, dumb zone, context quality loop) is the primary content.
The Denning 1968 isomorphism is the theoretical anchor.

This is one of the bootcamp's highest-value steps. The ~18% genuinely novel content
is concentrated here. Intellectual honesty is critical - declare what is established
(RAG, token counting, caching) and what is novel (the pressure framework, the dumb zone).

Estimated target: 45-55k characters (~1300-1500 lines).

## Prime Context (load before writing)

1. `docs/bootcamp/tasks/01-research-format/findings.md` - format template
2. `docs/bootcamp/tasks/02-research-internal-refs/findings.md` - full context engineering cluster
3. `docs/bootcamp/tasks/04-research-tier2-external/findings.md` - Denning, GitClear, arXiv:2602.11988
4. `docs/bootcamp/BOOTCAMP-II-OUTLINE.md` lines 317-395 - the Step 4 outline
5. `docs/bootcamp/step01-llm-mechanics.md` - L3 context window (to build on)
6. `docs/bootcamp/step03-prompt-engineering.md` - system prompts, working set intro

## Content Structure

### Mandatory Sections

1. **Why This is Step 4** - Context engineering is distinct from prompt engineering.
   Prompt engineering = what you say. Context engineering = what information is
   available and how it's structured. This is the discipline that determines whether
   the same model produces correct output or garbage.

2. **The working set** - Denning's 1968 working set theory. The structural isomorphism:
   - Virtual memory: minimum pages in RAM for efficient execution
   - LLM context: minimum tokens in context for correct generation
   - Both: below threshold = thrashing/pattern-matching; above threshold = waste
   - The operational insight: find the working set, load it, nothing more
   - This is NOT a metaphor - it is a structural isomorphism

3. **Cold context pressure** - Too little on-file context. The model fills gaps with
   high-probability sequences from training data, not project-specific knowledge.
   Examples: agent generates boilerplate instead of project-specific code. Agent
   uses stdlib patterns from 2022 instead of current best practice. Agent
   "hallucinates" file paths that don't exist but sound plausible.

4. **Hot context pressure** - Too much in-thread context. Attention budget is
   finite. More context dilutes signal-to-noise. The model attends to everything
   but focuses on nothing. Examples: 200k context window filled with tangentially
   related files. Conversation history from 3 hours ago still in context.

5. **Compaction loss** - Context window death. Unlike filesystem state (graceful
   degradation), context loss is binary and total. When the window fills and
   compaction occurs, decisions not written to durable storage are gone. No
   recovery. The standing order: write decisions to file immediately, not later.

6. **The dumb zone** - Operating outside effective context range. Output is:
   - Syntactically valid (parses, compiles, type-checks)
   - Structurally sound (follows patterns correctly)
   - Semantically disconnected (solves a different problem, uses wrong domain terms)
   - This is a context failure, not a model failure
   - Detection: the output "looks right" to someone who doesn't know the project

7. **Stale reference propagation** - Documentation describing old state, consumed
   by agents as current truth. The agentic form of configuration drift, but worse:
   the agent actively hallucinates the old state into new code. Example: AGENTS.md
   references a function that was renamed 3 PRs ago -> agent generates calls to
   the old name, type checks fail, or worse, old name still exists as dead code.

8. **The context quality loop** - Clean code -> better context for future agents ->
   cleaner code. Slop -> worse context -> more slop. Codebase quality IS context
   engineering. GitClear data showing code quality degradation supports this.

9. **Practical techniques:**
   - BFS depth rules (depth 1 = every session, depth 2 = when relevant, depth 3+ = deliberate)
   - Durable writes as policy (decisions to file, not context only)
   - Session boundary management (explicit handoff, state snapshot)
   - Context budgeting (how to estimate what to load)
   - Working set discovery (how to find the minimum context for a task)

### Layer Model Integration

- L3 context: utilisation = used/max; primacy, recency, lost-middle effects
- Cross-cut with L8 (agent role) and L9 (thread position)
- The dumb zone spans L3 and L8 (insufficient context at both levels)

### Challenges

Design 5-7 challenges:
- Working set identification (easy - given a task, identify minimum files needed)
- Cold pressure demonstration (medium - run same task with minimal vs adequate context)
- Hot pressure demonstration (medium - run same task with adequate vs excessive context)
- Compaction simulation (medium - long conversation, test recall of early decisions)
- Dumb zone detection (hard - identify semantically disconnected output)
- Context quality audit (hard - audit a codebase for stale references)
- BFS depth exercise (hard - design context loading rules for a real project)

### Field Maturity

`> FIELD MATURITY: FRONTIER` - The pressure framework, working set isomorphism, dumb zone,
and context quality loop are novel from this project's operational experience. RAG and
token counting are established. "Context engineering" as a term is emerging.

## Quality Constraints

- No emojis, no em-dashes
- The Denning isomorphism must be presented precisely - it is structural, not metaphorical
- Every novel concept must be declared as novel with intellectual honesty
- Cold/hot pressure should have concrete, reproducible examples
- The dumb zone description must make it viscerally recognisable to practitioners
