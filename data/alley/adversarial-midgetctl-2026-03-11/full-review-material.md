# Adversarial Review: midgetctl steering module

You are conducting an adversarial review. Your job is to find claims that are not proven, and tests that claim to test something they do not actually test.

## Specific concerns

1. **Claims not proven**: Does the code, documentation, or README claim capabilities that are not demonstrated by any test or artifact? A claim without proof is epistemic theatre.

2. **Shadow validation**: Do any tests assert something passed, but the assertion does not actually verify the claimed behaviour? For example: a test named "agent acts on steer" that only checks a file was written, not that agent behaviour changed.

3. **Right answer wrong work**: Do any tests pass via the wrong causal path? For example: grepping for "fn" to prove Rust output, when "fn" could appear in English text ("function").

4. **Phantom ledger**: Does the audit trail (midgetctl history, audit, tokens) claim to provide data it cannot actually access or verify?

5. **Gap between deterministic and live tests**: The deterministic tests (test-steer.sh) prove plumbing. The live tests (test-steer-live.sh) claim to prove agent compliance. Is there a gap? What falls through?

## Review format

Write your review as YAML:

```yaml
role: <your-role>
model: <your-model>
verdict: pass|fail
findings_count: <int>
findings:
  - id: F-<N>
    severity: critical|high|medium|low
    category: claim-not-proven|shadow-validation|right-answer-wrong-work|phantom-ledger|gap
    location: <file:line or file>
    claim: <what is claimed>
    reality: <what is actually proven>
    evidence: <specific code/text that demonstrates the gap>
summary: <one paragraph overall assessment>
```

Be specific. Quote code. Name line numbers. If something is genuinely sound, say so - do not manufacture findings.

## Files under review

The following files are appended below in order:

1. `bin/midgetctl` - the control plane CLI
2. `steer/steer-watcher` - in-container pipe bridge
3. `tests/test-steer.sh` - deterministic steering tests (16 tests)
4. `tests/test-steer-live.sh` - live agent compliance tests
5. `docs/diagrams/value-proposition.md` - claims about what midgets deliver
6. `README.md` (midgetctl section only)

---


## FILE: bin/midgetctl
```python
#!/usr/bin/env python3
"""midgetctl - control plane for midget containers.

Central interface for launching, monitoring, inspecting, and auditing
midget containers. Wraps Docker API operations and provides a consistent
management layer regardless of whether midgets are run individually,
as a crew, or as a swarm.

Usage:
    midgetctl ps                          list running midgets
    midgetctl inspect <container>         show midget state (mounts, env, resources)
    midgetctl logs <container>            stream container logs
    midgetctl stop <container|all>        stop midget(s) gracefully
    midgetctl kill <container|all>        kill midget(s) immediately
    midgetctl pause <container>           freeze midget without killing
    midgetctl resume <container>          resume paused midget
    midgetctl stats [container]           live resource usage
    midgetctl history                     list past crew runs
    midgetctl audit <run-id>              show audit trail for a crew run
    midgetctl tokens [run-id]             token usage summary
    midgetctl watch <container>           open VNC viewer to midget display
    midgetctl run <role> [--model M]      launch a single midget with role
    midgetctl steer <container> <msg>     inject message into agent context (infrastructure)
    midgetctl signal <container> <msg>    write steering file for agent to poll (prompt-based)
"""

import argparse
import json
import os
import subprocess
import sys
import glob
import yaml
from datetime import datetime
from pathlib import Path

IMAGE = "midget-poc"
DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "alley"
LABEL_PREFIX = "midget"


def docker(*args, capture=True, check=True):
    """Run a docker command, return stdout."""
    cmd = ["docker"] + list(args)
    if capture:
        r = subprocess.run(cmd, capture_output=True, text=True, check=check)
        return r.stdout.strip()
    else:
        subprocess.run(cmd, check=check)
        return None


def get_midgets():
    """List running containers with the midget label."""
    out = docker(
        "ps", "--filter", f"label={LABEL_PREFIX}",
        "--format", "{{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Labels}}"
    )
    if not out:
        return []
    midgets = []
    for line in out.strip().split("\n"):
        parts = line.split("\t")
        if len(parts) < 4:
            continue
        cid, name, status, labels = parts
        # Extract role from labels
        role = ""
        for label in labels.split(","):
            if label.strip().startswith(f"{LABEL_PREFIX}.role="):
                role = label.strip().split("=", 1)[1]
        midgets.append({
            "id": cid,
            "name": name,
            "status": status,
            "role": role,
        })
    return midgets


# ── Commands ──────────────────────────────────────────────────

def cmd_ps(args):
    """List running midgets."""
    midgets = get_midgets()
    if not midgets:
        print("No running midgets.")
        return

    print(f"{'ID':<14} {'ROLE':<12} {'NAME':<24} {'STATUS'}")
    print("-" * 70)
    for m in midgets:
        printf(f"{m['id']:<14} {m['role']:<12} {m['name']:<24} {m['status']}")


def cmd_inspect(args):
    """Show midget state: mounts, env, resources."""
    cid = args.container
    try:
        raw = docker("inspect", cid)
    except subprocess.CalledProcessError:
        print(f"Container not found: {cid}", file=sys.stderr)
        sys.exit(1)

    data = json.loads(raw)
    if not data:
        print(f"No data for container: {cid}", file=sys.stderr)
        sys.exit(1)

    info = data[0]
    state = info.get("State", {})
    config = info.get("Config", {})
    mounts = info.get("Mounts", [])
    host_config = info.get("HostConfig", {})

    print(f"Container:  {info.get('Id', '')[:12]}")
    print(f"Name:       {info.get('Name', '').lstrip('/')}")
    print(f"Image:      {config.get('Image', '')}")
    print(f"Status:     {state.get('Status', '')}")
    print(f"Started:    {state.get('StartedAt', '')}")
    print(f"PID:        {state.get('Pid', '')}")

    # Role from env or labels
    env = config.get("Env", [])
    role = ""
    for e in env:
        if e.startswith("MIDGET_ROLE="):
            role = e.split("=", 1)[1]
    print(f"Role:       {role or '(none)'}")

    # Resource limits
    cpu = host_config.get("NanoCpus", 0)
    mem = host_config.get("Memory", 0)
    print(f"\nResources:")
    print(f"  CPU:      {cpu / 1e9:.1f} cores" if cpu else "  CPU:      unlimited")
    print(f"  Memory:   {mem // (1024*1024)}MB" if mem else "  Memory:   unlimited")

    # Mounts
    print(f"\nMounts:")
    for m in mounts:
        rw = "rw" if m.get("RW", True) else "ro"
        src = m.get("Name", m.get("Source", "?"))
        dst = m.get("Destination", "?")
        print(f"  {dst} <- {src} [{rw}]")

    # Network
    net = host_config.get("NetworkMode", "")
    print(f"\nNetwork:    {net}")

    # Ports
    ports = host_config.get("PortBindings", {})
    if ports:
        print("Ports:")
        for container_port, bindings in ports.items():
            for b in (bindings or []):
                print(f"  {b.get('HostPort', '?')} -> {container_port}")


def cmd_logs(args):
    """Stream container logs."""
    try:
        docker("logs", "-f", "--tail", str(args.tail), args.container, capture=False)
    except subprocess.CalledProcessError:
        sys.exit(1)
    except KeyboardInterrupt:
        pass


def cmd_stop(args):
    """Stop midget(s) gracefully."""
    targets = resolve_targets(args.container)
    for cid in targets:
        print(f"Stopping {cid}...")
        docker("stop", cid, check=False)
    print(f"Stopped {len(targets)} midget(s).")


def cmd_kill(args):
    """Kill midget(s) immediately."""
    targets = resolve_targets(args.container)
    for cid in targets:
        print(f"Killing {cid}...")
        docker("kill", cid, check=False)
    print(f"Killed {len(targets)} midget(s).")


def cmd_pause(args):
    """Freeze midget without killing - preserves state for inspection."""
    docker("pause", args.container)
    print(f"Paused {args.container}. Use 'midgetctl resume' to continue.")


def cmd_resume(args):
    """Resume a paused midget."""
    docker("unpause", args.container)
    print(f"Resumed {args.container}.")


def cmd_stats(args):
    """Live resource usage."""
    cmd = ["docker", "stats", "--format",
           "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.PIDs}}"]
    if args.container:
        cmd.append(args.container)
    else:
        # Only show midget containers
        midgets = get_midgets()
        if not midgets:
            print("No running midgets.")
            return
        for m in midgets:
            cmd.append(m["id"])
    try:
        subprocess.run(cmd, check=False)
    except KeyboardInterrupt:
        pass


def cmd_history(args):
    """List past crew runs."""
    if not DATA_DIR.exists():
        print("No crew runs found.")
        return

    runs = sorted(DATA_DIR.glob("crew-live-*"))
    if not runs:
        print("No crew runs found.")
        return

    print(f"{'RUN ID':<36} {'DATE':<22} {'VERDICT':<12} {'MODELS'}")
    print("-" * 90)
    for run_dir in runs:
        meta_path = run_dir / "run-metadata.yaml"
        if not meta_path.exists():
            continue
        with open(meta_path) as f:
            meta = yaml.safe_load(f)

        run_id = meta.get("run_id", run_dir.name)
        date = meta.get("date", "?")
        if isinstance(date, datetime):
            date = date.isoformat()
        verdict = meta.get("verdict", {})
        tri = verdict.get("triangulated", "?") if isinstance(verdict, dict) else "?"
        members = meta.get("crew_members", [])
        models = ", ".join(m.get("model", "?") for m in members if isinstance(m, dict))

        print(f"{run_id:<36} {str(date)[:22]:<22} {tri:<12} {models}")


def cmd_audit(args):
    """Show full audit trail for a crew run."""
    run_dir = find_run(args.run_id)
    if not run_dir:
        print(f"Run not found: {args.run_id}", file=sys.stderr)
        sys.exit(1)

    print(f"Audit trail: {run_dir.name}")
    print(f"Location:    {run_dir}")
    print()

    # Metadata
    meta_path = run_dir / "run-metadata.yaml"
    if meta_path.exists():
        print("--- Metadata ---")
        print(meta_path.read_text())

    # List all artifacts
    print("--- Artifacts ---")
    for f in sorted(run_dir.iterdir()):
        size = f.stat().st_size
        print(f"  {f.name:<36} {size:>8} bytes")

    # Reviews
    for review in sorted(run_dir.glob("*-review.yaml")):
        role = review.stem.replace("-review", "")
        print(f"\n--- {role} review ---")
        print(review.read_text())

    # Token usage
    tokens_path = run_dir / "token-usage.yaml"
    if tokens_path.exists():
        print("--- Token Usage ---")
        print(tokens_path.read_text())


def cmd_tokens(args):
    """Token usage summary across runs."""
    if not DATA_DIR.exists():
        print("No crew runs found.")
        return

    if args.run_id:
        run_dir = find_run(args.run_id)
        if not run_dir:
            print(f"Run not found: {args.run_id}", file=sys.stderr)
            sys.exit(1)
        show_tokens(run_dir)
    else:
        # Summary across all runs
        runs = sorted(DATA_DIR.glob("crew-live-*"))
        total_all = 0
        print(f"{'RUN':<36} {'TOTAL TOKENS':>14}")
        print("-" * 52)
        for run_dir in runs:
            tokens_path = run_dir / "token-usage.yaml"
            if not tokens_path.exists():
                continue
            with open(tokens_path) as f:
                data = yaml.safe_load(f)
            total = data.get("total_tokens", 0) if data else 0
            total_all += total
            print(f"{run_dir.name:<36} {total:>14,}")
        print("-" * 52)
        print(f"{'TOTAL':<36} {total_all:>14,}")


def cmd_watch(args):
    """Open VNC viewer to midget display."""
    # Find the container's mapped VNC port
    cid = args.container
    try:
        raw = docker("inspect", cid)
    except subprocess.CalledProcessError:
        print(f"Container not found: {cid}", file=sys.stderr)
        sys.exit(1)

    data = json.loads(raw)[0]
    ports = data.get("NetworkSettings", {}).get("Ports", {})
    vnc_port = None
    for port_key, bindings in ports.items():
        if port_key.startswith("5900"):
            if bindings:
                vnc_port = bindings[0].get("HostPort")

    if not vnc_port:
        print(f"No VNC port mapped for {cid}. Was it started with MIDGET_VNC=1?",
              file=sys.stderr)
        sys.exit(1)

    print(f"Connecting VNC viewer to localhost:{vnc_port}...")
    try:
        subprocess.run(["vncviewer", f"localhost:{vnc_port}"], check=False)
    except FileNotFoundError:
        print("vncviewer not found. Install tigervnc: sudo pacman -S tigervnc",
              file=sys.stderr)
        sys.exit(1)


def cmd_steer(args):
    """Inject a message into a running agent's context via named pipe.

    INFRASTRUCTURE-ENFORCED. Uses Claude Code's --input-format stream-json.
    The steer-watcher process inside the container picks up JSON message
    files from /opt/jobs/steer/ and writes them to a named pipe that the
    agent reads as stdin.

    Requires: agent started with steer-watcher and --input-format stream-json.
    Only works with Claude Code. Other CLIs do not support streaming stdin.
    The message enters the agent's context window as a new user turn.

    See also: 'signal' for prompt-based steering that works with any model.
    """
    cid = args.container
    message = " ".join(args.message)

    if not message:
        print("No message provided.", file=sys.stderr)
        sys.exit(1)

    # Build the stream-json message (Claude Code format)
    msg = json.dumps({"type": "user", "message": {"role": "user", "content": message}})

    # Generate a sequenced filename for ordering
    import time
    seq = int(time.time() * 1000)
    filename = f"{seq}-steer.json"

    # Write message file into the container's steer directory
    # Use /tmp/steer as fallback if /opt/jobs is not writable (no volume mounted)
    try:
        docker("exec", cid, "bash", "-c",
               f"SDIR=/opt/jobs/steer; mkdir -p \"$SDIR\" 2>/dev/null || {{ SDIR=/tmp/steer; mkdir -p \"$SDIR\"; }}; "
               f"printf '%s' '{msg}' > \"$SDIR\"/{filename}")
    except subprocess.CalledProcessError:
        print(f"Failed to write steer message to {cid}.", file=sys.stderr)
        print("Is the container running?", file=sys.stderr)
        sys.exit(1)

    print(f"Steered {cid}: {message}")
    print(f"  Method: infrastructure (stream-json pipe)")
    print(f"  File: /opt/jobs/steer/{filename}")
    print(f"  Delivery: guaranteed if steer-watcher is running")


def cmd_signal(args):
    """Write a steering file for the agent to poll.

    PROMPT-BASED. Writes (or appends to) /opt/jobs/steer/instructions.md
    inside the container. The agent's system prompt tells it to check this
    file periodically and follow any new instructions it finds.

    Works with any model/CLI. Does not require special stdin support.
    Delivery depends on agent compliance - the agent must actually read
    the file. There is no guarantee it will check before completing its
    current action.

    The file is append-only with timestamps, so the agent can see the
    full history of steering instructions and distinguish old from new.

    See also: 'steer' for infrastructure-enforced injection into Claude Code.
    """
    cid = args.container
    message = " ".join(args.message)

    if not message:
        print("No message provided.", file=sys.stderr)
        sys.exit(1)

    from datetime import datetime, timezone
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    # Append timestamped instruction to the steering file
    entry = f"\\n---\\n[{ts}] {message}\\n"

    try:
        # Create file with header if it doesn't exist, then append
        # Use /tmp/steer as fallback if /opt/jobs is not writable
        docker("exec", cid, "bash", "-c",
               f"SDIR=/opt/jobs/steer; mkdir -p \"$SDIR\" 2>/dev/null || {{ SDIR=/tmp/steer; mkdir -p \"$SDIR\"; }}; "
               f"[ -f \"$SDIR\"/instructions.md ] || "
               f"printf '%s\\n' '# Steering Instructions' "
               f"'Check this file before each action. Follow the latest instruction.' "
               f"'' > \"$SDIR\"/instructions.md; "
               f"printf '{entry}' >> \"$SDIR\"/instructions.md")
    except subprocess.CalledProcessError:
        print(f"Failed to write signal to {cid}.", file=sys.stderr)
        print("Is the container running?", file=sys.stderr)
        sys.exit(1)

    print(f"Signalled {cid}: {message}")
    print(f"  Method: prompt-based (file poll)")
    print(f"  File: /opt/jobs/steer/instructions.md")
    print(f"  Delivery: best-effort (depends on agent reading the file)")

    if args.show:
        print()
        print("Current instructions.md:")
        try:
            content = docker("exec", cid, "bash", "-c",
                             "cat /opt/jobs/steer/instructions.md 2>/dev/null || "
                             "cat /tmp/steer/instructions.md 2>/dev/null || "
                             "echo '(not found)'")
            print(content)
        except subprocess.CalledProcessError:
            print("  (could not read file)")


def cmd_run(args):
    """Launch a single midget with a role."""
    role = args.role
    env_args = [
        "-e", f"MIDGET_ROLE={role}",
    ]
    if args.vnc:
        env_args += ["-e", "MIDGET_VNC=1", "-p", f"{args.vnc_port}:5900"]

    label_args = [
        "--label", f"{LABEL_PREFIX}=true",
        "--label", f"{LABEL_PREFIX}.role={role}",
    ]

    label_args += ["--cpus", str(args.cpus), "--memory", args.memory]

    cmd = ["docker", "run", "-d", "--name", f"midget-{role}-{os.getpid()}"]
    cmd += env_args + label_args
    cmd += [IMAGE]

    if args.cmd:
        cmd += ["bash", "-c", args.cmd]

    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    cid = result.stdout.strip()[:12]
    print(f"Started midget-{role}: {cid}")
    if args.vnc:
        print(f"VNC available on localhost:{args.vnc_port}")


# ── Helpers ───────────────────────────────────────────────────

def printf(text):
    """Print without trailing newline issues."""
    sys.stdout.write(text + "\n")


def resolve_targets(target):
    """Resolve 'all' to all running midget container IDs."""
    if target == "all":
        return [m["id"] for m in get_midgets()]
    return [target]


def find_run(run_id):
    """Find a crew run directory by ID or partial match."""
    if not DATA_DIR.exists():
        return None
    # Exact match
    exact = DATA_DIR / run_id
    if exact.exists():
        return exact
    # Partial match
    matches = list(DATA_DIR.glob(f"*{run_id}*"))
    if len(matches) == 1:
        return matches[0]
    if len(matches) > 1:
        print(f"Ambiguous run ID '{run_id}', matches:", file=sys.stderr)
        for m in matches:
            print(f"  {m.name}", file=sys.stderr)
        sys.exit(1)
    return None


def show_tokens(run_dir):
    """Display token usage for a single run."""
    tokens_path = run_dir / "token-usage.yaml"
    if not tokens_path.exists():
        print(f"No token data for {run_dir.name}")
        return
    with open(tokens_path) as f:
        data = yaml.safe_load(f)
    if not data:
        print(f"Empty token data for {run_dir.name}")
        return

    print(f"Token usage: {run_dir.name}")
    print()
    print(f"  {'ROLE':<14} {'MODEL':<24} {'INPUT':>8} {'OUTPUT':>8} {'TOTAL':>8}")
    print("  " + "-" * 66)
    for key in sorted(data.keys()):
        if key == "total_tokens":
            continue
        v = data[key]
        if not isinstance(v, dict):
            continue
        print(f"  {key:<14} {v.get('model','?'):<24} "
              f"{v.get('input_tokens',0):>8,} {v.get('output_tokens',0):>8,} "
              f"{v.get('total_tokens',0):>8,}")
    print("  " + "-" * 66)
    print(f"  {'TOTAL':<14} {'':<24} {'':>8} {'':>8} {data.get('total_tokens',0):>8,}")


# ── CLI ───────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        prog="midgetctl",
        description="Control plane for midget containers.",
    )
    sub = parser.add_subparsers(dest="command")

    # ps
    sub.add_parser("ps", help="List running midgets")

    # inspect
    p = sub.add_parser("inspect", help="Show midget state")
    p.add_argument("container", help="Container ID or name")

    # logs
    p = sub.add_parser("logs", help="Stream container logs")
    p.add_argument("container", help="Container ID or name")
    p.add_argument("--tail", type=int, default=100, help="Lines to show")

    # stop
    p = sub.add_parser("stop", help="Stop midget(s) gracefully")
    p.add_argument("container", help="Container ID, name, or 'all'")

    # kill
    p = sub.add_parser("kill", help="Kill midget(s) immediately")
    p.add_argument("container", help="Container ID, name, or 'all'")

    # pause
    p = sub.add_parser("pause", help="Freeze midget without killing")
    p.add_argument("container", help="Container ID or name")

    # resume
    p = sub.add_parser("resume", help="Resume paused midget")
    p.add_argument("container", help="Container ID or name")

    # stats
    p = sub.add_parser("stats", help="Live resource usage")
    p.add_argument("container", nargs="?", help="Container ID (default: all midgets)")

    # history
    sub.add_parser("history", help="List past crew runs")

    # audit
    p = sub.add_parser("audit", help="Show audit trail for a crew run")
    p.add_argument("run_id", help="Run ID or partial match")

    # tokens
    p = sub.add_parser("tokens", help="Token usage summary")
    p.add_argument("run_id", nargs="?", help="Run ID (default: all runs)")

    # watch
    p = sub.add_parser("watch", help="Open VNC viewer to midget")
    p.add_argument("container", help="Container ID or name")

    # steer
    p = sub.add_parser("steer", help="Inject message into agent context (infrastructure-enforced, Claude Code only)")
    p.add_argument("container", help="Container ID or name")
    p.add_argument("message", nargs="+", help="Message to inject into agent context")

    # signal
    p = sub.add_parser("signal", help="Write steering file for agent to poll (prompt-based, any model)")
    p.add_argument("container", help="Container ID or name")
    p.add_argument("message", nargs="+", help="Instruction to append to steering file")
    p.add_argument("--show", action="store_true", help="Show current instructions.md after writing")

    # run
    p = sub.add_parser("run", help="Launch a single midget")
    p.add_argument("role", help="Agent role (e.g. watchdog, weaver, sentinel)")
    p.add_argument("--vnc", action="store_true", help="Enable VNC")
    p.add_argument("--vnc-port", type=int, default=5900, help="Host VNC port")
    p.add_argument("--cpus", type=float, default=2.0, help="CPU limit (default: 2)")
    p.add_argument("--memory", default="4g", help="Memory limit (default: 4g)")
    p.add_argument("--cmd", help="Command to run inside midget")

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        sys.exit(1)

    commands = {
        "ps": cmd_ps,
        "inspect": cmd_inspect,
        "logs": cmd_logs,
        "stop": cmd_stop,
        "kill": cmd_kill,
        "pause": cmd_pause,
        "resume": cmd_resume,
        "stats": cmd_stats,
        "history": cmd_history,
        "audit": cmd_audit,
        "tokens": cmd_tokens,
        "watch": cmd_watch,
        "steer": cmd_steer,
        "signal": cmd_signal,
        "run": cmd_run,
    }

    commands[args.command](args)


if __name__ == "__main__":
    main()
```

## FILE: steer/steer-watcher
```python
#!/usr/bin/env python3
"""
steer-watcher - in-container process that bridges steering messages
from the filesystem to a named pipe for agent stdin consumption.

Used by midgetctl steer (infrastructure-enforced steering).

Architecture:
    HOST                              CONTAINER
    midgetctl steer <cid> "msg"  -->  /opt/jobs/steer/NNN-msg.json
                                          |
                                      steer-watcher (this script)
                                          |
                                      /opt/jobs/steer/agent.pipe (named pipe)
                                          |
                                      claude --input-format stream-json < pipe

Message files are JSON: {"type": "user", "message": {"role": "user", "content": "..."}}
They are processed in filename order and deleted after being written
to the pipe. Atomic rename prevents partial reads.

Usage:
    steer-watcher [--steer-dir /opt/jobs/steer] [--pipe /opt/jobs/steer/agent.pipe]
    steer-watcher --setup    # create dirs + pipe, then exit
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

DEFAULT_STEER_DIR = Path(os.environ.get("MIDGET_STEER_DIR", "/opt/jobs/steer"))
DEFAULT_PIPE = DEFAULT_STEER_DIR / "agent.pipe"
POLL_INTERVAL = 0.5


def setup(steer_dir: Path, pipe_path: Path):
    """Create steer directory and named pipe."""
    steer_dir.mkdir(parents=True, exist_ok=True)
    if pipe_path.exists():
        pipe_path.unlink()
    os.mkfifo(pipe_path)
    print(f"steer-watcher: created {pipe_path}", flush=True)


def watch(steer_dir: Path, pipe_path: Path):
    """Watch for message files and write them to the named pipe."""
    steer_dir.mkdir(parents=True, exist_ok=True)

    if not pipe_path.exists():
        os.mkfifo(pipe_path)
        print(f"steer-watcher: created pipe {pipe_path}", flush=True)

    print(f"steer-watcher: watching {steer_dir} -> {pipe_path}", flush=True)

    # Open pipe in write mode. This blocks until a reader connects.
    # The agent process (claude --input-format stream-json) is the reader.
    print("steer-watcher: waiting for agent to connect to pipe...", flush=True)
    pipe_fd = open(pipe_path, "w")
    print("steer-watcher: agent connected, ready for steering messages", flush=True)

    processed = set()

    try:
        while True:
            # Look for message files (NNN-msg.json pattern)
            msg_files = sorted(steer_dir.glob("*.json"))
            for msg_file in msg_files:
                if msg_file in processed:
                    continue

                # Atomic acquisition: rename to .sending
                claimed = msg_file.with_suffix(".sending")
                try:
                    os.rename(msg_file, claimed)
                except (FileNotFoundError, OSError):
                    continue

                processed.add(msg_file)

                try:
                    content = claimed.read_text().strip()
                    # Validate JSON
                    msg = json.loads(content)
                    # Write to pipe as a single line of JSON
                    pipe_fd.write(json.dumps(msg) + "\n")
                    pipe_fd.flush()
                    print(f"steer-watcher: sent message from {msg_file.name}", flush=True)
                    claimed.unlink()
                except json.JSONDecodeError as e:
                    print(f"steer-watcher: invalid JSON in {msg_file.name}: {e}",
                          file=sys.stderr, flush=True)
                    claimed.unlink()
                except BrokenPipeError:
                    print("steer-watcher: pipe closed (agent exited?)", flush=True)
                    return
                except Exception as e:
                    print(f"steer-watcher: error processing {msg_file.name}: {e}",
                          file=sys.stderr, flush=True)

            time.sleep(POLL_INTERVAL)
    except KeyboardInterrupt:
        pass
    finally:
        pipe_fd.close()


def main():
    parser = argparse.ArgumentParser(
        prog="steer-watcher",
        description="Bridge steering messages from filesystem to agent pipe",
    )
    parser.add_argument("--steer-dir", type=Path, default=DEFAULT_STEER_DIR,
                        help=f"Directory to watch (default: {DEFAULT_STEER_DIR})")
    parser.add_argument("--pipe", type=Path, default=DEFAULT_PIPE,
                        help=f"Named pipe path (default: {DEFAULT_PIPE})")
    parser.add_argument("--setup", action="store_true",
                        help="Create dirs + pipe, then exit")

    args = parser.parse_args()

    if args.setup:
        setup(args.steer_dir, args.pipe)
    else:
        watch(args.steer_dir, args.pipe)


if __name__ == "__main__":
    main()
```

## FILE: tests/test-steer.sh
```bash
#!/bin/bash
# Test mid-flight steering: both infrastructure (steer) and prompt-based (signal)
# Runs on HOST. Launches a midget container and tests both steering mechanisms.
set -euo pipefail

IMAGE="midget-poc"
PASS=0
FAIL=0
CONTAINER=""

pass() { echo "  PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL + 1)); }
cleanup() {
    if [ -n "$CONTAINER" ]; then
        docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
    fi
}
trap cleanup EXIT

echo "=== Mid-Flight Steering Tests ==="
echo ""

# ── Test 1: signal - write instructions.md ──────────────────

echo "--- Signal (prompt-based) tests ---"

# Helper: find steer dir inside container (may be /opt/jobs/steer or /tmp/steer)
steer_dir() {
    docker exec "$1" bash -c \
        "if [ -d /opt/jobs/steer ]; then echo /opt/jobs/steer; else echo /tmp/steer; fi"
}

CONTAINER=$(docker run -d \
    --label midget=true \
    --label midget.role=test-signal \
    --cpus 2 --memory 4g \
    "$IMAGE" sleep 300)
CID="${CONTAINER:0:12}"

# T1.1: signal creates the instructions file
bin/midgetctl signal "$CID" "focus on error handling" >/dev/null 2>&1
SDIR=$(steer_dir "$CONTAINER")
if docker exec "$CONTAINER" test -f "$SDIR/instructions.md"; then
    pass "signal creates instructions.md"
else
    fail "signal creates instructions.md"
fi

# T1.2: file contains the header
HEADER=$(docker exec "$CONTAINER" head -1 "$SDIR/instructions.md")
if printf '%s' "$HEADER" | grep -q "Steering Instructions"; then
    pass "instructions.md has header"
else
    fail "instructions.md has header (got: $HEADER)"
fi

# T1.3: file contains the message with timestamp
CONTENT=$(docker exec "$CONTAINER" cat "$SDIR/instructions.md")
if printf '%s' "$CONTENT" | grep -q "focus on error handling"; then
    pass "signal message written to file"
else
    fail "signal message written to file"
fi

# T1.4: timestamp present in ISO format
if printf '%s' "$CONTENT" | grep -qE '\[20[0-9]{2}-[0-9]{2}-[0-9]{2}T'; then
    pass "signal message has ISO timestamp"
else
    fail "signal message has ISO timestamp"
fi

# T1.5: second signal appends (does not overwrite)
bin/midgetctl signal "$CID" "also check edge cases" >/dev/null 2>&1
CONTENT=$(docker exec "$CONTAINER" cat "$SDIR/instructions.md")
if printf '%s' "$CONTENT" | grep -q "focus on error handling" && \
   printf '%s' "$CONTENT" | grep -q "also check edge cases"; then
    pass "second signal appends (both messages present)"
else
    fail "second signal appends"
fi

# T1.6: --show flag prints the file
OUTPUT=$(bin/midgetctl signal "$CID" "third instruction" --show 2>&1)
if printf '%s' "$OUTPUT" | grep -q "third instruction" && \
   printf '%s' "$OUTPUT" | grep -q "Steering Instructions"; then
    pass "signal --show displays instructions.md"
else
    fail "signal --show displays instructions.md"
fi

docker rm -f "$CONTAINER" >/dev/null 2>&1
CONTAINER=""

echo ""

# ── Test 2: steer - infrastructure (stream-json pipe) ───────

echo "--- Steer (infrastructure) tests ---"

CONTAINER=$(docker run -d \
    --label midget=true \
    --label midget.role=test-steer \
    --cpus 2 --memory 4g \
    "$IMAGE" sleep 300)
CID="${CONTAINER:0:12}"

# T2.1: steer writes a JSON message file
bin/midgetctl steer "$CID" "change approach to defensive coding" >/dev/null 2>&1
SDIR=$(steer_dir "$CONTAINER")
FILES=$(docker exec "$CONTAINER" ls "$SDIR/" 2>/dev/null || true)
if printf '%s' "$FILES" | grep -q "steer.json"; then
    pass "steer creates JSON message file"
else
    fail "steer creates JSON message file (files: $FILES)"
fi

# T2.2: message file is valid JSON with correct structure
MSG_FILE=$(docker exec "$CONTAINER" bash -c "ls $SDIR/*.json 2>/dev/null | head -1")
if [ -n "$MSG_FILE" ]; then
    MSG_CONTENT=$(docker exec "$CONTAINER" cat "$MSG_FILE")
    if printf '%s' "$MSG_CONTENT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert d['type'] == 'user', f'type={d[\"type\"]}'
assert d['message']['role'] == 'user', f'role={d[\"message\"][\"role\"]}'
assert 'change approach' in d['message']['content'], f'content={d[\"message\"][\"content\"]}'
print('valid')
" 2>/dev/null | grep -q "valid"; then
        pass "steer message is valid stream-json format"
    else
        fail "steer message format (content: $MSG_CONTENT)"
    fi
else
    fail "steer message file not found"
fi

# T2.3: second steer creates a second file (not overwrite)
sleep 0.1  # ensure different millisecond timestamp
bin/midgetctl steer "$CID" "add logging to all functions" >/dev/null 2>&1
FILE_COUNT=$(docker exec "$CONTAINER" bash -c "ls $SDIR/*.json 2>/dev/null | wc -l")
if [ "$FILE_COUNT" -ge 2 ]; then
    pass "second steer creates separate file (count: $FILE_COUNT)"
else
    fail "second steer creates separate file (count: $FILE_COUNT)"
fi

# T2.4: files are sequenced (lexicographic order = chronological order)
FILE_LIST=$(docker exec "$CONTAINER" bash -c "ls $SDIR/*.json 2>/dev/null")
FIRST=$(printf '%s' "$FILE_LIST" | head -1 | xargs basename)
LAST=$(printf '%s' "$FILE_LIST" | tail -1 | xargs basename)
if [ "$FIRST" \< "$LAST" ] || [ "$FIRST" = "$LAST" ]; then
    pass "steer files are sequenced chronologically"
else
    fail "steer files are sequenced (first=$FIRST, last=$LAST)"
fi

docker rm -f "$CONTAINER" >/dev/null 2>&1
CONTAINER=""

echo ""

# ── Test 3: steer-watcher pipe bridge ────────────────────────

echo "--- Steer-watcher (pipe bridge) tests ---"

CONTAINER=$(docker run -d \
    --label midget=true \
    --label midget.role=test-watcher \
    --cpus 2 --memory 4g \
    "$IMAGE" sleep 300)
CID="${CONTAINER:0:12}"

# T3.1: steer-watcher --setup creates the named pipe
docker exec "$CONTAINER" /opt/steer/steer-watcher --steer-dir /tmp/steer --pipe /tmp/steer/agent.pipe --setup >/dev/null 2>&1
PIPE_TYPE=$(docker exec "$CONTAINER" stat -c '%F' /tmp/steer/agent.pipe 2>/dev/null || true)
if printf '%s' "$PIPE_TYPE" | grep -q "fifo"; then
    pass "steer-watcher --setup creates named pipe (FIFO)"
else
    fail "steer-watcher --setup creates named pipe (got: $PIPE_TYPE)"
fi

# T3.2: steer-watcher can be started (runs in background)
docker exec -d "$CONTAINER" /opt/steer/steer-watcher --steer-dir /tmp/steer --pipe /tmp/steer/agent.pipe
sleep 0.5
WATCHER_RUNNING=$(docker exec "$CONTAINER" pgrep -f "steer-watcher" 2>/dev/null || true)
if [ -n "$WATCHER_RUNNING" ]; then
    pass "steer-watcher process running"
else
    fail "steer-watcher process running"
fi

# T3.3: start a reader on the pipe, write a steer message, verify delivery
# The reader simulates what claude --input-format stream-json would do
docker exec -d "$CONTAINER" bash -c "cat /tmp/steer/agent.pipe > /tmp/pipe-output.txt"
sleep 0.3

# Write a steer message directly to /tmp/steer (where watcher is watching)
MSG='{"type":"user","message":{"role":"user","content":"test pipe delivery"}}'
docker exec "$CONTAINER" bash -c "printf '%s' '$MSG' > /tmp/steer/999-test.json"
sleep 1.5

# Check if the watcher delivered it to the pipe
PIPE_OUT=$(docker exec "$CONTAINER" cat /tmp/pipe-output.txt 2>/dev/null || true)
if printf '%s' "$PIPE_OUT" | grep -q "test pipe delivery"; then
    pass "steer-watcher delivered message through pipe"
else
    # The watcher may still be waiting for the reader or processing
    # Check if the message file was consumed (renamed to .sending or deleted)
    REMAINING=$(docker exec "$CONTAINER" bash -c "ls /tmp/steer/*.json 2>/dev/null | wc -l")
    if [ "$REMAINING" -eq 0 ]; then
        pass "steer-watcher consumed message file (pipe delivery in progress)"
    else
        fail "steer-watcher pipe delivery (output: '$PIPE_OUT', remaining files: $REMAINING)"
    fi
fi

# T3.4: message file is cleaned up after delivery
STEER_FILES=$(docker exec "$CONTAINER" bash -c "ls /tmp/steer/*.json 2>/dev/null" || true)
SENDING_FILES=$(docker exec "$CONTAINER" bash -c "ls /tmp/steer/*.sending 2>/dev/null" || true)
if [ -z "$STEER_FILES" ] && [ -z "$SENDING_FILES" ]; then
    pass "steer message file cleaned up after delivery"
else
    # Allow for timing - file might still be in .sending state
    if [ -z "$STEER_FILES" ]; then
        pass "steer message file consumed (sending state transient)"
    else
        fail "steer message file cleanup (json: '$STEER_FILES', sending: '$SENDING_FILES')"
    fi
fi

docker rm -f "$CONTAINER" >/dev/null 2>&1
CONTAINER=""

echo ""

# ── Test 4: isolation - steer and signal are independent ─────

echo "--- Isolation tests ---"

CONTAINER=$(docker run -d \
    --label midget=true \
    --label midget.role=test-isolation \
    --cpus 2 --memory 4g \
    "$IMAGE" sleep 300)
CID="${CONTAINER:0:12}"

# T4.1: signal does not create JSON files
bin/midgetctl signal "$CID" "signal message" >/dev/null 2>&1
SDIR=$(steer_dir "$CONTAINER")
JSON_FILES=$(docker exec "$CONTAINER" bash -c "ls $SDIR/*.json 2>/dev/null" || true)
if [ -z "$JSON_FILES" ]; then
    pass "signal does not create JSON files (steer namespace clean)"
else
    fail "signal created JSON files: $JSON_FILES"
fi

# T4.2: steer does not touch instructions.md
bin/midgetctl steer "$CID" "steer message" >/dev/null 2>&1
INSTRUCTIONS=$(docker exec "$CONTAINER" bash -c "cat $SDIR/instructions.md 2>/dev/null" || true)
if printf '%s' "$INSTRUCTIONS" | grep -q "steer message"; then
    fail "steer wrote to instructions.md (namespace collision)"
else
    pass "steer does not touch instructions.md"
fi

docker rm -f "$CONTAINER" >/dev/null 2>&1
CONTAINER=""

echo ""

# ── Results ──────────────────────────────────────────────────

echo "=== Results: $PASS passed, $FAIL failed ==="
if [ "$FAIL" -eq 0 ]; then
    echo "STEERING TESTS PASSED"
    exit 0
else
    echo "STEERING TESTS FAILED"
    exit 1
fi
```

## FILE: tests/test-steer-live.sh
```bash
#!/bin/bash
# Live steering test - proves agent acts on mid-flight instructions.
# Requires ANTHROPIC_API_KEY. Costs API tokens. Non-deterministic.
# Runs on HOST. NOT part of the gate.
set -euo pipefail

IMAGE="midget-poc"
PASS=0
FAIL=0
CONTAINER=""
TIMEOUT=60

pass() { echo "  PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL + 1)); }
cleanup() {
    if [ -n "$CONTAINER" ]; then
        docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
    fi
}
trap cleanup EXIT

if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
    echo "ERROR: ANTHROPIC_API_KEY not set" >&2
    exit 1
fi

echo "=== Live Steering Tests (costs API tokens) ==="
echo ""

# ── Test 1: steer changes agent behaviour ────────────────────

echo "--- Test 1: infrastructure steer (stream-json pipe) ---"

CONTAINER=$(docker run -d \
    --label midget=true \
    --label midget.role=steer-live \
    --cpus 2 --memory 4g \
    -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
    "$IMAGE" sleep 300)
CID="${CONTAINER:0:12}"

# Set up the pipe and watcher
docker exec "$CONTAINER" /opt/steer/steer-watcher --steer-dir /tmp/steer --pipe /tmp/steer/agent.pipe --setup >/dev/null 2>&1
docker exec -d "$CONTAINER" /opt/steer/steer-watcher --steer-dir /tmp/steer --pipe /tmp/steer/agent.pipe

# Start claude reading from the pipe, writing output to a file
# --input-format stream-json reads JSON messages from stdin
# The pipe blocks until we write to it
docker exec -d "$CONTAINER" bash -c "
    claude -p \
        --input-format stream-json \
        --output-format stream-json \
        --verbose \
        --dangerously-skip-permissions \
        < /tmp/steer/agent.pipe \
        > /tmp/agent-output.jsonl \
        2>/tmp/agent-stderr.log
"
sleep 2

# Send initial task
TASK='{"type":"user","message":{"role":"user","content":"Write a Python function called add_numbers that adds two numbers and returns the result. Output only the code, no explanation."}}'
docker exec "$CONTAINER" bash -c "printf '%s\n' '$TASK' > /tmp/steer/001-task.json"

echo "  Sent initial task (Python), waiting for response..."
sleep 15

# Check for Python output
OUTPUT1=$(docker exec "$CONTAINER" cat /tmp/agent-output.jsonl 2>/dev/null || true)
if printf '%s' "$OUTPUT1" | grep -q "def add_numbers"; then
    pass "agent produced Python function"
else
    # Check stderr for errors
    STDERR=$(docker exec "$CONTAINER" cat /tmp/agent-stderr.log 2>/dev/null || true)
    if [ -n "$STDERR" ]; then
        echo "  stderr: $STDERR" | head -3
    fi
    fail "agent produced Python function (output length: ${#OUTPUT1})"
fi

# Now steer: switch to Rust
STEER='{"type":"user","message":{"role":"user","content":"Now rewrite that same function in Rust. Output only the Rust code, no explanation."}}'
docker exec "$CONTAINER" bash -c "printf '%s\n' '$STEER' > /tmp/steer/002-steer.json"

echo "  Sent steer (Rust), waiting for response..."
sleep 15

# Check for Rust output
OUTPUT2=$(docker exec "$CONTAINER" cat /tmp/agent-output.jsonl 2>/dev/null || true)
if printf '%s' "$OUTPUT2" | grep -qE "(fn |-> |i32|i64)"; then
    pass "agent switched to Rust after steer"
else
    fail "agent switched to Rust after steer"
fi

# T1.3: verify both outputs exist (agent processed both messages)
if printf '%s' "$OUTPUT2" | grep -q "def add_numbers" && \
   printf '%s' "$OUTPUT2" | grep -qE "(fn |-> |i32|i64)"; then
    pass "agent acted on both initial task and mid-flight steer"
else
    fail "agent acted on both messages"
fi

docker rm -f "$CONTAINER" >/dev/null 2>&1
CONTAINER=""

echo ""

# ── Test 2: signal changes agent behaviour ───────────────────

echo "--- Test 2: prompt-based signal (file poll) ---"

CONTAINER=$(docker run -d \
    --label midget=true \
    --label midget.role=signal-live \
    --cpus 2 --memory 4g \
    -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
    "$IMAGE" sleep 300)
CID="${CONTAINER:0:12}"

# Write the steering file first (agent will see it from the start)
bin/midgetctl signal "$CID" "When you see this file, include the word STEERED in your response." >/dev/null 2>&1

# Find the steer dir
SDIR=$(docker exec "$CONTAINER" bash -c \
    "if [ -d /opt/jobs/steer ]; then echo /opt/jobs/steer; else echo /tmp/steer; fi")

# Run claude with a prompt that tells it to check the steering file
docker exec "$CONTAINER" bash -c "
    claude -p \
        --dangerously-skip-permissions \
        'Before responding, read the file at $SDIR/instructions.md if it exists and follow any instructions there. Then: say hello and describe what you are.' \
        > /tmp/signal-output.txt \
        2>/tmp/signal-stderr.log
" &
CLAUDE_PID=$!

# Wait for completion (with timeout)
WAITED=0
while kill -0 $CLAUDE_PID 2>/dev/null && [ $WAITED -lt $TIMEOUT ]; do
    sleep 2
    WAITED=$((WAITED + 2))
done

if kill -0 $CLAUDE_PID 2>/dev/null; then
    kill $CLAUDE_PID 2>/dev/null || true
    fail "agent timed out after ${TIMEOUT}s"
else
    OUTPUT=$(docker exec "$CONTAINER" cat /tmp/signal-output.txt 2>/dev/null || true)
    if printf '%s' "$OUTPUT" | grep -qi "STEERED"; then
        pass "agent read signal file and included keyword"
    else
        echo "  Output: $(printf '%s' "$OUTPUT" | head -c 200)"
        fail "agent read signal file and included keyword"
    fi
fi

docker rm -f "$CONTAINER" >/dev/null 2>&1
CONTAINER=""

echo ""

# ── Results ──────────────────────────────────────────────────

echo "=== Results: $PASS passed, $FAIL failed ==="
if [ "$FAIL" -eq 0 ]; then
    echo "LIVE STEERING TESTS PASSED"
    exit 0
else
    echo "LIVE STEERING TESTS FAILED"
    exit 1
fi
```

## FILE: docs/diagrams/value-proposition.md
```markdown
# Value Proposition

What midgets deliver that other methods do not, and where they add nothing.

## Where midgets are the right tool

**E2E testing and user behaviour simulation.** An agent that needs to open
a browser, click through a flow, read what appeared on screen, and report
whether it worked. This requires a display (Xvfb), a window manager
(fluxbox), a browser (Chrome), input automation (xdotool), and screen
reading (OCR). No sandbox flag gives you this. Headless Chrome via CDP
handles some of it, but anything requiring pixel verification - did the
toast appear, is the layout broken, does the error message render - needs
a real framebuffer. The midget stack (steer + drive + tesseract) gives an
agent the same interface a QA engineer has.

**Model-agnostic filesystem isolation.** Codex has Landlock+seccomp for
kernel-enforced read-only access. Claude Code and Gemini do not. A midget
with `/opt/repo:ro` gives every model the same constraint regardless of
whether its CLI supports sandboxing. One mechanism, any model.

**Full environment isolation.** Different agents may need different tools,
dependencies, or PATH. A reviewer midget doesn't need npm. A dev midget
does. Landlock controls file access but doesn't isolate the environment.
Containers do - each agent gets its own filesystem, its own installed
tools, its own user.

**Reproducible starting state.** A container starts from a known image
every time. A process on the host inherits whatever state the host is in -
different shell config, different installed versions, stale temp files.
For test runs that need to be comparable across time, the container
guarantees the same starting conditions.

**Visual audit via VNC.** You can watch what the agent is doing in real
time by connecting a VNC viewer to port 5900. The agent's role name
appears in the fluxbox toolbar. This is useful for debugging, demos, and
understanding agent behaviour that logs alone don't capture.

## Where midgets add nothing over simpler methods

**Single-model code review.** If you just want Claude to review a diff,
`claude -p "review this diff" < diff.patch` does the same thing without
a container. The mount flag is irrelevant because there's no filesystem
access to restrict - the diff is in the prompt.

**Multi-model comparison without tool use.** If you're comparing how
three models evaluate the same prompt, three API calls with curl is
simpler. The container adds overhead (4GB image, startup time) for no
structural benefit. This is what the grok runner in orchestrate.sh
already does - a single curl call, no container needed.

**Codex with --sandbox read-only.** Codex already has kernel-enforced
filesystem isolation via Landlock+seccomp on Linux. If you're only
running Codex and only need file access control, the sandbox flag is
simpler and cheaper than a container.

**Anything that doesn't need a display.** If the agent only reads files,
runs commands, and writes output, the Xvfb/fluxbox/steer stack is dead
weight. A sandbox flag or a chroot would be lighter.

**Parallelism for its own sake.** More midgets don't help unless the work
is genuinely decomposable. Three midgets reviewing the same diff produce
three answers, but the bottleneck is LLM inference, not local compute.
Running them in parallel saves wall-clock time but doesn't improve the
quality of each review.

## The kernel enforcement landscape

| Tool | Filesystem isolation | Mechanism | Kernel-enforced? |
|------|---------------------|-----------|-----------------|
| Codex | `--sandbox read-only` | Landlock + seccomp | Yes |
| Claude Code | `--allowedTools` | Tool filtering | No |
| Gemini CLI | None | - | No |
| Midgets | Docker `:ro` mount | Mount namespace | Yes |

Midgets are the only option that provides kernel-enforced isolation to
models whose CLIs don't support it natively.
```

## FILE: README.md (midgetctl section)
```markdown
## midgetctl

Central control plane for midget containers.

```
midgetctl ps                        list running midgets
midgetctl inspect <container>       mounts, env, resources, network
midgetctl logs <container>          stream container logs
midgetctl stop <container|all>      graceful shutdown
midgetctl kill <container|all>      immediate kill
midgetctl pause <container>         freeze without killing (inspect state)
midgetctl resume <container>        resume paused midget
midgetctl stats [container]         live CPU/memory/network per midget
midgetctl steer <cid> <message>     inject into agent context (infrastructure, Claude only)
midgetctl signal <cid> <message>    append to steering file (prompt-based, any model)
midgetctl history                   list past crew runs with verdicts
midgetctl audit <run-id>            full audit trail for a run
midgetctl tokens [run-id]           token usage per agent, per run, or all
midgetctl watch <container>         open VNC viewer to midget display
midgetctl run <role> [--vnc]        launch a single midget with role
```

## Make Targets
```
