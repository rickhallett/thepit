# Boot Sequence — Expected Behaviour (Post-Fix)

> Author: Weaver
> Date: 28 February 2026
> Context: Companion to boot-sequence-gap-analysis.md. Shows the fixed boot flow.
> Back-ref: SD-225 (boot sequence fix), SD-222 (cross-model boot data)
> Companion: boot-sequence-gap-analysis.md (pre-fix gap diagram)

## Boot Flow — Post-Fix State

```
BOOT SEQUENCE — What a fresh harness instance sees (FIXED)
══════════════════════════════════════════════════════════════════════════

  ┌─────────────────────────────────────────────────────────────────┐
  │  HARNESS AUTO-INJECTS (L6 — before agent sees anything)       │
  │                                                                │
  │  1. ~/.claude/CLAUDE.md              ~182 lines                │
  │     ├─ "You are Weaver by default"                             │
  │     ├─ Dead reckoning trigger: "if session-decisions.md        │
  │     │   exists but you have no memory → read dead-reckoning"   │
  │     ├─ Agent index table (16 roles → file paths)               │
  │     ├─ Core philosophy, verification gate, assumption protocol │
  │     ├─ The Loop: Read → Verify → Write → Execute → Confirm    │
  │     └─ printf not echo, session completion rules               │
  │                                                                │
  │  2. AGENTS.md (repo root)            ~126 lines                │
  │     ├─ Same dead reckoning trigger (redundant layer)           │
  │     ├─ Project structure & module org                          │
  │     ├─ Build/test commands, local gate definition              │
  │     ├─ Coding style, commit conventions                        │
  │     ├─ Go CLI reference (pit* family)                          │
  │     └─ Security & config tips                                  │
  │                                                                │
  │  3. weaver.md (agent def)            ~380 lines                │
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
                              │ 4. dead-reckoning.md             │
                              │    ├─ Step 1: confirm blowout    │
                              │    ├─ Step 2: read session-      │
                              │    │   decisions.md (FIRST)       │
                              │    │                              │
                              │    ├─ Step 2b: read operational  │  ◄── THE FIX
                              │    │   state (NEW)               │
                              │    │   ├─ cat .keel-state        │
                              │    │   │   → HUD fields: officer,│
                              │    │   │     conn, weave, register│
                              │    │   │     tempo, bearing, gate │
                              │    │   │     gate_time, tests    │
                              │    │   │   → "If missing, set    │
                              │    │   │     all to unknown"     │
                              │    │   │                          │
                              │    │   ├─ ls -t session-state-*  │
                              │    │   │   → Ephemeral state:    │
                              │    │   │     worktrees, open PRs,│
                              │    │   │     merge sequences,    │
                              │    │   │     parked items        │
                              │    │   │                          │
                              │    │   └─ git worktree list      │
                              │    │       → Detect parallel ops │
                              │    │                              │
                              │    ├─ Step 3: git status/log/PRs │
                              │    ├─ Step 4: crew roster table  │
                              │    ├─ Step 5: file index by depth│
                              │    ├─ Step 6: standing orders    │
                              │    └─ Step 7: resume operations  │
                              └──────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────────────────────────┐
                    │ 5. session-decisions.md              │
                    │    ├─ SD-001 through SD-NNN          │
                    │    ├─ Contains ALL decisions ever     │
                    │    ├─ Agent scans to find             │
                    │    │   "last known position"          │
                    │    └─ Cross-ref against .keel-state   │
                    │       bearing field                   │
                    └──────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────────────────────────┐
                    │ 6. .keel-state              1 line   │
                    │    {"officer","conn","weave",         │
                    │     "register","tempo","bearing",     │
                    │     "gate","gate_time","tests"}       │
                    │                                      │
                    │    NOW REFERENCED in Step 2b         │  ◄── CLOSED
                    │    Agent knows to read it            │
                    │    Agent knows to use it for HUD     │
                    │    Agent knows fallback if missing   │
                    └──────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────────────────────────┐
                    │ 7. session-state-YYYY-MM-DD.md       │
                    │    (if exists)                        │
                    │                                      │
                    │    NOW REFERENCED in Step 2b         │  ◄── CLOSED
                    │    Bridges decisions → operational   │
                    │    context (worktrees, PRs, merge    │
                    │    sequences, parked items)           │
                    └──────────────────────────────────────┘


WHAT THE FIX CLOSES
════════════════════

  Pre-fix gap:
    Auto-injected files say WHAT the HUD should look like
    but not WHERE to get the data.

  Post-fix:
    Step 2b explicitly tells the agent:
    1. WHERE operational state lives (.keel-state)
    2. HOW to use it (populate HUD fields from JSON)
    3. WHAT to do if it's missing (set unknown, flag Captain)
    4. WHERE ephemeral state lives (session-state-*.md)
    5. HOW to detect parallel operations (git worktree list)

  The boot chain now has a complete path from
  "I have no context" to "I can produce a correct YAML HUD."


EXPECTED COLD-BOOT BEHAVIOUR (any model)
════════════════════════════════════════

  Given: fresh harness, no prior context, dead reckoning triggered

  1. Agent reads dead-reckoning.md                    (Step 1-2)
  2. Agent reads session-decisions.md                  (Step 2)
     → Gets: all decisions, last SD number
  3. Agent reads .keel-state                           (Step 2b)  ◄── NEW
     → Gets: officer, conn, weave, register, tempo,
             bearing, gate, gate_time, tests
  4. Agent checks for session-state file               (Step 2b)  ◄── NEW
     → Gets: worktrees, PRs, merge sequences, parked items
  5. Agent runs git worktree list                      (Step 2b)  ◄── NEW
     → Gets: active parallel operations
  6. Agent runs git status, git log, gh pr list        (Step 3)
     → Gets: current HEAD, branch, uncommitted changes, open PRs
  7. Agent produces YAML HUD with ALL fields populated (Step 7)

  Expected HUD output (using state from 28 Feb 2026 as example):
  ┌────────────────────────────────────────────────────┐
  │  watch: Weaver                                     │
  │  conn: Weaver                                      │
  │  weave: sequential                                 │
  │  register: wardroom                                │
  │  tempo: making-way                                 │
  │  true_north: Get Hired                             │
  │  bearing: session resumption — state verified      │
  │  last_known:                                       │
  │    head: 9d7f48a                                   │
  │    gate: green                                     │
  │    tests: 1125                                     │
  │    sd: SD-224                                      │
  │    prs: ["#381","#382","#383","#384"]               │
  │    worktrees: 4                                    │
  └────────────────────────────────────────────────────┘

  vs pre-fix (gpt-5.3-codex actual output):
  ┌────────────────────────────────────────────────────┐
  │  head: unknown                                     │
  │  gate: unknown                                     │
  │  tests: unknown                                    │
  │  sd: SD-149                                        │
  │  prs: []                                           │
  └────────────────────────────────────────────────────┘


REMAINING GAPS (KNOWN, NOT FIXED IN THIS CHANGE)
═════════════════════════════════════════════════

  1. .keel-state has no "instance" field (SD-221)
     → Two harnesses writing simultaneously will clobber.
     → Fix: add "instance": "alpha" | "bravo" | ... field.
     → Status: parked, awaiting implementation.

  2. .keel-state staleness
     → File is only as fresh as the last write.
     → If an agent crashes mid-session, .keel-state may be
       behind session-decisions.md by several SDs.
     → Mitigation: Step 2b says "cross-reference against
       session-decisions.md" — the SD log is authoritative,
       .keel-state is the quick-read instrument.

  3. session-decisions.md has no machine-readable summary
     → An agent must scan 400+ lines to find "last known."
     → Potential improvement: add a YAML frontmatter block
       with last_sd, last_head, last_gate_status.
     → Status: not proposed, documenting for completeness.

  4. Model-specific parsing differences
     → gpt-5.3-codex stopped at SD-149 despite file containing
       SD-224. Possible causes: token budget, attention drift,
       file read truncation. The fix (Step 2b → .keel-state)
       provides a 1-line alternative to scanning 400+ lines,
       which should be robust across models.
     → This is partially mitigated, not fully resolved.
```
