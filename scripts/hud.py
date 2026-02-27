#!/usr/bin/env python3
"""Project status HUD. Run: while clear; do python3 scripts/hud.py; sleep 30; done"""

import json
import os
import re
import subprocess
import sys

# ANSI — functional palette. Green=good, red=bad, yellow=warn, cyan=label, dim=secondary.
RST = "\033[0m"
DIM = "\033[2m"
BOLD = "\033[1m"
RED = "\033[31m"
GRN = "\033[32m"
YEL = "\033[33m"
CYN = "\033[36m"


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
    return f"{CYN}HEAD{RST}   {BOLD}{sha}{RST}  {DIM}{subject}{RST}"


def _read_keel_state(root: str) -> dict:
    path = os.path.join(root, ".keel-state")
    try:
        with open(path) as f:
            return json.load(f)
    except Exception:
        return {}


def field_gate(root: str) -> str:
    data = _read_keel_state(root)
    status = data.get("gate", "unknown")
    time = data.get("gate_time", "")
    if status == "green":
        val = f"{GRN}{status}{RST}"
    elif status == "red":
        val = f"{RED}{status}{RST}"
    else:
        val = f"{YEL}{status}{RST}"
    suffix = f" {DIM}({time}){RST}" if time else ""
    return f"{CYN}GATE{RST}   {val}{suffix}"


def field_tests(root: str) -> str:
    data = _read_keel_state(root)
    count = data.get("tests")
    if count is not None:
        return f"{CYN}TESTS{RST}  {GRN}{count} passed{RST}"
    return f"{CYN}TESTS{RST}  {YEL}unknown{RST}"


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
            return f"{CYN}SD{RST}     {DIM}(none found){RST}"
        items = ", ".join(f"({BOLD}SD-{n}{RST}, {CYN}{lbl}{RST})" for n, lbl in top)
        return f"{CYN}SD{RST}     [{items}]"
    except Exception:
        return f"{CYN}SD{RST}     {RED}error{RST}"


def field_prs() -> str:
    raw = run(["gh", "pr", "list", "--json", "number,title,state", "--limit", "5"])
    if not raw:
        return f"{CYN}PRs{RST}    {DIM}(none open){RST}"
    try:
        prs = json.loads(raw)
        if not prs:
            return f"{CYN}PRs{RST}    {DIM}(none open){RST}"
        parts = []
        for pr in prs:
            title = pr.get("title", "")
            if len(title) > 30:
                title = title[:27] + "..."
            parts.append(f"{BOLD}#{pr['number']}{RST} {DIM}{title}{RST}")
        return f"{CYN}PRs{RST}    " + " | ".join(parts)
    except Exception:
        return f"{CYN}PRs{RST}    {RED}error{RST}"


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
        return f"{CYN}CTX{RST}    d1:0.00 / d2:0.00 / d3+:0.00"
    r1 = counts["d1"] / total
    r2 = counts["d2"] / total
    r3 = counts["d3+"] / total
    # d1 > 0.20 is a pollution warning
    d1c = RED if r1 > 0.20 else GRN
    return (
        f"{CYN}CTX{RST}    {d1c}d1:{r1:.2f}{RST} / d2:{r2:.2f} / {GRN}d3+:{r3:.2f}{RST}"
    )


def field_log() -> str:
    raw = run(["git", "log", "--oneline", "--graph", "-20"])
    if not raw:
        return f"{RED}error{RST}"
    return run(["git", "log", "--oneline", "--graph", "--color=always", "-20"])


def main():
    root = get_root()
    os.chdir(root)

    print(field_head())
    print(field_gate(root))
    print(field_tests(root))
    print(field_sd(root))
    print(field_prs())
    print(field_ctx(root))
    print(f"{DIM}{'─' * 30}{RST}")
    print(field_log())


if __name__ == "__main__":
    main()
