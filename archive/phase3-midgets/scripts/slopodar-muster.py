#!/usr/bin/env python3
"""slopodar-muster.py — CLI muster for reviewing slopodar entries one at a time.

Loads docs/internal/slopodar.yaml, presents each entry with its fields,
collects a grade (0-100), verdict (keep/cut/merge/rewrite), and comments.
Writes machine-readable YAML output that Weaver can consume to apply updates.

Usage:
    uv run scripts/slopodar-muster.py                      # start fresh
    uv run scripts/slopodar-muster.py --resume              # resume from last position
    uv run scripts/slopodar-muster.py --output FILE         # custom output file
    uv run scripts/slopodar-muster.py --start-at ID         # jump to a specific entry
    uv run scripts/slopodar-muster.py --summary             # show summary of existing reviews

Controls:
    Enter grade (0-100), then verdict, then optional comments.
    Type 'skip' at grade prompt to skip an entry.
    Type 'quit' or Ctrl+C to save progress and exit.
    Type 'back' at grade prompt to revisit the previous entry.
    Type 'show <field>' to re-display a specific field (e.g. 'show detect').

Requires: PyYAML, Rich (inline dependencies for uv).
"""
# /// script
# requires-python = ">=3.10"
# dependencies = ["pyyaml", "rich"]
# ///

from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml
from rich.console import Console
from rich.markup import escape
from rich.panel import Panel
from rich.prompt import Prompt
from rich.table import Table
from rich.text import Text
from rich import box

# ─── Paths ────────────────────────────────────────────────────────────
REPO_ROOT = Path(__file__).resolve().parent.parent
SLOPODAR_PATH = REPO_ROOT / "docs" / "internal" / "slopodar.yaml"
DEFAULT_OUTPUT = REPO_ROOT / "docs" / "internal" / "slopodar-review.yaml"

console = Console()


def _rel(p: Path) -> str:
    """Best-effort relative path from repo root; falls back to absolute."""
    try:
        return str(p.relative_to(REPO_ROOT))
    except ValueError:
        return str(p)


# ─── Constants ────────────────────────────────────────────────────────
VERDICTS = ("keep", "cut", "merge", "rewrite")

VERDICT_COLOURS = {
    "keep": "green",
    "cut": "red",
    "merge": "yellow",
    "rewrite": "cyan",
}

CONFIDENCE_COLOURS = {
    "strong": "bold green",
    "medium": "yellow",
    "low": "dim white",
}

SEVERITY_COLOURS = {
    "high": "bold red",
    "medium": "yellow",
    "low": "dim white",
}

DOMAIN_COLOURS = {
    "prose-style": "magenta",
    "relationship-sycophancy": "red",
    "governance-process": "blue",
    "analytical-measurement": "cyan",
    "tests": "yellow",
    "code": "green",
    "metacognitive": "bright_magenta",
    "commit-workflow": "bright_blue",
}

# ─── Data I/O ─────────────────────────────────────────────────────────


def load_slopodar(path: Path) -> list[dict[str, Any]]:
    """Load and return the patterns list from slopodar.yaml."""
    with open(path) as f:
        data = yaml.safe_load(f)
    patterns = data.get("patterns", [])
    if not patterns:
        console.print("[bold red]ERROR:[/] No patterns found in slopodar.yaml")
        sys.exit(1)
    return patterns


def load_existing_reviews(path: Path) -> dict[str, dict[str, Any]]:
    """Load existing review file if it exists, keyed by entry id."""
    if not path.exists():
        return {}
    with open(path) as f:
        data = yaml.safe_load(f)
    if not data or "reviews" not in data:
        return {}
    return {r["id"]: r for r in data["reviews"]}


def save_reviews(
    path: Path,
    reviews: dict[str, dict[str, Any]],
    total_entries: int,
) -> None:
    """Write reviews to YAML output file."""
    output = {
        "meta": {
            "generated": datetime.now(timezone.utc).isoformat(),
            "source": _rel(SLOPODAR_PATH),
            "total_entries": total_entries,
            "reviewed": len(reviews),
            "remaining": total_entries - len(reviews),
            "summary": {
                "average_grade": (
                    round(
                        sum(
                            r["grade"]
                            for r in reviews.values()
                            if r["grade"] is not None
                        )
                        / max(
                            1,
                            sum(1 for r in reviews.values() if r["grade"] is not None),
                        ),
                        1,
                    )
                    if reviews
                    else None
                ),
                "verdicts": _count_verdicts(reviews),
                "grade_distribution": _grade_distribution(reviews),
            },
        },
        "reviews": list(reviews.values()),
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        yaml.dump(
            output,
            f,
            default_flow_style=False,
            sort_keys=False,
            width=120,
            allow_unicode=True,
        )
    console.print(f"\n[dim]Saved {len(reviews)} reviews to {_rel(path)}[/]")


def _count_verdicts(reviews: dict[str, dict[str, Any]]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for r in reviews.values():
        v = r.get("verdict", "pending")
        counts[v] = counts.get(v, 0) + 1
    return counts


def _grade_distribution(reviews: dict[str, dict[str, Any]]) -> dict[str, int]:
    """Bucket grades into ranges for the summary."""
    buckets = {"0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0}
    for r in reviews.values():
        g = r.get("grade")
        if g is None:
            continue
        if g <= 20:
            buckets["0-20"] += 1
        elif g <= 40:
            buckets["21-40"] += 1
        elif g <= 60:
            buckets["41-60"] += 1
        elif g <= 80:
            buckets["61-80"] += 1
        else:
            buckets["81-100"] += 1
    return buckets


# ─── Grade colouring ─────────────────────────────────────────────────


def grade_colour(grade: int) -> str:
    """Return a Rich colour string for a grade value."""
    if grade >= 80:
        return "bold green"
    if grade >= 60:
        return "green"
    if grade >= 40:
        return "yellow"
    if grade >= 20:
        return "red"
    return "bold red"


def grade_str(grade: int | None) -> str:
    """Format a grade with colour markup."""
    if grade is None:
        return "[dim]--[/]"
    colour = grade_colour(grade)
    return f"[{colour}]{grade}[/{colour}]"


# ─── Display ──────────────────────────────────────────────────────────


def _build_field_line(label: str, value: str, style: str = "") -> Text:
    """Build a styled label: value line."""
    t = Text()
    t.append(f"  {label}: ", style="bold dim")
    t.append(str(value), style=style)
    return t


def _build_long_field(label: str, value: str, style: str = "") -> Text:
    """Build a styled block for longer text fields."""
    t = Text()
    t.append(f"  {label}\n", style="bold dim")
    t.append(f"  {str(value).strip()}", style=style)
    return t


def _build_refs(refs: list) -> Text:
    """Build styled refs list."""
    t = Text()
    t.append("  REFS\n", style="bold dim")
    for ref in refs:
        if isinstance(ref, str):
            t.append(f"    {ref}\n", style="dim cyan")
        elif isinstance(ref, dict):
            for k, v in ref.items():
                t.append(f"    {k}: {v}\n", style="dim cyan")
    return t


def _build_examples(examples: list) -> Text:
    """Build styled examples list."""
    t = Text()
    t.append("  EXAMPLES\n", style="bold dim")
    for ex in examples:
        if isinstance(ex, dict):
            ex_id = ex.get("id", "?")
            t.append(f"    [{ex_id}]\n", style="bold yellow")
            for k, v in ex.items():
                if k != "id":
                    t.append(f"      {k}: ", style="dim")
                    t.append(f"{v}\n")
    return t


def display_entry(
    entry: dict[str, Any],
    index: int,
    total: int,
    existing: dict[str, Any] | None = None,
) -> None:
    """Display a single slopodar entry as a Rich panel."""
    entry_id = entry.get("id", "???")
    name = entry.get("name", "???")
    domain = entry.get("domain", "???")
    confidence = entry.get("confidence", "???")
    severity = entry.get("severity", "???")

    domain_colour = DOMAIN_COLOURS.get(domain, "white")
    conf_colour = CONFIDENCE_COLOURS.get(confidence, "white")
    sev_colour = SEVERITY_COLOURS.get(severity, "white")

    # Build the body
    parts: list[Text | str] = []

    # Metadata row as a mini table
    meta = Text()
    meta.append("  DOMAIN: ", style="bold dim")
    meta.append(domain, style=domain_colour)
    meta.append("    CONFIDENCE: ", style="bold dim")
    meta.append(confidence, style=conf_colour)
    meta.append("    SEVERITY: ", style="bold dim")
    meta.append(severity, style=sev_colour)
    detected = entry.get("detected", "")
    if detected:
        meta.append(f"    DETECTED: ", style="bold dim")
        meta.append(str(detected), style="dim")
    parts.append(meta)

    # Previous review status
    if existing:
        prev = Text()
        prev.append("\n  PREVIOUS: ", style="bold dim")
        eg = existing.get("grade")
        ev = existing.get("verdict", "")
        prev.append(f"grade={eg}", style=grade_colour(eg) if eg is not None else "dim")
        vc = VERDICT_COLOURS.get(ev, "white")
        prev.append(f"  verdict=", style="bold dim")
        prev.append(ev, style=vc)
        ec = existing.get("comments")
        if ec:
            prev.append(f'  "{ec}"', style="italic dim")
        parts.append(prev)

    # Trigger
    trigger = entry.get("trigger")
    if trigger:
        parts.append(Text(""))  # spacer
        parts.append(_build_long_field("TRIGGER", trigger, style="bold italic yellow"))

    # Description
    desc = entry.get("description")
    if desc:
        parts.append(Text(""))
        parts.append(_build_long_field("DESCRIPTION", desc))

    # Detect — the actionable heuristic, visually prominent
    detect = entry.get("detect")
    if detect:
        parts.append(Text(""))
        parts.append(_build_long_field("DETECT", detect, style="green"))

    # Instead
    instead = entry.get("instead")
    if instead:
        parts.append(Text(""))
        parts.append(_build_long_field("INSTEAD", instead, style="bright_white"))

    # Refs
    refs = entry.get("refs")
    if refs and isinstance(refs, list):
        parts.append(Text(""))
        parts.append(_build_refs(refs))

    # Examples
    examples = entry.get("examples")
    if examples and isinstance(examples, list):
        parts.append(_build_examples(examples))

    # Evidence
    evidence = entry.get("evidence")
    if evidence and isinstance(evidence, list):
        t = Text()
        t.append("  EVIDENCE\n", style="bold dim")
        for item in evidence:
            t.append(f"    {item}\n", style="dim magenta")
        parts.append(t)

    # Assemble into a single renderable
    body = Text("\n").join(parts)

    # Panel title and subtitle
    title = f"[bold white][{index + 1}/{total}][/]  [bold]{escape(name)}[/]"
    subtitle = f"[dim]{escape(entry_id)}[/]"

    panel = Panel(
        body,
        title=title,
        subtitle=subtitle,
        border_style=domain_colour,
        box=box.HEAVY,
        expand=True,
        padding=(1, 2),
    )
    console.print()
    console.print(panel)


def display_field(entry: dict[str, Any], field: str) -> None:
    """Re-display a single field from the current entry."""
    value = entry.get(field)
    if value is None:
        console.print(f"  [dim](no '{field}' field on this entry)[/]")
        return

    if isinstance(value, list):
        t = Text()
        t.append(f"  {field.upper()}\n", style="bold dim")
        for item in value:
            t.append(f"    {item}\n", style="dim cyan")
        console.print(t)
    elif isinstance(value, str) and len(value) > 60:
        console.print(_build_long_field(field.upper(), value))
    else:
        console.print(_build_field_line(field.upper(), str(value)))


# ─── Prompts ──────────────────────────────────────────────────────────


def prompt_grade(entry_id: str, existing: dict[str, Any] | None) -> str | int | None:
    """Prompt for grade. Returns int, 'skip', 'back', 'quit', or a 'show X' string."""
    default_hint = ""
    if existing and existing.get("grade") is not None:
        default_hint = f" [dim]\\[previous: {existing['grade']}][/]"

    while True:
        try:
            raw = (
                Prompt.ask(
                    f"\n  [bold]Grade[/] [dim](0-100, skip, back, quit, show <field>)[/]{default_hint}"
                )
                .strip()
                .lower()
            )
        except EOFError:
            return "quit"
        except KeyboardInterrupt:
            return "quit"

        if raw == "quit":
            return "quit"
        if raw == "skip":
            return "skip"
        if raw == "back":
            return "back"
        if raw.startswith("show "):
            return raw

        if raw == "" and existing and existing.get("grade") is not None:
            return existing["grade"]

        try:
            grade = int(raw)
            if 0 <= grade <= 100:
                return grade
            console.print("  [red]Grade must be 0-100.[/]")
        except ValueError:
            console.print(
                "  [dim]Enter a number 0-100, 'skip', 'back', 'quit', or 'show <field>'.[/]"
            )


def prompt_verdict(existing: dict[str, Any] | None) -> str | None:
    """Prompt for verdict. Returns verdict string or None on quit."""
    default_hint = ""
    if existing and existing.get("verdict"):
        ev = existing["verdict"]
        vc = VERDICT_COLOURS.get(ev, "white")
        default_hint = f" [dim]\\[previous: [{vc}]{ev}[/{vc}]][/]"

    choices_display = " / ".join(
        f"[{VERDICT_COLOURS[v]}]{v}[/{VERDICT_COLOURS[v]}]" for v in VERDICTS
    )

    while True:
        try:
            raw = (
                Prompt.ask(f"  [bold]Verdict[/] ({choices_display}){default_hint}")
                .strip()
                .lower()
            )
        except (EOFError, KeyboardInterrupt):
            return None

        if raw == "quit":
            return None

        if raw == "" and existing and existing.get("verdict"):
            return existing["verdict"]

        if raw in VERDICTS:
            return raw

        console.print(f"  [dim]Choose one of: {', '.join(VERDICTS)}[/]")


def prompt_comments(existing: dict[str, Any] | None) -> str:
    """Prompt for freeform comments."""
    default_hint = ""
    if existing and existing.get("comments"):
        default_hint = f" [dim]\\[previous: {existing['comments'][:40]}...][/]"

    try:
        raw = Prompt.ask(
            f"  [bold]Comments[/] [dim](optional, Enter to skip)[/]{default_hint}",
            default="",
        ).strip()
    except (EOFError, KeyboardInterrupt):
        return ""

    if raw == "" and existing and existing.get("comments"):
        return existing["comments"]

    return raw


def prompt_merge_target(existing: dict[str, Any] | None) -> str:
    """If verdict is 'merge', ask which entry to merge into."""
    default_hint = ""
    if existing and existing.get("merge_into"):
        default_hint = f" [dim]\\[previous: {existing['merge_into']}][/]"

    try:
        raw = Prompt.ask(
            f"  [bold yellow]Merge into which entry ID?[/]{default_hint}"
        ).strip()
    except (EOFError, KeyboardInterrupt):
        return ""

    if raw == "" and existing and existing.get("merge_into"):
        return existing["merge_into"]

    return raw


# ─── Summary ──────────────────────────────────────────────────────────


def print_summary(reviews: dict[str, dict[str, Any]], total: int) -> None:
    """Print a summary table of all reviews."""
    if not reviews:
        console.print("\n[dim]No reviews yet.[/]")
        return

    table = Table(
        title=f"Slopodar Review — {len(reviews)}/{total} reviewed",
        box=box.ROUNDED,
        title_style="bold white",
        border_style="dim",
        show_lines=False,
        pad_edge=True,
    )
    table.add_column("#", style="dim", width=4, justify="right")
    table.add_column("ID", style="bold", min_width=28)
    table.add_column("Grade", justify="center", width=6)
    table.add_column("Verdict", justify="center", width=9)
    table.add_column("Comments", style="dim italic", ratio=1)

    for i, (entry_id, review) in enumerate(reviews.items(), 1):
        g = review.get("grade")
        g_display = grade_str(g)
        v = review.get("verdict", "--")
        vc = VERDICT_COLOURS.get(v, "white")
        v_display = f"[{vc}]{v}[/{vc}]"
        comments = review.get("comments", "") or ""
        if len(comments) > 35:
            comments = comments[:32] + "..."

        table.add_row(str(i), entry_id, g_display, v_display, comments)

    console.print()
    console.print(table)

    # Stats line
    grades = [r["grade"] for r in reviews.values() if r.get("grade") is not None]
    if grades:
        avg = sum(grades) / len(grades)
        console.print(
            f"\n  [bold]Avg:[/] {grade_str(round(avg))} ({avg:.1f})  "
            f"[bold]Min:[/] {grade_str(min(grades))}  "
            f"[bold]Max:[/] {grade_str(max(grades))}  "
            f"[dim]{len(reviews)}/{total} reviewed[/]"
        )

    verdicts = _count_verdicts(reviews)
    if verdicts:
        parts = []
        for v, c in sorted(verdicts.items()):
            vc = VERDICT_COLOURS.get(v, "white")
            parts.append(f"[{vc}]{v}[/{vc}]: {c}")
        console.print(f"  [bold]Verdicts:[/] {'  '.join(parts)}")

    console.print()


# ─── Main ─────────────────────────────────────────────────────────────


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Slopodar entry muster — review one at a time"
    )
    parser.add_argument(
        "--output", "-o", type=Path, default=DEFAULT_OUTPUT, help="Output YAML file"
    )
    parser.add_argument(
        "--resume", "-r", action="store_true", help="Resume from last reviewed position"
    )
    parser.add_argument("--start-at", "-s", type=str, help="Jump to entry with this ID")
    parser.add_argument(
        "--summary",
        action="store_true",
        help="Show summary of existing reviews and exit",
    )
    parser.add_argument(
        "--slopodar", type=Path, default=SLOPODAR_PATH, help="Path to slopodar.yaml"
    )
    args = parser.parse_args()

    patterns = load_slopodar(args.slopodar)
    reviews = load_existing_reviews(args.output)
    total = len(patterns)

    # Header
    console.print()
    console.print(
        Panel(
            f"[bold]{total}[/] entries  [dim]|[/]  Source: [cyan]{_rel(args.slopodar)}[/]  [dim]|[/]  Output: [cyan]{_rel(args.output)}[/]"
            + (
                f"\n[dim]Existing reviews: {len(reviews)}/{total}[/]" if reviews else ""
            ),
            title="[bold]Slopodar Muster[/]",
            border_style="bright_blue",
            box=box.DOUBLE,
        )
    )

    if args.summary:
        print_summary(reviews, total)
        return

    # Determine start index
    start_idx = 0
    if args.start_at:
        for i, p in enumerate(patterns):
            if p.get("id") == args.start_at:
                start_idx = i
                break
        else:
            console.print(f"[bold red]ERROR:[/] Entry '{args.start_at}' not found.")
            console.print("[dim]Available IDs:[/]")
            for p in patterns:
                console.print(f"  [dim]-[/] {p.get('id')}")
            sys.exit(1)
    elif args.resume and reviews:
        reviewed_ids = set(reviews.keys())
        for i, p in enumerate(patterns):
            if p.get("id") not in reviewed_ids:
                start_idx = i
                break
        else:
            console.print("[bold green]All entries reviewed![/]")
            print_summary(reviews, total)
            return
        console.print(
            f"[dim]Resuming from entry {start_idx + 1}/{total}: [bold]{patterns[start_idx].get('id')}[/][/]"
        )

    console.print(f"\n[dim]Starting at entry {start_idx + 1}/{total}[/]")
    console.print("[dim]Commands: grade (0-100) | skip | back | quit | show <field>[/]")

    idx = start_idx
    while idx < total:
        entry = patterns[idx]
        entry_id = entry.get("id", f"unknown-{idx}")
        existing = reviews.get(entry_id)

        display_entry(entry, idx, total, existing)

        # Grade prompt loop (handles 'show' commands)
        while True:
            result = prompt_grade(entry_id, existing)

            if isinstance(result, str) and result.startswith("show "):
                field = result[5:].strip()
                display_field(entry, field)
                continue

            if result == "quit":
                save_reviews(args.output, reviews, total)
                print_summary(reviews, total)
                return

            if result == "back":
                if idx > 0:
                    idx -= 1
                else:
                    console.print("  [dim]Already at the first entry.[/]")
                break

            if result == "skip":
                console.print(f"  [dim]Skipped {entry_id}[/]")
                idx += 1
                break

            # Got a numeric grade — result is int here (str cases handled above)
            grade: int = result  # type: ignore[assignment]
            verdict = prompt_verdict(existing)
            if verdict is None:
                save_reviews(args.output, reviews, total)
                print_summary(reviews, total)
                return

            comments = prompt_comments(existing)

            review: dict[str, Any] = {
                "id": entry_id,
                "name": entry.get("name", ""),
                "grade": grade,
                "verdict": verdict,
                "comments": comments if comments else None,
                "reviewed_at": datetime.now(timezone.utc).isoformat(),
            }

            if verdict == "merge":
                merge_target = prompt_merge_target(existing)
                if merge_target:
                    review["merge_into"] = merge_target

            reviews[entry_id] = review

            # Auto-save after each entry
            save_reviews(args.output, reviews, total)

            vc = VERDICT_COLOURS.get(verdict, "white")
            console.print(
                f"  [bold]Recorded:[/] {entry_id} = {grade_str(grade)}  [{vc}]{verdict}[/{vc}]"
            )
            idx += 1
            break

    # Done - all entries reviewed
    save_reviews(args.output, reviews, total)
    console.print()
    console.print(
        Panel(
            "[bold green]ALL ENTRIES REVIEWED[/]",
            border_style="green",
            box=box.DOUBLE,
        )
    )
    print_summary(reviews, total)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        console.print(
            "\n\n  [yellow]Interrupted[/] — [dim]reviews are auto-saved after each entry.[/]"
        )
        sys.exit(130)
