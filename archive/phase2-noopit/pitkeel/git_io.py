# git_io.py — Git subprocess and file IO layer for pitkeel.
#
# IO boundary: all subprocess calls and file reads live here. Analysis
# functions never call these directly — they receive data as arguments.

from __future__ import annotations

import os
import re
import subprocess
from datetime import datetime, timezone

from analysis import Commit, ReserveEntry


def _run(args: list[str], cwd: str | None = None) -> str | None:
    """Run a git command, return stdout or None on failure."""
    try:
        result = subprocess.run(
            args, capture_output=True, text=True, cwd=cwd, timeout=10
        )
        if result.returncode != 0:
            return None
        return result.stdout.strip()
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return None


def repo_root() -> str:
    """Return the repo root, or '.' if not in a git repo."""
    out = _run(["git", "rev-parse", "--show-toplevel"])
    return out if out else "."


def today_commits() -> list[Commit]:
    """Return today's commits, sorted chronologically."""
    today = datetime.now().strftime("%Y-%m-%d")
    out = _run(["git", "log", "--format=%H|%aI|%s", f"--since={today}T00:00:00"])
    if not out:
        return []
    return parse_commit_log(out)


def parse_commit_log(raw: str) -> list[Commit]:
    """Parse piped git log output into Commit objects."""
    commits: list[Commit] = []
    for line in raw.strip().split("\n"):
        if not line:
            continue
        parts = line.split("|", 2)
        if len(parts) < 3:
            continue
        try:
            when = datetime.fromisoformat(parts[1])
        except ValueError:
            continue
        commits.append(Commit(hash=parts[0], when=when, msg=parts[2]))

    commits.sort(key=lambda c: c.when)
    return commits


def commit_files(hash: str) -> list[str]:
    """Return list of files changed in a commit."""
    out = _run(["git", "diff-tree", "--no-commit-id", "-r", "--name-only", hash])
    if not out:
        return []
    return [f for f in out.split("\n") if f]


def head_short() -> str | None:
    """Return short SHA of HEAD."""
    return _run(["git", "rev-parse", "--short", "HEAD"])


def current_branch() -> str | None:
    """Return current branch name."""
    return _run(["git", "rev-parse", "--abbrev-ref", "HEAD"])


def last_commit_subject() -> str | None:
    """Return subject of most recent commit."""
    return _run(["git", "log", "-1", "--format=%s"])


def commits_since_base() -> int | None:
    """Count commits since divergence from main/master."""
    for base in ("master", "main"):
        mb = _run(["git", "merge-base", base, "HEAD"])
        if mb:
            count = _run(["git", "rev-list", "--count", f"{mb}..HEAD"])
            if count:
                try:
                    return int(count)
                except ValueError:
                    pass
    return None


def reserves_tsv_path(root: str) -> str:
    """Return the path to the reserves TSV file."""
    return os.path.join(root, "docs", "operator", "reserves.tsv")


def read_reserves_tsv(root: str) -> list[ReserveEntry]:
    """Read reserves.tsv and return parsed entries.

    Returns empty list if file doesn't exist or has only a header."""
    path = reserves_tsv_path(root)
    if not os.path.exists(path):
        return []

    entries: list[ReserveEntry] = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("datetime"):
                continue  # skip header and empty lines
            parts = line.split("\t")
            if len(parts) < 2:
                continue
            try:
                when = datetime.fromisoformat(parts[0])
                # Normalize naive timestamps to local timezone to prevent
                # TypeError when subtracting from aware datetime [darkcat fix]
                if when.tzinfo is None:
                    when = when.astimezone()
                kind = parts[1]
                if kind in ("meditation", "exercise"):
                    entries.append(ReserveEntry(when=when, kind=kind))
            except ValueError:
                continue

    return entries


VALID_RESERVE_KINDS = ("meditation", "exercise")


def append_reserves_tsv(root: str, kind: str) -> datetime:
    """Append a reserve entry to the TSV. Creates file with header if needed.

    Uses atomic open-check-write pattern to avoid race condition where
    two concurrent calls could both create the file and interleave headers.

    Raises ValueError for unknown reserve types.
    Returns the timestamp that was logged."""
    if kind not in VALID_RESERVE_KINDS:
        raise ValueError(
            f"Unknown reserve type {kind!r}. "
            f"Valid types: {', '.join(VALID_RESERVE_KINDS)}"
        )
    path = reserves_tsv_path(root)
    now = datetime.now().astimezone()

    # Ensure directory exists
    os.makedirs(os.path.dirname(path), exist_ok=True)

    # Open in append mode — atomic on POSIX for short writes.
    # Check if file is empty/new and write header if needed.
    with open(path, "a+") as f:
        f.seek(0, 2)  # seek to end
        if f.tell() == 0:
            f.write("datetime\ttype\n")
        f.write(f"{now.isoformat()}\t{kind}\n")

    return now


def find_last_sd(content: str) -> str:
    """Extract last SD-NNN from session-decisions.md content."""
    last_sd = ""
    for line in content.split("\n"):
        trimmed = line.strip()
        if not trimmed.startswith("| SD-"):
            continue
        # Extract "SD-NNN" from "| SD-228 | ..."
        rest = trimmed[2:]  # skip "| "
        idx = rest.find(" ")
        if idx > 0:
            candidate = rest[:idx]
            if candidate.startswith("SD-"):
                last_sd = candidate
    return last_sd
