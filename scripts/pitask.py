#!/usr/bin/env python3
"""pitask — thin CLI for task tracking via tasks.yaml.

This is the API. Agents call this, not parse YAML manually.
Schema enforcement, ID generation, timestamps, and status
transitions are handled here. The YAML file is the source of
truth; this CLI is the only write interface.

Usage:
  pitask add "title" [--priority high|medium|low] [--plan path] [--tag t1,t2]
  pitask list [--status STATUS] [--priority PRIORITY] [--all] [--json]
  pitask show ID
  pitask update ID [--status STATUS] [--priority PRIORITY] [--note "text"] [--title "text"]
  pitask done ID [--note "text"]
  pitask cancel ID [--reason "text"]
  pitask count [--status STATUS]

Statuses: backlog, todo, in_progress, review, done, cancelled
Priorities: high, medium, low

File: tasks.yaml (repo root)
"""

from __future__ import annotations

import json
import os
import re
import sys
from datetime import date
from pathlib import Path
from typing import Any

# --------------------------------------------------------------------------
# Minimal YAML handling (no PyYAML dependency)
# Handles only our schema: a list of flat dicts with string/int/list values.
# --------------------------------------------------------------------------

VALID_STATUSES = {"backlog", "todo", "in_progress", "review", "done", "cancelled"}
VALID_PRIORITIES = {"high", "medium", "low"}


def _yaml_escape(s: str) -> str:
    """Quote a string if it contains YAML-special characters."""
    if not s:
        return '""'
    needs_quote = any(c in s for c in ":#{}[]|>&*!,%@`") or s.startswith(("- ", "? "))
    if needs_quote or s != s.strip() or s in ("true", "false", "null", "yes", "no"):
        return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'
    return s


def _yaml_unescape(s: str) -> str:
    """Remove quotes from a YAML string value."""
    s = s.strip()
    if len(s) >= 2 and s[0] == '"' and s[-1] == '"':
        return s[1:-1].replace('\\"', '"').replace("\\\\", "\\")
    if len(s) >= 2 and s[0] == "'" and s[-1] == "'":
        return s[1:-1].replace("''", "'")
    return s


def _tasks_path() -> Path:
    """Find tasks.yaml at repo root."""
    # Walk up to find .git
    p = Path.cwd()
    while p != p.parent:
        if (p / ".git").exists():
            return p / "tasks.yaml"
        p = p.parent
    return Path.cwd() / "tasks.yaml"


def _read_tasks(path: Path) -> list[dict[str, Any]]:
    """Read tasks.yaml. Returns empty list if file doesn't exist."""
    if not path.exists():
        return []

    tasks: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None

    for line in path.read_text().splitlines():
        stripped = line.strip()

        # Skip comments and empty lines
        if not stripped or stripped.startswith("#"):
            continue

        # Skip the top-level "tasks:" key
        if stripped == "tasks:":
            continue

        # New task item
        if line.startswith("  - "):
            if current is not None:
                tasks.append(current)
            current = {}
            # Parse the first field on the "- " line
            rest = stripped[2:]  # remove "- "
            if ":" in rest:
                key, val = rest.split(":", 1)
                current[key.strip()] = _parse_value(val.strip())

        # Continuation field
        elif line.startswith("    ") and current is not None:
            if ":" in stripped:
                key, val = stripped.split(":", 1)
                current[key.strip()] = _parse_value(val.strip())

    if current is not None:
        tasks.append(current)

    return tasks


def _parse_value(val: str) -> Any:
    """Parse a YAML value (string, list, int)."""
    val = val.strip()
    if not val:
        return ""
    # Inline list: [a, b, c]
    if val.startswith("[") and val.endswith("]"):
        inner = val[1:-1]
        if not inner.strip():
            return []
        return [_yaml_unescape(v.strip()) for v in inner.split(",")]
    # Integer
    if val.isdigit():
        return int(val)
    # String
    return _yaml_unescape(val)


def _write_tasks(path: Path, tasks: list[dict[str, Any]]) -> None:
    """Write tasks.yaml with consistent formatting."""
    lines = [
        "# tasks.yaml — single source of truth for task tracking",
        "# Managed by pitask CLI. Do not edit manually.",
        "# Schema: id, title, status, priority, created, updated, plan, tags, notes",
        "",
        "tasks:",
    ]

    field_order = [
        "id",
        "title",
        "status",
        "priority",
        "created",
        "updated",
        "plan",
        "tags",
        "notes",
    ]

    for task in tasks:
        first = True
        for field in field_order:
            if field not in task:
                continue
            val = task[field]
            prefix = "  - " if first else "    "
            first = False

            if isinstance(val, list):
                formatted = "[" + ", ".join(_yaml_escape(v) for v in val) + "]"
            elif isinstance(val, int):
                formatted = str(val)
            else:
                formatted = _yaml_escape(str(val))

            lines.append(f"{prefix}{field}: {formatted}")

        # Add any fields not in the standard order
        for key, val in task.items():
            if key not in field_order:
                if isinstance(val, list):
                    formatted = "[" + ", ".join(_yaml_escape(v) for v in val) + "]"
                elif isinstance(val, int):
                    formatted = str(val)
                else:
                    formatted = _yaml_escape(str(val))
                lines.append(f"    {key}: {formatted}")

    lines.append("")  # trailing newline
    path.write_text("\n".join(lines))


def _next_id(tasks: list[dict[str, Any]]) -> str:
    """Generate next T-NNN ID."""
    max_n = 0
    for t in tasks:
        tid = t.get("id", "")
        m = re.match(r"T-(\d+)", str(tid))
        if m:
            max_n = max(max_n, int(m.group(1)))
    return f"T-{max_n + 1:03d}"


def _today() -> str:
    return date.today().isoformat()


# --------------------------------------------------------------------------
# Commands
# --------------------------------------------------------------------------


def cmd_add(args: list[str]) -> None:
    if not args:
        print("pitask add: title is required", file=sys.stderr)
        print('  pitask add "Fix the env validation" --priority high', file=sys.stderr)
        sys.exit(1)

    title = args[0]
    priority = "medium"
    plan = ""
    tags: list[str] = []

    i = 1
    while i < len(args):
        if args[i] == "--priority" and i + 1 < len(args):
            priority = args[i + 1]
            if priority not in VALID_PRIORITIES:
                print(
                    f"pitask: invalid priority {priority!r}. Use: {', '.join(sorted(VALID_PRIORITIES))}",
                    file=sys.stderr,
                )
                sys.exit(1)
            i += 2
        elif args[i] == "--plan" and i + 1 < len(args):
            plan = args[i + 1]
            i += 2
        elif args[i] == "--tag" and i + 1 < len(args):
            tags = [t.strip() for t in args[i + 1].split(",")]
            i += 2
        else:
            print(f"pitask add: unknown flag {args[i]!r}", file=sys.stderr)
            sys.exit(1)

    path = _tasks_path()
    tasks = _read_tasks(path)
    tid = _next_id(tasks)
    today = _today()

    task: dict[str, Any] = {
        "id": tid,
        "title": title,
        "status": "todo",
        "priority": priority,
        "created": today,
        "updated": today,
    }
    if plan:
        task["plan"] = plan
    if tags:
        task["tags"] = tags
    task["notes"] = ""

    tasks.append(task)
    _write_tasks(path, tasks)
    print(f"{tid}: {title} [{priority}]")


def cmd_list(args: list[str]) -> None:
    path = _tasks_path()
    tasks = _read_tasks(path)

    filter_status: str | None = None
    filter_priority: str | None = None
    show_all = False
    output_json = False

    i = 0
    while i < len(args):
        if args[i] == "--status" and i + 1 < len(args):
            filter_status = args[i + 1]
            i += 2
        elif args[i] == "--priority" and i + 1 < len(args):
            filter_priority = args[i + 1]
            i += 2
        elif args[i] == "--all":
            show_all = True
            i += 1
        elif args[i] == "--json":
            output_json = True
            i += 1
        else:
            print(f"pitask list: unknown flag {args[i]!r}", file=sys.stderr)
            sys.exit(1)

    # Default: hide done and cancelled
    if not show_all and filter_status is None:
        tasks = [t for t in tasks if t.get("status") not in ("done", "cancelled")]

    if filter_status:
        tasks = [t for t in tasks if t.get("status") == filter_status]
    if filter_priority:
        tasks = [t for t in tasks if t.get("priority") == filter_priority]

    if output_json:
        print(json.dumps(tasks, indent=2))
        return

    if not tasks:
        print("No tasks found.")
        return

    # Priority sort order
    prio_order = {"high": 0, "medium": 1, "low": 2}
    tasks.sort(
        key=lambda t: (prio_order.get(t.get("priority", "medium"), 9), t.get("id", ""))
    )

    for t in tasks:
        tid = t.get("id", "?")
        title = t.get("title", "")
        status = t.get("status", "?")
        priority = t.get("priority", "?")
        plan = t.get("plan", "")
        plan_str = f" ({plan})" if plan else ""
        print(f"  {tid}  [{priority:6s}]  {status:12s}  {title}{plan_str}")


def cmd_show(args: list[str]) -> None:
    if not args:
        print("pitask show: ID is required", file=sys.stderr)
        sys.exit(1)

    tid = args[0].upper()
    if not tid.startswith("T-"):
        tid = f"T-{tid}"

    path = _tasks_path()
    tasks = _read_tasks(path)

    for t in tasks:
        if t.get("id") == tid:
            for k, v in t.items():
                if isinstance(v, list):
                    v_str = ", ".join(str(x) for x in v)
                else:
                    v_str = str(v)
                print(f"  {k:12s}: {v_str}")
            return

    print(f"pitask: task {tid} not found", file=sys.stderr)
    sys.exit(1)


def cmd_update(args: list[str]) -> None:
    if not args:
        print("pitask update: ID is required", file=sys.stderr)
        sys.exit(1)

    tid = args[0].upper()
    if not tid.startswith("T-"):
        tid = f"T-{tid}"

    updates: dict[str, Any] = {}
    i = 1
    while i < len(args):
        if args[i] == "--status" and i + 1 < len(args):
            s = args[i + 1]
            if s not in VALID_STATUSES:
                print(
                    f"pitask: invalid status {s!r}. Use: {', '.join(sorted(VALID_STATUSES))}",
                    file=sys.stderr,
                )
                sys.exit(1)
            updates["status"] = s
            i += 2
        elif args[i] == "--priority" and i + 1 < len(args):
            p = args[i + 1]
            if p not in VALID_PRIORITIES:
                print(
                    f"pitask: invalid priority {p!r}. Use: {', '.join(sorted(VALID_PRIORITIES))}",
                    file=sys.stderr,
                )
                sys.exit(1)
            updates["priority"] = p
            i += 2
        elif args[i] == "--note" and i + 1 < len(args):
            updates["notes"] = args[i + 1]
            i += 2
        elif args[i] == "--title" and i + 1 < len(args):
            updates["title"] = args[i + 1]
            i += 2
        else:
            print(f"pitask update: unknown flag {args[i]!r}", file=sys.stderr)
            sys.exit(1)

    if not updates:
        print("pitask update: no updates specified", file=sys.stderr)
        sys.exit(1)

    path = _tasks_path()
    tasks = _read_tasks(path)

    for t in tasks:
        if t.get("id") == tid:
            t.update(updates)
            t["updated"] = _today()
            _write_tasks(path, tasks)
            print(f"{tid}: updated ({', '.join(updates.keys())})")
            return

    print(f"pitask: task {tid} not found", file=sys.stderr)
    sys.exit(1)


def cmd_done(args: list[str]) -> None:
    if not args:
        print("pitask done: ID is required", file=sys.stderr)
        sys.exit(1)

    tid = args[0].upper()
    if not tid.startswith("T-"):
        tid = f"T-{tid}"

    note_args = []
    i = 1
    while i < len(args):
        if args[i] == "--note" and i + 1 < len(args):
            note_args = ["--note", args[i + 1]]
            i += 2
        else:
            i += 1

    cmd_update([tid, "--status", "done"] + note_args)


def cmd_cancel(args: list[str]) -> None:
    if not args:
        print("pitask cancel: ID is required", file=sys.stderr)
        sys.exit(1)

    tid = args[0].upper()
    if not tid.startswith("T-"):
        tid = f"T-{tid}"

    reason_args = []
    i = 1
    while i < len(args):
        if args[i] == "--reason" and i + 1 < len(args):
            reason_args = ["--note", f"Cancelled: {args[i + 1]}"]
            i += 2
        else:
            i += 1

    cmd_update([tid, "--status", "cancelled"] + reason_args)


def cmd_count(args: list[str]) -> None:
    path = _tasks_path()
    tasks = _read_tasks(path)

    filter_status: str | None = None
    i = 0
    while i < len(args):
        if args[i] == "--status" and i + 1 < len(args):
            filter_status = args[i + 1]
            i += 2
        else:
            i += 1

    if filter_status:
        tasks = [t for t in tasks if t.get("status") == filter_status]

    print(len(tasks))


def usage() -> None:
    print("pitask — task tracking via tasks.yaml")
    print()
    print("Commands:")
    print('  pitask add "title" [--priority P] [--plan path] [--tag t1,t2]')
    print("  pitask list [--status S] [--priority P] [--all] [--json]")
    print("  pitask show ID")
    print("  pitask update ID [--status S] [--priority P] [--note text] [--title text]")
    print("  pitask done ID [--note text]")
    print("  pitask cancel ID [--reason text]")
    print("  pitask count [--status S]")
    print()
    print(f"Statuses: {', '.join(sorted(VALID_STATUSES))}")
    print(f"Priorities: {', '.join(sorted(VALID_PRIORITIES))}")
    print()
    print(f"File: {_tasks_path()}")


def main() -> None:
    args = sys.argv[1:]

    if not args or args[0] in ("-h", "--help", "help"):
        usage()
        sys.exit(0)

    cmd = args[0]
    rest = args[1:]

    if cmd == "add":
        cmd_add(rest)
    elif cmd == "list":
        cmd_list(rest)
    elif cmd == "show":
        cmd_show(rest)
    elif cmd == "update":
        cmd_update(rest)
    elif cmd == "done":
        cmd_done(rest)
    elif cmd == "cancel":
        cmd_cancel(rest)
    elif cmd == "count":
        cmd_count(rest)
    else:
        print(f"pitask: unknown command {cmd!r}", file=sys.stderr)
        usage()
        sys.exit(1)


if __name__ == "__main__":
    main()
