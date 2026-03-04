# keelstate.py — Typed schema and flock-based IO for .keel-state.
#
# Ported from Go (tspit-ARCHIVED/shared/keelstate/keelstate.go).
# Uses fcntl.flock for atomic read-modify-write, matching the Go
# implementation's syscall.Flock semantics.

from __future__ import annotations

import fcntl
import json
import os
from dataclasses import asdict, dataclass, field
from typing import Callable


@dataclass
class Bearing:
    """Structured branch/commit context within the state."""

    work: str = ""
    commits: int = 0
    last: str = ""
    note: str = ""


@dataclass
class State:
    """Typed schema for .keel-state. All fields match the Go struct."""

    head: str = ""
    sd: str = ""
    bearing: Bearing = field(default_factory=Bearing)
    officer: str = ""
    true_north: str = ""
    gate: str = ""
    gate_time: str = ""
    tests: int = 0
    weave: str = ""
    register: str = ""
    tempo: str = ""

    def validate(self) -> None:
        """Check required field constraints. Raises ValueError on invalid state."""
        if self.gate and self.gate not in ("green", "red"):
            raise ValueError(
                f"keelstate: gate must be 'green', 'red', or empty; got {self.gate!r}"
            )

    def to_dict(self) -> dict:
        """Serialize to dict matching the JSON schema."""
        d = asdict(self)
        return d

    @classmethod
    def from_dict(cls, d: dict) -> State:
        """Deserialize from dict. Rejects unknown fields."""
        known_fields = {f.name for f in cls.__dataclass_fields__.values()}
        unknown = set(d.keys()) - known_fields
        if unknown:
            raise ValueError(f"keelstate: unknown fields: {unknown}")

        bearing_data = d.get("bearing", {})
        if isinstance(bearing_data, dict):
            bearing_known = {f.name for f in Bearing.__dataclass_fields__.values()}
            bearing_unknown = set(bearing_data.keys()) - bearing_known
            if bearing_unknown:
                raise ValueError(
                    f"keelstate: unknown bearing fields: {bearing_unknown}"
                )
            bearing = Bearing(**bearing_data)
        else:
            bearing = Bearing()

        return cls(
            head=d.get("head", ""),
            sd=d.get("sd", ""),
            bearing=bearing,
            officer=d.get("officer", ""),
            true_north=d.get("true_north", ""),
            gate=d.get("gate", ""),
            gate_time=d.get("gate_time", ""),
            tests=d.get("tests", 0),
            weave=d.get("weave", ""),
            register=d.get("register", ""),
            tempo=d.get("tempo", ""),
        )


def _state_path(root: str) -> str:
    return os.path.join(root, ".keel-state")


def read(root: str) -> State:
    """Load .keel-state. Returns zero State if file doesn't exist.
    Acquires LOCK_SH to prevent reading a torn write."""
    path = _state_path(root)

    try:
        fd = os.open(path, os.O_RDONLY)
    except FileNotFoundError:
        return State()

    try:
        fcntl.flock(fd, fcntl.LOCK_SH)
        with os.fdopen(fd, "r") as f:
            data = f.read()
            if not data.strip():
                return State()
            d = json.loads(data)
            return State.from_dict(d)
    except Exception:
        try:
            os.close(fd)
        except OSError:
            pass
        raise


def write(root: str, state: State) -> None:
    """Persist state to .keel-state with exclusive flock."""
    state.validate()
    path = _state_path(root)

    fd = os.open(path, os.O_RDWR | os.O_CREAT, 0o644)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX)
        data = json.dumps(state.to_dict(), separators=(",", ":")) + "\n"
        os.ftruncate(fd, 0)
        os.lseek(fd, 0, os.SEEK_SET)
        os.write(fd, data.encode())
    finally:
        try:
            fcntl.flock(fd, fcntl.LOCK_UN)
        except OSError:
            pass
        os.close(fd)


def read_modify_write(root: str, fn: Callable[[State], None]) -> None:
    """Atomically read, mutate, and write back .keel-state.
    File is locked for the entire duration."""
    path = _state_path(root)

    fd = os.open(path, os.O_RDWR | os.O_CREAT, 0o644)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX)

        # Read from the locked fd
        data_bytes = b""
        while True:
            chunk = os.read(fd, 8192)
            if not chunk:
                break
            data_bytes += chunk

        state = State()
        if data_bytes.strip():
            d = json.loads(data_bytes.decode())
            state = State.from_dict(d)

        # Apply mutation
        fn(state)
        state.validate()

        # Write back
        out = json.dumps(state.to_dict(), separators=(",", ":")) + "\n"
        os.ftruncate(fd, 0)
        os.lseek(fd, 0, os.SEEK_SET)
        os.write(fd, out.encode())
    finally:
        try:
            fcntl.flock(fd, fcntl.LOCK_UN)
        except OSError:
            pass
        os.close(fd)
