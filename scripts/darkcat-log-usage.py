# /// script
# requires-python = ">=3.10"
# ///
"""
Append darkcat usage data from Claude CLI JSON output to the tracking TSV.

Usage:
    uv run scripts/darkcat-log-usage.py <json_file> --model <model> --tree <tree> [--pr <pr>]

The JSON file is the output of `claude -p ... --output-format json`.
Extracts token counts, cost, duration, findings count, and verdict.
"""

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone


def get_repo_root() -> str:
    """Resolve the git repo root so the TSV lands in the right place regardless of worktree."""
    try:
        # In a worktree, 'git rev-parse --path-format=absolute --git-common-dir'
        # points to the main repo's .git, which is one level up from the root.
        common = subprocess.check_output(
            ["git", "rev-parse", "--path-format=absolute", "--git-common-dir"],
            text=True,
        ).strip()
        # common is /path/to/repo/.git - parent is the repo root
        return os.path.dirname(common)
    except (subprocess.CalledProcessError, FileNotFoundError):
        return os.getcwd()


def extract_findings_verdict(text: str) -> tuple[str, str]:
    """Extract findings count and verdict from review text."""
    findings = ""
    verdict = ""

    findings_match = re.search(r"Findings:\s*(\d+)", text)
    if findings_match:
        findings = findings_match.group(1)

    verdict_match = re.search(r"Verdict:\s*(.+?)(?:\n|$)", text)
    if verdict_match:
        verdict = verdict_match.group(1).strip()

    return findings, verdict


def main() -> None:
    parser = argparse.ArgumentParser(description="Log darkcat usage to TSV")
    parser.add_argument("json_file", help="Path to Claude CLI JSON output")
    parser.add_argument(
        "--model", required=True, help="Model name (claude, openai, gemini)"
    )
    parser.add_argument("--tree", required=True, help="Git tree hash")
    parser.add_argument("--pr", default="", help="PR number (optional)")
    parser.add_argument(
        "--tsv",
        default=None,
        help="TSV output path (default: <repo-root>/data/darkcat-usage.tsv)",
    )
    args = parser.parse_args()

    # Resolve TSV path relative to repo root, not cwd (worktree-safe)
    if args.tsv is None:
        args.tsv = os.path.join(get_repo_root(), "data", "darkcat-usage.tsv")

    with open(args.json_file) as f:
        data = json.load(f)

    usage = data.get("usage", {})
    result_text = data.get("result", "")
    findings, verdict = extract_findings_verdict(result_text)

    now = datetime.now(timezone.utc)
    row = "\t".join(
        [
            now.strftime("%Y-%m-%d"),
            now.strftime("%H:%M:%S"),
            args.tree,
            args.model,
            args.pr,
            str(usage.get("input_tokens", 0)),
            str(usage.get("cache_creation_input_tokens", 0)),
            str(usage.get("cache_read_input_tokens", 0)),
            str(usage.get("output_tokens", 0)),
            f"{data.get('total_cost_usd', 0):.6f}",
            str(data.get("duration_ms", 0)),
            findings,
            verdict,
        ]
    )

    tsv_path = args.tsv
    # Create with header if missing
    if not os.path.exists(tsv_path):
        with open(tsv_path, "w") as f:
            f.write(
                "date\ttime\ttree\tmodel\tpr\tinput_tokens\tcache_creation_tokens\tcache_read_tokens\toutput_tokens\ttotal_cost_usd\tduration_ms\tfindings\tverdict\n"
            )

    with open(tsv_path, "a") as f:
        f.write(row + "\n")

    # Print summary to stdout
    cost = data.get("total_cost_usd", 0)
    total_tokens = (
        usage.get("input_tokens", 0)
        + usage.get("cache_creation_input_tokens", 0)
        + usage.get("cache_read_input_tokens", 0)
        + usage.get("output_tokens", 0)
    )
    print(
        f"  usage: {total_tokens:,} tokens, ${cost:.4f}, {findings} findings, {verdict}"
    )


if __name__ == "__main__":
    main()
