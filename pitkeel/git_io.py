# git_io.py — Git subprocess layer for pitkeel.
#
# IO boundary: all subprocess calls live here. Analysis functions
# never call these directly — they receive data as arguments.

from __future__ import annotations

import re
import subprocess
from datetime import datetime, timezone

from analysis import Commit


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
