# IV-04 Research Findings: Tier 2 External References (Steps 4-6)

**Researched:** 2026-03-10
**Agent:** Weaver (research pass)
**Scope:** Steps 4 (agent evaluation), 5 (eval infrastructure), 6 (adversarial testing)

---

## Step 4: Evaluating Agents and Workflows (EMERGING/FRONTIER)

### SWE-bench (Jimenez et al., 2023)

- **Status:** verified
- **URL/Citation:** arXiv:2310.06770; website https://www.swebench.com/; paper at https://openreview.net/pdf?id=VTF8yNQM66
- **Key Extraction:**
  - Uses real GitHub issues from popular Python repos as evaluation tasks. Models must produce a patch that resolves the issue, scored by whether repo tests pass (binary pass/fail).
  - Full benchmark has 2,294 instances. Subsets: SWE-bench Verified (500 human-filtered instances, co-created with OpenAI Aug 2024), SWE-bench Lite (300, cheaper), SWE-bench Multilingual (300, 9 languages), SWE-bench Multimodal (517, visual issues).
  - As of 2025-2026, top agents exceed 60% on Verified (mini-SWE-agent v2 scores 65% in 100 lines of Python). The field has moved rapidly from GPT-4's initial ~2% on the full set.
  - SWE-smith (May 2025) enables training models specifically for SWE tasks. CodeClash (Nov 2025) extends to goal-oriented (not just task-oriented) development.
- **Best Quote/Passage:** From the paper abstract: models are evaluated on their "ability to resolve real-world GitHub issues" - this grounds evaluation in actual developer workflow, not synthetic tasks.
- **Field vs Novel:** Field provides the benchmark and scoring methodology. This project adds the distinction between verifiable evals (gate can check) and taste-required evals (human judgment needed) - SWE-bench is squarely in the verifiable category. The project's concept of "right answer wrong work" (slopodar) applies directly: a patch can pass tests via wrong causal path.
- **Caveat:** SWE-bench only measures code generation/patching. It does not evaluate agent trajectory quality, cost efficiency, or multi-step reasoning process. Known criticism: gaming via large context windows and repo-level retrieval, potential benchmark contamination in training data for newer models.

### WebArena (Zhou et al., 2023)

- **Status:** verified
- **URL/Citation:** arXiv:2307.13854; website https://webarena.dev/
- **Key Extraction:**
  - Creates realistic web environments with fully functional websites across 4 domains: e-commerce, social forums, collaborative software dev, and content management.
  - Tests functional correctness of web task completion in an interactive environment. Agents must navigate, click, fill forms, and reason across pages.
  - Human performance: 78.24% success; best GPT-4-based agent at time of paper: 14.41%. The gap has narrowed significantly since 2023 but environment interaction remains challenging.
  - Key distinction from SWE-bench: evaluates tool use in an interactive environment (browser actions) vs code generation (patch production). Tests navigation, planning, and multi-step execution.
- **Best Quote/Passage:** "current state-of-the-art large language models are far from perfect performance in these real-life tasks"
- **Field vs Novel:** Field provides the benchmark. This project's concept of trajectory evaluation (not just endpoint) is directly relevant - WebArena evaluates task completion, not the quality of the path taken. The project's operational experience with tool use accuracy as a sub-metric is not measured by WebArena.
- **Caveat:** WebArena environments may drift from real-world web UIs over time. Self-hosted setup is non-trivial. GPT-4 baseline from 2023 is now outdated as a comparison point.

### OSWorld (Xie et al., 2024)

- **Status:** verified
- **URL/Citation:** arXiv:2404.07972; website https://os-world.github.io
- **Key Extraction:**
  - First scalable, real computer environment for multimodal agent evaluation. Supports Ubuntu, Windows, macOS.
  - 369 tasks involving real web and desktop apps, OS file I/O, and cross-application workflows.
  - Each task has initial state setup configuration and custom execution-based evaluation scripts for reproducibility.
  - Human performance: 72.36%; best model at paper time: 12.24%. Primary failure modes: GUI grounding and operational knowledge.
  - Extends WebArena from browser-only to full OS interaction, including desktop applications, file management, and cross-app workflows.
- **Best Quote/Passage:** "significant deficiencies in their ability to serve as computer assistants [...] primarily struggling with GUI grounding and operational knowledge"
- **Field vs Novel:** Field provides the full-OS evaluation environment. This project's emphasis on sandboxed execution environments (Docker/K8s in Inspect) maps directly to OSWorld's evaluation infrastructure needs. OSWorld does not address the cost dimension that this project identifies as critical for practical agent evaluation.
- **Caveat:** Multimodal (screenshot-based) interaction required. Results may not generalize to text-only agent evaluations. Resource-intensive to run.

### Inspect AI - Agent Evaluation Framework

- **Status:** verified
- **URL/Citation:** https://inspect.ai-safety-institute.org.uk/; GitHub: https://github.com/UKGovernmentBEIS/inspect_ai; Created by UK AI Security Institute (formerly AISI), May 2024.
- **Key Extraction:**
  - Architecture: Tasks (dataset + solver + scorer), Solvers (chained evaluation steps), Scorers (evaluation functions). Clean separation of concerns.
  - Agent support: built-in ReAct agent, multi-agent primitives, ability to run external agents (Claude Code, Codex CLI, Gemini CLI). Agent Bridge for 3rd party frameworks (OpenAI Agents SDK, LangChain, Pydantic AI).
  - 100+ pre-built evaluations verified - accessible via Inspect Evals (https://ukgovernmentbeis.github.io/inspect_evals/). Categories cover coding, reasoning, knowledge, behavior, multimodal, agentic tasks.
  - Sandboxing: Docker, Kubernetes, Modal, Proxmox, and extensible via API. Tool support: bash, python, text editing, web search, browsing, computer use, MCP tools, custom tools.
  - Trajectory vs endpoint: Inspect logs full message histories and tool call sequences. The Log Viewer and new "Inspect Scout" tool (from Meridian Labs) enable in-depth transcript analysis. Tracing support for runtime diagnostics.
  - Handles evaluation at scale: async parallelisation, rate limiting, eval sets for managing large batches, early stopping for efficiency.
- **Best Quote/Passage:** "An open-source framework for large language model evaluations" - understated but accurate. The depth of the agent evaluation support (bridge, multi-agent, sandboxing) is the real value.
- **Field vs Novel:** Inspect provides the most complete open-source agent evaluation framework currently available. This project's approach to multi-model review (darkcat alley pattern with 3 independent models) has no direct parallel in Inspect - Inspect evaluates one model at a time against a task, it does not do cross-model convergence analysis on the same code artifact. The project's slopodar anti-pattern taxonomy has no parallel in Inspect's scoring system.
- **Caveat:** Inspect is actively developed and changing rapidly. Docs reference features like "Inspect Scout" that are very new. The framework is UK government-backed which gives it institutional stability but may mean slower adoption of cutting-edge patterns.

### OpenAI Agent Evals and Trace Grading

- **Status:** verified
- **URL/Citation:** https://platform.openai.com/docs/guides/agent-evals (agent evals overview); https://platform.openai.com/docs/guides/trace-grading (trace grading specifics); https://platform.openai.com/docs/guides/evals (general evals API)
- **Key Extraction:**
  - OpenAI's eval system now has three tiers: Datasets (iterative, low-friction), Evals API (programmatic, scalable), and Trace Grading (agent-specific, workflow-level).
  - Trace grading: assigns structured scores to an agent's trace - the end-to-end log of decisions, tool calls, and reasoning steps. Unlike black-box evaluation, trace evals provide data to understand *why* an agent succeeds or fails.
  - Evals API uses a template system with data sources and testing criteria (graders). Supports string_check, model_graded, and custom graders. Runs are asynchronous, results accessible via API or dashboard.
  - Traces live in the dashboard under Logs > Traces. Graders can be created and run against agent traces. "Grade all" function enables batch evaluation. Agent Builder workflows automatically generate traces.
  - Agent evals page is notably thin - it is a hub pointing to Datasets, Evals, and Trace Grading. The actual methodology is in those sub-pages.
- **Best Quote/Passage:** "Trace grading is the process of assigning structured scores or labels to an agent's trace - the end-to-end log of decisions, tool calls, and reasoning steps - to assess correctness, quality, or adherence to expectations."
- **Field vs Novel:** OpenAI provides trace-level agent evaluation (trajectory, not just endpoint). This project's trajectory evaluation concept maps directly but goes further: the project evaluates not just tool calls but also the reasoning quality and cost efficiency of the path, which OpenAI's trace grading does not explicitly address. The project's concept of "verifiable vs taste-required" as a sorting criterion for evaluation mode has no parallel in OpenAI's docs.
- **Caveat:** Trace grading requires use of OpenAI's Agent Builder or Responses API. Not model-agnostic. The evals ecosystem has shifted significantly - the old `openai/evals` CLI repo (GitHub, 18k stars, 689 commits) is essentially a legacy benchmark registry that now points users to the dashboard-based eval system.

### General Research: Agent Evaluation Methodology

- **Status:** emerging field, no single canonical survey
- **Key Extraction:**
  - The progression SWE-bench -> WebArena -> OSWorld shows increasing environment complexity: code patches -> browser interaction -> full OS. Each adds new dimensions but inherits the fundamental limitation of binary task-completion scoring.
  - Trajectory evaluation vs task-based evaluation: the field is split. SWE-bench and WebArena evaluate endpoints only. OpenAI trace grading and Inspect log analysis evaluate trajectories. No published head-to-head comparison found.
  - Tool use accuracy as a sub-metric: no standardised measurement found. Inspect logs tool calls but does not score tool use efficiency separately from task completion.
  - Cost-per-resolution benchmarking: SWE-bench's leaderboard now includes scatter plots of resolved vs cost, resolved vs cost limit, and cumulative cost distributions. This is the closest to standardised cost benchmarking. No general framework found.
- **Field vs Novel:** The field provides task-completion benchmarks of increasing sophistication. **This is where field coverage ends and project operational experience begins.** The project contributes: (1) explicit cost tracking as an eval dimension alongside correctness, (2) the verifiable/taste-required distinction as a meta-evaluation criterion, (3) multi-model convergence as a confidence signal rather than a correctness signal, (4) the observation that correlated model biases (L10 in the layer model) mean same-model evaluation has structural limitations that no amount of prompting overcomes.

---

## Step 5: Eval Infrastructure and Automation (EMERGING)

### Inspect AI Infrastructure

- **Status:** verified
- **URL/Citation:** https://inspect.ai-safety-institute.org.uk/parallelism.html (parallelism); https://inspect.ai-safety-institute.org.uk/log-viewer.html (log viewer); https://inspect.ai-safety-institute.org.uk/vscode.html (VS Code extension); https://inspect.ai-safety-institute.org.uk/eval-sets.html (eval sets)
- **Key Extraction:**
  - Parallelism: highly parallel async architecture. Tunable to stay under API rate limits or avoid overloading local compute. Batch mode supported for model inference.
  - Log Viewer: web-based tool ("Inspect View"), launched via `inspect view`. Shows task summaries and individual sample results. Automatically updates when new evals complete. Inspect Scout (new, from Meridian Labs) adds in-depth transcript analysis.
  - VS Code Extension: assists with authoring and debugging evals. Highly recommended by docs.
  - Eval Sets: managing, running, and analysing larger sets of evaluation tasks. Supports describing eval suites and tracking results across runs.
  - Eval Registry: Inspect Evals (https://ukgovernmentbeis.github.io/inspect_evals/) provides 100+ implementations of popular benchmarks.
  - Log format: structured log files with Python API for reading. Dataframe extraction for evals, samples, messages, and events. Supports analysis workflows.
- **Field vs Novel:** Inspect provides production-grade eval infrastructure. This project's gate concept (typecheck + lint + test as survival baseline) is analogous to Inspect's quality gate, but operates at a different level - project-level CI vs model-evaluation-level. The project does not currently use Inspect; the eval infrastructure is the Makefile pipeline with polecats.
- **Caveat:** Inspect is Python-only. Projects using other languages need to bridge. The VS Code extension is "highly recommended" which suggests CLI-only usage may have rough edges.

### OpenAI Evals CLI (github.com/openai/evals)

- **Status:** verified but effectively superseded
- **URL/Citation:** https://github.com/openai/evals (18k stars, 689 commits, 460 contributors)
- **Key Extraction:**
  - Originally an open-source framework for evaluating LLMs with a registry of community-contributed evals. CLI-based: `oaieval` command to run evals.
  - Registry pattern: evals defined in YAML with data in JSONL. Supports eval templates (basic match, model-graded) and custom evaluation logic via Python.
  - Current state: the repo README now directs users to the dashboard-based eval system ("You can now configure and run Evals directly in the OpenAI Dashboard"). Still accepts community eval submissions (model-graded YAML only, not custom code).
  - The repo is maintained but development focus has shifted to the platform-integrated Evals API (https://platform.openai.com/docs/guides/evals). The CLI still works for running existing evals but is not where innovation is happening.
- **Best Quote/Passage:** Greg Brockman: "creating high quality evals is one of the most impactful things you can do" (cited in repo README).
- **Field vs Novel:** The open registry pattern was influential but is now being superseded by platform-integrated approaches. This project's approach of co-located tests (*.test.ts beside the module) is structurally similar to the registry pattern but operates at module level rather than model level.
- **Caveat:** Do not cite the openai/evals CLI as current best practice. It is a legacy tool. The Evals API and dashboard are the current approach. Students should be aware of both but direct effort toward the API.

### MLOps Practices for LLM Evals

- **Status:** emerging, no single canonical reference
- **Key Extraction:**
  - Teams are integrating evals into CI/CD but practices are not standardised. Common patterns: eval runs triggered on PR, results as GitHub check status, regression detection against baseline scores.
  - GitHub Actions for eval pipelines: no widely-published standard template found. Teams build custom workflows. Braintrust and LangSmith both offer CI integration guides.
  - Eval regression testing: the pattern is "run evals on PR, compare to main branch baseline, fail if score drops below threshold." This is essentially the same as test regression but with non-deterministic outputs requiring statistical comparison.
  - Dataset versioning: no consensus. Options include DVC (data version control), Git LFS (used by openai/evals), or platform-managed (Braintrust, LangSmith). Each has tradeoffs around size, reproducibility, and collaboration.
- **Field vs Novel:** The field is converging on eval-as-CI but lacks standardisation. This project's gate concept (pnpm run typecheck && pnpm run lint && pnpm run test) is a quality gate that could incorporate eval runs. The project's emphasis on deterministic execution (polecats) and atomic verification is ahead of the field's loosely-defined CI integration patterns.
- **Caveat:** This space is moving fast. Any specific tool recommendation may be outdated within months.

### Eval Platforms: Braintrust, LangSmith, and Others

- **Status:** verified (Braintrust); LangSmith known but not fetched in detail
- **URL/Citation:** https://www.braintrust.dev/ (Braintrust); https://smith.langchain.com/ (LangSmith)
- **Key Extraction:**
  - **Braintrust** ($80M Series B announced): positions as "AI observability platform." Three pillars: trace everything (production observability), measure quality with evals (score with LLMs/code/humans), catch issues early (block bad releases). Features: trace-to-dataset (turn production traces into eval data with one click), Loop agent (AI that improves AI by generating better prompts/scorers/datasets), custom annotation views, MCP integration for IDE access. Brainstore custom database for AI trace data. SOC 2 Type II, HIPAA, GDPR compliant. Customers include Vercel, Notion, Coursera, Dropbox, Replit.
  - **LangSmith** (LangChain ecosystem): tight integration with LangChain framework. Tracing, evaluation, dataset management. Hub for sharing prompts and chains. More framework-coupled than Braintrust.
  - **Other platforms:** Weights & Biases (W&B) integrates with openai/evals. Arize Phoenix for observability. HumanLoop for human-in-the-loop eval. The space is crowded and consolidating.
- **Field vs Novel:** These platforms provide operational eval infrastructure the field needs. This project's approach is leaner - Makefile-based pipeline with polecats rather than a platform. The project's insight that "eval-driven development" is the LLM equivalent of TDD is not explicitly articulated by any platform, though Braintrust's "trace to dataset" workflow embodies the feedback loop.
- **Caveat:** Platform lock-in risk. All platforms want to be the single pane of glass. The project's framework-agnostic approach (YAML, CLI, git) avoids this at the cost of less visual tooling.

### Eval-Driven Development

- **Status:** emerging concept, not yet a named methodology in the field
- **Key Extraction:**
  - The closest published framing is OpenAI's "evaluation flywheel" pattern (referenced in their cookbook): define criteria -> run evals -> analyse -> iterate on prompt -> repeat.
  - Braintrust's "three pillars of AI observability" blog post articulates a similar loop: observe -> evaluate -> iterate.
  - Hamel Husain (widely cited LLM practitioner) has written about evals-first development but no formal methodology paper exists.
  - The BDD (behavior-driven development) analogy is explicitly used by OpenAI's evals documentation: "somewhat similar to behavior-driven development (BDD), where you begin by specifying how the system should behave."
- **Field vs Novel:** The field is converging on "evals first" as a principle but has not formalised it as a methodology. This project's engineering loop (Read -> Verify -> Write -> Execute -> Confirm) and gate-first development is a more rigorous version of what the field is groping toward. The project's distinction between verifiable (gate can check) and taste-required (human judgment) is a contribution the field has not articulated.
- **Caveat:** "Eval-driven development" may crystallise as a named methodology soon. Watch for it.

---

## Step 6: Adversarial Testing Methodology (FRONTIER)

**Note:** This is where established field coverage is thinnest and project operational experience is most distinctive. The boundary between field and novel is explicitly marked below.

### Anthropic Frontier Threats Red Teaming (2023)

- **Status:** verified
- **URL/Citation:** https://www.anthropic.com/research/frontier-threats-red-teaming-for-ai-safety (Jul 26, 2023); earlier: https://www.anthropic.com/research/red-teaming-language-models-to-reduce-harms-methods-scaling-behaviors-and-lessons-learned
- **Key Extraction:**
  - Frontier threats red teaming requires 100+ hours of domain expert time working closely with models. This is not a quick pass. The methodology: define threat models, identify what information is dangerous, determine how information chains together to create harm, measure accuracy and frequency thresholds.
  - Conducted with Gryphon Scientific (biosecurity experts) over 6 months, 150+ hours. Used bespoke secure interface without trust and safety guardrails.
  - Key finding: "current frontier models can sometimes produce sophisticated, accurate, useful, and detailed knowledge at an expert level" but not frequently in most areas. Models more capable as they get larger. Tool access could advance capabilities.
  - Built automated evaluations from expert knowledge to make assessment repeatable and scalable. Challenge: the information itself is sensitive, requiring partnerships with trusted third parties and strong infosec.
  - Anthropic is building a dedicated frontier threats red teaming research team.
- **Best Quote/Passage:** "Subject matter and LLM experts will need to collectively spend substantial time (i.e. 100+ hours) working closely with models to probe for and understand their true capabilities in a target domain." - This is the "more art than science" observation the instructions reference.
- **Field vs Novel:** Anthropic provides the methodology framework: threat models, expert-guided probing, automated eval construction. **Field coverage ends at the frontier threats (bio, cyber, national security) context.** This project extends the methodology to software engineering quality: the slopodar is an anti-pattern taxonomy (analogous to a threat model), the darkcat alley is a structured adversarial review (analogous to expert-guided probing), and the catch-log is an automated record (analogous to repeatable evaluation). The structural parallel is precise; the domains differ.
- **Caveat:** Anthropic's red teaming post is from July 2023. Their methodology has likely evolved significantly. The Responsible Scaling Policy (RSP) now formalises evaluation commitments. The 2023 post is still the most detailed public description of their approach.

### OWASP Top 10 for LLM Applications

- **Status:** verified, updated to 2025 version
- **URL/Citation:** https://genai.owasp.org/llm-top-10/ (2025 version); https://owasp.org/www-project-top-10-for-large-language-model-applications/ (project page); https://genai.owasp.org/resource/owasp-top-10-for-llm-applications-2025/ (PDF download)
- **Key Extraction:**
  - Project has grown from "Top 10 for LLM Applications" to "OWASP GenAI Security Project" - broader scope including agentic AI systems. 600+ contributing experts, 18+ countries, ~8,000 community members.
  - **2025 Top 10:** LLM01 Prompt Injection, LLM02 Sensitive Information Disclosure, LLM03 Supply Chain, LLM04 Data and Model Poisoning, LLM05 Improper Output Handling, LLM06 Excessive Agency, LLM07 System Prompt Leakage, LLM08 Vector and Embedding Weaknesses, LLM09 Misinformation, LLM10 Unbounded Consumption.
  - Changes from v1.1 (2023) to 2025: "Insecure Output Handling" renamed to "Improper Output Handling" (LLM05), "Overreliance" replaced by "Misinformation" (LLM09), "Model Theft" replaced by "Unbounded Consumption" (LLM10), new entries for "System Prompt Leakage" (LLM07) and "Vector and Embedding Weaknesses" (LLM08).
  - Most relevant to adversarial eval design: LLM01 (prompt injection - direct and indirect), LLM02 (sensitive info disclosure), LLM06 (excessive agency), LLM07 (system prompt leakage).
  - New initiative: Agentic App Security (https://genai.owasp.org/initiatives/agentic-security-initiative/) - directly relevant to agent-based systems.
- **Best Quote/Passage:** LLM01 definition: "A Prompt Injection Vulnerability occurs when user prompts alter the [LLM's behavior in unintended ways]" - concise, testable.
- **Field vs Novel:** OWASP provides the vulnerability taxonomy. **Field coverage ends at classification; it begins at detection and remediation for specific operational patterns.** This project's slopodar is a complementary taxonomy - OWASP covers security/safety vulnerabilities in LLM applications, the slopodar covers quality/integrity anti-patterns in LLM output (sycophantic drift, epistemic theatre, etc.). No overlap; different domains, same structural pattern (taxonomy of failure modes).
- **Caveat:** OWASP Top 10 is application-focused (what can go wrong in your deployed LLM app). It is not a red teaming methodology - it is a target list. You need separate methodology to test against these categories.

### Microsoft AI Red Team and PyRIT

- **Status:** verified
- **URL/Citation:** https://www.microsoft.com/en-us/security/blog/2024/02/22/announcing-microsofts-open-automation-framework-to-red-team-generative-ai-systems/ (PyRIT announcement, Feb 2024); GitHub: https://github.com/Azure/PyRIT; Earlier post: https://www.microsoft.com/en-us/security/blog/2023/08/07/microsoft-ai-red-team-building-future-of-safer-ai/
- **Key Extraction:**
  - Microsoft AI Red Team has been active since 2019. Dedicated interdisciplinary group: security, adversarial ML, and responsible AI experts.
  - Three key differences between AI red teaming and traditional red teaming: (1) must probe both security AND responsible AI risks simultaneously, (2) generative AI is more probabilistic - same input can produce different outputs, (3) architecture varies widely across generative AI systems.
  - PyRIT (Python Risk Identification Toolkit): battle-tested by Microsoft AI Red Team since 2022. Components: Targets (model endpoints), Datasets (malicious prompts, static or dynamic templates), Scoring Engine (classifier or LLM-based), Attack Strategy (single-turn or multi-turn), Memory (conversation history for analysis).
  - Key efficiency claim: "in one red teaming exercise on a Copilot system, we were able to pick a harm category, generate several thousand malicious prompts, and use PyRIT's scoring engine to evaluate output... in the matter of hours instead of weeks."
  - Explicit statement: PyRIT is not a replacement for manual red teaming. "PyRIT shines light on the hot spots of where the risk could be, which the security professional then can incisively explore."
  - PyRIT changes tactics based on response and generates next input adaptively (not just prompt generation).
  - Predecessor: Counterfit (2021) for classical ML systems - deprecated for generative AI use.
- **Best Quote/Passage:** "Doing this manually for all types of harms, across all modalities across different strategies, can be exceedingly tedious and slow." - This mirrors this project's motivation for automated adversarial review.
- **Field vs Novel:** Microsoft provides the most complete published framework for structured AI red teaming automation. **Field coverage ends at attack generation and scoring against known vulnerability categories.** This project extends in a different direction: the darkcat alley pattern uses multiple independent models reviewing the same artifact, not attacking a model. The project's adversarial review is read-only analysis, not adversarial prompting. Different mechanism, complementary purpose.
- **Caveat:** PyRIT is security-focused (can I make the model produce harmful output?). It does not address quality/integrity failures (sycophantic drift, epistemic theatre) which are the project's primary concern. The tooling exists; the taxonomy needs extending.

### Prompt Injection Research

- **Status:** active research area, no single canonical reference
- **Key Extraction:**
  - Direct injection: user crafts input to override system instructions. Well-understood, extensively tested. Defenses include instruction hierarchy, input/output filtering, and Constitutional AI-style training.
  - Indirect injection: malicious instructions embedded in retrieved documents, tool results, or other data the model processes. Harder to defend because the attack surface is the entire data pipeline. First formally described by Greshake et al. (2023, arXiv:2302.12173).
  - No standardised test suites for prompt injection found as a single published benchmark. Closest: OWASP provides categories, PyRIT can generate injection attempts, garak (https://github.com/leondz/garak/) is an open-source LLM vulnerability scanner that includes injection tests.
  - The PAIR technique (arXiv:2310.08419) cited by Microsoft uses one LLM to generate adversarial prompts for another - automated jailbreak discovery.
- **Field vs Novel:** The field provides attack taxonomies and tooling for generating adversarial prompts. **Field coverage ends at prompt-level attacks against deployed models.** This project's concern is different: not "can a user make the model produce harmful output" but "can the model's own output quality degrade in ways that pass surface checks" (sycophantic drift, deep compliance). Prompt injection is a vector; the project's concerns are about emergent behavioral failure modes that are not triggered by adversarial input.
- **Caveat:** Defenses are advancing rapidly (instruction hierarchy, system prompt protection). The attack/defense landscape shifts with each model generation.

### Multi-Model Review Patterns (Darkcat Alley Parallel)

- **Status:** field parallel exists in N-version programming and IV&V; no published LLM-specific equivalent found
- **Key Extraction:**
  - N-version programming (Avizienis, 1985): independently developed implementations of the same spec, run in parallel, outputs compared. The theory: independent development means independent faults. Criticism: common-mode failures (same spec ambiguity affects all versions) limit true independence.
  - Independent Verification and Validation (IV&V): standard in aerospace/defense. Separate team reviews the work of the development team using independent tools and methods.
  - The closest LLM parallel: using multiple models to evaluate the same output, checking for convergence (all agree = higher confidence) or divergence (disagreement = investigate). No published formal methodology found for this specific pattern.
  - Inspect AI evaluates one model at a time against benchmarks. It does not natively support multi-model convergence analysis on the same artifact.
- **Field vs Novel:** **This is where field coverage definitively ends.** The project's darkcat alley pattern (SD-318) - 3 independent models review same code snapshot using structured YAML, convergence builds confidence, divergence locates bias, parser in bin/triangulate - has no published parallel in the LLM evaluation literature. The structural isomorphism to N-version programming and IV&V is precise and well-grounded, but the application to LLM code review is novel. The project's observation that same-model review produces correlated blind spots (L10 in the layer model) is the theoretical basis, grounded in N-version programming's known common-mode failure limitation.
- **Caveat:** Absence of evidence is not evidence of absence. Someone may be doing this unpublished. The pattern is obvious enough that independent discovery is likely.

### Anti-Pattern Taxonomies for LLM Output (Slopodar Parallel)

- **Status:** no published parallel found
- **Key Extraction:**
  - OWASP Top 10 for LLM covers application-level security vulnerabilities. Not output quality patterns.
  - Various "prompt engineering best practices" lists exist but are prescriptive (do this), not diagnostic (detect this anti-pattern in output).
  - Anthropic's red teaming identifies harmful capabilities. Not output quality degradation patterns.
  - The closest parallel is perhaps coding anti-pattern catalogs (Fowler's refactoring smells, Brown et al.'s AntiPatterns book) - but these are for human-written code, not LLM-generated prose/code.
- **Field vs Novel:** **No field parallel found.** The slopodar (18 named anti-patterns across prose, relationship, code, governance, and analytical categories) appears to be a genuine novel contribution. The structural pattern (named taxonomy of failure modes with detection criteria) is well-established in software engineering; the application to LLM output quality is not found in published literature. Key patterns like "sycophantic drift" are discussed in the alignment literature, but not as a named entry in a practitioner's diagnostic taxonomy with specific detection criteria.
- **Caveat:** The slopodar is grounded in operational experience from the pilot study, not controlled research. Its validity is experiential, not experimentally validated. This is an honest limitation, not a weakness - engineering instruments do not require experimental validation, they require operational effectiveness.

### Adversarial Dataset Construction

- **Status:** emerging, partial coverage
- **Key Extraction:**
  - PyRIT's dynamic prompt templates enable systematic generation of adversarial inputs across harm categories. This is the closest to "adversarial dataset construction" in published tooling.
  - SWE-smith (May 2025) from the SWE-bench team enables construction of training/evaluation datasets from GitHub repos - not adversarial per se, but the methodology of constructing evaluation samples from real artifacts is relevant.
  - garak (https://github.com/leondz/garak/) provides probe libraries - collections of adversarial inputs organised by vulnerability category.
  - No published best practices found for constructing samples that trigger specific quality failure modes (as opposed to security failures).
- **Field vs Novel:** The field provides tooling for adversarial prompt generation and vulnerability scanning. **Field coverage ends at security-oriented adversarial testing.** The project's concern - constructing samples that trigger quality failures like sycophantic drift, epistemic theatre, or analytical lullaby - has no published methodology. The project's catch-log (docs/internal/weaver/catch-log.tsv) records control firing events, which could serve as the basis for adversarial dataset construction from operational experience.
- **Caveat:** This is a genuine gap in the field. Filling it would be a contribution worth publishing.

### Finding Severity Classification for AI Systems

- **Status:** partial coverage from multiple sources
- **Key Extraction:**
  - OWASP uses standard risk rating (likelihood x impact) but adapted for LLM context.
  - Microsoft AI Red Team uses findings classified by severity but published methodology for the classification itself is not detailed in the PyRIT announcement.
  - Anthropic's RSP uses AI Safety Levels (ASL-1 through ASL-4) for model capability thresholds, not individual finding severity.
  - No standardised severity scale for AI quality/integrity findings found (as opposed to security findings).
- **Field vs Novel:** Security finding severity scales exist (CVSS, OWASP risk rating). **No published severity scale for LLM output quality findings.** The project's distinction between "right answer wrong work" (passes tests but wrong causal path - phantom green light) and outright failures is a severity distinction the field has not formalised.
- **Caveat:** Severity classification for quality failures may not need a new scale - existing software quality classifications may suffice if adapted. The load-bearing question is whether LLM quality failures have failure modes different enough from traditional software to warrant a dedicated scale.

---

## Summary: Field Coverage Boundaries

| Topic | Field Coverage | Project Contribution |
|---|---|---|
| Task-completion benchmarks | Strong (SWE-bench, WebArena, OSWorld) | Cost + trajectory quality as additional dimensions |
| Agent eval frameworks | Strong (Inspect AI) | Multi-model convergence (darkcat alley), verifiable/taste distinction |
| Trace-level evaluation | Emerging (OpenAI trace grading) | Process-level quality assessment beyond tool call logging |
| Eval infrastructure | Emerging (Inspect, Braintrust, LangSmith) | Gate-first development, deterministic polecat execution |
| Red teaming methodology | Established for security (Anthropic, Microsoft, OWASP) | Quality/integrity adversarial review (read-only analysis, not attack) |
| Multi-model review | Theoretical basis in N-version programming | Applied to LLM code review (darkcat alley, bin/triangulate) |
| Output anti-pattern taxonomy | **Not found** | Slopodar (18 named patterns with detection criteria) |
| Adversarial quality datasets | **Not found** | catch-log as operational basis for dataset construction |
| Eval-driven development | Emerging (unnamed) | Engineering loop with verifiable/taste-required distinction |
