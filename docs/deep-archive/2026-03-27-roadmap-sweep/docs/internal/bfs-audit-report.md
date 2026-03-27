# BFS Audit Report: d-level Ratios and d2 Bulk Candidates

**Date:** 2026-03-12
**Auditor:** polecat/furiosa
**Bead:** PIT-4em

## Summary

Filesystem depth analysis of thepit repository. Evaluates compliance with BFS rule (SD-195):
- d1 = every session
- d2 = when topic is relevant
- d3+ = deliberate research only

## Depth Ratio Analysis

### Raw Measurements

| Depth | Size (bytes) | Size (human) | % of Total | File Count |
|-------|-------------|--------------|------------|------------|
| d1    | 609,961     | 610 KB       | 3.1%       | 34         |
| d2    | 2,868,527   | 2.9 MB       | 14.6%      | 349        |
| d3    | 10,672,246  | 10.7 MB      | 54.3%      | 537        |
| d4    | 5,515,935   | 5.5 MB       | 28.0%      | 343        |
| d5+   | -           | -            | -          | 896        |
| **Total** | 19,666,669 | 19.7 MB   | 100%       | 2,159      |

### Ratio

**d1:d2:d3:d4 = 1 : 4.7 : 17.5 : 9.0**

### Assessment

The distribution is healthy:
- d1 (3.1%) contains boot files, config, and the primary navigation layer
- d2 (14.6%) contains topic-relevant content (code directories, docs subdirs)
- d3+ (82.3%) contains the bulk of research and archival material

This aligns with the BFS rule intent: most content requires deliberate navigation.

## d1 Analysis (610 KB)

Largest d1 files:
| File | Size | Assessment |
|------|------|------------|
| pnpm-lock.yaml | 352 KB | Necessary (lockfile) |
| slopodar-ext-v0.2-archive.tar.gz | 60 KB | Archive - appropriate |
| AGENTS.md | 48 KB | Core boot doc - appropriate |
| slopodar.yaml | 36 KB | Standing order - appropriate |
| justfile | 24 KB | Build orchestration - appropriate |

**Finding:** d1 is clean. No relocation candidates.

## d2 Bulk Candidates

### 1. notebooks/ (516 KB at d2)

**Contents:**
- uv.lock (190 KB) - Python dependency lock
- slopodar-calibration.ipynb (57 KB) - Jupyter notebook
- dagger-* files (research artifacts)
- cross-model-replication-* files
- target-pages/ subdirectory (80 KB)

**Assessment:** This is research data. Per BFS rule, research belongs at d3+.

**Recommendation:** RELOCATE to `docs/internal/research/notebooks/` or similar d3+ location.

**Rationale:**
- Notebooks contain adversarial analysis data (dagger-1, dagger-2 series)
- Cross-model replication protocols and results
- Calibration data that is not needed for routine sessions
- uv.lock could be regenerated but is small overhead

**Impact:** 516 KB reduction at d2.

### 2. evidence/ (88 KB at d2)

**Contents:**
- final-state.png (20 KB)
- snap_1773088757584.png (17 KB)
- snap_1773088759319.png (28 KB)
- snap_1773088760387.png (20 KB)

**Assessment:** Screenshots are evidence artifacts. Evidence is research documentation.

**Recommendation:** RELOCATE to `docs/internal/evidence/` or `docs/archive/evidence/`.

**Rationale:**
- Screenshots are point-in-time captures
- Not needed for routine development sessions
- Referenced by research/audit tasks only

**Impact:** 88 KB reduction at d2.

### 3. scripts/*.md (16 KB at d2)

**Contents:**
- darkcat.md (8 KB) - Adversarial review protocol
- darkcat-synth.md (4 KB) - Synthesis protocol
- README.md (4 KB) - Scripts documentation

**Assessment:** Mixed. These are operational docs for scripts/.

**Recommendation:** KEEP at d2 (borderline).

**Rationale:**
- darkcat.md and darkcat-synth.md are actively used by the verification pipeline
- Moving to d3+ would break workflow reference patterns
- Size is minimal (16 KB)

**Alternative:** Could move to `docs/internal/verification/` for consistency, but low ROI.

### 4. Other Large d2 Files

| File | Size | Assessment |
|------|------|------------|
| app/favicon.ico | 122 KB | KEEP - required for app |
| scripts/enhance-presets.ts | 90 KB | KEEP - active code |
| lib/bout-engine.ts | 42 KB | KEEP - core logic |
| pitctl/QA_BATTLE_PLAN.md | 39 KB | RELOCATE candidate |
| bin/slopodar-sweep | 38 KB | KEEP - tool binary |
| docs/research-citations.md | 37 KB | RELOCATE candidate |

**pitctl/QA_BATTLE_PLAN.md:** QA documentation could move to docs/internal/qa/.
**docs/research-citations.md:** Research doc could move to docs/internal/research/.

## Recommendations Summary

### High Priority (>100 KB reduction)

| Source | Destination | Size Impact |
|--------|-------------|-------------|
| notebooks/ | docs/internal/research/notebooks/ | -516 KB |

### Medium Priority (>50 KB reduction)

| Source | Destination | Size Impact |
|--------|-------------|-------------|
| evidence/ | docs/internal/evidence/ | -88 KB |

### Low Priority (<50 KB, optional)

| Source | Destination | Size Impact |
|--------|-------------|-------------|
| pitctl/QA_BATTLE_PLAN.md | docs/internal/qa/ | -39 KB |
| docs/research-citations.md | docs/internal/research/ | -37 KB |

### Keep at d2 (Appropriate Location)

- scripts/*.md (operational reference)
- app/favicon.ico (required asset)
- All TypeScript/Go source files in their respective directories

## Implementation Notes

If relocations are approved:

1. **notebooks/ relocation:**
   ```bash
   mkdir -p docs/internal/research/notebooks
   mv notebooks/* docs/internal/research/notebooks/
   rmdir notebooks
   # OR keep as symlink: ln -s docs/internal/research/notebooks notebooks
   ```

2. **evidence/ relocation:**
   ```bash
   mkdir -p docs/internal/evidence
   mv evidence/* docs/internal/evidence/
   rmdir evidence
   ```

3. **Update any references** in AGENTS.md or other docs that point to moved files.

## Verification

After relocation, recalculate ratios:
```bash
# Expected new d2 size: ~2.3 MB (vs current 2.9 MB)
# Expected new ratio: 1:3.7:17.5:9.0
```

## Conclusion

The repository's depth distribution is healthy overall. Two clear relocation candidates exist:
1. **notebooks/** - 516 KB research data at d2, should be d3+
2. **evidence/** - 88 KB screenshots at d2, should be d3+

Combined potential reduction: 604 KB at d2 (21% of current d2 size).

The BFS rule is largely respected. These relocations would improve compliance without disrupting active workflows.
