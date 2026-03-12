# Task 03: Research - External References for Retrieval (Steps 1-4)

**Type:** Research (read-only, web fetch)
**Parallelizable with:** Tasks 01, 02, 04, 05, 06
**Blocks:** Tasks 07, 08, 09, 10 (write tasks for Steps 1-4)
**Output:** `docs/bootcamp/tasks-v/03-research-retrieval-external/findings.md`

---

## Objective

Research and verify external references cited in Steps 1-4 of the Bootcamp V outline.
Steps 1-2 are ESTABLISHED field maturity; Steps 3-4 are EMERGING. The research goal is
to verify references, extract pedagogically useful material, and survey the current
(March 2026) state of retrieval tooling and practice.

## Step 1 References: The Retrieval Problem

**Field maturity: ESTABLISHED**

1. **Lewis et al., "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks" (2020)**
   - Verify paper exists (arXiv:2005.11401), get correct citation
   - Extract: the RAG architecture diagram, the core insight (retrieval + generation)
   - What an engineer needs from this paper vs what a researcher needs

2. **Manning et al., "Introduction to Information Retrieval" (2008)**
   - Verify availability (Stanford NLP group, freely available online)
   - Extract: precision/recall definitions, MRR, nDCG definitions
   - Which chapters are relevant for agent engineers (not the full IR curriculum)

3. **Anthropic's context window documentation (current)**
   - Verify current URL and token limits
   - Extract: effective context length vs advertised, any guidance on retrieval

4. **OpenAI retrieval/file search tools documentation**
   - Verify current URL and API shape
   - Extract: how OpenAI frames retrieval in the Assistants API, key abstractions

5. **General research:**
   - What is the current best explanation of "why naive RAG fails" for practitioners?
   - Current embedding model landscape (March 2026): what are the leading models?
   - MTEB leaderboard: current top-5 general-purpose embedding models

## Step 2 References: Embeddings and Vector Search

**Field maturity: ESTABLISHED**

1. **Reimers & Gurevych, "Sentence-BERT" (2019)**
   - Verify paper, extract: why sentence embeddings differ from word embeddings
   - The sentence-transformers library current state

2. **Vector database landscape (March 2026):**
   - pgvector: current version, capabilities, limitations
   - Chroma: current version, API shape, when to use
   - FAISS: current state (still Facebook maintained?), use cases
   - Pinecone: current pricing model, managed service tradeoffs
   - Qdrant: current state, Rust-based performance claims
   - Weaviate: current state, hybrid search capabilities
   - Any new entrants since the outline was written?

3. **HNSW algorithm overview:**
   - Best practitioner-level explanation (not the original paper)
   - What engineers need to know: build time, query speed, memory, recall tradeoffs

4. **OpenAI text-embedding-3 documentation:**
   - Verify current models, dimensions, pricing
   - Any Anthropic embedding API? (The outline mentions it - verify availability)

5. **MTEB (Massive Text Embedding Benchmark):**
   - Verify current URL (huggingface.co/spaces/mteb/leaderboard)
   - Current top models, what the benchmark measures

## Step 3 References: RAG Pipeline Engineering

**Field maturity: ESTABLISHED core, EMERGING advanced**

1. **Gao et al., "HyDE - Precise Zero-Shot Dense Retrieval without Relevance Labels" (2022)**
   - Verify paper (arXiv:2212.10496)
   - Extract: the HyDE insight (embed hypothetical answer, not query)
   - Current adoption status - is HyDE widely used in production?

2. **RAGAS evaluation framework:**
   - Verify current URL, GitHub repo
   - Extract: key metrics (faithfulness, answer relevance, context precision, context recall)
   - How RAGAS connects to Bootcamp IV evaluation methodology

3. **LangChain RAG documentation:**
   - Current state of LangChain's RAG abstractions
   - Text splitters (recursive, semantic) - API and approach
   - What LangChain gets right and where it obscures the mechanism

4. **LlamaIndex documentation:**
   - Current state of LlamaIndex's ingestion and retrieval pipeline
   - How it compares to LangChain for RAG
   - Key abstractions (nodes, indices, query engines)

5. **Chunking strategies survey:**
   - Current best practices for chunking (March 2026)
   - Fixed vs semantic vs recursive - which dominates in production?
   - Overlap recommendations (common values, tradeoffs)

## Step 4 References: Advanced Retrieval Patterns

**Field maturity: EMERGING**

1. **Microsoft GraphRAG (2024):**
   - Verify GitHub repo, paper if available
   - Extract: when graph structure adds value, the community detection approach
   - Current adoption status - production-ready or research?

2. **Asai et al., "Self-RAG: Learning to Retrieve, Generate, and Critique" (2023)**
   - Verify paper (arXiv:2310.11511)
   - Extract: the self-retrieval insight (model decides when to retrieve)
   - Corrective RAG concept

3. **BM25 and hybrid search:**
   - Current best Python implementation (rank-bm25 or alternatives)
   - Reciprocal rank fusion: standard implementation, the 1/(k+rank) formula
   - Which vector databases support hybrid search natively?

4. **Reranking models:**
   - Cohere Rerank: current API, pricing
   - Cross-encoder reranking via sentence-transformers: current models
   - ColBERT: current state, when to use

5. **Code retrieval:**
   - Code-specific embedding models (current best)
   - Repository-level context tools (Sourcegraph, GitHub code search, etc.)
   - How code retrieval differs from document retrieval

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

Group by step. Flag any references that cannot be verified or have moved.
Include a "Landscape Summary" section at the end: what has changed in retrieval
tooling since the outline was written (if anything notable).
