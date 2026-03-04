# test_analysis.py — Intent tests for pitkeel analysis functions.
#
# Ported from Go (tspit-ARCHIVED/pitkeel/main_test.go).
# Each test documents INTENT, not just mechanics.

from __future__ import annotations

import os
import tempfile
from datetime import datetime, timedelta, timezone

import pytest

from analysis import (
    Commit,
    analyse_context,
    analyse_scope,
    analyse_session,
    analyse_velocity,
    analyse_wellness,
    render_hook,
)


# Helper: create a commit at a specific offset from a base time.
def c(base: datetime, offset_min: int, msg: str) -> Commit:
    return Commit(
        hash=f"abc{msg}",
        when=base + timedelta(minutes=offset_min),
        msg=msg,
    )


# ==========================================================================
# Session Signal — Intent Tests
# ==========================================================================


class TestSession:
    def test_five_hour_continuous_triggers_high_fatigue(self):
        """Intent: a 5-hour continuous session (no gaps > 30min) triggers high fatigue."""
        base = datetime(2026, 2, 21, 9, 0, 0, tzinfo=timezone.utc)
        commits = [
            c(base, 0, "start"),
            c(base, 25, "mid1"),
            c(base, 50, "mid2"),
            c(base, 75, "mid3"),
            c(base, 100, "mid4"),
            c(base, 125, "mid5"),
            c(base, 150, "mid6"),
            c(base, 175, "mid7"),
            c(base, 200, "mid8"),
            c(base, 225, "mid9"),
            c(base, 250, "mid10"),
            c(base, 275, "mid11"),
            c(base, 300, "end"),  # +5h, gaps of 25min — no breaks
        ]
        now = base + timedelta(hours=5, minutes=10)

        sig = analyse_session(commits, now)

        assert sig.fatigue_level in ("high", "severe")

    def test_five_hour_span_with_long_break_no_fatigue(self):
        """Intent: 5 calendar hours but a 2-hour break means the current session is ~2h."""
        base = datetime(2026, 2, 21, 9, 0, 0, tzinfo=timezone.utc)
        commits = [
            c(base, 0, "morning-start"),
            c(base, 60, "morning-end"),  # 09:00-10:00 = session 1
            c(base, 180, "after-lunch1"),  # 12:00 — 2h gap = break
            c(base, 240, "after-lunch2"),  # 13:00
            c(base, 300, "after-lunch3"),  # 14:00 — session 2 is 12:00-14:00 = 2h
        ]
        now = base + timedelta(hours=5, minutes=10)

        sig = analyse_session(commits, now)

        assert sig.fatigue_level not in ("high", "severe"), (
            f"expected no high fatigue with 2h break, got {sig.fatigue_level!r} "
            f"(current session: {sig.current_session.duration})"
        )

    def test_multiple_breaks_reports_current_session_only(self):
        """Intent: three sessions separated by breaks. Duration is for current session only."""
        base = datetime(2026, 2, 21, 8, 0, 0, tzinfo=timezone.utc)
        commits = [
            c(base, 0, "s1-start"),
            c(base, 20, "s1-end"),
            # 40-min gap = break
            c(base, 60, "s2-start"),
            c(base, 80, "s2-end"),
            # 40-min gap = break
            c(base, 120, "s3-start"),
            c(base, 140, "s3-end"),
        ]
        now = base + timedelta(minutes=145)

        sig = analyse_session(commits, now)

        assert len(sig.sessions) == 3
        assert sig.current_session.duration <= timedelta(minutes=30)
        assert sig.fatigue_level == "none"

    def test_single_commit_no_fatigue(self):
        """Intent: a single commit provides no session signal."""
        base = datetime(2026, 2, 21, 9, 0, 0, tzinfo=timezone.utc)
        commits = [c(base, 0, "only")]
        now = base + timedelta(minutes=10)

        sig = analyse_session(commits, now)

        assert sig.fatigue_level == "none"

    def test_two_hour_no_breaks_detected(self):
        """Intent: a 2.5h continuous session surfaces 'no breaks detected'."""
        base = datetime(2026, 2, 21, 9, 0, 0, tzinfo=timezone.utc)
        commits = [
            c(base, 0, "start"),
            c(base, 25, "a"),
            c(base, 50, "b"),
            c(base, 75, "c"),
            c(base, 100, "d"),
            c(base, 125, "e"),
            c(base, 150, "end"),  # 2h 30m total
        ]
        now = base + timedelta(minutes=155)

        sig = analyse_session(commits, now)

        assert sig.no_breaks_detected

    def test_graduated_fatigue_levels(self):
        """Intent: fatigue is graduated, not a single cliff."""
        base = datetime(2026, 2, 21, 9, 0, 0, tzinfo=timezone.utc)

        cases = [
            (90, "none"),  # 1.5h — no fatigue
            (130, "mild"),  # 2h 10m — mild
            (200, "moderate"),  # 3h 20m — moderate
            (260, "high"),  # 4h 20m — high
            (380, "severe"),  # 6h 20m — severe
        ]

        for duration_min, expected_level in cases:
            commits = [c(base, 0, "start")]
            for m in range(20, duration_min, 20):
                commits.append(c(base, m, "work"))
            commits.append(c(base, duration_min, "end"))

            now = base + timedelta(minutes=duration_min + 5)
            sig = analyse_session(commits, now)

            assert sig.fatigue_level == expected_level, (
                f"duration {duration_min}min: expected fatigue {expected_level!r}, "
                f"got {sig.fatigue_level!r}"
            )


# ==========================================================================
# Scope Signal — Intent Tests
# ==========================================================================


class TestScope:
    def test_new_directory_triggers_domain_drift(self):
        """Intent: touching files in a new top-level directory = scope drift."""
        base = datetime(2026, 2, 21, 9, 0, 0, tzinfo=timezone.utc)
        commits = [
            c(base, 0, "initial"),
            c(base, 30, "drifted"),
        ]

        def resolver(hash: str) -> list[str]:
            if hash == commits[0].hash:
                return ["lib/credits.ts", "tests/credits.test.ts"]
            return ["app/api/new-route/route.ts", "lib/eas.ts"]

        sig = analyse_scope(commits, resolver)

        assert sig.domain_drift
        assert "app" in sig.new_dirs

    def test_same_directory_no_drift(self):
        """Intent: touching more files in the SAME directory = no scope drift."""
        base = datetime(2026, 2, 21, 9, 0, 0, tzinfo=timezone.utc)
        commits = [
            c(base, 0, "initial"),
            c(base, 30, "more-work"),
        ]

        def resolver(hash: str) -> list[str]:
            if hash == commits[0].hash:
                return ["lib/bout-engine.ts"]
            return ["lib/bout-engine-helpers.ts", "lib/bout-engine.test.ts"]

        sig = analyse_scope(commits, resolver)

        assert not sig.domain_drift

    def test_directory_boundaries_not_file_count(self):
        """Intent: 2 files in 2 new dirs is worse than 4 files in same dir."""
        base = datetime(2026, 2, 21, 9, 0, 0, tzinfo=timezone.utc)
        commits = [
            c(base, 0, "initial"),
            c(base, 30, "spread"),
        ]

        def resolver(hash: str) -> list[str]:
            if hash == commits[0].hash:
                return ["lib/credits.ts"]
            return ["app/page.tsx", "components/arena.tsx"]

        sig = analyse_scope(commits, resolver)

        assert sig.domain_drift
        assert len(sig.new_dirs) == 2

    def test_insufficient_commits(self):
        """Intent: scope drift requires >= 2 commits."""
        commits = [Commit(hash="abc", when=datetime.now(timezone.utc), msg="only")]
        sig = analyse_scope(commits, lambda _: [])

        assert sig.insufficient


# ==========================================================================
# Velocity Signal — Intent Tests
# ==========================================================================


class TestVelocity:
    def test_four_commits_in_ten_minutes_is_rapid_fire(self):
        """Intent: 4 commits in 10 minutes triggers rapid-fire warning."""
        base = datetime(2026, 2, 21, 9, 0, 0, tzinfo=timezone.utc)
        commits = [
            c(base, 0, "a"),
            c(base, 3, "b"),
            c(base, 6, "c"),
            c(base, 9, "d"),
        ]

        sig = analyse_velocity(commits)

        assert sig.rapid_fire_warn

    def test_acceleration_in_second_half(self):
        """Intent: sparse first half → dense second half triggers acceleration warning."""
        base = datetime(2026, 2, 21, 9, 0, 0, tzinfo=timezone.utc)
        commits = [
            c(base, 0, "slow1"),
            c(base, 60, "slow2"),
            c(base, 120, "slow3"),  # first 2h: 3 commits
            c(base, 130, "fast1"),
            c(base, 140, "fast2"),
            c(base, 150, "fast3"),
            c(base, 160, "fast4"),
            c(base, 170, "fast5"),
            c(base, 180, "fast6"),  # second hour: 6 commits in 50min
        ]

        sig = analyse_velocity(commits)

        assert sig.accelerating

    def test_uniform_no_acceleration(self):
        """Intent: evenly-spaced commits do NOT trigger acceleration."""
        base = datetime(2026, 2, 21, 9, 0, 0, tzinfo=timezone.utc)
        commits = [
            c(base, 0, "a"),
            c(base, 30, "b"),
            c(base, 60, "c"),
            c(base, 90, "d"),
            c(base, 120, "e"),
            c(base, 150, "f"),
        ]

        sig = analyse_velocity(commits)

        assert not sig.accelerating

    def test_two_commits_five_min_apart_no_rapid_fire(self):
        """Intent: a single pair <5min apart is NOT rapid-fire (needs a pattern)."""
        base = datetime(2026, 2, 21, 9, 0, 0, tzinfo=timezone.utc)
        commits = [
            c(base, 0, "a"),
            c(base, 3, "b"),
        ]

        sig = analyse_velocity(commits)

        assert not sig.rapid_fire_warn  # threshold is 2 intervals

    def test_time_based_midpoint_not_count_based(self):
        """Intent: midpoint split uses time, not commit count."""
        base = datetime(2026, 2, 21, 9, 0, 0, tzinfo=timezone.utc)
        commits = [
            c(base, 0, "a"),
            c(base, 8, "b"),
            c(base, 16, "c"),
            c(base, 24, "d"),
            c(base, 32, "e"),
            c(base, 40, "f"),
            c(base, 48, "g"),
            c(base, 56, "h"),  # 8 commits in first hour
            c(base, 120, "slow1"),  # 2 commits in second hour
            c(base, 180, "slow2"),
        ]

        sig = analyse_velocity(commits)

        assert not sig.accelerating

    def test_insufficient_commits(self):
        sig = analyse_velocity(
            [Commit(hash="abc", when=datetime.now(timezone.utc), msg="only")]
        )
        assert sig.insufficient


# ==========================================================================
# Wellness Signal — Intent Tests
# ==========================================================================


class TestWellness:
    def test_missing_files_detected(self):
        """Intent: when neither whoop nor captainslog exists, both are flagged."""
        with tempfile.TemporaryDirectory() as tmpdir:
            now = datetime(2026, 2, 23, 4, 0, 0, tzinfo=timezone.utc)
            sig = analyse_wellness(now, tmpdir)

            assert not sig.whoop_present
            assert not sig.captains_log_present
            assert sig.date == "2026-02-23"

    def test_present_files_detected(self):
        """Intent: when both files exist, both are flagged as present."""
        with tempfile.TemporaryDirectory() as tmpdir:
            now = datetime(2026, 2, 23, 4, 0, 0, tzinfo=timezone.utc)

            whoop_dir = os.path.join(tmpdir, "docs", "internal", "doctor", "captain")
            log_dir = os.path.join(
                tmpdir, "docs", "internal", "captain", "captainslog", "2026", "02"
            )
            os.makedirs(whoop_dir)
            os.makedirs(log_dir)
            with open(os.path.join(whoop_dir, "whoop-2026-02-23.log"), "w") as f:
                f.write("done")
            with open(os.path.join(log_dir, "23.md"), "w") as f:
                f.write("# Log")

            sig = analyse_wellness(now, tmpdir)

            assert sig.whoop_present
            assert sig.captains_log_present

    def test_partial_presence(self):
        """Intent: one file present, one missing — each reported independently."""
        with tempfile.TemporaryDirectory() as tmpdir:
            now = datetime(2026, 2, 23, 4, 0, 0, tzinfo=timezone.utc)

            log_dir = os.path.join(
                tmpdir, "docs", "internal", "captain", "captainslog", "2026", "02"
            )
            os.makedirs(log_dir)
            with open(os.path.join(log_dir, "23.md"), "w") as f:
                f.write("# Log")

            sig = analyse_wellness(now, tmpdir)

            assert not sig.whoop_present
            assert sig.captains_log_present


# ==========================================================================
# Hook Output — Intent Tests
# ==========================================================================


class TestHook:
    def test_nominal_session_produces_nominal_output(self):
        """Intent: a clean session produces 'keel: nominal' — no noise in commit messages."""
        base = datetime(2026, 2, 21, 9, 0, 0, tzinfo=timezone.utc)
        commits = [
            c(base, 0, "start"),
            c(base, 30, "end"),
        ]
        now = base + timedelta(minutes=35)

        sess = analyse_session(commits, now)
        scope = analyse_scope(commits, lambda _: ["lib/a.ts"])
        vel = analyse_velocity(commits)

        assert sess.fatigue_level == "none"
        assert not scope.domain_drift
        assert not vel.accelerating
        assert not vel.rapid_fire_warn

        output = render_hook(sess, scope, vel)
        assert output == "keel: nominal\n"


# ==========================================================================
# Cross-signal — Compound Tests
# ==========================================================================


class TestCompound:
    def test_fatigue_and_scope_drift_both_surface(self):
        """Intent: when both fatigue and scope drift are present, both are surfaced."""
        base = datetime(2026, 2, 21, 9, 0, 0, tzinfo=timezone.utc)
        commits = [c(base, 0, "start")]
        for m in range(20, 260, 20):
            commits.append(c(base, m, "work"))
        commits.append(c(base, 260, "drift"))
        now = base + timedelta(minutes=265)

        sess_sig = analyse_session(commits, now)
        scope_sig = analyse_scope(
            commits,
            lambda hash: (
                ["lib/credits.ts"]
                if hash == commits[0].hash
                else ["app/new-route.ts", "components/widget.tsx"]
            ),
        )

        assert sess_sig.fatigue_level == "high"
        assert scope_sig.domain_drift

    def test_short_focused_session_no_signals(self):
        """Intent: a clean, compact session in a single domain = no warnings."""
        base = datetime(2026, 2, 21, 9, 0, 0, tzinfo=timezone.utc)
        commits = [
            c(base, 0, "start"),
            c(base, 20, "mid"),
            c(base, 40, "end"),
        ]
        now = base + timedelta(minutes=45)

        sess_sig = analyse_session(commits, now)
        scope_sig = analyse_scope(
            commits, lambda _: ["lib/credits.ts", "tests/credits.test.ts"]
        )
        vel_sig = analyse_velocity(commits)

        assert sess_sig.fatigue_level == "none"
        assert not scope_sig.domain_drift
        assert not vel_sig.accelerating
        assert not vel_sig.rapid_fire_warn


# ==========================================================================
# Keelstate — Intent Tests
# ==========================================================================


class TestKeelstate:
    def test_read_nonexistent_returns_zero_state(self):
        """Intent: missing .keel-state returns zero State, not an error."""
        from keelstate import read

        with tempfile.TemporaryDirectory() as tmpdir:
            state = read(tmpdir)
            assert state.head == ""
            assert state.officer == ""
            assert state.bearing.work == ""

    def test_write_and_read_roundtrip(self):
        """Intent: write then read produces identical state."""
        from keelstate import State, Bearing, read, write

        with tempfile.TemporaryDirectory() as tmpdir:
            s = State(
                head="abc123",
                sd="SD-315",
                bearing=Bearing(
                    work="main", commits=5, last="feat: test", note="testing"
                ),
                officer="Weaver",
                true_north="Get Hired",
                gate="green",
                gate_time="10:30",
                tests=42,
                weave="tight",
                register="quarterdeck",
                tempo="making-way",
            )
            write(tmpdir, s)
            loaded = read(tmpdir)

            assert loaded.head == "abc123"
            assert loaded.sd == "SD-315"
            assert loaded.bearing.work == "main"
            assert loaded.bearing.commits == 5
            assert loaded.officer == "Weaver"
            assert loaded.true_north == "Get Hired"
            assert loaded.gate == "green"
            assert loaded.tests == 42

    def test_read_modify_write_preserves_unmodified_fields(self):
        """Intent: read-modify-write only changes what the mutation touches."""
        from keelstate import State, Bearing, read, write, read_modify_write

        with tempfile.TemporaryDirectory() as tmpdir:
            s = State(
                head="abc123",
                officer="Weaver",
                bearing=Bearing(note="human note"),
                true_north="Get Hired",
            )
            write(tmpdir, s)

            def update(state: State) -> None:
                state.head = "def456"
                state.officer = "Architect"

            read_modify_write(tmpdir, update)
            loaded = read(tmpdir)

            assert loaded.head == "def456"
            assert loaded.officer == "Architect"
            assert loaded.bearing.note == "human note"  # preserved
            assert loaded.true_north == "Get Hired"  # preserved

    def test_invalid_gate_rejected(self):
        """Intent: gate must be 'green', 'red', or empty."""
        from keelstate import State, write

        with tempfile.TemporaryDirectory() as tmpdir:
            s = State(gate="yellow")
            with pytest.raises(ValueError, match="gate must be"):
                write(tmpdir, s)

    def test_unknown_fields_rejected(self):
        """Intent: unknown fields in JSON are rejected (catch schema drift)."""
        import json
        from keelstate import State

        with pytest.raises(ValueError, match="unknown fields"):
            State.from_dict({"head": "abc", "bogus_field": "oops"})


# ==========================================================================
# parse_commit_log — parsing correctness
# ==========================================================================


class TestParseCommitLog:
    def test_valid_input(self):
        from git_io import parse_commit_log

        raw = "abc123|2026-02-21T09:00:00+00:00|feat: initial\ndef456|2026-02-21T10:00:00+00:00|fix: something"
        commits = parse_commit_log(raw)
        assert len(commits) == 2
        assert commits[0].msg == "feat: initial"
        assert commits[0].when < commits[1].when

    def test_empty_input(self):
        from git_io import parse_commit_log

        commits = parse_commit_log("")
        assert len(commits) == 0

    def test_malformed_lines(self):
        from git_io import parse_commit_log

        raw = "abc123|bad-date|feat: initial\ndef456|2026-02-21T10:00:00+00:00|fix: something\ngarbage"
        commits = parse_commit_log(raw)
        assert len(commits) == 1


# ==========================================================================
# find_last_sd — parsing correctness
# ==========================================================================


class TestFindLastSD:
    def test_finds_last_sd(self):
        from git_io import find_last_sd

        content = """\
| SD-305 | docs-structure |
| SD-306 | measurement-hooks |
| SD-315 | echo-check-fire |
"""
        assert find_last_sd(content) == "SD-315"

    def test_empty_content(self):
        from git_io import find_last_sd

        assert find_last_sd("") == ""

    def test_no_sd_lines(self):
        from git_io import find_last_sd

        assert find_last_sd("# Just a heading\nSome text\n") == ""
