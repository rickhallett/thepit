# Task 03: Research - Tier 1 External References (Steps 1-3)

**Type:** Research (read-only, web fetch)
**Parallelizable with:** Tasks 01, 02, 04, 05
**Blocks:** Tasks 06, 07, 08 (write tasks for Steps 1-3)
**Output:** `docs/bootcamp/tasks/03-research-tier1-external/findings.md`

---

## Objective

Research and verify external references cited in Steps 1-3 of the Bootcamp II outline.
These are ESTABLISHED field maturity steps - the external material is well-documented.
The research goal is to verify references exist, extract key points for pedagogical use,
and identify the best entry points for each topic.

## Step 1 References to Research

**Topic:** How LLMs actually work (for engineers, not researchers)

1. **Vaswani et al., "Attention Is All You Need" (2017)**
   - Verify paper exists, get correct citation
   - Extract: the core architecture insight (self-attention replacing recurrence)
   - What an engineer needs vs what a researcher needs from this paper

2. **Karpathy, "Let's build GPT from scratch" (2023 video)**
   - Verify URL, confirm still available
   - Extract: key pedagogical approach (building from character-level prediction up)
   - Running time, prerequisites

3. **Alammar, "The Illustrated Transformer" (jalammar.github.io)**
   - Verify URL
   - Extract: which visualisations are most useful for engineers (attention heatmaps,
     encoder-decoder diagram)

4. **Anthropic, "Building effective agents" (Dec 2024)**
   - Verify URL, confirm still current
   - Extract: the "building blocks" section structure
   - Key takeaway for Step 1: augmented LLM = LLM + retrieval + tools + memory

5. **OpenAI tokenizer playground**
   - Verify URL
   - Confirm it demonstrates token boundaries in code

6. **General research:**
   - What is the current best explanation of RLHF consequences for engineers?
   - What are the practical differences between model families (Claude, GPT-4, Gemini)
     that matter for engineering, not benchmarks?
   - Current context window sizes and effective lengths across providers

## Step 2 References to Research

**Topic:** Agent architecture patterns

1. **Anthropic, "Building effective agents" (Dec 2024)**
   - Extract: all 5 workflow patterns (prompt chaining, routing, parallelisation,
     orchestrator-workers, evaluator-optimizer) with their when-to-use criteria
   - The simplicity principle quotation
   - The augmented LLM diagram

2. **OpenAI, "Orchestrating Agents: Routines and Handoffs" (Oct 2024)**
   - Verify URL
   - Extract: the routines + handoffs pattern, transfer functions

3. **OpenAI Swarm repo (github.com/openai/swarm)**
   - Verify repo exists, check if maintained or archived
   - Extract: core abstractions (Agent, handoff, context variables)

4. **LangGraph documentation**
   - Current state of graph-based orchestration
   - Key abstractions (StateGraph, nodes, edges, conditional edges)

5. **General research:**
   - Current framework landscape (LangChain, CrewAI, AutoGen, Claude Agent SDK,
     OpenAI Agents SDK, Strands) - which are production-ready vs experimental?
   - What does "agent" mean in each framework's context?

## Step 3 References to Research

**Topic:** Prompt engineering as system design

1. **Anthropic prompt engineering interactive tutorial (GitHub)**
   - Verify URL, current version
   - Extract: structure, key lessons, what it covers well

2. **Anthropic, "Building effective agents" Appendix 2 (ACI design)**
   - Extract: the ACI design principles, poka-yoke examples
   - The SWE-bench finding about tool optimisation > prompt optimisation

3. **OpenAI prompt engineering documentation**
   - Verify current URL
   - Extract: key principles, structured output guidance

4. **arXiv:2602.11988 (context pollution)**
   - Verify paper exists and citation is correct
   - Extract: the 20% inference cost increase finding, task success degradation
     from unnecessary context files

5. **General research:**
   - Current best practices for system prompt design
   - Structured output comparison (XML vs JSON vs YAML) - provider recommendations
   - Chain-of-thought vs extended thinking - current guidance on when each helps

## Output Format

For each reference:
```
### [Reference Name]
- **Status:** verified/not-found/moved/outdated
- **URL:** (current URL)
- **Key Extraction:** (2-5 bullet points of what's pedagogically useful)
- **Best Quote/Passage:** (if applicable, a passage suitable for citation)
- **Caveat:** (anything that has changed since the outline was written)
```

Group by step. Flag any references that cannot be verified or have moved.
