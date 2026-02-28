#!/usr/bin/env python3
"""Aggregate all agent definitions into a single master document.

Usage:
    python scripts/aggregate-agents.py

Reads every .md file in .opencode/agents/, orders them by hierarchy,
and writes .opencode/agents/MASTER.md with a table of contents and
full content separated by horizontal rules.
"""

from pathlib import Path

AGENTS_DIR = Path(__file__).resolve().parent.parent / ".opencode" / "agents"
OUTPUT = AGENTS_DIR / "MASTER.md"

# Hierarchy order: governance first, then orchestration, builders,
# verifiers, infrastructure, maintenance, evaluation.
HIERARCHY = [
    "weaver",
    "captain",
    "architect",
    "artisan",
    "foreman",
    "sentinel",
    "watchdog",
    "lighthouse",
    "quartermaster",
    "scribe",
    "janitor",
    "analyst",
]


def extract_title(content: str) -> str:
    """Pull the first H1 line as the agent's title."""
    for line in content.splitlines():
        if line.startswith("# "):
            return line.removeprefix("# ").strip()
    return "Untitled"


def main() -> None:
    agent_files = {p.stem: p for p in AGENTS_DIR.glob("*.md") if p.name != "MASTER.md"}

    # Ordered list: hierarchy first, then any stragglers alphabetically
    ordered = [name for name in HIERARCHY if name in agent_files]
    extras = sorted(set(agent_files) - set(HIERARCHY))
    ordered.extend(extras)

    if not ordered:
        print("No agent files found.")
        return

    sections: list[tuple[str, str, str]] = []  # (slug, title, content)
    for name in ordered:
        content = agent_files[name].read_text()
        title = extract_title(content)
        sections.append((name, title, content))

    # Build the master document
    lines: list[str] = []
    lines.append("# The Pit — Agent System Reference")
    lines.append("")
    lines.append(f"> Auto-generated from {len(sections)} agent definitions ")
    lines.append(f"> in `.opencode/agents/`. Do not edit directly — ")
    lines.append("> run `python scripts/aggregate-agents.py` to regenerate.")
    lines.append("")
    lines.append("## Table of Contents")
    lines.append("")
    for i, (slug, title, _) in enumerate(sections, 1):
        lines.append(f"{i}. [{title}](#{slug})")
    lines.append("")

    # Full content
    for slug, _title, content in sections:
        lines.append("---")
        lines.append("")
        lines.append(f'<a id="{slug}"></a>')
        lines.append("")
        lines.append(content.rstrip())
        lines.append("")

    OUTPUT.write_text("\n".join(lines) + "\n")
    print(f"Wrote {OUTPUT} ({len(sections)} agents, {sum(1 for l in lines)} lines)")


if __name__ == "__main__":
    main()
