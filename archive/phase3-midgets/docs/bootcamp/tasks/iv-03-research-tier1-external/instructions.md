# Task IV-03: Research - Tier 1 External References (Steps 1-3)

**Type:** Research (read-only, web fetch)
**Parallelizable with:** Tasks IV-01, IV-02, IV-04, IV-05, IV-06
**Blocks:** Tasks IV-07, IV-08, IV-09 (write tasks for Steps 1-3)
**Output:** `docs/bootcamp/tasks/iv-03-research-tier1-external/findings.md`

---

## Objective

Research and verify external references cited in Steps 1-3 of the Bootcamp IV outline.
These are the foundations tier - measurement epistemology, dataset design, and scoring
methods. Field maturity ranges from ESTABLISHED (Step 2) to EMERGING (Steps 1, 3).

## Step 1 References to Research

**Topic:** What evaluations actually measure (epistemology of evals)

1. **Anthropic, "Challenges in evaluating AI systems" (Oct 2023)**
   - Verify paper exists, get correct URL/citation
   - Extract: the measurement challenges taxonomy (construct validity, content
     contamination, saturation, evaluator's regress)
   - Key quotes about MMLU formatting sensitivity (5% accuracy swing)
   - The distinction between benchmark performance and real-world utility
   - This is the PRIMARY reference for Step 1

2. **Messick, "Validity" (1989)**
   - Verify correct citation (chapter in "Educational Measurement", 3rd edition,
     Robert L. Linn, editor)
   - Extract: the construct validity framework - what it means for a test to
     measure what it claims to measure
   - How this psychometric concept applies to LLM evaluation

3. **Goodhart, "Problems of Monetary Management" (1984)**
   - Verify correct citation
   - Extract: the original Goodhart's law formulation
   - How this applies to LLM benchmark optimisation (models optimised for benchmarks
     vs models optimised for real-world utility)

4. **HELM (Holistic Evaluation of Language Models)**
   - Current state of HELM project, URL
   - Extract: cross-lab comparison challenges, the "prompt format matters" finding
   - How HELM illustrates construct validity problems

5. **General research:**
   - Current state of MMLU saturation (as of early 2026, are models at ceiling?)
   - Dynamic benchmarks - which ones exist? LiveBench, Chatbot Arena, others?
   - Content contamination detection methods - any published tools or techniques?
   - The Cohen's kappa metric - standard reference for inter-rater reliability
   - Sensitivity vs specificity in medical diagnostics literature (for analogy to
     eval false positives/false negatives)

## Step 2 References to Research

**Topic:** Designing eval datasets and success criteria

1. **Anthropic eval documentation (success criteria framework)**
   - Verify current URL
   - Extract: the specific, measurable, achievable, relevant framework
   - Multidimensional criteria examples
   - Dataset construction guidance

2. **OpenAI evals cookbook**
   - Verify current URL (cookbook.openai.com or similar)
   - Extract: dataset construction patterns, JSONL format, example eval datasets
   - Best practices for edge case design

3. **Anthropic BBQ (Bias Benchmark for QA)**
   - Verify paper/dataset exists
   - Extract: the ~2 person-years construction cost (referenced in outline as evidence
     that dataset construction is the hardest part)
   - What BBQ tests, how it was constructed

4. **General research:**
   - Synthetic eval data generation - current best practices, when it helps vs hurts
   - Dataset versioning approaches - DVC, Git LFS, plain git for small datasets
   - The JSONL format as used by OpenAI evals and Inspect AI - schema documentation
   - Held-out test set practices specific to LLM evaluation

## Step 3 References to Research

**Topic:** Scoring and grading methods

1. **Anthropic eval documentation (grading hierarchy)**
   - Verify current URL
   - Extract: the code-based > LLM-based > human grading hierarchy
   - Best practices for LLM-as-judge (rubric design, chain-of-thought grading,
     different model for grading than generation)

2. **OpenAI evals (model-graded templates)**
   - Verify current state of the oai/evals repo
   - Extract: template structure for model-graded evaluations
   - How templates handle rubric specification

3. **LMSYS Chatbot Arena**
   - Verify current URL and methodology
   - Extract: how human preference evaluation works at scale
   - The Elo rating system for model comparison
   - What Arena reveals about human evaluation reliability

4. **Inspect AI Scorers API**
   - Verify current documentation URL
   - Extract: built-in scorers (exact, includes, model_graded_fact, model_graded_qa)
   - Custom scorer implementation pattern
   - How scorers compose

5. **General research:**
   - LLM-as-judge failure modes - position bias, verbosity bias, self-preference.
     Any published research quantifying these biases?
   - BLEU, ROUGE-L - standard NLP references for these metrics. When each is
     appropriate vs inappropriate for LLM output evaluation
   - Embedding-based similarity (cosine similarity) for eval scoring - current
     best practices
   - Calibrating graders - any published methodology for validating LLM-as-judge
     accuracy?

## Output Format

For each reference:
```
### [Reference Name]
- **Status:** verified/not-found/moved/outdated
- **URL/Citation:** (current URL or full academic citation)
- **Key Extraction:** (2-5 bullet points of what's pedagogically useful)
- **Best Quote/Passage:** (if applicable, suitable for citation in step content)
- **Caveat:** (anything changed since outline was written)
```

Group by step. Flag any references that cannot be verified or have moved.
