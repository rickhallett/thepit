#!/usr/bin/env python3
# pitkeel — operational stability signals from git state.
#
# Reads the local repository and surfaces observable signals about
# session behaviour. Does not interpret. Does not diagnose. Instruments.
#
# Ported from Go (tspit-ARCHIVED/pitkeel/main.go).
# Python port uses uv exclusively [SD-310].
#
# Usage:
#   pitkeel              run all signal checks
#   pitkeel session      session duration + break awareness
#   pitkeel scope        scope drift from first commit
#   pitkeel velocity     commits per hour with acceleration
#   pitkeel hook         hook-compatible output (no ANSI, for commit messages)
#   pitkeel context      context file depth distribution
#   pitkeel wellness     daily wellness checks
#   pitkeel state-update --officer <name>  auto-update .keel-state
#   pitkeel north set "Get Hired"          set true_north
#   pitkeel north get                      read true_north
#   pitkeel version      print version

from __future__ import annotations

import os
import sys
from datetime import datetime

from analysis import (
    analyse_context,
    analyse_scope,
    analyse_session,
    analyse_velocity,
    analyse_wellness,
    format_duration_plain,
    render_hook,
)
from git_io import (
    commit_files,
    commits_since_base,
    current_branch,
    find_last_sd,
    head_short,
    last_commit_subject,
    repo_root,
    today_commits,
)
from keelstate import State, read as keel_read, read_modify_write

VERSION = "0.1.0"

VALID_AGENTS = [
    "Weaver",
    "Architect",
    "Sentinel",
    "Watchdog",
    "Analyst",
    "Quartermaster",
    "Keel",
    "Scribe",
    "Janitor",
    "Maturin",
    "AnotherPair",
]


# --------------------------------------------------------------------------
# Terminal rendering (styled) — simplified from Go lipgloss version
# --------------------------------------------------------------------------

# ANSI codes for terminal output
BOLD = "\033[1m"
DIM = "\033[2m"
YELLOW = "\033[33m"
RED = "\033[31m"
CYAN = "\033[36m"
RESET = "\033[0m"


def _title(s: str) -> str:
    return f"{BOLD}{CYAN}{s}{RESET}"


def _accent(s: str) -> str:
    return f"{CYAN}{s}{RESET}"


def _warn(s: str) -> str:
    return f"{YELLOW}{s}{RESET}"


def _error(s: str) -> str:
    return f"{RED}{s}{RESET}"


def _muted(s: str) -> str:
    return f"{DIM}{s}{RESET}"


def render_session_terminal(sig) -> None:
    print(_title("Session"))

    if sig.total_commits_today == 0:
        print(_muted("  No commits today."))
        return

    print(f"  Commits today:      {_accent(str(sig.total_commits_today))}")
    print(f"  Sessions today:     {_accent(str(len(sig.sessions)))}")

    cs = sig.current_session
    print(
        f"  Current session:    {_muted(cs.start.strftime('%H:%M'))} → "
        f"{_muted(cs.end.strftime('%H:%M'))} ({_accent(format_duration_plain(cs.duration))})"
    )
    print(f"  Commits in session: {_accent(str(len(cs.commits)))}")

    if sig.fatigue_level == "severe":
        print()
        print(
            _error(
                "  ⚠ Session exceeds 6 hours. Decision quality is significantly degraded."
            )
        )
        print(_error("    Stop. Checkpoint. Resume with fresh context."))
    elif sig.fatigue_level == "high":
        print()
        print(_warn("  ⚠ Session exceeds 4 hours. Complex decisions made under"))
        print(_warn("    sustained load have a higher error rate. Consider a break."))
    elif sig.fatigue_level == "moderate":
        print()
        print(
            _muted(
                "  Session approaching 3 hours. A short break would reset cognitive load."
            )
        )

    if sig.no_breaks_detected:
        print()
        print(_muted("  No breaks detected (gaps > 30min) in a 2h+ session."))

    from datetime import timedelta

    if sig.time_since_break > timedelta(hours=2):
        print(
            f"  Time since last break: {_warn(format_duration_plain(sig.time_since_break))}"
        )


def render_scope_terminal(sig) -> None:
    print(_title("Scope"))

    if sig.insufficient:
        print(_muted("  Need ≥2 commits to measure scope drift."))
        return

    print(f"  Files in first commit:  {_accent(str(len(sig.first_commit_files)))}")
    print(f"  Total files touched:    {_accent(str(len(sig.total_files)))}")
    print(f"  Files added to scope:   {_accent(str(len(sig.added_files)))}")

    if sig.domain_drift:
        print()
        print(_warn("  ⚠ Work has expanded to new domains:"))
        for d in sig.new_dirs:
            print(f"    → {_accent(d)}")
        print(_muted("    Are these changes serving the original intent?"))
    elif sig.file_drift:
        print()
        print(_warn("  ⚠ Scope has more than doubled since the first commit."))
        print(_warn("    Are all these changes serving the original intent?"))


def render_velocity_terminal(sig) -> None:
    print(_title("Velocity"))

    if sig.insufficient:
        print(_muted("  Need ≥2 commits to measure velocity."))
        return

    print(f"  Commits/hour: {_accent(f'{sig.total_rate:.1f}')}")

    if sig.accelerating:
        print()
        print(
            _warn(
                f"  ⚠ Velocity increased {sig.acceleration_pct:.0f}% in the second half of the session."
            )
        )
        print(
            _warn(
                "    Accelerating commits can indicate verification is being compressed."
            )
        )

    if sig.rapid_fire_warn:
        print()
        print(f"  Rapid-fire commits (<5min apart): {_warn(str(sig.rapid_fire))}")
        print(_muted("  Are gates running between each commit?"))


def render_wellness_terminal(sig) -> None:
    print(_title("Wellness") + _muted(f"  {sig.date}"))

    if sig.whoop_present:
        print(_accent("  ✓ Whoop.log complete"))
    else:
        print(_warn("  ✗ Whoop.log not found"))
        print(f"    Expected: {_muted(sig.whoop_path)}")

    if sig.captains_log_present:
        print(_accent("  ✓ Captain's log complete"))
    else:
        print(_warn("  ✗ Captain's log not found"))
        print(f"    Expected: {_muted(sig.captains_log_path)}")


def render_context_terminal(sig) -> None:
    print(_title("Context"))

    if sig.total == 0:
        print(_muted("  No .md files found in docs/internal/"))
        return

    print(
        f"  {_accent(f'd1:{sig.d1_ratio:.2f} / d2:{sig.d2_ratio:.2f} / d3+:{sig.d3_ratio:.2f}')}"
    )

    if sig.d1_warning:
        print(
            _warn(
                "  ⚠ depth-1 ratio exceeds 0.20 — context pollution may be creeping back"
            )
        )


# --------------------------------------------------------------------------
# Commands
# --------------------------------------------------------------------------


def cmd_all() -> None:
    root = repo_root()
    commits = today_commits()
    now = datetime.now().astimezone()

    render_session_terminal(analyse_session(commits, now))
    print()
    render_scope_terminal(analyse_scope(commits, lambda h: commit_files(h)))
    print()
    render_velocity_terminal(analyse_velocity(commits))
    print()
    render_wellness_terminal(analyse_wellness(now, root))
    print()
    render_context_terminal(analyse_context(root))


def cmd_session() -> None:
    commits = today_commits()
    now = datetime.now().astimezone()
    render_session_terminal(analyse_session(commits, now))


def cmd_scope() -> None:
    commits = today_commits()
    render_scope_terminal(analyse_scope(commits, lambda h: commit_files(h)))


def cmd_velocity() -> None:
    commits = today_commits()
    render_velocity_terminal(analyse_velocity(commits))


def cmd_wellness() -> None:
    root = repo_root()
    now = datetime.now().astimezone()
    render_wellness_terminal(analyse_wellness(now, root))


def cmd_context() -> None:
    root = repo_root()
    render_context_terminal(analyse_context(root))


def cmd_hook() -> None:
    root = repo_root()
    commits = today_commits()
    now = datetime.now().astimezone()
    output = render_hook(
        analyse_session(commits, now),
        analyse_scope(commits, lambda h: commit_files(h)),
        analyse_velocity(commits),
        analyse_context(root),
    )
    print(output, end="")


def cmd_state_update(args: list[str]) -> None:
    officer = ""

    # Parse --officer flag
    i = 0
    while i < len(args):
        if args[i] == "--officer" and i + 1 < len(args):
            officer = args[i + 1]
            i += 2
        else:
            i += 1

    if not officer:
        officer = os.environ.get("KEEL_OFFICER", "")

    if not officer:
        print(
            "keel: state-update ABORTED — --officer flag is required", file=sys.stderr
        )
        print("", file=sys.stderr)
        print("  pitkeel state-update --officer <agent-name>", file=sys.stderr)
        print("", file=sys.stderr)
        print("  Or set KEEL_OFFICER in your environment:", file=sys.stderr)
        print("    export KEEL_OFFICER=Weaver", file=sys.stderr)
        print("", file=sys.stderr)
        print(f"  Valid agents: {', '.join(VALID_AGENTS)}", file=sys.stderr)
        sys.exit(1)

    root = repo_root()

    def update(s: State) -> None:
        # Auto-derive: head
        h = head_short()
        if h:
            s.head = h

        # Auto-derive: sd (last SD-NNN from session-decisions.md)
        sd_path = os.path.join(root, "docs", "internal", "session-decisions.md")
        try:
            with open(sd_path) as f:
                last_sd = find_last_sd(f.read())
                if last_sd:
                    s.sd = last_sd
        except FileNotFoundError:
            pass

        # Auto-derive: bearing
        branch = current_branch()
        if branch:
            work = branch
            for prefix in ("feat/", "fix/", "chore/", "refactor/"):
                if branch.startswith(prefix):
                    work = branch[len(prefix) :]
                    break
            s.bearing.work = work

        # commits since divergence
        count = commits_since_base()
        if count is not None:
            s.bearing.commits = count

        # last commit subject
        subj = last_commit_subject()
        if subj:
            s.bearing.last = subj

        # note: preserve existing (never overwritten by pitkeel)

        # Officer
        s.officer = officer

    read_modify_write(root, update)


def cmd_north(args: list[str]) -> None:
    if not args:
        print("keel: north requires a subcommand", file=sys.stderr)
        print('  pitkeel north set "Get Hired"', file=sys.stderr)
        print("  pitkeel north get", file=sys.stderr)
        sys.exit(1)

    root = repo_root()

    if args[0] == "set":
        if len(args) < 2:
            print("keel: north set requires a value", file=sys.stderr)
            print('  pitkeel north set "Get Hired"', file=sys.stderr)
            sys.exit(1)
        value = " ".join(args[1:])

        def set_north(s: State) -> None:
            s.true_north = value

        read_modify_write(root, set_north)
        print(f"True North set: {value}")

    elif args[0] == "get":
        state = keel_read(root)
        if not state.true_north:
            print("keel: true_north not set", file=sys.stderr)
            print('  pitkeel north set "Get Hired"', file=sys.stderr)
            sys.exit(1)
        print(state.true_north)

    else:
        print(f"keel: unknown north subcommand {args[0]!r}", file=sys.stderr)
        sys.exit(1)


def usage() -> None:
    print(f"{_title('pitkeel')} — operational stability signals")
    print()
    print(_muted("Usage:"))
    print("  pitkeel              run all signal checks")
    print("  pitkeel session      session duration + break awareness")
    print("  pitkeel scope        scope drift from first commit")
    print("  pitkeel velocity     commits per hour")
    print("  pitkeel context      context file depth distribution")
    print("  pitkeel wellness     daily wellness checks (whoop.log, captain's log)")
    print("  pitkeel hook         hook output (no ANSI, for commit messages)")
    print("  pitkeel state-update --officer <name>  auto-update .keel-state")
    print('  pitkeel north set "Get Hired"         set true_north (Captain-only)')
    print("  pitkeel north get                     read true_north")
    print("  pitkeel version      print version")


def main() -> None:
    args = sys.argv[1:]

    if not args:
        cmd_all()
        return

    cmd = args[0]

    if cmd == "session":
        cmd_session()
    elif cmd == "scope":
        cmd_scope()
    elif cmd == "velocity":
        cmd_velocity()
    elif cmd == "wellness":
        cmd_wellness()
    elif cmd == "context":
        cmd_context()
    elif cmd == "hook":
        cmd_hook()
    elif cmd == "state-update":
        cmd_state_update(args[1:])
    elif cmd == "north":
        cmd_north(args[1:])
    elif cmd == "version":
        print(VERSION)
    elif cmd in ("-h", "--help", "help"):
        usage()
    else:
        usage()
        sys.exit(1)


if __name__ == "__main__":
    main()
