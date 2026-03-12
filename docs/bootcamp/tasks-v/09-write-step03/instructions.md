# Task 09: Write - Step 3: RAG Pipeline Engineering

**Type:** Write
**Depends on:** Tasks 01 (format), 02 (internal refs), 03 (external refs), Tasks 07-08 (Steps 1-2 written)
**Parallelizable with:** None (depends on Steps 1-2 per dependency graph)
**Output:** `docs/bootcamp/step03-rag-pipeline.md`

---

## Objective

Write the full Step 3 content: "RAG Pipeline Engineering." This covers the full pipeline
from document ingestion to generation. The core is ESTABLISHED; advanced patterns
(HyDE, query decomposition) are EMERGING. This is the longest and most implementation-heavy
step in Tier 1.

Estimated target: 45-60k characters (~1300-1700 lines). This is the densest step.

## Prime Context (load before writing)

1. `docs/bootcamp/tasks-v/01-research-format/findings.md` - format template
2. `docs/bootcamp/tasks-v/02-research-internal-refs/findings.md` - internal concepts
3. `docs/bootcamp/tasks-v/03-research-retrieval-external/findings.md` - external references
4. `docs/bootcamp/BOOTCAMP-V-OUTLINE.md` lines 244-314 - the Step 3 outline
5. `docs/bootcamp/step01-retrieval-problem.md` - Step 1 (retrieval fundamentals)
6. `docs/bootcamp/step02-embeddings-vector-search.md` - Step 2 (embeddings, vector stores)

## Content Structure

### Mandatory Sections

1. **Why This is Step 3** - Steps 1-2 provided the problem and the primary tool. This
   step assembles the full pipeline. Frame: a RAG system is an engineering pipeline,
   not a single API call. Every step in the pipeline has decisions that affect output quality.

2. **The full RAG pipeline** - Walk through end to end:
   Document ingestion -> chunking -> embedding -> indexing -> query processing ->
   retrieval -> context assembly -> generation.
   Each step has engineering decisions. Diagram (text-based) showing the flow.

3. **Chunking strategies** - The first and most impactful engineering decision:
   - Fixed-size (by token count): simple, predictable, but splits semantic units
   - Semantic (by paragraph/section boundaries): preserves meaning, variable sizes
   - Recursive (split at largest boundary first, subdivide): best of both
   - Overlap between chunks: preserves context across boundaries (typical: 10-20% overlap)
   - Chunk size tradeoffs: too small = lost context, too large = diluted relevance
   - Code examples for each strategy (Python, using basic string operations first,
     then LangChain/LlamaIndex text splitters for comparison)

4. **Document preprocessing** - Handling formats: PDF, HTML, markdown, code files.
   Metadata extraction (source, date, author, section headers). Metadata as filterable
   attributes in the vector store. The preprocessing quality determines retrieval
   quality - garbage in, garbage out.

5. **Query processing** - The user's query may not match document vocabulary:
   - Query expansion (add synonyms, related terms)
   - HyDE (Gao et al. 2022): generate a hypothetical answer, embed that instead
     of the query. Explain the insight: the hypothetical answer is closer in
     embedding space to the real answer than the question is.
   - Query decomposition: break complex questions into sub-queries, retrieve for
     each, combine results.

6. **Context assembly** - Retrieved chunks must be assembled into a coherent prompt:
   - Ordering: most relevant first vs chronological vs source-grouped
   - Deduplication: overlapping chunks produce redundant content
   - Source attribution: tag each chunk with its source for citation
   - The context budget problem: more context improves grounding but costs tokens
     and risks hot context pressure (connect to project vocabulary)

7. **Citation and grounding** - Connecting generated claims to retrieved sources.
   The hallucination problem in RAG: the model generates plausible content not
   supported by retrieved documents. Faithful generation techniques. Why citation
   matters for trust and debugging.

8. **RAG evaluation** - Evaluating retrieval and generation independently:
   - Retrieval quality: precision, recall, MRR (from Step 1)
   - Generation quality: faithfulness, relevance, completeness
   - RAGAS framework metrics (if verified in Task 03)
   - Connection to Bootcamp IV eval methodology
   - Why measuring them independently is essential for diagnosis

9. **Failure mode analysis** - What happens when:
   - Retrieval fails (returns nothing or irrelevant content)?
   - The right document exists but is chunked badly?
   - The query is ambiguous?
   - Design for graceful degradation: the system should tell the user when it
     doesn't have enough information, not hallucinate.

### Project Vocabulary Integration

- **BFS depth rule** (AGENTS.md) as manual retrieval strategy that RAG automates:
  depth 1 = always load, depth 2 = load when relevant, depth 3+ = deliberate search
- **Context quality loop** applied to RAG: clean documents -> better retrievals ->
  better generation -> motivation to clean documents
- **Hot context pressure** from over-retrieval (too many chunks in prompt)
- **Shadow validation** (slopodar) - RAG abstraction covers easy cases, misses critical path

### Exercises

- **Build a RAG pipeline** (medium-hard) - RAG over the bootcamp documentation (markdown
  files). Implement: recursive chunking, embeddings, Chroma storage, cosine similarity
  retrieval. Query: "What should I know about process observation?" Evaluate retrieval.

- **Chunking comparison** (medium) - Compare 3 strategies (fixed 500 tokens, fixed 1000
  tokens, semantic by markdown headers) on the same corpus. Measure precision@5 for
  10 test queries.

- **Citation implementation** (hard) - For each generated sentence, annotate which chunk
  it draws from. Evaluate: what percentage of generated claims have source support?

## Quality Constraints

- No emojis, no em-dashes
- 2 spaces indentation in code blocks
- Runnable Python code (uv, with clear dependency installation commands)
- Real pipeline code, not pseudocode
- Every engineering decision explained with tradeoffs, not just "do it this way"
- Build on Steps 1-2 concepts - reference, don't re-explain embeddings or metrics
