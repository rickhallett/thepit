# Convergence Synthesis - Repo-Wide Adversarial Review

**Date:** 2026-03-10
**Models:** Claude Opus 4 (R1), Pi Coding Agent (R2)
**Scope:** Repo-wide, all implementation code
**Base commit:** 01e259b

---

## Convergence Matrix

Findings mapped between reviews. Convergence = both models independently identified the same defect class at the same location. Divergence = only one model flagged it.

### 2-Way Convergence (Both Models Found It)

These are the highest-confidence findings. Two independent models, different architectures, same conclusion.

| # | Location | R1 ID | R2 ID | R1 Sev | R2 Sev | Finding |
|---|----------|-------|-------|--------|--------|---------|
| C-01 | steer/drive:116 | F-001 | F-001 | high | high | **Shell injection via unsanitized cmd in sentinel wrapper.** Both models identified the f-string interpolation path from jobrunner YAML through drive run. Both flagged the paper-guardrail trust model. |
| C-02 | steer/drive:124-141 | F-002 | F-002 | medium | high | **Sentinel marker detection fires prematurely.** R1 focused on adversarial output spoofing the done marker. R2 focused on the typed command line containing the marker template, causing the poll to exit before the real completion line. R2's variant is more likely to occur in practice - it does not require adversarial input, just fast polling. **R2's framing is sharper.** |
| C-03 | steer/steer:23-28 | F-004 | F-006 | high | high | **steer run() swallows subprocess failures; action commands report ok:true unconditionally.** Both identified the same root cause (run with capture=False discards return codes) and same downstream effect (click/type/hotkey/activate all lie about success). |
| C-04 | entrypoint.sh:6-18 | F-011 | F-008 | medium | medium | **Startup readiness based on sleep, not probe.** Both recommend replacing fixed sleeps with connection polling. R1 specifically called out the undetected fluxbox failure path. |
| C-05 | test-poc.sh:93-108 | F-006 | F-011 | high | high | **Type/hotkey tests verify metadata, not execution effect.** Both identified the right-answer-wrong-work pattern. Both noted the final screenshot is taken but never checked for MIDGET_ALIVE. |
| C-06 | test-drive.sh:74 | F-007 | F-012 | high | medium | **git status || true masks sentinel verification.** Both identified the phantom-tollbooth pattern. R1 severity higher (high) because R1 emphasized the test cannot detect a broken sentinel protocol. R2 framed it as exit code propagation gap. |
| C-07 | test-ocr.sh:68-76 | F-008 | F-013 | medium | medium | **OCR test lenient fallback too weak.** Both identified the phantom-tollbooth / shadow-validation pattern. Identical analysis: 3+ words from window chrome is not OCR proof. |
| C-08 | test-chromium.sh:76-87 | F-009 | F-014 | medium | medium | **Chrome OCR test accepts UI text as proof of page rendering.** Both identified the same grep pattern issue (chrome/Google match Chrome's own UI). Both noted the lenient fallback. |
| C-09 | Dockerfile:42-46 | F-017 | F-009 | low | high | **Chrome .deb downloaded without integrity verification.** Both flagged the unpinned, unverified download. **Severity divergence: R1 low, R2 high.** R2 weights it higher because supply chain integrity matters for a governance system. R2's severity is more appropriate given the thesis. |
| C-10 | Dockerfile:37 | F-017 | F-010 | low | low | **Unpinned npm install of claude-code.** Both flagged reproducibility. Same severity. |
| C-11 | steer/steer:8 | F-013 | F-015 | low | low | **Stale docstring claims OCR is absent.** Both identified stale-reference-propagation. Identical finding. |
| C-12 | steer/jobrunner:169-175 | F-010 | F-004 | medium | high | **Watch loop job processing race.** R1 focused on TOCTOU (concurrent writers). R2 focused on a different bug at the same location: processed set updated before processing, so transient failures permanently skip jobs. **R2 found a distinct, more severe bug at the same line.** Both findings are valid and independent. |

**Convergence rate: 12 out of 36 unique finding IDs (33%) converged.** This is within expected range for repo-wide review. The 33% convergence on defect existence with high agreement on severity means both models are calibrated similarly. The remaining 67% are either unique catches (good - blind spot coverage) or noise (need triage).

---

### R1-Only Findings (Claude Opus Unique)

| R1 ID | Sev | Finding | Assessment |
|-------|-----|---------|------------|
| F-003 | medium | drive exit code conflates command failure with drive failure | **Valid, unique.** R2 did not examine exit code semantics at the process level. A real usability bug for CLI callers. |
| F-005 | medium | cmd_click always reports ok:true (paper-guardrail) | **Subsumed by C-03.** This is a specific instance of the run() swallowing errors finding. R1 called it out as a separate finding; R2 folded it into the parent. R1's granularity is better for actionability. |
| F-012 | medium | SPEC job path (/opt/jobs/) differs from implementation (/tmp/jobs) | **Valid, unique.** R2 missed this path mismatch. Direct stale-reference-propagation. Agents will use wrong paths. |
| F-014 | medium | Phase targets all run identical gate - no per-phase verification | **Valid, unique.** R2 did not examine Makefile target granularity. Real architectural concern for Phase C. |
| F-015 | medium | Gate runs 6 separate containers - misses same-container interactions | **Valid, unique.** R2 did not examine the gate's container strategy. A genuine verification gap. |
| F-016 | low | _emit duplicated across three files | **Valid, minor.** DRY concern. Low priority. |
| F-018 | low | drive poll regex not precompiled, no error handling for invalid patterns | **Valid, minor.** Robustness concern. |
| F-019 | medium | Job server tests cover only happy-path | **Valid, unique.** R2 noted test suppression (|| true) but did not assess coverage breadth. R1's enumeration of missing test scenarios is actionable. |
| F-020 | low | Governance crew table describes unimplemented capabilities | **Valid, minor.** Documentation accuracy. |

---

### R2-Only Findings (Pi Unique)

| R2 ID | Sev | Finding | Assessment |
|-------|-----|---------|------------|
| F-003 | medium | Fixed tmux scrollback window risks silent output truncation | **Valid, unique.** R1 did not examine the scrollback limit. capture-pane -S -32768 is generous but not infinite. Long-running verbose commands could lose markers. Real edge case for Phase C where agents run complex tasks. |
| F-005 | medium | Result YAML write is non-atomic | **Valid, unique.** R1 mentioned TOCTOU on reads but not on writes. A crash during yaml.dump() leaves a partial file. Correct recommendation: write to temp, atomic rename. |
| F-007 | medium | steer app launch argument splitting uses str.split() instead of shlex | **Valid, unique.** R1 missed this. `args.split()` breaks on quoted arguments with spaces. The `--args` flag for Chrome test uses space-separated flags which happen to work, but the general case is broken. |
| (narrative only) | -- | No concurrency safety for shared tmux session runs | **Valid, unique.** R1 mentioned concurrent jobrunner instances but not concurrent drive run calls against the same session. Multiple callers interleaving markers would produce corrupt output. Important for C2+ multi-agent scenarios. |
| (narrative only) | -- | Chrome --no-sandbox as explicit risk acceptance | **Valid, nuance.** R1 analyzed this and concluded the risk is mitigated by root-owned /opt/steer/. R2 flagged that for a governance system, the risk acceptance should be documented rather than implied. R2's framing is better governance practice. |
| F-016 | low | SPEC says darkcat-all uses 3 models, implementation runs 2 | **Valid, unique.** R1 missed this darkcat-all discrepancy. mk/darkcat.mk runs Claude + OpenAI only, Gemini deferred. SPEC claims 3. |

---

## Severity Calibration

For converged findings where both models assigned severity:

| Finding | R1 | R2 | Delta | Resolution |
|---------|----|----|-------|------------|
| C-01 shell injection | high | high | 0 | **high** - agreed |
| C-02 marker premature fire | medium | high | 1 | **high** - R2's practical scenario (typed command line match) is realistic, not adversarial |
| C-03 steer run() swallows errors | high | high | 0 | **high** - agreed |
| C-04 sleep-based readiness | medium | medium | 0 | **medium** - agreed |
| C-05 type/hotkey test RAWW | high | high | 0 | **high** - agreed |
| C-06 git status || true | high | medium | 1 | **high** - R1's emphasis on sentinel protocol blindness is correct |
| C-07 OCR lenient fallback | medium | medium | 0 | **medium** - agreed |
| C-08 Chrome OCR test | medium | medium | 0 | **medium** - agreed |
| C-09 Chrome .deb no checksum | low | high | 2 | **medium** - compromise; supply chain matters but POC scope limits blast radius |
| C-10 npm unpinned | low | low | 0 | **low** - agreed |
| C-11 stale OCR docstring | low | low | 0 | **low** - agreed |
| C-12 watch loop race | medium | high | 1 | **high** - R2's "permanently skipped job" bug is more severe than R1's TOCTOU framing |

**Average delta: 0.42 severity levels.** Good calibration. No finding diverged by more than 2 levels. The one 2-level divergence (Chrome .deb) reflects legitimate difference in how each model weights supply-chain risk for a POC.

---

## Synthesized Priority Queue

Findings ordered by synthesized severity, convergence confidence, and actionability.

### Fix Before Phase C (Blocking)

| Priority | Finding | Synthesized Sev | Convergence | Action |
|----------|---------|-----------------|-------------|--------|
| 1 | **Sentinel marker premature detection** (C-02) | HIGH | 2-way | Fix the poll loop: match `done_marker + ":\d+"` on its own line, not substring `in` on the full pane. R2's variant (typed command line contains marker) is the priority case. |
| 2 | **steer run() swallows errors** (C-03) | HIGH | 2-way | Make run() return (success, output). Update click/type/hotkey/activate to check result and emit ok:false on failure. This affects agent reliability in C2+. |
| 3 | **Watch loop permanently skips failed jobs** (C-12, R2 variant) | HIGH | 2-way (related) | Move `processed.add()` after successful `unlink()`. Or use atomic rename claim pattern (mv incoming -> processing). |
| 4 | **Type/hotkey test RAWW** (C-05) | HIGH | 2-way | Add post-Return verification: steer see --ocr or drive-based check for MIDGET_ALIVE in terminal output. |
| 5 | **git status || true test** (C-06) | HIGH | 2-way | Remove || true. Assert output contains expected strings. Or add a separate test for a known-failing command without || true. |

### Fix During Phase C (Important)

| Priority | Finding | Synthesized Sev | Convergence | Action |
|----------|---------|-----------------|-------------|--------|
| 6 | **Shell injection via job YAML** (C-01) | HIGH | 2-way | For C2+ where incoming/ is writable by other containers: add schema validation at jobrunner (required fields, cmd allowlist or warning). shell_command is by-design, but document the trust boundary. |
| 7 | **Result YAML non-atomic write** (R2 F-005) | MEDIUM | R2-only | Write to .tmp, rename to .yaml. Prevents partial reads by downstream consumers in C2+. |
| 8 | **OCR + Chrome test leniency** (C-07, C-08) | MEDIUM | 2-way | Tighten assertions: require target token match, remove broad fallbacks. |
| 9 | **steer app launch shlex** (R2 F-007) | MEDIUM | R2-only | Replace args.split() with shlex.split(). Prevents broken arguments for C2+ where agents construct complex launch commands. |
| 10 | **Entrypoint readiness probes** (C-04) | MEDIUM | 2-way | Replace sleeps with polling loops. Prevents intermittent failures on slower hosts. |
| 11 | **SPEC path mismatch** (R1 F-012) | MEDIUM | R1-only | Align /opt/jobs/ in SPEC with /tmp/jobs in implementation. Or set the default in entrypoint.sh. |
| 12 | **Job server test coverage** (R1 F-019) | MEDIUM | R1-only | Add malformed YAML, missing fields, timeout, concurrent submission tests before C2. |
| 13 | **tmux scrollback truncation** (R2 F-003) | MEDIUM | R2-only | For long-running C2+ jobs: consider per-command log file alongside capture-pane. |

### Backlog (Low Priority / POC Acceptable)

| Finding | Synthesized Sev | Action |
|---------|-----------------|--------|
| Stale steer docstring (C-11) | LOW | One-line fix. Do it now. |
| Unpinned Docker deps (C-09, C-10) | LOW-MEDIUM | Pin versions before any production use. Acceptable for POC. |
| _emit duplication (R1 F-016) | LOW | Extract if adding features to output format. |
| drive exit code semantics (R1 F-003) | MEDIUM | Document or fix. Reserve high exit codes for drive errors. |
| Phase targets undifferentiated (R1 F-014) | MEDIUM | Add phase-specific test targets for C2+. |
| Gate separate containers (R1 F-015) | MEDIUM | Add gate-integrated target for same-container testing. |
| SPEC darkcat-all 3 vs 2 (R2 F-016) | LOW | Align SPEC with current darkcat-all implementation. |
| Governance crew table unimplemented (R1 F-020) | LOW | Add Status column. |
| drive poll regex (R1 F-018) | LOW | Pre-compile, handle re.error. |
| Chrome --no-sandbox doc (R2 narrative) | LOW | Document risk acceptance explicitly. |

---

## Blind Spot Analysis

**What did each model uniquely find?**

**R1 (Claude Opus) characteristic strengths:**
- Architectural analysis (gate container strategy, phase target granularity)
- Documentation path mismatches (SPEC vs implementation paths)
- Test coverage breadth assessment (enumerated missing job server scenarios)
- Examined Makefile include structure (polecats.mk, darkcat.mk, gauntlet.mk)

**R2 (Pi) characteristic strengths:**
- Reliability edge cases (tmux scrollback truncation, non-atomic writes)
- API correctness (shlex.split vs str.split)
- Sequencing bugs (processed set updated before completion)
- More precise severity calibration on supply-chain findings

**What neither model found:**
- No review of pitkeel/ Python code or scripts/ tooling
- No review of bin/triangulate parser correctness
- No assessment of the Makefile POLECAT wrapper's error handling (lines 78-102)
- No assessment of the --dangerously-skip-permissions flag's implications in agent-live
- No assessment of whether the non-root agent user can install packages at runtime (pip, npm)
- No examination of the mk/gauntlet.mk PITCOMMIT attestation chain integrity

---

## Model Comparison Summary

| Metric | R1 (Opus) | R2 (Pi) |
|--------|-----------|---------|
| Total findings | 20 | 16 |
| Unique findings | 9 | 5 (+2 narrative) |
| Critical/High | 5 | 6 |
| Medium | 11 | 7 |
| Low | 4 | 3 |
| Slopodar patterns flagged | 4 | 3 |
| Watchdog IDs assigned | 7 | 5 |
| False positives (on review) | 0 | 0 |

**Marginal value of R2 given R1:** 5-7 unique findings, including the "permanently skipped job" bug (C-12 R2 variant), non-atomic result writes, shlex.split, and tmux scrollback truncation. All are valid and actionable. The second review was worth the cost.

---

## Conclusion

36 unique findings across 2 models, 0 false positives, 12 convergent (33%). The codebase is a well-structured POC with a sound thesis. The top 5 findings (sentinel marker detection, steer error swallowing, watch loop race, and two test false-positives) should be fixed before Phase C because they directly affect the reliability of the infrastructure that Phase C depends on.

The convergence pattern is encouraging: when both models found the same bug, they agreed on severity (avg delta 0.42 levels). The unique findings from each model fill genuine blind spots rather than adding noise. This supports the case for 2-model review as cost-effective for this codebase size.
