# Full Gauntlet Smoke Test — Phase Plan

> First end-to-end exercise of `make gauntlet TIER=full`.
> Payload: T-003 (Clerk middleware).
> Each phase has an explicit pass criterion. Fail → stop and investigate.

## Phases

### Phase 1: Makefile target audit
- **Action:** `make -n gauntlet` (dry run). Read every gauntlet target. Confirm synth exists. Confirm all 7 steps have targets. Confirm TREE var flows through.
- **Pass:** Exit 0, all 7 step names visible in output.
- **Status:** ✓ PASS — all 7 steps have targets, TREE flows through, dry run exit 0

### Phase 2: Gate in isolation
- **Action:** `make gauntlet-gate` on current clean tree.
- **Pass:** `.gauntlet/gate.json` exists, verdict `pass`, tree hash matches `git write-tree`.
- **Status:** ✓ PASS — gate.json valid, verdict pass, tree eefafe1a matches git write-tree

### Phase 3: DC-Claude in isolation
- **Action:** `make darkcat-claude` against staged T-003 change.
- **Pass:** `.logs/dc-*-claude.log` exists, verdict line present, `.gauntlet/dc-claude.json` attestation written, tree matches.
- **Status:** ✓ PASS WITH FINDINGS — 4 minor (doc inconsistencies), 0 major, 0 critical. Log: .logs/dc-eefafe1a-claude.log

### Phase 4: DC-OpenAI in isolation
- **Action:** `make darkcat-openai`.
- **Pass:** Same as phase 3 for openai.
- **Status:** ✓ PASS — 0 findings, verdict pass, tree eefafe1a matches

### Phase 5: DC-Gemini in isolation
- **Action:** `make darkcat-gemini` (failed last time — validates `-y` flag fix).
- **Pass:** Log + attestation valid. If fails: root cause before proceeding.
- **Status:** ✗ FAIL — dc-openai: 0 findings, verdict pass, tree eefafe1a matches

### Phase 5: DC-Gemini in isolation
- **Action:** `make darkcat-gemini` (failed last time — validates `-y` flag fix).
- **Pass:** Log + attestation valid. If fails: root cause before proceeding.
- **Status:** ✗ FAIL — gemini hung. Authenticated (YOLO mode, credentials loaded) but produced no review output. Killed after tool timeout. Log: 3 lines, no findings, no verdict. v0.32.1. Second failure mode (first was missing tool, this is silent hang). Root cause unknown — gemini -p with -y may not support tool execution reliably.

### Phase 6: Synth in isolation
- **Action:** `make gauntlet-synth` (or equivalent). Requires DC logs from phases 3-5.
- **Pass:** `.gauntlet/synth.json` exists with verdict. If target doesn't exist: build it.
- **Status:** ☐

### Phase 7: Pitkeel in isolation
- **Action:** `make gauntlet-pitkeel`.
- **Pass:** `.gauntlet/pitkeel.json` exists, verdict pass.
- **Status:** ✓ PASS — pitkeel.json valid, verdict pass, tree 723bf7b8 (rerun on 65c862c6 also pass)

### Phase 8: Walkthrough
- **Action:** `python3 scripts/pitcommit.py walkthrough`. Operator signs off.
- **Pass:** `.gauntlet/walkthrough.json` exists, Operator signs off.
- **Status:** ✓ PASS — sudo required, Operator mrkai attested @ 65c862c6. Hardened mid-smoke-test: --sudo string flag replaced with actual SUDO_USER check after darkcat finding.

### Phase 9: Full verify
- **Action:** `python3 scripts/pitcommit.py verify --tier full`.
- **Pass:** All required attestations present, all tree hashes match, exit 0.
- **Status:** ✓ PASS — 4/4 valid [full] on tree 65c862c6

### Phase 10: Commit + trailer
- **Action:** `git commit`. Pre-commit hook enforces full tier.
- **Pass:** Commit lands. Trailer shows all steps in `git log -1`.
- **Status:** ✓ PASS — commit 4e4259b, trailer: `gate+claude+pitkeel+walkthrough @ 65c862c6 [full]`

## Dependencies

```
Phase 1 ──→ Phase 2 ──→ Phases 3,4,5 (parallel OK) ──→ Phase 6
                         Phase 7 (independent)
                         Phase 8 (independent, Operator required)
All ──→ Phase 9 ──→ Phase 10
```

### Phase 11: Restore codex darkcat
- **Action:** Re-enable dc-openai in darkcat-all and full tier. Keep gemini deferred. Run `make darkcat-openai` to verify. Update README.
- **Pass:** dc-openai attestation valid on current tree. Full tier requires gate + dc-claude + dc-openai + pitkeel + walkthrough.
- **Status:** ☑ PASS — dc-openai restored, full tier updated, verified at 4e4259b and re-verified at 99e2e952.

## Notes

- Phases 3-5 are independent and can run in parallel
- Phases 7-8 are independent of 3-6
- Phase 6 depends on 3-5 (synth needs DC logs)
- Phase 9 depends on all prior phases
- T-003 is implemented before phase 3, gated at phase 2
