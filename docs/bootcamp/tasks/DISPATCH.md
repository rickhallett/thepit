# Bootcamp II - Task Dispatch Manifest

**Created:** 2026-03-10
**Author:** Weaver
**Source:** `docs/bootcamp/BOOTCAMP-II-OUTLINE.md`

---

## Overview

16 tasks decomposed from the Bootcamp II outline. 5 research tasks (parallelizable),
11 write tasks (dependency-ordered). Each task has instructions in its numbered subdirectory.

**Research tasks produce findings files. Write tasks consume findings files + prior steps.**

---

## Execution Order

### Phase 1: Research (all 5 parallelizable)

| Task | Directory | Type | Output | Est. |
|------|-----------|------|--------|------|
| 01 | `01-research-format/` | Read Bootcamp I format | `findings.md` | 15m |
| 02 | `02-research-internal-refs/` | Read internal project files | `findings.md` | 20m |
| 03 | `03-research-tier1-external/` | Web research, Steps 1-3 refs | `findings.md` | 25m |
| 04 | `04-research-tier2-external/` | Web research, Steps 4-7 refs | `findings.md` | 30m |
| 05 | `05-research-tier3-external/` | Web research, Steps 8-11 refs | `findings.md` | 25m |

**Gate:** All 5 findings files must exist before any write task begins.

### Phase 2: Write - Tier 1 (Steps 1-3)

```
Task 06 (Step 1) -- no prior step dependency, starts first
    |
    +-- Task 07 (Step 2) -- depends on Step 1
    |
    +-- Task 08 (Step 3) -- depends on Step 1
                            (parallel with Task 07)
```

| Task | Directory | Depends On | Parallel With | Output |
|------|-----------|-----------|---------------|--------|
| 06 | `06-write-step01/` | Research 01-03 | None (first) | `step01-llm-mechanics.md` |
| 07 | `07-write-step02/` | 06 + Research 01-03 | 08 | `step02-agent-architecture.md` |
| 08 | `08-write-step03/` | 06 + Research 01-03 | 07 | `step03-prompt-engineering.md` |

### Phase 3: Write - Tier 2 (Steps 4-7)

```
Task 09 (Step 4) -- depends on Steps 1, 3
    |
Task 10 (Step 5) -- depends on Steps 2, 3 (parallel with 09)
    |
Task 11 (Step 6) -- depends on Steps 1-4 (convergence point)
    |
Task 12 (Step 7) -- depends on Steps 1, 4, 6
```

| Task | Directory | Depends On | Parallel With | Output |
|------|-----------|-----------|---------------|--------|
| 09 | `09-write-step04/` | 06, 08 + Research 01-02, 04 | 10 | `step04-context-engineering.md` |
| 10 | `10-write-step05/` | 07, 08 + Research 01-02, 04 | 09 | `step05-tool-design.md` |
| 11 | `11-write-step06/` | 06-09 + Research 01-02, 04 | None | `step06-verification-quality.md` |
| 12 | `12-write-step07/` | 06, 09, 11 + Research 01-02, 04 | None | `step07-human-ai-interface.md` |

### Phase 4: Write - Tier 3 (Steps 8-11)

```
Task 13 (Step 8) -- depends on Steps 1, 6, 7
    |
Task 14 (Step 9) -- depends on Steps 4, 6, 7 (parallel with 13)
    |
Task 15 (Step 10) -- depends on Steps 2, 5, 6, 7 (parallel with 16)
    |
Task 16 (Step 11) -- depends on Steps 2, 5 (parallel with 15)
```

| Task | Directory | Depends On | Parallel With | Output |
|------|-----------|-----------|---------------|--------|
| 13 | `13-write-step08/` | 06, 11, 12 + Research 01-02, 05 | 14 | `step08-multi-model-verification.md` |
| 14 | `14-write-step09/` | 09, 11, 12 + Research 01-02, 05 | 13 | `step09-failure-modes.md` |
| 15 | `15-write-step10/` | 07, 10, 11, 12 + Research 01-02, 05 | 16 | `step10-governance-process.md` |
| 16 | `16-write-step11/` | 07, 10 + Research 01-02, 05 | 15 | `step11-cost-security-legal.md` |

---

## Dependency Graph (Visual)

```
RESEARCH (all parallel)
  01 ─┐
  02 ─┤
  03 ─┼──> GATE: all findings exist
  04 ─┤
  05 ─┘
       │
       v
WRITE Phase 2
  06 (Step 1) ─────────────────────────────┐
       │                                    │
       ├──> 07 (Step 2) ──┐                │
       │                   │                │
       └──> 08 (Step 3) ──┤                │
                           │                │
WRITE Phase 3              │                │
       09 (Step 4) <── 06, 08              │
       10 (Step 5) <── 07, 08              │
       11 (Step 6) <── 06, 07, 08, 09     │
       12 (Step 7) <── 06, 09, 11         │
                           │                │
WRITE Phase 4              │                │
       13 (Step 8)  <── 06, 11, 12        │
       14 (Step 9)  <── 09, 11, 12        │
       15 (Step 10) <── 07, 10, 11, 12    │
       16 (Step 11) <── 07, 10             │
```

---

## Critical Path

The longest dependency chain determines minimum elapsed time:

```
Research (parallel) -> 06 (Step 1) -> 08 (Step 3) -> 09 (Step 4) -> 11 (Step 6) -> 12 (Step 7) -> 13 or 14 (Step 8/9)
```

7 serial steps on the critical path. Maximum parallelism: 5 (research), then 2 (Steps 2+3),
then 2 (Steps 4+5), then 1 (Step 6), then 1 (Step 7), then 2+2 (Steps 8+9, 10+11).

---

## Agent Assignment Notes

- **Research tasks (01-05):** Use `explore` subagent type. Read-only, no code modification.
  Tasks 03-05 require web fetch for URL verification.
- **Write tasks (06-16):** Use `general` subagent type. Each produces one markdown file
  in `docs/bootcamp/`. Prime context = research findings + prior completed steps + outline section.
- **Each task directory** contains `instructions.md` with full specification. The agent
  receives only the instructions file + the prime context files listed in it.
- **Quality gate for write tasks:** Output matches Bootcamp I format (from Task 01 findings),
  meets target line count, uses all required conventions (no emojis, no em-dashes, AGENTIC
  GROUNDING blockquotes, FIELD MATURITY blockquotes, SLOPODAR blockquotes where applicable).
