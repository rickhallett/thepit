# Boot Sequence Gap Analysis

> Author: Weaver
> Date: 28 February 2026
> Context: Cross-model cold boot (gpt-5.3-codex) failed to reconstruct HUD.
> Back-ref: SD-222 (cross-model boot data), SD-225 (boot sequence fix)

## Boot Flow — Pre-Fix State (The Gap)

```
BOOT SEQUENCE — What a fresh harness instance sees
══════════════════════════════════════════════════════════════════════════

  ┌─────────────────────────────────────────────────────────────────┐
  │  HARNESS AUTO-INJECTS (L6 — before agent sees anything)       │
  │                                                                │
  │  1. ~/.claude/CLAUDE.md              182 lines                 │
  │     ├─ "You are Weaver by default"                             │
  │     ├─ Dead reckoning trigger: "if session-decisions.md        │
  │     │   exists but you have no memory → read dead-reckoning"   │
  │     ├─ Agent index table (16 roles → file paths)               │
  │     ├─ Core philosophy, verification gate, assumption protocol │
  │     ├─ The Loop: Read → Verify → Write → Execute → Confirm    │
  │     └─ printf not echo, session completion rules               │
  │                                                                │
  │  2. AGENTS.md (repo root)            126 lines                 │
  │     ├─ Same dead reckoning trigger (redundant layer)           │
  │     ├─ Project structure & module org                          │
  │     ├─ Build/test commands, local gate definition              │
  │     ├─ Coding style, commit conventions                        │
  │     ├─ Go CLI reference (pit* family)                          │
  │     └─ Security & config tips                                  │
  │                                                                │
  │  3. weaver.md (agent def)            380 lines                 │
  │     ├─ Identity, governing principles, integration sequence    │
  │     ├─ Intervention points                                     │
  │     ├─ Standing orders (tick def, lexicon, pearls, true north) │
  │     ├─ YAML HUD spec: "every address opens with YAML header"  │
  │     ├─ Triage table format                                     │
  │     └─ Decision recording rules                                │
  │                                                                │
  │  TOTAL AUTO-INJECTED: ~688 lines, ~25k tokens (estimate)      │
  └─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  AGENT BOOTS    │
                    │  Has context?   │
                    └────┬───────┬────┘
                    yes  │       │  no
                         │       │
                         ▼       ▼
              ┌──────────┐    ┌──────────────────────────────────┐
              │ CONTINUE  │    │ DEAD RECKONING TRIGGER           │
              │ (normal)  │    │                                  │
              └──────────┘    │ Agent reads:                     │
                              │                                  │
                              │ 4. dead-reckoning.md  142 lines  │
                              │    ├─ Step 1: confirm blowout    │
                              │    ├─ Step 2: read session-      │
                              │    │   decisions.md (FIRST)       │
                              │    ├─ Step 3: git status/log/PRs │
                              │    ├─ Step 4: crew roster table  │
                              │    ├─ Step 5: file index by depth│
                              │    ├─ Step 6: standing orders    │
                              │    └─ Step 7: resume operations  │
                              │                                  │
                              │ NOWHERE DOES IT SAY:             │
                              │   "read .keel-state"             │
                              │   "reconstruct YAML HUD from it" │
                              │   "check for session-state file" │
                              │   "check worktree state"         │
                              │   "check open PRs via gh"        │
                              └──────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────────────────────────┐
                    │ 5. session-decisions.md   408 lines  │
                    │    ├─ SD-001 through SD-224          │
                    │    ├─ Contains ALL decisions ever     │
                    │    ├─ Agent must scan to find         │
                    │    │   "last known position"          │
                    │    └─ No machine-readable             │
                    │       "current state" section         │
                    └──────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────────────────────────┐
                    │ 6. .keel-state              1 line   │
                    │    {"officer","conn","weave",         │
                    │     "register","tempo","bearing",     │
                    │     "gate","gate_time","tests"}       │
                    │                                      │
                    │    NOT REFERENCED in boot sequence    │
                    │    No "instance" field                │
                    │    Stale — last written pre-          │
                    │       compaction, not updated since   │
                    └──────────────────────────────────────┘


THE GAP
═══════

  Auto-injected files (1-3) say WHAT the HUD should look like
  but not WHERE to get the data.

  Dead reckoning (4) says WHAT files to read
  but not HOW to reconstruct operational state from them.

  .keel-state (6) HAS the operational state
  but NOTHING in the boot chain points to it.

  session-state file (new, this session) exists at
  docs/internal/weaver/session-state-2026-02-28.md
  but NOTHING in the boot chain points to it either.


EVIDENCE: gpt-5.3-codex cold boot (28 Feb 2026)
═════════════════════════════════════════════════

  What it did:
  ├─ Read AGENTS.md + agent def        ✓ (got Weaver identity)
  ├─ Hit dead reckoning trigger        ✓ (knew to read it)
  ├─ Read session-decisions.md         ✓ (but stopped at SD-149?)
  ├─ Read .keel-state                  ✗ (not told to)
  ├─ Reconstruct HUD                   ✗ (no data source identified)
  └─ Result: HUD with "unknown" fields, SD-149 as last known

  What it produced:
  ┌────────────────────────────────────────────────────┐
  │  watch:                                            │
  │    officer: Weaver                                 │
  │    conn: Captain                                   │
  │  weave: tight                                      │
  │  register: quarterdeck                             │
  │  tempo: making-way                                 │
  │  true_north: get(goal=hired(...))                  │
  │  bearing: standing-by for Captain's directive      │
  │  last_known:                                       │
  │    head: unknown                                   │
  │    gate: unknown                                   │
  │    tests: unknown                                  │
  │    sd: SD-149                                      │
  │    prs: []                                         │
  └────────────────────────────────────────────────────┘

  Actual state at the time:
  ├─ HEAD: 1c4da76
  ├─ Gate: green
  ├─ Tests: 1125
  ├─ SD: SD-224
  ├─ PRs: #381, #382, #383, #384
  └─ 4 active worktrees
```
