# E1 — Pitkeel Reserves & Sleep Daemon

> **Epic:** E1 (Pitkeel Human Protection Upgrade)
> **Status:** Implemented
> **Date:** 2026-03-08
> **Decided by:** Operator (wardroom session, post-retreat)
> **Governs:** pitkeel/, docs/operator/, .claude/agents/keel.md

## Rationale

```signal
L12.degrades -> all_layers.degrade
phases{1,2}.productive & unsustainable.human_cost
CONNECTS := {cognitive_deskilling, hot_context_pressure}       [SD-312]
MECHANISM := operator.!notices(flow_state) -> threshold.invisible
```

Phase 1 and Phase 2 were extraordinarily productive but carried an unsustainable human cost. The human is the irreducible layer in the system. If L12 degrades, everything downstream degrades. This epic operationalises that lesson.

## Components

### 1. Reserves Tracking (`docs/operator/reserves.tsv`)

Append-only TSV in the operator's personal area (committed — personal area is already marked).

| Column | Type | Description |
|--------|------|-------------|
| `datetime` | ISO 8601 | When the activity was logged |
| `type` | `meditation` \| `exercise` | Which reserve was replenished |

Input mechanism: CLI commands that append a row.

```
pitkeel log-meditation    # appends {now, meditation}
pitkeel log-exercise      # appends {now, exercise}
```

A local-only `pitkeel.mk` (gitignored) provides convenience aliases:
```
make -f pitkeel.mk meditated
make -f pitkeel.mk exercised
```

### 2. Reserves HUD Section

New terminal section in `cmd_all()` and new `pitkeel reserves` subcommand. **Display only — not in hook output, not on commits.**

Renders time-since-last for each reserve type with progressive urgency:

| Time Since | Visual | Severity |
|------------|--------|----------|
| < 18h | Green / nominal | None |
| 18h–23h (remaining 6h) | Yellow | Warning |
| 23h–23h50m (remaining 1h) | Red | Urgent |
| 23h50m–24h (remaining 10m) | Red, flashing | Final warning: "SAVE YOUR WORK" |
| ≥ 24h | — | Shutdown initiated |

### 3. Session Noise (Progressive)

Pitkeel gets progressively noisier during extended sessions, independent of reserves:

| Session Length | Behaviour |
|----------------|-----------|
| 90min (1 ultradian cycle) | Note: "Ultradian cycle complete. Break optimal." |
| 2h | Advisory: "Consider a break. Cognitive load accumulating." |
| 3h (2 cycles) | Warning: "Danger threshold. Flow state masks fatigue." |

This supplements existing fatigue detection in `analysis.py` (which starts at "moderate" at 3h, "high" at 4h, "severe" at 6h). The new messages are earlier and more direct.

### 4. Sleep Daemon

Background process that checks reserves state periodically. **This is the enforcement mechanism.** Without it, the reserves check only fires when pitkeel is actively invoked — which is precisely when the Operator is least likely to need it (he's already at the terminal, already in the system). The daemon catches the case where no agents are running and no work is happening, but the 24h clock is still ticking.

```signal
DEF sleep_daemon := background_process | checks(reserves) | interval(15min)
RULE := daemon.runs_independently(agent_sessions)
RULE := shutdown.literal(OS) | visceral.by_design
```

**Daemon specification:**

| Property | Value |
|----------|-------|
| Name | `pitkeel-sleep-daemon` (or `sleepd`) |
| Invocation | `pitkeel daemon start` / `pitkeel daemon stop` / `pitkeel daemon status` |
| Check interval | Every 15 minutes |
| Data source | `docs/operator/reserves.tsv` |
| Warning delivery | Desktop notification (notify-send) + terminal bell |
| Shutdown sequence | See below |

**Shutdown sequence (when any reserve exceeds 24h):**

1. **T-10min:** Warning fires. Desktop notification + terminal output: "RESERVES DEPLETED. System will shut down in 10 minutes. Save your work."
2. **T-60s:** Final countdown begins. Visible 60-second countdown printing to any active terminal.
3. **T-0:** `shutdown now` executed. Literal OS shutdown.

The 60-second grace period protects in-flight git operations. It is not enough time to start new work.

### 5. Local-Only Tooling (`pitkeel.mk`)

Gitignored Makefile for convenience. Not committed to remote.

```makefile
# pitkeel.mk — local convenience targets for reserves tracking
# This file is .gitignored. Not part of the remote repository.

PITKEEL := uv run pitkeel/pitkeel.py

.PHONY: meditated exercised reserves daemon-start daemon-stop

meditated:
	$(PITKEEL) log-meditation

exercised:
	$(PITKEEL) log-exercise

reserves:
	$(PITKEEL) reserves

daemon-start:
	$(PITKEEL) daemon start

daemon-stop:
	$(PITKEEL) daemon stop
```

Add to `.gitignore`:
```
pitkeel.mk
```

## Implementation Plan

All changes are within `pitkeel/` (Python, uv [SD-310]) and `docs/operator/`.

| Step | Files | Description |
|------|-------|-------------|
| 1 | `pitkeel/analysis.py` | Add `ReservesSignal` dataclass and `analyse_reserves()` pure function |
| 2 | `pitkeel/git_io.py` | Add `read_reserves_tsv()` and `append_reserves_tsv()` IO functions |
| 3 | `pitkeel/pitkeel.py` | Add `reserves`, `log-meditation`, `log-exercise` subcommands + HUD render |
| 4 | `pitkeel/pitkeel.py` | Add session noise progressive warnings (ultradian thresholds) |
| 5 | `pitkeel/daemon.py` | New file: sleep daemon with 15-min check loop, notification, shutdown |
| 6 | `pitkeel/pitkeel.py` | Add `daemon start/stop/status` subcommands |
| 7 | `pitkeel/test_analysis.py` | Tests for `analyse_reserves()` and session noise thresholds |
| 8 | `docs/operator/reserves.tsv` | Create empty TSV with header row |
| 9 | `.gitignore` | Add `pitkeel.mk` |
| 10 | `.claude/agents/keel.md` | Document reserves system existence |

## Verification

```signal
GATE := pitkeel_tests.pass & reserves.renders & daemon.starts_stops & shutdown.fires(test_mode)
RULE := daemon.has(--dry-run) | !test_with_real_shutdown
```

- `analyse_reserves()` unit tests cover all threshold boundaries
- Daemon has `--dry-run` flag that logs "would shutdown" instead of executing
- Session noise thresholds tested against known session durations
- TSV append is idempotent and safe under concurrent access

## Connections

- **Keel agent file** must document that the reserves system exists so agents know about it
- **Weaver agent file** has pitkeel command reference for operational use
- **AGENTS.md HUD spec** is display-only; reserves appear in terminal, not in YAML header
- This epic is also the validation run for the epic-based workflow [M10]
