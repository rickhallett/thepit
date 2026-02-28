# Dead Reckoning Protocol

> When the instruments fail, navigate from last known fixed position.

**What this is:** Harness blowout recovery sequence. If the context window died, the opencode session crashed, or you are a fresh instance with no memory of prior sessions, this document tells you where you are and how to get your bearings.

**When to activate:** If `docs/internal/` appears empty or you have no memory of the current project state, you have had a blowout. You are in concussion. Defer to your notes.

---

## Step 1: Confirm the blowout

```bash
ls docs/internal/session-decisions.md 2>/dev/null && echo "NOTES INTACT" || echo "BLOWOUT CONFIRMED"
```

If NOTES INTACT: you have durable state. Proceed to Step 2.
If BLOWOUT CONFIRMED: the go-dark exclusion layer may have been disturbed. Check `.git/info/exclude` and `.gitignore` for `docs/internal/` entries. If files were truly lost, check git reflog or opencode session logs at `~/.local/share/opencode/storage/`.

---

## Step 2: Read session decisions (FIRST — before anything else)

```
docs/internal/session-decisions.md
```

This is your primary instrument. It contains all Captain directives (SD-*), parked items (P*, N*, D*), and the post-merge queue. Read this file. Do NOT read every file in docs/internal/ — that will consume tokens and increase risk of compaction. **Lazy Loading:** know what exists, read only when needed.

**Search strategy (SD-195):** BFS by default. Scan depth-1 files first (there are only 7). Go deeper only when investigating a specific question (DFS). File hierarchy depth signals read frequency: depth 1 = every session, depth 2 = when topic is relevant, depth 3+ = deliberate research only.

---

## Step 2b: Read operational state and the Lexicon

```bash
cat .keel-state
```

This file contains the last-written operational state: officer on watch, conn holder, weave mode, register, tempo, bearing, gate status, and test count. Use these fields to populate your YAML HUD header. If the file is missing or empty, set all HUD fields to `unknown` and flag to the Captain.

**Read the Lexicon immediately (SO-PERM-002):**

```
docs/internal/lexicon.md
```

The Lexicon defines all adopted terms, YAML HUD fields, and their meanings. If the Lexicon is not in your context window, you are not on this ship. This is a standing order, not a suggestion.

Then check for the most recent session state file:

```bash
ls -t docs/internal/weaver/session-state-*.md | head -1
```

If one exists, read it. It contains ephemeral state from the last session: active worktrees, open PRs, merge sequences in progress, parked items. This file bridges the gap between durable decisions (session-decisions.md) and operational context that would otherwise be lost at compaction.

Also check for active git worktrees:

```bash
git worktree list
```

If worktrees exist beyond the main repo, there is a parallel operation in progress. The session state file will explain what each worktree is for.

---

## Step 3: Verify integration state

```bash
git status
git log --oneline -10
gh pr list --state open
```

Cross-reference against the post-merge queue in session-decisions.md and the session state file from Step 2b.

---

## Step 4: Know your crew (Lazy Loading — do NOT read until needed)

### Active Crew (SD-126, updated SD-196)

| Role | File | When to read |
|------|------|-------------|
| Weaver (you) | `.opencode/agents/weaver.md` | Your own governing principles |
| Keel | `.opencode/agents/keel.md` | Human-factor, operational stability |
| Architect | `.opencode/agents/architect.md` | Backend engineering, system design |
| Sentinel | `.opencode/agents/sentinel.md` | Security engineering |
| Watchdog | `.opencode/agents/watchdog.md` | QA, test engineering |
| Quartermaster | `.opencode/agents/quartermaster.md` | Tooling strategy |
| Analyst | `.opencode/agents/analyst.md` | Research evaluation, audience modelling |
| Scribe | `.opencode/agents/scribe.md` | Documentation |
| Janitor | `.opencode/agents/janitor.md` | Code hygiene, refactoring |
| Maturin | `.opencode/agents/maturin.md` | Naturalist, field observation, pattern taxonomy |
| AnotherPair | `.opencode/agents/anotherpair.md` | Subtle process observer, joint cognitive system monitoring |

Also on disk: `captainslog.md`, `postcaptain.md`, `weave-quick-ref.md` (Captain-facing, not crew).

---

## Step 5: Know your durable state (Lazy Loading)

### Depth 1 — Operational (read on BFS scan)

| Document | Path | Purpose |
|----------|------|---------|
| Session decisions | `docs/internal/session-decisions.md` | All Captain directives, parked items — **ALWAYS read in Step 2** |
| Dead reckoning | `docs/internal/dead-reckoning.md` | This file |
| Lexicon | `docs/internal/lexicon.md` | Current terminology, YAML header spec (version tracked inside file) |
| Pearls | `docs/internal/pearls.md` | Sweet Spot collection, Strays queue |
| Principles | `docs/internal/v0.1-principles-distilled.md` | Phase 1 distilled: what held, what broke |
| Product spec | `docs/internal/v0.1-product-spec.md` | v0.1 core journey, architecture, data model |
| Layer model index | `docs/internal/weaver-layer-model-index.md` | Where the layer model has been load-bearing |

### Operational Models (depth 2, but high-signal reference)

These are the cognitive instruments. Read when making process decisions or calibrating human-agent interaction.

| Document | Path | Key concept |
|----------|------|-------------|
| Big O for Humans | `human-hud/human-hud-big-o.md` | O(1) approve/reject through O(2^n) combinatorial. Maps cognitive load to complexity classes. SD-180. |
| Amdahl's Law | `human-hud/human-hud-amdahls-law.md` | Parallel harnesses increase sequential fraction via discovery overhead. SD-179. |
| L12 Fault | `human-hud/human-hud-l12-fault.md` | Oracle contamination: when L12 introduces error, no gate catches it. SD-178. |
| Layer Model Index | `weaver-layer-model-index.md` | Where the 12-layer model has been load-bearing. 14 entries, 4 tiers. SD-165. |

### Depth 2 — Reference (read when topic is relevant)

| Directory | Contents | Read when |
|-----------|----------|-----------|
| `audits/` | Branch audit, SD audit, parallax roster, QA review, procedural records, zeitgeist, h8 report | Investigating history |
| `hn-prep/` | Attack analysis, optimisation plan, expert briefing, copy advice, option-b analysis | HN launch prep |
| `human-hud/` | Amdahl's Law, Big O cognitive load, L12 fault | HumanHUD research |
| `lexicon-archive/` | v0.7, v0.8 | Back-tracing specific SD terms |
| `qa/` | QA deltas v1.2/v2, manual QA v1 | QA work |
| `main-thread/` | Recent verbatim records (dismissed, compaction, Maturin's symbol) | Process archaeology |
| `field-notes/` | Maturin's template specimen | Pattern taxonomy |
| `janitor/` | Deferred cleanup tickets | Janitor passes |
| `research/` | mobprogrammingrpg XP concept, other research material | Research reference |

### Depth 3+ — Archive (deliberate DFS only)

| Directory | Contents | Read when |
|-----------|----------|-----------|
| `archive/hn/` | Hurt locker, pre-HN strategy, Show HN drafts | Historical HN prep |
| `archive/research/` | All research reviews, analyst audits, citations audit | Research page archaeology |
| `archive/round-tables/` | RT L1-L5 syntheses and individual agent reports | RT process history |
| `archive/main-thread/` | Old verbatim main thread entries (02-24, early 02-25) | Deep process archaeology |
| `captain/captainslog/` | Captain's personal log entries | Captain's reference only |
| `postcaptain/` | Personal debrief | Captain's reference only |

---

## Step 6: Know the standing orders

These are embedded in session-decisions.md but critical enough to list here:

1. **The Sweet Spot** — All public-facing content reads like lightly edited lab notes. No persuasion, no selling. The voice of an honest, introverted data scientist.
2. **Em-dash convention** — Em-dashes are agentic tells. Avoid in all user-facing copy.
3. **Hero DNA** — The hero banner subheadline is the Captain's exact keystrokes. No edits. Ever.
4. **Entity voice for legal pages** — Security, privacy, terms use entity voice, not first-person "I".
5. **All decisions must be recorded** — If it exists only in the context window, it does not exist.
6. **The local gate is the authority** — `pnpm run typecheck && pnpm run lint && pnpm run test:unit`
7. **Logging granularity is load-bearing** — The `withLogging` wrapper, structured `log.*` calls, and detailed API logging are not overhead. They are the reason the crew can verify production behaviour from server stdout without guessing. Captain's salute to past selves. Do not reduce, do not spam, do not remove.

---

## Step 7: Resume operations

You now have bearings. Read the specific files needed for the current task. Ask the Captain to confirm priorities if the post-merge queue is stale or ambiguous.

The Captain is Richard Hallett, sole director of OCEANHEART.AI LTD (UK company number 16029162). The product is The Pit (www.thepit.cloud). You are part of the crew. Welcome back.

---

*"The probability of error is not eliminated. It is distributed across verification gates until it is negligible."*
