# SPEC.md - Midgets Governance Layer

**SD-322** | First spec for midgets | 2026-03-10

---

## What This Is

Midgets is a governance layer for multi-agent engineering work. It turns AI agents from chat-window participants into physical operators with hands - each one containerised, instrumented, and independently verifiable.

The core claim: governance controls that currently exist only as prompts and process can be made structural. A Watchdog that cannot modify source code (container boundary). A Sentinel that gets a read-only diff (mount flags). A Weaver that reviews the PR but cannot merge it (no credentials). The constraints are in the infrastructure, not the system prompt.

---

## What a Midget Is

A midget is a Docker container running:

- Ubuntu 24.04 base
- Xvfb (virtual display at :99, 1280x720x24)
- fluxbox (window manager - needed for focus/raise)
- `steer` CLI: GUI automation (screenshot, click, type, hotkey, clipboard, window list)
- `drive` CLI: terminal automation via tmux (create sessions, run commands with sentinel protocol, capture output, poll for patterns)
- tmux (session manager, driven by `drive`)

Optional per role:
- Chromium (for web-browsing agents - A4)
- Tesseract OCR (for text extraction from screenshots - A3)
- Claude Code / Pi (for agentic work - A5)

A midget has exactly one identity file (`/opt/identity.md`) that defines its role, capabilities, and constraints. The identity file is injected at build time or mount time - it does not come from the agent's own reasoning.

A midget is stateless across jobs. State is committed to git or written to shared volumes. The container can be destroyed and recreated without loss.

---

## What the Governance Crew Is

The governance crew is a set of midgets with distinct roles operating on the same codebase:

| Role | Midget | Capabilities | Constraints |
|------|--------|-------------|-------------|
| Dev | dev-midget | Full write access, all tools | None - produces the diff |
| Watchdog | watchdog-midget | Write tests, run tests | Read-only mount on source (writes to test/ only) |
| Weaver | weaver-midget | Read diff, read tests, write review | Read-only mount, no commit credentials |
| Sentinel | sentinel-midget | Read diff, run scanners | Read-only mount, no commit credentials |

The crew operates on a shared volume (the git repo). Each midget sees the same state. No midget can see another's reasoning - only its outputs (diffs, test results, review JSON).

Coordination is file-based. The orchestrator writes a job description. The midget reads it, executes, writes its result. The orchestrator reads the result, decides next step.

---

## What the Multi-Agent Gauntlet Means

The gauntlet is the verification pipeline applied to a code change before it is committed.

Single-agent gauntlet (current, Phase A):
```
gate (build + test-poc + test-drive)
  -> darkcat-all (3 models review the diff)
  -> pitkeel (signal analysis)
  -> attestation
```

Multi-agent gauntlet (Phase C target):
```
dev-midget produces diff
  -> watchdog-midget: writes missing tests, runs full test suite
  -> weaver-midget: reviews diff + test results, writes structured YAML review
  -> sentinel-midget: scans diff for security issues, writes structured YAML report
  -> orchestrator: triangulates findings, synthesises verdict
  -> gate: all checks green
  -> commit
```

Each step produces a structured YAML artifact. The orchestrator applies `bin/triangulate` (multi-model convergence logic) to the review artifacts. Convergence = higher confidence. Divergence = escalate to human.

The gauntlet is not "run the tests and hope". It is: independent agents with different roles and different access levels all saying "I reviewed my domain and it is correct". Structural independence, not prompt independence.

---

## Interfaces

### steer CLI

```
steer see [--json]                    # screenshot + window list
steer click --x N --y N [--json]      # click at coordinates
steer type "text" [--clear] [--json]  # type into focused window
steer hotkey "combo" [--json]         # send key combination
steer scroll {up|down} [N] [--json]   # scroll
steer apps {list|launch|activate} [name] [--json]
steer clipboard {read|write} [text] [--json]
steer screens [--json]                # display info
```

All commands emit `{"ok": true, ...}` or `{"ok": false, "error": "..."}`.

### drive CLI

```
drive session {create|list|kill} [name] [--json]
drive run <session> <cmd> [--timeout N] [--json]     # sentinel protocol
drive send <session> <text> [--no-enter] [--json]    # raw keystrokes
drive logs <session> [--lines N] [--json]            # capture-pane
drive poll <session> --until <pattern> [--timeout N] [--interval F] [--json]
```

Sentinel protocol: `echo "__START_<token>" ; <cmd> ; echo "__DONE_<token>:$?"`
Completion detected by polling `tmux capture-pane`. Exit code extracted from marker.
Output extracted between markers.

### Job protocol (Phase C)

A job is a YAML file written to `/opt/jobs/incoming/<id>.yaml`:

```yaml
job_id: <uuid>
created: <iso8601>
role: watchdog           # which crew role should handle this
task: run_tests          # what to do
context:
  diff_path: /opt/shared/diff.patch
  source_path: /opt/shared/repo
timeout: 300
```

Result written to `/opt/jobs/done/<id>.yaml`:

```yaml
job_id: <uuid>
completed: <iso8601>
role: watchdog
exit_code: 0
verdict: pass
artifacts:
  - /opt/shared/test-results.json
summary: "12 tests, 12 passing, 0 failing"
```

---

## Container Boundaries

The container boundary IS the governance boundary. This is the load-bearing design decision.

- A read-only source mount means the agent cannot modify source code regardless of what it reasons. No prompt can override a mount flag.
- No commit credentials means the agent cannot push regardless of what it reasons.
- No network access (future: --network none) means the agent cannot exfiltrate regardless of what it reasons.

This is the distinction between governance-by-prompt (current state of the art) and governance-by-infrastructure (what this builds toward).

---

## What Would Prove the Thesis

See EVAL.md (B4) for full success/failure criteria. Short form:

- A code change goes through the full multi-agent gauntlet with zero human intervention between dev-midget producing the diff and the attestation being written.
- Each crew member's role is enforced by infrastructure, not by the system prompt.
- The gauntlet catches at least one real defect that the dev-midget introduced (intentionally or not).
- The orchestrator correctly escalates a divergent finding to human review.

---

## What Is Out of Scope

- Accessibility tree / AT-SPI2 integration (future phase, not needed for governance proof)
- Natural language job descriptions (jobs are structured YAML - NL parsing adds complexity without value for now)
- Cross-host networking (all midgets on one host for Phase C; multi-host is Phase D+)
- Production deployment (this is an engineering proof, not a product)
- Any UI visible to end users
