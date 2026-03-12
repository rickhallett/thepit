# Task 07: Write - Step 1: The Retrieval Problem

**Type:** Write
**Depends on:** Tasks 01 (format), 02 (internal refs), 03 (external refs for Steps 1-4)
**Parallelizable with:** None (first write task, but can precede Steps 5-9 writes)
**Output:** `docs/bootcamp/step01-retrieval-problem.md`

---

## Objective

Write the full Step 1 content: "The Retrieval Problem." This is an ESTABLISHED step -
the field covers retrieval and RAG fundamentals well. The novel contribution is the
explicit connection between RAG and the project's context engineering vocabulary (working
set, cold context pressure, stale reference propagation).

Estimated target: 35-45k characters (~1000-1300 lines), matching Bootcamp I step lengths.

## Prime Context (load before writing)

1. `docs/bootcamp/tasks-v/01-research-format/findings.md` - format template
2. `docs/bootcamp/tasks-v/02-research-internal-refs/findings.md` - internal concepts
3. `docs/bootcamp/tasks-v/03-research-retrieval-external/findings.md` - external references
4. `docs/bootcamp/BOOTCAMP-V-OUTLINE.md` lines 118-178 - the Step 1 outline

## Content Structure

Follow the format template from Task 01 findings. The outline specifies these topics:

### Mandatory Sections

1. **Why This is Step 1** - Frame: agents need external knowledge because training data
   is stale, incomplete, and generic. RAG is the dominant pattern. Understanding retrieval
   quality is the difference between a demo and a system. Link to dependency graph
   (everything in Tier 1 builds on this).

2. **Why agents need external knowledge** - Training data staleness, domain-specific
   knowledge, real-time information needs. Enterprise context: company documents,
   codebases, databases. The gap between what the model knows and what the task requires.

3. **The context engineering connection** - RAG is a context engineering strategy. It
   dynamically populates the context window. The working set concept (Denning 1968,
   from Bootcamp II Step 4) applies directly: RAG's job is to construct the working
   set for each query. This is the novel framing.

4. **The retrieval spectrum** - Keyword search (BM25/TF-IDF) through semantic search
   (embeddings) to hybrid approaches. Tradeoffs in precision, recall, latency, cost.
   Not a progression from bad to good - each has a regime where it dominates.

5. **The naive RAG pipeline** - Chunk -> embed -> store -> query embed -> retrieve
   top-k -> inject into prompt. Walk through each step. What this gets right (simple,
   works for many cases). Where it breaks (next section).

6. **Where naive RAG fails** - Chunks that split context across boundaries. Query-document
   vocabulary mismatch. Semantically similar but wrong content retrieved. Context window
   flooding with marginally relevant content. Each failure mode should be concrete with
   an example.

7. **Retrieval quality metrics** - Precision (are retrieved docs relevant?), recall
   (did we miss relevant docs?), MRR (mean reciprocal rank), nDCG (normalised discounted
   cumulative gain). How to measure retrieval quality independently from generation quality.
   Connect to Bootcamp IV eval methodology.

8. **When not to use RAG** - Small knowledge bases that fit in prompt. Tasks where training
   data suffices. Real-time requirements that exceed indexing speed. The simplicity
   principle: don't add retrieval infrastructure unless you need it.

### Project Vocabulary Integration

Connect to these project concepts (from Task 02 findings):
- **Working set** (Denning 1968) - RAG constructs the working set per query
- **Cold context pressure** - retrieval failure produces this (model falls back to
  pattern-matching from training data)
- **Stale reference propagation** - outdated index produces this (same failure mode as
  stale AGENTS.md, but automated)
- **Right answer wrong work** (slopodar) - retrieval returns plausible but wrong document

### Challenges

Design 4-6 challenges of increasing difficulty:
- **Information need analysis** (easy) - given 5 scenarios, classify: needs RAG, fits in
  prompt, needs real-time API, training data sufficient
- **Naive RAG walkthrough** (medium) - manually simulate the RAG pipeline: take a
  paragraph, chunk it two ways, write a query, predict which chunks would match
- **Retrieval quality measurement** (medium) - given a set of queries and retrieved
  results with relevance labels, compute precision@5, MRR, nDCG
- **Failure mode identification** (hard) - given 5 RAG failure examples, diagnose the
  failure mode (bad chunking, vocabulary mismatch, semantic but wrong, context flooding)
- **Working set design** (hard) - for a given agent task description, design the ideal
  working set. What information must be present? What is noise? How would retrieval
  construct this?

### Agentic Grounding

Use `> AGENTIC GROUNDING:` blockquotes after each major section. Connect to:
- Why retrieval quality directly determines agent output quality
- Why understanding failure modes matters for debugging agent systems
- How the working set concept guides RAG system design
- Why measuring retrieval independently from generation is essential for diagnosis

### Field vs Novel

Use `> FIELD VS NOVEL:` or equivalent blockquote:
- **Field:** Lewis et al. (2020), IR fundamentals (Manning 2008), provider documentation
- **Novel:** Working set applied to retrieval, RAG failure as cold context pressure,
  outdated indices as stale reference propagation, the BFS depth rule as manual RAG

## Quality Constraints

- No emojis, no em-dashes
- 2 spaces indentation in code blocks
- Prose style matches Bootcamp I: direct, technical, no filler
- Every section answers "why does this matter for production agent systems?"
- Concepts build on Bootcamp II Step 4 (context engineering) - reference, don't repeat
- Code examples where appropriate (Python, using standard libraries)
