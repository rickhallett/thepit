# Dead Reckoning Protocol — noopit (thepit-v2)

> When the instruments fail, navigate from last known fixed position.

**What this is:** Blowout recovery sequence. If the context window died, the session crashed, or you are a fresh instance with no memory of prior sessions, this document tells you where you are and how to get your bearings.

**When to activate:** If you have no memory of the current project state, you have had a blowout. Defer to your notes.

**First:** Read `docs/internal/boot-sequence.md` — that is the normal wake sequence. This file is for when things went wrong.

---

## Step 1: Confirm the blowout

```bash
ls docs/internal/session-decisions.md 2>/dev/null && echo "NOTES INTACT" || echo "BLOWOUT CONFIRMED"
```

If NOTES INTACT: you have durable state. Proceed to Step 2.
If BLOWOUT CONFIRMED: check git reflog. The chain (SD-266) means everything committed is recoverable.

---

## Step 2: Read the session decisions INDEX (FIRST — before anything else)

```
docs/internal/session-decisions-index.yaml
```

This is your primary instrument. It contains the last 10 session decisions + standing orders — everything you need to reconstruct current heading. **Read the index, not the full log.** The full log (`session-decisions.md`) is 314+ entries. Loading it all on boot is the single largest token cost in the system (SD-275). The historical record exists for provenance (SD-266), not for navigation.

**SD number collisions (SD-297):** When an SD number appears twice (historical accident, parallel sessions), the later entry gets a forward-ref annotation. Historical entries are never renumbered — the chain (SD-266) is immutable.

Do NOT read every file in docs/internal/ — that will consume tokens and increase risk of compaction. **Lazy Loading:** know what exists, read only when needed.

**Search strategy (SD-195):** BFS by default. Scan depth-1 files first. Go deeper only when investigating a specific question (DFS).

---

## Step 2b: Read the Lexicon

**Read the Lexicon immediately (SO-PERM-002):**

```
docs/internal/lexicon.md
```

The Lexicon defines all adopted terms, YAML HUD fields, and their meanings. If the Lexicon is not in your context window, you are not on this ship. This is a standing order, not a suggestion.

---

## Step 3: Verify integration state

```bash
git status
git log --oneline -10
```

---

## Step 4: Know your crew (Lazy Loading — do NOT read until needed)

### Active Crew (SD-299, minnowed for thepit-v2)

| Role | File | When to read |
|------|------|-------------|
| Weaver | `.claude/agents/weaver.md` | Integration discipline, verification governance |
| Architect | `.claude/agents/architect.md` | Backend engineering, system design |
| Watchdog | `.claude/agents/watchdog.md` | QA, test engineering |
| Sentinel | `.claude/agents/sentinel.md` | Security engineering |
| Keel | `.claude/agents/keel.md` | Human-factor, operational stability |
| Janitor | `.claude/agents/janitor.md` | Code hygiene, refactoring |

Also on disk: `analyst.md`, `scribe.md`, `maturin.md`, `anotherpair.md`, `operatorslog.md`, `weave-quick-ref.md`.

---

## Step 5: Know your durable state (Lazy Loading)

### Depth 1 — Operational (boot surface)

| Document | Path | Purpose |
|----------|------|---------|
| Boot sequence | `docs/internal/boot-sequence.md` | Normal wake manifest |
| Session decisions index | `docs/internal/session-decisions-index.yaml` | Last 10 SDs + standing orders |
| Lexicon | `docs/internal/lexicon.md` | Vocabulary v0.20 |
| Slopodar | `docs/internal/slopodar.yaml` | Anti-pattern taxonomy, 18 entries |
| Layer model | `docs/internal/layer-model.md` | L0-L12 v0.3 |
| Session decisions (full) | `docs/internal/session-decisions.md` | Full chain — archaeology only |
| Dead reckoning | `docs/internal/dead-reckoning.md` | This file |

### Depth 2 — Reference

| Directory | Contents | Read when |
|-----------|----------|-----------|
| `docs/weaver/` | Signal protocol PoC, decode tests, reasoning tests | Signal work |
| `docs/decisions/` | Session-scoped SD files | Current session decisions |
| `docs/strategy/` | Landscape scans, convergence analysis | Strategy work |
| `docs/research/` | Cross-model prompt | Research work |
| `docs/field-notes/` | Field observations | Pattern taxonomy |

### Depth 3+ — Archive

tspit-ARCHIVED lives at `/home/mrkai/code/repo/tspit-ARCHIVED/`. Historical artifacts from the pilot study (SD-001 through SD-278) can be recovered from there. Do not copy wholesale — rescue specific files when needed.

---

## Step 6: Know the standing orders

These are in AGENTS.md (auto-loaded) and the session-decisions index. Critical ones:

1. **All decisions must be recorded** — If it exists only in the context window, it does not exist (SD-266).
2. **The local gate is the authority** — `pnpm run typecheck && pnpm run lint && pnpm run test`
3. **Truth first** — Telling the truth takes priority over getting hired (SD-134).
4. **Agentic estimation** — All estimates assume agentic execution speed (SD-268).
5. **Slopodar on boot** — Read the anti-pattern taxonomy on load (SD-286).

---

## Step 7: Resume operations

You now have bearings. Follow the boot sequence (`docs/internal/boot-sequence.md`) for normal operations. Ask the Operator to confirm priorities if bearing is unclear.

The Operator is Richard Hallett, sole director of OCEANHEART.AI LTD (UK company number 16029162). The product is The Pit (www.thepit.cloud). noopit is thepit-v2 — the calibration run (SD-294). You are part of the crew. Welcome back.

---

*"The probability of error is not eliminated. It is distributed across verification gates until it is negligible."*
