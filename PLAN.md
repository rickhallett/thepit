# PLAN.md - Midget-Castle Build Trajectory

**SD-322** | First build trajectory for midgets | 2026-03-10

## Bearing

Turn the midget POC into a governance layer for multi-agent work. The POC proves a Docker container works as an agent's GUI sandbox (10/10, steer CLI, screenshots, clicks, typing, clipboard). The gap is everything between "container works" and "governance crew operating as physical agents."

## What exists today

- Docker container: Ubuntu 24.04 + Xvfb + fluxbox + xdotool + scrot
- `steer` CLI wrapper: see, click, type, hotkey, scroll, apps, clipboard, screens
- `test-poc.sh`: 10 end-to-end tests, all passing
- Governance tooling (carried forward from thepit-v2): Makefile, darkcat pipeline, pitkeel, gauntlet, slopodar, lexicon, agent identity files
- The governance tooling targets are stale - they reference thepit-v2's pnpm project and plan files that don't exist here

## Three phases

### Phase A - Get an agent operating inside the container

The POC proves the sandbox works. This phase puts an agent in it.

| # | Step | What it does | Depends on | Verifiable by |
|---|------|-------------|------------|---------------|
| A1 | Adapt the gate | Rewrite the gate to run `test-poc.sh` as midgets' quality gate. Current gate assumes pnpm/thepit-v2. This gives us a verification foundation before we add capabilities. | Nothing | `make gate` exits 0 |
| A2 | Terminal protocol (drive port) | tmux session inside the container. The agent drives CLI commands through tmux send-keys / capture-pane. Port the sentinel protocol from mac-mini-agent. | A1 | Agent can run `ls`, `git status`, `steer see` from tmux and capture output |
| A3 | OCR | Tesseract inside the container. `steer see` returns screenshot + extracted text. The agent can now read what's on screen without relying on vision API calls. | A1 | `steer see --ocr` returns text content from a known screen state |
| A4 | Chromium | Headless Chromium in the container. The agent can browse, interact with web UIs, and use devtools protocol. | A1, A3 | `steer apps launch chromium`, navigate to URL, `steer see --ocr` returns page text |
| A5 | Agent framework in container | Run Claude Code (or Pi) inside the container. The agent has: terminal (A2), screen reading (A3), browser (A4), and the steer CLI. It can now do real work. | A2, A3, A4 | Agent inside container completes a small task (e.g. clone a repo, run tests, report result) end-to-end |

### Phase B - Adapt governance for midgets

The governance system exists but its targets point at the old project. This phase rewires it.

| # | Step | What it does | Depends on | Verifiable by |
|---|------|-------------|------------|---------------|
| B1 | SPEC.md | Define what the midgets governance layer does. What a midget is. What a governance crew is. What "multi-agent gauntlet" means concretely. | A1 | SPEC.md exists, reviewed by Operator |
| B2 | Rewrite Makefile targets | Replace the 26 polecat tasks (which reference thepit-v2 plans) with midgets-specific targets. Keep the darkcat and gauntlet structure - rewrite the task list. | A1, B1 | `make status` shows midgets-specific tasks, `make gauntlet` runs the adapted pipeline |
| B3 | Gauntlet for containers | The gauntlet currently runs on host. Adapt it to verify container-based work: build container, run tests inside it, run darkcat on the diff, run pitkeel. | A5, B2 | `make gauntlet` builds container, runs test-poc.sh inside, runs darkcat on changes |
| B4 | EVAL.md | Success and failure criteria for midgets. What does "working governance layer" mean? What would prove the thesis? What would disprove it? | B1 | EVAL.md exists, reviewed by Operator |

### Phase C - Multi-agent coordination

Multiple midgets working together under governance.

| # | Step | What it does | Depends on | Verifiable by |
|---|------|-------------|------------|---------------|
| C1 | Listen port (job server) | A midget can receive work. Simple job queue - accept a task description, execute it, report result. Could be HTTP, could be filesystem-based, could be Redis. Simplest thing that works. | A5 | Send a job to a running midget, receive structured result |
| C2 | Inter-container communication | Two midgets can exchange data. Shared volume, message bus, or direct API. One midget produces an artifact, another consumes it. | C1 | Midget-A writes a file, Midget-B reads it and acts on it |
| C3 | Multi-container orchestration | Spin up N midgets, dispatch work, collect results. Docker Compose or k3s. The orchestrator is the Operator's control plane. | C1, C2 | `make swarm N=3 TASK=test` spins up 3 midgets, distributes work, collects results |
| C4 | Governance crew as physical agents | Weaver, Watchdog, Sentinel as actual containerised agents. Weaver reviews PRs by reading diffs inside its container. Watchdog writes and runs tests. Sentinel scans for security issues. Each has its own midget, its own identity file, its own steer instance. | C3, B3 | A code change goes through: dev-midget implements, watchdog-midget tests, weaver-midget reviews, sentinel-midget scans. All automated, all containerised. |

## Sequencing notes

- Phase A is strictly sequential: each step depends on the one before it (except A3/A4 which can be parallelised after A2)
- Phase B can start as soon as A1 is done - B1 and B2 don't need a working agent-in-container
- Phase C requires Phase A complete and Phase B mostly complete
- The gate (A1) comes first because everything else builds on verification. No capabilities without a gate.

## First PR

A1: adapt the gate. Rewrite `make gate` to build the container and run `test-poc.sh` inside it. This is the foundation.

## Completed

| # | Date | Commit | Notes |
|---|------|--------|-------|
| A1 | 2026-03-10 | - | Gate adapted: `make gate` builds container, runs test-poc.sh, 10/10 passing |
