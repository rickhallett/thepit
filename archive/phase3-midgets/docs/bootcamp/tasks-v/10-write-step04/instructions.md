# Task 10: Write - Step 4: Advanced Retrieval Patterns

**Type:** Write
**Depends on:** Tasks 01 (format), 02 (internal refs), 03 (external refs), Task 09 (Step 3 written)
**Parallelizable with:** Tasks 11-12 (Steps 5-6, different tier, independent)
**Output:** `docs/bootcamp/step04-advanced-retrieval.md`

---

## Objective

Write the full Step 4 content: "Advanced Retrieval Patterns." This is EMERGING - the
patterns are documented but conventions are still forming. This step covers hybrid search,
reranking, agentic RAG, knowledge graphs, and code retrieval.

Estimated target: 35-50k characters (~1000-1400 lines).

## Prime Context (load before writing)

1. `docs/bootcamp/tasks-v/01-research-format/findings.md` - format template
2. `docs/bootcamp/tasks-v/02-research-internal-refs/findings.md` - internal concepts
3. `docs/bootcamp/tasks-v/03-research-retrieval-external/findings.md` - external references
4. `docs/bootcamp/BOOTCAMP-V-OUTLINE.md` lines 317-370 - the Step 4 outline
5. `docs/bootcamp/step03-rag-pipeline.md` - Step 3 (RAG pipeline, to build on)

## Content Structure

### Mandatory Sections

1. **Why This is Step 4** - Step 3 built the standard pipeline. This step addresses the
   cases where standard retrieval is not sufficient. Frame: advanced patterns solve real
   problems, but each adds complexity. Use the simplicity principle: only escalate when
   the simpler approach demonstrably fails.

2. **Hybrid search** - Combining semantic (embeddings) + lexical (BM25/TF-IDF):
   - Why: semantic search finds meaning-similar content; lexical finds exact matches.
     Neither is strictly superior. Together they cover more ground.
   - How: reciprocal rank fusion (RRF) for combining ranked lists. The formula:
     score = sum(1 / (k + rank_i)) across systems. Simple, effective, well-studied.
   - Implementation: BM25 via rank-bm25 (Python) + embedding search, fuse results.
   - When: queries with specific terminology (names, IDs, error codes) benefit most.
   - Which vector databases support hybrid search natively (Weaviate, Qdrant, etc.).

3. **Reranking** - Two-stage retrieval:
   - Stage 1: fast, broad retrieval (top-100 by embedding similarity)
   - Stage 2: rerank with cross-encoder that sees query + document together
   - Cross-encoders (sentence-transformers): more accurate, much slower, O(n*m) pairs
   - Cohere Rerank API, ColBERT (late interaction)
   - When: ambiguous queries, high-stakes retrieval (medical, legal, code review)

4. **Agentic RAG** - The agent decides when, what, and how to retrieve:
   - Self-RAG (Asai et al. 2023): model generates special tokens that trigger retrieval
     as needed rather than always retrieving
   - Corrective RAG: evaluate retrieval quality, re-retrieve if confidence is low
   - Implementation: give the agent a retrieval tool (not a hardcoded pipeline step)
   - When: complex tasks where retrieval needs vary by subtask

5. **Knowledge graphs + RAG** - Structured knowledge combined with unstructured retrieval:
   - GraphRAG (Microsoft 2024): community detection + summarisation
   - When graph adds value: multi-hop reasoning ("who manages the person who wrote
     this code?"), entity disambiguation, relationship queries
   - When graph is overkill: simple document retrieval, single-hop questions
   - Implementation complexity vs benefit tradeoff

6. **Retrieval for code** - Searching codebases semantically:
   - Code-specific embeddings (different from text embeddings)
   - Repository-level context (file dependencies, call graphs)
   - The difference between finding a function definition and understanding usage
   - Tools: code search engines, tree-sitter for structure-aware chunking

7. **Index maintenance** - The operational side of retrieval:
   - Document updates, deletions, re-indexing
   - The freshness problem: how quickly do new documents become searchable?
   - Incremental indexing vs full rebuild (tradeoffs)
   - Monitoring index health

### Exercises

- **Hybrid search implementation** (medium-hard) - BM25 + embedding retrieval over
  bootcamp docs, combined with RRF. Compare to embedding-only on 10 test queries.
  Measure: top-5 precision improvement.

- **Reranker addition** (medium) - Add cross-encoder reranking (sentence-transformers)
  to the top-20 embedding results. Measure: relevance improvement for ambiguous queries.

- **Agentic RAG** (hard) - Give an agent a retrieval tool it can call when needed.
  Test: when does the agent correctly decide NOT to retrieve? Design test cases where
  retrieval is unnecessary and measure whether the agent skips it.

## Quality Constraints

- No emojis, no em-dashes
- 2 spaces indentation in code blocks
- Honest about complexity vs benefit for each pattern
- The simplicity principle is load-bearing: most systems should stop at Step 3
- Advanced patterns should be presented as "reach for when Step 3 fails" not as upgrades
- Runnable Python code where feasible; architecture diagrams (text-based) where not
