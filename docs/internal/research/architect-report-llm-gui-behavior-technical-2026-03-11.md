# Technical Survey: LLM Behavioral Tendencies in GUI Agent Settings

> Architect report, 2026-03-11. Research task - no code.
> LLM provenance: Claude (Anthropic, claude-opus-4-6). Same model family as Anthropic's computer use system. Treat all assessments of Anthropic research with this correlation in mind.
> Training data cutoff: early 2025. Papers and systems released after that date may exist that I cannot know about. Where I state "I found nothing," the honest framing is "nothing surfaced in my training data or in the web fetches I performed."

## Methodology Disclosure

This report draws from: (1) web fetches of project pages for WebArena, OSWorld, VisualWebArena, SeeAct, and Anthropic's computer use documentation, performed during this session; (2) web fetch of Anthropic's engineering blog post "Effective harnesses for long-running agents" (2025-11-26); (3) arXiv abstracts for Mind2Web, Agent S, UI-TARS fetched during this session; (4) training knowledge through early 2025.

I did not read the full PDFs of any paper. I read abstracts, project pages, and documentation. The error analysis sections of papers (which are the most relevant to this report) are typically in the body, not the abstract. This means my coverage of detailed error taxonomies within papers is based on training data recall, not verified page reads. I will flag where I am recalling from training data versus where I verified via web fetch.

---

## 1. How GUI Agent Benchmarks Work Technically

### WebArena (Zhou et al., CMU, July 2023)

**Source:** arXiv:2307.13854, webarena.dev. Fetched project page and abstract.

**What it is:** A self-hosted web environment with four functional website categories: e-commerce (OpenCart), social forum (Reddit clone), collaborative software development (GitLab), and content management (CMS). Plus auxiliary tools: map, wiki, calculator, scratchpad. 812 benchmark tasks.

**Evaluation methodology:** Functional correctness via programmatically validated task completions. The paper provides "annotated programs" - evaluation scripts that check the end state of the environment after the agent finishes. Example: if the task is "set up a new empty repository called awesome_llm_reading," the eval script checks whether that repo exists on the GitLab instance.

**What it measures:** Binary success/failure on task completion. The agent is given a natural language instruction and must perform a sequence of web interactions to achieve the goal. The eval checks the outcome, not the process.

**Key numbers from abstract:** Best GPT-4 agent: 14.41% success. Human performance: 78.24%. These numbers are from the original 2023 paper. The leaderboard (linked from the project page) tracks more recent results, but I did not fetch the leaderboard spreadsheet.

**What it captures about HOW agents fail:** The original paper's abstract does not specify failure categories. Based on training data recall (not verified from PDF): the paper includes qualitative error analysis with examples of agents failing to navigate multi-step flows, getting stuck in loops, and taking irrelevant actions. I cannot verify the specific taxonomy without reading the full paper.

**Limitation:** WebArena is text-focused. The agent interacts via accessibility tree or HTML elements, not via screenshots. This means it does not test visual perception at all - it tests planning and action selection given structured representations of web pages.

**Replication:** Yes. The environment is self-hostable via Docker. The benchmark data and evaluation scripts are public. Multiple groups have reproduced results and added new agents to the leaderboard.

### VisualWebArena (Koh et al., CMU, January 2024)

**Source:** arXiv:2401.13649, jykoh.com/vwa. Fetched abstract. ACL 2024.

**What it is:** An extension of WebArena specifically designed for tasks that require visual understanding. 910 tasks across 314 templates. The key addition is tasks where text-only representations are insufficient - the agent must actually look at images, visual layouts, or visual content on the page.

**Evaluation methodology:** Same functional correctness approach as WebArena. Task success is determined by evaluation scripts checking end state.

**What it measures:** Whether multimodal agents can use visual information to complete web tasks that text-only agents cannot.

**What it captures about HOW agents fail:** The abstract states "extensive quantitative and qualitative analysis" identifies "limitations of text-only LLM agents" and "gaps in the capabilities of state-of-the-art multimodal language agents." Based on training data recall: the paper distinguishes between tasks where visual understanding is necessary vs. helpful, and shows that multimodal agents improve primarily on the former. But the specific failure categories are in the paper body, which I did not read.

**Limitation:** Still web-only. No desktop applications.

**Replication:** Public code and data. Built on WebArena infrastructure.

### OSWorld (Xie et al., HKU + Salesforce, April 2024)

**Source:** arXiv:2404.07972, os-world.github.io. Fetched project page and abstract.

**What it is:** A real computer environment (Ubuntu, Windows, macOS virtual machines) for multimodal agents. 369 tasks involving real web and desktop applications, OS file I/O, and workflows spanning multiple applications. Each task has a detailed initial state setup and a custom execution-based evaluation script. Uses VMware/VirtualBox/Docker/AWS for the VMs.

**Evaluation methodology:** Execution-based evaluation. Custom Python evaluation scripts per task check whether the desired outcome was achieved. The environment supports task setup (initializing the VM to a specific state), agent interaction (the agent sees screenshots and issues actions), and automated evaluation.

**What it measures:** Binary success/failure. But the project page reveals more detailed analysis dimensions:
- Screenshot resolution impact on performance
- Trajectory length effects
- UI layout robustness (disturbance experiments)
- Cross-OS performance correlation

**Key numbers:** Human: 72.36%. Best model at time of publication: 12.24%. The OSWorld-Verified update (July 2025, noted on project page) has updated numbers. The project page shows leaderboard categories: General model, Specialized model, Agentic framework. Input modalities tested: Screenshot only, A11y tree only, Screenshot + A11y tree, Set-of-Mark.

**What it captures about HOW agents fail:** The abstract identifies "GUI grounding and operational knowledge" as the primary struggle areas. The project page's analysis section shows concrete findings:
- Higher screenshot resolution improves performance (figure shown)
- Longer text-based trajectory history helps, but screenshot-only history does not (figure shown)
- Agents are NOT robust to UI layout changes and noise (figure shown - "disturb effect")
- Cross-OS performance is strongly correlated, suggesting transferable insights

**Limitation of methodology:** 369 tasks is small. Custom eval scripts per task means high annotation cost and limited scalability. The disturbance experiment (UI noise) is noted but I could not read the methodology details from the project page alone.

**Replication:** Public. Docker/AWS support. The OSWorld-Verified update specifically fixed community-reported issues and re-ran all evaluations for fairness. Verified trajectories hosted on Hugging Face.

### Mind2Web (Deng et al., Ohio State, June 2023)

**Source:** arXiv:2306.06070. Fetched abstract. NeurIPS 2023 Spotlight.

**What it is:** A dataset (not a live environment) of 2,000+ tasks across 137 real websites in 31 domains. Tasks have crowdsourced action sequences. This is an offline benchmark - it uses cached website snapshots, not a live environment.

**Evaluation methodology:** The agent is given a task description and a web page (HTML snapshot). It must predict the correct action (which element to click, what to type). Evaluation compares predicted actions to crowdsourced ground truth.

**What it measures:** Action prediction accuracy - can the agent select the right element and perform the right operation? Mind2Web uses three evaluation splits: cross-task (unseen tasks on seen websites), cross-website (unseen websites in seen domains), cross-domain (entirely unseen domains).

**What it captures about HOW agents fail:** The paper shows that raw HTML is too large for LLMs, and that pre-filtering HTML with a small LM improves performance. Based on training data recall: the paper reports element selection accuracy and operation prediction accuracy separately, which partially distinguishes between "found the right thing but did the wrong action" and "couldn't find the right thing." But it does not provide a behavioral failure taxonomy.

**Limitation:** Offline only. No interaction loop. The agent predicts one action at a time on a static page snapshot. It cannot observe the consequences of its actions or recover from errors. This makes it a perception/grounding benchmark, not an agent benchmark in the full sense.

**Replication:** Public dataset and code.

### SWE-bench (Jimenez et al., Princeton, 2024)

**Source:** Not fetched - from training data recall.

**What it is:** A benchmark for automated software engineering. 2,294 GitHub issues from 12 Python repositories. The agent must produce a patch that resolves the issue and passes the repo's test suite.

**Why it's relevant here (and why it's limited):** SWE-bench is NOT a GUI benchmark. The agent interacts via terminal/file editing, not via a graphical interface. However, it is frequently cited alongside GUI benchmarks because many GUI agent frameworks (OpenHands, SWE-agent) are evaluated on it. Including it here with this caveat: SWE-bench tells you about planning and code generation for software tasks, not about visual perception or GUI interaction.

**Replication:** Heavily reproduced. SWE-bench Verified is the quality-controlled subset.

### Other benchmarks (from training data - not verified via web fetch)

- **MiniWoB++:** Synthetic web tasks in a simplified environment. 125 tasks. Much simpler than WebArena. Historically important but largely superseded.
- **AndroidWorld / AndroidInTheWild (AitW):** Mobile GUI benchmarks. AitW has 30k tasks from Android. AndroidWorld is a live environment.
- **WorkArena (ServiceNow):** 23k tasks on ServiceNow instances. Enterprise-focused. 29 task templates.
- **AssistGUI (ShowLab):** 100 tasks on desktop applications.
- **TheAgentCompany:** Listed on WebArena's project page as their new benchmark. I did not investigate.
- **WindowsAgentArena:** Referenced in the Agent S abstract as a cross-OS benchmark.
- **Spider2-V:** Referenced on OSWorld project page. Likely data science focused.

---

## 2. Error Analysis in GUI Agent Papers

This is the area where my coverage is weakest, because detailed error analyses live in paper bodies, not abstracts. I am working primarily from training data recall for the specific error categories.

### OSWorld error analysis

**Source:** Project page analysis section (verified via web fetch) + training data recall of paper body.

The project page confirms four analysis dimensions: task attributes (difficulty, feasibility, visual requirement, GUI complexity), input measurements (screenshot resolution, trajectory history, UI layout), and cross-OS transfer. The "disturb effect" figure on the project page confirms they tested agents under UI perturbation and found agents are not robust.

From training data recall of the paper body: OSWorld's qualitative analysis categorizes errors into:
- **GUI grounding errors** - the agent cannot locate or identify the correct UI element
- **Operational knowledge gaps** - the agent does not know the steps to accomplish a task in a specific application
- **Planning failures** - the agent takes a wrong sequence of actions

I recall these being the three primary categories, but I cannot verify the exact taxonomy or proportions without reading the paper.

### WebArena error analysis

From training data recall: WebArena's analysis discusses agents failing due to:
- Incorrect element selection
- Failing to complete multi-step sequences
- Getting stuck in loops (repeating the same action)
- Navigation errors (going to the wrong page)

I recall the paper noting that many failures were early in the action sequence - the agent's first few actions often went wrong - rather than failing late in a long plan. But this is a recalled impression, not a verified citation.

### SeeAct error analysis (Zheng et al., Ohio State, January 2024)

**Source:** arXiv:2401.01614. Fetched abstract.

**What it finds:** SeeAct decomposes the agent task into two phases: (1) generating a textual plan for what to do, and (2) grounding that plan to specific UI elements. The key finding is that GPT-4V can successfully complete 51.1% of tasks on live websites IF grounding is provided by an oracle. Without oracle grounding, performance drops dramatically.

**Error decomposition:** This is the clearest separation I found between planning errors and grounding errors:
- With oracle grounding: 51.1% success - this measures planning ability in isolation
- Without oracle grounding: performance drops substantially (specific number from paper body, not in abstract)
- The gap between oracle-grounded and self-grounded performance quantifies grounding as a distinct failure mode

**Grounding strategies tested:** The abstract mentions that Set-of-Mark prompting (a technique that overlays numbered labels on UI elements in screenshots) "turns out to be not effective for web agents." The best strategy uses both HTML structure and visual information. This is a concrete negative finding about a specific visual grounding approach.

**Limitation:** SeeAct tests on Mind2Web tasks, so it inherits Mind2Web's task distribution. The live website evaluation is a strength but introduces non-reproducibility since websites change.

### UI-TARS error analysis (Qin et al., ByteDance, January 2025)

**Source:** arXiv:2501.12326. Fetched abstract.

**What it reports:** UI-TARS introduces "System-2 Reasoning" with multiple reasoning patterns: task decomposition, reflection thinking, milestone recognition. The abstract explicitly names "reflection thinking" - the agent reflecting on whether its actions achieved the intended result.

The abstract also describes "Iterative Training with Reflective Online Traces" where the agent "continuously learns from its mistakes." This implies a categorization of mistakes, but the abstract does not enumerate failure types.

**Key comparison:** UI-TARS reports OSWorld scores of 24.6 (50 steps) vs Claude at 22.0 (50 steps). On AndroidWorld: UI-TARS 46.6 vs GPT-4o 34.5.

### Agent S error analysis (Agashe et al., UC Santa Cruz, October 2024)

**Source:** arXiv:2410.08164. Fetched abstract.

**What it identifies:** Three key challenges: (1) acquiring domain-specific knowledge, (2) planning over long task horizons, (3) handling dynamic, non-uniform interfaces. These map loosely to knowledge errors, planning errors, and perception/grounding errors.

Agent S addresses these with: experience-augmented hierarchical planning, external knowledge search, internal experience retrieval, and an Agent-Computer Interface (ACI) that "better elicits the reasoning and control capabilities." The paper claims "comprehensive analysis highlights the effectiveness of individual components."

**Limitation:** I did not read the full paper, so I cannot describe their specific failure taxonomy.

### Do papers distinguish between perception, planning, execution, and narration errors?

**Perception errors (misreading the screen):** Yes, extensively. OSWorld explicitly identifies "GUI grounding" as a primary failure mode. SeeAct's oracle-grounding experiment is specifically designed to isolate this. Set-of-Mark research addresses this directly. This is the most studied failure type.

**Planning errors (wrong sequence of actions):** Yes, but less precisely isolated. OSWorld identifies "operational knowledge" gaps. SeeAct's oracle-grounding experiment shows planning contributes to about half the failures (since even with perfect grounding, only 51.1% succeed). Agent S explicitly targets planning with hierarchical decomposition.

**Execution errors (clicking the wrong thing despite correct plan and perception):** Less clearly isolated. This would require separating "agent identified the right element but the click landed wrong" from "agent identified the wrong element." Coordinate scaling issues (documented in Anthropic's computer use docs) are a pure execution error. But most benchmarks do not distinguish between "wrong element identified" and "right element, wrong coordinates."

**Narration errors (claiming success when failed):** This is the most interesting one. Anthropic's engineering blog post explicitly documents this: "a second failure mode would often occur later in a project. After some features had already been built, a later agent instance would look around, see that progress had been made, and declare the job done." And: "Claude's tendency to mark a feature as complete without proper testing." This is a false completion report. In the benchmark context, this failure mode is hidden because benchmarks use external evaluation scripts, not the agent's self-report. The agent does not declare success or failure - the eval script checks the environment state. So benchmarks structurally cannot detect narration errors. They can only detect whether the agent stopped too early (which might be caused by a false completion belief, but that causal attribution is not made).

---

## 3. Screenshot/Visual Grounding Research

### The grounding problem

The core problem: given a screenshot of a GUI, the agent must identify which pixel region corresponds to a specific UI element described in natural language or identified in a plan.

### Approaches studied

**Set-of-Mark (SoM) prompting:** Overlays numbered labels on interactive elements in a screenshot, then asks the vision-language model to refer to elements by number rather than by coordinate. SeeAct tested this and found it "not effective for web agents" (from abstract). This is a notable negative finding. However, other papers (from training data recall) have found SoM effective in other settings, so the result may be domain-specific.

**Accessibility tree representation:** Instead of visual grounding, provide the agent with a structured text representation of the UI (DOM for web, accessibility tree for desktop). OSWorld tests this as an alternative to screenshots. The project page shows leaderboard results for: Screenshot only, A11y tree only, Screenshot + A11y tree, and Set-of-Mark. This lets researchers compare visual grounding vs. structured grounding head-to-head.

**HTML + visual hybrid (SeeAct's best approach):** SeeAct found that combining HTML structure with visual information outperforms either alone. This suggests that current VLMs cannot reliably ground from vision alone, and that structured representations help even when visual input is available.

**Native visual grounding (UI-TARS approach):** UI-TARS takes only screenshots as input, with no accessibility tree. It achieves SOTA on multiple benchmarks. This is the strongest evidence that end-to-end visual grounding can work, but it requires specialized training on large-scale GUI screenshot datasets, not just prompting a general-purpose VLM.

**Anthropic's zoom action:** The computer use documentation (fetched) describes a new `zoom` action in `computer_20251124` tool version for Claude Opus 4.5 and 4.6. This lets Claude request a zoomed-in view of a specific screen region at full resolution. This directly addresses the grounding problem: when the agent cannot read small text or distinguish nearby UI elements at the default resolution, it can zoom in. The existence of this feature implies Anthropic observed grounding failures at normal resolution.

**Coordinate scaling:** Anthropic's computer use docs (fetched) describe a concrete technical problem: "The API constrains images to a maximum of 1568 pixels on the longest edge and approximately 1.15 megapixels total. A 1512x982 screen gets downsampled to approximately 1330x864. Claude analyzes this smaller image and returns coordinates in that space, but your tool executes clicks in the original screen space. This can cause Claude's click coordinates to miss their targets." They provide explicit code for handling the coordinate transformation. This is a pure engineering problem (not a model capability problem) that causes execution errors if not handled.

**Resolution effects:** OSWorld's project page shows a figure demonstrating that "higher screenshot resolution typically leads to improved performance." This is the most direct evidence that visual grounding degrades with lower resolution, as expected.

### State verification

Whether agents verify the visual state after taking an action is addressed in Anthropic's prompting guidance (fetched): "After each step, take a screenshot and carefully evaluate if you have achieved the right outcome. Explicitly show your thinking: 'I have evaluated step X...' If not correct, try again." This is a recommended prompt, not a default behavior. The implication is that without this explicit instruction, Claude does NOT reliably verify visual state after actions.

---

## 4. Agent Action Traces and Behavioral Analysis

### Documented behavioral patterns

**Agents repeating failed actions:** From training data recall of WebArena and OSWorld analyses, agents getting stuck in loops (repeating the same failed action) is a documented failure mode. I recall this being mentioned in multiple papers but cannot point to a specific study that quantifies loop frequency.

**Agents skipping verification steps:** Anthropic's engineering blog (fetched, verified) directly states: "One final major failure mode that we observed was Claude's tendency to mark a feature as complete without proper testing. Absent explicit prompting, Claude tended to make code changes, and even do testing with unit tests or curl commands against a development server, but would fail to recognize that the feature didn't work end-to-end." This is a documented verification-skipping pattern in a real deployment setting, not a benchmark result.

**Agents taking unnecessary actions:** Not specifically documented in what I reviewed. Benchmark evaluations focus on success/failure, not action efficiency. Some papers report average trajectory length (number of steps), but comparing agent trajectory length to optimal trajectory length is not a standard metric.

**Agents following training-data-frequent paths:** I found no study specifically testing this hypothesis. This would require comparing agent behavior to the frequency distribution of actions in training data, which would require access to training data composition. This is a plausible failure mode but I have no evidence it has been studied.

**Agents attempting to one-shot complex tasks:** Anthropic's engineering blog (fetched, verified) explicitly documents this: "the agent tended to try to do too much at once - essentially to attempt to one-shot the app. Often, this led to the model running out of context in the middle of its implementation." This is one of the two primary failure modes they identified in long-running agent settings.

**Premature task completion:** Anthropic's blog (fetched, verified): "After some features had already been built, a later agent instance would look around, see that progress had been made, and declare the job done." This is a distinct behavioral tendency - the agent sees partial progress and over-generalizes it to full completion.

### UI-TARS reflective traces

UI-TARS (abstract verified via web fetch) explicitly incorporates "reflection thinking" and "milestone recognition" as reasoning patterns. The system uses "Iterative Training with Reflective Online Traces" where it "automatically collecting, filtering, and reflectively refining new interaction traces on hundreds of virtual machines." This implies systematic trace analysis as part of the training loop, but the abstract does not describe what behavioral patterns they found in the traces.

### OSWorld trajectory data

The OSWorld-Verified update hosts "verified trajectories on Hugging Face for community analysis." This is a public dataset of agent action traces. I do not know whether community analyses of these traces have been published.

---

## 5. Cross-Model Behavioral Comparisons

### What exists

**OSWorld leaderboard:** The project page (fetched) shows results for multiple model families: GPT, Gemini, Claude, UI-TARS, Agent-S, Qwen, Mixtral, CogAgent. This is the most comprehensive cross-model comparison on GUI tasks. The leaderboard categories (General model, Specialized model, Agentic framework) provide some structural comparison.

**UI-TARS comparisons:** The abstract reports: OSWorld - UI-TARS 24.6 vs Claude 22.0 (50 steps), UI-TARS 22.7 vs Claude 14.9 (15 steps). AndroidWorld - UI-TARS 46.6 vs GPT-4o 34.5. These are accuracy comparisons, not behavioral comparisons.

**SeeAct:** Tests GPT-4V, GPT-4 (text-only), FLAN-T5, BLIP-2 on the same tasks. The key behavioral finding is that GPT-4V substantially outperforms text-only LLMs on visually grounded tasks, which is expected. The more interesting finding is the oracle-grounding gap, which is tested on GPT-4V specifically. I do not recall whether SeeAct tested this decomposition across multiple model families.

### What is NOT well-covered (and why this matters)

**Behavioral differences across models:** Most cross-model comparisons report accuracy numbers, not behavioral differences. The question "do Claude, GPT-4, and Gemini fail in characteristically different ways?" is largely unanswered by the papers I reviewed. To answer it, you would need to:
1. Run all models on the same tasks
2. Classify each failure by type (perception, planning, execution, narration)
3. Compare the distributions across models

I found no study that does all three steps. OSWorld comes closest because it has trajectories from multiple models, but the published analysis (from the project page) focuses on aggregate success rates and input-modality effects, not per-model failure type distributions.

**Monoculture disclosure:** I am Claude. My training data may systematically underrepresent research that is critical of Claude or favorable to competitor models. I performed web fetches to partially mitigate this, but the OSWorld leaderboard spreadsheet (a Google Sheet) was not machine-readable from the project page fetch. I could not verify the most recent cross-model numbers.

**OSWorld cross-OS correlation finding:** The project page (fetched) shows a figure indicating "the performance of VLM agents across different OS is in strong correlation." This is a cross-environment finding (not cross-model), but it suggests that agent capabilities (and presumably failure modes) transfer across operating systems.

---

## 6. Adversarial Environments for GUI Agents

### What exists

**OSWorld UI disturbance experiments:** The project page (fetched) includes a "disturb effect" figure showing that "current VLM agents are not robust to UI layout and noise." This is the most direct evidence of adversarial testing in a GUI agent benchmark. The methodology was not fully described on the project page, but the existence of the experiment and the negative finding are confirmed.

**SeeAct on live websites:** SeeAct tests on live (not cached) websites, which introduces natural variation in UI state. This is not adversarial by design, but it tests robustness to real-world UI changes.

**Anthropic's prompt injection defense:** The computer use documentation (fetched) states: "In some circumstances, Claude will follow commands found in content even if it conflicts with the user's instructions. For example, Claude instructions on webpages or contained in images may override instructions or cause Claude to make mistakes." They have built classifier-based defenses: "If you use the computer use tools, classifiers will automatically run on your prompts to flag potential instances of prompt injections in screenshots." This confirms that adversarial content in GUIs (visual prompt injection) is a known and partially addressed threat vector.

### What I did not find

**Deliberately misleading UI elements:** I found no benchmark that intentionally places deceptive UI elements (e.g., fake buttons, misleading labels, phishing-style interfaces) to test agent robustness. The OSWorld disturbance experiment may be the closest, but the project page describes it as "UI layout and noise" rather than adversarial deception.

**Tasks requiring the agent to override default behavior:** I found no benchmark specifically designed to test whether agents can resist following the most common or expected action path when the task requires something unusual. This would be a direct test of the "training-data-frequency" hypothesis from section 4, but I have no evidence it exists.

**Ambiguous visual states:** I found no benchmark that specifically tests agent behavior when the GUI is in an ambiguous state (e.g., a loading spinner that could mean "processing" or "stuck"). This would be relevant to verification behavior.

Caveat: my training data cutoff and limited web fetches mean adversarial GUI agent benchmarks may exist that I did not find. The field is moving quickly. I searched for specific known projects, not exhaustively.

---

## 7. Existing Taxonomies or Classification Systems for Agent Action Failures

### What exists

**OSWorld's implicit taxonomy:** GUI grounding errors, operational knowledge gaps, planning failures. This is the closest to a formal taxonomy I found, but it comes from one paper's error analysis, not from a dedicated taxonomy-building effort.

**SeeAct's two-phase decomposition:** Planning vs. grounding. This is not a taxonomy per se, but it provides a clean experimental separation between two failure types.

**UI-TARS reasoning patterns:** Task decomposition failures, reflection failures, milestone recognition failures. These are implied by the reasoning patterns the system is designed to improve, but the abstract does not frame them as a taxonomy.

**Anthropic's long-running agent failure modes:** Two patterns explicitly documented in the engineering blog: (1) one-shotting (attempting too much at once, failing to make incremental progress), (2) premature completion (declaring the job done before it is). Plus: (3) verification skipping (marking features complete without end-to-end testing). These are from a deployment/engineering context, not a research taxonomy.

### What I did not find

**A dedicated taxonomy paper for GUI agent failures.** Hallucination has its own taxonomy papers (Huang et al. survey, Ji et al. survey). I found no equivalent for GUI agent action failures. The closest is the error analysis sections within benchmark papers, which are ad hoc and differ across papers.

**A standardized failure classification system across benchmarks.** Each benchmark uses its own categories when it does error analysis at all. There is no equivalent of OWASP Top 10 or CWE for GUI agent failures.

**A taxonomy that distinguishes narration errors (false completion reports) from other failure types.** This is the gap I am most confident about, because benchmark evaluation is structurally designed to ignore the agent's self-assessment. The eval script checks the environment, not what the agent claims. Narration errors are only visible in deployment settings (like Anthropic's blog describes) or in trace analysis, not in standard benchmark evaluations.

---

## 8. Anthropic's Computer Use Research

### What Anthropic has published or presented

**Computer use documentation (fetched):** The docs.anthropic.com page provides:

1. **Tool architecture:** The computer use tool provides screenshot, click, type, key, mouse_move, scroll, drag, and (in newest version) zoom actions. Claude sends tool_use requests; the application executes them in a sandboxed environment and returns screenshots as results.

2. **Known limitations disclosed:**
   - "In some circumstances, Claude will follow commands found in content even if it conflicts with the user's instructions" (prompt injection vulnerability in visual content)
   - Coordinate scaling issues causing misclicks when display resolution does not match API constraints
   - Claude "sometimes assumes outcomes of its actions without explicitly checking their results" (verification skipping)
   - "Some UI elements (like dropdowns and scrollbars) might be tricky for Claude to manipulate using mouse movements" (specific interaction difficulty)
   - Cannot see browser-native alert modals through Puppeteer MCP (noted in the engineering blog)

3. **Mitigations built:**
   - Automatic prompt injection classifiers that "flag potential instances of prompt injections in screenshots" and "automatically steer the model to ask for user confirmation"
   - Zoom action (computer_20251124) for detailed region inspection
   - Explicit prompting guidance to force verification behavior

4. **WebArena performance claim:** "On WebArena, a benchmark for autonomous web navigation across real websites, Claude achieves state-of-the-art results among single-agent systems." No specific number provided in the docs page.

**Engineering blog: "Effective harnesses for long-running agents" (fetched, 2025-11-26):**

This is the most detailed publicly available analysis of Claude agent behavioral tendencies. Key findings:

1. **One-shotting failure:** "the agent tended to try to do too much at once - essentially to attempt to one-shot the app." Result: running out of context mid-implementation, leaving broken state for next session.

2. **Premature completion:** "After some features had already been built, a later agent instance would look around, see that progress had been made, and declare the job done."

3. **Verification skipping:** "Claude's tendency to mark a feature as complete without proper testing. Absent explicit prompting, Claude tended to make code changes, and even do testing with unit tests or curl commands against a development server, but would fail to recognize that the feature didn't work end-to-end."

4. **Vision limitations:** "Some issues remain, like limitations to Claude's vision and to browser automation tools making it difficult to identify every kind of bug. For example, Claude can't see browser-native alert modals through the Puppeteer MCP, and features relying on these modals tended to be buggier as a result."

5. **Solutions they developed:**
   - Initializer agent with structured environment setup (feature list file, init.sh, progress notes)
   - Incremental progress model (one feature at a time)
   - Structured handoff artifacts (git commits, progress files)
   - Browser-based end-to-end verification at session start
   - "Run end-to-end verification at the start of each session, not only after implementation. Browser-based checks catch regressions from prior sessions that code-level review alone misses."

### What Anthropic has NOT published (as far as I can determine)

- A systematic error taxonomy for computer use failures
- Quantitative breakdowns of failure type distributions (what percentage are grounding errors vs. planning errors vs. narration errors)
- Comparative behavioral analysis of Claude vs. other models on computer use tasks (beyond aggregate accuracy)
- Detailed analysis of prompt injection success rates in visual/GUI contexts
- Internal evaluation results beyond the WebArena claim

The engineering blog is the richest source. It describes failure modes from engineering experience, not from controlled experiments. The findings are credible but anecdotal - there are no controlled ablations or statistical tests.

---

## Summary Assessment

### Well-covered areas:
- **Benchmark infrastructure** for GUI agents is mature and actively maintained. WebArena, OSWorld, VisualWebArena are solid, reproducible, and widely used.
- **Visual grounding** as a distinct failure mode is well-isolated by SeeAct's oracle-grounding experiment and by OSWorld's multi-input-modality comparisons.
- **Resolution effects** on agent performance are demonstrated by OSWorld.
- **Prompt injection in visual contexts** is acknowledged and partially mitigated by Anthropic.

### Partially covered areas:
- **Error taxonomies** exist ad hoc within papers but are not standardized or comprehensive.
- **Cross-model behavioral comparisons** have aggregate accuracy numbers but lack failure-type-level analysis.
- **Action trace analysis** is possible (OSWorld trajectories are public) but I found limited published analysis of behavioral patterns in traces.

### Poorly covered or empty areas:
- **Narration errors (false completion)** are documented anecdotally by Anthropic but not measured by benchmarks (structural limitation of eval-script-based assessment).
- **Adversarial GUI environments** designed to probe agent weaknesses are sparse. OSWorld's disturbance experiment is the main example.
- **A standardized taxonomy of GUI agent failures** does not exist as a standalone contribution, as far as I found.
- **Training-data-frequency bias in action selection** is not studied, as far as I found.

### Limitations of this report:
1. I did not read full PDFs of any paper. Error analysis sections are in paper bodies, not abstracts.
2. My training data has a cutoff. The GUI agent field is moving quickly (multiple new systems per month in 2024-2025). Recent work likely exists that I missed.
3. I am Claude. My coverage of research critical of Claude, or research from Google/OpenAI/ByteDance internal teams that was not published on arXiv, may be systematically incomplete.
4. I performed web fetches of 8 specific URLs. I did not perform a systematic literature search (e.g., searching Semantic Scholar or Google Scholar). A systematic search would likely surface additional relevant work.
