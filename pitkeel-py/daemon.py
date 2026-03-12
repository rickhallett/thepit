# daemon.py — Sleep daemon for pitkeel reserves enforcement.
#
# Background process that checks reserves state every 15 minutes.
# Issues warnings at thresholds. Executes literal OS shutdown when
# reserves are depleted (24h without meditation or exercise).
#
# The daemon exists because the reserves check only fires when pitkeel
# is actively invoked — which is precisely when the Operator is least
# likely to need it. The daemon catches the case where no agents are
# running, no work is happening, but the 24h clock is still ticking.
#
# Shutdown is two-phase:
#   Phase 1 (T-10min): warning via notify-send + wall. Daemon continues
#           checking. If reserves are replenished, shutdown is cancelled.
#   Phase 2 (T-0):     60-second countdown, then literal OS shutdown.
#
# Usage:
#   pitkeel daemon start             start the sleep daemon
#   pitkeel daemon stop              stop the sleep daemon
#   pitkeel daemon status            check if daemon is running
#   pitkeel daemon start --dry-run   start without real shutdown (testing)

from __future__ import annotations

import os
import signal
import subprocess
import sys
import time
from datetime import datetime, timedelta

from analysis import analyse_reserves, format_duration_plain
from git_io import read_reserves_tsv, repo_root

CHECK_INTERVAL = 15 * 60  # 15 minutes in seconds
COUNTDOWN_SECONDS = 60
GRACE_PERIOD = timedelta(minutes=10)  # T-10min warning before shutdown

PID_FILE = os.path.join(os.path.expanduser("~"), ".pitkeel-sleep-daemon.pid")

# Desktop session environment — captured at import time (before fork).
# After daemonization (setsid + double fork), the process loses access
# to the user's desktop session. These variables are needed for
# notify-send to reach the actual desktop notification system.
_DESKTOP_ENV: dict[str, str] = {}
for _key in ("DISPLAY", "DBUS_SESSION_BUS_ADDRESS", "XDG_RUNTIME_DIR", "HOME", "USER"):
    _val = os.environ.get(_key)
    if _val:
        _DESKTOP_ENV[_key] = _val


def _notify(title: str, message: str) -> None:
    """Send desktop notification via notify-send.

    Uses captured desktop session environment so notifications work
    even after daemonization. Best-effort — doesn't fail if unavailable."""
    # Build environment: inherit current env, overlay desktop session vars
    env = dict(os.environ)
    env.update(_DESKTOP_ENV)
    try:
        subprocess.run(
            ["notify-send", "--urgency=critical", title, message],
            capture_output=True,
            timeout=5,
            env=env,
        )
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass


def _wall(message: str) -> None:
    """Broadcast message to all terminals. Best-effort."""
    try:
        subprocess.run(
            ["wall", message],
            capture_output=True,
            timeout=5,
        )
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass


def _shutdown(dry_run: bool = False) -> None:
    """Execute OS shutdown with 60-second countdown.

    Note: when running as a daemon, stderr is redirected to /dev/null.
    The countdown writes are only visible in --dry-run or foreground mode.
    In daemon mode, wall and notify-send deliver the countdown message."""
    msg = "PITKEEL: RESERVES DEPLETED. Shutting down in 60 seconds."
    _notify("PITKEEL SHUTDOWN", msg)
    _wall(msg)

    # Visible countdown (only meaningful in foreground/dry-run mode;
    # in daemon mode stderr is /dev/null — wall/notify-send are the channel)
    for remaining in range(COUNTDOWN_SECONDS, 0, -1):
        line = f"\rPITKEEL SHUTDOWN IN {remaining}s — SAVE YOUR WORK"
        sys.stderr.write(line)
        sys.stderr.flush()
        if remaining <= 10:
            # Terminal bell — best-effort, no-op when daemonized
            sys.stderr.write("\a")
            sys.stderr.flush()
        if remaining % 15 == 0 and remaining > 0:
            _wall(f"PITKEEL SHUTDOWN IN {remaining}s")
        time.sleep(1)

    sys.stderr.write("\n")

    if dry_run:
        sys.stderr.write("PITKEEL: [DRY RUN] Would execute: shutdown now\n")
        _wall("PITKEEL: [DRY RUN] Would execute: shutdown now")
        return

    # Literal OS shutdown — visceral by design [E1 spec, M1]
    try:
        subprocess.run(["shutdown", "now"], timeout=10)
    except (FileNotFoundError, subprocess.TimeoutExpired):
        sys.stderr.write("PITKEEL: shutdown command failed\n")
        sys.exit(1)


def _check_reserves(
    root: str,
    dry_run: bool = False,
    warned_at: datetime | None = None,
) -> tuple[bool, datetime | None]:
    """Check reserves state. Two-phase enforcement:

    Phase 1: If depleted and no prior warning, issue T-10min warning.
             Returns (False, warned_at_timestamp).
    Phase 2: If depleted and warned_at >= 10min ago, trigger shutdown.
             Returns (True, warned_at).

    If reserves are replenished between phases, warning is cancelled.
    Returns (False, None).

    Also issues notifications for warning/urgent/final severities."""
    now = datetime.now().astimezone()
    entries = read_reserves_tsv(root)
    sig = analyse_reserves(entries, now)

    if sig.shutdown_required:
        # Check which reserves are depleted
        depleted = []
        if sig.meditation.severity == "depleted":
            depleted.append("meditation")
        if sig.exercise.severity == "depleted":
            depleted.append("exercise")

        if warned_at is None:
            # Phase 1: first detection — issue T-10min warning
            msg = (
                f"RESERVES DEPLETED: {', '.join(depleted)}. "
                f"System will shut down in 10 minutes. SAVE YOUR WORK."
            )
            _notify("PITKEEL: RESERVES DEPLETED — 10 MIN WARNING", msg)
            _wall(msg)
            return (False, now)

        # Check if grace period has elapsed
        if now - warned_at >= GRACE_PERIOD:
            # Phase 2: grace period expired — execute shutdown
            msg = (
                f"RESERVES DEPLETED: {', '.join(depleted)}. "
                f"Grace period expired. Shutting down."
            )
            _notify("PITKEEL: SHUTDOWN NOW", msg)
            _wall(msg)
            _shutdown(dry_run)
            return (True, warned_at)

        # Still in grace period — notify at key milestones only
        # (5min, 2min, 1min remaining) to avoid notification fatigue
        remaining = GRACE_PERIOD - (now - warned_at)
        remaining_mins = int(remaining.total_seconds() / 60)
        if remaining_mins in (5, 2, 1):
            remaining_str = format_duration_plain(remaining)
            msg = (
                f"PITKEEL: {', '.join(depleted)} still depleted. "
                f"Shutdown in {remaining_str}. Log activity to cancel."
            )
            _notify("PITKEEL: SHUTDOWN PENDING", msg)
            _wall(msg)
        return (False, warned_at)

    # Reserves replenished — cancel any pending warning
    if warned_at is not None:
        _notify("PITKEEL: SHUTDOWN CANCELLED", "Reserves replenished. Carry on.")
    # Issue threshold notifications
    for name, status in [("meditation", sig.meditation), ("exercise", sig.exercise)]:
        if status.severity == "final":
            remaining = format_duration_plain(status.remaining)
            msg = (
                f"PITKEEL: {name.upper()} reserve critical — "
                f"{remaining} remaining. SAVE YOUR WORK."
            )
            _notify(f"PITKEEL: {name.upper()} CRITICAL", msg)
            _wall(msg)

        elif status.severity == "urgent":
            remaining = format_duration_plain(status.remaining)
            msg = f"PITKEEL: {name} reserve low — {remaining} remaining."
            _notify(f"PITKEEL: {name} LOW", msg)

        elif status.severity == "warning":
            remaining = format_duration_plain(status.remaining)
            msg = f"pitkeel: {name} — {remaining} remaining"
            _notify(f"pitkeel: {name}", msg)

    return (False, None)


# --------------------------------------------------------------------------
# PID management with identity verification
# --------------------------------------------------------------------------


def _write_pid() -> None:
    """Write current PID to file."""
    with open(PID_FILE, "w") as f:
        f.write(str(os.getpid()))


def _read_pid() -> int | None:
    """Read PID from file. Returns None if not found or invalid."""
    try:
        with open(PID_FILE) as f:
            return int(f.read().strip())
    except (FileNotFoundError, ValueError):
        return None


def _remove_pid() -> None:
    """Remove PID file."""
    try:
        os.remove(PID_FILE)
    except FileNotFoundError:
        pass


def _is_pitkeel_daemon(pid: int) -> bool:
    """Check if a process with the given PID is a pitkeel daemon.

    Verifies both that the process exists AND that it is actually a
    pitkeel process by checking /proc/{pid}/cmdline. This prevents
    the PID-reuse attack where a stale PID file points to an unrelated
    process that would be incorrectly killed on daemon stop.

    Falls back to os.kill(pid, 0) existence check on non-Linux systems
    where /proc is unavailable."""
    try:
        os.kill(pid, 0)
    except (ProcessLookupError, PermissionError):
        return False

    # Verify process identity via /proc (Linux)
    try:
        with open(f"/proc/{pid}/cmdline", "rb") as f:
            cmdline = f.read().decode("utf-8", errors="replace")
            # cmdline is null-separated; check if pitkeel appears
            return "pitkeel" in cmdline
    except (FileNotFoundError, PermissionError):
        # /proc not available (non-Linux) or permission denied
        # Fall back to existence check only — less safe but functional
        return True


def daemon_start(dry_run: bool = False) -> None:
    """Start the sleep daemon as a background process."""
    # Check if already running
    existing_pid = _read_pid()
    if existing_pid is not None and _is_pitkeel_daemon(existing_pid):
        print(f"pitkeel: sleep daemon already running (PID {existing_pid})")
        return

    # Clean up stale PID file if process is not pitkeel
    if existing_pid is not None:
        _remove_pid()

    root = repo_root()

    # Fork to background
    pid = os.fork()
    if pid > 0:
        # Parent process — wait for grandchild to write PID file
        # so we can report the correct daemon PID
        for _ in range(50):  # wait up to 5 seconds
            time.sleep(0.1)
            daemon_pid = _read_pid()
            if daemon_pid is not None:
                print(f"pitkeel: sleep daemon started (PID {daemon_pid})")
                if dry_run:
                    print("pitkeel: running in dry-run mode (no real shutdown)")
                return
        # Fallback if PID file not written in time
        print("pitkeel: sleep daemon started (PID file pending)")
        if dry_run:
            print("pitkeel: running in dry-run mode (no real shutdown)")
        return

    # Child process — become daemon
    os.setsid()

    # Second fork to fully detach
    pid2 = os.fork()
    if pid2 > 0:
        os._exit(0)

    # Grandchild is the actual daemon
    # Redirect stdio — stderr goes to /dev/null in daemon mode.
    # Countdown output is only meaningful in --dry-run foreground mode.
    # In daemon mode, wall and notify-send are the notification channels.
    devnull = os.open(os.devnull, os.O_RDWR)
    os.dup2(devnull, 0)
    os.dup2(devnull, 1)
    os.dup2(devnull, 2)
    os.close(devnull)

    _write_pid()

    # Handle SIGTERM gracefully
    def _handle_sigterm(signum, frame):
        _remove_pid()
        sys.exit(0)

    signal.signal(signal.SIGTERM, _handle_sigterm)

    # Main loop — two-phase shutdown tracking
    # In dry-run mode, the daemon continues running after a simulated
    # shutdown. This is intentional: it allows testing the full cycle
    # including grace period without killing the daemon process.
    warned_at: datetime | None = None
    try:
        while True:
            shutdown_triggered, warned_at = _check_reserves(root, dry_run, warned_at)
            if shutdown_triggered and not dry_run:
                break
            # Check more frequently during grace period
            if warned_at is not None:
                time.sleep(60)  # check every minute during grace
            else:
                time.sleep(CHECK_INTERVAL)
    except KeyboardInterrupt:
        pass
    finally:
        _remove_pid()


def daemon_stop() -> None:
    """Stop the sleep daemon."""
    pid = _read_pid()
    if pid is None:
        print("pitkeel: sleep daemon not running (no PID file)")
        return

    if not _is_pitkeel_daemon(pid):
        print(f"pitkeel: sleep daemon not running (stale PID {pid})")
        _remove_pid()
        return

    try:
        os.kill(pid, signal.SIGTERM)
        print(f"pitkeel: sleep daemon stopped (PID {pid})")
    except ProcessLookupError:
        print("pitkeel: sleep daemon already stopped")
    finally:
        _remove_pid()


def daemon_status() -> None:
    """Check if the sleep daemon is running."""
    pid = _read_pid()
    if pid is None:
        print("pitkeel: sleep daemon not running")
        return

    if _is_pitkeel_daemon(pid):
        print(f"pitkeel: sleep daemon running (PID {pid})")
    else:
        print(f"pitkeel: sleep daemon not running (stale PID {pid})")
        _remove_pid()
