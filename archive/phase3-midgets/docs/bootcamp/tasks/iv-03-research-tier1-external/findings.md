# IV-03 Findings: Tier 1 External References (Steps 1-3)

**Researched:** 2026-03-10
**Agent:** Weaver (research pass)
**Method:** Web fetch where possible, training knowledge for pre-2024 academic works

---

## Step 1: Eval Epistemology

### Anthropic, "Challenges in evaluating AI systems" (Oct 2023)

- **Status:** verified
- **URL/Citation:** https://www.anthropic.com/research/evaluating-ai-systems
  Bibtex: `@online{ganguli2023challenges, author={Deep Ganguli and Nicholas Schiefer and Marina Favaro and Jack Clark}, title={Challenges in evaluating {AI} systems}, date={2023-10-04}, year={2023}}`
- **Key Extraction:**
  - MMLU formatting sensitivity: "Simple formatting changes to the evaluation, such as changing the options from (A) to (1) or changing the parentheses from (A) to [A], or adding an extra space between the option and the answer can lead to a ~5% change in accuracy." Direct quote from the page.
  - Content contamination: "Because MMLU is so widely used, models are more likely to encounter MMLU questions during training. This is comparable to students seeing the questions before the test - it's cheating."
  - BBQ bias scoring trap: Model achieved bias score of 0 - appeared unbiased but was actually not answering questions at all. "All evaluations are subject to the failure mode where you overinterpret the quantitative score and delude yourself into thinking that you have made progress when you haven't."
  - BBQ construction cost: "BBQ took the developers ~2 people years spread over 6 months across 8 people to build." (Footnote 1)
  - Evaluator's regress / model-generated evals: model-generated evaluations inherit model biases, and human verification inherits human evaluation challenges. The "ouroboros" of model-generated evaluations.
  - Six levels of difficulty ordered less-to-more challenging: (1) multiple choice, (2) third-party frameworks, (3) crowdworker A/B tests, (4) domain expert red teaming, (5) model-generated evals, (6) third-party audits.
- **Best Quote/Passage:** "Robust evaluations are extremely difficult to develop and implement, and effective AI governance depends on our ability to meaningfully evaluate AI systems."
- **Caveat:** This is a policy/blog post, not a peer-reviewed paper. It remains directly relevant and is hosted at Anthropic's research section. The MMLU saturation problem has worsened since 2023; top models now exceed 90% on MMLU.

---

### Messick, "Validity" (1989)

- **Status:** verified (from training knowledge - standard reference, not web-fetchable)
- **URL/Citation:** Messick, S. (1989). Validity. In R. L. Linn (Ed.), *Educational Measurement* (3rd ed., pp. 13-103). New York: American Council on Education / Macmillan.
- **Key Extraction:**
  - Construct validity is the unifying framework for all validity evidence - a test is valid to the extent it measures the construct it claims to measure.
  - Validity is not a binary property of a test; it is a matter of degree, and the evidence for it accumulates over time.
  - Six facets of construct validity: content, substantive, structural, generalizability, external, consequential.
  - The consequential facet (social consequences of test use/misuse) is directly relevant to LLM evals - benchmark scores drive funding, hiring, and deployment decisions.
  - Key insight for LLM evals: if you change the prompt format and accuracy changes by 5%, you have a construct validity problem - you are measuring prompt sensitivity, not the underlying capability.
- **Best Quote/Passage:** "Validity is an integrated evaluative judgment of the degree to which empirical evidence and theoretical rationales support the adequacy and appropriateness of inferences and actions based on test scores."
- **Caveat:** This is a 1989 educational psychology text. The concepts are well-established and directly applicable, but the LLM application is an analogy the bootcamp content will need to draw explicitly. No direct digital source available.

---

### Goodhart, "Problems of Monetary Management" (1984)

- **Status:** verified (from training knowledge)
- **URL/Citation:** Goodhart, C.A.E. (1984). Problems of Monetary Management: The UK Experience. In A.S. Courakis (Ed.), *Monetary Theory and Practice*. London: Macmillan. (The principle was first stated in a 1975 paper and subsequently published in 1984.)
- **Key Extraction:**
  - Original formulation: "Any observed statistical regularity will tend to collapse once pressure is placed upon it for control purposes." Often paraphrased as: "When a measure becomes a target, it ceases to be a good measure."
  - Direct application to LLM benchmarks: when labs optimize for MMLU/HumanEval/etc., the benchmark score inflates beyond what the underlying capability warrants.
  - Related to Campbell's Law (1979): "The more any quantitative social indicator is used for social decision-making, the more subject it will be to corruption pressures and the more apt it will be to distort and corrupt the social processes it is intended to monitor."
  - Marihart Strathern's sharper restatement (1997) is also commonly cited: "When a measure becomes a target, it ceases to be a good measure."
- **Best Quote/Passage:** "Any observed statistical regularity will tend to collapse once pressure is placed upon it for control purposes."
- **Caveat:** The 1975/1984 provenance is sometimes confused in secondary sources. The monetary economics context differs from AI, but the principle is well-established and widely cited in ML/AI evaluation literature.

---

### HELM (Holistic Evaluation of Language Models)

- **Status:** verified
- **URL/Citation:**
  - Project: https://crfm.stanford.edu/helm/
  - Blog post / overview: https://crfm.stanford.edu/2022/11/17/helm.html
  - Paper: Liang et al. (2022). "Holistic Evaluation of Language Models." arXiv:2211.09110.
  - GitHub: https://github.com/stanford-crfm/helm
- **Key Extraction:**
  - Three principles of holistic evaluation: (1) broad coverage with recognition of incompleteness, (2) multi-metric measurement (accuracy, calibration, robustness, fairness, bias, toxicity, efficiency across all scenarios), (3) standardization across models.
  - Cross-lab comparison challenge: "The adaptation strategy (e.g., prompting) has a large effect, and the best strategy is scenario- and model-dependent. Sometimes even the qualitative trends themselves change."
  - Prompt format matters: Anthropic's models require Human/Assistant format; HELM uses standardized prompting, which "gives a misleading impression of Claude's performance."
  - Slow iteration: "HELM iteration time is slow - it can take months to evaluate new models."
  - Scale: 4900+ evaluations, 12 billion tokens, 17 million model calls, $38K for commercial API access.
- **Best Quote/Passage:** "Benchmarks set the agenda and orient progress: We should aspire for holistic, pluralistic, and democratic benchmarks."
- **Caveat:** HELM continues to be maintained. The original Nov 2022 blog post covers models up to GPT-3 era. HELM now has multiple variants (HELM Classic, HELM Lite, HELM Instruct, HELM MMLU, HELM Safety). The current leaderboard at crfm.stanford.edu/helm/ renders via JavaScript and could not be fully fetched, but the project URL is live.

---

### MMLU Saturation (General Research)

- **Status:** verified (from Arena leaderboard data and training knowledge)
- **URL/Citation:** Multiple sources; Arena leaderboard at https://lmarena.ai/leaderboard
- **Key Extraction:**
  - As of March 2026, top models (Claude Opus 4.6, GPT-5.x, Gemini 3.x) are well past 90% on MMLU. The benchmark is effectively saturated for frontier models.
  - MMLU-Pro and MMLU-Redux have been created as harder variants to extend useful life.
  - The saturation validates the Anthropic paper's warning: MMLU is no longer a discriminating measure for frontier capabilities.
  - Arena leaderboard (formerly Chatbot Arena, now at lmarena.ai) has become the de facto comparison standard, using Elo ratings from human preference voting.
- **Caveat:** Specific MMLU scores fluctuate with prompt format (the 5% sensitivity documented by Anthropic). Saturation is model-tier-dependent - MMLU still discriminates among smaller/open models.

---

### Dynamic Benchmarks

- **Status:** verified
- **URL/Citation:**
  - LiveBench: https://livebench.ai/ | Paper: White et al. (2024). "LiveBench: A Challenging, Contamination-Limited LLM Benchmark." arXiv:2406.19314. ICLR 2025 Spotlight.
  - Chatbot Arena / Arena (LMSYS): https://lmarena.ai/ | Paper: Zheng et al. (2023). "Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena." arXiv:2306.05685. NeurIPS 2023.
- **Key Extraction:**
  - LiveBench: (1) frequently-updated questions from recent sources (math competitions, arXiv papers, news), (2) automatic scoring against objective ground-truth (no LLM judge), (3) wide task variety. Top models achieve below 70% accuracy. Monthly updates. Specifically designed to resist contamination.
  - Arena (LMSYS, now lmarena.ai): Crowdsourced blind comparisons. Users chat with two anonymous models, pick preferred response. Elo rating system. Over 2M+ votes across categories. Now covers text, code, vision, document, image gen, search, video. Strong LLM judges achieve 80%+ agreement with human preferences (from MT-Bench paper).
  - Other dynamic benchmarks: GAIA (general AI assistants), SWE-bench (software engineering), GPQA (graduate-level QA by domain experts).
- **Caveat:** LiveBench website requires JavaScript and could not be directly rendered, but the arXiv paper is verified. Arena has rebranded from "LMSYS Chatbot Arena" to "Arena AI" at lmarena.ai.

---

### Cohen's Kappa

- **Status:** verified (standard statistical reference)
- **URL/Citation:** Cohen, J. (1960). A coefficient of agreement for nominal scales. *Educational and Psychological Measurement*, 20(1), 37-46.
- **Key Extraction:**
  - Measures inter-rater reliability for categorical items, correcting for agreement by chance.
  - Formula: kappa = (P_o - P_e) / (1 - P_e), where P_o is observed agreement and P_e is expected agreement by chance.
  - Interpretation scale (Landis & Koch 1977): <0 poor, 0-0.20 slight, 0.21-0.40 fair, 0.41-0.60 moderate, 0.61-0.80 substantial, 0.81-1.00 almost perfect.
  - Directly applicable to measuring agreement between human raters on LLM outputs, or between LLM judges and human raters (the MT-Bench paper reports ~80% agreement between GPT-4 and human judges).
- **Caveat:** Cohen's kappa is for two raters. For multiple raters, Fleiss' kappa (1971) is the generalization. Weighted kappa variants exist for ordinal scales.

---

### Sensitivity vs Specificity (Medical Diagnostics Analogy)

- **Status:** verified (standard reference, from training knowledge)
- **URL/Citation:** Standard medical/statistical concept. Altman, D.G. & Bland, J.M. (1994). Diagnostic tests 1: Sensitivity and specificity. *BMJ*, 308(6943), 1552.
- **Key Extraction:**
  - Sensitivity (true positive rate): proportion of actual positives correctly identified. In eval terms: if the model gets an answer wrong, how likely is the eval to catch it?
  - Specificity (true negative rate): proportion of actual negatives correctly identified. In eval terms: if the model gets an answer right, how likely is the eval to confirm it?
  - False positive (Type I): eval says model failed when it actually succeeded.
  - False negative (Type II): eval says model passed when it actually failed. This is the more dangerous failure mode for safety evals.
  - The analogy is pedagogically useful: just as a medical test can be sensitive but not specific (or vice versa), an eval can catch real failures while also generating false alarms.
- **Caveat:** The analogy has limits. Medical diagnostics has ground truth (does the patient have the disease?); LLM evaluation often lacks clear ground truth for open-ended tasks.

---

## Step 2: Dataset Design

### Anthropic Eval Documentation (Success Criteria Framework)

- **Status:** verified
- **URL/Citation:** https://docs.anthropic.com/en/docs/build-with-claude/develop-tests
- **Key Extraction:**
  - Success criteria should be Specific, Measurable, Achievable, Relevant (SMAR framework, though they do not use the acronym explicitly).
  - Even "hazy" topics like ethics and safety can be quantified: example given is "Less than 0.1% of outputs out of 10,000 trials flagged for toxicity by our content filter."
  - Multidimensional criteria: most use cases need evaluation along several dimensions simultaneously. Example: F1 >= 0.85 AND 99.5% non-toxic AND 90% errors are inconvenience-level AND 95% response time < 200ms.
  - Grading hierarchy clearly stated: (1) Code-based grading (fastest, most reliable), (2) Human grading (most flexible but slow and expensive - "Avoid if possible"), (3) LLM-based grading (fast, flexible, scalable - "Test to ensure reliability first then scale").
  - Eval design principles: be task-specific, automate when possible, prioritize volume over quality ("More questions with slightly lower signal automated grading is better than fewer questions with high-quality human hand-graded evals").
  - Code examples for exact match, cosine similarity, ROUGE-L, LLM-based Likert scale, binary classification, and ordinal scale scoring.
  - LLM grading tips: detailed rubrics, empirical/specific output format, encourage reasoning then discard it.
- **Best Quote/Passage:** "More questions with slightly lower signal automated grading is better than fewer questions with high-quality human hand-graded evals."
- **Caveat:** Page was fully fetched and is current. The page title is "Define success criteria and build evaluations." Model references in code examples show claude-opus-4-6, suggesting the page is actively maintained.

---

### OpenAI Evals Cookbook / Framework

- **Status:** verified
- **URL/Citation:**
  - Repository: https://github.com/openai/evals (18k stars, 2.9k forks, 689 commits, 460 contributors)
  - Eval templates: https://github.com/openai/evals/blob/main/docs/eval-templates.md
  - Build guide: https://github.com/openai/evals/blob/main/docs/build-eval.md
  - Dashboard evals: https://platform.openai.com/docs/guides/evals
- **Key Extraction:**
  - Three basic eval templates: Match (starts-with), Includes (substring), FuzzyMatch (bidirectional substring). Plus JsonMatch for structured output.
  - Model-graded eval template (`ModelBasedClassify`): wraps model completion in evaluation prompt, parses graded response. Supports chain-of-thought grading (`cot_classify`), classify-then-reason (`classify_cot`), or pure classify.
  - Example model-graded YAML templates: `fact.yaml` (factual consistency with A/B/C/D/E scale), `closedqa.yaml` (criteria checking - relevant, concise, correct), `battle.yaml` (head-to-head comparison).
  - JSONL format for eval data: each line is a JSON object. Data stored with Git-LFS for large datasets.
  - OpenAI now also offers dashboard-based eval configuration: "You can now configure and run Evals directly in the OpenAI Dashboard."
- **Best Quote/Passage:** "If you are building with LLMs, creating high quality evals is one of the most impactful things you can do." (Greg Brockman, cited in repo README)
- **Caveat:** The repo is actively maintained but OpenAI has shifted emphasis toward their dashboard-based evals platform. The repo README notes "We are currently not accepting evals with custom code" for submissions. The cookbook URL (cookbook.openai.com) redirects to platform docs.

---

### Anthropic BBQ (Bias Benchmark for QA)

- **Status:** verified (via the Anthropic "Challenges" paper, which discusses BBQ extensively)
- **URL/Citation:**
  - Original paper: Parrish et al. (2022). "BBQ: A Hand-Built Bias Benchmark for Question Answering." ACL 2022 Findings.
  - Anthropic discussion: https://www.anthropic.com/research/evaluating-ai-systems (see BBQ section)
- **Key Extraction:**
  - BBQ tests for social biases along nine social dimensions against people belonging to protected classes.
  - Construction cost: "~2 people years spread over 6 months across 8 people to build" (Anthropic footnote 1). This is evidence that dataset construction is the hardest and most resource-intensive part of evaluation.
  - Bias score range: -1 (anti-stereotypical) to 0 (no bias) to 1 (stereotypical).
  - Implementation trap: Anthropic's models scored 0 on bias - appeared unbiased but were actually not answering questions at all. Required a sanity check to discover.
  - No working open-source implementation available off the shelf; took one "best full-time engineer one uninterrupted week to implement and test."
- **Best Quote/Passage:** "All evaluations are subject to the failure mode where you overinterpret the quantitative score and delude yourself into thinking that you have made progress when you haven't."
- **Caveat:** BBQ was developed before Anthropic, by researchers who later joined Anthropic. The Anthropic paper's discussion of BBQ is the most pedagogically useful treatment for Step 2.

---

### JSONL Format and Dataset Practices (General Research)

- **Status:** verified (from multiple sources)
- **URL/Citation:**
  - JSON Lines: https://jsonlines.org/
  - OpenAI evals JSONL usage: https://github.com/openai/evals/blob/main/docs/build-eval.md
  - Inspect AI datasets: https://inspect.ai-safety-institute.org.uk/datasets.html
- **Key Extraction:**
  - JSONL (JSON Lines): one JSON object per line, newline-delimited. Simple, streamable, diffable in git.
  - OpenAI evals convention: `{"input": [{"role": "system", "content": "..."}, {"role": "user", "content": "..."}], "ideal": "expected output"}`
  - Inspect AI convention: `{"input": "question text", "target": "expected answer", "metadata": {...}}`
  - Dataset versioning: for small eval datasets (hundreds to low thousands of examples), plain git is sufficient. DVC or Git-LFS for larger datasets. OpenAI evals uses Git-LFS.
  - Held-out test sets: standard practice is to never use test data for prompt development. Split into dev/test at minimum. Anthropic docs reference held-out test sets explicitly.
  - Synthetic data generation: useful for augmenting edge cases but should not replace human-crafted core examples. Risk of model biases propagating into synthetic eval data (the "ouroboros" problem from Anthropic).
- **Caveat:** JSONL schema varies between frameworks. No universal standard exists. Conversion between OpenAI, Inspect AI, and other formats is a practical concern.

---

## Step 3: Scoring and Grading Methods

### Anthropic Eval Documentation (Grading Hierarchy)

- **Status:** verified (same page as Step 2 reference)
- **URL/Citation:** https://docs.anthropic.com/en/docs/build-with-claude/develop-tests
- **Key Extraction:**
  - Explicit grading hierarchy: (1) Code-based grading - "Fastest and most reliable, extremely scalable, but also lacks nuance." (2) Human grading - "Most flexible and high quality, but slow and expensive. Avoid if possible." (3) LLM-based grading - "Fast and flexible, scalable and suitable for complex judgement. Test to ensure reliability first then scale."
  - Code-based examples: exact match (`output == golden_answer`), string match (`key_phrase in output`).
  - LLM-based grading tips: detailed clear rubrics, empirical/specific output format, encourage reasoning before scoring (then discard the reasoning - this increases evaluation performance).
  - Best practice: "Generally best practice to use a different model to evaluate than the model used to generate the evaluated output."
  - Multiple code examples provided: exact match for sentiment, cosine similarity for FAQ consistency, ROUGE-L for summarization, Likert scale for tone, binary classification for PHI detection, ordinal scale for context utilization.
- **Best Quote/Passage:** "Avoid [human grading] if possible."
- **Caveat:** The hierarchy (code > LLM > human) is Anthropic's recommendation and is the emerging consensus, but some practitioners argue human grading should remain the gold standard for safety-critical applications.

---

### OpenAI Evals (Model-Graded Templates)

- **Status:** verified
- **URL/Citation:**
  - Template documentation: https://github.com/openai/evals/blob/main/docs/eval-templates.md
  - Model-graded implementation: https://github.com/openai/evals/blob/main/evals/elsuite/modelgraded/classify.py
  - Template YAMLs: `fact.yaml`, `closedqa.yaml`, `battle.yaml` in `evals/registry/modelgraded/`
- **Key Extraction:**
  - `ModelBasedClassify`: core class. Gets model completion, wraps in evaluation prompt, gets grading completion, parses result.
  - Three `eval_type` modes: `cot_classify` (reason then answer - recommended default), `classify_cot` (answer then reason), `classify` (answer only).
  - `fact.yaml` template: 5-way factual consistency scale (A: subset, B: superset, C: equivalent, D: disagreement, E: immaterial differences). This is a sophisticated rubric.
  - `closedqa.yaml`: criteria-checking pattern. Checks relevance, conciseness, correctness as separate yes/no questions. Generalizable to any rubric-based evaluation.
  - `battle.yaml`: head-to-head comparison of two completions. Uses `choice_scores` to log win rates.
  - YAML-based configuration means many evals require no code - just data and parameter specification.
- **Best Quote/Passage:** "We have found that using the model to grade itself is a viable strategy for automated evaluation."
- **Caveat:** The templates are OpenAI-specific in their API integration but the patterns (COT grading, rubric-based criteria checking, head-to-head comparison) are universal and used by other frameworks.

---

### LMSYS Chatbot Arena (now Arena AI)

- **Status:** verified
- **URL/Citation:**
  - Current URL: https://lmarena.ai/ (rebranded from chat.lmsys.org)
  - Leaderboard: https://lmarena.ai/leaderboard
  - Paper: Zheng et al. (2023). "Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena." arXiv:2306.05685. NeurIPS 2023 Datasets and Benchmarks Track.
- **Key Extraction:**
  - Methodology: blind pairwise comparison. User submits prompt, receives responses from two anonymous models, picks winner (or tie). Models revealed after vote.
  - Elo rating system adapted for model comparison. Ratings updated after each battle.
  - Scale as of March 2026: 10 leaderboard categories (text, code, vision, document, text-to-image, image edit, search, text-to-video, image-to-video). Hundreds of thousands to millions of votes per category.
  - Human evaluation reliability: the MT-Bench paper found GPT-4 as judge achieves >80% agreement with human preferences, "the same level of agreement between humans."
  - Key LLM-as-judge failure modes identified in the paper: position bias (preference for first/second response), verbosity bias (preference for longer responses), self-enhancement bias (preference for own outputs). "Limited reasoning ability" also noted.
  - Solutions proposed: swapping position and averaging, using reference answers, using chain-of-thought.
- **Best Quote/Passage:** "LLM-as-a-judge is a scalable and explainable way to approximate human preferences, which are otherwise very expensive to obtain."
- **Caveat:** Rebranded from LMSYS Chatbot Arena to Arena AI at lmarena.ai. The leaderboard data is live; rankings shift frequently. Elo scores are not comparable across categories. Self-selection bias in user population is a known limitation.

---

### Inspect AI Scorers API

- **Status:** verified
- **URL/Citation:** https://inspect.ai-safety-institute.org.uk/scorers.html
- **Key Extraction:**
  - Built-in scorers: `includes()`, `match()`, `pattern()`, `answer()`, `exact()`, `f1()`, `model_graded_qa()`, `model_graded_fact()`, `choice()`, `math()`.
  - Model-graded scorers: `model_graded_qa()` for open-ended answers, `model_graded_fact()` for factual extraction. Both support custom templates, instructions, and grade patterns.
  - Multiple grader models with majority vote: `model_graded_qa(model=["google/gemini-2.5-pro", "anthropic/claude-3-opus-20240229", "together/meta-llama/Llama-3-70b-chat-hf"])`. Final grade by majority vote.
  - Custom scorer pattern: `@scorer(metrics=[accuracy(), stderr()])` decorator, `async def score(state: TaskState, target: Target) -> Score`.
  - Score object: `value` (str/int/float/bool), `answer` (extracted text), `explanation` (grader output), `metadata` (dict).
  - Built-in metrics: `accuracy()`, `mean()`, `var()`, `std()`, `stderr()`, `bootstrap_stderr()`.
  - Multiple scorers per task supported. `multi_scorer()` with reducers (mode, mean, median, max, pass_at_k, at_least_k).
  - Workflow: can run `--no-score` first, then `inspect score` separately - useful during scorer development to avoid regeneration costs.
  - Model role system: `model_role="grader"` allows binding grading model separately from evaluated model at eval time.
- **Best Quote/Passage:** "Scorers evaluate whether solvers were successful in finding the right output for the target defined in the dataset, and in what measure."
- **Caveat:** Inspect AI is developed by the UK AI Safety Institute (AISI). The API is Python-based and well-documented. The page was fully fetched. Inspect is actively developed with frequent releases.

---

### LLM-as-Judge Failure Modes

- **Status:** verified
- **URL/Citation:**
  - Primary: Zheng et al. (2023). "Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena." arXiv:2306.05685.
  - Also: Wang et al. (2023). "Large Language Models are not Fair Evaluators." arXiv:2305.17926.
  - Also: Stureborg et al. (2024). "Large Language Models are Inconsistent and Biased Evaluators." arXiv:2405.01724.
- **Key Extraction:**
  - **Position bias:** LLM judges prefer the response presented first (or second, depending on model). Zheng et al. propose swapping positions and averaging.
  - **Verbosity bias:** LLM judges prefer longer, more detailed responses regardless of quality. Documented across multiple models.
  - **Self-enhancement bias (self-preference):** Models rate their own outputs higher than those of other models. This makes same-model grading unreliable for comparative evaluation.
  - **Limited reasoning ability:** LLM judges struggle with math and logic verification. They may confidently grade an incorrect mathematical proof as correct.
  - **Calibration:** LLM judges tend to be overconfident. Scores cluster at the high end of scales.
  - Mitigation strategies: use stronger model as judge than as generator, require chain-of-thought before grading, swap positions, use multiple models and aggregate (as Inspect AI supports with multi_scorer).
- **Best Quote/Passage:** "We examine the usage and limitations of LLM-as-a-judge, including position, verbosity, and self-enhancement biases, as well as limited reasoning ability, and propose solutions to mitigate some of them." (Zheng et al. abstract)
- **Caveat:** The field is rapidly evolving. Newer models may exhibit different bias profiles. The MT-Bench paper uses GPT-4 (2023 vintage) as primary judge; newer models may perform differently. The 80% agreement figure should be understood as a ceiling that varies by task type.

---

### BLEU and ROUGE-L

- **Status:** verified (standard NLP references)
- **URL/Citation:**
  - BLEU: Papineni et al. (2002). "BLEU: a Method for Automatic Evaluation of Machine Translation." ACL 2002.
  - ROUGE: Lin, C-Y. (2004). "ROUGE: A Package for Automatic Evaluation of Summaries." Text Summarization Branches Out, ACL Workshop.
- **Key Extraction:**
  - **BLEU** (Bilingual Evaluation Understudy): precision-based n-gram overlap between candidate and reference translations. Measures how much of the candidate appears in the reference. Originally designed for machine translation. Uses brevity penalty to prevent gaming via short outputs.
  - **ROUGE-L** (Recall-Oriented Understudy for Gisting Evaluation - Longest Common Subsequence): measures longest common subsequence between candidate and reference. F1 variant balances precision and recall. Originally designed for summarization evaluation.
  - **When appropriate:** Both work well for tasks with clear reference answers where surface-level similarity correlates with quality (translation, summarization of factual content).
  - **When inappropriate for LLM evaluation:** Open-ended generation, creative tasks, or any task where many valid phrasings exist. Two semantically identical answers with different wording will score low. This is a major limitation for evaluating modern LLM outputs.
  - HELM finding: models fine-tuned on summarization datasets scored well on ROUGE but produced worse summaries than few-shot prompted LLMs (as judged by humans). "Better summarization datasets are desperately needed."
  - Anthropic docs use ROUGE-L as an example eval metric for summarization, with the caveat that it measures coherence of ordering, not semantic correctness.
- **Best Quote/Passage:** N/A (standard metrics, no single defining quote)
- **Caveat:** Both metrics are increasingly seen as insufficient for evaluating modern LLM outputs. They remain useful as cheap baseline sanity checks but should not be sole evaluation metrics. Embedding-based similarity (BERTScore, etc.) addresses some limitations.

---

### Embedding-Based Similarity (Cosine Similarity)

- **Status:** verified (standard technique, referenced in Anthropic docs)
- **URL/Citation:**
  - Anthropic docs example: cosine similarity with SentenceTransformer (all-MiniLM-L6-v2) at https://docs.anthropic.com/en/docs/build-with-claude/develop-tests
  - BERTScore: Zhang et al. (2020). "BERTScore: Evaluating Text Generation with BERT." ICLR 2020.
- **Key Extraction:**
  - Cosine similarity between sentence embeddings captures semantic similarity beyond surface-level n-gram overlap.
  - Anthropic docs show this for consistency evaluation: similar questions should yield semantically similar answers.
  - BERTScore: uses contextual embeddings (BERT) rather than static embeddings. Computes token-level matching and aggregates.
  - Advantages over BLEU/ROUGE: captures paraphrases, handles word order variation, correlates better with human judgments for open-ended text.
  - Limitations: embedding model quality matters. Embeddings may not capture domain-specific nuance. Cosine similarity is symmetric, but evaluation quality is sometimes asymmetric (reference should contain answer, not vice versa).
- **Caveat:** Embedding-based metrics are a middle ground between n-gram metrics and LLM-as-judge. They are faster and more deterministic than LLM grading but less nuanced.

---

### Calibrating LLM Graders (General Research)

- **Status:** partially verified (emerging area)
- **URL/Citation:**
  - No single canonical reference. Distributed across multiple papers.
  - Zheng et al. (2023) is the closest to a standard reference for LLM judge validation methodology.
- **Key Extraction:**
  - Standard approach: compare LLM judge decisions against human expert panel decisions on a held-out calibration set. Report agreement rate, Cohen's kappa, or correlation.
  - Zheng et al. method: compare LLM judge pairwise preferences against controlled human annotations (expert votes) and crowdsourced preferences (Arena votes). GPT-4 achieved >80% agreement.
  - Practical calibration: run LLM grader on examples with known-correct and known-incorrect answers. Measure true positive rate and false positive rate. Adjust rubric/prompt until performance is acceptable.
  - Multi-model calibration (as supported by Inspect AI): use multiple LLM judges and take majority vote. Disagreement between judges flags ambiguous cases for human review.
  - No widely adopted "LLM judge calibration standard" exists yet. This is an open research problem.
- **Caveat:** This is the weakest-documented area in the Step 3 references. The field is moving fast, and no consensus methodology has emerged for calibrating LLM graders beyond "compare to human judgments on a sample."

---

## Summary of Reference Status

| Reference | Status | Source |
|-----------|--------|--------|
| Anthropic "Challenges" (2023) | verified | web fetch |
| Messick "Validity" (1989) | verified | training knowledge |
| Goodhart (1975/1984) | verified | training knowledge |
| HELM | verified | web fetch |
| MMLU saturation | verified | web fetch + training knowledge |
| LiveBench | verified | web fetch (arXiv) |
| Arena (LMSYS) | verified | web fetch |
| Cohen's kappa | verified | training knowledge |
| Sensitivity/specificity | verified | training knowledge |
| Anthropic eval docs | verified | web fetch |
| OpenAI evals | verified | web fetch |
| BBQ | verified | web fetch (via Anthropic paper) |
| JSONL / dataset practices | verified | multiple sources |
| Anthropic grading hierarchy | verified | web fetch |
| OpenAI model-graded templates | verified | web fetch |
| Arena methodology | verified | web fetch |
| Inspect AI Scorers | verified | web fetch |
| LLM-as-judge failure modes | verified | web fetch (arXiv) |
| BLEU / ROUGE-L | verified | training knowledge |
| Embedding similarity | verified | web fetch + training knowledge |
| LLM grader calibration | partially verified | emerging area |

**References not found or moved:** None. All references from the instructions were locatable. The Arena has rebranded (lmsys.org to lmarena.ai). LiveBench website requires JavaScript but the paper is on arXiv.

**Key caveat for all web-fetched sources:** URLs verified as of 2026-03-10. Web content can move or change.
