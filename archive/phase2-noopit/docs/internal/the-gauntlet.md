# The Gauntlet

> Every change runs the gauntlet before it enters the codebase.
> The probability of a defect surviving is the product of the probabilities at each gate.
> Stack enough gates and the product approaches zero.

## Definition of DONE

```signal
DEF DONE := gate.green
           & darkcat{claude, openai, gemini}.complete
           & darkcat_synth.convergence_report
           & pitkeel.signals_reviewed
           & walkthrough.checked
           & events.marked

RULE := !commit UNTIL DONE
```

---

## The Workflow

```
    ┌─────────────────────────────────────────────────────────────┐
    │                        THE GAUNTLET                         │
    │                                                             │
    │   ┌───────┐                                                 │
    │   │  DEV  │  implement + gate (typecheck + lint + test)     │
    │   └───┬───┘                                                 │
    │       │                                                     │
    │       ▼                                                     │
    │   ┌────────────────────────────────────────────┐            │
    │   │            DARKCAT TRIAD                    │            │
    │   │                                            │            │
    │   │  ┌──────────┐ ┌──────────┐ ┌──────────┐   │            │
    │   │  │ DC-1     │ │ DC-2     │ │ DC-3     │   │            │
    │   │  │ Claude   │ │ OpenAI   │ │ Gemini   │   │            │
    │   │  │ claude -p│ │ codex    │ │ gemini -p│   │            │
    │   │  │          │ │ exec     │ │          │   │            │
    │   │  └────┬─────┘ └────┬─────┘ └────┬─────┘   │            │
    │   │       │            │            │          │            │
    │   │       ▼            ▼            ▼          │            │
    │   │   .logs/dc-    .logs/dc-    .logs/dc-      │            │
    │   │   <sha>-       <sha>-       <sha>-         │            │
    │   │   claude.log   openai.log   gemini.log     │            │
    │   │       │            │            │          │            │
    │   │       └────────────┼────────────┘          │            │
    │   │                    │                       │            │
    │   │                    ▼                       │            │
    │   │            ┌──────────────┐                │            │
    │   │            │  DC-SYNTH    │                │            │
    │   │            │  4th polecat │                │            │
    │   │            │  (any model) │                │            │
    │   │            └──────┬───────┘                │            │
    │   │                   │                        │            │
    │   │                   ▼                        │            │
    │   │          .logs/dc-<sha>-synth.log          │            │
    │   └────────────────────┬───────────────────────┘            │
    │                        │                                    │
    │             ┌──────────┴──────────┐                         │
    │             │  FINDINGS?          │                         │
    │             │  critical or major  │                         │
    │             └──────────┬──────────┘                         │
    │                        │                                    │
    │              ┌─────────┴─────────┐                          │
    │              │                   │                          │
    │         YES ─┤              NO ──┤                          │
    │              │                   │                          │
    │              ▼                   ▼                          │
    │         ┌─────────┐      ┌──────────────┐                  │
    │         │ CYCLE   │      │   PITKEEL    │                  │
    │         │ back to │      │   review     │                  │
    │         │  DEV    │      │   signals    │                  │
    │         └─────────┘      └──────┬───────┘                  │
    │                                 │                          │
    │                                 ▼                          │
    │                         ┌──────────────┐                   │
    │                         │ WALKTHROUGH  │                   │
    │                         │ human L12    │                   │
    │                         │ checklist    │                   │
    │                         └──────┬───────┘                   │
    │                                │                           │
    │                                ▼                           │
    │                         ┌──────────────┐                   │
    │                         │   COMMIT     │                   │
    │                         │   + push     │                   │
    │                         └──────────────┘                   │
    │                                                            │
    └────────────────────────────────────────────────────────────┘
```

---

## Data Capture — What, Where, When

### Step 1: DEV

| Data | Location | Format |
|------|----------|--------|
| Code changes | Working tree | .ts/.tsx files |
| Gate result | Terminal stdout | exit code |
| Test count | Terminal stdout | vitest summary |

**Entry criterion:** Plan file read, task scoped.
**Exit criterion:** `pnpm run typecheck && pnpm run lint && pnpm run test` exits 0.

---

### Step 2: DARKCAT TRIAD (parallel)

Three independent model priors, same prompt, same diff.

| Data | Location | Format | Retention |
|------|----------|--------|-----------|
| DC-1 findings (Claude) | `.logs/dc-<sha>-claude.log` | Structured text (see darkcat.md output format) | Permanent |
| DC-2 findings (OpenAI) | `.logs/dc-<sha>-openai.log` | Structured text | Permanent |
| DC-3 findings (Gemini) | `.logs/dc-<sha>-gemini.log` | Structured text | Permanent |
| Event marker (per DC) | `docs/internal/events.tsv` | TSV row: `date, time, darkcat, <agent>, <sha>, dc-{1,2,3}, <summary>, <backrefs>` | Permanent |
| Findings detail | `docs/internal/weaver/darkcat-findings.tsv` | TSV row: `date, sha, model, round, severity, pattern, file, line, finding, status` | Permanent |

**Entry criterion:** Gate green from DEV step.
**Exit criterion:** All three logs exist and contain structured output.

**Invocation:**
```bash
make darkcat          # Claude (DC-1)
make darkcat-openai   # Codex (DC-2)
make darkcat-gemini   # Gemini (DC-3)
# or
make darkcat-all      # all three in parallel
```

---

### Step 3: DARKCAT SYNTHESIS (4th polecat)

Consumes the three DC logs, produces convergence/divergence report.

| Data | Location | Format | Retention |
|------|----------|--------|-----------|
| Synthesis report | `.logs/dc-<sha>-synth.log` | Structured text | Permanent |
| Event marker | `docs/internal/events.tsv` | TSV row | Permanent |

**Prompt harness:** Operator's choice (any installed: claude/codex/gemini/opencode).
**Entry criterion:** All three DC logs exist.
**Exit criterion:** Synth log contains verdict (PASS / PASS WITH FINDINGS / FAIL).

**What the synth polecat does:**
1. Reads all three DC logs
2. Identifies convergent findings (same defect, different words = high confidence)
3. Identifies divergent findings (one model sees it, others don't = investigate)
4. Identifies unanimous passes (all three say clean = high confidence nominal)
5. Produces a single verdict with prioritised finding list

---

### Step 4: FINDINGS TRIAGE

| Verdict | Action |
|---------|--------|
| FAIL or critical findings | Cycle back to DEV. Fix findings. Re-run gate. Re-run affected darkcats. |
| PASS WITH FINDINGS (minor only) | Proceed. Log findings. Fix in current or next cycle at Operator's discretion. |
| PASS (unanimous nominal) | Proceed directly. |

---

### Step 5: PITKEEL

| Data | Location | Format | Retention |
|------|----------|--------|-----------|
| Session signals | Terminal stdout | ANSI-styled text | Ephemeral |
| State snapshot | `.keel-state` | JSON | Overwritten per update |
| Keel trailers | Commit message | Plain text (appended by hook) | Permanent (in git log) |

**Entry criterion:** Darkcat triad + synth complete with no critical/major findings.
**Exit criterion:** Human has reviewed pitkeel output. If fatigue ≥ moderate or velocity accelerating, human decides whether to continue.

**Invocation:**
```bash
cd pitkeel && uv run python pitkeel.py              # review signals
cd pitkeel && uv run python pitkeel.py state-update --officer <name>  # update state
```

---

### Step 6: WALKTHROUGH

| Data | Location | Format | Retention |
|------|----------|--------|-----------|
| Checklist marks | `plans/REVIEW-CHECKLIST.md` | Markdown checkboxes | Updated in place |
| Human observations | Operator's discretion | Notes, voice log, etc. | Varies |

**Entry criterion:** Pitkeel reviewed, no blocking signals.
**Exit criterion:** Human has checked the relevant items in REVIEW-CHECKLIST.md for this task.

---

### Step 7: COMMIT

| Data | Location | Format | Retention |
|------|----------|--------|-----------|
| Commit | Git history | Git object | Permanent |
| Keel trailers | Commit message | Plain text (Officer, Bearing, Tempo, Weave, Gate) | Permanent |
| Keel signals | Commit message | Plain text (if non-nominal) | Permanent |
| Event marker | `docs/internal/events.tsv` | TSV row: `date, time, commit, <agent>, <sha>, -, <summary>, <backrefs>` | Permanent |
| Pitkeel state | `.keel-state` | JSON | Updated |

**Entry criterion:** All previous steps complete = DONE.
**Exit criterion:** `git push` succeeds. SO.session_end satisfied.

---

## File Map — Where Everything Lives

```
.logs/
├── dc-<sha>-claude.log        # DC-1 raw findings
├── dc-<sha>-openai.log        # DC-2 raw findings
├── dc-<sha>-gemini.log        # DC-3 raw findings
└── dc-<sha>-synth.log         # Convergence report

docs/internal/
├── events.tsv                  # Append-only audit trail (all events)
└── weaver/
    ├── darkcat-findings.tsv    # All darkcat findings across all runs
    ├── catch-log.tsv           # Control firing events
    └── commendations.log       # Extra rations

scripts/
├── darkcat.md                  # The adversarial review prompt (portable)
└── prepare-commit-msg          # Git hook (pitkeel signals + trailers)

pitkeel/
├── pitkeel.py                  # CLI entrypoint
├── analysis.py                 # Pure analysis functions
├── keelstate.py                # State schema + flock IO
└── git_io.py                   # Git subprocess layer

.keel-state                     # Operational state (gitignored)
```

---

## Invocation

```bash
# The full gauntlet (manual, step by step)
make darkcat              # DC-1 (Claude)
make darkcat-openai       # DC-2 (OpenAI)
make darkcat-gemini       # DC-3 (Gemini)
make darkcat-synth        # DC-SYNTH (convergence)
cd pitkeel && uv run python pitkeel.py  # review signals

# Or the full gauntlet (automated)
make gauntlet             # runs all darkcats + synth + pitkeel
```

---

## Version

| Version | Date | Change |
|---------|------|--------|
| v0.1 | 2026-03-04 | Initial workflow. DEV → DARKCAT{1,2,3} → SYNTH → PITKEEL → WALKTHROUGH → COMMIT. |
| v0.2 | 2026-03-04 | Enforcement via attestations. Tree hash identity (solves SHA paradox). Pre-commit hook blocks without attestations. Tiers: full/docs/wip/sudo. Darkcat reviews staged changes (git diff --cached). pitcommit.py manages attestations. Gemini -y flag. |
