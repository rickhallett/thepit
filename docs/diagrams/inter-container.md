# Inter-Container Communication

`make interop` (2 containers) and `make swarm N=3` (N containers) prove
that midgets can exchange work through a shared Docker volume. No message
bus, no HTTP, no sockets. Files in, files out.

```
                 +-----------------------------------+
                 |    Docker Named Volume            |
                 |    /opt/jobs/                     |
                 |                                   |
                 |  incoming/   done/   artifacts/   |
                 +-----+-------------+-------+------+
                       |             |       |
           +-----------+    +--------+       +----------+
           |                |                           |
    +------+------+  +------+------+  +--------+-------+
    | Midget A    |  | Midget B    |  | Midget C       |
    |             |  |             |  |                 |
    | jobrunner   |  | jobrunner   |  | jobrunner      |
    | --once      |  | --once      |  | --once         |
    |             |  |             |  |                 |
    | reads job   |  | reads job   |  | reads job      |
    | from        |  | from        |  | from           |
    | incoming/   |  | incoming/   |  | incoming/      |
    |             |  |             |  |                 |
    | writes      |  | writes      |  | writes         |
    | result to   |  | result to   |  | result to      |
    | done/       |  | done/       |  | done/          |
    +-------------+  +-------------+  +----------------+
```

## The job protocol

A job is a YAML file dropped into `incoming/`:

```yaml
job_id: c3-worker-001
role: worker
task: shell_command
context:
  cmd: "echo hello > /opt/jobs/artifacts/result.txt"
timeout: 30
```

The jobrunner picks it up, executes the command via drive (tmux + sentinel),
and writes a result YAML to `done/`:

```yaml
job_id: c3-worker-001
verdict: pass
exit_code: 0
output: "..."
```

## Atomic job acquisition

When N workers start simultaneously against the same `incoming/` directory,
they race for files. The naive approach (glob, read, delete) causes
contention: multiple workers grab the same file.

The fix is `os.rename()` to a `.processing` suffix before reading.
`os.rename()` is atomic on Linux. If two workers race for the same file,
exactly one succeeds and the other gets `FileNotFoundError`. The loser
moves to the next file. No locks, no coordination, no shared state beyond
the filesystem.

## Volume ownership

Docker named volumes initialise with root ownership. The `agent` user
(uid 1000) cannot write to a fresh volume. Every swarm startup begins
with a root init container that creates the directory tree and chowns it:

```bash
docker run --rm -u root -v <vol>:/opt/jobs <image> \
  bash -c "mkdir -p /opt/jobs/{incoming,done,artifacts} && chown -R 1000:1000 /opt/jobs"
```

In Docker Compose this maps to an `init` service with
`condition: service_completed_successfully`.

## What interop proves vs what swarm proves

**interop** (C2): Midget-A writes an artifact, Midget-B reads it. The
convergence check is that both result YAMLs contain the same payload
string. This proves the volume handoff works.

**swarm** (C3): N jobs dispatched, N workers process one each, N results
collected. This proves the atomic acquisition works under contention and
Docker Compose orchestration scales to arbitrary N.
