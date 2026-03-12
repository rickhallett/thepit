# Task 02 Findings: Project Data Sources

Research output for the bootcamp write tasks. Each section documents one data source
with its schema, volume, quality observations, and sample data. Write-task agents
should be able to construct realistic pandas/DuckDB code from these snippets alone.

---

## 1. Backlog (`docs/internal/backlog.yaml`)

### Format

Top-level YAML list (no wrapper key). Each entry is a dict.

### Schema

| Field    | Type            | Required | Notes                                              |
|----------|-----------------|----------|----------------------------------------------------|
| id       | string          | yes      | Format: `BL-NNN` (zero-padded 3 digits)            |
| title    | string          | yes      | Free text, can be very long (multi-line in source)  |
| status   | string          | yes      | Observed values: `open` (all 10 items are open)     |
| priority | string          | yes      | Observed: `medium` (7), `low` (3)                   |
| tags     | list of strings | yes      | 1-2 tags per item, e.g. `["housekeeping"]`          |
| epic     | string or null  | yes      | `E1` or `null`                                      |
| created  | string (ISO)    | yes      | ISO 8601 with timezone, e.g. `2026-03-08T15:41:52.485496+00:00` |
| closed   | string or null  | yes      | Always `null` in current data                       |
| reason   | string or null  | yes      | Free text or `null`; used for deferral notes        |

### Volume

10 entries. IDs: BL-001 through BL-010 (BL-006 appears after BL-009 in file order -
not sorted by ID).

### Data Quality Observations

- **ID gap:** BL-006 appears out of order (after BL-009). No BL-006 appears between BL-005 and BL-007 in sequence.
- **All items open:** No closed items exist, so `closed` is always null. Limited variety for status-based analysis.
- **Priority skew:** Only `medium` and `low` observed. No `high` or `critical` items.
- **Tags are lists:** Even single-tag items use list format, which is correct but means parsing must handle lists.
- **Reason field dual purpose:** Used both for deferral notes (BL-007, BL-009) and null for items with no notes.
- **Title length varies wildly:** BL-001 is 26 chars; BL-008 is ~450 chars (contains full analysis notes).

### Joinable Fields

- `id` (BL-NNN) - referenced from other sources by backlog ID
- `created` - temporal join with events.yaml
- `tags` - categorical grouping

### Sample Entries

```yaml
- id: BL-001
  title: Migrate Makefile to justfile
  status: open
  priority: medium
  tags:
  - housekeeping
  epic: null
  created: '2026-03-08T15:41:52.485496+00:00'
  closed: null
  reason: null

- id: BL-002
  title: Daemon integration tests for two-phase shutdown
  status: open
  priority: low
  tags:
  - testing
  epic: E1
  created: '2026-03-08T15:41:52.544237+00:00'
  closed: null
  reason: null

- id: BL-006
  title: 'Slopmop v2: Unix pipe filter for slop detection/replacement (T0 deterministic
    + T2 semantic). Prior work shows structural heuristics (T1) unreliable. Added
    complexity vs marginal gain relative to true north.'
  status: open
  priority: low
  tags:
  - tooling
  - portfolio
  epic: null
  created: '2026-03-10T12:00:00+00:00'
  closed: null
  reason: 'Parked: complexity vs marginal gain. See docs/field-notes/2026-03-10-slopmop-pipe-filter-exploration.md'
```

---

## 2. Events (`docs/internal/events.yaml`)

### Format

YAML with a top-level `events` key containing a list of dicts. Header comment present.

### Schema

| Field    | Type            | Required | Notes                                                   |
|----------|-----------------|----------|---------------------------------------------------------|
| date     | string          | yes      | Format: `YYYY-MM-DD` (quoted)                           |
| time     | string          | yes      | Format: `HH:MM` (quoted)                                |
| type     | string          | yes      | Observed: `L11`, `process`, `reset`, `decision`, `lullaby` |
| agent    | string          | yes      | Observed: `Weaver`, `Operator`                          |
| commit   | string or null  | yes      | Short git hash (7 chars) or `null`                      |
| ref      | string or null  | yes      | File path, SD number, or `null`                         |
| summary  | string          | yes      | Free text, single line (can be very long)               |
| backrefs | list of strings | yes      | References to other files/decisions, e.g. `[catch-log.tsv]`, `[SD-316, lexicon-v0.24, catch-log.tsv]` |

### Volume

5 entries. Date range: 2026-03-04 to 2026-03-05.

### Data Quality Observations

- **Small dataset:** Only 5 events. Too small for meaningful statistical analysis without simulation.
- **Date and time as separate strings:** Not a single datetime field. Would need concatenation for temporal ordering.
- **Commit can be null:** 2 of 5 entries have null commit.
- **Ref can be null:** 1 of 5 entries has null ref.
- **Backrefs are lists:** Heterogeneous content (file names, SD numbers, slopodar pattern IDs like `slopodar:the-lullaby`).
- **Type values not documented:** The set `{L11, process, reset, decision, lullaby}` is observed but no enum is defined.

### Legacy Format (events.tsv)

A TSV version exists at `docs/internal/events.tsv` with the same schema as column headers:
`date  time  type  agent  commit  ref  summary  backrefs`

Contains 4 entries (a subset of the YAML version - the YAML has one additional entry).
The TSV uses `-` for null refs and single strings for backrefs (no list syntax).
Migrated per SD-316.

### Joinable Fields

- `date` + `time` - temporal join with catch-log.tsv (date field)
- `agent` - join with catch-log.tsv (agent field)
- `commit` - join with git log
- `ref` - references SD numbers (join with session-decisions-index) and file paths
- `backrefs` - cross-references to catch-log.tsv, SD numbers, slopodar pattern IDs

### Sample Entries

```yaml
events:
  - date: "2026-03-04"
    time: "08:30"
    type: L11
    agent: Weaver
    commit: dd23fa3
    ref: governance-friction-audit-2026-03-04.md
    summary: "Cross-model governance friction audit processed. Useful as inventory, not yet a friction audit."
    backrefs: [catch-log.tsv]

  - date: "2026-03-05"
    time: "10:45"
    type: lullaby
    agent: Weaver
    commit: null
    ref: catch-log.tsv
    summary: "Lullaby caught by Operator (L12). Weaver built 8-section DeepMind application muster that named credential gaps then optimised past them. Operator: 'We are in lullaby territory.' DeepMind scrubbed."
    backrefs: [slopodar:the-lullaby, slopodar:option-anchoring, catch-log.tsv]
```

---

## 3. Catch Log (`docs/internal/weaver/catch-log.tsv`)

### Format

TSV (tab-separated values) with a header row.

### Schema

| Column       | Type   | Notes                                                          |
|--------------|--------|----------------------------------------------------------------|
| date         | string | Format: `YYYY-MM-DD`                                          |
| control      | string | The control that fired, e.g. `L11 cross-model`, `gauntlet-audit`, `the-lullaby`, `dc-gemini`, `darkcat-workflow`, `dc-openai-r2`, `dc-openai-r3` |
| what_caught  | string | Free text description of what was caught                       |
| agent        | string | Lowercase, e.g. `weaver`, `operator(L12)`                     |
| outcome      | string | Observed: `logged`, `reviewed`, `blocked`, `fixed`, `scrubbed` |
| notes        | string | Free text, can be very long (100+ words)                       |

### Volume

10 data rows (plus 1 header row). All dated 2026-03-04 or 2026-03-05.

### Data Quality Observations

- **Agent casing inconsistent with events.yaml:** catch-log uses lowercase (`weaver`), events.yaml uses title case (`Weaver`). Also `operator(L12)` is a compound value.
- **No ID column:** Rows are identified only by position. No stable identifier for joins.
- **Control names are freeform:** Not a closed enum. Some include version info (`dc-openai-r2`, `dc-openai-r3`).
- **Notes field is very long:** Some entries are full paragraphs. The lullaby entry (row 10) is ~150 words.
- **All entries in 2-day window:** 2026-03-04 (9 rows) and 2026-03-05 (1 row).
- **Tab characters in data unlikely but possible:** Notes field uses semicolons as internal separators, suggesting awareness of TSV constraints.

### Joinable Fields

- `date` - temporal join with events.yaml
- `agent` - join with events.yaml (needs case normalization)
- `control` - can reference slopodar pattern IDs (e.g. `the-lullaby`)
- `what_caught` - free text, references file names and SD numbers

### Sample Entries (raw TSV, tabs shown as `\t`)

```
date	control	what_caught	agent	outcome	notes
2026-03-04	L11 cross-model	governance-friction-audit via non-Claude model	weaver	logged	first L11 firing event; audit identified SO/lexicon dedup + missing firing records; inventory useful, friction analysis incomplete
2026-03-04	dc-openai-r2	parseValidBody catches all exceptions as 400	weaver	fixed	DC-OpenAI correctly identified SyntaxError vs non-SyntaxError distinction; added SyntaxError guard + 500 fallback for non-parse failures
2026-03-05	the-lullaby	DeepMind application muster — named gaps then built 8-section framework to paper over them	operator(L12)	scrubbed	Weaver presented "honest" assessment of DeepMind FTC fit that named credential gaps (no PhD, no publications, no lab) then spent 80% of output building optimistic application pitch. "Strong" ratings on every section. Operator caught it: "We are in lullaby territory." Textbook Lullaby + Option Anchoring: gap-naming as structural cover for encouragement. DeepMind scrubbed from timeline. Cost on human sensemaking: high.
```

---

## 4. Slopodar (`docs/internal/slopodar.yaml`)

### Format

YAML with a top-level `patterns` key containing a list of dicts. Extensive header comments.
Organized into two tiers: PRIMARY (field observations with provenance) and SECONDARY
(algorithmically mined, one instance each).

### Schema

| Field        | Type            | Required | Notes                                                       |
|--------------|-----------------|----------|-------------------------------------------------------------|
| id           | string          | yes      | Kebab-case identifier, e.g. `tally-voice`                   |
| name         | string          | yes      | Human-readable, e.g. `"Tally Voice"`                        |
| domain       | string          | yes      | Category. Observed: `prose-style`, `metacognitive`, `tests`, `governance-process`, `relationship-sycophancy`, `analytical-measurement`, `code`, `commit-workflow` |
| detected     | date            | yes      | Format: `YYYY-MM-DD` (unquoted, parsed as date by YAML)     |
| confidence   | string          | yes      | Observed: `strong`, `medium`, `low`                          |
| trigger      | string          | yes      | The specific text/pattern that surfaced this (quoted)        |
| description  | string          | yes      | Multi-line YAML block scalar (`>`)                           |
| detect       | string          | yes      | Actionable detection heuristic (multi-line `>`)              |
| instead      | string          | yes      | What a human would write instead (multi-line `>`)            |
| severity     | string          | yes      | Observed: `high`, `medium` (no `low` or `critical`)         |
| refs         | list of strings | yes      | Provenance references                                        |
| originated_by| string          | no       | Only on `deep-compliance`. Rare optional field.              |
| related      | list of strings | no       | Only on `the-lullaby`. Cross-references to other patterns.   |
| evidence     | list of strings | no       | Only on `right-answer-wrong-work`. External citations.       |
| examples     | list of dicts   | no       | Only on `paper-guardrail` and `shadow-validation`. Sub-entries with `id`, `date`, `ref`, `what_happened`, `caught_by`. |

### Volume

28 pattern entries total.
- Primary tier: 18 patterns (prose: 6, metacognitive: 1, tests: 1, governance: 5, sycophancy: 5, analytical: 4)
- Secondary tier: 10 patterns (code: 4, tests: 3, commit-workflow: 3, sycophancy: 2, prose: 1... but actual count by domain varies)

Counted by domain:
- `prose-style`: 7 (6 primary + 1 secondary)
- `governance-process`: 6 (5 primary + 1 secondary)
- `relationship-sycophancy`: 7 (5 primary + 2 secondary)
- `analytical-measurement`: 4 (all primary)
- `tests`: 4 (1 primary + 3 secondary)
- `code`: 3 (all secondary)
- `commit-workflow`: 3 (all secondary)
- `metacognitive`: 1 (primary)

Detection date range: 2026-02-27 to 2026-03-02.

### Data Quality Observations

- **Optional fields inconsistent:** `originated_by`, `related`, `evidence`, `examples` appear on a handful of entries only. Most entries lack these fields entirely.
- **Severity skew:** Only `high` and `medium` observed. No `low` or `critical`.
- **Confidence distribution:** `strong` (most), `medium` (several), `low` (4 entries - all secondary tier).
- **Description fields use `>` block scalars:** These fold newlines into spaces. Important for parsing.
- **Nested examples sub-schema:** Two entries (`paper-guardrail`, `shadow-validation`) have an `examples` list with sub-dicts. Schema: `{id: str, date: str, ref: str, what_happened: str, caught_by: str}`.
- **Domain values are not normalized:** `prose-style` vs `relationship-sycophancy` vs `analytical-measurement` - mixed hyphenation conventions.

### Joinable Fields

- `id` - referenced from events.yaml backrefs as `slopodar:<id>` (e.g. `slopodar:the-lullaby`)
- `detected` - temporal join with events and catch-log
- `domain` - categorical grouping
- `confidence` / `severity` - ordinal for ranking/filtering

### Sample Entries

```yaml
  - id: tally-voice
    name: "Tally Voice"
    domain: prose-style
    detected: 2026-02-27
    confidence: strong
    trigger: "15 systems mapped to 7 literature domains"
    description: >
      The LLM substitutes enumeration for substance. Precise counts
      deployed as rhetorical authority ("6 constructs," "15 systems,"
      "7 domains") when the numbers add nothing.
    detect: >
      Search for sentences where a number precedes a noun phrase and
      the number could be removed without losing meaning.
    instead: >
      "The engineering work maps onto distributed cognition research
      in ways I didn't expect." Let the table speak for itself.
    severity: high
    refs:
      - "SD-209 (oceanheart.ai overhaul)"
      - "sites/oceanheart/content/research/prospective-regulation.md"

  - id: phantom-ledger
    name: "Phantom Ledger"
    domain: code
    detected: 2026-03-02
    confidence: medium
    trigger: "settleCredits writes deltaMicro: -20 to the ledger when the SQL only deducted 5."
    description: >
      The LLM builds a correct operation but records a different
      value in the audit trail.
    detect: >
      In financial code: trace the value from computation through
      to the audit record. Are they the same variable, or computed
      independently?
    instead: >
      Use a RETURNING clause to capture the actual value, then
      write that value to the ledger.
    severity: high
    refs:
      - "wake:lib/credits.ts - settleCredits function"
```

---

## 5. Session Decisions Index (`docs/internal/session-decisions-index.yaml`)

### Format

YAML with three top-level keys: metadata fields, `standing_orders` list, and `recent` list.

### Schema - Top Level

| Field           | Type   | Notes                                       |
|-----------------|--------|---------------------------------------------|
| generated       | string | ISO 8601 datetime                           |
| total_decisions | int    | Total count across full chain (322)         |
| range           | string | e.g. `"SD-001 to SD-322"`                   |
| note            | string | Context note about the chain                |

### Schema - standing_orders (list of dicts)

| Field   | Type   | Notes                                           |
|---------|--------|-------------------------------------------------|
| id      | string | Format: `SD-NNN`                                |
| label   | string | Kebab-case label, e.g. `truth-first`            |
| summary | string | Free text description                           |
| status  | string | Observed: `PERMANENT`, `STANDING ORDER`         |

### Schema - recent (list of dicts)

| Field   | Type   | Notes                                                    |
|---------|--------|----------------------------------------------------------|
| id      | string | Format: `SD-NNN`                                         |
| label   | string | Kebab-case label                                         |
| summary | string | Free text, can be very long (SD-321 is ~280 chars)       |
| status  | string | Observed: `Complete`, `STANDING`, `DRAFT`, `EXPLORATORY - PROTOTYPAL`, `STANDING ORDER`, `STANDING (this run)`, `PERMANENT`, `COMPLETE`, `ACTIVE` |

### Volume

- 5 standing orders (SD-134, SD-266, SD-268, SD-286, SD-297)
- 15 recent decisions (SD-308 through SD-322)
- Total chain: 322 decisions (full chain in `docs/internal/session-decisions.md`)

### Data Quality Observations

- **Status values are not normalized:** `Complete` vs `COMPLETE`, `STANDING` vs `STANDING ORDER` vs `STANDING (this run)`. Mixed case and varying specificity.
- **ID gap:** Standing orders are SD-134, 266, 268, 286, 297. Recent starts at SD-308. Gap of SD-298 to SD-307 not represented.
- **Summary length varies:** From 40 chars (SD-308) to 280+ chars (SD-321).
- **Label is human-assigned:** Not derived from ID, so label acts as a semantic key.

### Joinable Fields

- `id` (SD-NNN) - referenced from events.yaml refs and backrefs, slopodar refs, catch-log notes
- `label` - semantic identifier, used in AGENTS.md references
- `status` - categorical (needs normalization)

### Sample Entries

```yaml
standing_orders:
  - id: SD-134
    label: "truth-first"
    summary: "Truth first - telling the truth takes priority over getting hired."
    status: "PERMANENT"

recent:
  - id: SD-318
    label: "darkcat-alley"
    summary: "Darkcat Alley - standardised 3-model cross-triangulation. Named, lexified (v0.25). Structured YAML output, bin/triangulate parser, 8 metrics, 7 visualisation targets for portfolio."
    status: "STANDING (this run)"

  - id: SD-321
    label: "signal-killed"
    summary: "Operator verbatim: 'Signal has no signal. Kill it.' Signal notation abandoned as a governance compression mechanism. Shorthand achieves equal or better compression with equal decode accuracy [SD-320]."
    status: "PERMANENT"
```

---

## 6. Triangulate Output Schema (`bin/triangulate` export products)

### Overview

The `bin/triangulate` script reads 2-3 Darkcat Alley review files (markdown with embedded YAML)
and produces 5 export files in `data/alley/<run-id>/`. The `data/alley/` directory does not
currently exist (no exports have been run in this repo).

### Input: Review File Schema

Each review file is markdown containing a fenced YAML block with two keys:

```yaml
review:
  model: string       # e.g. "claude-3-opus"
  date: string        # ISO date
  branches: list      # branch names reviewed
  base_commit: string # git hash

findings:
  - id: string        # finding ID, e.g. "F-01"
    branch: string    # branch name
    file: string      # file path
    line: int|null    # line number
    severity: string  # critical | high | medium | low
    watchdog: string  # WD-SH | WD-LRT | WD-CB | WD-DC | WD-TDF | WD-PG | WD-PL | none
    slopodar: string  # slopodar pattern ID or "none"
    title: string     # short description
    description: string  # full description
    recommendation: string  # fix suggestion
```

### Export Products (5 files per run)

#### 6a. `metadata.yaml`

```yaml
run_id: string                # auto-generated or --run flag, e.g. "run-20260310-143000"
computed_at: string           # ISO 8601 datetime
reviews:
  R1:                         # review IDs are R1, R2, R3
    model: string
    date: string
    branches: list
    finding_count: int
  R2: ...
  R3: ...
```

#### 6b. `R1.yaml`, `R2.yaml`, `R3.yaml` (per-review parsed findings)

Direct YAML dump of the parsed review data. Same schema as the input review file.

#### 6c. `convergence.yaml`

List of matched finding groups:

```yaml
- title: string              # canonical title (from first match)
  file: string               # canonical file path
  severity: string           # highest severity across matched findings
  convergence: [R1, R2, R3]  # which reviews found this
  convergence_count: int     # len(convergence)
  match_confidence: float|null  # avg pairwise similarity (null for singletons)
```

#### 6d. `metrics.yaml`

The main analytics output. Top-level keys:

```yaml
computed_at: string           # ISO 8601

finding_count:                # per-review counts
  R1:
    model: string
    total: int
    unique: int               # found by this review only
    shared_2: int             # shared with exactly 1 other review
    shared_3: int             # shared with all 3 reviews

convergence_rate:
  total_unique_findings: int
  n_reviews: int
  converged_all: int          # found by all reviews
  converged_2: int            # found by exactly 2
  single_model: int           # found by exactly 1
  rate_all: float             # converged_all / total
  rate_2plus: float           # (converged_all + converged_2) / total
  rate_single: float          # single_model / total

marginal_value:
  dispatch_order:
    order: [R1, R2, R3]
    cumulative:
      - model: string
        review_id: string
        cumulative_unique: int
        new_unique: int
  all_permutations: list      # all N! orderings
  position_means:
    - position: int
      mean_new_unique: float
      mean_cumulative: float
  model_means:
    R1:
      model: string
      mean_new_unique: float
  n_permutations: int

severity_distribution:        # per-review severity counts
  R1:
    model: string
    critical: int
    high: int
    medium: int
    low: int

watchdog_distribution:        # per-review watchdog category counts
  R1:
    model: string
    categories:
      WD-SH: int
      WD-LRT: int
      # ... etc

severity_calibration:         # converged findings only
  - finding: string           # canonical title
    match_confidence: float
    severity_R1: string
    severity_R2: string
    agreement: bool           # all same severity?
    max_delta: int            # ordinal distance (0-3)

false_positive_rate:
  status: "pending_adjudication"  # always this until human review
  note: string
  per_model:
    R1:
      model: string
      total_findings: int
      confirmed_true: null    # always null until adjudicated
      confirmed_false: null
      disputed: null
      fp_rate: null

match_diagnostics:
  threshold: float            # default 0.6
  total_groups: int
  converged_groups: int
  singleton_groups: int
  avg_confidence: float
  min_confidence: float
  max_confidence: float
```

#### 6e. `findings-union.yaml`

Deduplicated union of all findings across reviews:

```yaml
- title: string
  file: string
  severity: string            # highest across reviews
  found_by: [R1, R2]         # which reviews found this
  convergence_count: int
  match_confidence: float|null
  details:
    R1:
      id: string
      severity: string
      watchdog: string
      slopodar: string
      line: int|null
      description: string
      recommendation: string
    R2: ...
```

### Matching Algorithm Notes

- Similarity is computed as `0.3 * file_similarity + 0.7 * title_similarity` using `difflib.SequenceMatcher`.
- Default threshold: 0.6.
- Greedy best-first assignment: scores sorted descending, each finding assigned to at most one group, at most one finding per review per group.
- Singletons (unmatched findings) become their own groups with `match_confidence: null`.

---

## 7. Cross-Source Relationships

### Temporal Joins

All sources have date fields, enabling temporal analysis:

| Source                    | Date field              | Format                         |
|---------------------------|-------------------------|--------------------------------|
| backlog.yaml              | `created`               | ISO 8601 with microseconds+tz |
| events.yaml               | `date` + `time`         | `YYYY-MM-DD` + `HH:MM`        |
| catch-log.tsv             | `date`                  | `YYYY-MM-DD`                   |
| slopodar.yaml             | `detected`              | `YYYY-MM-DD` (unquoted)        |
| session-decisions-index   | `generated` (file-level)| ISO 8601                       |

Note: date formats differ across sources. Backlog uses full ISO with timezone and microseconds. Events uses two separate fields. Slopodar uses bare dates. Normalization needed for joins.

### Agent/Actor Joins

| Source          | Field           | Values observed                      |
|-----------------|-----------------|--------------------------------------|
| events.yaml     | `agent`         | `Weaver`, `Operator` (title case)    |
| catch-log.tsv   | `agent`         | `weaver`, `operator(L12)` (lowercase, compound) |

Case normalization and parsing of compound values (stripping `(L12)`) needed.

### Cross-Reference Web

The sources form a reference web through these mechanisms:

1. **events.yaml `backrefs`** reference `catch-log.tsv`, SD numbers, and `slopodar:<id>` patterns
2. **catch-log.tsv `notes`** reference SD numbers, file paths, and slopodar pattern names
3. **slopodar.yaml `refs`** reference SD numbers (e.g. `SD-209`)
4. **session-decisions-index `id`** is the target of SD-NNN references from all other sources
5. **backlog.yaml `id`** (BL-NNN) is referenced from slopodar examples (`BL-006`)

### Data Volume Summary

| Source                    | Entry count | Date range                    |
|---------------------------|-------------|-------------------------------|
| backlog.yaml              | 10          | 2026-03-08 to 2026-03-10     |
| events.yaml               | 5           | 2026-03-04 to 2026-03-05     |
| catch-log.tsv             | 10          | 2026-03-04 to 2026-03-05     |
| slopodar.yaml             | 28          | 2026-02-27 to 2026-03-02     |
| session-decisions-index   | 20 (5+15)   | SD-134 to SD-322              |
| triangulate exports       | 0 (no runs) | n/a                           |

Total across all sources: ~73 records. Small enough to use directly in exercises without simulation, but some exercises may want to generate synthetic data to practice at scale.

---

## 8. Notes for Write-Task Agents

1. **YAML parsing:** All YAML files use PyYAML-compatible syntax. The slopodar uses `>` block scalars for multi-line strings. backlog.yaml is a bare list (no wrapper key). events.yaml has a wrapper key (`events:`).

2. **TSV parsing:** catch-log.tsv uses standard TSV with a header row. Some fields contain semicolons as internal separators. The lullaby entry on the last row uses a long-dash character in `named gaps then built` - verify encoding handling.

3. **No triangulate export data exists:** The `data/alley/` directory does not exist. Exercises referencing triangulate output will need to either (a) generate synthetic data matching the schema documented in section 6, or (b) run `bin/triangulate` against sample review files to produce real output.

4. **Realistic code patterns for pandas:**
   - `pd.read_csv("catch-log.tsv", sep="\t")` for TSV
   - `yaml.safe_load(open("backlog.yaml"))` returns a list directly
   - `yaml.safe_load(open("events.yaml"))["events"]` to unwrap
   - `yaml.safe_load(open("slopodar.yaml"))["patterns"]` to unwrap

5. **Realistic code patterns for DuckDB:**
   - `duckdb.sql("SELECT * FROM read_csv_auto('catch-log.tsv', delim='\t')")`
   - YAML sources need Python preprocessing before DuckDB ingestion (load YAML, convert to DataFrame, register)

6. **Join hazards to build exercises around:**
   - Agent name case mismatch (title case vs lowercase)
   - Compound agent values (`operator(L12)`)
   - Date format heterogeneity across sources
   - Backrefs containing mixed reference types in a single list
   - Slopodar IDs referenced with prefix (`slopodar:the-lullaby`) in events but bare (`the-lullaby`) in slopodar itself
