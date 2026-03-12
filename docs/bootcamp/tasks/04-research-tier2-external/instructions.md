# Task 04: Research - Tier 2 External References (Steps 4-7)

**Type:** Research (read-only, web fetch)
**Parallelizable with:** Tasks 01, 02, 03, 05
**Blocks:** Tasks 09, 10, 11, 12 (write tasks for Steps 4-7)
**Output:** `docs/bootcamp/tasks/04-research-tier2-external/findings.md`

---

## Objective

Research and verify external references for Steps 4-7 (the engineering discipline tier).
These are EMERGING and FRONTIER maturity steps - external material is thinner, novel
project content is heavier. Research must distinguish clearly between what the field
provides and what this project contributes.

## Step 4 References to Research

**Topic:** Context engineering (FRONTIER)

1. **Denning, "The Working Set Model for Program Behavior" (1968)**
   - Verify paper exists, get correct citation (Communications of the ACM)
   - Extract: the working set definition, the operational insight about minimum
     pages for efficient execution
   - Confirm the structural isomorphism claim: working set (minimum pages in RAM) =
     minimum tokens in context for correct generation

2. **GitClear, "Coding on Copilot: 2023 Data Suggests Downward Pressure on Code Quality" (2024)**
   - Verify report exists, get current URL
   - Extract: key findings on code quality degradation metrics
   - What this says about the context quality loop (slop -> worse context -> more slop)

3. **arXiv:2602.11988 (context pollution)**
   - Same paper as Step 3 but different extraction angle
   - Extract: the mechanism by which unnecessary context files degrade output
   - How this validates the hot context pressure concept

4. **General research:**
   - Who else is using the term "context engineering" as of early 2026?
     (Dex's talks, Tobi Lutke, community discourse)
   - Current state of RAG as context management - what works, what doesn't
   - Any published frameworks for context budgeting or context window management

## Step 5 References to Research

**Topic:** Tool design and agent-computer interfaces (EMERGING)

1. **Anthropic, "Building effective agents" Appendix 2**
   - Extract: all ACI design principles
   - The SWE-bench agent tool optimisation finding (spent more time on tools
     than on overall prompt)
   - Specific poka-yoke examples

2. **MCP documentation (modelcontextprotocol.io)**
   - Verify current URL and spec version
   - Extract: protocol overview, what it standardises, current adoption
   - What MCP solves (tool integration standardisation) and what it doesn't
     (tool design quality)

3. **OpenAI function calling documentation**
   - Current API structure for tool definitions
   - Best practices for parameter naming and documentation

4. **General research:**
   - Current state of tool-use benchmarks (BFCL, ToolBench, etc.)
   - Security implications of tool access (least privilege, sandboxing)
   - Production patterns for tool result size management

## Step 6 References to Research

**Topic:** Verification and quality for probabilistic systems (EMERGING/FRONTIER)

1. **Reason, "Human Error" (1990) - Swiss Cheese Model**
   - Verify book reference, correct citation
   - Extract: the Swiss Cheese Model diagram and core insight (multiple independent
     layers, each with holes, arranged so single failures don't pass through)
   - How this applies to verification pipeline design

2. **Weyuker, "On Testing Non-Testable Programs" (1982)**
   - Verify paper exists, get correct citation (The Computer Journal)
   - Extract: the oracle problem definition
   - How this maps to L12 human error propagation

3. **METR, "Measuring the Impact of AI on Experienced Developers" (2025, arXiv:2507.09089)**
   - Verify paper exists
   - Extract: the 19% slower finding, the 20% perception gap, methodology
   - This is the empirical anchor for the cognitive deskilling argument

4. **SWE-bench, WebArena**
   - Current state of these benchmarks
   - What they measure vs what production reliability requires
   - Known limitations and criticisms

5. **General research:**
   - Current best practices for testing AI-generated code
   - Any published test anti-pattern taxonomies for AI code (compare to slopodar)
   - The "vibes-based development" discourse - what practitioners are saying about
     verification of LLM output

## Step 7 References to Research

**Topic:** The human-AI interface (FRONTIER)

1. **Bainbridge, "Ironies of Automation" (1983, Automatica)**
   - Verify paper, correct citation
   - Extract: the core irony (automation removes the expertise needed to monitor
     the automation), the four ironies
   - This is the theoretical foundation for cognitive deskilling

2. **Helmreich, CRM publications (1999)**
   - Verify, identify the specific publication(s) to cite
   - Extract: readback protocol, authority gradients, crew resource management
     principles relevant to human-AI teams

3. **Perez et al., "Discovering Language Model Behaviors with Model-Written Evaluations" (2022)**
   - Verify paper
   - Extract: sycophancy findings, methodology

4. **Dell'Acqua et al., "Navigating the Jagged Technological Frontier" (2023)**
   - Verify paper (Harvard Business School working paper)
   - Extract: the jagged frontier concept, the falling-off-the-cliff finding,
     automation bias evidence

5. **Sharma et al. (2023) on sycophancy**
   - Identify and verify the specific paper
   - Extract: key findings on sycophantic behaviour in LLMs

6. **General research:**
   - Current state of research on human-AI interaction failure modes
   - Any other named anti-pattern taxonomies for LLM output (compare to slopodar)
   - The "not wrong" concept - any parallel work on outputs that pass all checks
     but are not right?

## Output Format

For each reference:
```
### [Reference Name]
- **Status:** verified/not-found/moved/outdated
- **URL/Citation:** (current URL or full academic citation)
- **Key Extraction:** (2-5 bullet points of what's pedagogically useful)
- **Best Quote/Passage:** (if applicable)
- **Field vs Novel:** (what the field provides vs what this project adds on top)
- **Caveat:** (anything changed, disputed, or needs updating)
```

Group by step. For FRONTIER topics, explicitly note where the field's coverage ends
and this project's operational experience begins. This boundary is load-bearing for
intellectual honesty.
