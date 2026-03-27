# Darkcat Alley — Full Run Sequencing

**Version:** 1.0
**Backrefs:** SD-318 (Darkcat Alley), SD-317 (QA sequencing)
**Prerequisites:** Diffs generated, prompts on file, `bin/triangulate` operational

---

## Run Structure

Three trios, nine reviews, three aggregation steps, one synthesis.

```
TRIO A: Code Review Alley         (3 models × codebase diffs)
TRIO B: Methodology Adversarial   (3 models × triangulation process)
TRIO C: Pipeline Adversarial      (3 models × bin/triangulate code)

AGGREGATE each trio → metrics + convergence
SYNTHESISE across trios → final report
```

---

## File Structure

All outputs live under `data/alley/<run-id>/`. Run ID format: `YYYYMMDD` (date of run).

```
data/alley/20260309/
├── diffs/                                    # INPUT: frozen diffs
│   ├── phase2-ui.diff
│   ├── phase4-economy.diff
│   └── phase5-discovery.diff
│
├── code-review/                              # TRIO A: code review alley
│   ├── code-review-claude.md                 # R1 raw review
│   ├── code-review-gemini.md                 # R2 raw review
│   ├── code-review-codex52.md                # R3 raw review
│   ├── code-review-convergence.yaml          # aggregated convergence matrix
│   ├── code-review-metrics.yaml              # aggregated metrics (8 metrics)
│   └── code-review-findings-union.yaml       # deduplicated findings union
│
├── methodology/                              # TRIO B: methodology adversarial
│   ├── methodology-claude.md                 # R1 raw review
│   ├── methodology-gemini.md                 # R2 raw review
│   ├── methodology-codex52.md                # R3 raw review
│   ├── methodology-convergence.yaml          # aggregated convergence matrix
│   ├── methodology-metrics.yaml              # aggregated metrics
│   └── methodology-findings-union.yaml       # deduplicated findings union
│
├── pipeline/                                 # TRIO C: pipeline adversarial
│   ├── pipeline-claude.md                    # R1 raw review
│   ├── pipeline-gemini.md                    # R2 raw review
│   ├── pipeline-codex52.md                   # R3 raw review
│   ├── pipeline-convergence.yaml             # aggregated convergence matrix
│   ├── pipeline-metrics.yaml                 # aggregated metrics
│   └── pipeline-findings-union.yaml          # deduplicated findings union
│
├── metadata.yaml                             # run metadata (date, branches, commits)
└── synthesis.md                              # final cross-trio synthesis
```

---

## Sequencing

### Phase 0: Prepare (human, ~5 min)

**Action:** Generate frozen diffs and create run directory.

```bash
RUN_ID=20260309
mkdir -p data/alley/$RUN_ID/diffs

git diff main..phase2-ui        > data/alley/$RUN_ID/diffs/phase2-ui.diff
git diff main..phase4-economy   > data/alley/$RUN_ID/diffs/phase4-economy.diff
git diff main..phase5-discovery > data/alley/$RUN_ID/diffs/phase5-discovery.diff

mkdir -p data/alley/$RUN_ID/{code-review,methodology,pipeline}
```

**Output:** `data/alley/$RUN_ID/diffs/*.diff`

Record snapshot state:

```bash
cat > data/alley/$RUN_ID/metadata.yaml << EOF
run_id: "$RUN_ID"
date: "$(date -I)"
snapshot:
  main: "$(git rev-parse main)"
  phase2-ui: "$(git rev-parse phase2-ui)"
  phase4-economy: "$(git rev-parse phase4-economy)"
  phase5-discovery: "$(git rev-parse phase5-discovery)"
trios:
  code-review:
    prompt: "docs/internal/weaver/darkcat-review-instructions.md"
    input: "diffs/*.diff"
  methodology:
    prompt: "docs/internal/weaver/darkcat-prompt-triangulation-process.md"
    input: "self-contained"
  pipeline:
    prompt: "docs/internal/weaver/darkcat-prompt-numerical-pipeline.md"
    input: "self-contained"
EOF
```

**Output:** `data/alley/$RUN_ID/metadata.yaml`

---

### Phase 1: Dispatch All 9 Reviews (human, ~10 min)

All 9 reviews can be dispatched in parallel. No dependencies between them.

#### TRIO A: Code Review Alley

Each model gets: `darkcat-review-instructions.md` + all 3 diffs.

| Step | Model | Input | Output |
|------|-------|-------|--------|
| A1 | Claude | instructions + diffs | `data/alley/$RUN_ID/code-review/code-review-claude.md` |
| A2 | Gemini | instructions + diffs | `data/alley/$RUN_ID/code-review/code-review-gemini.md` |
| A3 | Codex 52 | instructions + diffs | `data/alley/$RUN_ID/code-review/code-review-codex52.md` |

**Dispatch (Claude polecat example):**
```bash
cat docs/internal/weaver/darkcat-review-instructions.md \
    data/alley/$RUN_ID/diffs/*.diff \
  | timeout 300 claude -p "Review the following code. The first section is your instructions. The remaining sections are diffs to review." \
    --dangerously-skip-permissions 2>&1 \
  | tee data/alley/$RUN_ID/code-review/code-review-claude.md
```

**For Gemini/Codex:** paste `darkcat-review-instructions.md` + diffs into the respective tool. Save output to the corresponding file path.

#### TRIO B: Methodology Adversarial

Each model gets: `darkcat-prompt-triangulation-process.md` (self-contained, no other input needed).

| Step | Model | Input | Output |
|------|-------|-------|--------|
| B1 | Claude | methodology prompt | `data/alley/$RUN_ID/methodology/methodology-claude.md` |
| B2 | Gemini | methodology prompt | `data/alley/$RUN_ID/methodology/methodology-gemini.md` |
| B3 | Codex 52 | methodology prompt | `data/alley/$RUN_ID/methodology/methodology-codex52.md` |

**Dispatch:** paste contents of `docs/internal/weaver/darkcat-prompt-triangulation-process.md` into each tool. Save output.

#### TRIO C: Pipeline Adversarial

Each model gets: `darkcat-prompt-numerical-pipeline.md` (self-contained, no other input needed).

| Step | Model | Input | Output |
|------|-------|-------|--------|
| C1 | Claude | pipeline prompt | `data/alley/$RUN_ID/pipeline/pipeline-claude.md` |
| C2 | Gemini | pipeline prompt | `data/alley/$RUN_ID/pipeline/pipeline-gemini.md` |
| C3 | Codex 52 | pipeline prompt | `data/alley/$RUN_ID/pipeline/pipeline-codex52.md` |

**Dispatch:** paste contents of `docs/internal/weaver/darkcat-prompt-numerical-pipeline.md` into each tool. Save output.

---

### Phase 2: Validate (human, ~3 min)

As reviews land, validate each has the required YAML block:

```bash
uv run bin/triangulate parse data/alley/$RUN_ID/code-review/code-review-claude.md
uv run bin/triangulate parse data/alley/$RUN_ID/code-review/code-review-gemini.md
uv run bin/triangulate parse data/alley/$RUN_ID/code-review/code-review-codex52.md

uv run bin/triangulate parse data/alley/$RUN_ID/methodology/methodology-claude.md
uv run bin/triangulate parse data/alley/$RUN_ID/methodology/methodology-gemini.md
uv run bin/triangulate parse data/alley/$RUN_ID/methodology/methodology-codex52.md

uv run bin/triangulate parse data/alley/$RUN_ID/pipeline/pipeline-claude.md
uv run bin/triangulate parse data/alley/$RUN_ID/pipeline/pipeline-gemini.md
uv run bin/triangulate parse data/alley/$RUN_ID/pipeline/pipeline-codex52.md
```

If any review is missing the YAML block: re-run with instructions, or accept as qualitative-only artefact and proceed with the other 2.

**Gate:** All 9 reviews present and validated, OR explicit decision to proceed with partial data.

---

### Phase 3: Aggregate Each Trio (agent or human, ~5 min)

Run `bin/triangulate export` for each trio. This produces the convergence matrix, metrics, and findings union.

#### Trio A aggregation:

```bash
uv run bin/triangulate export \
  data/alley/$RUN_ID/code-review/code-review-claude.md \
  data/alley/$RUN_ID/code-review/code-review-gemini.md \
  data/alley/$RUN_ID/code-review/code-review-codex52.md \
  --out data/alley/$RUN_ID/code-review \
  --run "${RUN_ID}-code-review"
```

**Output:**
- `data/alley/$RUN_ID/code-review/code-review-convergence.yaml` ← rename from `convergence.yaml`
- `data/alley/$RUN_ID/code-review/code-review-metrics.yaml` ← rename from `metrics.yaml`
- `data/alley/$RUN_ID/code-review/code-review-findings-union.yaml` ← rename from `findings-union.yaml`

*Note: `bin/triangulate export` writes `convergence.yaml`, `metrics.yaml`, `findings-union.yaml`. Rename after export to match naming convention, or accept the default names.*

#### Trio B aggregation:

```bash
uv run bin/triangulate export \
  data/alley/$RUN_ID/methodology/methodology-claude.md \
  data/alley/$RUN_ID/methodology/methodology-gemini.md \
  data/alley/$RUN_ID/methodology/methodology-codex52.md \
  --out data/alley/$RUN_ID/methodology \
  --run "${RUN_ID}-methodology"
```

#### Trio C aggregation:

```bash
uv run bin/triangulate export \
  data/alley/$RUN_ID/pipeline/pipeline-claude.md \
  data/alley/$RUN_ID/pipeline/pipeline-gemini.md \
  data/alley/$RUN_ID/pipeline/pipeline-codex52.md \
  --out data/alley/$RUN_ID/pipeline \
  --run "${RUN_ID}-pipeline"
```

---

### Phase 4: Synthesise (agent, ~15 min)

Human or agent reads the three aggregated metrics files and writes a cross-trio synthesis.

**Input:**
- `data/alley/$RUN_ID/code-review/metrics.yaml`
- `data/alley/$RUN_ID/methodology/metrics.yaml`
- `data/alley/$RUN_ID/pipeline/metrics.yaml`
- All 9 raw review files (for qualitative context)

**Output:** `data/alley/$RUN_ID/synthesis.md`

The synthesis answers:
1. What did the code review alley find? (confirmed issues to fix)
2. What did the methodology review find? (claims to retract, weaken, or defend)
3. What did the pipeline review find? (code fixes for bin/triangulate)
4. Cross-trio convergence: did the methodology reviewers flag issues that the pipeline reviewers also found? (e.g., both flag the matching algorithm)
5. Updated confidence in each of the 6 Data Products after adversarial scrutiny

---

### Phase 5: Act (human + agent)

Based on the synthesis:

| Finding type | Action |
|-------------|--------|
| Code review findings (Trio A) | Batch fix on phase branches → re-gate |
| Methodology findings (Trio B) | Update `darkcat-alley.md` claims, add caveats, adjust metrics |
| Pipeline findings (Trio C) | Fix `bin/triangulate` → re-run aggregation |

After fixes, the post-QA alley run follows the same sequencing with run ID `$RUN_ID-post`.

---

## Quick Reference: All 9 Output Files

| # | Trio | Model | Output Path |
|---|------|-------|-------------|
| A1 | Code Review | Claude | `data/alley/$RUN_ID/code-review/code-review-claude.md` |
| A2 | Code Review | Gemini | `data/alley/$RUN_ID/code-review/code-review-gemini.md` |
| A3 | Code Review | Codex 52 | `data/alley/$RUN_ID/code-review/code-review-codex52.md` |
| B1 | Methodology | Claude | `data/alley/$RUN_ID/methodology/methodology-claude.md` |
| B2 | Methodology | Gemini | `data/alley/$RUN_ID/methodology/methodology-gemini.md` |
| B3 | Methodology | Codex 52 | `data/alley/$RUN_ID/methodology/methodology-codex52.md` |
| C1 | Pipeline | Claude | `data/alley/$RUN_ID/pipeline/pipeline-claude.md` |
| C2 | Pipeline | Gemini | `data/alley/$RUN_ID/pipeline/pipeline-gemini.md` |
| C3 | Pipeline | Codex 52 | `data/alley/$RUN_ID/pipeline/pipeline-codex52.md` |

## Quick Reference: 3 Aggregation Outputs

| Trio | Metrics | Convergence | Union |
|------|---------|-------------|-------|
| A | `code-review/metrics.yaml` | `code-review/convergence.yaml` | `code-review/findings-union.yaml` |
| B | `methodology/metrics.yaml` | `methodology/convergence.yaml` | `methodology/findings-union.yaml` |
| C | `pipeline/metrics.yaml` | `pipeline/convergence.yaml` | `pipeline/findings-union.yaml` |

## Quick Reference: Prompts

| Trio | Prompt File | Self-Contained? |
|------|-------------|:-:|
| A | `docs/internal/weaver/darkcat-review-instructions.md` + diffs | No (needs diffs) |
| B | `docs/internal/weaver/darkcat-prompt-triangulation-process.md` | Yes |
| C | `docs/internal/weaver/darkcat-prompt-numerical-pipeline.md` | Yes |

---

## Time Estimate

| Phase | Who | Time |
|-------|-----|------|
| 0. Prepare | Human | 5 min |
| 1. Dispatch 9 reviews | Human | 10 min |
| 2. Validate (as they land) | Human | 3 min |
| 3. Aggregate 3 trios | Agent | 5 min |
| 4. Synthesise | Agent | 15 min |
| 5. Act on findings | Agent + Human | variable |
| **Total (through synthesis)** | | **~40 min** |

Model API wall-clock time for 9 reviews landing: ~10-30 min depending on model speed.
Total human attention: ~20 min of dispatch + spot-checks. The rest is agent time.
