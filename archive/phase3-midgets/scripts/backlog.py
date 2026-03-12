#!/usr/bin/env python3
"""backlog — Backlog manager for noopit.

A CLI tool for managing the project backlog. Designed to be called by
both humans and LLM agents without needing to understand file format.

DATA FILE: docs/internal/backlog.yaml (append-only, committed)
ID FORMAT: BL-NNN (auto-incremented)

COMMANDS:
    backlog add "title" [--priority high|medium|low] [--tag TAG] [--epic E1|E2|E3]
    backlog list [--status open|closed|all] [--tag TAG] [--epic EPIC] [--priority PRIO]
    backlog show BL-001
    backlog close BL-001 [--reason "done"]
    backlog edit BL-001 --status STATUS [--reason "why"]
    backlog count [--status open]

EXAMPLES:
    backlog add "Migrate Makefile to Just" --priority medium --tag housekeeping
    backlog add "Daemon integration tests" --priority low --epic E1 --tag testing
    backlog list --status open --priority high
    backlog close BL-003 --reason "shipped in 2f9f7d3"
    backlog count

SCHEMA (each item in backlog.yaml):
    id: BL-001                    # auto-generated, sequential
    title: "Short description"    # what needs doing
    status: open                  # open | closed | blocked
    priority: medium              # high | medium | low
    tags: [housekeeping]          # freeform list, optional
    epic: E1                      # E1 | E2 | E3 | null
    created: 2026-03-08T15:00:00  # ISO 8601, auto-set
    closed: null                  # ISO 8601 when closed
    reason: null                  # why it was closed/blocked
"""

from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime

# PyYAML — available in most Python environments
try:
    import yaml
except ImportError:
    print(
        "backlog: requires PyYAML. Install with: uv pip install pyyaml", file=sys.stderr
    )
    sys.exit(1)


# --------------------------------------------------------------------------
# Config
# --------------------------------------------------------------------------

# Walk up from script's real location (resolving symlinks) to find repo root
SCRIPT_DIR = os.path.dirname(os.path.realpath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
BACKLOG_PATH = os.path.join(REPO_ROOT, "docs", "internal", "backlog.yaml")

VALID_STATUSES = ("open", "closed", "blocked")
VALID_PRIORITIES = ("high", "medium", "low")


# --------------------------------------------------------------------------
# Data layer — read/write YAML
# --------------------------------------------------------------------------


def _read_backlog() -> list[dict]:
    """Read all backlog items. Returns empty list if file doesn't exist."""
    if not os.path.exists(BACKLOG_PATH):
        return []
    with open(BACKLOG_PATH) as f:
        data = yaml.safe_load(f)
    return data if isinstance(data, list) else []


def _write_backlog(items: list[dict]) -> None:
    """Write all backlog items to YAML file."""
    os.makedirs(os.path.dirname(BACKLOG_PATH), exist_ok=True)
    with open(BACKLOG_PATH, "w") as f:
        yaml.dump(
            items, f, default_flow_style=False, sort_keys=False, allow_unicode=True
        )


def _next_id(items: list[dict]) -> str:
    """Generate next BL-NNN id."""
    if not items:
        return "BL-001"
    max_num = 0
    for item in items:
        item_id = item.get("id", "")
        if item_id.startswith("BL-"):
            try:
                num = int(item_id[3:])
                max_num = max(max_num, num)
            except ValueError:
                pass
    return f"BL-{max_num + 1:03d}"


# --------------------------------------------------------------------------
# Commands
# --------------------------------------------------------------------------


def cmd_add(args) -> None:
    """Add a new backlog item."""
    items = _read_backlog()
    new_id = _next_id(items)
    now = datetime.now().astimezone().isoformat()

    item = {
        "id": new_id,
        "title": args.title,
        "status": "open",
        "priority": args.priority,
        "tags": [t.strip() for t in args.tag.split(",")] if args.tag else [],
        "epic": args.epic,
        "created": now,
        "closed": None,
        "reason": None,
    }

    items.append(item)
    _write_backlog(items)
    print(f"{new_id}: {args.title} [{args.priority}]")


def cmd_list(args) -> None:
    """List backlog items with optional filters."""
    items = _read_backlog()
    if not items:
        print("backlog: empty")
        return

    # Filter
    status_filter = args.status if args.status != "all" else None
    filtered = items
    if status_filter:
        filtered = [i for i in filtered if i.get("status") == status_filter]
    if args.tag:
        filtered = [i for i in filtered if args.tag in i.get("tags", [])]
    if args.epic:
        filtered = [i for i in filtered if i.get("epic") == args.epic]
    if args.priority:
        filtered = [i for i in filtered if i.get("priority") == args.priority]

    if not filtered:
        print("backlog: no items match filters")
        return

    # Display
    for item in filtered:
        status = item.get("status", "open")
        prio = item.get("priority", "medium")
        epic = item.get("epic") or ""
        tags = ",".join(item.get("tags", []))
        marker = "x" if status == "closed" else "o" if status == "open" else "!"
        epic_str = f" [{epic}]" if epic else ""
        tag_str = f" ({tags})" if tags else ""
        print(
            f"  [{marker}] {item['id']}  {prio:<6}{epic_str}  {item['title']}{tag_str}"
        )


def cmd_show(args) -> None:
    """Show full details of a single backlog item."""
    items = _read_backlog()
    for item in items:
        if item.get("id") == args.id:
            yaml.dump(item, sys.stdout, default_flow_style=False, sort_keys=False)
            return
    print(f"backlog: {args.id} not found", file=sys.stderr)
    sys.exit(1)


def cmd_close(args) -> None:
    """Close a backlog item."""
    items = _read_backlog()
    for item in items:
        if item.get("id") == args.id:
            item["status"] = "closed"
            item["closed"] = datetime.now().astimezone().isoformat()
            if args.reason:
                item["reason"] = args.reason
            _write_backlog(items)
            print(f"{args.id}: closed")
            return
    print(f"backlog: {args.id} not found", file=sys.stderr)
    sys.exit(1)


def cmd_edit(args) -> None:
    """Edit a backlog item's status."""
    items = _read_backlog()
    for item in items:
        if item.get("id") == args.id:
            if args.status:
                item["status"] = args.status
                if args.status == "closed":
                    item["closed"] = datetime.now().astimezone().isoformat()
                elif args.status == "open":
                    # Reopening clears stale closed timestamp
                    item["closed"] = None
            if args.reason:
                item["reason"] = args.reason
            _write_backlog(items)
            print(f"{args.id}: updated")
            return
    print(f"backlog: {args.id} not found", file=sys.stderr)
    sys.exit(1)


def cmd_count(args) -> None:
    """Count backlog items by status."""
    items = _read_backlog()
    if args.status and args.status != "all":
        count = sum(1 for i in items if i.get("status") == args.status)
        print(f"{count}")
    else:
        counts = {}
        for item in items:
            s = item.get("status", "open")
            counts[s] = counts.get(s, 0) + 1
        for status, count in sorted(counts.items()):
            print(f"  {status}: {count}")
        print(f"  total: {len(items)}")


# --------------------------------------------------------------------------
# CLI parser
# --------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="backlog",
        description="Backlog manager for noopit",
    )
    sub = parser.add_subparsers(dest="command")

    # add
    p_add = sub.add_parser("add", help="Add a new item")
    p_add.add_argument("title", help="Short description of the task")
    p_add.add_argument("--priority", "-p", default="medium", choices=VALID_PRIORITIES)
    p_add.add_argument("--tag", "-t", default=None, help="Comma-separated tags")
    p_add.add_argument("--epic", "-e", default=None, help="Epic: E1, E2, E3, etc.")

    # list
    p_list = sub.add_parser("list", help="List items (default: open)")
    p_list.add_argument(
        "--status", "-s", default="open", help="open|closed|blocked|all"
    )
    p_list.add_argument("--tag", "-t", default=None)
    p_list.add_argument("--epic", "-e", default=None)
    p_list.add_argument("--priority", "-p", default=None, choices=VALID_PRIORITIES)

    # show
    p_show = sub.add_parser("show", help="Show full item details")
    p_show.add_argument("id", help="Item ID (e.g. BL-001)")

    # close
    p_close = sub.add_parser("close", help="Close an item")
    p_close.add_argument("id", help="Item ID")
    p_close.add_argument("--reason", "-r", default=None)

    # edit
    p_edit = sub.add_parser("edit", help="Edit item status")
    p_edit.add_argument("id", help="Item ID")
    p_edit.add_argument("--status", "-s", choices=VALID_STATUSES)
    p_edit.add_argument("--reason", "-r", default=None)

    # count
    p_count = sub.add_parser("count", help="Count items by status")
    p_count.add_argument("--status", "-s", default=None)

    args = parser.parse_args()
    if not args.command:
        # Default to list --status open
        args.command = "list"
        args.status = "open"
        args.tag = None
        args.epic = None
        args.priority = None

    {
        "add": cmd_add,
        "list": cmd_list,
        "show": cmd_show,
        "close": cmd_close,
        "edit": cmd_edit,
        "count": cmd_count,
    }[args.command](args)


if __name__ == "__main__":
    main()
