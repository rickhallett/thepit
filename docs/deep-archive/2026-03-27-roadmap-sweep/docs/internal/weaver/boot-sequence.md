# Boot Sequence & File Map

> How Weaver's files connect. Recorded SD-199.

## Harness Load Order

```
BOOT SEQUENCE (harness load order)
══════════════════════════════════

  ┌─────────────────────────────────────────┐
  │  HARNESS AUTO-LOAD                      │
  │  (injected before first prompt)         │
  │                                         │
  │  ~/.claude/CLAUDE.md ──────────────┐    │
  │  AGENTS.md (repo root) ───────────┐│    │
  │  .opencode/agents/weaver.md ──┐   ││    │
  └───────────────────────────────┼───┼┼────┘
                                  │   ││
  WEAVER'S FILE MAP               │   ││
  ═════════════════               ▼   ▼▼

  .opencode/agents/weaver.md ◄──── IDENTITY (who I am, SOs, principles)
       │
       │ one-line ref
       ▼
  docs/internal/weaver/log.md ◄──── LEARNING LOG (successes, mistakes, patterns)
       │                            [depth 2]
       │
       │ (learning log cites SDs;
       │  SDs cite commits)
       │
  ═══════════════════════════════════════
  OPERATIONAL SURFACE (depth 1)
  ═══════════════════════════════════════
       │
       ├── session-decisions.md ◄──── DECISIONS (SD-nnn with [labels])
       │        │
       │        │ last 3 SDs flow to
       │        ▼
       │   .keel-state ◄──────────── RUNTIME STATE (JSON, gitignored)
       │        │                     written by: Weaver (judgment fields)
       │        │                               gate.sh (gate/tests)
       │        │                     read by:   scripts/hud.py (30s)
       │        │                               Weaver (per-tick)
       │        │
       ├── dead-reckoning.md ◄─────── RECOVERY (boot after blowout)
       │        │
       │        │ points to all depth 1
       │        │ files + depth 2 index
       │        │
       ├── lexicon.md ◄────────────── VOCABULARY (terms, YAML HUD spec)
       ├── pearls.md
       ├── v0.1-principles-distilled.md
       ├── v0.1-product-spec.md
       └── weaver-layer-model-index.md

  ═══════════════════════════════════════
  REFERENCE (depth 2)
  ═══════════════════════════════════════
       │
       ├── weaver/ (log.md, boot-sequence.md)
       ├── human-hud/  (Big O, Amdahl, L12)
       ├── audits/
       ├── hn-prep/
       ├── qa/
       └── ...

  ═══════════════════════════════════════
  ARCHIVE (depth 3+)
  ═══════════════════════════════════════
       │
       └── archive/ (round-tables, research,
                     hn, main-thread)
```

## Data Flow (per tick)

```
  Captain ←── hud.py ←── .keel-state ←── Weaver (judgment)
    30s          │                    ←── gate.sh (machine)
    refresh      │
                 ├── git (HEAD, log, graph)
                 ├── session-decisions.md (last 3 SDs)
                 └── docs/internal/ walk (CTX ratio)

  Weaver ←── .opencode/agents/weaver.md (identity, SOs)
    boot       │
               └── "Learning log: docs/internal/weaver/log.md"
                     (read when reflecting)
```
