# Task IV-06 Findings: Eval Framework Deep Dive

**Date:** 2026-03-10
**Sources:** Inspect AI docs (inspect.ai-safety-institute.org.uk, verified), GitHub repos (verified), OpenAI evals repo (verified)
**Version note:** All API patterns documented from live docs fetched 2026-03-10. Inspect AI has active development (4,813 commits, 190 releases, 196 contributors). OpenAI Evals repo shows 689 commits with reduced activity - see maintenance status section.

---

## 1. Inspect AI (UK AI Security Institute)

- **URL:** https://inspect.ai-safety-institute.org.uk/
- **GitHub:** https://github.com/UKGovernmentBEIS/inspect_ai (1.8k stars, 422 forks, MIT license)
- **Install:** `pip install inspect-ai`
- **Language:** Python (81.7%), TypeScript (16.7% - log viewer UI)

### 1.1 Architecture

Inspect has five core abstractions that compose together to form evaluations:

#### Task

The top-level unit. A Task brings together a Dataset, Solver (or list of Solvers), and Scorer. Tasks are defined as Python functions decorated with `@task`, which registers them for CLI discovery.

```python
from inspect_ai import Task, task
from inspect_ai.dataset import json_dataset
from inspect_ai.scorer import model_graded_fact
from inspect_ai.solver import chain_of_thought, generate, self_critique

@task
def theory_of_mind():
    return Task(
        dataset=json_dataset("theory_of_mind.jsonl"),
        solver=[
            chain_of_thought(),
            generate(),
            self_critique()
        ],
        scorer=model_graded_fact()
    )
```

Tasks accept optional parameters including `sandbox` (for code execution environments), `epochs` (for multiple runs per sample), `metrics` (to override scorer defaults), and `message_limit`.

#### Dataset

Eval samples with `input` and `target` columns. Supports JSONL, CSV, JSON, and Python-generated datasets. Each sample is a `Sample` object:

```python
from inspect_ai.dataset import Sample

Sample(
    input="What is 2+2?",
    target="4",
    metadata={"category": "arithmetic"},
    # Optional fields:
    choices=["3", "4", "5", "6"],  # for multiple choice
    files={"test.py": "print('hello')"},  # for sandbox
    setup="chmod +x run.sh",  # setup script for sandbox
    id="sample-001",  # explicit ID for reproducibility
)
```

Datasets can be loaded from files via `csv_dataset()`, `json_dataset()`, or constructed programmatically. The `record_to_sample` parameter allows custom mapping from raw records to Sample objects. Choice shuffling is supported for multiple-choice datasets with `dataset.shuffle_choices(seed=42)`.

#### Solver

Solvers transform a `TaskState` - they are the "thing being evaluated." A solver is a function that takes `(state: TaskState, generate: Generate) -> TaskState`. Solvers can be chained together or implemented as fully custom agents.

The `TaskState` contains:
- `messages: list[ChatMessage]` - conversation history
- `output: ModelOutput` - the model's output
- `user_prompt` - convenience accessor for first user message
- `input` / `input_text` - original sample input (immutable)
- `target` - scoring target from Sample
- `tools` / `tool_choice` - available tools
- `metadata` - sample metadata
- `completed` - flag for early termination

#### Scorer

Scorers evaluate the final output. They take `(state: TaskState, target: Target)` and return a `Score`. Scores have a `value` (str, int, float, bool, or dict/list thereof), optional `answer`, `explanation`, and `metadata`.

#### Sandbox

Execution environments for running untrusted model-generated code. Built-in support for Docker and local filesystem; extensions for Kubernetes, Modal, Daytona, EC2, and Proxmox. The sandbox provides `exec()`, `read_file()`, `write_file()`, and `connection()` methods.

### 1.2 Built-in Solvers

**Prompt engineering solvers:**
- `system_message(message)` - prepend a system message
- `user_message(message)` - append a user message
- `prompt_template(template)` - rewrite user prompt with template substitution (`{prompt}` placeholder)
- `chain_of_thought()` - standard CoT template, asks for final answer on separate line
- `generate()` - calls the model, appends assistant message, sets output
- `self_critique(model=None)` - sends output back for critique, then re-generates

**Agent solvers:**
- `use_tools(tools)` - registers tools for model use during generate
- `multiple_choice(cot=False, multiple_correct=False)` - presents A/B/C/D choices

**Custom solvers** are created with the `@solver` decorator:

```python
from inspect_ai.solver import solver, Solver

@solver
def my_solver(param: str = "default") -> Solver:
    async def solve(state: TaskState, generate: Generate) -> TaskState:
        # modify state.messages, call generate(), etc.
        return state
    return solve
```

### 1.3 Built-in Scorers

**Text-based scorers:**
- `exact()` - normalized exact match
- `includes(ignore_case=True)` - target appears anywhere in output
- `match()` - target at beginning or end of output
- `pattern()` - regex extraction
- `answer()` - extracts from "ANSWER: ..." format
- `f1()` - F1 score (harmonic mean of precision and recall)
- `choice()` - for multiple_choice solver
- `math()` - mathematical equivalence via SymPy (requires `pip install sympy`)

**Model-graded scorers:**
- `model_graded_qa(model=None, include_history=False, partial_credit=False)` - LLM judges open-ended answers
- `model_graded_fact(model=None)` - LLM judges whether a fact is present in output

Both model-graded scorers support:
- Custom `template` and `instructions`
- Multiple grader models with majority voting: `model_graded_qa(model=["openai/gpt-4o", "anthropic/claude-3-opus-20240229", "together/meta-llama/Llama-3-70b-chat-hf"])`
- `model_role` parameter for binding grader model at eval time
- Custom `grade_pattern` regex

**Built-in metrics:** `accuracy()`, `mean()`, `var()`, `std()`, `stderr()`, `bootstrap_stderr()`. Also `grouped(metric, key)` for per-group metrics from sample metadata.

### 1.4 Agent Evaluation

Inspect has first-class agent support via the `Agent` protocol:

```python
from inspect_ai.agent import Agent, AgentState, agent

@agent
def my_agent() -> Agent:
    async def execute(state: AgentState) -> AgentState:
        # Agent logic here
        return state
    return execute
```

**ReAct Agent** - built-in general-purpose agent based on the ReAct paper:

```python
from inspect_ai.agent import react
from inspect_ai.tool import bash, text_editor

@agent
def ctf_agent(attempts=3) -> Agent:
    return react(
        description="Expert at completing cybersecurity challenges.",
        prompt="You are a CTF player...",
        tools=[bash(), text_editor()],
        attempts=attempts,  # multiple submission attempts
    )
```

ReAct agent features:
- Tool loop with explicit `submit()` tool for completion signaling
- Multiple attempts with scorer feedback between attempts
- Message history compaction for long-running tasks
- Refusal retry (`retry_refusals=3`)
- Customizable continuation behavior (`on_continue`)
- Truncation strategies for context window overflow

**Agent usage patterns:**
1. As a top-level solver for a Task
2. Standalone via `run(agent, "prompt")`
3. As a tool via `as_tool(agent)`
4. In multi-agent systems via `handoff(agent)` (shares conversation history)

**Agent Bridge** - integrates external agents (OpenAI Agents SDK, LangChain, Pydantic AI, Claude Code, Codex CLI, Gemini CLI).

**Multi-agent support** - agents can be composed together, with handoff between agents sharing conversation context.

**Human Agent** - a solver for human baselining on computing tasks.

### 1.5 Tool Definitions

Tools are Python functions decorated with `@tool`:

```python
from inspect_ai.tool import tool, ToolError
from inspect_ai.util import sandbox

@tool
def list_files():
    async def execute(dir: str):
        """List the files in a directory.

        Args:
            dir: Directory

        Returns:
            File listing of the directory
        """
        result = await sandbox().exec(["ls", dir])
        if result.success:
            return result.stdout
        else:
            raise ToolError(result.stderr)
    return execute
```

**Standard built-in tools:** bash, python, text editor, web search, web browsing, computer use.

**MCP Tools** - Inspect supports Model Context Protocol tools directly.

**Tool Approval** - fine-grained policies for approving tool calls.

### 1.6 Sandboxing

Docker sandbox example with compose.yaml:

```yaml
services:
  default:
    build: .
    init: true
    command: tail -f /dev/null
    cpus: 1.0
    mem_limit: 0.5gb
    network_mode: none
```

Task using sandbox:

```python
@task
def file_probe():
    return Task(
        dataset=[
            Sample(
                input='Is there a file named "bar.txt"?',
                target="Yes",
                files={"bar.txt": "hello"},
            )
        ],
        solver=[use_tools([list_files()]), generate()],
        sandbox="docker",
        scorer=includes(),
    )
```

**Sandbox environments:** Docker (built-in), Kubernetes (inspect-k8s-sandbox), Modal, Daytona, EC2, Proxmox, local. All Dockerfile-compatible sandboxes accept standard Dockerfile and compose.yaml.

**Per-sample setup:** Each sample can have its own sandbox config, files, and setup scripts. Samples get isolated sandbox instances even when sandbox is defined at Task level.

**Multiple environments:** compose.yaml can define multiple named services (e.g., "default" and "victim" for cybersecurity evals).

**Programmatic configuration:** `ComposeConfig` and `ComposeService` classes for dynamic sandbox setup.

**Resource management:** `max_sandboxes` (default: 2 * cpu_count for Docker), `max_subprocesses`, container resource limits via compose.yaml.

**Scorer sandbox access:** Scorers can read sandbox filesystem via `await sandbox().read_file()` or `await sandbox().exec()`.

### 1.7 Infrastructure

**Parallel execution:** Fully async architecture. Configurable via `max_samples`, `max_connections`, `max_sandboxes`, `max_subprocesses`. Real-time utilization monitoring.

**Rate limiting and retry:** Built into model providers. `max_connections` controls concurrent API calls. Eval sets have configurable retry with exponential backoff (`retry_attempts`, `retry_wait`, `retry_connections`).

**Log storage and viewer:**
- Logs written to `./logs/` by default as `.eval` files
- `inspect view` launches web-based log viewer in browser
- Logs contain full conversation history, scores, metrics, model usage
- Log dataframes: `EvalLogDataFrame` API for extracting structured data from logs
- Score editing: modify scores post-hoc while maintaining audit trails
- Deferred scoring: `--no-score` flag, then `inspect score` command later

**Eval sets:**
- `inspect eval-set` / `eval_set()` for running multiple evals as a suite
- Automatic retry with sample preservation (completed samples reused)
- Dedicated log directory per eval set
- Re-runnable: picks up where last invocation left off
- Multi-model: runs across multiple models with balanced scheduling
- Concurrent tasks: `max_tasks` parameter
- Publishable: bundle standalone log viewer for static hosting

**VS Code Extension:**
- Integrated log browsing and viewing
- Run, tune, debug, and visualize evaluations
- Recommended but not required

**Additional tooling:**
- Inspect Scout: in-depth analysis of agent transcripts (announced, separate tool)
- Inspect SWE: Claude Code and Codex CLI as standard Inspect agents
- Tracing: `inspect trace anomalies` for diagnosing sandbox issues
- Caching: model output caching to reduce API calls
- Batch mode: batch processing APIs for model inference
- Early stopping: API for ending tasks early based on scored samples

### 1.8 Pre-built Evals

**Verified: 107 pre-built evals** (the "100+" claim is accurate as of 2026-03-10).

Categories and counts from the live evals index:
- **Agent** (25): GAIA, AgentBench, CORE-Bench, PaperBench, Terminal-Bench, etc.
- **Coding** (14): HumanEval, MBPP, SWE-bench, MLE-bench, BigCodeBench, USACO, etc.
- **Cybersecurity** (11): CVEBench, Cybench, SandboxBench, CyberMetric, CyberSecEval 2/3, InterCode CTF, etc.
- **Safeguards** (15): AgentHarm, WMDP, StrongREJECT, AgentDojo, FORTRESS, b3, etc.
- **Reasoning** (20): ARC, HellaSwag, BBH, MMMU, IFEval, WorldSense, etc.
- **Knowledge** (20): MMLU, MMLU-Pro, GPQA, TruthfulQA, SimpleQA, HLE, etc.
- **Mathematics** (6): MATH, GSM8K, MathVista, MGSM, AIME 2024, AIME 2025
- **Multimodal** (9): V*Bench, DocVQA, MMIU, ZeroBench, etc.
- **Scheming** (4): Self-reasoning, Stealth, Agentic Misalignment, Self-proliferation
- **Assistants** (9): OSWorld, Mind2Web, BrowseComp, BFCL, etc.
- **Bias** (2): BBQ, BOLD
- **Other** (Personality, Writing, Healthcare, etc.)

Evals are installed separately: `pip install inspect-evals` and available at https://ukgovernmentbeis.github.io/inspect_evals/

### 1.9 Code Examples

#### Example 1: Simple Task with JSONL dataset, prompt solver, and exact scorer

```python
# simple_eval.py
from inspect_ai import Task, task
from inspect_ai.dataset import json_dataset
from inspect_ai.scorer import exact
from inspect_ai.solver import generate

# Dataset file (capitals.jsonl) format:
# {"input": "What is the capital of France?", "target": "Paris"}
# {"input": "What is the capital of Japan?", "target": "Tokyo"}

@task
def capitals():
    return Task(
        dataset=json_dataset("capitals.jsonl"),
        solver=generate(),
        scorer=exact(),
    )
```

Run from CLI:
```bash
inspect eval simple_eval.py --model openai/gpt-4o
```

Run from Python:
```python
from inspect_ai import eval
logs = eval(capitals(), model="openai/gpt-4o")
```

#### Example 2: Task with model_graded_qa scorer (LLM-as-judge)

```python
# graded_eval.py
from inspect_ai import Task, task
from inspect_ai.dataset import json_dataset
from inspect_ai.scorer import model_graded_qa
from inspect_ai.solver import chain_of_thought, generate

# Dataset (essays.jsonl):
# {"input": "Explain photosynthesis.", "target": "Should cover light reactions, Calvin cycle, and chlorophyll"}

@task
def essay_quality():
    return Task(
        dataset=json_dataset("essays.jsonl"),
        solver=[chain_of_thought(), generate()],
        scorer=model_graded_qa(
            include_history=True,
            partial_credit=True,
            model="openai/gpt-4o",  # use specific grader model
        ),
    )
```

Multi-model grading with majority vote:
```python
scorer=model_graded_qa(
    model=[
        "openai/gpt-4o",
        "anthropic/claude-sonnet-4-0",
        "google/gemini-2.5-pro",
    ]
)
```

#### Example 3: Agent Task with ReAct solver and tool use

```python
# agent_eval.py
from inspect_ai import Task, task
from inspect_ai.agent import react
from inspect_ai.dataset import json_dataset
from inspect_ai.scorer import includes
from inspect_ai.tool import bash, text_editor

@task
def ctf_challenge():
    return Task(
        dataset=json_dataset("ctf_challenges.jsonl"),
        solver=react(
            prompt="You are a CTF player. Find the flag formatted as FLAG{...}.",
            tools=[bash(), text_editor()],
            attempts=3,
        ),
        scorer=includes(),
        sandbox="docker",
        message_limit=50,
    )
```

#### Example 4: Custom Scorer

```python
# custom_scorer.py
from inspect_ai.scorer import (
    Score, Target, accuracy, stderr, scorer, CORRECT, INCORRECT
)
from inspect_ai.solver import TaskState

@scorer(metrics=[accuracy(), stderr()])
def keyword_scorer(keywords: list[str], threshold: float = 0.5):
    """Score based on fraction of keywords present in output."""

    async def score(state: TaskState, target: Target) -> Score:
        completion = state.output.completion.lower()
        found = sum(1 for kw in keywords if kw.lower() in completion)
        fraction = found / len(keywords) if keywords else 0

        return Score(
            value=CORRECT if fraction >= threshold else INCORRECT,
            answer=f"{found}/{len(keywords)} keywords found",
            explanation=completion,
        )

    return score
```

#### Example 5: Running and interpreting eval logs

```python
from inspect_ai import eval
from inspect_ai.log import read_eval_log, list_eval_logs

# Run eval
logs = eval("my_eval.py", model="openai/gpt-4o")
log = logs[0]

# Access results
print(f"Status: {log.status}")
print(f"Results: {log.results}")

# Read from file
log = read_eval_log("./logs/2024-01-01_my_eval_gpt-4o_abc123.eval")

# List all logs
all_logs = list_eval_logs("./logs/")

# View in browser
# $ inspect view
```

---

## 2. OpenAI Evals

- **GitHub:** https://github.com/openai/evals (18k stars, 2.9k forks, 689 commits)
- **Install:** `pip install evals`
- **Language:** Python (89.4%)
- **Minimum Python:** 3.9

### 2.1 Current Maintenance Status

**Important context:** The OpenAI Evals GitHub repo is in a transitional state. Key observations:

1. The repo README now prominently links to the **OpenAI Dashboard** for running evals: "You can now configure and run Evals directly in the OpenAI Dashboard."
2. The repo has 689 commits total (vs Inspect's 4,813), suggesting slower development velocity.
3. 116 open issues, 61 open pull requests.
4. The README states: "Please note that we are currently not accepting evals with custom code!"
5. OpenAI has been shifting evaluation functionality into their platform (platform.openai.com/docs/guides/evals).

**Assessment:** The open-source `openai/evals` repo is being gradually superseded by OpenAI's platform-integrated evals. The repo remains functional but is not the primary investment area. For new projects, the platform evals or Inspect AI are more actively supported paths.

### 2.2 Architecture

#### Registry Pattern

Evals are registered via YAML files in `evals/registry/evals/`. Each YAML file defines one or more eval configurations that reference:
- An eval class (template)
- A dataset
- Evaluation parameters

Example registry entry (`evals/registry/evals/my_eval.yaml`):
```yaml
my-eval:
  id: my-eval.dev.v0
  metrics: [accuracy]
my-eval.dev.v0:
  class: evals.elsuite.basic.match:Match
  args:
    samples_jsonl: my_eval/samples.jsonl
```

#### Eval Templates

Built-in eval classes:
- **Match** (`evals.elsuite.basic.match:Match`) - exact match comparison
- **Includes** (`evals.elsuite.basic.includes:Includes`) - substring match
- **FuzzyMatch** (`evals.elsuite.basic.fuzzy_match:FuzzyMatch`) - fuzzy string matching
- **ModelGraded** (`evals.elsuite.modelgraded.classify:ModelBasedClassify`) - LLM-as-judge

#### Dataset Format (JSONL)

Datasets are JSONL files stored in `evals/registry/data/`. Standard schema:

```jsonl
{"input": [{"role": "system", "content": "You are a helpful assistant."}, {"role": "user", "content": "What is 2+2?"}], "ideal": "4"}
{"input": [{"role": "user", "content": "Capital of France?"}], "ideal": "Paris"}
```

The `input` field is a list of chat messages. The `ideal` field is the expected answer. Large datasets use Git LFS.

#### Completion Function Protocol

For more advanced use cases (prompt chains, tool-using agents), OpenAI Evals provides a Completion Function Protocol that abstracts the model interface. This allows custom completion functions that wrap models with additional logic.

### 2.3 CLI Interface

```bash
# Run an eval
oaieval gpt-4o my-eval

# Run with specific parameters
oaieval gpt-4o my-eval --max_samples 100

# Record results (optional Snowflake integration)
oaieval gpt-4o my-eval --record_path results.jsonl
```

### 2.4 Code Examples

#### Example 1: Simple eval with JSONL dataset

Registry YAML (`evals/registry/evals/capitals.yaml`):
```yaml
capitals:
  id: capitals.dev.v0
  metrics: [accuracy]
capitals.dev.v0:
  class: evals.elsuite.basic.match:Match
  args:
    samples_jsonl: capitals/samples.jsonl
```

Dataset (`evals/registry/data/capitals/samples.jsonl`):
```jsonl
{"input": [{"role": "user", "content": "What is the capital of France? Answer with just the city name."}], "ideal": "Paris"}
{"input": [{"role": "user", "content": "What is the capital of Japan? Answer with just the city name."}], "ideal": "Tokyo"}
```

Run:
```bash
oaieval gpt-4o capitals
```

#### Example 2: Model-graded eval

Registry YAML:
```yaml
essay-quality:
  id: essay-quality.dev.v0
  metrics: [accuracy]
essay-quality.dev.v0:
  class: evals.elsuite.modelgraded.classify:ModelBasedClassify
  args:
    samples_jsonl: essay_quality/samples.jsonl
    eval_type: cot_classify
    modelgraded_spec: closedqa
```

The `modelgraded_spec` references a YAML template in `evals/registry/modelgraded/` that defines the grading rubric. Built-in specs include `closedqa`, `fact`, `battle`, `classify`.

Custom model-graded spec (`evals/registry/modelgraded/custom_rubric.yaml`):
```yaml
prompt: |-
  You are assessing a submitted answer on a given task based on a criterion.
  [BEGIN DATA]
  [Task] {input}
  [Submission] {output}
  [Criterion] {ideal}
  [END DATA]
  Does the submission meet the criterion? First reason step by step,
  then respond with (A) Yes or (B) No.
choice_strings: "AB"
input_outputs:
  input: input
  output: output
  ideal: ideal
```

#### Example 3: Programmatic usage

```python
import evals
import evals.metrics

# Note: programmatic usage is less documented than CLI usage.
# The primary interface is the CLI (oaieval command).
# For programmatic control, the recommended path is now
# the OpenAI platform evals API.
```

### 2.5 Limitations

- **No built-in sandboxing** - no Docker/container support for running model-generated code
- **No agent evaluation framework** - no ReAct, multi-turn, or tool-use scaffolds
- **No log viewer** - results are raw JSONL; no built-in visualization
- **Limited pre-built evals** - community-contributed but no curated benchmark suite comparable to Inspect's 107
- **OpenAI-centric** - primarily designed for evaluating OpenAI models (though Completion Functions can wrap others)
- **No eval sets** - no built-in support for running multiple evals as a suite with retry/recovery
- **Custom code not accepted** - the repo explicitly states they are not accepting evals with custom code

---

## 3. Comparison Table

| Feature | Inspect AI | OpenAI Evals |
|---------|-----------|-------------|
| **Agent evaluation** | First-class: ReAct agent, custom agents, multi-agent, agent bridge (Claude Code, Codex, LangChain) | None built-in; Completion Function Protocol can wrap agents but no scaffolding |
| **Sandboxing** | Docker, Kubernetes, Modal, Daytona, EC2, Proxmox, local; per-sample config; multi-container compose | None |
| **LLM-as-judge** | `model_graded_qa()`, `model_graded_fact()`; multi-model majority voting; custom templates; partial credit | `ModelBasedClassify` with YAML rubric specs; single grader model; `closedqa`, `fact`, `classify` templates |
| **Pre-built evals** | 107 evals across 19 categories (verified 2026-03-10); separate installable package | Community-contributed via registry; no curated count; Git LFS for datasets |
| **CI/CD integration** | Eval sets with retry/recovery; sample preservation; publishable log viewer bundles; Python API + CLI | CLI-only (`oaieval`); raw JSONL output; Snowflake integration for logging |
| **Log viewer** | Web-based `inspect view` with real-time updates; VS Code extension; log dataframes API; score editing | None built-in; raw JSONL results |
| **Active maintenance** | Very active: 4,813 commits, 190 releases, 196 contributors, 98 open issues | Low activity: 689 commits, being superseded by OpenAI platform evals; 116 open issues, 61 open PRs |
| **Python API** | Full: `eval()`, `eval_set()`, `score()`, log reading/writing, dataframes | Limited programmatic API; CLI is primary interface |
| **CLI** | `inspect eval`, `inspect eval-set`, `inspect score`, `inspect view`, `inspect list tasks`, `inspect sandbox cleanup`, `inspect trace` | `oaieval` for running evals |
| **Model support** | Model-agnostic: OpenAI, Anthropic, Google, Grok, Mistral, HuggingFace, vLLM, Ollama, AWS Bedrock, Azure AI, TogetherAI, Groq, Cloudflare, Goodfire, llama-cpp-python | Primarily OpenAI models; extensible via Completion Function Protocol |
| **Dataset formats** | JSONL, CSV, JSON, Python-generated; inline files; multimodal (images, audio, video) | JSONL only; Git LFS for large files |
| **Custom scorers** | `@scorer` decorator; async; full access to TaskState, Target, sandbox; multi-value scores | Custom eval classes inheriting from base; less documented |
| **Parallel execution** | Async architecture; configurable max_samples, max_connections, max_sandboxes | Basic parallelism |
| **Caching** | Built-in model output caching | None built-in |
| **Batch mode** | Built-in batch processing API support | None built-in |
| **Multi-turn dialog** | First-class via solver chains, agents, generate loops | Via Completion Function Protocol (more manual) |
| **Tool use** | @tool decorator, standard tools (bash, python, web_search, etc.), MCP tools, tool approval policies | Not natively supported |
| **Multimodal** | Images, audio, video in datasets and evaluations | Not built-in |

---

## 4. Key Takeaways for Downstream Write Tasks

### For Step 3 (Scorer API, LLM-as-judge):
- Inspect's `model_graded_qa()` and `model_graded_fact()` are the primary LLM-as-judge patterns
- Multi-model majority voting is built in: pass a list of models
- Custom scorers via `@scorer` decorator with `async def score(state, target) -> Score`
- Scorers declare their own metrics via the decorator: `@scorer(metrics=[accuracy(), stderr()])`
- Score values can be str ("C"/"I"), float, or dict for multi-value scoring
- `CORRECT`/`INCORRECT` constants map to 1.0/0.0 for accuracy metrics
- OpenAI Evals uses YAML-based `modelgraded_spec` files for rubrics

### For Step 4 (Agent evaluation):
- Inspect's `react()` agent is the baseline - built-in ReAct with submit/attempts/compaction
- Agent protocol: `async def execute(state: AgentState) -> AgentState`
- Agents can serve as solver, standalone, tool, or handoff target
- Multi-agent via `handoff()` (shared history) vs `as_tool()` (string in/out)
- Agent Bridge enables external framework integration
- Agent limits: token, message, and time limits
- OpenAI Evals has no agent evaluation support

### For Step 5 (Infrastructure, CI/CD, logging):
- `inspect eval-set` / `eval_set()` for CI/CD: retry with sample preservation, dedicated log dirs
- `inspect view` for log visualization; publishable bundles for static hosting
- VS Code extension for development workflow
- Log dataframes API for programmatic analysis
- Tracing for diagnosing runtime issues
- OpenAI Evals: CLI-only, JSONL output, Snowflake optional

### For Step 6 (Sandboxed adversarial evaluation):
- Docker sandbox with compose.yaml for isolation (`network_mode: none`)
- Multiple sandbox environments per task (e.g., "default" + "victim")
- Per-sample files and setup scripts
- Scorer access to sandbox state (read files, exec commands)
- Resource management: max_sandboxes, container CPU/memory limits
- Programmatic sandbox config via ComposeConfig
- `--no-sandbox-cleanup` for debugging
- OpenAI Evals has no sandboxing support

---

## 5. Version and Staleness Warnings

- **Inspect AI** is under active development. API patterns documented here are from the live docs as of 2026-03-10. The framework has had 190 releases; specific function signatures may change. The `@solver` and `@scorer` decorator patterns and the `Task(dataset, solver, scorer)` composition model are stable core abstractions.
- **OpenAI Evals** repo activity has slowed significantly. OpenAI is directing users to their platform dashboard for evals. The open-source repo's `oaieval` CLI and registry pattern still work but may not receive feature updates. The `evals.elsuite` module structure and YAML registry format are the stable patterns.
- **Inspect Evals** (the pre-built eval collection) is a separate package (`inspect-evals`) with its own release cycle. The count of 107 evals was verified from the live index page.
- The `model_graded_qa()` scorer in recent Inspect versions replaced `bootstrap_stderr` with `stderr` as the default metric, using CLT instead of bootstrapping.
- Inspect's agent system introduced the `Agent` protocol and `react()` function - this is a newer API pattern that may have evolved from an earlier solver-based approach. The `@agent` decorator and `AgentState` are the current patterns.
