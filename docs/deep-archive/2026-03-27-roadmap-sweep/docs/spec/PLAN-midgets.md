# PLAN.md - Midget-Castle Build Trajectory

**SD-322** | First build trajectory for midgets | 2026-03-10

## Bearing

Turn the midget POC into a governance layer for multi-agent work. The POC proves a Docker container works as an agent's GUI sandbox (10/10, steer CLI, screenshots, clicks, typing, clipboard). The gap is everything between "container works" and "governance crew operating as physical agents."

## What exists today

- Docker container: Debian Bookworm Slim + Xvfb + fluxbox + xdotool + scrot
- `steer` CLI wrapper: see, click, type, hotkey, scroll, apps, clipboard, screens (with OCR)
- `drive` CLI: tmux terminal protocol with sentinel markers
- `jobrunner` CLI: YAML job queue with atomic acquisition
- 6 in-gate test suites (35 tests): test-poc, test-drive, test-ocr, test-chromium, test-agent, test-jobs
- 3 integration test suites (24 tests): test-c2, test-c3, test-c4
- Docker Compose swarm with N workers and shared volumes
- Governance crew plumbing: role identities, mount constraints (ro/rw), orchestrator, docker inspect verification
- Cross-model crew orchestration: Gemini 2.5 Flash, Grok 3 Mini Fast, GPT-4.1 Mini (Claude excluded from review - it wrote the code)
- Node 22 LTS in container (upgraded from Debian apt Node 18 to support Gemini CLI)
- Adversarial review prompt and 2-model convergence synthesis (12 converged findings, all fixed)
- Governance tooling (carried forward from thepit-v2): Makefile, darkcat pipeline, pitkeel, gauntlet, slopodar, lexicon, agent identity files

## Four phases

### Phase A - Get an agent operating inside the container [COMPLETE]

The POC proves the sandbox works. This phase puts an agent in it.

| # | Step | What it does | Depends on | Verifiable by |
|---|------|-------------|------------|---------------|
| A1 | Adapt the gate | Rewrite the gate to run `test-poc.sh` as midgets' quality gate. Current gate assumes pnpm/thepit-v2. This gives us a verification foundation before we add capabilities. | Nothing | `make gate` exits 0 |
| A2 | Terminal protocol (drive port) | tmux session inside the container. The agent drives CLI commands through tmux send-keys / capture-pane. Port the sentinel protocol from mac-mini-agent. | A1 | Agent can run `ls`, `git status`, `steer see` from tmux and capture output |
| A3 | OCR | Tesseract inside the container. `steer see` returns screenshot + extracted text. The agent can now read what's on screen without relying on vision API calls. | A1 | `steer see --ocr` returns text content from a known screen state |
| A4 | Chromium | Headless Chromium in the container. The agent can browse, interact with web UIs, and use devtools protocol. | A1, A3 | `steer apps launch chromium`, navigate to URL, `steer see --ocr` returns page text |
| A5 | Agent framework in container | Run Claude Code (or Pi) inside the container. The agent has: terminal (A2), screen reading (A3), browser (A4), and the steer CLI. It can now do real work. | A2, A3, A4 | Agent inside container completes a small task (e.g. clone a repo, run tests, report result) end-to-end |

### Phase B - Adapt governance for midgets [COMPLETE]

The governance system exists but its targets point at the old project. This phase rewires it.

| # | Step | What it does | Depends on | Verifiable by |
|---|------|-------------|------------|---------------|
| B1 | SPEC.md | Define what the midgets governance layer does. What a midget is. What a governance crew is. What "multi-agent gauntlet" means concretely. | A1 | SPEC.md exists, reviewed by Operator |
| B2 | Rewrite Makefile targets | Replace the 26 polecat tasks (which reference thepit-v2 plans) with midgets-specific targets. Keep the darkcat and gauntlet structure - rewrite the task list. | A1, B1 | `make status` shows midgets-specific tasks, `make gauntlet` runs the adapted pipeline |
| B3 | Gauntlet for containers | The gauntlet currently runs on host. Adapt it to verify container-based work: build container, run tests inside it, run darkcat on the diff, run pitkeel. | A5, B2 | `make gauntlet` builds container, runs test-poc.sh inside, runs darkcat on changes |
| B4 | EVAL.md | Success and failure criteria for midgets. What does "working governance layer" mean? What would prove the thesis? What would disprove it? | B1 | EVAL.md exists, reviewed by Operator |

### Phase C - Multi-agent coordination [COMPLETE]

Multiple midgets working together under governance.

| # | Step | What it does | Depends on | Verifiable by |
|---|------|-------------|------------|---------------|
| C1 | Listen port (job server) | A midget can receive work. Simple job queue - accept a task description, execute it, report result. Could be HTTP, could be filesystem-based, could be Redis. Simplest thing that works. | A5 | Send a job to a running midget, receive structured result |
| C2 | Inter-container communication | Two midgets can exchange data. Shared volume, message bus, or direct API. One midget produces an artifact, another consumes it. | C1 | Midget-A writes a file, Midget-B reads it and acts on it |
| C3 | Multi-container orchestration | Spin up N midgets, dispatch work, collect results. Docker Compose or k3s. The orchestrator is the Operator's control plane. | C1, C2 | `make swarm N=3 TASK=test` spins up 3 midgets, distributes work, collects results |
| C4 | Governance crew as physical agents | Weaver, Watchdog, Sentinel as actual containerised agents. Weaver reviews PRs by reading diffs inside its container. Watchdog writes and runs tests. Sentinel scans for security issues. Each has its own midget, its own identity file, its own steer instance. | C3, B3 | A code change goes through: dev-midget implements, watchdog-midget tests, weaver-midget reviews, sentinel-midget scans. All automated, all containerised. |

### Phase D - Adversarial proof and thesis validation [D3 DONE, D4 NEXT]

The plumbing is built. This phase proves it works under adversarial conditions. Each step
has a built-in adversarial review gate.

| # | Step | What it does | Depends on | Adversarial gate | Verifiable by | Status |
|---|------|-------------|------------|-----------------|---------------|--------|
| D1 | Live agent run | A real Claude Code agent inside a midget completes a non-trivial task (not a canned script). The agent uses steer, drive, and the job protocol to produce a working diff. | C4 + API key | R1: review the diff the agent produces using repo-adversarial-review.md. Does the agent's output pass the same bar as human output? | Agent produces a diff that passes the gate. Human reviews the diff for correctness. | DONE |
| D2 | Defect injection (v1: trivial, retired) | First attempt used off-by-one with self-documenting BUG comment. All 3 Claudes caught it - not interesting. Retired as slop. | D1 | -- | -- | RETIRED |
| D2 | Defect injection (v2: zip truncation) | Inject silent data-loss defect (zip truncation in weighted_score). No BUG comment, produces correct output for equal-length inputs, wrong answer for mismatched. Run cross-model crew. | D1 | Crew must find the bug for the right reason, not phantom-tollbooth it. | 3/3 models found zip truncation independently. Sentinel PASS is correct (security scope). | DONE |
| D3 | Cross-model thesis proof | Full EVAL.md scenario with 3 vendors (Gemini, Grok, GPT-4.1). Claude excluded - it wrote the code. Zero human intervention. Verdict divergence (2 FAIL, 1 PASS) is the system working correctly. | D2 | Cross-model convergence on the injected bug. Divergence on verdict reflects correct role scoping. | All EVAL.md confounds addressed. Artifacts committed. | DONE |
| D4 | Write-up | Document the proof: what was built, what was proven, what the failure modes are, what the confounds are. This is the HN post material and the Anthropic portfolio piece. | D3 | R4: adversarial review of the write-up itself against slopodar. Does it claim more than was proven? Does it omit confounds? | Write-up reviewed by Operator. No slopodar patterns detected. Claims match evidence. | NEXT |

## Adversarial review cadence

Built into the workflow, not bolted on after.

| When | What | Tool | Models | Output |
|------|------|------|--------|--------|
| Post-implementation (per phase) | Stain the diff against watchdog taxonomy + slopodar | `docs/internal/weaver/repo-adversarial-review.md` | 2+ models | Convergence synthesis, fix queue |
| Pre-D3 | Full codebase review | Darkcat Alley (`bin/triangulate`) | 3 models | Metrics, convergence matrix, findings union |
| Post-D3 | Thesis proof artifacts review | Darkcat Alley | 3 models | Delta between pre/post = fix effectiveness |
| D4 write-up | Prose review against slopodar | Manual + model pass | 1+ models | Slopodar stain report |

**Completed reviews:**
- 2026-03-10: R1 (Claude Opus) + R2 (Pi Coding Agent) = 36 findings, 12 converged, 12/12 fixed. Data: `data/alley/repo-review-2026-03-10/`
- 2026-03-11: D2v1 (3x Claude, trivial defect) = retired as slop. Data: `data/alley/crew-live-2026-03-11-093741/`
- 2026-03-11: D3 (Gemini + Grok + GPT-4.1, zip truncation) = 3/3 found bug, 2 FAIL 1 PASS (correct divergence). Data: `data/alley/crew-live-2026-03-11-095825/`

## Sequencing notes

- Phase A is strictly sequential: each step depends on the one before it (except A3/A4 which can be parallelised after A2)
- Phase B can start as soon as A1 is done - B1 and B2 don't need a working agent-in-container
- Phase C requires Phase A complete and Phase B mostly complete
- Phase D requires Phase C complete. D1-D3 are strictly sequential. D4 can start drafting after D2.
- The gate (A1) comes first because everything else builds on verification. No capabilities without a gate.
- Every phase boundary triggers a bearing check (AGENTS.md macro workflow).

## First PR

A1: adapt the gate. Rewrite `make gate` to build the container and run `test-poc.sh` inside it. This is the foundation.

## Completed

| # | Date | Commit | Notes |
|---|------|--------|-------|
| A1 | 2026-03-10 | 8aa96ed | Gate adapted: `make gate` builds container, runs test-poc.sh, 10/10 passing |
| A2 | 2026-03-10 | 6537e2c | drive CLI: tmux sessions + sentinel protocol, 9/9 passing. Gate: 19/19 |
| B1 | 2026-03-10 | 6537e2c | SPEC.md: midget def, governance crew, gauntlet flow, interfaces, thesis criteria |
| A3 | 2026-03-10 | c8087d3 | tesseract in container, steer see --ocr, 3/3 passing. Gate: 22/22 |
| B2 | 2026-03-10 | c8087d3 | Makefile: 13 phase targets (A1-A5, B1-B4, C1-C4), status, graph, done markers |
| A4 | 2026-03-10 | 4ce0827 | Chrome stable in container, steer apps launch --args, 3/3 passing. Gate: 25/25 |
| B4 | 2026-03-10 | 4ce0827 | EVAL.md: criteria, failure modes, confounds, thesis proof scenario |
| A5 | 2026-03-10 | 7b39823 | Node.js + claude 2.1.72 in container, agent loop 4/4 passing. Gate: 29/29 |
| B3 | 2026-03-10 | 550bcd2 | gauntlet wired: .env loaded, gate+pitkeel attest pass (TIER=wip) |
| C1 | 2026-03-10 | 550bcd2 | jobrunner: shell_command task, YAML in/out, 5/5 passing. Gate: 34/34 |
| C2 | 2026-03-10 | 8f517a9 | inter-container: shared volume, producer/consumer jobs, convergence check. C2: 9/9. Gate: 34/34 |
| C3 | 2026-03-10 | b88c251 | swarm: Docker Compose, N workers, atomic job acquisition, volume init. C3: 7/7. Gate: 34/34 |
| C4 | 2026-03-10 | 4476897 | crew: role identities, mount constraints (ro/rw), orchestrator, docker inspect proof. C4: 10/10. Gate: 35/35. Live run: 3/3 FAIL verdicts on injected off-by-one. Thesis proof complete. |
| -- | 2026-03-10 | 3238f9e | Adversarial review R1+R2: 12/12 convergence fixes applied. Gate: 35/35 |
| -- | 2026-03-10 | a88cecb | Review artifacts committed: prompt, R1, convergence synthesis |
| D1 | 2026-03-11 | c353af0 | Live `make crew` with ANTHROPIC_API_KEY. 3 Claude agents ran inside containers with role-specific mount constraints. |
| D2v1 | 2026-03-11 | c353af0 | RETIRED. Off-by-one with BUG comment. Trivial defect, monoculture (3x Claude). Not credible. |
| D2v2 | 2026-03-11 | -- | zip truncation defect (silent wrong answer, no hint). Single-model baseline run (all Claude). |
| D3 | 2026-03-11 | -- | Cross-model crew: Gemini (watchdog), Grok (weaver), GPT-4.1 (sentinel). 3/3 found zip bug. Verdict: 2 FAIL, 1 PASS (sentinel correctly scoped to security). EVAL.md confounds addressed: non-trivial defect, 3 vendors, Claude excluded. |
