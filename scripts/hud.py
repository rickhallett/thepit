#!/usr/bin/env python3
"""Project status HUD. Run: watch -n 30 python3 scripts/hud.py"""

import json
import os
import re
import subprocess
import sys


def run(cmd: list[str], timeout: int = 10) -> str:
    """Run a command, return stdout or empty string on failure."""
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return r.stdout.strip() if r.returncode == 0 else ""
    except Exception:
        return ""


def get_root() -> str:
    root = run(["git", "rev-parse", "--show-toplevel"])
    return root or os.getcwd()


def field_head() -> str:
    sha = run(["git", "rev-parse", "--short", "HEAD"]) or "error"
    subject = run(["git", "log", "-1", "--format=%s"]) or "error"
    if len(subject) > 40:
        subject = subject[:37] + "..."
    return f"HEAD   {sha}  {subject}"


def field_gate(root: str) -> str:
    path = os.path.join(root, ".keel-state")
    try:
        with open(path) as f:
            data = json.load(f)
        status = data.get("gate", "unknown")
        time = data.get("gate_time", "")
        return f"GATE   {status} ({time})" if time else f"GATE   {status}"
    except Exception:
        return "GATE   unknown"


def field_tests(root: str) -> str:
    path = os.path.join(root, ".keel-state")
    try:
        with open(path) as f:
            data = json.load(f)
        count = data.get("tests")
        return f"TESTS  {count} passed" if count is not None else "TESTS  unknown"
    except Exception:
        return "TESTS  unknown"


def field_sd(root: str) -> str:
    path = os.path.join(root, "docs", "internal", "session-decisions.md")
    try:
        with open(path) as f:
            content = f.read()
        # Find all table rows starting with | SD-NNN |
        entries = []
        for line in content.splitlines():
            m = re.match(r"^\|\s*SD-(\d+)\s*\|(.+)", line)
            if m:
                num = int(m.group(1))
                desc_cell = m.group(2)
                label_m = re.search(r"\[([^\]]+)\]", desc_cell)
                label = label_m.group(1) if label_m else "unlabelled"
                entries.append((num, label))
        # Sort descending by SD number, take top 3
        entries.sort(key=lambda x: x[0], reverse=True)
        top = entries[:3]
        if not top:
            return "SD     (none found)"
        items = ", ".join(f"(SD-{n}, {lbl})" for n, lbl in top)
        return f"SD     [{items}]"
    except Exception:
        return "SD     error"


def field_prs() -> str:
    raw = run(["gh", "pr", "list", "--json", "number,title,state", "--limit", "5"])
    if not raw:
        return "PRs    (none open)"
    try:
        prs = json.loads(raw)
        if not prs:
            return "PRs    (none open)"
        parts = []
        for pr in prs:
            title = pr.get("title", "")
            if len(title) > 30:
                title = title[:27] + "..."
            parts.append(f"#{pr['number']} {title}")
        return "PRs    " + " | ".join(parts)
    except Exception:
        return "PRs    error"


def field_ctx(root: str) -> str:
    base = os.path.join(root, "docs", "internal")
    if not os.path.isdir(base):
        return "CTX    error (no docs/internal)"
    counts = {"d1": 0, "d2": 0, "d3+": 0}
    for dirpath, _dirs, files in os.walk(base):
        for f in files:
            if not f.endswith(".md"):
                continue
            rel = os.path.relpath(dirpath, base)
            if rel == ".":
                counts["d1"] += 1
            else:
                depth = rel.count(os.sep) + 1
                if depth == 1:
                    counts["d2"] += 1
                else:
                    counts["d3+"] += 1
    total = counts["d1"] + counts["d2"] + counts["d3+"]
    if total == 0:
        return "CTX    d1:0.00 / d2:0.00 / d3+:0.00"
    r1 = counts["d1"] / total
    r2 = counts["d2"] / total
    r3 = counts["d3+"] / total
    return f"CTX    d1:{r1:.2f} / d2:{r2:.2f} / d3+:{r3:.2f}"


def field_log() -> str:
    return run(["git", "log", "--oneline", "-20"]) or "error"


def main():
    root = get_root()
    os.chdir(root)

    print(field_head())
    print(field_gate(root))
    print(field_tests(root))
    print(field_sd(root))
    print(field_prs())
    print(field_ctx(root))
    print("─" * 30)
    print(field_log())


if __name__ == "__main__":
    main()
