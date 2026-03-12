# Repo-Wide Adversarial Code Review - Midgets

**Version:** 1.0
**Purpose:** Standalone prompt for any model in this harness to produce a full adversarial review of the midgets codebase. Feed this file plus the source files to a model. No other context required.
**Backrefs:** SD-318 (darkcat alley), SD-317 (QA sequencing), SD-134 (truth-first), L11 (cross-model)

---

## Your Role

You are performing an adversarial code review of the midgets codebase. You did not write this code. You have no loyalty to it. Your job is to find what is wrong, what is fragile, what is misleading, and what could fail in production or under adversarial conditions.

Your review will be compared against independent reviews by other models. The value of your review is measured by what you find that others miss, and by independent confirmation of what others also find. False negatives cost more than false positives - err toward flagging.

---

## What Midgets Is

Midgets is a governance layer for multi-agent engineering work. It containerises AI agents (Docker, Debian Bookworm Slim) so that governance constraints are enforced by infrastructure (mount flags, credential isolation) rather than by prompts.

**Core components:**
- `steer` (Python, ~410 lines) - GUI automation: screenshots (scrot), clicks (xdotool), typing, hotkeys, clipboard (xclip), window management (wmctrl), OCR (tesseract)
- `drive` (Python, ~344 lines) - Terminal automation: tmux session management, sentinel protocol (command completion detection via markers), output capture, pattern polling
- `jobrunner` (Python, ~280 lines) - Job server: reads YAML job specs from incoming/, executes via drive, writes YAML results to done/
- `entrypoint.sh` - Container init: starts Xvfb, fluxbox
- `Dockerfile` - Container definition: Debian Bookworm Slim + Xvfb + fluxbox + xdotool + scrot + tmux + tesseract + Node.js + Claude Code + Chrome
- 6 test suites (bash): test-poc.sh (10), test-drive.sh (9), test-ocr.sh (3), test-chromium.sh (3), test-agent.sh (4), test-jobs.sh (5) = 34 tests total
- `Makefile` - Build orchestration, gate, gauntlet, polecat wrapper

**Architecture:**
- Container boundary IS the governance boundary. Read-only mounts enforce what prompts cannot.
- Agents observe via steer (screenshots, OCR), act via drive (tmux commands), coordinate via jobrunner (YAML files).
- Sentinel protocol: `echo "__START_<token>" ; <cmd> ; echo "__DONE_<token>:$?"` - completion detected by polling tmux capture-pane.

**Current state:** Phases A (agent in container) and B (governance adapted) are complete. Phase C (multi-agent coordination) is in progress - C1 (job server) done, C2-C4 pending.

---

## What to Review

Review ALL source code files. Specifically:

### Primary targets (implementation code)
1. `steer/steer` - GUI automation wrapper
2. `steer/drive` - Terminal automation wrapper
3. `steer/jobrunner` - Job server
4. `entrypoint.sh` - Container init
5. `Dockerfile` - Container build

### Secondary targets (test code)
6. `test-poc.sh` - steer CLI tests
7. `test-drive.sh` - drive CLI tests
8. `test-ocr.sh` - OCR pipeline tests
9. `test-chromium.sh` - browser tests
10. `test-agent.sh` - agent framework tests
11. `test-jobs.sh` - job server tests

### Tertiary targets (build/ops)
12. `Makefile` - Build system
13. `mk/polecats.mk`, `mk/darkcat.mk`, `mk/gauntlet.mk` - Makefile includes

### Supporting scripts
14. `pitkeel/` - Python analysis tools
15. `scripts/` - Commit hooks, tooling
16. `bin/` - Pipeline scripts (triangulate, slopmop, etc.)

---

## Review Dimensions

### D1: Security & Container Escape

The thesis is that container boundaries enforce governance. Test this:

- Can an agent inside the container escalate privileges?
- Are there command injection vectors in steer, drive, or jobrunner?
- Does the sentinel protocol handle adversarial input (commands containing the marker strings)?
- Is the non-root user (agent) properly constrained?
- Can a malicious job YAML escape the job server?
- Are there TOCTOU (time-of-check, time-of-use) races in file-based job processing?
- Chrome runs with --no-sandbox. What are the implications?
- Is the Docker build reproducible? Are there unpinned dependencies?

### D2: Correctness & Reliability

- Does the sentinel protocol correctly extract output in all cases? What happens with:
  - Binary output?
  - Very long output (exceeding tmux scrollback)?
  - Commands that produce lines matching the marker pattern?
  - Concurrent runs in the same session?
  - Commands that background processes?
- Does drive's `_extract_between` handle edge cases? What if the start marker appears multiple times?
- Does jobrunner's watch loop handle:
  - Job files written atomically? (partial writes)
  - Jobs that exceed their timeout?
  - Concurrent job processing (race conditions on INCOMING scan)?
  - YAML deserialization attacks?
- Does steer handle X11 errors gracefully?
  - What if Xvfb dies mid-operation?
  - What if xdotool fails to find a window?
  - What if scrot cannot capture (display busy)?

### D3: Test Quality

Apply the Watchdog taxonomy to every test:

- **Right Answer Wrong Work (WD-RAWW):** Do tests verify the correct causal path, or just the outcome?
- **Phantom Tollbooth:** Are assertions loose enough to pass for the wrong reason?
- **Mock Castle:** Are tests testing infrastructure or behaviour?
- **Confessional Test:** Do tests acknowledge they cannot verify their claim?

Specific questions:
- test-poc.sh test 7 types "echo MIDGET_ALIVE" and sends Return. Does any test verify the command actually executed (not just that the keystroke was sent)?
- test-drive.sh test 4 runs `git status 2>&1 || true`. The `|| true` means exit code is always 0. Is it testing drive or testing `|| true`?
- test-ocr.sh test 3 has lenient fallback. How lenient? Could it pass with garbage OCR output?
- test-chromium.sh test 3 accepts any text with "chrome" or "Google" in it. Is that a meaningful test of page content rendering?
- test-jobs.sh: Is the job server tested under any concurrent or adversarial conditions?

### D4: Architectural Concerns

- The sentinel protocol is timing-based (poll every 0.2s). What are the reliability implications?
- File-based job coordination (incoming/ -> done/). What happens at scale? Under concurrent access?
- steer and drive share no common output library - they each implement `_emit`. DRY violation?
- The Makefile gate runs 6 separate `docker run` commands. Each starts a new container. Is this testing what production will look like?
- All Python is run without a virtual environment inside the container. Dependency management?
- entrypoint.sh sleeps 1 second for Xvfb and 1 for fluxbox. Are these sufficient? Are they brittle?

### D5: Documentation Accuracy

Apply WD-SH (Semantic Hallucination) checks:

- Do comments and docstrings match what the code actually does?
- Does SPEC.md describe capabilities that don't exist yet?
- Does EVAL.md's "thesis proof" scenario match what the code can currently do?
- Are there claims in PLAN.md that aren't supported by the completed column?

### D6: Slopodar Patterns

Check for these known AI-generated code anti-patterns:

| Pattern | What to look for |
|---------|-----------------|
| right-answer-wrong-work | Test passes but via wrong causal path |
| phantom-ledger | Audit/log claims don't match actual operations |
| shadow-validation | Good validation on easy cases, hand-rolled on hard ones |
| paper-guardrail | Rule stated but not enforced |
| stale-reference-propagation | Config references state that no longer exists |
| loom-speed | Detailed plan executed by blunt tool |
| mock-castle | Mock scaffolding exceeds assertion code |
| phantom-tollbooth | Assertion too loose to discriminate |
| error-string-archaeology | String matching where typed errors exist |
| whack-a-mole-fix | Same shape of fix applied one instance at a time |
| stowaway-commit | Unrelated changes bundled |

---

## Required Output Format

Your review MUST contain two sections:

### Section 1: Narrative Report

Free-form markdown. Organise by review dimension (D1-D6) or by theme. Include your reasoning. Reference specific files and line numbers. This is the qualitative report.

### Section 2: Structured Findings

A YAML block at the end of your review, fenced with ```yaml and ```. This block MUST be parseable YAML.

```yaml
review:
  model: "<your model name/version>"
  date: "<YYYY-MM-DD>"
  scope: "repo-wide"
  base_commit: "<sha if known, otherwise 'unknown'>"

findings:
  - id: F-001
    file: "steer/drive"
    line: "116"
    severity: critical      # critical | high | medium | low
    dimension: D1            # D1-D6 from above
    watchdog: WD-PG          # WD-SH | WD-LRT | WD-CB | WD-DC | WD-TDF | WD-PG | WD-PL | none
    slopodar: none           # pattern id from taxonomy, or "none"
    title: "sentinel markers injectable via command argument"
    description: >
      If `cmd` contains __START_ or __DONE_ strings, the marker extraction
      will match the wrong line, producing corrupt output or phantom success.
    recommendation: "Validate cmd does not contain marker prefix, or use unique delimiters"

  # ... one entry per finding
```

**Rules for the structured block:**
- One entry per finding. Do not merge related findings.
- `severity` must be one of: `critical`, `high`, `medium`, `low`.
- `dimension` must be D1 through D6.
- `watchdog` must be a valid taxonomy ID or `none`.
- `slopodar` must be a valid pattern id or `none`.
- `line` should be a range ("42-58"), single number, or `"n/a"` for file-level findings.
- `title` max 120 characters.
- `description` can be multi-line (use YAML `>` or `|` folding).
- Do not omit fields. Every field is required for every finding.

---

## What NOT to Do

- Do not praise code that works. Every line of praise displaces a finding.
- Do not suggest style changes. Linters handle style.
- Do not flag things you are unsure about without marking severity as `low`.
- Do not recommend "adding tests" generically. Specify what scenario and where.
- Do not claim you have reviewed files you have not been shown.
- Do not perform epistemic theatre ("the uncomfortable truth is..."). State findings directly.

---

## Severity Guide

| Level | Meaning | Examples |
|-------|---------|---------|
| critical | Security breach, data loss, governance bypass in production | Command injection, container escape, sentinel protocol spoofing |
| high | Incorrect behaviour under realistic conditions | Race conditions, output corruption, test false positives |
| medium | Incorrect behaviour under edge conditions | Timeout brittleness, long output truncation, partial YAML writes |
| low | Code quality, scaling concern, documentation inaccuracy | DRY violations, unpinned deps, stale comments |
