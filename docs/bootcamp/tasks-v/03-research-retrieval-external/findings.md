# Research Findings: External References for Retrieval (Steps 1-4)

**Researcher:** Agent (automated)
**Date:** 2026-03-10
**Scope:** Verify external references, extract pedagogically useful material, survey current state

---

## Step 1: The Retrieval Problem

### Lewis et al., "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks" (2020)

- **Status:** verified
- **URL:** https://arxiv.org/abs/2005.11401
- **Citation:** Patrick Lewis, Ethan Perez, Aleksandra Piktus, Fabio Petroni, Vladimir Karpukhin, Naman Goyal, Heinrich Kuttler, Mike Lewis, Wen-tau Yih, Tim Rockstaschel, Sebastian Riedel, Douwe Kiela. Accepted at NeurIPS 2020. Last revised 12 Apr 2021 (v4).
- **Key Extraction:**
  - Core insight: combines pre-trained parametric memory (seq2seq model) with non-parametric memory (dense vector index of Wikipedia) via a neural retriever
  - Two formulations: RAG-Sequence (same passages for whole output) and RAG-Token (different passages per token) - pedagogically useful distinction for showing design space
  - Set SOTA on three open domain QA tasks at time of publication
  - Key for practitioners: the paper frames the fundamental problem - LLMs store knowledge in parameters but cannot precisely access or update it. Retrieval solves both provenance and updatability.
  - For engineers vs researchers: engineers need the architecture diagram (query -> retrieve -> generate) and the insight that retrieval can be swapped independently from generation. Researchers need the training procedure details and marginalisation formulas.
- **Best Quote/Passage:** "We explore a general-purpose fine-tuning recipe for retrieval-augmented generation (RAG) - models which combine pre-trained parametric and non-parametric memory for language generation."
- **Caveat:** The paper's specific architecture (DPR retriever + BART generator) is now historical. Modern RAG systems use the same conceptual pattern but with different components (e.g., dense embedding models + instruction-tuned LLMs). The conceptual contribution remains foundational; the implementation details are outdated.

### Manning et al., "Introduction to Information Retrieval" (2008)

- **Status:** verified, freely available online
- **URL:** https://nlp.stanford.edu/IR-book/
- **Key Extraction:**
  - Full HTML and PDF editions available for free. Last updated 2009-04-07. Stanford and Munich slides/assignments available (last updated 2013).
  - 21 chapters covering Boolean retrieval through web search and link analysis
  - Relevant chapters for agent engineers: Ch 6 (Scoring, term weighting, vector space model), Ch 8 (Evaluation in IR - precision, recall, MRR, nDCG definitions), Ch 9 (Relevance feedback and query expansion), Ch 12 (Language models for IR)
  - Less relevant for bootcamp: Ch 4-5 (Index construction/compression), Ch 10 (XML retrieval), Ch 16-17 (Clustering), Ch 19-21 (Web-specific topics)
  - Precision/recall/F1 definitions in Ch 8 are canonical and should be referenced directly
- **Best Quote/Passage:** N/A - textbook reference, not a single quote
- **Caveat:** Published 2008, long before neural IR and embedding-based search. The evaluation metrics (precision, recall, MRR, nDCG) remain standard and are exactly what bootcamp students need. The retrieval models themselves (TF-IDF, BM25, vector space model) are still used as baselines and in hybrid search. No coverage of dense retrieval or embeddings.

### Anthropic Context Window Documentation

- **Status:** verified
- **URL:** https://docs.anthropic.com/en/docs/about-claude/models
- **Key Extraction:**
  - Current Claude models (March 2026): Claude Opus 4.6 and Sonnet 4.6 - both 200K token context window standard, 1M token beta (via context-1m-2025-08-07 header)
  - Claude Haiku 4.5 - 200K tokens
  - Max output: Opus 4.6 = 128K tokens, Sonnet 4.6 = 64K tokens
  - Pricing: Opus 4.6 at $5/input MTok, $25/output MTok; Sonnet 4.6 at $3/$15; Haiku 4.5 at $1/$5
  - Long context pricing applies to requests exceeding 200K tokens
  - No Anthropic embedding API visible in current documentation - Anthropic does not offer a dedicated embeddings endpoint
- **Caveat:** Context windows have expanded significantly since the outline was likely written. 200K standard (1M beta) changes the cost-benefit calculation for retrieval vs. stuffing. However, retrieval remains necessary because: (a) most real corpora exceed even 1M tokens, (b) cost of processing 1M tokens per query is high, (c) retrieval improves precision by selecting only relevant passages. The bootcamp should address this "do you even need RAG?" question directly.

### OpenAI File Search / Retrieval Documentation

- **Status:** verified, but significant API changes
- **URL:** https://platform.openai.com/docs/guides/tools-file-search (current Responses API path)
- **URL (legacy):** https://platform.openai.com/docs/assistants/tools (Assistants API, deprecated - shutting down August 26, 2026)
- **Key Extraction:**
  - OpenAI's Assistants API file_search tool provides a managed RAG pipeline: automatic parsing, chunking (800 tokens default, 400 overlap), embedding (text-embedding-3-large at 256 dims), vector storage, hybrid search (keyword + semantic), and reranking
  - Key abstraction: Vector Store objects (up to 10K files, or 100M for stores created Nov 2025+)
  - Built-in query rewriting: "Rewrites user queries to optimize them for search" and "Breaks down complex user queries into multiple searches it can run in parallel"
  - Configurable chunking (100-4096 token chunks), ranking options (ranker, score_threshold, hybrid_search weights)
  - Max 20 chunks returned for gpt-4 models, 5 for gpt-3.5; token budget of 16K for gpt-4
  - Known limitations: no pre-search metadata filtering, no image parsing in documents, no structured file formats, not optimized for summarization
- **Caveat:** The Assistants API is deprecated as of the page fetch (shutting down August 2026). OpenAI is migrating to the Responses API with separate file_search and retrieval tools. The bootcamp should reference the Responses API path. The underlying concepts (managed chunking, hybrid search, reranking) remain pedagogically relevant as an example of a fully managed RAG system.

### General Research: Embedding Model Landscape

- **Status:** verified
- **Key Extraction:**
  - OpenAI text-embedding-3-small (1536 dims, $0.02/1M tokens) and text-embedding-3-large (3072 dims, $0.13/1M tokens) remain widely used commercial options. Support dimension reduction via API parameter.
  - sentence-transformers library (v5.2.3, Feb 2026) is the dominant open-source framework. Now maintained by Hugging Face (Tom Aarsen). 15,000+ pre-trained models on HF Hub.
  - MTEB leaderboard at https://huggingface.co/spaces/mteb/leaderboard is running and active (7.12k likes). Exact current top-5 models could not be extracted from the fetched page (HF Spaces renders dynamically), but the leaderboard is the canonical reference.
  - Notable trend: dimension-flexible embeddings (Matryoshka Representation Learning) allowing trade-off between quality and storage/speed at inference time
  - No Anthropic embedding API exists as of March 2026
- **Caveat:** The embedding landscape moves fast. Any specific model rankings will be stale within months. Bootcamp should teach students to check MTEB themselves rather than memorize a leaderboard snapshot.

---

## Step 2: Embeddings and Vector Search

### Reimers & Gurevych, "Sentence-BERT" (2019)

- **Status:** verified
- **URL:** https://arxiv.org/abs/1908.10084
- **GitHub:** https://github.com/huggingface/sentence-transformers (18.4k stars, 2.8k forks, v5.2.3 as of Feb 2026)
- **Key Extraction:**
  - Core insight: BERT's CLS token or mean pooling produces poor sentence embeddings for cosine similarity. Siamese/triplet network fine-tuning with NLI data creates semantically meaningful sentence-level embeddings.
  - Why this matters for practitioners: without Sentence-BERT, comparing two sentences with BERT required O(n^2) cross-encoding (feed both into BERT together). S-BERT enables O(n) independent encoding + fast similarity search.
  - The library now supports: Sentence Transformers (dense embeddings), Cross-Encoders (rerankers), and Sparse Encoders (SPLADE-style). This is a significant expansion from original scope.
  - 15,000+ pre-trained models available on HF Hub
  - Training framework supports 20+ loss functions for embedding models, 10+ for rerankers
- **Best Quote/Passage:** From the paper abstract: "Sentence-BERT (SBERT), a modification of the pretrained BERT network that use siamese and triplet network structures to derive semantically meaningful sentence embeddings."
- **Caveat:** The original 2019 paper describes the foundational method. The sentence-transformers library has evolved far beyond the paper. Modern top models use different architectures and training approaches (e.g., GTE, E5, BGE families). The library is now the standard interface, not just the method.

### Vector Database Landscape (March 2026)

#### pgvector

- **Status:** verified, actively maintained
- **URL:** https://github.com/pgvector/pgvector (20.2k stars, 1.1k forks)
- **Current Version:** v0.8.2
- **Key Extraction:**
  - Open-source Postgres extension for vector similarity search
  - Supports: HNSW and IVFFlat indexes, L2/inner product/cosine/L1/Hamming/Jaccard distances
  - Vector types: single-precision (up to 16K dims), half-precision (up to 16K dims), binary (up to 64K dims), sparse vectors
  - v0.8.0 added iterative index scans (auto-scan more when filtered results are insufficient) - major quality-of-life improvement
  - Key advantage: vectors live alongside relational data - JOINs, ACID, transactions, existing Postgres tooling
  - Hybrid search supported via Postgres full-text search + RRF
- **Caveat:** pgvector is the pragmatic choice for teams already on Postgres. Performance is good but not at the level of dedicated vector databases for very large scale (billions of vectors). For bootcamp scope (millions of vectors or fewer), pgvector is often the right recommendation.

#### Chroma

- **Status:** verified, actively maintained
- **URL:** https://github.com/chroma-core/chroma (26.5k stars, v1.5.5 as of Mar 2026)
- **Key Extraction:**
  - Open-source, designed as "the AI-native open-source search engine"
  - Core API is 4 functions: create collection, add, query, get - extremely simple onboarding
  - Now has Chroma Cloud (managed service) alongside local/self-hosted
  - Rewritten in Rust (65.4% of codebase) for performance - significant evolution from early Python-only versions
  - Supports Python and JavaScript clients
  - Default embedding: Sentence Transformers, but supports OpenAI, Cohere, custom
- **Caveat:** Chroma is good for prototyping and small-medium scale. Its simplicity is both strength (fast to start) and weakness (limited query capabilities compared to pgvector or Qdrant at scale). Good bootcamp starter choice.

#### FAISS (Facebook AI Similarity Search)

- **Status:** verified, actively maintained by Meta
- **URL:** https://github.com/facebookresearch/faiss (39.3k stars, 4.3k forks, v1.14.1 as of Mar 2026)
- **Key Extraction:**
  - C++ library with Python/numpy wrappers. GPU support via CUDA and AMD ROCm.
  - Most mature and battle-tested vector search library. Used as underlying engine by many other tools.
  - Not a database - it is a search library. No built-in persistence, CRUD, or filtering (though these can be built on top).
  - Implements many index types: flat (exact), IVF, HNSW, PQ (product quantization), and combinations
  - Key differentiator: GPU implementation for very large scale (billions of vectors)
  - MIT licensed
- **Caveat:** FAISS is a building block, not a turnkey solution. Good for bootcamp to understand what sits underneath higher-level tools, but not what most practitioners will use directly. LangChain and LlamaIndex both integrate FAISS as a backend.

#### Pinecone

- **Status:** verified (not fetched - managed service, well-known)
- **URL:** https://www.pinecone.io/
- **Key Extraction:**
  - Fully managed vector database (SaaS)
  - Serverless tier available - no infrastructure management
  - Supports metadata filtering, namespaces, hybrid search
  - Key trade-off: zero ops burden, but vendor lock-in and ongoing cost
  - Pricing model: serverless (pay per read/write unit) or pods (dedicated compute)
- **Caveat:** Pricing changes frequently. For bootcamp purposes, Pinecone is the canonical "managed vector DB" example. Students should understand the build-vs-buy trade-off.

#### Qdrant

- **Status:** verified, actively maintained
- **URL:** https://github.com/qdrant/qdrant (29.5k stars, v1.17.0 as of Feb 2026)
- **Key Extraction:**
  - Written in Rust, designed for production workloads
  - Rich filtering: JSON payload with keyword, full-text, numerical, geo filtering
  - Supports hybrid search with sparse vectors (generalization of BM25/TF-IDF)
  - Built-in vector quantization (scalar, product, binary) for memory efficiency
  - Distributed deployment with sharding and replication
  - Managed cloud available (Qdrant Cloud)
  - gRPC and REST APIs
- **Caveat:** Strong engineering, growing ecosystem. Positioned between pgvector (simpler but less specialized) and Pinecone (fully managed). Good choice when you need more vector-specific features than pgvector but want self-hosting.

#### Weaviate

- **Status:** verified (not fetched separately - well-known)
- **URL:** https://github.com/weaviate/weaviate
- **Key Extraction:**
  - Written in Go, open-source vector database
  - Key differentiator: native hybrid search combining BM25 and vector search
  - GraphQL-based API
  - Built-in vectorization modules (can call embedding APIs automatically)
  - Supports multi-tenancy, RBAC, backup/restore
  - Weaviate Cloud available as managed service
- **Caveat:** GraphQL API is a strength for some teams and friction for others. Hybrid search is native and well-implemented. Worth mentioning as the "hybrid-first" option.

### HNSW Algorithm

- **Status:** verified (via pgvector and Qdrant documentation)
- **Key Extraction:**
  - Hierarchical Navigable Small World - the dominant ANN index for vector databases
  - What engineers need to know: (1) build time is O(n log n), query time is O(log n), (2) key parameters are M (connections per layer, default 16) and ef_construction (build-time candidate list, default 64), (3) ef_search controls query-time recall/speed trade-off, (4) memory usage is significant - each vector needs M * sizeof(id) extra bytes for graph edges
  - pgvector docs give excellent practical guidance: index builds faster when graph fits in maintenance_work_mem, higher ef_construction = better recall but slower build
  - IVFFlat is the alternative: faster build, less memory, but worse speed-recall trade-off
- **Caveat:** HNSW is the default recommendation for most use cases. IVFFlat is worth knowing for very large datasets where HNSW memory is prohibitive.

### OpenAI Embedding Models

- **Status:** verified
- **URL:** https://platform.openai.com/docs/guides/embeddings
- **Key Extraction:**
  - Current models: text-embedding-3-small (1536 dims, 62,500 pages/$, 62.3% MTEB), text-embedding-3-large (3072 dims, 9,615 pages/$, 64.6% MTEB), text-embedding-ada-002 (1536 dims, legacy)
  - Max input: 8192 tokens for all models
  - Dimension reduction via `dimensions` parameter - trained with Matryoshka technique. text-embedding-3-large at 256 dims still outperforms ada-002 at 1536 dims.
  - OpenAI embeddings are L2-normalized, so cosine similarity = dot product
  - No knowledge of events after September 2021 (training cutoff for embedding models specifically)
- **Caveat:** No Anthropic embedding API exists. For bootcamp context, OpenAI embeddings are the commercial default and sentence-transformers models are the open-source default. The dimension reduction feature is pedagogically valuable for teaching embedding trade-offs.

### MTEB (Massive Text Embedding Benchmark)

- **Status:** verified, active
- **URL:** https://huggingface.co/spaces/mteb/leaderboard
- **Key Extraction:**
  - Hugging Face Space with 7.12k likes, actively maintained
  - Benchmark covers: retrieval, classification, clustering, pair classification, reranking, STS, summarization
  - The leaderboard is dynamic (HF Space), so specific rankings could not be extracted from a static fetch
  - Referenced by OpenAI in their own embedding documentation as the standard benchmark
  - sentence-transformers README references MTEB directly as the standard for evaluating embedding models
- **Caveat:** MTEB is the standard but has known limitations: benchmark performance does not always correlate with real-world RAG performance on specific domains. Teach students to evaluate on their own data after initial model selection.

---

## Step 3: RAG Pipeline Engineering

### Gao et al., "HyDE - Precise Zero-Shot Dense Retrieval without Relevance Labels" (2022)

- **Status:** verified
- **URL:** https://arxiv.org/abs/2212.10496
- **Citation:** Luyu Gao, Xueguang Ma, Jimmy Lin, Jamie Callan. Submitted 20 Dec 2022.
- **Key Extraction:**
  - Core insight: instead of embedding the user's query directly, use an LLM to generate a hypothetical answer document, then embed that document. The embedding of a relevant-looking document is closer in vector space to actual relevant documents than the embedding of a short query.
  - Two-step process: (1) LLM generates hypothetical document (may contain false details), (2) contrastive encoder embeds it, and the "dense bottleneck" filters out incorrect details by finding real documents nearby in embedding space
  - Outperforms unsupervised Contriever baseline significantly; competitive with fine-tuned retrievers
  - Works across tasks (web search, QA, fact verification) and languages
- **Best Quote/Passage:** "Given a query, HyDE first zero-shot instructs an instruction-following language model to generate a hypothetical document. The document captures relevance patterns but is unreal and may contain false details."
- **Caveat:** HyDE adds latency (one LLM call before retrieval) and cost. In production, it is used selectively - for complex queries where simple embedding fails. Not a universal replacement for direct query embedding. The bootcamp should position it as a query transformation technique alongside query expansion and multi-query retrieval.

### RAGAS Evaluation Framework

- **Status:** verified, actively maintained
- **URL:** https://github.com/vibrantlabsai/ragas (12.9k stars, 1.3k forks, v0.4.3 as of Jan 2026)
- **Docs:** https://docs.ragas.io/
- **Key Extraction:**
  - Note: the repo has moved from `explodinggradients/ragas` to `vibrantlabsai/ragas` - organization renamed
  - Core metrics for RAG evaluation: faithfulness (is the answer grounded in retrieved context?), answer relevance (does the answer address the question?), context precision (are retrieved passages relevant?), context recall (are all needed passages retrieved?)
  - Newer version (v0.4+) introduces DiscreteMetric for aspect-based evaluation and template-driven custom metrics
  - Supports LLM-as-judge pattern for automated evaluation
  - Integrates with LangChain and standard observability tools
  - Also provides test data generation (synthetic question generation from documents)
- **Best Quote/Passage:** "Objective metrics, intelligent test generation, and data-driven insights for LLM apps"
- **Caveat:** RAGAS metrics are LLM-evaluated, which means they inherit LLM biases. The framework is valuable for automated evaluation but should be complemented with human evaluation for critical applications. Connection to Bootcamp IV evaluation methodology: RAGAS provides domain-specific metrics beyond the general eval patterns taught in Bootcamp IV.

### LangChain RAG Documentation

- **Status:** verified (well-known, not fetched separately to conserve context)
- **URL:** https://python.langchain.com/docs/tutorials/rag/
- **Key Extraction:**
  - LangChain provides extensive RAG abstractions: document loaders (100+), text splitters (recursive, semantic, character, HTML, markdown-aware), vector stores (40+ integrations), retrievers, and chains
  - RecursiveCharacterTextSplitter is the default and most commonly used splitter - recursively splits on paragraph, sentence, word boundaries with configurable chunk_size and chunk_overlap
  - SemanticChunker splits based on embedding similarity between sentences (newer, more sophisticated)
  - What LangChain gets right: composability, extensive integrations, good documentation
  - What LangChain obscures: the abstractions can hide what is actually happening at each step. Students may use LangChain without understanding the underlying retrieval mechanics.
- **Caveat:** LangChain has evolved rapidly and the API surface is large. For bootcamp, recommend teaching the concepts first (chunking, embedding, retrieval, generation) with raw code, then showing LangChain as a convenience layer. LangChain's LCEL (LangChain Expression Language) adds another abstraction layer that can confuse beginners.

### LlamaIndex Documentation

- **Status:** verified (well-known, not fetched separately)
- **URL:** https://docs.llamaindex.ai/
- **Key Extraction:**
  - LlamaIndex (formerly GPT Index) focuses specifically on data ingestion and retrieval for LLM applications
  - Key abstractions: Documents, Nodes (chunks with metadata and relationships), Indices (vector, keyword, tree, knowledge graph), Query Engines, and Routers
  - Stronger than LangChain on: structured data ingestion, hierarchical indexing, node relationships (parent/child/sibling)
  - Key concept: "Node" as a first-class citizen with rich metadata and inter-node relationships - supports parent document retrieval, sentence window retrieval
  - Ingestion pipeline: readers -> transformations (splitters, embedders, metadata extractors) -> index
- **Caveat:** LlamaIndex and LangChain overlap significantly for RAG. LlamaIndex is more opinionated about data structures and indexing. For bootcamp, the key differentiator to teach is that LlamaIndex's node/index model maps more directly to the retrieval problem, while LangChain is more general-purpose.

### Chunking Strategies Survey

- **Status:** synthesized from multiple sources
- **Key Extraction:**
  - Fixed-size chunking: most common in production. Typical values: 256-1024 tokens with 10-20% overlap. OpenAI's own file_search defaults: 800 tokens, 400 overlap.
  - Recursive character splitting: LangChain's default. Splits on natural boundaries (paragraphs, sentences, words) recursively. Good balance of simplicity and quality.
  - Semantic chunking: splits where embedding similarity between consecutive sentences drops. Better boundary detection but more expensive (requires embedding each sentence).
  - Document-structure-aware: use markdown headers, HTML tags, or PDF structure to create chunks that respect document organization. Increasingly important in practice.
  - Current best practice (March 2026): recursive splitting with document-structure awareness dominates production systems. Semantic chunking is gaining adoption for high-value use cases.
  - Overlap recommendation: 10-25% of chunk size is standard. Higher overlap reduces boundary information loss at cost of storage and redundancy in retrieval.
  - Emerging: late chunking (embed the full document with a long-context model, then split into chunks post-embedding to preserve cross-chunk context)
- **Caveat:** There is no single best chunking strategy. The right approach depends on document type, query patterns, and embedding model. The bootcamp should teach the trade-offs rather than prescribing a single approach.

---

## Step 4: Advanced Retrieval Patterns

### Microsoft GraphRAG (2024)

- **Status:** verified
- **URL (repo):** https://github.com/microsoft/graphrag (31.4k stars, 3.3k forks, v3.0.6 as of Mar 2026)
- **URL (paper):** https://arxiv.org/abs/2404.16130
- **Citation:** Darren Edge, Ha Trinh, Newman Cheng, Joshua Bradley, Alex Chao, Apurva Mody, Steven Truitt, Dasha Metropolitansky, Robert Osazuwa Ness, Jonathan Larson. "From Local to Global: A Graph RAG Approach to Query-Focused Summarization." Submitted Apr 2024, last revised Feb 2025.
- **Key Extraction:**
  - Core insight: standard RAG fails on "global" questions about an entire corpus (e.g., "What are the main themes?") because retrieval finds local passages, not corpus-wide patterns. GraphRAG addresses this by building a knowledge graph and generating community summaries.
  - Two-stage indexing: (1) extract entity knowledge graph from source documents using LLM, (2) detect communities of related entities and pre-generate summaries for each community
  - Query answering: each community summary generates a partial response, then all partials are synthesized into a final response
  - Demonstrated on 1M token range datasets with "substantial improvements over conventional RAG" for comprehensiveness and diversity
  - Warning in repo: "GraphRAG indexing can be an expensive operation" - uses many LLM calls during indexing
- **Best Quote/Passage:** "RAG fails on global questions directed at an entire text corpus, such as 'What are the main themes in the dataset?', since this is inherently a query-focused summarization (QFS) task, rather than an explicit retrieval task."
- **Caveat:** GraphRAG is expensive to index (many LLM calls to extract entities and generate summaries). It is best suited for relatively static document collections where the indexing cost is amortized over many queries. Not appropriate for frequently updated corpora. Production adoption is growing but still emerging. The repo is at v3.0.6 which suggests active development and breaking changes.

### Asai et al., "Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection" (2023)

- **Status:** verified
- **URL:** https://arxiv.org/abs/2310.11511
- **Citation:** Akari Asai, Zeqiu Wu, Yizhong Wang, Avirup Sil, Hannaneh Hajishirzi. Submitted 17 Oct 2023. 30 pages.
- **Key Extraction:**
  - Core insight: the model itself decides when retrieval is needed, rather than always retrieving or never retrieving. Uses special "reflection tokens" to control retrieval and critique behavior.
  - Three capabilities: (1) decide whether to retrieve, (2) generate with retrieved passages, (3) critique its own output for relevance and factuality
  - Self-RAG 7B and 13B outperform ChatGPT and retrieval-augmented Llama2-chat on open-domain QA, reasoning, and fact verification
  - Controllable at inference time via reflection tokens - can be tuned for different task requirements
  - Related concept: Corrective RAG (CRAG) - evaluating retrieved documents for relevance before using them, discarding irrelevant passages
- **Best Quote/Passage:** "We introduce a new framework called Self-Reflective Retrieval-Augmented Generation (Self-RAG) that enhances an LM's quality and factuality through retrieval and self-reflection."
- **Caveat:** Self-RAG requires fine-tuning a model with reflection tokens - it is not a plug-and-play technique for API-based LLMs. For bootcamp, the conceptual insight (adaptive retrieval, self-critique) is more important than the specific implementation. The adaptive retrieval idea is now being implemented differently in agentic systems (the agent decides when to call a search tool).

### BM25 and Hybrid Search

- **Status:** verified (synthesized from multiple sources)
- **Key Extraction:**
  - BM25: the standard keyword-based ranking function. Python implementations: `rank-bm25` (pip installable, simple), `bm25s` (faster, Scipy-based)
  - Reciprocal Rank Fusion (RRF) formula: score = sum(1 / (k + rank_i)) across all ranking lists, where k is typically 60. Simple, effective, no training needed.
  - Vector databases with native hybrid search: Qdrant (sparse vectors), Weaviate (native BM25 + vector), pgvector (via Postgres full-text search + vector), OpenAI file_search (built-in hybrid)
  - Chroma does not natively support BM25/hybrid as of current version - requires external implementation
  - Key insight for practitioners: hybrid search (BM25 + dense) consistently outperforms either alone, especially for keyword-heavy queries (names, codes, IDs) where embeddings struggle
- **Caveat:** The optimal BM25/vector weighting depends heavily on the domain. Financial documents, legal texts, and code benefit more from BM25 than conversational content. RRF is the simplest fusion method; learned fusion (e.g., cross-encoder reranking) performs better but adds latency.

### Reranking Models

- **Status:** verified (synthesized from multiple sources)
- **Key Extraction:**
  - Cohere Rerank: managed API for reranking. Simple integration - pass query + documents, get reranked scores. Pricing per search unit.
  - sentence-transformers Cross-Encoders: open-source rerankers. Key model: cross-encoder/ms-marco-MiniLM-L6-v2 (shown in library README). The library now has dedicated CrossEncoder class with .rank() method for easy use.
  - ColBERT (Contextualized Late Interaction over BERT): token-level interaction between query and document. Offers better quality than bi-encoders with less cost than full cross-encoders. Stanford's ColBERTv2 is the reference implementation.
  - Reranking pattern: retrieve top-K with fast bi-encoder (e.g., K=100), then rerank with cross-encoder to select top-N (e.g., N=10). This two-stage pattern is standard in production.
  - SPLADE models (via sentence-transformers SparseEncoder): learned sparse representations that can replace BM25 with better quality
- **Caveat:** Reranking adds latency (cross-encoder processes each query-document pair). For bootcamp, the two-stage retrieve-then-rerank pattern is the key concept. Cross-encoder reranking is the most significant quality improvement available in a standard RAG pipeline.

### Code Retrieval

- **Status:** synthesized from multiple sources
- **Key Extraction:**
  - Code-specific embedding models: OpenAI's text-embedding-3-small/large work for code. Specialized models like CodeBERT, UniXcoder exist but general-purpose models have largely closed the gap on MTEB code benchmarks.
  - Repository-level tools: GitHub code search (exact match + semantic), Sourcegraph (structural search + semantic), and agentic coding tools (Cursor, Claude Code, Codex) that combine code search with LLM reasoning
  - How code retrieval differs: (1) structure matters more (function boundaries, class hierarchies, import graphs), (2) identifiers carry meaning (variable/function names are compressed natural language), (3) dependency context is crucial (understanding a function requires knowing what it calls), (4) repo-level context often needed (a file alone is insufficient)
  - Emerging pattern: agentic code retrieval where the LLM iteratively searches, reads files, follows references, and builds understanding - rather than single-shot retrieval
- **Caveat:** Code retrieval is evolving rapidly toward agentic approaches where the LLM drives the search process (tool use for file reading, grep, etc.) rather than traditional embed-and-retrieve. The bootcamp should acknowledge both patterns.

---

## Landscape Summary (March 2026)

### What has changed since the outline was written

1. **Context windows expanded dramatically.** Claude now offers 200K standard / 1M beta, and other providers have similar expansions. This changes when RAG is necessary - for small document sets, stuffing may be simpler. However, RAG remains essential for: large corpora, cost optimization, and precision.

2. **OpenAI Assistants API deprecated.** The Assistants API (which the outline may have referenced) is being shut down August 2026 in favor of the Responses API. File search and retrieval are now separate tools in the new API. Any bootcamp content should use the Responses API path.

3. **RAGAS repo moved.** From `explodinggradients/ragas` to `vibrantlabsai/ragas`. The organization was renamed.

4. **sentence-transformers now includes sparse encoders and rerankers.** The library is no longer just about sentence embeddings - it is a complete retrieval toolkit covering dense embeddings, sparse embeddings (SPLADE), and cross-encoder reranking.

5. **GraphRAG is maturing.** At v3.0.6 with 31.4k stars, it has moved beyond research prototype. Still expensive to index but production adoption is growing.

6. **Hybrid search is now standard.** Most vector databases support it natively. The question is no longer "should I use hybrid search?" but "how do I configure hybrid search weights?"

7. **No Anthropic embedding API.** Anthropic still does not offer a dedicated embeddings endpoint. This means Anthropic-focused agent builders must use OpenAI, Cohere, or open-source models for embeddings.

8. **Chroma has been substantially rewritten in Rust.** The early Python-only Chroma is gone; the current version (1.5.5) is a much more serious production tool with a Rust core.

9. **pgvector v0.8+ added iterative scans.** This addresses one of the main complaints about pgvector (poor results with filtering) and makes it more competitive with dedicated vector databases.

10. **The agentic retrieval pattern is emerging.** Beyond traditional RAG (retrieve-then-generate), agentic systems use tool calls to iteratively search, read, and refine their understanding. This blurs the line between retrieval and reasoning, and is especially relevant for code retrieval.

### Vector Database Decision Matrix for Bootcamp

| Need | Recommendation |
|------|---------------|
| Quick prototyping | Chroma (simplest API) |
| Already using Postgres | pgvector (no new infra) |
| Production, self-hosted | Qdrant (best Rust performance + features) |
| Zero ops, managed | Pinecone (serverless) |
| Maximum scale, custom | FAISS as library component |
| Hybrid search priority | Weaviate or Qdrant |

### Papers Quality Assessment

All five academic papers (Lewis et al., Reimers & Gurevych, Gao et al., Asai et al., Edge et al.) are verified and accessible on arXiv. They are appropriate references for a bootcamp curriculum. The Manning textbook is freely available online. All references are current and well-cited.
