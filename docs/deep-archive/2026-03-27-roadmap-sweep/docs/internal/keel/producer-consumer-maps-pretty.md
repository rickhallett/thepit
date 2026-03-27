# Producer-Consumer Maps — Pretty Print

Provenance: Keel session 2026-03-01, commit 90cb1a4
Machine-readable version: `producer-consumer-maps.yaml` (same directory)

---

## `session-decisions.md`

```
                    PRODUCERS (write)
                    ─────────────────
                         │
                    ┌────┴────┐
                    │  Agents │  (any agent via Main Thread)
                    │ append  │  Markdown table row:
                    │ SD-NNN  │  | SD-252 | [label] description | author | status |
                    └────┬────┘
                         │
                         ▼
          ┌──────────────────────────────┐
          │  docs/internal/              │
          │  session-decisions.md        │
          │                              │
          │  Format: Markdown table      │
          │  ~250 rows, append-only      │
          │  Writable (not 444)          │
          └──────────────┬───────────────┘
                         │
          ┌──────────────┼──────────────────────────┐
          │              │                          │
          ▼              ▼                          ▼
   CONSUMER 1      CONSUMER 2                CONSUMER 3
   ───────────     ───────────               ───────────
   pitkeel         hud.py                    Hugo site
   main.go         field_sd()               decisions.json
                                            (separate file)
   findLastSD()    Regex parser:
   Line 615-633    r"^\|\s*SD-(\d+)\s*\|"   245 entries
                   Extracts SD num + label   (manually synced
   Parses:         from [label] in cell      from .md to .json,
   "| SD-" prefix                            not auto-parsed)
   Extracts        Returns top 3 by number
   last SD-NNN
                                            Hugo templates read
   Writes to       Renders to terminal:     .Site.Data.decisions
   .keel-state     SD [(SD-252, the-sextant),  list.html, single.html
   ["sd"] field        (SD-251, ...)]

          ┌──────────────────────────────────────────┐
          │         REFERENCE CONSUMERS              │
          │         (read by agents/humans,          │
          │          no programmatic parsing)         │
          ├──────────────────────────────────────────┤
          │  AGENTS.md          — dead reckoning     │
          │  dead-reckoning.md  — recovery sequence  │
          │  weave-quick-ref.md — "if not there, ask"│
          │  maturin.md         — "decision trail"   │
          │  boot-sequence*.md  — recovery diagrams  │
          │  compaction.log     — recovery notes      │
          │  ~15 archive/doc files — backrefs        │
          └──────────────────────────────────────────┘
```

**Conversion to YAML impact:**

| Consumer | Rewrite? | Effort | Note |
|----------|----------|--------|------|
| pitkeel `findLastSD()` | **Yes** | Low | YAML: `entries[-1].id` — simpler than regex |
| hud.py `field_sd()` | **Yes** | Low | YAML: iterate entries, sort, take [:3] — simpler |
| Hugo `decisions.json` | **Eliminable** | — | Hugo reads YAML natively from `data/`. The manual sync (md→json) is itself a drift risk — 245 entries vs ~250 SDs suggests 5 already missing. |
| Reference consumers | No code change | — | Path/format awareness only |

**Risk: MEDIUM.** Two parsers must be rewritten and tested against behavior, not compilation.

---

## `lexicon.md`

```
                    PRODUCERS (write)
                    ─────────────────
                         │
                    ┌────┴─────────┐
                    │  Captain     │  (selections, term definitions)
                    │  + Weaver    │  (organisation, version bumps)
                    │              │
                    │  Procedure:  │  chmod 644 → edit → bump version
                    │              │  → update version history table
                    │              │  → chmod 444
                    └────┬─────────┘
                         │
                         ▼
          ┌──────────────────────────────┐
          │  docs/internal/              │
          │  lexicon.md                  │
          │                              │
          │  Format: Markdown            │
          │  - YAML code block (HUD spec)│
          │  - Markdown tables (terms)   │
          │  - Version history table     │
          │  Read-only (444)             │
          └──────────────┬───────────────┘
                         │
          ┌──────────────┤
          │              │
          ▼              ▼
   CONSUMER 1      CONSUMER 2
   ───────────     ───────────
   (none)          (none)
   No code         No code
   parses this     parses this
   file.           file.

   Zero             Zero
   programmatic     programmatic
   consumers.       consumers.

          ┌──────────────────────────────────────────┐
          │         REFERENCE CONSUMERS              │
          │         (read by agents/humans,          │
          │          no programmatic parsing)         │
          ├──────────────────────────────────────────┤
          │  AGENTS.md          — SO-PERM-002:       │
          │                       "all hands must    │
          │                       read the lexicon"  │
          │  Every agent file   — boot context       │
          │  sextant.yaml       — backrefs           │
          │  citations.yaml     — backrefs           │
          │  category-one.yaml  — backrefs           │
          │  beyond-captain.yaml— backrefs           │
          │  holding-deck.yaml  — format standard.   │
          │  ~10 doc files      — backrefs           │
          └──────────────────────────────────────────┘
```

**Conversion to YAML impact:**

| Consumer | Rewrite? | Effort | Note |
|----------|----------|--------|------|
| (none) | — | — | Zero programmatic consumers. No code parses this file. |
| Reference consumers | No code change | — | Backref strings update: `lexicon.md` → `lexicon.yaml` |
| Hugo | **New capability** | — | Could compile directly from `data/` if YAML |
| Agent boot | **Improved** | — | Structured term lookup vs scanning markdown tables |

**Risk: LOW.** No code breaks. Backref string updates are mechanical.

---

## Comparison

```
                    session-decisions.md          lexicon.md
                    ────────────────────          ──────────
  Programmatic
  consumers:              3                         0

  Parsers to
  rewrite:                2                         0

  Files
  eliminable:             1 (decisions.json)        0

  Conversion
  risk:                 MEDIUM                     LOW

  Recommendation:     Convert, but rewrite       Clean win.
                      and TEST parsers FIRST.    Convert first.
                      Behavioral tests before    No code breaks.
                      schema change. We learned  Already in
                      this the hard way          holding-deck.
                      (keel/slop.yaml).
```
