# Adversarial Code Review - Midgets Codebase

**Reviewer:** Claude Opus 4 (claude-opus-4-6)
**Date:** 2026-03-10
**Scope:** Repo-wide, all implementation code
**Base commit:** 01e259b (HEAD of main)

---

## D1: Security & Container Escape

### Command injection in sentinel protocol (CRITICAL)

`drive` line 116 constructs the sentinel-wrapped command via string interpolation:

```python
wrapped = f'echo "{start_marker}" ; {cmd} ; echo "{done_marker}:$?"'
```

The `cmd` argument is unsanitized user input passed directly from the CLI or from jobrunner. If `cmd` contains shell metacharacters (`;`, `&&`, `|`, `$()`, backticks), they execute in the tmux session. This is by design for legitimate use, but becomes critical when jobrunner accepts `cmd` from YAML files in `incoming/`.

Any process that can write a file to `incoming/` can execute arbitrary commands inside the container. The job YAML `context.cmd` field flows directly to `drive run` with no validation, no sanitization, and no allowlist.

### Sentinel marker injection (HIGH)

If a command's output happens to contain `__DONE_<token>:<digit>` on its own line, `_extract_between` will match it as the done marker and truncate the real output. The token is a random 12-char hex, making accidental collision unlikely but not impossible with adversarial input. A malicious command could deliberately echo a spoofed done marker with exit code 0 to hide a failure:

```bash
echo "__DONE_${token}:0"  # if token is predictable or leaked
```

The token is generated per-invocation and not exposed to the command being run, so this requires the attacker to either: (a) read the tmux pane to extract the token, or (b) produce a line matching the regex by chance. Risk is medium in practice, high in adversarial scenarios.

### Chrome --no-sandbox (MEDIUM)

Chrome runs with `--no-sandbox` (test-chromium.sh line 17). Inside a container, this is standard practice because the sandbox requires kernel capabilities that containers don't have. However, this means Chrome's multi-process sandboxing is disabled. A compromised renderer process has full access as the `agent` user. Combined with the non-root user having write access to `/opt/steer/` scripts... a Chrome exploit could modify steer or drive, which other processes trust.

Actually, checking Dockerfile line 57: `RUN chmod +x` runs as root during build. The `agent` user (line 63-64) owns `/home/agent` but `/opt/steer/` is owned by root. So steer/drive are not writable by agent. This mitigates the Chrome concern - the attack surface is limited to agent's home directory and /tmp.

### YAML deserialization in jobrunner (LOW)

`jobrunner` line 114 uses `yaml.safe_load()`, which is correct - it prevents arbitrary Python object instantiation. No vulnerability here. However, there is no schema validation on the loaded YAML. A job with missing fields (no `job_id`, no `task`, no `context`) will hit KeyError or produce garbage results. This is a robustness issue, not a security issue.

### TOCTOU in jobrunner watch loop (MEDIUM)

`cmd_watch` (line 172-185) scans `incoming/`, processes files, then `unlink()`s them. Between the `glob()` and the `unlink()`, another process could replace the file contents. The `processed` set tracks by Path object, not by file content hash. If a file is replaced after being added to `processed`, the replacement is never processed. If a file is replaced between `safe_load()` and `unlink()`, the replacement is lost.

More practically: if two jobrunner instances run concurrently (not protected against), both could pick up the same job file, leading to duplicate execution.

### Docker build reproducibility (LOW)

Dockerfile lines 12-31 and 34-38 use `apt-get install` without version pinning. Line 37 uses `npm install -g @anthropic-ai/claude-code` without a version. Line 42-46 downloads `google-chrome-stable_current_amd64.deb` from Google's CDN - no checksum, no version pin. Builds on different days will produce different containers.

---

## D2: Correctness & Reliability

### drive output extraction assumes unique start marker on own line (HIGH)

`_extract_between` (drive line 250-263) uses `stripped == start_marker` for exact-line matching. The docstring explains this is to avoid matching the marker inside the echo command line. However, the start marker is also `echo`-ed as part of the sentinel wrapper. If the shell's prompt contains the marker string (unlikely but possible with adversarial PS1), or if the command being run itself echoes the start marker on its own line, extraction breaks.

More importantly: if the command fails before the start marker is echoed (e.g., tmux send-keys fails silently), the polling loop will timeout. The timeout error path (line 128-134) returns partial_output but the error handling is correct.

### drive run exit code return is inconsistent (HIGH)

Line 155: `return 0 if exit_code == 0 else exit_code or 1`

This returns the exit code of the command as the exit code of the `drive run` process. But drive also returns 1 for its own errors (session not found, timeout). There is no way to distinguish "the command exited 1" from "drive itself failed". The JSON output distinguishes these (ok=false for drive errors), but the process exit code does not.

### drive poll: regex compiled on every iteration (LOW)

`cmd_poll` (line 214-227) calls `re.search(pattern, pane_content)` on every poll iteration without pre-compiling the regex. For long-running polls with complex patterns, this is wasteful. Also, if `pattern` is an invalid regex, it will raise `re.error` inside the loop with no handler - the exception propagates to main() and produces an ugly traceback rather than a structured error.

### steer run() silently swallows errors (HIGH)

`steer` line 23-28:

```python
def run(cmd, capture=True):
    result = subprocess.run(cmd, capture_output=capture, text=True)
    if result.returncode != 0 and capture:
        return None
    return result.stdout.strip() if capture else None
```

When `capture=False`, the function always returns `None` regardless of success or failure. When `capture=True` and the command fails, it returns `None`. Callers like `cmd_see` check `if not png_path.exists()` after a scrot call, but `cmd_apps` "activate" (line 248) calls `run()` with `capture=False` and never checks if wmctrl actually worked. The `ok: true` response is unconditional.

### steer cmd_click always returns ok:true (MEDIUM)

Line 115: `run(cmd, capture=False)` - xdotool click. Even if the click fails (no display, invalid coordinates, xdotool crashed), the function emits `ok: true`. There is no error path.

### entrypoint.sh sleep timing (MEDIUM)

Lines 6-18: Xvfb starts, sleep 1, check if PID is alive, start fluxbox, sleep 1. The `kill -0` check verifies the process exists but not that the display is ready to accept connections. If Xvfb takes >1 second to initialize the display (possible under high load or low resources), fluxbox will fail to connect. The failure would be silent - fluxbox backgrounded with `&`.

A more robust approach: poll `xdpyinfo -display :99` until it succeeds, with timeout.

### jobrunner: no timeout enforcement on shell commands (HIGH)

`execute_shell_command` passes `timeout` to `drive run --timeout`. But drive's timeout is on the sentinel polling loop, not on the command itself. If a command produces output but never terminates (e.g., `tail -f`), the sentinel marker is never echoed, and drive will timeout. But the command continues running in the tmux session. jobrunner then kills the session (line 103: `drive("session", "kill", session)`), which terminates the command.

However, between timeout detection and session kill, the command is still running. If the command has side effects (writes files, makes network calls), those side effects continue during this window.

### jobrunner watch loop: processed set grows without bound (LOW)

Line 169: `processed = set()`. Every job file path ever seen is added to this set and never removed. Over a long-running watch loop, this set grows unboundedly. Not a practical concern for current usage but indicates the watch loop is designed for short runs, not as a daemon.

---

## D3: Test Quality

### test-poc.sh: typing + hotkey tests don't verify execution (HIGH)

Tests 7 and 8 type `echo MIDGET_ALIVE` and send Return. The assertions verify:
- Test 7: `d['text']=='echo MIDGET_ALIVE'` - verifies the type command's response JSON, not that text appeared on screen
- Test 8: `d['ok']` - verifies Return key was sent, not that the command executed

Test 10 takes a final screenshot but never checks if "MIDGET_ALIVE" appears in it (either via OCR or file comparison). The comment says "should show xterm with MIDGET_ALIVE output" but this is not verified. Right-answer-wrong-work: the test passes if typing fails silently and the hotkey does nothing.

### test-drive.sh test 4: `|| true` masks drive failures (HIGH)

Line 74: `RESULT=$("$DRIVE" run "$SESSION" "git status 2>&1 || true" --json 2>/dev/null)`

The `|| true` ensures the command always exits 0 inside the sentinel. Then the test checks `OK == "True"` and that output is non-empty. This test cannot distinguish:
- drive correctly ran git status and captured "not a git repository"
- drive failed to run anything but returned ok:true with garbage output
- the sentinel protocol broke but `|| true` masked it

The test's stated purpose is "captures git output (or no-repo message)". It should test that the output contains one of these expected strings.

### test-ocr.sh test 3: lenient fallback is too lenient (MEDIUM)

Lines 65-76: First checks for OCRPROOF variants. If that fails, falls back to checking `wc -w > 2`. Any OCR output with more than 2 words passes. The xterm window has a shell prompt, window decorations, and other text. Three words of garbage OCR from window chrome would pass this test.

The test should at minimum verify the OCR text is plausibly from a terminal (contains shell-like content) rather than just "more than 2 words".

### test-chromium.sh test 3: accepts any Chrome-related string (MEDIUM)

Line 76: `grep -qiE "CHROMIUMPROOF|CHROM|Google|browser|chrome"`. The Chrome UI itself contains "Google" and "chrome" in its title bar, about page, or new tab page. This test passes even if the `data:text/plain,CHROMIUMPROOF` URL never loaded - just having Chrome open is sufficient to match "chrome" or "Google" in the OCR.

The fallback (lines 81-83) is even weaker: window_count >= 2 and words > 5. This passes as long as Chrome's UI text generates 5 OCR words.

### test-jobs.sh: no concurrent or adversarial testing (MEDIUM)

All 5 tests are sequential, single-job, happy-path or simple-failure scenarios. Missing:
- Concurrent job submission
- Malformed YAML
- Missing required fields
- Extremely long command output
- Job that writes to incoming/ (self-replicating job)
- Timeout scenarios

### test-agent.sh test 3: final screenshot verification is weak (LOW)

The test verifies the file exists (`-f "$FINAL_SCREENSHOT"`), not that it contains any specific content. A zero-byte file or corrupted PNG would pass.

---

## D4: Architectural Concerns

### Gate runs 6 separate containers (MEDIUM)

Makefile lines 55-69: Each test suite runs in a fresh `docker run --rm` container. Each container starts Xvfb, fluxbox, waits 2 seconds, then runs tests. For 6 suites, that is 6 container startups + 12 seconds of sleep. This is architecturally different from production, where a single container runs all tools together. A bug that manifests only when steer and drive operate in the same session (resource contention, /tmp conflicts, display locking) would not be caught by the gate.

### _emit duplicated across three files (LOW)

steer line 307-330, drive line 266-282, jobrunner line 157-162: Three separate implementations of the dual-output emitter. steer's version handles nested dicts specially; drive's and jobrunner's do not. If the output contract changes (e.g., adding a standard error field), three files need updating.

### No shared library between steer, drive, jobrunner (LOW)

All three tools are standalone Python scripts with no shared imports. Each reimplements subprocess wrappers, JSON emission, and argument parsing patterns. This is acceptable for a POC but will drift as features are added. The Dockerfile copies the entire `steer/` directory - a shared utils module would not increase complexity.

### Makefile gate does not verify the SAME image across suites (LOW)

Each `docker run` uses `$(MIDGET_IMAGE)` which is the image tagged by the preceding `docker build`. But if the build layer cache is invalidated between runs (unlikely but possible with concurrent builds), different suites could run against different images. The build happens once at the top; the risk is theoretical.

### Polecats.mk: phase targets just re-run the full gate (MEDIUM)

Every phase target (A1 through C4) runs `$(MAKE) gate`, which rebuilds the container and runs ALL test suites. A1 and A5 run the exact same gate. The dependency graph (A5 depends on A2, A3, A4) is enforced by .done/ marker files, but the verification is identical - there is no per-phase verification. The PLAN says "A2: terminal protocol (drive)" but `make A2` runs the same 34 tests as `make A1`. The phase targets are completion markers, not scoped verification.

---

## D5: Documentation Accuracy

### SPEC.md describes Phase C job protocol as implemented (MEDIUM)

SPEC.md lines 116-140 describe the job protocol with full YAML schemas and example files. The jobrunner implements `shell_command` as the only task type. SPEC describes `role: watchdog` and `task: run_tests` as examples, implying these are real task types. They are not - only `shell_command` exists. The SPEC is aspirational, not descriptive.

The SPEC also describes "/opt/jobs/incoming/" as the job path, but jobrunner defaults to "/tmp/jobs" (overridable via MIDGET_JOBS_DIR). The test suite uses /tmp/jobs. The SPEC and the implementation disagree on the default path.

### EVAL.md C4 thesis proof describes capabilities that don't exist (MEDIUM)

EVAL.md lines 49-58 describe a scenario where dev-midget, watchdog-midget, weaver-midget, and sentinel-midget operate as separate containers. C2-C4 are not implemented. The thesis proof scenario is speculative, not verifiable today. The document acknowledges this ("Phase C target") but the criterion table (lines 39-44) does not clearly mark C2-C4 as unimplemented.

### steer docstring claims "No OCR yet" (LOW)

steer line 8: `No OCR yet (tesseract is phase 2).` But OCR was added in A3 (lines 87-89). The top-of-file docstring is stale.

### drive docstring is accurate (no finding)

drive's docstring (lines 1-24) accurately describes all implemented functionality.

---

## D6: Slopodar Patterns

### shadow-validation: OCR test lenient fallback (MEDIUM)

test-ocr.sh and test-chromium.sh both implement a two-tier assertion: strict match first, lenient fallback second. The lenient path is so loose it cannot discriminate between working OCR and garbage. The validation is good for the easy case (exact string match) and absent for the critical path (what happens when OCR is unreliable?). This is the shadow-validation pattern: good abstraction on easy cases, hand-rolled pass-through on hard ones.

### phantom-tollbooth: test-drive.sh test 4 (HIGH)

The `|| true` construction means the test's assertion (ok=True, output non-empty) is satisfied by any output at all. The tollbooth is wide open - it accepts every vehicle.

### paper-guardrail: container boundary claims (LOW)

SPEC.md and EVAL.md extensively describe container boundaries as governance enforcement. Currently, there is one container image, and it runs with full access to everything inside it. The governance crew (Watchdog read-only, Sentinel read-only) described in SPEC.md does not exist. The claim that "the container boundary IS the governance boundary" is a paper guardrail until C4 is implemented with actual mount constraints.

However, this is explicitly stated as the Phase C target, and the documents acknowledge it. The pattern is present but disclosed.

### stale-reference-propagation: steer POC docstring (LOW)

steer line 8 references "phase 2" for OCR, but OCR is implemented. Agents booting with steer's docstring as context will believe OCR is unavailable.

---

## Summary

The codebase is a well-structured POC with a clear thesis and clean separation of concerns. The primary risks are:

1. **Command injection** through unsanitized job YAML - the file-based job protocol is the largest attack surface.
2. **Test quality** - multiple tests that pass for the wrong reason (right-answer-wrong-work, phantom-tollbooth). The OCR and Chrome tests are especially weak.
3. **Error handling** in steer - multiple commands return ok:true unconditionally, meaning the agent cannot detect when its actions failed.
4. **Sentinel protocol reliability** - marker-based completion detection works but has edge cases around output truncation, concurrent use, and adversarial marker injection.
5. **Documentation drift** - steer docstring says OCR is missing; SPEC describes paths that don't match implementation.

The architectural thesis (container boundaries as governance) is sound but unproven - the implementation currently has one container type with no mount-based restrictions. Phase C will test the thesis.

---

```yaml
review:
  model: "claude-opus-4-6"
  date: "2026-03-10"
  scope: "repo-wide"
  base_commit: "01e259b"

findings:
  - id: F-001
    file: "steer/drive"
    line: "116"
    severity: high
    dimension: D1
    watchdog: none
    slopodar: none
    title: "Sentinel cmd argument passed unsanitized to tmux - injection via job YAML"
    description: >
      drive run constructs the sentinel wrapper via f-string interpolation. The cmd
      argument is never validated. When jobrunner passes cmd from YAML context.cmd,
      any shell metacharacter is live. A file dropped into incoming/ can execute
      arbitrary commands. This is by-design for CLI use but uncontrolled for job use.
    recommendation: >
      Add an optional allowlist/denylist of shell metacharacters at the jobrunner layer.
      At minimum, log a warning when cmd contains ; && || $( backtick.

  - id: F-002
    file: "steer/drive"
    line: "250-263"
    severity: medium
    dimension: D2
    watchdog: WD-LRT
    slopodar: none
    title: "Marker extraction can be spoofed by adversarial command output"
    description: >
      _extract_between matches lines where stripped == start_marker. A command that
      echoes the start marker on its own line will reset the extraction window.
      The done_marker regex is anchored but uses a 12-char hex token that the running
      command does not know - risk is low for non-adversarial, non-trivial for adversarial.
    recommendation: >
      Use a cryptographically random token (uuid4 is fine - already used) and ensure
      markers include a prefix that cannot appear in normal output (e.g., NUL byte prefix).
      Or validate extracted output length against capture-pane character count.

  - id: F-003
    file: "steer/drive"
    line: "155"
    severity: medium
    dimension: D2
    watchdog: WD-CB
    slopodar: none
    title: "drive run exit code conflates command failure with drive failure"
    description: >
      Returns exit_code of the run command as the process exit code. drive's own
      errors (timeout, session not found) also exit non-zero. CLI callers cannot
      distinguish 'command exited 1' from 'drive itself failed' without parsing JSON.
    recommendation: >
      Reserve specific exit codes for drive errors (e.g., 125 for drive internal error,
      126 for timeout) and pass through command exit codes 0-124.

  - id: F-004
    file: "steer/steer"
    line: "23-28"
    severity: high
    dimension: D2
    watchdog: WD-DC
    slopodar: none
    title: "run() helper silently swallows subprocess failures"
    description: >
      When capture=False, returns None regardless of exit code. When capture=True
      and exit code != 0, returns None. Callers like cmd_apps activate never check
      the return value. cmd_click calls run() with capture=False and always emits
      ok:true. The agent cannot detect when its GUI actions fail.
    recommendation: >
      Return (success: bool, output: str) tuple. Or raise on non-zero when capture=True.
      At minimum, check return code in cmd_click, cmd_type, cmd_hotkey, cmd_apps activate.

  - id: F-005
    file: "steer/steer"
    line: "95-126"
    severity: medium
    dimension: D2
    watchdog: WD-PG
    slopodar: paper-guardrail
    title: "cmd_click always reports ok:true even if xdotool fails"
    description: >
      The click command calls run(cmd, capture=False) and unconditionally emits
      ok:true. If xdotool fails (display disconnected, invalid coordinates causing
      error), the agent believes the click succeeded. This is a paper guardrail - the
      ok field claims success but there is no verification mechanism.
    recommendation: >
      Use capture=True, check return code, emit ok:false on failure.

  - id: F-006
    file: "test-poc.sh"
    line: "92-108"
    severity: high
    dimension: D3
    watchdog: none
    slopodar: right-answer-wrong-work
    title: "Type + hotkey tests verify command metadata, not execution effect"
    description: >
      Test 7 asserts d['text']=='echo MIDGET_ALIVE' (the input to steer type, not
      the screen result). Test 8 asserts d['ok'] (Return was sent, not that the
      command ran). Test 10 takes a screenshot but never verifies MIDGET_ALIVE
      appears in it. The tests prove steer accepted the input, not that it produced
      the effect. Typing could silently fail and all tests pass.
    recommendation: >
      After test 8, add a steer see --ocr check or drive-based verification that
      MIDGET_ALIVE appears in the xterm output.

  - id: F-007
    file: "test-drive.sh"
    line: "74-81"
    severity: high
    dimension: D3
    watchdog: none
    slopodar: phantom-tollbooth
    title: "git status test uses || true, masking sentinel protocol verification"
    description: >
      The command 'git status 2>&1 || true' always exits 0 inside the sentinel.
      The test then checks ok=True and output non-empty. Any non-empty output
      (including drive error messages) would pass. The test cannot detect if the
      sentinel protocol itself is broken for this command.
    recommendation: >
      Remove || true. Test that exit_code is non-zero (no git repo) OR that output
      contains expected strings ('not a git repository' or 'On branch').

  - id: F-008
    file: "test-ocr.sh"
    line: "65-76"
    severity: medium
    dimension: D3
    watchdog: none
    slopodar: shadow-validation
    title: "OCR test lenient fallback passes with 3+ garbage words"
    description: >
      If the strict OCRPROOF match fails, the test falls back to wc -w > 2.
      Window decorations, shell prompt text, and OCR noise from a blank terminal
      can produce 3+ words. The test cannot distinguish working OCR from
      incidental text capture.
    recommendation: >
      Tighten the fallback: require a known shell prompt pattern ($ or %) or
      at least one alphanumeric word > 4 chars. Or remove the lenient path and
      investigate OCR font/rendering if the strict match fails.

  - id: F-009
    file: "test-chromium.sh"
    line: "76-87"
    severity: medium
    dimension: D3
    watchdog: none
    slopodar: shadow-validation
    title: "Chrome OCR test accepts Chrome UI text as proof of page content"
    description: >
      The grep accepts 'chrome', 'Google', 'browser' - all present in Chrome's
      own UI regardless of page content. CHROMIUMPROOF from the data: URL is the
      meaningful assertion, but the alternatives make it impossible to distinguish
      'page loaded' from 'Chrome is open'. The lenient fallback (windows >= 2,
      words > 5) is even weaker.
    recommendation: >
      Remove the alternative patterns. If CHROMIUMPROOF is not found, the test
      should fail or use a higher-contrast test page (large font, solid background).

  - id: F-010
    file: "steer/jobrunner"
    line: "172-185"
    severity: medium
    dimension: D1
    watchdog: none
    slopodar: none
    title: "Watch loop TOCTOU: job files can be replaced between read and unlink"
    description: >
      Between glob(), safe_load(), and unlink(), a concurrent writer can replace
      the file. The 'processed' set tracks by path, not by inode or content hash.
      Two jobrunner instances running concurrently would process the same job twice
      (no file locking, no atomic claim mechanism).
    recommendation: >
      Use atomic rename (mv) to claim a job: mv incoming/job.yaml processing/job.yaml.
      Only the process that successfully renames the file processes it.

  - id: F-011
    file: "entrypoint.sh"
    line: "6-18"
    severity: medium
    dimension: D2
    watchdog: none
    slopodar: none
    title: "Xvfb/fluxbox readiness based on sleep, not connection verification"
    description: >
      sleep 1 after Xvfb start, sleep 1 after fluxbox start. The kill -0 check
      verifies the process exists but not that the X display accepts connections.
      Under high load, Xvfb may not be ready after 1 second. fluxbox failure is
      undetected (backgrounded with &, stderr not captured). Tests that depend on
      window management (wmctrl, xdotool) will fail intermittently.
    recommendation: >
      Replace sleep with a polling loop: while ! xdpyinfo -display :99 2>/dev/null;
      do sleep 0.1; done. Check fluxbox PID after starting.

  - id: F-012
    file: "SPEC.md"
    line: "116-140"
    severity: medium
    dimension: D5
    watchdog: WD-SH
    slopodar: none
    title: "SPEC job protocol path (/opt/jobs/) differs from implementation (/tmp/jobs)"
    description: >
      SPEC.md describes incoming jobs at /opt/jobs/incoming/. jobrunner defaults
      to /tmp/jobs (MIDGET_JOBS_DIR env override). test-jobs.sh uses /tmp/jobs.
      An agent reading SPEC.md will use the wrong path.
    recommendation: >
      Align SPEC with implementation or set MIDGET_JOBS_DIR=/opt/jobs in entrypoint.sh.

  - id: F-013
    file: "steer/steer"
    line: "8"
    severity: low
    dimension: D5
    watchdog: WD-SH
    slopodar: stale-reference-propagation
    title: "steer docstring says 'No OCR yet' but OCR is implemented"
    description: >
      Line 8: 'No OCR yet (tesseract is phase 2).' OCR was added in commit c8087d3
      (A3). The docstring is stale. Agents reading this file's header will believe
      OCR is unavailable.
    recommendation: "Update docstring to reflect current state."

  - id: F-014
    file: "mk/polecats.mk"
    line: "15-79"
    severity: medium
    dimension: D4
    watchdog: WD-CB
    slopodar: none
    title: "All phase targets run identical gate - no per-phase verification scope"
    description: >
      A1 through C4 all run $(MAKE) gate, which executes all 6 test suites (34
      tests). Phase dependencies (.done/ markers) control sequencing, but the
      verification is undifferentiated. make A1 and make C4 run the exact same
      tests. There is no way to verify that a specific phase's new capability
      works beyond the fact that the existing gate still passes.
    recommendation: >
      Add phase-specific test targets: A2 should run test-drive.sh specifically
      and verify its output, not just re-run the full gate.

  - id: F-015
    file: "Makefile"
    line: "55-69"
    severity: medium
    dimension: D4
    watchdog: none
    slopodar: none
    title: "Gate runs 6 separate containers - misses same-container interactions"
    description: >
      Each test suite gets its own docker run. In production, all tools operate
      in the same container. Resource contention between steer and drive (both
      access the X display and tmux), /tmp collisions between test artifacts,
      and display locking issues would only manifest in a single-container run.
    recommendation: >
      Add a 'gate-integrated' target that runs all test suites sequentially
      inside a single container invocation.

  - id: F-016
    file: "steer/steer"
    line: "307-330"
    severity: low
    dimension: D4
    watchdog: WD-CB
    slopodar: none
    title: "_emit duplicated across steer, drive, and jobrunner with divergent implementations"
    description: >
      Three separate _emit functions. steer's handles nested dicts with summary
      formatting. drive's and jobrunner's print flat key-value only. If the output
      contract evolves (e.g., adding timestamp, adding error details), three files
      need updating independently.
    recommendation: >
      Extract to steer/common.py or steer/output.py. Import in all three scripts.

  - id: F-017
    file: "Dockerfile"
    line: "12-46"
    severity: low
    dimension: D1
    watchdog: WD-TDF
    slopodar: none
    title: "Docker build has no version pinning on any dependency"
    description: >
      apt-get packages, npm global install, and Chrome .deb are all unpinned.
      Builds on different days produce different containers. Chrome auto-update
      from dl.google.com is particularly volatile. No SHA256 checksum verification
      on the downloaded .deb.
    recommendation: >
      Pin apt packages to specific versions. Pin claude-code to a version.
      Pin Chrome to a specific .deb URL with checksum verification.

  - id: F-018
    file: "steer/drive"
    line: "214-227"
    severity: low
    dimension: D2
    watchdog: none
    slopodar: none
    title: "drive poll does not pre-compile regex or handle invalid patterns"
    description: >
      re.search(pattern, ...) is called on every poll iteration without compiling.
      If pattern is invalid regex, re.error propagates as an unhandled exception
      rather than a structured error response.
    recommendation: >
      Pre-compile with re.compile() in a try/except at the start of cmd_poll.
      Return structured error for invalid patterns.

  - id: F-019
    file: "test-jobs.sh"
    line: "1-154"
    severity: medium
    dimension: D3
    watchdog: none
    slopodar: none
    title: "Job server tests cover only sequential happy-path and simple failure"
    description: >
      5 tests: status, pass, output capture, fail, once. No concurrent submission,
      no malformed YAML, no missing fields, no timeout scenarios, no self-replicating
      job, no extremely long output. The job server is the primary attack surface for
      multi-agent coordination (C2+) and has the thinnest test coverage.
    recommendation: >
      Add: malformed YAML (incomplete file, non-YAML content), missing required
      fields, concurrent job submission (two files at once), command that exceeds
      timeout, command that produces >1MB output.

  - id: F-020
    file: "SPEC.md"
    line: "40-51"
    severity: low
    dimension: D5
    watchdog: WD-SH
    slopodar: paper-guardrail
    title: "Governance crew table describes capabilities not yet implemented"
    description: >
      Table describes Watchdog with 'Read-only mount on source', Weaver with
      'Read-only mount, no commit credentials', Sentinel with 'Read-only mount,
      no commit credentials'. None of these mount constraints exist in the current
      Dockerfile or docker-compose configuration. The SPEC describes the target
      architecture, not the current state, but does not mark these as unimplemented.
    recommendation: >
      Add a 'Status' column to the governance crew table marking each role as
      'implemented' or 'Phase C target'.
```
