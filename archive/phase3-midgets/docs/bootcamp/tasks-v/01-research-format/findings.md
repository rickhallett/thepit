# Bootcamp V Format and Conventions - Research Findings

**Task:** 01-research-format
**Date:** 2026-03-10
**Input:** Bootcamp I steps (01, 03, 08 as exemplars), README.md, existing BC-II format
findings (`docs/bootcamp/tasks/01-research-format/findings.md`), Bootcamp V outline
**Purpose:** Prime context for write-task agents producing Bootcamp V steps.
A write-task agent loading this file should be able to produce structurally
consistent output without reading the original Bootcamp I exemplars.

---

## 1. Confirmed Document Structure Template

The BC-II format analysis (828 lines) was verified against the Bootcamp I exemplars.
The template is stable. No drift detected. The following is the confirmed template,
carried forward with Bootcamp V annotations where conventions need extension.

### 1.1 Header Block

Use Pattern B (11 of 12 Bootcamp I steps use this):

```markdown
# Step N: Title - Subtitle

**Estimated time:** Xh
**Prerequisites:** Step M (topic), Step K (topic)
**Leads to:** Step P (topic)

---
```

Metadata fields:

| Field | Required | Notes |
|-------|----------|-------|
| Estimated time | Yes | Single value ("4 hours") or range ("4-5 hours") |
| Prerequisites | Yes | Step numbers with parenthetical topics. For BCV, include cross-bootcamp refs (see Section 4) |
| Leads to | Recommended | Present when the step has clear downstream dependencies |
| You will need | **New for BCV** | Required when the step needs specific tools/APIs (see Section 3) |

**BCV addition: `You will need` field.** Bootcamp I steps operate on the bare Linux
environment and rarely need tool installation. BCV steps require embedding APIs, vector
databases, and tracing frameworks. Add this field when non-obvious tooling is required.

Example:

```markdown
**You will need:** Python 3.10+, an OpenAI API key (or sentence-transformers for local
embeddings), Chroma (`uv pip install chromadb`). See Tool Setup below.
```

### 1.2 Section Ordering

Canonical order, confirmed from BC-II analysis with BCV additions marked:

```
1. # Step N: Title - Subtitle
2. (metadata block including "You will need" if applicable)
3. ---
4. ## Why This Step Exists                    [REQUIRED]
5. ---
6. ## Table of Contents                       [REQUIRED]
7. ---
8. ## Tool Setup                              [BCV: REQUIRED when tools needed]
9. ---
10. ## 1. First Content Section (~time)       [REQUIRED, numbered]
11. ## 2. Second Content Section (~time)
12. ... (numbered content sections)
13. ## Challenge: Title                        [REQUIRED, 4-6 challenges]
14. ## Key Takeaways                           [RECOMMENDED]
15. ## Recommended Reading / References        [RECOMMENDED]
16. ## What to Read Next                       [RECOMMENDED]
```

Minimum closing sections: at least two of {Key Takeaways, References, What to Read Next}.

### 1.3 Horizontal Rule Placement

Rules (`---`) appear:
- After the header metadata block
- After the "Why" section
- After the Table of Contents
- After Tool Setup (if present)
- Between each numbered H2 content section
- Between each challenge section

They do NOT appear within a content section (between H3 subsections).

---

## 2. Bootcamp V-Specific Convention Proposals

### 2.1 Exercise Format Adjustment

**Problem:** Bootcamp I exercises are conceptual (explore /proc, trace syscalls, create
zombies). BCV exercises are implementation-heavy (build RAG pipelines, deploy vector
databases, implement tracing). The challenge format needs to accommodate setup,
dependencies, and environment requirements.

**Proposal:** Extend the challenge format with three new optional fields: `Prerequisites`,
`Environment`, and `Fallback`. These appear between the time estimate and the goal
statement.

BCV challenge format:

```markdown
## Challenge: Build a Semantic Search Index

**Estimated time: 25 minutes**

**Prerequisites:** Completed Tool Setup section. OpenAI API key configured in
environment, or sentence-transformers installed for local embeddings.

**Goal:** Build a semantic search over the project's slopodar entries using
embeddings and cosine similarity.

[Setup code block]

[Step-by-step instructions with code blocks]

**Fallback:** If no API key is available, use sentence-transformers with the
`all-MiniLM-L6-v2` model (runs locally, no API required):

```python
from sentence_transformers import SentenceTransformer
model = SentenceTransformer('all-MiniLM-L6-v2')
embeddings = model.encode(texts)
```

**Verification:** [How to confirm success]

<details>
<summary>Hints</summary>
[Optional hints or solution]
</details>

**Extension:** [Optional harder follow-up]
```

**Rationale:** BCV exercises have real external dependencies (API keys, installed
packages, running services). The fallback ensures the exercise is completable even
without API access. Bootcamp I exercises never need this because the subject IS the
execution stack - bash, /proc, and the kernel are always available.

### 2.2 Tool Setup Section

**Problem:** BCV topics have significant tooling dependencies. Unlike Bootcamp I (where
`strace`, `lsof`, and `ss` are pre-installed or one `pacman`/`apt` away), BCV requires
vector databases, embedding APIs, tracing frameworks, and Python libraries.

**Proposal:** Add a `## Tool Setup` section after the Table of Contents and before the
first content section. This section:

1. Lists all tools needed for the step
2. Provides installation commands (using `uv` per SD-310)
3. Includes a verification command for each tool
4. Notes which tools are required vs optional
5. Provides local alternatives for API-dependent tools

Example:

```markdown
## Tool Setup

*This section covers installation and verification. Skip tools you already have.*

### Required

```bash
# Chroma vector database
uv pip install chromadb

# Verify
python3 -c "import chromadb; print(f'Chroma {chromadb.__version__}')"
```

### API Keys (one required)

**Option A - OpenAI embeddings (recommended for exercises):**

```bash
# Set API key (add to ~/.bashrc for persistence)
export OPENAI_API_KEY="sk-..."

# Verify
python3 -c "
from openai import OpenAI
client = OpenAI()
r = client.embeddings.create(input='test', model='text-embedding-3-small')
printf_msg = f'Embedding dimension: {len(r.data[0].embedding)}'
print(printf_msg)
"
```

**Option B - Local embeddings (no API key needed):**

```bash
# sentence-transformers (downloads model on first use, ~100MB)
uv pip install sentence-transformers

# Verify
python3 -c "
from sentence_transformers import SentenceTransformer
model = SentenceTransformer('all-MiniLM-L6-v2')
e = model.encode(['test'])
print(f'Embedding dimension: {e.shape[1]}')
"
```
```

**Placement:** After Table of Contents, before first numbered content section. Not
numbered (it is setup, not learning content). Not included in the Table of Contents
time estimates.

### 2.3 Field vs Novel Sections

**Problem:** The BCV outline includes `Field vs Novel` subsections for every step. These
distinguish between established knowledge available in existing resources and novel
contributions from the project. Should these become a standard blockquote type or remain
as subsections?

**Proposal:** Introduce a new blockquote type: `> **FIELD VS NOVEL:**`. Do NOT use
subsections. The blockquote format is consistent with existing conventions (AGENTIC
GROUNDING, HISTORY) and integrates naturally into the content flow.

Format:

```markdown
> **FIELD VS NOVEL:** RAG fundamentals (Lewis et al. 2020) and information retrieval
> metrics (Manning et al. 2008) are well-established. The novel contribution here is
> the explicit connection to context engineering vocabulary: RAG failure as cold context
> pressure (the model falls back to pattern-matching from training data), outdated
> indices as stale reference propagation (the same failure mode as a stale AGENTS.md,
> but automated), and the Denning working set applied to retrieval - RAG's job is to
> construct the minimum context for correct output.
```

**Rules:**
- Always a blockquote (`>` prefix)
- Opens with `> **FIELD VS NOVEL:**` (bold label, colon, space)
- 3-6 sentences
- Names specific papers, authors, or documentation for the "field" portion
- Names specific project concepts, standing orders, or artifacts for the "novel" portion
- Appears once per major content section (after the agentic grounding blockquote or at
  the end of a section that introduces novel framing)

**Frequency target:** 3-5 per step. Not every section warrants one - only sections where
the distinction between established and novel is load-bearing.

**Rationale:** The field maturity distinction is a quality signal unique to BCV. It tells
the reader: "you can find this elsewhere" vs "this framing is specific to this project."
This matters for credibility (not claiming established knowledge as novel) and for
learning (pointing the reader to canonical sources for established material).

### 2.4 Field Maturity Marker in Header

**Problem:** The BCV outline specifies field maturity per step (ESTABLISHED, EMERGING,
FRONTIER). Should each step include this in the header metadata?

**Proposal:** Yes. Add `**Field maturity:**` to the header block for BCV steps.

```markdown
# Step 4: Advanced Retrieval Patterns

**Estimated time:** 4-5h
**Field maturity:** Emerging
**Prerequisites:** Step 3 (RAG pipeline engineering)
**Leads to:** Step 7 (observability), Step 9 (production patterns)
**You will need:** Python 3.10+, Chroma, sentence-transformers (for cross-encoder
reranking), rank-bm25 (`uv pip install rank-bm25`)

---
```

This is BCV-specific. Bootcamp I does not need it because all topics are foundational
(process model, shell, filesystem - all ESTABLISHED for decades).

---

## 3. Exercise Format Proposal for Infrastructure Topics

### 3.1 The Core Problem

Bootcamp I exercises operate on the local system. The subject IS the execution stack:

```markdown
## Challenge: Explore /proc/self

*Estimated time: 10 minutes*

Write a sequence of commands that discovers the following about your current shell
process, using only `/proc/self/` and standard tools:
```

No setup. No API keys. No package installation. The commands work on any Linux system.

BCV exercises require external services, installed packages, and API access:

```markdown
## Challenge: Build a Semantic Search Index

**Estimated time: 25 minutes**

Embed 100 text chunks using OpenAI's API. Store in both numpy (in-memory) and
Chroma. Query both with the same 10 queries.
```

This needs: OpenAI API key, `chromadb` installed, `numpy` installed, network access.
If any of these are missing, the exercise is blocked.

### 3.2 The Three-Layer Solution

**Layer 1: Tool Setup section** (step-level, covered in Section 2.2 above)

Installs and verifies all tools once at the top of the step. The learner completes
this before starting content sections.

**Layer 2: Per-exercise prerequisites** (exercise-level)

Each exercise states its specific requirements as a `**Prerequisites:**` line:

```markdown
**Prerequisites:** Completed Tool Setup. At least 100 text chunks available (the
bootcamp documentation files work - 12 markdown files, ~20k lines total).
```

This is NOT a repeat of the Tool Setup section. It states what specific state must
exist from prior exercises or content sections.

**Layer 3: Fallback alternatives** (exercise-level)

Each exercise that depends on an API or external service provides a local fallback:

```markdown
**Fallback:** If no OpenAI API key is available, use sentence-transformers with
`all-MiniLM-L6-v2` (local, no API):

```python
from sentence_transformers import SentenceTransformer
model = SentenceTransformer('all-MiniLM-L6-v2')
embeddings = model.encode(texts)
```

The exercise works identically - only the embedding source changes.
```

### 3.3 Fallback Strategy by Dependency Type

| Dependency | Primary | Fallback | Notes |
|-----------|---------|----------|-------|
| Embedding API (OpenAI) | `openai` library + API key | `sentence-transformers` local model | Always provide local alternative |
| Vector database (Chroma) | Chroma server | Chroma in-memory (ephemeral) | Chroma works in-memory by default |
| Vector database (pgvector) | Postgres + pgvector | Chroma or numpy cosine similarity | Not all learners have Postgres |
| Tracing framework (Arize) | Arize Phoenix server | Custom JSONL logging | Always provide JSONL fallback |
| LLM API (Claude/GPT) | API call | Pre-recorded responses (fixtures) | For exercises testing orchestration, not generation |
| DuckDB | `duckdb` library | pandas (less elegant but functional) | DuckDB is pip-installable, fallback rarely needed |

### 3.4 Exercise Complexity Calibration

BCV exercises are more complex than BCI exercises. Calibrate:

| BCI exercise | Time | Complexity | Setup |
|-------------|------|-----------|-------|
| Explore /proc/self | 10 min | Read and interpret | None |
| Build a pipe by hand | 15 min | Write Python, observe | None |
| Signal handling | 15 min | Write bash, send signals | None |

| BCV exercise | Time | Complexity | Setup |
|-------------|------|-----------|-------|
| Information need analysis | 15 min | Classify scenarios | None |
| Naive RAG walkthrough | 20 min | Manual simulation | None |
| Build semantic search | 25 min | Write Python, call API, query | Tool Setup + API key |
| Compare chunking strategies | 30 min | Build pipeline, measure metrics | Prior exercise output |

BCV exercises should still target 10-30 minutes each, but allow up to 30 minutes for
exercises with significant setup or measurement components. Total challenge time per
step: 60-120 minutes (vs 60-90 for BCI).

---

## 4. Cross-Bootcamp Reference Format Recommendation

### 4.1 The Problem

Bootcamp V references Bootcamps I-IV heavily. The BCV outline uses varied reference
formats:

- "Bootcamp II Step 4 (context engineering)"
- "Bootcamp I Step 3 (filesystem as state)"
- "Bootcamp I Step 9 (containers)"
- "Bootcamp III Step 3 (SQL/DuckDB)"
- "Bootcamp IV Steps 1-4 (evaluation)"

These are readable but inconsistent. Some include parenthetical topics, some do not.
Some reference step ranges.

### 4.2 Recommendation

Use the format: **Bootcamp N Step M (topic)** for all cross-bootcamp references.
Do not abbreviate to "BC-N" or "BCV" in the step prose. Abbreviations reduce
readability for someone reading one step in isolation.

Rules:

1. Always include the parenthetical topic: `Bootcamp I Step 3 (filesystem as state)`,
   never just `Bootcamp I Step 3`
2. For ranges: `Bootcamp IV Steps 1-4 (evaluation methodology)`
3. For multiple from same bootcamp: `Bootcamp II Steps 2 (agent architecture) and 5
   (tool design)`
4. Bold on first reference in a step: **Bootcamp I Step 3 (filesystem as state)**
5. Plain text on subsequent references: Bootcamp I Step 3

Within the same bootcamp (BCV referencing other BCV steps), use just `Step N (topic)`:
`Step 2 (embeddings and vector search)`.

### 4.3 When to Reference vs When to Repeat

**Reference (link to prior bootcamp):** When the concept is fully covered elsewhere
and the reader needs the full treatment.

```markdown
The working set concept (introduced in **Bootcamp II Step 4 (context engineering)**,
from Denning 1968) applies directly to retrieval...
```

**Repeat with attribution:** When the concept needs a brief restatement for the
current context to be self-contained.

```markdown
Cold context pressure - too little context pushes the model to pattern-match from
training data instead of solving from the provided information (see Bootcamp II
Step 4 for the full context engineering vocabulary) - is exactly what happens when
retrieval fails.
```

**Never repeat without attribution.** If a concept was defined in a prior bootcamp,
always cite the source. This prevents the impression that the concept is novel to BCV.

### 4.4 Internal References within BCV

Within BCV, use the `Step N (topic)` format for forward and backward references:

```markdown
The retrieval quality metrics from Step 1 (the retrieval problem) apply directly here.
Step 7 (observability) covers how to monitor these metrics in production.
```

### 4.5 File-Level References

When referencing specific project files (for worked examples), use the existing
convention from Bootcamp I:

```markdown
- The Makefile uses `git write-tree` to compute a tree hash (Makefile:38)
- The POLECAT wrapper uses `git rev-parse HEAD` (Makefile:53-71)
- The boot sequence (AGENTS.md, filesystem awareness section)
```

Format: `filename:line` or `filename:line-range` for specific lines, plain filename
for general references.

---

## 5. Blockquote Types - Complete Registry for BCV

| Type | Marker | Purpose | Frequency per step | Source |
|------|--------|---------|-------------------|--------|
| Agentic grounding | `> **AGENTIC GROUNDING:**` | Connect to agentic engineering practice | 6-8 | BCI convention |
| History | `> **HISTORY:**` | Historical context with structural insight | 2-4 | BCI convention |
| Field maturity | `> **FIELD MATURITY:**` | Maturity assessment of a specific technique | 0-2 | BC-II convention |
| Slopodar | `> **SLOPODAR:**` | Anti-pattern connection | 0-2 | BC-II convention |
| Field vs Novel | `> **FIELD VS NOVEL:**` | Distinguish established from novel material | 3-5 | **New for BCV** |

All blockquote types follow the same structural rules:
- Always a blockquote (`>` prefix on every line)
- Opens with `> **LABEL:**` (bold label, colon, space)
- 2-6 sentences (HISTORY may go to 8)
- Concrete and specific, never generic
- One concept per blockquote

---

## 6. Target Metrics for BCV Steps

Carried forward from BC-II analysis, adjusted for BCV characteristics:

### 6.1 Lines Per Step

BCV steps include Tool Setup sections and more complex exercises. Target range is
slightly higher than BCI:

| Statistic | BCI Value | BCV Target |
|-----------|-----------|------------|
| Minimum | 1,240 | 1,200 |
| Maximum | 2,283 | 2,000 |
| Target range | 1,300-1,600 | 1,300-1,800 |

The upper bound is higher because Tool Setup and Fallback sections add ~100-150 lines.

### 6.2 Sections Per Step

| Component | BCI Target | BCV Target | Notes |
|-----------|-----------|------------|-------|
| Total ## headings | 15-20 | 15-22 | Tool Setup adds 1 |
| Numbered content sections | 7-9 | 7-9 | Same |
| Challenge sections | 6 | 4-6 | Slightly fewer, each more complex |
| Closing sections | 2-3 | 2-3 | Same |

### 6.3 Code Blocks Per Step

BCV steps are implementation-heavy. More code blocks are expected:

| Statistic | BCI Target | BCV Target |
|-----------|-----------|------------|
| Range | 40-70 | 45-80 |
| Median target | ~57 | ~65 |

The increase comes from Tool Setup verification commands, exercise code, and
fallback alternatives.

### 6.4 Blockquotes Per Step

| Type | BCI Target | BCV Target |
|------|-----------|------------|
| AGENTIC GROUNDING | 6-8 | 6-8 |
| HISTORY | 2-4 | 1-3 |
| FIELD VS NOVEL | n/a | 3-5 |
| FIELD MATURITY | 0 | 0-2 |
| SLOPODAR | 0 | 0-2 |

HISTORY count is lower for BCV because many topics are too recent (2020-2024) for
historical narrative. FIELD VS NOVEL fills the gap with a different kind of context.

---

## 7. Voice and Quality Bar (Confirmed, No Changes)

The BC-II analysis voice section (Section 3) applies without modification. Key
rules restated for completeness:

- **Direct.** No hedging, no "it should be noted that", no "let's explore."
- **Technical.** Uses data structure names, protocol terms, API specifics.
- **No filler.** Every sentence explains a mechanism, provides an example, or connects
  to the agentic context.
- **Declarative, not instructional.** "An embedding is a dense vector" not "You should
  know that an embedding is a dense vector."
- **Corrective where appropriate.** Opens by correcting shallow understanding.
- **No em-dashes.** Use " - " (space hyphen space).
- **No emojis.** None, ever. SD-319, permanent.
- **`printf` not `echo`** in all bash code examples. Standing order from CLAUDE.md.
- **2 spaces indentation** in code blocks.
- **`uv`** for all Python package installation. SD-310, permanent.

### BCV Depth Calibration

BCV topics are at a different abstraction layer than BCI. The depth target adjusts:

- **BCI depth:** Kernel data structures, syscalls, POSIX specification.
  Example: "A pipe is a unidirectional byte stream with a kernel-managed buffer."

- **BCV depth:** Architecture, data flow, failure modes, tradeoffs.
  Example: "An embedding is a learned mapping from text to a fixed-dimensional vector
  space where cosine similarity approximates semantic similarity. The mapping is not
  lossless - two texts can have identical embeddings (collision) or dissimilar embeddings
  despite related meaning (vocabulary mismatch). The choice of embedding model determines
  which similarities are preserved and which are lost."

The pattern: name the mechanism, state what it preserves and what it loses, connect to
a practical failure mode.

---

## 8. Complete Step Template for BCV

Copy this skeleton for new BCV steps. Fill in bracketed sections. BCV-specific additions
marked with `[BCV]`.

```markdown
# Step N: Title - Subtitle

**Estimated time:** Xh
**Field maturity:** Established | Emerging | Frontier              [BCV]
**Prerequisites:** Step M (topic), Bootcamp K Step J (topic)
**Leads to:** Step P (topic)
**You will need:** [tools, APIs, libraries - if applicable]        [BCV]

---

## Why This Step Exists

[3-5 paragraphs. Open with declarative relevance statement. Reference specific
agent failure modes. Connect to project practices where applicable. State the
goal in one sentence at the end.]

---

## Table of Contents

1. [First Topic](#1-first-topic) (~NN min)
2. [Second Topic](#2-second-topic) (~NN min)
...
N. [Challenges](#challenges) (~60-120 min)
N+1. [What to Read Next](#what-to-read-next)

---

## Tool Setup                                                      [BCV]

*This section covers installation and verification. Skip tools you already have.*

### Required

```bash
# Tool name and purpose
uv pip install toolname

# Verify
python3 -c "import tool; print(tool.__version__)"
```

### API Keys (if applicable)

**Option A - API-based (recommended):**
[Installation and verification]

**Option B - Local alternative (no API key needed):**
[Installation and verification]

---

## 1. First Topic

*Estimated time: NN minutes*

[Opening paragraph - what the concept IS. Correct shallow understanding if needed.
Go to the architecture/data-flow/tradeoff level.]

### Subsection A

[Mechanism - how it works. Data flow, architecture, algorithms.]

```python
# Concrete, runnable example
# Uses uv-installed packages from Tool Setup
```

[Explanation of what the code demonstrates.]

> **FIELD VS NOVEL:** [Established sources for this concept. Novel framing       [BCV]
> or connection from this project. 3-6 sentences.]

> **AGENTIC GROUNDING:** [Specific agent failure mode this equips the learner
> to diagnose. 2-5 sentences.]

---

## 2. Second Topic

*Estimated time: NN minutes*

[Same pattern: concept -> mechanism -> example -> grounding]

---

[... more content sections, target 7-9 total ...]

---

## Challenge: Descriptive Name

**Estimated time: NN minutes**

**Prerequisites:** [What must be completed first]                   [BCV]

**Goal:** [Single sentence stating what the reader will build or demonstrate.]

[Setup code block if needed]

[Step-by-step instructions with code blocks]

**Fallback:** [Alternative if API/tool unavailable]                 [BCV]

**Verification:** [How to confirm success]

<details>
<summary>Hints</summary>

[Optional hints or solution]

</details>

**Extension:** [Optional harder follow-up]

---

[... more challenges, target 4-6 total ...]

---

## Key Takeaways

Before moving on, verify you can answer these questions without looking anything up:

1. [Self-test question about core concept]
2. [Self-test question about mechanism/architecture]
...
8-10. [Self-test question connecting to agentic context]

---

## Recommended Reading

- **Paper/Book Title** - Author (year). [Brief annotation of relevance.]
- **Documentation:** [Provider docs URL and what to read there.]

---

## What to Read Next

**Step P: Title** - [One sentence reframe. Topics covered. Connection back to
concepts from this step that compose into the next.]
```

---

## 9. Anti-Patterns to Avoid (Extended for BCV)

Carried forward from BC-II analysis (items 1-10), with BCV-specific additions:

1. **No "gentle introduction" padding.** Open with what the concept IS.
2. **No CLI-level-only explanation.** Explain the mechanism underneath.
3. **No toy examples.** Use real system operations, real data, real APIs.
4. **No abstract agentic grounding.** Name the specific failure mode.
5. **No decorative history.** Explain WHY the design exists.
6. **No missing Why section.**
7. **No missing verification in challenges.**
8. **No em-dashes, no emojis.** SD-319, permanent.
9. **No `echo` in code examples.** Use `printf`. Standing order.
10. **No untagged code blocks.** Every fenced block gets a language tag.
11. **No exercises without fallbacks.** [BCV] Every exercise that depends on an API
    or external service must provide a local alternative.
12. **No unexplained tool installation.** [BCV] Do not drop `pip install X` in the
    middle of an exercise. All installation goes in Tool Setup. Use `uv`, not `pip`.
13. **No framework worship.** [BCV] "Use LangChain's retriever" is not an explanation.
    Show the mechanism, then optionally mention the framework abstraction.
14. **No novel claims on established knowledge.** [BCV] If Lewis et al. (2020) defined
    RAG, cite them. The novel contribution is the context engineering vocabulary
    connection, not RAG itself.
