# SD-324 - C2: Inter-container communication

**Date:** 2026-03-10
**Status:** COMPLETE
**Depends on:** C1 (done - 550bcd2)

---

## What this proves

Two midgets sharing a Docker named volume can exchange artifacts. Midget-A executes
a job, writes a file to the shared volume. Midget-B executes a second job that reads
that file and acts on it. Midget-B's output demonstrates it consumed Midget-A's
artifact - not via a claim, via the content of a result YAML.

This is the load-bearing step before C3 (orchestration). Without a proven handoff
mechanism, multi-container work is just two isolated containers. C2 closes that gap.

---

## Mechanism

Docker named volume. Both containers mount the same volume at `/opt/jobs`. This is
already the established path (`MIDGET_JOBS_DIR`). No new protocol, no message bus,
no HTTP. The file-based job protocol from C1 is the transport.

```
host creates volume: midget-shared
  |
  +--> midget-a: -v midget-shared:/opt/jobs
  |      writes artifact to /opt/jobs/artifacts/alpha.txt
  |      result YAML in /opt/jobs/done/
  |
  +--> midget-b: -v midget-shared:/opt/jobs
         reads /opt/jobs/artifacts/alpha.txt
         result YAML output contains artifact content
```

The artifact path (`/opt/jobs/artifacts/`) sits inside the same volume as the job
queue. No second volume needed.

---

## Jobs

**Job A** (producer role):
```yaml
job_id: c2-alpha-001
created: <iso8601>
role: producer
task: shell_command
context:
  cmd: "mkdir -p /opt/jobs/artifacts && printf 'ARTIFACT_PAYLOAD_C2\n' > /opt/jobs/artifacts/alpha.txt && cat /opt/jobs/artifacts/alpha.txt"
timeout: 30
```

Proof: result YAML `output` contains `ARTIFACT_PAYLOAD_C2`. File exists on volume.

**Job B** (consumer role):
```yaml
job_id: c2-beta-001
created: <iso8601>
role: consumer
task: shell_command
context:
  cmd: "cat /opt/jobs/artifacts/alpha.txt"
timeout: 30
```

Proof: result YAML `output` contains `ARTIFACT_PAYLOAD_C2`. B read what A wrote.

The convergence check: `job-B output == job-A output`. If they match, the handoff
is confirmed. If they differ or B fails, handoff is broken.

---

## Test architecture

C2 is the first test that cannot run inside a single container. It orchestrates two.
`test-c2.sh` runs on the HOST. It uses `docker run` directly - no Docker Compose
dependency yet (that's C3).

```
test-c2.sh (host)
  1. docker volume create midget-shared
  2. write job-A to volume via helper container
  3. docker run midget-a -> jobrunner --once (processes job-A, writes artifact)
  4. verify job-A result YAML: exit=0, verdict=pass, output has ARTIFACT_PAYLOAD_C2
  5. write job-B to volume via helper container
  6. docker run midget-b -> jobrunner --once (processes job-B, reads artifact)
  7. verify job-B result YAML: exit=0, verdict=pass, output has ARTIFACT_PAYLOAD_C2
  8. verify job-A output == job-B output (convergence check)
  9. docker volume rm midget-shared
```

Steps 2 and 5 use a helper `docker run` with the same image to write job YAML into
the volume's `incoming/` directory before the jobrunner container starts. This avoids
any dependency on host access to Docker volume internals.

---

## Makefile target

New target: `make interop`. Runs on the host, not inside a container.

```makefile
interop:
    @echo "▶ C2 — Inter-container communication"
    @bash test-c2.sh
```

Not part of `make gate`. The gate proves single-container correctness. `make interop`
proves multi-container handoff. These are distinct verification layers:

- `make gate` - build + single-container tests (each container correct in isolation)
- `make interop` - multi-container tests (containers correct together)

The gauntlet TIER=full will chain both: gate first, then interop.

---

## Deliverables

| File | What |
|------|------|
| `test-c2.sh` | Host-side interop test (new file) |
| `Makefile` | `make interop` target |
| `mk/gauntlet.mk` | Add interop step to gauntlet full tier |
| `PLAN.md` | C2 added to completed table on green |

No changes to `jobrunner` or `steer/` - existing `shell_command` task type handles
both jobs. No new Docker images - same `midget-poc` image in both containers.

---

## What C2 does not cover

- Persistent (long-running) containers: both midgets run `--once` and exit. C3 adds
  `watch` mode with multiple concurrent containers.
- Concurrent execution: A runs to completion before B starts. True parallelism is C3.
- Named roles with identity files: `role` field in job YAML is informational only
  here. Role-enforced containers (Watchdog, Weaver, Sentinel) are C4.
- Docker Compose: not needed for two containers. Introduced in C3 for N containers.
- `artifacts` field in result YAML: the SPEC.md result schema includes an `artifacts`
  list. The current jobrunner does not write it. C4 needs it (for Weaver to reference
  Watchdog's test-results file). Can be added in C3 or C4; not required for C2 proof.

---

## Definition of done

- `make interop` exits 0
- job-A result YAML: `exit_code: 0`, `verdict: pass`, output contains `ARTIFACT_PAYLOAD_C2`
- job-B result YAML: `exit_code: 0`, `verdict: pass`, output contains `ARTIFACT_PAYLOAD_C2`
- job-A output == job-B output (same string, different containers)
- Docker volume created and destroyed cleanly (no leaked volumes)
- `make gate` still green (no regressions)

---

## Rollback

Remove `test-c2.sh`, revert Makefile additions. No container changes, no gate
changes. C1 is unaffected.
