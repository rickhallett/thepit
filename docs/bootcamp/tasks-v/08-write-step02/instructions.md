# Task 08: Write - Step 2: Embeddings and Vector Search

**Type:** Write
**Depends on:** Tasks 01 (format), 02 (internal refs), 03 (external refs), Task 07 (Step 1 written)
**Parallelizable with:** None (depends on Step 1 per dependency graph)
**Output:** `docs/bootcamp/step02-embeddings-vector-search.md`

---

## Objective

Write the full Step 2 content: "Embeddings and Vector Search." This is ESTABLISHED -
the field has mature documentation on embeddings, similarity search, and vector databases.
The novel contribution is the connection to Bootcamp III Step 9 (text analysis, string
similarity) as the non-embedding baseline, and the triangulate script's matching
algorithm as a worked example of when embeddings are overkill.

Estimated target: 35-50k characters (~1000-1400 lines).

## Prime Context (load before writing)

1. `docs/bootcamp/tasks-v/01-research-format/findings.md` - format template
2. `docs/bootcamp/tasks-v/02-research-internal-refs/findings.md` - internal concepts
3. `docs/bootcamp/tasks-v/03-research-retrieval-external/findings.md` - external references
4. `docs/bootcamp/BOOTCAMP-V-OUTLINE.md` lines 182-242 - the Step 2 outline
5. `docs/bootcamp/step01-retrieval-problem.md` - Step 1 (to reference, not duplicate)

## Content Structure

### Mandatory Sections

1. **Why This is Step 2** - Embeddings are the machinery underneath semantic retrieval.
   Step 1 established the problem; this step provides the primary tool. Frame: you cannot
   debug retrieval quality without understanding what embeddings capture and what they miss.

2. **What embeddings are** - Dense vector representations where semantic similarity maps
   to geometric proximity. Not magic - a learned mapping from text to numbers that
   preserves meaning relationships. Contrast with sparse representations (bag of words,
   TF-IDF). Visual intuition: points in high-dimensional space, similar meanings cluster.

3. **Embedding models** - Landscape survey:
   - OpenAI text-embedding-3-small/large (dimensions, pricing, capabilities)
   - Anthropic embedding API (if available - Task 03 research will confirm)
   - Open-source: sentence-transformers (Reimers & Gurevych), E5, BGE
   - Dimension tradeoffs (higher = more expressive but slower/costlier)
   - Model selection criteria: task, cost, latency, privacy

4. **Similarity metrics** - Cosine similarity (most common for normalised embeddings),
   dot product (when magnitudes matter), Euclidean distance (rarely used for text).
   Mathematical definition (brief, engineer-level). Why cosine dominates: normalisation
   removes magnitude, focuses on direction.

5. **Vector databases** - Purpose-built storage for embedding vectors with ANN search.
   For each: what it is, when to use it, key tradeoffs:
   - pgvector (Postgres extension - use if you have Postgres)
   - Chroma (lightweight, Python-native - good for dev/prototyping)
   - FAISS (Facebook, library not database - in-memory, fast)
   - Pinecone (managed - scale without ops)
   - Qdrant (Rust-based - performance)
   - Weaviate (open-source - hybrid search built in)
   - The "do I even need a vector database?" question: for small datasets, numpy +
     cosine similarity is sufficient

6. **Choosing a vector store** - Decision framework based on: dataset size, existing
   infrastructure, latency requirements, operational complexity tolerance. In-memory
   for development, pgvector for existing Postgres, managed for scale.

7. **Indexing strategies** - HNSW (hierarchical navigable small world), IVF (inverted
   file index), PQ (product quantisation). Not the algorithms in detail - the
   operational tradeoffs: build time vs query speed, memory vs recall, approximate
   vs exact. When to tune, when defaults are fine.

8. **Embedding quality evaluation** - How to evaluate whether embeddings capture the
   right similarity. The embedding evaluation problem is an instance of the eval
   problem from Bootcamp IV. MTEB benchmark. Task-specific evaluation.

### Exercises

Design 3-4 exercises that build skills with real tools:

- **Embed and compare** (medium) - Embed 100 text chunks using OpenAI's API (or
  sentence-transformers if no API access). Store in both numpy (in-memory) and Chroma.
  Query both with 10 queries. Compare: results identical? Latency difference?

- **Semantic search over slopodar** (medium) - Embed each slopodar pattern's description.
  Query "code that looks correct but isn't" and see which patterns surface. Evaluate:
  does the ranking make sense? Which patterns should rank high but don't?

- **Model comparison** (hard) - Compare two embedding models (OpenAI vs sentence-transformers)
  on the same corpus. Measure: cosine similarity distributions, top-k overlap rate,
  qualitative relevance assessment.

### Field vs Novel

- **Field:** OpenAI embeddings documentation, sentence-transformers library, MTEB,
  extensive vector database documentation
- **Novel:** Bootcamp III Step 9 text analysis coverage of SequenceMatcher and string
  similarity as the non-embedding baseline. The triangulate script's matching algorithm
  (0.3 * file_sim + 0.7 * title_sim) as a worked example of when embeddings are
  overkill and string similarity suffices.

## Quality Constraints

- No emojis, no em-dashes
- 2 spaces indentation in code blocks
- Runnable Python code examples (using uv, sentence-transformers or OpenAI SDK)
- Include installation commands using uv
- Honest about tradeoffs - embeddings are not always better than keyword search
- Build on Step 1 concepts (precision, recall, MRR) - reference, don't re-explain
