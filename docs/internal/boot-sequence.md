# Boot Sequence — noopit (thepit-v2)

> What every agent must load on cold wake. If you don't have this context, you're in the dumb zone.
> Back-ref: SD-311 (prime context), SD-299 (governance refined), SD-275 (token elephant).

The harness auto-loads three files before your first prompt: `~/.claude/CLAUDE.md`, `AGENTS.md`, and your agent file (`.claude/agents/<you>.md`). That gets you identity and standing orders. It does NOT give you orientation, vocabulary, or operational awareness. This file defines what you read next.

---

## The Sequence

Read in order. Do not skip steps. Do not read depth 2+ on boot — lazy load when needed.

```signal
BOOT := sequence(ordered, mandatory, no_skip)

-- Step 0: HARNESS AUTO-LOAD (you don't control this)
-- These are injected before your first prompt by the harness itself.
S0.global    := ~/.claude/CLAUDE.md                           -- engineering principles
S0.ship      := AGENTS.md                                     -- standing orders, gate, HUD spec
S0.identity  := .claude/agents/{self}.md                      -- who you are

-- Step 1: ORIENTATION (read immediately on wake)
S1.sd_index  := read(docs/internal/session-decisions-index.yaml)  -- last 10 SDs, standing orders
S1.lexicon   := read(docs/internal/lexicon.md)                    -- vocabulary [SO-PERM-002]
S1.slopodar  := read(docs/internal/slopodar.yaml)                -- anti-pattern taxonomy [SD-286]

-- Step 2: OPERATIONAL AWARENESS (read immediately after S1)
S2.signal    := read(docs/weaver/signal-protocol-poc.md)          -- Signal notation, syntax primitives
S2.layer     := read(docs/internal/layer-model.md)                -- L0-L12 agentic system model
S2.decisions := scan(docs/decisions/SD-*.md)                      -- session-scoped decision files

-- Step 3: SITUATIONAL (read on need — BFS depth 1 only)
S3.git       := run(git status && git log --oneline -10)
S3.recovery  := read(docs/internal/dead-reckoning.md)         WHEN context_died | blowout
S3.full_sd   := read(docs/internal/session-decisions.md)       WHEN tracing(specific_SD)
```

---

## What Each Step Gives You

**S0 (auto):** You know who you are, what the rules are, what the gate is. You do NOT know where you are, what's been decided recently, or what words mean in this system.

**S1 (orientation):** You know the last 10 decisions (bearing). You know the vocabulary (lexicon — every term, every HUD field, every register). You know the anti-patterns to watch for (slopodar). After S1, you can communicate in-vocabulary and understand Operator's signals.

**S2 (operational):** You know Signal notation (the compressed governance protocol — so `vgrep(x)` parses as "visual grep" not "run grep"). You know the layer model (L0-L12 — the map of how this system works). You know any session-scoped decisions that live as standalone files.

**S3 (situational):** You know git state, open PRs, recent commits. Only read if the task requires it. The dead-reckoning file is for blowout recovery only.

---

## File Map (BFS — depth 1 is boot, depth 2+ is reference)

```
docs/internal/                          -- DEPTH 1 (boot surface)
├── boot-sequence.md                    -- THIS FILE
├── session-decisions-index.yaml        -- last 10 SDs [S1]
├── lexicon.md                          -- vocabulary v0.20 [S1, SO-PERM-002]
├── slopodar.yaml                       -- anti-patterns, 18 entries [S1, SD-286]
├── layer-model.md                      -- L0-L12 v0.3 [S2]
├── session-decisions.md                -- FULL chain, 314 SDs [S3, archaeology only]
├── dead-reckoning.md                   -- blowout recovery [S3, emergency only]
└── weaver/                             -- DEPTH 2 (Weaver operational)
    └── ...

docs/weaver/                            -- DEPTH 2 (Signal, decode tests)
├── signal-protocol-poc.md              -- Signal notation spec [S2]
├── signal-decode-*.md                  -- test results
└── signal-reasoning-test-*.md          -- reasoning tests

docs/decisions/                         -- DEPTH 2 (session-scoped SDs)
├── SD-313-signal-protocol.md
└── SD-314-signal-early-results.md
```

---

## Standing Orders That Apply to Boot

```signal
SO-PERM-002  := all_hands.boot -> read(lexicon.md)              [SD-126]
               -- "If the Lexicon is not in your context window, you are not on this ship."
SO.slopodar  := all_hands.boot -> read(slopodar.yaml)           [SD-286]
SO.chain     := historical_data := immutable                     [SD-266 PERM]
SO.printf    := pipe(value, cli) -> printf !echo                 [CLAUDE.md]
```

---

## What This File Is NOT

- NOT a replacement for AGENTS.md (that's the standing orders — auto-loaded)
- NOT a replacement for the lexicon (that's the vocabulary — loaded at S1)
- NOT the dead reckoning protocol (that's for blowout recovery — loaded at S3 if needed)
- This IS the manifest that tells you what to read and when, so you don't wake up in the dumb zone

---

## Provenance

Created: 2026-03-03, SD-TBD (boot sequence definition for noopit).
Triggered by: Operator observed Weaver cold-waking without lexicon, signal spec, or SD orientation — responded to `vgrep(bootsequence)` without recognising Signal notation.
Root cause: Agent files referenced `docs/internal/` paths from tspit that didn't exist in noopit.
Fix: Essential files rescued from tspit-ARCHIVED. Boot sequence defined as manifest. AGENTS.md updated to point here.
