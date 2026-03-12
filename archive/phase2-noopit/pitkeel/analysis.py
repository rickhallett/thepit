# analysis.py — Pure analysis functions for pitkeel signals.
#
# Ported from Go (tspit-ARCHIVED/pitkeel/main.go). All functions are
# pure: they take data in, return typed results. No IO, no subprocess,
# no file access. Testable in isolation.

from __future__ import annotations

import os
import os.path
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Callable


# --------------------------------------------------------------------------
# Data types
# --------------------------------------------------------------------------


@dataclass
class Commit:
    hash: str
    when: datetime
    msg: str


# --------------------------------------------------------------------------
# Session analysis
# --------------------------------------------------------------------------

SESSION_BREAK_THRESHOLD = timedelta(minutes=30)


@dataclass
class Session:
    commits: list[Commit] = field(default_factory=list)
    start: datetime = field(default_factory=datetime.now)
    end: datetime = field(default_factory=datetime.now)
    duration: timedelta = field(default_factory=timedelta)


@dataclass
class SessionSignal:
    total_commits_today: int = 0
    sessions: list[Session] = field(default_factory=list)
    current_session: Session = field(default_factory=Session)
    fatigue_level: str = "none"  # none, mild, moderate, high, severe
    time_since_break: timedelta = field(default_factory=timedelta)
    no_breaks_detected: bool = False


def _make_session(commits: list[Commit]) -> Session:
    s = Session(
        commits=commits,
        start=commits[0].when,
        end=commits[-1].when,
    )
    s.duration = s.end - s.start
    return s


def _segment_sessions(commits: list[Commit]) -> list[Session]:
    if not commits:
        return []

    sessions: list[Session] = []
    start = 0

    for i in range(1, len(commits)):
        gap = commits[i].when - commits[i - 1].when
        if gap > SESSION_BREAK_THRESHOLD:
            sessions.append(_make_session(commits[start:i]))
            start = i

    sessions.append(_make_session(commits[start:]))
    return sessions


def analyse_session(commits: list[Commit], now: datetime) -> SessionSignal:
    sig = SessionSignal()
    if not commits:
        return sig

    sig.total_commits_today = len(commits)
    sig.sessions = _segment_sessions(commits)
    sig.current_session = sig.sessions[-1]

    # Fatigue based on current session duration
    d = sig.current_session.duration
    if d >= timedelta(hours=6):
        sig.fatigue_level = "severe"
    elif d >= timedelta(hours=4):
        sig.fatigue_level = "high"
    elif d >= timedelta(hours=3):
        sig.fatigue_level = "moderate"
    elif d >= timedelta(hours=2):
        sig.fatigue_level = "mild"
    else:
        sig.fatigue_level = "none"

    # Time since last break
    if len(sig.sessions) > 1:
        sig.time_since_break = now - sig.current_session.start
    else:
        sig.time_since_break = now - commits[0].when
        if sig.current_session.duration > timedelta(hours=2):
            sig.no_breaks_detected = True

    return sig


# --------------------------------------------------------------------------
# Scope analysis
# --------------------------------------------------------------------------

FileResolver = Callable[[str], list[str]]


@dataclass
class ScopeSignal:
    insufficient: bool = False
    first_commit_files: list[str] = field(default_factory=list)
    total_files: list[str] = field(default_factory=list)
    added_files: list[str] = field(default_factory=list)
    first_dirs: set[str] = field(default_factory=set)
    new_dirs: list[str] = field(default_factory=list)
    domain_drift: bool = False
    file_drift: bool = False


def _top_level_dirs(files: list[str]) -> set[str]:
    dirs: set[str] = set()
    for f in files:
        parts = f.split("/", 1)
        if parts:
            dirs.add(parts[0])
    return dirs


def analyse_scope(
    commits: list[Commit],
    resolver: FileResolver,
    sessions: list[Session] | None = None,
) -> ScopeSignal:
    """Scope drift detection. If sessions are provided, measures drift within
    the current session only — domains that appear in the current session but
    weren't touched in the session's first commit. Without sessions, falls
    back to whole-commit-list behaviour (first commit vs all)."""
    sig = ScopeSignal()
    if len(commits) < 2:
        sig.insufficient = True
        return sig

    # Determine which commits to measure scope over.
    # When sessions are provided, scope is session-only. If the current
    # session has <2 commits, there's nothing to compare — report insufficient.
    if sessions is not None:
        if not sessions or len(sessions[-1].commits) < 2:
            sig.insufficient = True
            return sig
        scope_commits = sessions[-1].commits
    else:
        scope_commits = commits

    sig.first_commit_files = resolver(scope_commits[0].hash)

    # Collect all unique files in the scope window
    seen: set[str] = set()
    for c in scope_commits:
        for f in resolver(c.hash):
            if f not in seen:
                seen.add(f)
                sig.total_files.append(f)

    # New files (not in first commit of scope window)
    initial = set(sig.first_commit_files)
    sig.added_files = [f for f in sig.total_files if f not in initial]

    # Directory-level drift
    sig.first_dirs = _top_level_dirs(sig.first_commit_files)
    added_dirs = _top_level_dirs(sig.added_files)

    sig.new_dirs = sorted(d for d in added_dirs if d not in sig.first_dirs)
    sig.domain_drift = len(sig.new_dirs) > 0
    sig.file_drift = len(sig.added_files) > len(sig.first_commit_files) * 2

    return sig


# --------------------------------------------------------------------------
# Velocity analysis
# --------------------------------------------------------------------------


@dataclass
class VelocitySignal:
    insufficient: bool = False
    total_rate: float = 0.0  # commits per hour
    hours: float = 0.0
    accelerating: bool = False
    acceleration_pct: float = 0.0
    rapid_fire: int = 0  # count of intervals < 5min
    rapid_fire_warn: bool = False


def analyse_velocity(commits: list[Commit]) -> VelocitySignal:
    sig = VelocitySignal()
    if len(commits) < 2:
        sig.insufficient = True
        return sig

    first = commits[0].when
    last = commits[-1].when
    sig.hours = (last - first).total_seconds() / 3600
    if sig.hours < 0.01:
        sig.hours = 0.01

    sig.total_rate = len(commits) / sig.hours

    # Time-based midpoint split (not count-based)
    mid_time = first + (last - first) / 2
    first_half = [c for c in commits if c.when < mid_time]
    second_half = [c for c in commits if c.when >= mid_time]

    if len(first_half) >= 2 and len(second_half) >= 2:
        h1 = (first_half[-1].when - first_half[0].when).total_seconds() / 3600
        h2 = (second_half[-1].when - second_half[0].when).total_seconds() / 3600
        if h1 < 0.01:
            h1 = 0.01
        if h2 < 0.01:
            h2 = 0.01
        r1 = len(first_half) / h1
        r2 = len(second_half) / h2

        if r1 > 0 and r2 > r1 * 1.5:
            sig.accelerating = True
            sig.acceleration_pct = (r2 / r1 - 1) * 100

    # Rapid-fire detection
    for i in range(1, len(commits)):
        if (commits[i].when - commits[i - 1].when) < timedelta(minutes=5):
            sig.rapid_fire += 1
    sig.rapid_fire_warn = sig.rapid_fire >= 2

    return sig


# --------------------------------------------------------------------------
# Wellness analysis
# --------------------------------------------------------------------------


@dataclass
class WellnessSignal:
    operators_log_present: bool = False
    operators_log_path: str = ""
    date: str = ""


def analyse_wellness(now: datetime, root: str) -> WellnessSignal:
    date_str = now.strftime("%Y-%m-%d")
    year = now.strftime("%Y")
    month = now.strftime("%m")
    day = now.strftime("%d")

    sig = WellnessSignal(
        date=date_str,
        operators_log_path=os.path.join(
            root, "docs", "internal", "operator", "operatorslog", year, month, f"{day}.md"
        ),
    )
    sig.operators_log_present = os.path.exists(sig.operators_log_path)
    return sig


# --------------------------------------------------------------------------
# Context analysis
# --------------------------------------------------------------------------


@dataclass
class ContextSignal:
    d1_count: int = 0
    d2_count: int = 0
    d3_count: int = 0
    total: int = 0
    d1_ratio: float = 0.0
    d2_ratio: float = 0.0
    d3_ratio: float = 0.0
    d1_warning: bool = False  # true if d1_ratio > 0.20


def analyse_context(root: str) -> ContextSignal:
    sig = ContextSignal()
    base = os.path.join(root, "docs", "internal")

    if not os.path.isdir(base):
        return sig

    for dirpath, _dirnames, filenames in os.walk(base):
        for fname in filenames:
            if not fname.endswith(".md"):
                continue

            full = os.path.join(dirpath, fname)
            rel = os.path.relpath(full, base)
            # Depth = number of path separators
            depth = rel.count(os.sep)

            if depth == 0:
                sig.d1_count += 1
            elif depth == 1:
                sig.d2_count += 1
            else:
                sig.d3_count += 1
            sig.total += 1

    if sig.total > 0:
        sig.d1_ratio = sig.d1_count / sig.total
        sig.d2_ratio = sig.d2_count / sig.total
        sig.d3_ratio = sig.d3_count / sig.total

    sig.d1_warning = sig.d1_ratio > 0.20
    return sig


# --------------------------------------------------------------------------
# Reserves analysis
# --------------------------------------------------------------------------


@dataclass
class ReserveEntry:
    when: datetime
    kind: str  # "meditation" or "exercise"


@dataclass
class ReserveStatus:
    last: datetime | None = None
    elapsed: timedelta = field(default_factory=timedelta)
    remaining: timedelta = field(default_factory=lambda: timedelta(hours=24))
    severity: str = "nominal"  # nominal, warning, urgent, final, depleted


@dataclass
class ReservesSignal:
    meditation: ReserveStatus = field(default_factory=ReserveStatus)
    exercise: ReserveStatus = field(default_factory=ReserveStatus)
    any_depleted: bool = False
    shutdown_required: bool = False


RESERVES_LIMIT = timedelta(hours=24)
RESERVES_WARN = timedelta(hours=18)  # 6h remaining
RESERVES_URGENT = timedelta(hours=23)  # 1h remaining
RESERVES_FINAL = timedelta(hours=23, minutes=50)  # 10min remaining


def _reserve_status(last: datetime | None, now: datetime) -> ReserveStatus:
    """Compute reserve status for a single reserve type."""
    status = ReserveStatus()
    if last is None:
        # No record — treat as depleted
        status.severity = "depleted"
        status.remaining = timedelta(0)
        return status

    status.last = last
    status.elapsed = now - last
    status.remaining = max(RESERVES_LIMIT - status.elapsed, timedelta(0))

    if status.elapsed >= RESERVES_LIMIT:
        status.severity = "depleted"
    elif status.elapsed >= RESERVES_FINAL:
        status.severity = "final"
    elif status.elapsed >= RESERVES_URGENT:
        status.severity = "urgent"
    elif status.elapsed >= RESERVES_WARN:
        status.severity = "warning"
    else:
        status.severity = "nominal"

    return status


def analyse_reserves(entries: list[ReserveEntry], now: datetime) -> ReservesSignal:
    """Analyse reserves state from logged entries.

    Pure function: takes entries and current time, returns signal.
    Does not read files or invoke side effects."""
    sig = ReservesSignal()

    # Find most recent entry of each type
    last_meditation: datetime | None = None
    last_exercise: datetime | None = None

    for entry in entries:
        if entry.kind == "meditation":
            if last_meditation is None or entry.when > last_meditation:
                last_meditation = entry.when
        elif entry.kind == "exercise":
            if last_exercise is None or entry.when > last_exercise:
                last_exercise = entry.when

    sig.meditation = _reserve_status(last_meditation, now)
    sig.exercise = _reserve_status(last_exercise, now)
    sig.any_depleted = (
        sig.meditation.severity == "depleted" or sig.exercise.severity == "depleted"
    )
    sig.shutdown_required = sig.any_depleted

    return sig


# --------------------------------------------------------------------------
# Session noise (ultradian cycle awareness)
# --------------------------------------------------------------------------

ULTRADIAN_CYCLE = timedelta(minutes=90)
SESSION_ADVISORY = timedelta(hours=2)
SESSION_DANGER = timedelta(hours=3)


@dataclass
class SessionNoiseSignal:
    duration: timedelta = field(default_factory=timedelta)
    level: str = "quiet"  # quiet, note, advisory, warning
    message: str = ""


def analyse_session_noise(session_duration: timedelta) -> SessionNoiseSignal:
    """Progressive session noise based on ultradian cycles.

    Supplements existing fatigue detection with earlier, more direct messages.
    Pure function."""
    sig = SessionNoiseSignal(duration=session_duration)

    if session_duration >= SESSION_DANGER:
        sig.level = "warning"
        sig.message = "Danger threshold. Flow state masks fatigue."
    elif session_duration >= SESSION_ADVISORY:
        sig.level = "advisory"
        sig.message = "Consider a break. Cognitive load accumulating."
    elif session_duration >= ULTRADIAN_CYCLE:
        sig.level = "note"
        sig.message = "Ultradian cycle complete. Break optimal."
    else:
        sig.level = "quiet"

    return sig


# --------------------------------------------------------------------------
# Hook output (plain text, for commit message appending)
# --------------------------------------------------------------------------


def format_duration_plain(d: timedelta) -> str:
    total_minutes = int(d.total_seconds() / 60)
    h = total_minutes // 60
    m = total_minutes % 60
    if h > 0:
        return f"{h}h {m}m"
    return f"{m}m"


def render_hook(
    sess: SessionSignal,
    scope: ScopeSignal,
    vel: VelocitySignal,
    ctx: ContextSignal | None = None,
) -> str:
    """Return hook output lines. Plain text, no ANSI."""
    signals: list[str] = []

    # Session signals — only surface when actionable
    if sess.total_commits_today > 0:
        if sess.fatigue_level != "none":
            cs = sess.current_session
            signals.append(
                f"session: {format_duration_plain(cs.duration)} "
                f"({len(cs.commits)} commits, {sess.fatigue_level} fatigue)"
            )
        if sess.no_breaks_detected:
            signals.append("session: no breaks in 2h+ session")

    # Scope signals
    if not scope.insufficient:
        if scope.domain_drift:
            shown = scope.new_dirs[:3]
            suffix = f" +{len(scope.new_dirs) - 3}" if len(scope.new_dirs) > 3 else ""
            signals.append(f"scope: drift to new domains [{', '.join(shown)}{suffix}]")

    # Velocity signals
    if not vel.insufficient:
        if vel.accelerating:
            signals.append(
                f"velocity: +{vel.acceleration_pct:.0f}% acceleration in second half"
            )
        if vel.rapid_fire_warn:
            signals.append(f"velocity: {vel.rapid_fire} rapid-fire intervals (<5min)")

    # Context signals — always include
    if ctx and ctx.total > 0:
        signals.append(
            f"context: d1:{ctx.d1_ratio:.2f} / d2:{ctx.d2_ratio:.2f} / d3+:{ctx.d3_ratio:.2f}"
        )
        if ctx.d1_warning:
            signals.append("context: d1 ratio high (>0.20)")

    if not signals:
        return "keel: nominal\n"

    return "".join(f"keel: {s}\n" for s in signals)
