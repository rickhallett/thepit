# test_daemon.py - Integration tests for daemon shutdown failure handling.
#
# Tests the _shutdown function's exit-code checking and retry logic.
# Uses subprocess mocking to simulate shutdown command failures without
# requiring actual OS shutdown permissions.

from __future__ import annotations

import subprocess
from unittest.mock import patch

import pytest


# ---------------------------------------------------------------------------
# _shutdown failure path tests
# ---------------------------------------------------------------------------


def test_shutdown_exits_nonzero_when_command_fails_twice():
    """When shutdown returns non-zero on both attempts, _shutdown exits with code 2."""
    failed_result = subprocess.CompletedProcess(args=["shutdown", "now"], returncode=1)

    with (
        patch("daemon._SHUTDOWN_BIN", "/usr/sbin/shutdown"),
        patch("daemon.subprocess.run", return_value=failed_result) as mock_run,
        patch("daemon._wall"),
        patch("daemon._notify"),
        patch("daemon.time.sleep"),
    ):
        with pytest.raises(SystemExit) as exc_info:
            from daemon import _shutdown

            _shutdown(dry_run=False)

        assert exc_info.value.code == 2
        assert mock_run.call_count == 2


def test_shutdown_retries_once_then_succeeds():
    """When shutdown fails first attempt but succeeds on retry, no exit."""
    fail_result = subprocess.CompletedProcess(args=["shutdown", "now"], returncode=1)
    ok_result = subprocess.CompletedProcess(args=["shutdown", "now"], returncode=0)

    with (
        patch("daemon._SHUTDOWN_BIN", "/usr/sbin/shutdown"),
        patch(
            "daemon.subprocess.run", side_effect=[fail_result, ok_result]
        ) as mock_run,
        patch("daemon._wall"),
        patch("daemon._notify"),
        patch("daemon.time.sleep"),
    ):
        from daemon import _shutdown

        # Should return normally (no SystemExit) on second success
        _shutdown(dry_run=False)

        assert mock_run.call_count == 2


def test_shutdown_succeeds_first_try_no_retry():
    """When shutdown succeeds on first attempt, no retry occurs."""
    ok_result = subprocess.CompletedProcess(args=["shutdown", "now"], returncode=0)

    with (
        patch("daemon._SHUTDOWN_BIN", "/usr/sbin/shutdown"),
        patch("daemon.subprocess.run", return_value=ok_result) as mock_run,
        patch("daemon._wall"),
        patch("daemon._notify"),
        patch("daemon.time.sleep"),
    ):
        from daemon import _shutdown

        _shutdown(dry_run=False)

        assert mock_run.call_count == 1


def test_shutdown_file_not_found_retries_then_exits():
    """When shutdown binary is missing, retries once then exits with code 2."""
    with (
        patch("daemon._SHUTDOWN_BIN", "/usr/sbin/shutdown"),
        patch(
            "daemon.subprocess.run", side_effect=FileNotFoundError("shutdown")
        ) as mock_run,
        patch("daemon._wall"),
        patch("daemon._notify"),
        patch("daemon.time.sleep"),
    ):
        with pytest.raises(SystemExit) as exc_info:
            from daemon import _shutdown

            _shutdown(dry_run=False)

        assert exc_info.value.code == 2
        assert mock_run.call_count == 2


def test_shutdown_timeout_retries_then_exits():
    """When shutdown command times out, retries once then exits with code 2."""
    with (
        patch("daemon._SHUTDOWN_BIN", "/usr/sbin/shutdown"),
        patch(
            "daemon.subprocess.run",
            side_effect=subprocess.TimeoutExpired("shutdown", 10),
        ) as mock_run,
        patch("daemon._wall"),
        patch("daemon._notify"),
        patch("daemon.time.sleep"),
    ):
        with pytest.raises(SystemExit) as exc_info:
            from daemon import _shutdown

            _shutdown(dry_run=False)

        assert exc_info.value.code == 2
        assert mock_run.call_count == 2


def test_shutdown_dry_run_skips_actual_command():
    """Dry-run mode writes a message but does not call shutdown."""
    with (
        patch("daemon.subprocess.run") as mock_run,
        patch("daemon._wall"),
        patch("daemon._notify"),
        patch("daemon.time.sleep"),
    ):
        from daemon import _shutdown

        _shutdown(dry_run=True)

        # subprocess.run should NOT be called at all in dry-run mode
        mock_run.assert_not_called()
