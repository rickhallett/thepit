# Darkcat Prompt: Review the Numerical Pipeline

**Purpose:** Self-contained adversarial review of the Darkcat Alley numerical pipeline — the parser (`bin/triangulate`), the process definition, and the review instructions. This prompt contains everything the reviewer needs. No other files required.

**How to use:** Give this entire file as input to any code-review-capable model (Claude, Gemini, Codex, GPT, etc.). The reviewer does not need access to the repository.

---

## Your Task

You are reviewing a Python CLI tool and its supporting documentation. The tool parses structured YAML findings from cross-model code reviews, matches findings across reviews, and computes metrics for cross-model triangulation analysis. The output feeds visualisations for a portfolio.

This is infrastructure for measuring whether cross-model code review is worth its cost. The metrics must be correct. The matching algorithm must be defensible. The output must be suitable for quantitative analysis in Python notebooks and hex.tech.

**Review for:**

1. **Correctness** — Do the metrics compute what they claim? Are there off-by-one errors, division-by-zero risks, or edge cases that produce misleading numbers?
2. **Matching quality** — The tool matches findings across reviews using string similarity (SequenceMatcher). Is this approach defensible? What are the failure modes? Will it produce false matches or miss true matches?
3. **Data integrity** — Will the YAML output be parseable by downstream tools? Are there serialisation edge cases (special characters, multi-line strings, Unicode)?
4. **Statistical validity** — Are the metrics meaningful for the claimed purpose (cost justification, diminishing returns analysis)? Are there methodological concerns a statistician would flag?
5. **Missing metrics** — Given the stated goal (portfolio visualisations for cross-model verification cost-benefit), is anything important missing?
6. **Schema completeness** — The review instructions define a required output format. Is the parser robust to variations in that format? What happens with malformed input?

**You are not reviewing the code the tool reviews. You are reviewing the tool itself.**

---

## File 1: `bin/triangulate` (Python CLI — 752 lines)

```python
#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pyyaml>=6.0"]
# ///
"""
triangulate — Parse Darkcat Alley review files and compute triangulation metrics.

Reads structured YAML findings blocks from cross-model review files,
matches findings across reviews, computes convergence metrics, and
outputs both human-readable summaries and machine-readable YAML data.

Usage:
    triangulate summary <r1> <r2> <r3>                 # human-readable summary
    triangulate metrics <r1> <r2> <r3>                 # machine-readable YAML metrics
    triangulate convergence <r1> <r2> <r3>             # convergence matrix
    triangulate export <r1> <r2> <r3> --out <dir>      # export all data products
    triangulate parse <review_file>                    # parse + validate a single review

Arguments:
    <r1>, <r2>, <r3>   Paths to review markdown files containing YAML findings blocks
    --out <dir>        Output directory for export (default: data/alley/<run-id>)
    --run <id>         Run identifier (default: auto-generated from date)
    --match-threshold  Similarity threshold for matching findings (default: 0.6)

Backrefs: SD-318 (Darkcat Alley), SD-317 (QA sequencing), SD-309 (True North)
Process:  docs/internal/weaver/darkcat-alley.md
Instructions: docs/internal/weaver/darkcat-review-instructions.md
"""

import sys
import re
import json
from datetime import datetime, timezone
from pathlib import Path
from difflib import SequenceMatcher
from collections import Counter, defaultdict
from typing import Any

import yaml


# ── Constants ──────────────────────────────────────────────────

SEVERITY_ORDINAL = {"critical": 4, "high": 3, "medium": 2, "low": 1}
WATCHDOG_IDS = {"WD-SH", "WD-LRT", "WD-CB", "WD-DC", "WD-TDF", "WD-PG", "WD-PL", "none"}
VALID_SEVERITIES = {"critical", "high", "medium", "low"}


# ── YAML Extraction ────────────────────────────────────────────

def extract_yaml_block(text: str) -> dict | None:
    """Extract the structured YAML findings block from a markdown review file.

    Looks for a fenced YAML block containing a 'findings' key.
    Returns parsed YAML dict or None if not found.
    """
    # Match ```yaml ... ``` blocks
    pattern = r"```ya?ml\s*\n(.*?)```"
    matches = re.findall(pattern, text, re.DOTALL)

    for match in matches:
        try:
            parsed = yaml.safe_load(match)
            if isinstance(parsed, dict) and "findings" in parsed:
                return parsed
        except yaml.YAMLError:
            continue

    return None


def parse_review_file(filepath: str) -> dict:
    """Parse a review file and extract structured findings.

    Returns dict with 'review' metadata and 'findings' list.
    Raises ValueError if no valid YAML block found.
    """
    path = Path(filepath)
    if not path.exists():
        raise FileNotFoundError(f"Review file not found: {filepath}")

    text = path.read_text(encoding="utf-8")
    data = extract_yaml_block(text)

    if data is None:
        raise ValueError(
            f"No structured YAML findings block found in {filepath}. "
            f"Review must contain a fenced ```yaml block with a 'findings' key. "
            f"See docs/internal/weaver/darkcat-review-instructions.md"
        )

    return data


def validate_finding(finding: dict, source: str) -> list[str]:
    """Validate a single finding against the schema. Returns list of warnings."""
    warnings = []
    required = {"id", "branch", "file", "line", "severity", "watchdog", "slopodar", "title", "description", "recommendation"}
    missing = required - set(finding.keys())
    if missing:
        warnings.append(f"{source}/{finding.get('id', '?')}: missing fields: {missing}")

    sev = finding.get("severity", "")
    if sev not in VALID_SEVERITIES:
        warnings.append(f"{source}/{finding.get('id', '?')}: invalid severity '{sev}' — must be one of {VALID_SEVERITIES}")

    wd = finding.get("watchdog", "")
    if wd not in WATCHDOG_IDS:
        warnings.append(f"{source}/{finding.get('id', '?')}: unknown watchdog category '{wd}' — expected one of {WATCHDOG_IDS}")

    return warnings


def validate_review(data: dict, source: str) -> list[str]:
    """Validate an entire review's structure. Returns list of warnings."""
    warnings = []

    if "review" not in data:
        warnings.append(f"{source}: missing 'review' metadata block")
    else:
        review = data["review"]
        for field in ["model", "date", "branches"]:
            if field not in review:
                warnings.append(f"{source}: review metadata missing '{field}'")

    findings = data.get("findings", [])
    if not findings:
        warnings.append(f"{source}: no findings in structured block")

    for f in findings:
        warnings.extend(validate_finding(f, source))

    return warnings


# ── Finding Matching ───────────────────────────────────────────

def similarity(a: str, b: str) -> float:
    """Compute string similarity ratio between two strings."""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def match_key(finding: dict) -> str:
    """Generate a matching key from file + title for deduplication."""
    return f"{finding.get('file', '')}::{finding.get('title', '')}"


def match_findings(
    reviews: dict[str, list[dict]],
    threshold: float = 0.6,
) -> list[dict]:
    """Match findings across reviews by file + title similarity.

    Returns a list of matched finding groups, each containing:
    - matched_findings: dict mapping review_id -> finding
    - convergence: list of review IDs that found this
    - canonical_title: representative title
    - canonical_file: representative file
    - canonical_severity: highest severity across reviews
    """
    # Collect all findings with their source
    all_findings: list[tuple[str, dict]] = []
    for review_id, findings in reviews.items():
        for f in findings:
            all_findings.append((review_id, f))

    # Greedy matching: for each finding, check if it matches an existing group
    groups: list[dict] = []
    used: set[int] = set()

    for i, (rid_i, f_i) in enumerate(all_findings):
        if i in used:
            continue

        group = {
            "matched_findings": {rid_i: f_i},
            "convergence": [rid_i],
        }
        used.add(i)

        for j, (rid_j, f_j) in enumerate(all_findings):
            if j in used or rid_j == rid_i:
                continue
            # Already have a finding from this review in the group
            if rid_j in group["matched_findings"]:
                continue

            # Match by file + title similarity
            file_sim = similarity(f_i.get("file", ""), f_j.get("file", ""))
            title_sim = similarity(f_i.get("title", ""), f_j.get("title", ""))
            combined = 0.3 * file_sim + 0.7 * title_sim

            if combined >= threshold:
                group["matched_findings"][rid_j] = f_j
                group["convergence"].append(rid_j)
                used.add(j)

        # Set canonical values
        first_finding = f_i
        group["canonical_title"] = first_finding.get("title", "unknown")
        group["canonical_file"] = first_finding.get("file", "unknown")

        # Canonical severity = highest across all matched findings
        severities = [
            SEVERITY_ORDINAL.get(f.get("severity", "low"), 1)
            for f in group["matched_findings"].values()
        ]
        max_sev_ord = max(severities) if severities else 1
        rev_ordinal = {v: k for k, v in SEVERITY_ORDINAL.items()}
        group["canonical_severity"] = rev_ordinal.get(max_sev_ord, "low")

        groups.append(group)

    return groups


# ── Metrics Computation ────────────────────────────────────────

def compute_metrics(
    groups: list[dict],
    review_ids: list[str],
    reviews_data: dict[str, dict],
) -> dict:
    """Compute all Darkcat Alley metrics from matched finding groups."""

    total = len(groups)

    # Metric 1: Finding count by model
    finding_count = {}
    for rid in review_ids:
        model_name = reviews_data[rid].get("review", {}).get("model", rid)
        t = sum(1 for g in groups if rid in g["convergence"])
        u = sum(1 for g in groups if g["convergence"] == [rid])
        s2 = sum(1 for g in groups if rid in g["convergence"] and len(g["convergence"]) == 2)
        s3 = sum(1 for g in groups if rid in g["convergence"] and len(g["convergence"]) == 3)
        finding_count[rid] = {
            "model": model_name,
            "total": t,
            "unique": u,
            "shared_2": s2,
            "shared_3": s3,
        }

    # Metric 2: Convergence rate
    converged_3 = sum(1 for g in groups if len(g["convergence"]) == 3)
    converged_2 = sum(1 for g in groups if len(g["convergence"]) == 2)
    single_model = sum(1 for g in groups if len(g["convergence"]) == 1)
    convergence_rate = {
        "total_unique_findings": total,
        "converged_3": converged_3,
        "converged_2": converged_2,
        "single_model": single_model,
        "rate_3": round(converged_3 / total, 4) if total else 0,
        "rate_2plus": round((converged_3 + converged_2) / total, 4) if total else 0,
        "rate_single": round(single_model / total, 4) if total else 0,
    }

    # Metric 3: Marginal value (in order R1, R2, R3)
    seen: set[int] = set()
    marginal = []
    for rid in review_ids:
        new_unique = 0
        for idx, g in enumerate(groups):
            if rid in g["convergence"] and idx not in seen:
                new_unique += 1
                seen.add(idx)
        marginal.append({
            "model": reviews_data[rid].get("review", {}).get("model", rid),
            "review_id": rid,
            "cumulative_unique": len(seen),
            "new_unique": new_unique,
        })
    marginal_value = {"order": review_ids, "cumulative": marginal}

    # Metric 4: Severity distribution by model
    severity_dist = {}
    for rid in review_ids:
        model_name = reviews_data[rid].get("review", {}).get("model", rid)
        counts = Counter()
        for g in groups:
            if rid in g["convergence"]:
                f = g["matched_findings"].get(rid)
                if f:
                    counts[f.get("severity", "low")] += 1
        severity_dist[rid] = {
            "model": model_name,
            **{s: counts.get(s, 0) for s in VALID_SEVERITIES},
        }

    # Metric 5: Watchdog category distribution
    watchdog_dist = {}
    for rid in review_ids:
        model_name = reviews_data[rid].get("review", {}).get("model", rid)
        counts = Counter()
        for g in groups:
            if rid in g["convergence"]:
                f = g["matched_findings"].get(rid)
                if f:
                    wd = f.get("watchdog", "none")
                    if wd != "none":
                        counts[wd] += 1
        watchdog_dist[rid] = {"model": model_name, "categories": dict(counts)}

    # Metric 6: Severity calibration (converged findings only)
    severity_calibration = []
    for g in groups:
        if len(g["convergence"]) >= 2:
            entry = {"finding": g["canonical_title"]}
            severities_seen = {}
            for rid in g["convergence"]:
                f = g["matched_findings"].get(rid)
                if f:
                    model_name = reviews_data[rid].get("review", {}).get("model", rid)
                    sev = f.get("severity", "low")
                    severities_seen[model_name] = sev
                    entry[f"severity_{rid}"] = sev
            ordinals = [SEVERITY_ORDINAL.get(s, 1) for s in severities_seen.values()]
            entry["agreement"] = len(set(ordinals)) == 1
            entry["max_delta"] = max(ordinals) - min(ordinals) if ordinals else 0
            severity_calibration.append(entry)

    # Metric 8: False positive rate (placeholder — requires human input)
    fp_rate = {}
    for rid in review_ids:
        model_name = reviews_data[rid].get("review", {}).get("model", rid)
        t = sum(1 for g in groups if rid in g["convergence"])
        fp_rate[rid] = {
            "model": model_name,
            "total_findings": t,
            "confirmed_true": t,  # Default: all true until marked otherwise
            "confirmed_false": 0,
            "disputed": 0,
            "fp_rate": 0.0,
        }

    return {
        "computed_at": datetime.now(timezone.utc).isoformat(),
        "finding_count": finding_count,
        "convergence_rate": convergence_rate,
        "marginal_value": marginal_value,
        "severity_distribution": severity_dist,
        "watchdog_distribution": watchdog_dist,
        "severity_calibration": severity_calibration,
        "false_positive_rate": fp_rate,
    }


# ── Output Formatters ──────────────────────────────────────────

def format_summary(groups: list[dict], metrics: dict, review_ids: list[str], reviews_data: dict) -> str:
    """Format a human-readable summary of the triangulation."""
    lines = []
    lines.append("=" * 72)
    lines.append("  DARKCAT ALLEY — TRIANGULATION SUMMARY")
    lines.append("=" * 72)
    lines.append("")

    # Models
    lines.append("REVIEWS:")
    for rid in review_ids:
        model = reviews_data[rid].get("review", {}).get("model", rid)
        n = metrics["finding_count"][rid]["total"]
        u = metrics["finding_count"][rid]["unique"]
        lines.append(f"  {rid}: {model} — {n} findings ({u} unique)")
    lines.append("")

    # Convergence
    cr = metrics["convergence_rate"]
    lines.append("CONVERGENCE:")
    lines.append(f"  Total unique findings: {cr['total_unique_findings']}")
    lines.append(f"  All 3 models:          {cr['converged_3']} ({cr['rate_3']:.1%})")
    lines.append(f"  2 of 3 models:         {cr['converged_2']} ({cr['rate_2plus'] - cr['rate_3']:.1%})")
    lines.append(f"  Single model only:     {cr['single_model']} ({cr['rate_single']:.1%})")
    lines.append("")

    # Marginal value
    lines.append("MARGINAL VALUE (in dispatch order):")
    for m in metrics["marginal_value"]["cumulative"]:
        lines.append(f"  {m['model']:20s}  +{m['new_unique']:2d} new  ({m['cumulative_unique']:2d} cumulative)")
    lines.append("")

    # Converged findings (highest priority)
    converged = [g for g in groups if len(g["convergence"]) >= 2]
    if converged:
        lines.append("CONVERGED FINDINGS (2+ models agree):")
        for g in sorted(converged, key=lambda x: -len(x["convergence"])):
            conv = ",".join(g["convergence"])
            lines.append(f"  [{g['canonical_severity'].upper():8s}] {g['canonical_title']}")
            lines.append(f"           → {g['canonical_file']}  [{conv}]")
        lines.append("")

    # Single-model findings
    singles = [g for g in groups if len(g["convergence"]) == 1]
    if singles:
        lines.append("SINGLE-MODEL FINDINGS (unique to one reviewer):")
        for rid in review_ids:
            model = reviews_data[rid].get("review", {}).get("model", rid)
            rid_singles = [g for g in singles if g["convergence"] == [rid]]
            if rid_singles:
                lines.append(f"  {model}:")
                for g in rid_singles:
                    lines.append(f"    [{g['canonical_severity'].upper():8s}] {g['canonical_title']}")
        lines.append("")

    # Watchdog distribution
    lines.append("WATCHDOG CATEGORY COVERAGE:")
    all_cats = set()
    for rid in review_ids:
        all_cats.update(metrics["watchdog_distribution"][rid]["categories"].keys())
    if all_cats:
        header = f"  {'Category':8s}"
        for rid in review_ids:
            model = reviews_data[rid].get("review", {}).get("model", rid)[:12]
            header += f"  {model:>12s}"
        lines.append(header)
        for cat in sorted(all_cats):
            row = f"  {cat:8s}"
            for rid in review_ids:
                count = metrics["watchdog_distribution"][rid]["categories"].get(cat, 0)
                row += f"  {count:>12d}"
            lines.append(row)
    lines.append("")

    # Severity calibration
    if metrics["severity_calibration"]:
        lines.append("SEVERITY CALIBRATION (converged findings):")
        agree = sum(1 for s in metrics["severity_calibration"] if s["agreement"])
        total_conv = len(metrics["severity_calibration"])
        lines.append(f"  Agreement: {agree}/{total_conv} ({agree/total_conv:.0%})")
        disagreements = [s for s in metrics["severity_calibration"] if not s["agreement"]]
        if disagreements:
            lines.append("  Disagreements:")
            for d in disagreements:
                sevs = {k: v for k, v in d.items() if k.startswith("severity_")}
                lines.append(f"    {d['finding'][:60]}")
                lines.append(f"      {sevs}  (delta: {d['max_delta']})")
    lines.append("")

    lines.append("=" * 72)
    lines.append(f"  Computed: {metrics['computed_at']}")
    lines.append("=" * 72)

    return "\n".join(lines)


def format_convergence_matrix(groups: list[dict], review_ids: list[str], reviews_data: dict) -> str:
    """Format a markdown convergence matrix."""
    lines = []
    lines.append("# Convergence Matrix")
    lines.append("")

    # Header
    header = "| Finding | Severity "
    for rid in review_ids:
        model = reviews_data[rid].get("review", {}).get("model", rid)[:10]
        header += f"| {model} "
    header += "| Converge |"
    lines.append(header)

    sep = "|---------|----------"
    for _ in review_ids:
        sep += "|:---:"
    sep += "|----------|"
    lines.append(sep)

    for g in sorted(groups, key=lambda x: (-len(x["convergence"]), -SEVERITY_ORDINAL.get(x["canonical_severity"], 0))):
        row = f"| {g['canonical_title'][:50]} | {g['canonical_severity'].upper()} "
        for rid in review_ids:
            if rid in g["convergence"]:
                row += "| YES "
            else:
                row += "| — "
        conv_count = len(g["convergence"])
        if conv_count == 3:
            row += "| **ALL 3** |"
        elif conv_count == 2:
            row += f"| {'+'.join(g['convergence'])} |"
        else:
            row += f"| {g['convergence'][0]} only |"
        lines.append(row)

    return "\n".join(lines)


# ── Export ─────────────────────────────────────────────────────

def export_all(
    groups: list[dict],
    metrics: dict,
    review_ids: list[str],
    reviews_data: dict[str, dict],
    out_dir: Path,
    run_id: str,
) -> None:
    """Export all data products to the output directory."""
    out_dir.mkdir(parents=True, exist_ok=True)

    # Metadata
    metadata = {
        "run_id": run_id,
        "computed_at": metrics["computed_at"],
        "reviews": {},
    }
    for rid in review_ids:
        rd = reviews_data[rid].get("review", {})
        metadata["reviews"][rid] = {
            "model": rd.get("model", "unknown"),
            "date": rd.get("date", "unknown"),
            "branches": rd.get("branches", []),
            "finding_count": len(reviews_data[rid].get("findings", [])),
        }
    write_yaml(out_dir / "metadata.yaml", metadata)

    # Per-review parsed findings
    for rid in review_ids:
        write_yaml(out_dir / f"{rid}.yaml", reviews_data[rid])

    # Convergence matrix
    convergence = []
    for g in groups:
        convergence.append({
            "title": g["canonical_title"],
            "file": g["canonical_file"],
            "severity": g["canonical_severity"],
            "convergence": g["convergence"],
            "convergence_count": len(g["convergence"]),
        })
    write_yaml(out_dir / "convergence.yaml", convergence)

    # All metrics
    write_yaml(out_dir / "metrics.yaml", metrics)

    # Union of findings (deduplicated)
    union = []
    for g in groups:
        entry = {
            "title": g["canonical_title"],
            "file": g["canonical_file"],
            "severity": g["canonical_severity"],
            "found_by": g["convergence"],
            "convergence_count": len(g["convergence"]),
            "details": {},
        }
        for rid, f in g["matched_findings"].items():
            entry["details"][rid] = {
                "id": f.get("id"),
                "severity": f.get("severity"),
                "watchdog": f.get("watchdog"),
                "slopodar": f.get("slopodar"),
                "description": f.get("description"),
            }
        union.append(entry)
    write_yaml(out_dir / "findings-union.yaml", union)

    print(f"Exported to {out_dir}/")
    print(f"  metadata.yaml       — run metadata")
    for rid in review_ids:
        print(f"  {rid}.yaml{' ' * (20 - len(rid))}— parsed findings")
    print(f"  convergence.yaml    — convergence matrix")
    print(f"  metrics.yaml        — all computed metrics")
    print(f"  findings-union.yaml — deduplicated union")


def write_yaml(path: Path, data: Any) -> None:
    """Write data to a YAML file."""
    with open(path, "w", encoding="utf-8") as f:
        yaml.dump(data, f, default_flow_style=False, sort_keys=False, allow_unicode=True, width=120)


# ── CLI ────────────────────────────────────────────────────────

def usage() -> None:
    """Print usage and exit."""
    print(__doc__)
    sys.exit(1)


def cmd_parse(args: list[str]) -> None:
    """Parse and validate a single review file."""
    if len(args) < 1:
        print("Usage: triangulate parse <review_file>")
        sys.exit(1)

    filepath = args[0]
    try:
        data = parse_review_file(filepath)
    except (FileNotFoundError, ValueError) as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)

    warnings = validate_review(data, filepath)
    if warnings:
        print("WARNINGS:")
        for w in warnings:
            print(f"  ⚠ {w}")
        print()

    findings = data.get("findings", [])
    model = data.get("review", {}).get("model", "unknown")
    print(f"Model: {model}")
    print(f"Findings: {len(findings)}")
    for f in findings:
        sev = f.get("severity", "?").upper()
        title = f.get("title", "untitled")
        print(f"  [{sev:8s}] {title}")


def load_reviews(r1_path: str, r2_path: str, r3_path: str) -> tuple[list[str], dict, dict]:
    """Load and validate 3 review files. Returns (review_ids, reviews_data, raw_findings)."""
    review_ids = ["R1", "R2", "R3"]
    paths = {"R1": r1_path, "R2": r2_path, "R3": r3_path}
    reviews_data: dict[str, dict] = {}
    all_warnings: list[str] = []

    for rid, path in paths.items():
        try:
            data = parse_review_file(path)
            reviews_data[rid] = data
            all_warnings.extend(validate_review(data, f"{rid}:{path}"))
        except (FileNotFoundError, ValueError) as e:
            print(f"ERROR loading {rid}: {e}", file=sys.stderr)
            sys.exit(1)

    if all_warnings:
        print("VALIDATION WARNINGS:", file=sys.stderr)
        for w in all_warnings:
            print(f"  ⚠ {w}", file=sys.stderr)
        print(file=sys.stderr)

    reviews = {rid: data.get("findings", []) for rid, data in reviews_data.items()}
    return review_ids, reviews_data, reviews


def cmd_summary(args: list[str]) -> None:
    """Print human-readable summary."""
    if len(args) < 3:
        print("Usage: triangulate summary <r1> <r2> <r3>")
        sys.exit(1)

    threshold = 0.6
    for i, a in enumerate(args):
        if a == "--match-threshold" and i + 1 < len(args):
            threshold = float(args[i + 1])

    review_ids, reviews_data, reviews = load_reviews(args[0], args[1], args[2])
    groups = match_findings(reviews, threshold)
    metrics = compute_metrics(groups, review_ids, reviews_data)
    print(format_summary(groups, metrics, review_ids, reviews_data))


def cmd_metrics(args: list[str]) -> None:
    """Output machine-readable YAML metrics."""
    if len(args) < 3:
        print("Usage: triangulate metrics <r1> <r2> <r3>")
        sys.exit(1)

    threshold = 0.6
    for i, a in enumerate(args):
        if a == "--match-threshold" and i + 1 < len(args):
            threshold = float(args[i + 1])

    review_ids, reviews_data, reviews = load_reviews(args[0], args[1], args[2])
    groups = match_findings(reviews, threshold)
    metrics = compute_metrics(groups, review_ids, reviews_data)
    yaml.dump(metrics, sys.stdout, default_flow_style=False, sort_keys=False, allow_unicode=True, width=120)


def cmd_convergence(args: list[str]) -> None:
    """Output convergence matrix in markdown."""
    if len(args) < 3:
        print("Usage: triangulate convergence <r1> <r2> <r3>")
        sys.exit(1)

    threshold = 0.6
    for i, a in enumerate(args):
        if a == "--match-threshold" and i + 1 < len(args):
            threshold = float(args[i + 1])

    review_ids, reviews_data, reviews = load_reviews(args[0], args[1], args[2])
    groups = match_findings(reviews, threshold)
    print(format_convergence_matrix(groups, review_ids, reviews_data))


def cmd_export(args: list[str]) -> None:
    """Export all data products."""
    if len(args) < 3:
        print("Usage: triangulate export <r1> <r2> <r3> [--out <dir>] [--run <id>]")
        sys.exit(1)

    out_dir = None
    run_id = datetime.now(timezone.utc).strftime("run-%Y%m%d-%H%M%S")
    threshold = 0.6

    # Parse optional args after the 3 review files
    i = 3
    while i < len(args):
        if args[i] == "--out" and i + 1 < len(args):
            out_dir = Path(args[i + 1])
            i += 2
        elif args[i] == "--run" and i + 1 < len(args):
            run_id = args[i + 1]
            i += 2
        elif args[i] == "--match-threshold" and i + 1 < len(args):
            threshold = float(args[i + 1])
            i += 2
        else:
            i += 1

    if out_dir is None:
        out_dir = Path("data/alley") / run_id

    review_ids, reviews_data, reviews = load_reviews(args[0], args[1], args[2])
    groups = match_findings(reviews, threshold)
    metrics = compute_metrics(groups, review_ids, reviews_data)
    export_all(groups, metrics, review_ids, reviews_data, out_dir, run_id)

    # Also print summary to stdout
    print()
    print(format_summary(groups, metrics, review_ids, reviews_data))


def main() -> None:
    """CLI entrypoint."""
    args = sys.argv[1:]

    if not args:
        usage()

    cmd = args[0]
    rest = args[1:]

    commands = {
        "summary": cmd_summary,
        "metrics": cmd_metrics,
        "convergence": cmd_convergence,
        "export": cmd_export,
        "parse": cmd_parse,
    }

    if cmd in commands:
        commands[cmd](rest)
    elif cmd in ("-h", "--help", "help"):
        usage()
    else:
        print(f"Unknown command: {cmd}", file=sys.stderr)
        usage()


if __name__ == "__main__":
    main()
```

---

## File 2: Metric Specifications (from `docs/internal/weaver/darkcat-alley.md`)

The tool claims to compute 8 metrics. Here are the specifications:

| # | Metric | Key Question | Visualisation |
|---|--------|-------------|---------------|
| 1 | Finding count by model | Which model finds the most? Most unique? | Grouped bar chart |
| 2 | Convergence rate | What fraction of findings found by 2+ models? | Stacked bar / pie |
| 3 | Marginal value per review | When does adding another model stop being worth it? | Line chart (slope = value) |
| 4 | Severity distribution by model | Do models calibrate severity differently? | Heatmap |
| 5 | Watchdog category distribution | Do models have characteristic blind spots? | Radar chart |
| 6 | Severity calibration | Do converged findings get the same severity? | Scatter / table |
| 7 | Pre-QA vs Post-QA delta | How effective is the fix batch? | Sankey diagram |
| 8 | False positive rate | Can you trust a model's findings? | Bar chart (precision) |

**Note:** Metric 7 (delta) is not yet implemented in the parser — it requires comparing two runs. The process definition describes it but the code does not compute it. Metric 8 (FP rate) is a placeholder that defaults all findings to "confirmed true" pending human verification.

---

## File 3: Review Instructions Schema (from `docs/internal/weaver/darkcat-review-instructions.md`)

The structured YAML block each reviewer must produce:

```yaml
review:
  model: "<model name/version>"
  date: "<YYYY-MM-DD>"
  branches:
    - "branch-name"
  base_commit: "<sha or 'unknown'>"

findings:
  - id: F-001
    branch: "branch-name"
    file: "path/to/file.ts"
    line: "42-58"           # range, single number, or "n/a"
    severity: critical      # critical | high | medium | low
    watchdog: WD-PL         # taxonomy ID or "none"
    slopodar: phantom-ledger  # pattern name or "none"
    title: "Short description (max 120 chars)"
    description: >
      Multi-line description of the finding.
    recommendation: "What to do about it"
```

---

## Required Output Format

Produce your review in two sections:

### Section 1: Narrative Report

Free-form analysis. Focus on the 6 review areas listed in "Your Task" above. Be specific — cite function names, line numbers, and concrete failure scenarios.

### Section 2: Structured Findings

A fenced YAML block following the schema below. One entry per finding.

```yaml
review:
  model: "<your model name/version>"
  date: "<YYYY-MM-DD>"
  branches:
    - "numerical-pipeline"
  base_commit: "unknown"

findings:
  - id: F-001
    branch: "numerical-pipeline"
    file: "bin/triangulate"
    line: "<line range>"
    severity: critical      # critical | high | medium | low
    watchdog: WD-PL         # WD-SH | WD-LRT | WD-CB | WD-DC | WD-TDF | WD-PG | WD-PL | none
    slopodar: none          # right-answer-wrong-work | phantom-ledger | shadow-validation | paper-guardrail | stale-reference-propagation | loom-speed | none
    title: "Short finding title"
    description: >
      Detailed description.
    recommendation: "What to fix"
```

Do not praise code that works. Every line of praise displaces a finding.
