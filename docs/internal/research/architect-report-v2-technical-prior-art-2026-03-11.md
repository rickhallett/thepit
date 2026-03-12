# Technical Prior Art Survey v2: Infrastructure and Architecture Patterns for Containerized AI Agent Systems

> Architect report, 2026-03-11. Below-decks research dispatch.
> v2 rewrite after Operator review of v1 identified: absence claims, analytical lullaby, semantic inflation, epistemic theatre, monoculture analysis.
> LLM provenance: Claude (Anthropic). Same model family as the code under study. Treat all assessments with this correlation in mind.

## Methodology Disclosure

This report is built from: (1) the midgets codebase as read from disk, (2) the v1 report and analyst report already on disk, (3) web fetches of GitHub project pages for OpenHands, E2B, and SWE-agent, (4) OpenHands SDK documentation fetched live, (5) training knowledge through early 2025. I have not cloned or searched the actual source trees of comparison projects. Where I state "X does not do Y," the honest framing is "I found no evidence that X does Y in the materials I reviewed." These are different statements.

---

## Context: What Midgets Is

For comparison throughout this report, midgets' architecture is:

- **Container**: Debian Bookworm Slim, single Dockerfile, non-root `agent` user (uid 1000)
- **Display**: Xvfb virtual framebuffer (:99, 1280x720x24) + fluxbox window manager
- **GUI automation**: `steer` CLI wrapping xdotool (click/type/hotkey/scroll), scrot (screenshot), wmctrl (window list), xclip (clipboard), tesseract (OCR)
- **Terminal automation**: `drive` CLI wrapping tmux with sentinel protocol (`__START_<token>` / `__DONE_<token>:$?` markers, poll via capture-pane)
- **Job protocol**: YAML files on a shared Docker volume, atomic acquisition via `os.rename()`, jobrunner in watch or once mode
- **Multi-container**: Docker Compose, N workers from shared image, init container for volume ownership
- **Mount-flag governance**: Docker `-v repo:/opt/repo:ro` for reviewer containers, read-write for dev container
- **Cross-model review**: 3 different LLM providers (Gemini 2.5 Flash, Grok 3 Mini Fast, GPT-4.1 Mini), Claude excluded from review because it wrote the code
- **Audit trail**: Per-agent traces (JSON/JSONL), run-metadata.yaml, token-usage.yaml, persisted to `data/alley/<run-id>/`
- **Steering**: Two mechanisms - infrastructure pipe (steer-watcher + named pipe for Claude Code) and file-based signal (instructions.md polling)

---

## 1. Containerized Agent Sandboxes

### Anthropic Computer Use Demo

**Repo**: `anthropics/claude-quickstarts/computer-use-demo`
**Architecture**: Docker container with Xvfb, tightvncserver, noVNC (browser-based VNC), Streamlit UI. Claude's native computer use API returns `computer_use` tool calls with coordinate actions. The agent loop runs *inside* the container it controls.

**Relationship to midgets**: Midgets' Dockerfile is architecturally descended from this demo. Both use Debian + Xvfb + Chromium in a container. The structural difference is that midgets wraps xdotool/scrot behind a CLI (`steer`) that any model can call via text, while Anthropic's demo uses Claude's native computer-use API (vision-based, returns coordinates directly). Midgets' approach trades accuracy (no vision model understanding the screen semantically) for model-agnosticism (any model that can generate `steer click --x 500 --y 300` works).

**Why it does not use mount-flag governance**: It is a single-agent demo, not a multi-agent system. There is nothing to govern between agents. The demo exists to showcase Claude's computer-use capability, not to constrain it.

### OpenHands (formerly OpenDevin)

**Repo**: `OpenHands/OpenHands` (68.9k stars, 6226 commits, 482 contributors)
**Architecture**: The most architecturally mature agent platform in this survey. Has a Software Agent SDK (Python), CLI, Local GUI, Cloud, and Enterprise tiers. Agent controller runs *outside* the sandbox container and sends commands *into* it via a client-server model. Supports Docker and Kubernetes backends.

**Sandbox model**: OpenHands uses Docker containers as execution sandboxes. The agent (Python process) runs on the host or in a separate service container; it sends bash commands and file edits into the sandbox container. This is architecturally different from midgets, where the entire agent CLI (Claude Code, Gemini CLI, Codex) runs *inside* the container.

**RBAC and permissions**: OpenHands Enterprise (source-available in the `enterprise/` directory) includes "RBAC and permissions" and "Multi-user support" as listed features. This is worth investigating carefully. If OpenHands Enterprise has infrastructure-level RBAC for different agent roles, it would be direct prior art for midgets' mount-flag governance. However, based on the available documentation, OpenHands' RBAC appears to be *user-level* access control (which human users can do what in the platform), not *agent-level* role separation (different sandboxes with different filesystem permissions for different agent roles reviewing the same artifact). These are different problems, but I cannot confirm this without reading the Enterprise source.

**Why it does not use mount-flag governance for agent roles**: OpenHands is primarily a single-agent system (one agent works on one task in one sandbox). The multi-agent features are about multiple users, not about structurally independent agents reviewing the same artifact. An OpenHands agent needs write access because its job is to fix code. Read-only mounts would prevent it from doing its primary task. This is a rational design choice, not a gap.

**What midgets could learn**: OpenHands' SDK abstraction (separating agent logic from sandbox runtime) enables the same agent code to run locally, in Docker, or in Kubernetes. This portability is something midgets lacks entirely - midgets is Docker-only.

### SWE-agent + SWE-ReX

**Repo**: `SWE-agent/SWE-agent` (18.7k stars, NeurIPS 2024)
**Architecture**: SWE-agent is a coding agent; SWE-ReX is its runtime execution framework. The team recently released mini-SWE-agent (65% on SWE-bench verified in 100 lines of Python), which supersedes the main SWE-agent.

**SWE-ReX**: A runtime interface for sandboxed shell environments. Supports local execution, Docker, AWS, Modal, and Fargate backends. Provides reliable command completion detection across shell sessions. This is functionally the same problem that midgets' `drive` CLI solves (detecting when a command finishes and extracting output), but SWE-ReX abstracts it across multiple cloud backends while `drive` is tmux-specific.

**GUI capabilities**: Neither SWE-agent nor SWE-ReX provides GUI automation. Terminal-only. The EnIGMA variant for cybersecurity CTF challenges operates through terminal interaction, not GUI.

**Why it does not use mount-flag governance**: SWE-agent solves one problem - fixing a GitHub issue. It needs write access to the repository to produce a patch. There is no second agent reviewing the patch within the same system. Review happens externally (SWE-bench evaluation, human review). The governance question does not arise because the system is single-agent.

**What midgets could learn**: SWE-ReX's backend abstraction is the cleanest in this survey. If midgets ever needs to run on Modal, Fargate, or Kubernetes, the agent code would need a complete rewrite. SWE-ReX solved this by abstracting the execution interface.

### E2B

**Repo**: `e2b-dev/E2B` (11.2k stars)
**Architecture**: Cloud-hosted sandboxes using microVMs (likely Firecracker). Each sandbox is an isolated Linux VM, not a Docker container. Sub-second boot (~300ms). Python and JavaScript SDKs. Focus on code interpretation and execution.

**Isolation model**: E2B uses VM-level isolation (separate kernel per sandbox), which is strictly stronger than Docker container isolation (shared kernel). However, this isolation serves the same purpose as Docker in midgets - preventing the agent from affecting the host - not role-based access control between agents.

**Desktop sandboxes**: E2B offers Desktop sandbox templates with Xvfb for computer use scenarios, similar to midgets' approach.

**Why it does not use mount-flag governance**: E2B is infrastructure-as-a-service. Each sandbox is independent. The API is `Sandbox.create()`, `sandbox.commands.run()`, `sandbox.kill()`. There is no concept of multiple sandboxes with different access levels to the same filesystem. Each sandbox has its own filesystem. If you wanted midgets-style governance, you would need to set up shared storage between sandboxes and configure permissions at the storage layer, not at the sandbox layer. E2B does not provide this because their model is "isolated sandboxes" not "coordinated sandboxes."

**What midgets could learn**: Pause/resume of sandbox state, sub-second boot times, and the template system (pre-built environments for different tasks) are all valuable. E2B's self-hosting option (Terraform-based infrastructure deployment) is also relevant if midgets ever moves beyond single-host Docker.

### Open Interpreter

**Repo**: `openinterpreter/open-interpreter` (62.6k+ stars)
**Architecture**: Runs code on the host machine. The model generates code, the interpreter executes it locally via `exec()`. Has a Docker option but it is for packaging convenience, not sandboxing.

**Why it does not sandbox**: By design. Open Interpreter's value proposition is "let the AI control your computer." Sandboxing would undermine this. The safety model is human confirmation before execution.

**Relationship to midgets**: These are opposite ends of a spectrum. Open Interpreter: maximum agent capability, minimum constraint, relies on human vigilance. Midgets: constrained agent capability, maximum infrastructure enforcement, does not rely on agent compliance.

### Devon, Aider

**Devon**: Coding agent, Docker for dev environment, no GUI. **Aider**: Terminal pair programming tool, no containerization, no GUI. Neither provides containerized GUI environments or multi-agent governance. Both are single-agent tools solving the "help me write code" problem.

### Summary Table

| Project | Container? | GUI? | Multi-agent? | Role-based mount constraints? | Why / why not |
|---------|-----------|------|-------------|-------------------------------|---------------|
| Anthropic CU Demo | Docker | Xvfb + VNC | No | No | Single-agent demo, nothing to constrain between |
| OpenHands | Docker/K8s | Limited | Enterprise RBAC (user-level) | Not documented | Single-agent per sandbox, agent needs write access |
| SWE-agent/SWE-ReX | Docker/Modal/Fargate | No | No | No | Single-agent, needs write access to fix code |
| E2B | MicroVM | Desktop template available | No shared filesystem | No | Isolated sandboxes, no coordination mechanism |
| Open Interpreter | Optional Docker | Host GUI | No | No | Designed for maximum access, not constraint |
| Devon/Aider | Minimal/None | No | No | No | Single-agent coding tools |
| **Midgets** | Docker | Xvfb + steer/drive | Yes (3-model crew) | Yes (`:ro` for reviewers) | Multi-agent governance is the design goal |

**Honest assessment of why others don't do this**: The dominant use case for AI agent sandboxes is "give the agent a safe place to execute code." Not "give different agents different access levels to the same artifact." Every project in this survey except midgets is solving the first problem. Midgets is solving the second. The `:ro` mount pattern is not something these projects "missed" - it is not relevant to their architecture because they run one agent per sandbox, and that agent needs write access. The relevant comparison would be: are there multi-agent systems that use infrastructure constraints? That is Section 4.

---

## 2. GUI Automation Stacks for AI Agents

### Approach Comparison

| Approach | Used by | Mechanism | Tradeoffs |
|----------|---------|-----------|-----------|
| **Native vision API** | Anthropic CU, Claude computer-use | Model sees screenshot as image, returns coordinates natively | Best accuracy, requires vision-capable model with computer-use API, high token cost (images), vendor lock-in |
| **Pixel-level wrappers** | Midgets (steer), PyAutoGUI, SikuliX | Screenshot + OCR + coordinate clicks via xdotool/similar | Model-agnostic, works with any app, fragile to UI changes, OCR errors |
| **DOM/Accessibility tree** | BrowserGym, WebArena agents, Playwright-based agents | Structured element tree | Precise selectors, stable, only works for web or AT-SPI2-compatible apps |
| **Browser automation** | BrowserUse, AgentQ, most web agents | Playwright/Puppeteer via Chrome DevTools Protocol | Fast, reliable for web, web-only |

### Midgets' Position

Midgets uses `steer` (xdotool + scrot + tesseract) for GUI and `drive` (tmux + sentinel) for terminal. This is the pixel-level approach. The SPEC.md explicitly defers accessibility tree / AT-SPI2 to a future phase.

**Key tradeoff**: Midgets' `steer` works with any application on the Linux desktop - terminal apps, Chrome, native GTK apps, anything with a window. But it requires OCR to read screen content, which is error-prone. Anthropic's native vision API avoids OCR entirely (the model "sees" the screenshot as an image), but requires Claude's specific computer-use capability. Playwright-based agents get structured DOM elements but only for web content.

**For midgets' specific use case** (governance crew reviewing code), the agents primarily need terminal access (reading diffs, running tests) and occasional browser access. The `drive` CLI handles terminal reliably via the sentinel protocol. The GUI layer (`steer`) is used less frequently and mainly for proof-of-concept demonstration. The pixel approach is adequate for the proof but would be the first thing to upgrade for production use.

**What midgets could learn**:
- Anthropic documents that XGA (1024x768) gives better results than higher resolutions for computer-use models. Midgets uses 1280x720 - close but worth testing 1024x768.
- noVNC (browser-based VNC) in the Anthropic demo is more accessible for debugging than raw x11vnc. Already available in the container ecosystem.
- A hybrid approach - `steer` for general GUI, Chrome DevTools Protocol for web-specific interaction (Chrome is already in the container) - would get the best of both approaches.

---

## 3. Multi-Model Orchestration for Review/Verification

### What Midgets Does

`orchestrate.sh` runs three reviewers sequentially, each in its own Docker container:
1. **Watchdog** (Gemini 2.5 Flash via Gemini CLI) - read-only repo mount, writes review YAML
2. **Weaver** (Grok 3 Mini Fast via xAI API) - read-only repo mount, writes review YAML
3. **Sentinel** (GPT-4.1 Mini via Codex CLI) - read-only repo mount, writes review YAML

Claude is excluded from review because it wrote the code under review. Host-side triangulation counts pass/fail verdicts.

### Existing Multi-Agent Frameworks

**CrewAI** (25k+ stars): Role-based agents with delegation. Agents can use the same or different models. However: all agents run in the same process, same filesystem, same network. "Multi-agent" means multiple role prompts, not multiple isolated processes. There is no infrastructure boundary between agents. An agent that is told "you are the reviewer" can still access the same context as the agent told "you are the developer." The separation is prompt-level.

**AutoGen** (38k+ stars, Microsoft): Multi-agent conversation framework. Agents exchange messages in code. Same-process, no container isolation. Different models can be assigned to different agents, so cross-model review is technically possible. But there is no structured review protocol, no infrastructure isolation, and no formal triangulation mechanism.

**LangGraph** (LangChain ecosystem): State machine for agent workflows. Does not prescribe multi-model patterns. Single model per node is typical.

**MetaGPT** (45k+ stars): Multi-agent framework mimicking software company roles (PM, architect, dev, QA). This is the closest conceptual parallel to midgets' governance crew. However, MetaGPT runs all agents in the same process with a shared message bus. An agent assigned the "QA" role can access the same global context as the "developer" role. There is no filesystem or container boundary.

**Multi-agent debate research** (Du et al., MIT 2023; Chan et al., Tsinghua 2023): Academic work on using multiple LLMs debating to improve factuality and evaluation quality. This validates the principle that cross-model review has value. However, these are research experiments, not deployed systems with infrastructure isolation.

### What Is Genuinely Different About Midgets' Approach

The combination of:
1. Different vendors per reviewer (not just different model sizes from one vendor)
2. Container isolation per reviewer (separate process, separate filesystem view)
3. Read-only mounts for reviewers (infrastructure-enforced, not prompt-enforced)
4. Exclusion of the authoring model from review (documented confound control)
5. Structured verdict protocol (YAML schema)
6. Host-side triangulation (not model-mediated synthesis)

None of the multi-agent frameworks I reviewed combine all six properties. But it is important to be precise about what is new here:

- **Items 1 and 4** are design decisions, not technical innovations. Any developer could choose different vendors and exclude the authoring model.
- **Item 5** is a structured output format. Many systems use structured output.
- **Item 6** is a bash script that counts verdicts. Simple and effective, but not novel.
- **Items 2 and 3** are standard Docker features applied to this specific use case.

The pattern - using standard Docker isolation to enforce independence between reviewing agents - is a reasonable engineering choice. It is not a new technology. It is the application of existing infrastructure (Docker mount flags, container isolation) to a specific problem (multi-model code review governance) in a way that existing multi-agent frameworks have not bothered to implement, because their design goals are different (see next section).

### Why Multi-Agent Frameworks Don't Do This

This is the Operator's key question. Honest answer:

**CrewAI, AutoGen, MetaGPT** are solving the "agents collaborate to produce output" problem. Their agents *need* to share context. A PM agent writing a spec that the developer agent then implements *requires* shared state. Isolating them would make the system worse, not better. The shared context is a feature, not a bug.

**Midgets** is solving a different problem: "agents independently verify an artifact." Independent verification *requires* isolation. Shared context would be a confound. These are different problems with different optimal architectures.

The "governance gap" narrative from v1 was overstated. It is not that these frameworks "lack governance" - it is that they solve problems where governance-by-isolation would be counterproductive. The question is not "why don't they have this feature" but "does the specific problem midgets solves (independent multi-model review) benefit from the specific architecture midgets uses (container isolation)?" The answer is yes, because independent verification requires independence, and infrastructure isolation provides stronger independence guarantees than prompt-based role separation.

### What Midgets Could Learn

- CrewAI's event-driven "Flows" concept could formalize the orchestrator's sequencing (currently a linear bash script)
- Weighted voting based on known model strengths (e.g., GPT-4 might be better at security issues, Gemini at logic bugs) rather than simple majority
- Cost tracking per review run to evaluate ROI of cross-model review vs. single-model review

---

## 4. Infrastructure-Enforced Governance for AI Agents

### The Specific Pattern Midgets Uses

In `orchestrate.sh` line 158: `-v "$VOL_REPO:/opt/repo:ro"` for reviewer containers. In `test-c4.sh`: deterministic tests proving that the `:ro` mount actually blocks writes, verified via `docker inspect` confirming `RW=false`.

The dev container gets `-v "$VOL_REPO":/opt/repo` (read-write). Reviewers get `:ro`. This is standard Docker. The `:ro` flag has existed since Docker 1.0 (2014).

### What v1 Got Wrong

v1 stated: "No other project in this survey uses Docker mount flags as a governance mechanism." This was an absence claim based on my training data, not on searching actual repos. Let me be more honest:

**What I can verify**: None of the main project README files, documentation pages, or architecture descriptions I reviewed for OpenHands, SWE-agent, E2B, CrewAI, AutoGen, or MetaGPT describe using Docker mount flags for role-based access control between agents.

**What I cannot verify**: Whether any of these projects, or other projects I have not surveyed, use `:ro` mounts in their Docker configurations for governance purposes. A `:ro` flag is one line in a docker run command. It would not necessarily appear in a README or architecture document. It could exist in any of these codebases without being documented as a "feature."

**What is likely true**: The specific pattern of "multiple containers with different mount permissions reviewing the same artifact, where mount permissions encode role-based access control" is not a commonly documented pattern in the AI agent space. This is not because it is technically difficult (it is trivial) but because most AI agent systems do not have multi-agent review as a design goal.

### Adjacent Prior Art That v1 Missed or Underweighted

**Kubernetes RBAC + PodSecurityPolicies/PodSecurityStandards**: Kubernetes has had infrastructure-enforced access control for pods since 2016. Different pods can have different security contexts, different volume mount permissions, different network policies. If midgets ran on Kubernetes instead of Docker Compose, the governance would be expressed via PodSecurityStandards and RBAC rather than Docker mount flags. This is the same pattern at a different infrastructure layer. The idea of "different containers get different permissions" is core Kubernetes, not novel.

**CI/CD pipeline isolation**: GitHub Actions, GitLab CI, and Jenkins all run different pipeline stages in separate containers with different permissions. A "test" stage gets read-only access to source. A "deploy" stage gets deployment credentials. A "review" stage gets read access to test results but not deployment keys. This is infrastructure-enforced role separation for automated workflows. It is not AI-agent-specific, but it is the exact same pattern.

**Sidecar patterns in service meshes**: Istio, Envoy, and similar service meshes enforce network-level access control between services. Service A can talk to Service B but not Service C. This is governance-by-infrastructure for microservices, which is structurally similar to governance-by-infrastructure for agent containers.

**Docker seccomp/AppArmor profiles**: Docker supports syscall filtering (seccomp) and mandatory access control (AppArmor). These provide finer-grained constraints than mount flags alone. Midgets does not currently use them, but they are available infrastructure-level governance mechanisms.

**Firecracker (used by E2B, AWS Lambda)**: VM-level isolation is strictly stronger than container-level isolation. E2B's microVMs provide better isolation than Docker containers. If governance is the goal, microVMs are a more rigorous mechanism.

### Honest Assessment

The `:ro` mount flag pattern is:
- **Standard Docker** (existed since 2014)
- **Standard infrastructure practice** (CI/CD does this routinely)
- **Applied to a specific context** (multi-model AI agent code review) where it has not been widely documented
- **Tested** (midgets has deterministic tests proving the constraint works, including `docker inspect` verification)

The testing and documentation of the pattern - proving that the governance constraint actually works via automated tests - is where midgets adds value over "just set a flag." The `test-c4.sh` suite that verifies read-only mounts block writes, verifies artifacts are writable, and confirms via `docker inspect` that `RW=false` is more rigorous than most discussions of AI agent governance.

### What Midgets Could Learn

1. **Kubernetes PodSecurityStandards**: If the project ever moves beyond single-host, express governance as K8s security policies rather than Docker flags
2. **Seccomp profiles**: Drop unnecessary syscalls per role (reviewers don't need `mount`, `ptrace`, `setuid`)
3. **Network policies**: `--network none` for reviewers is noted as future in SPEC.md, and would strengthen isolation
4. **Read-only rootfs**: `--read-only` on `docker run` prevents agents from modifying anything outside explicit mounts
5. **Resource quotas**: `--cpus` and `--memory` are already used in `orchestrate.sh` but could be formalized per role

---

## 5. Agent Steering/Interruption Mechanisms

### How Existing Projects Handle Human Intervention

| Project | Mechanism | When | Granularity |
|---------|-----------|------|-------------|
| Open Interpreter | Confirmation prompt before code execution | Before each action | Per-action |
| OpenHands | Web UI with chat/approval | During execution | Per-conversation |
| SWE-agent | CLI flags (auto-approve vs interactive) | At launch | Run-level |
| CrewAI | `human_input=True` on tasks | Between tasks | Per-task |
| Anthropic CU Demo | Streamlit chat UI | During execution | Per-conversation |

### Midgets' Approach

Two mechanisms:

1. **Infrastructure steering (steer-watcher)**: Host writes JSON message files to `/opt/jobs/steer/`. `steer-watcher` daemon inside the container reads them via atomic rename, writes to a named pipe (`agent.pipe`). Claude Code reads from the pipe via `--input-format stream-json`. This is guaranteed delivery if the daemon is running and the agent is reading the pipe. It is Claude Code-specific (other CLIs do not support stream-json input).

2. **Prompt-based steering (signal)**: Host appends timestamped instruction to `instructions.md`. Agent's system prompt tells it to check periodically. Best-effort, model-agnostic. The agent can ignore it (governance-by-prompt, not governance-by-infrastructure).

### Assessment

The infrastructure steering mechanism (steer-watcher + named pipe) is architecturally clean. The file-to-pipe bridge pattern means the host never needs to `docker exec` into the container. However, it only works with Claude Code's stream-json input format. For Gemini CLI and Codex, midgets falls back to prompt-based signaling, which is the same approach as CrewAI's `human_input=True` - it works, but the agent can ignore it.

The two-mechanism approach (infrastructure for Claude Code, prompt for others) is an honest reflection of what is currently possible. Claude Code's stream-json API happens to enable a clean infrastructure integration. Other CLIs do not expose an equivalent input mechanism.

### What Midgets Could Learn

- A lightweight HTTP health/control endpoint per container (a small Python server) would enable model-agnostic steering without depending on CLI-specific input formats
- The `docker stop` signal chain (SIGTERM, grace period, SIGKILL) should be documented as the hard-stop mechanism
- Checkpoint/resume: agent periodically writes state to a file, so an interrupted agent can resume from checkpoint rather than restarting

---

## 6. Job Protocols for Multi-Agent Coordination

### What Midgets Uses

Filesystem YAML job queue:
1. Orchestrator writes job YAML to `incoming/`
2. Worker atomically renames to `.processing` via `os.rename()` (atomic on Linux same-filesystem)
3. Worker executes, writes result YAML to `done/`
4. Orchestrator reads `done/`

Properties: atomic acquisition, crash-detectable (`.processing` files indicate in-flight), no additional services needed, human-readable YAML, 500ms poll interval.

### Comparison

| Approach | Used by | Latency | Complexity | Dependencies |
|----------|---------|---------|------------|--------------|
| **Filesystem YAML** | Midgets | ~500ms (poll) | Low | None (POSIX) |
| **In-process** | CrewAI, AutoGen, MetaGPT | ~0 | Low | None |
| **REST API** | OpenHands, E2B | ~ms | Medium | HTTP server |
| **Message broker** | Not widely used in agent systems | ~ms | High | Redis/RabbitMQ/etc |

### Assessment

Midgets' filesystem-based job queue is a reasonable choice for a proof-of-concept running on a single host. The atomic rename pattern for job acquisition is correct and well-tested (test-c3.sh proves multiple workers can race for jobs without contention). The 500ms poll is adequate for jobs that take minutes.

The limitation is scaling. Filesystem polling does not scale to hundreds of workers or sub-second job dispatch. But midgets does not need this - it runs 3-5 containers per review cycle.

For context: the in-process approach (CrewAI, AutoGen) is simpler and faster, but requires agents to share a process - which defeats the isolation goal. The REST API approach (OpenHands) is more sophisticated but requires running an HTTP server. Midgets chose the simplest approach that preserves container isolation. This is a defensible tradeoff.

### What Midgets Could Learn

- `inotifywait` instead of polling: Linux inotify can notify on file creation, eliminating the 500ms latency with no added complexity
- Dead-letter pattern: `.processing` files older than a timeout should be moved to `failed/` with a reason
- Priority queue: if job ordering matters, encode priority in the filename (e.g., `001-high-watchdog.yaml`)

---

## 7. Agent Observation and Audit Trails

### What Midgets Records

Per `orchestrate.sh` and the resulting `data/alley/<run-id>/` directory:

1. **Per-agent traces**: Gemini produces JSON with `.stats.models.*.tokens`. Codex produces JSONL with `turn.completed` events. Grok (via xAI API) produces raw API JSON responses with `.usage` fields. Three different formats, parsed by a single Python script into unified `token-usage.yaml`.

2. **Run metadata**: `run-metadata.yaml` captures run ID, date, image, injected defect description, crew member roles/models/providers/trace files, a note that Claude was excluded and why, and the triangulated verdict.

3. **Source code provenance**: The injected defect (calc.py with the `zip()` truncation bug) is copied to the artifact directory alongside the agent reviews.

4. **Review artifacts**: Structured YAML reviews from each agent, prompts preserved.

### Comparison

| Project | Action logging | Token tracking | Provenance chain | Structured traces |
|---------|---------------|----------------|-------------------|-------------------|
| **Midgets** | Full agent traces (3 formats, unified parser) | Yes, cross-vendor normalization | Yes (defect + reviews + metadata) | Yes (YAML) |
| **OpenHands** | Trajectory files (JSON), session replay | Via LiteLLM | No documented defect injection | Yes |
| **SWE-agent** | Trajectory files in `trajectories/` | Yes | Via SWE-bench task description | Yes (JSON) |
| **CrewAI** | Telemetry (anonymous, opt-in), enterprise tracing | Basic | No | Enterprise only |
| **Anthropic CU Demo** | Streamlit conversation history | Via API response | No | No structured audit |

### Assessment

Midgets' audit trail is thorough for its scope. The distinctive element is the provenance chain: the injected defect is documented in the same artifact directory as the agent reviews, creating a verifiable chain from "what was planted" to "what was found." This is standard experimental methodology (controls + observations + results together), applied to AI agent evaluation.

The cross-vendor token parsing (handling Gemini, xAI, and Codex trace formats in a single script) is practical engineering. It is not architecturally innovative, but it solves a real problem: when you use three different providers, you get three different trace formats, and you need unified reporting.

### What Midgets Could Learn

- **OpenTelemetry**: A standard tracing format would make traces queryable and would replace the bespoke per-vendor parsers. OTLP spans with provider-specific attributes would normalize everything.
- **Screenshot recording**: Periodic screenshots during agent execution (not just on-demand `steer see`) would create a visual audit trail for debugging.
- **Centralized event stream**: Move from per-run artifact directories to a structured event log that spans runs, enabling longitudinal analysis of agent performance.

---

## Cross-Cutting Assessment: The Operator's Question

> "If what we have done is so beneficial, so unique, why is it that none of these well-funded projects have included this as a feature? Is it a genuine limitation on their part, or a deliberate 'not necessary'?"

The honest answer, project by project:

| Project | Why it doesn't do what midgets does | Limitation or deliberate? |
|---------|--------------------------------------|---------------------------|
| **OpenHands** | Single-agent per sandbox. Agent needs write access to fix code. | **Deliberate.** Write access is required for their use case. |
| **SWE-agent** | Single-agent. Fixing issues requires modifying files. | **Deliberate.** Same reasoning as OpenHands. |
| **E2B** | Sandboxes are independent, no shared filesystem between them. | **Architectural.** Their isolation model (microVMs) makes cross-sandbox filesystem sharing non-trivial. They could build it, but it would require rearchitecting their product. |
| **CrewAI** | Agents collaborate, shared context is a feature. | **Deliberate.** Isolation would break their collaboration model. |
| **AutoGen** | Same as CrewAI. | **Deliberate.** |
| **MetaGPT** | Same as CrewAI, with shared message bus. | **Deliberate.** |
| **Anthropic CU Demo** | Single-agent demo. | **Scope.** Not trying to solve multi-agent governance. |

**The pattern**: Every project that doesn't use infrastructure governance has a rational reason not to. The single-agent projects need write access. The multi-agent collaboration frameworks need shared context. E2B's isolation model makes shared filesystems architecturally expensive.

**What this means for midgets**: The "governance gap" is real but narrow. It exists specifically at the intersection of:
- Multi-agent systems (need coordination)
- Where agents have different roles (need different permissions)
- Where agents review/verify rather than collaborate (need independence, not shared context)
- Where the constraint must be infrastructure-enforced (prompt compliance is insufficient)

This is a specific and legitimate niche. It is not that other projects "missed" this - it is that they are solving different problems where this pattern would be counterproductive.

---

## Summary

### What midgets combines (pattern, not invention)

1. **Docker containers as agent sandboxes** - standard, well-established by Anthropic CU demo, OpenHands, SWE-ReX, E2B
2. **Xvfb + GUI automation CLI** - standard, derived from Anthropic CU demo architecture
3. **tmux + sentinel protocol for terminal automation** - similar to SWE-ReX's shell session management
4. **Filesystem-based job queue with atomic acquisition** - standard pattern, simpler than alternatives
5. **Docker mount flags for role-based access control** - standard Docker, applied to multi-agent review
6. **Cross-vendor multi-model review** - design decision, not widely implemented because most systems don't need it
7. **Structured audit trail with provenance** - good engineering practice, not architecturally novel

### What is genuinely distinctive (the combination, not individual components)

No surveyed project combines all seven elements into a single system designed for infrastructure-enforced multi-agent governance. The individual components are standard. The combination, purpose-built for independent multi-model code review with infrastructure-enforced role separation, does not have a direct precedent in the projects I reviewed. This is an honest but narrow claim - it reflects both a genuine architectural choice and the fact that very few projects are trying to solve this specific problem.

### What midgets should learn from this survey

1. **SWE-ReX's backend abstraction** - midgets is Docker-only; adding even one alternative backend (local, Docker, cloud) would prove the architecture generalizes
2. **OpenHands' SDK approach** - separating agent logic from sandbox runtime enables the same agent code to run in different environments
3. **E2B's pause/resume and fast boot** - valuable for iterative development and long-running reviews
4. **Kubernetes security patterns** - PodSecurityStandards, NetworkPolicies, RBAC are the production-grade versions of what midgets does with Docker flags
5. **inotifywait over polling** - strictly better than 500ms filesystem scans with zero added complexity
6. **OpenTelemetry over bespoke parsers** - standardize the audit trail

### What midgets should not claim

- That `:ro` mount flags are novel (they are 2014 Docker)
- That cross-model review is unprecedented (the N-version programming literature goes back to the 1970s; multi-agent debate papers are from 2023)
- That other projects "lack governance" as if it were a deficiency (they solve problems where governance-by-isolation would be counterproductive)
- That infrastructure enforcement is unique to midgets (CI/CD, Kubernetes, and service meshes have done this for years)

### What midgets can legitimately claim

- A working proof-of-concept that demonstrates infrastructure-enforced role separation for multi-model AI agent code review
- Deterministic tests proving the governance constraints work (`test-c4.sh`)
- A structured audit trail that links injected defects to agent findings
- The explicit architectural decision to use containers for governance (not just isolation), documented and tested

---

*End of v2 technical prior art survey. Written with awareness that this analysis shares the same model family (Claude/Anthropic) as the system under study. Independent verification using a different model family is recommended.*
